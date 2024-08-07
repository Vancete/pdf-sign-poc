'use client'

import React, { useEffect, useRef, useState } from 'react'
import * as PDFJS from 'pdfjs-dist/build/pdf'
import { PDFDocument, rgb } from 'pdf-lib'
import { LazyBrush } from 'lazy-brush'

import './PdfViewer.scss'

PDFJS.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${PDFJS.version}/build/pdf.worker.min.mjs`

const PdfViewer = ({ pdfUrl, signBoxes, scale, save, setSave }) => {
    const containerRef = useRef(null)
    const [pdf, setPdf] = useState(null)
    const [pageRef, setPageRef] = useState([])
    const [thumbnails, setThumbnails] = useState({})
    const [selected, setSelected] = useState(0)
    const [modalOpen, setModalOpen] = useState(false)
    const [signature, setSignature] = useState(null)
    const [signed, setSigned] = useState({})
    const SVG_NS = 'http://www.w3.org/2000/svg'

    useEffect(() => {
        const loadingTask = PDFJS.getDocument(pdfUrl)
        loadingTask.promise.then((loadedPdf) => {
            setPdf(loadedPdf)
        })
    }, [pdfUrl])

    useEffect(() => {
        if (pdf) {
            const renderPages = async () => {
                containerRef.current.innerHTML = ''
                for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
                    const pageContainer = document.createElement('div')
                    pageContainer.className = `page-container page-${pageNum}`
                    containerRef.current.appendChild(pageContainer)

                    const page = await pdf.getPage(pageNum)
                    const viewport = page.getViewport({ scale })

                    // Canvas para contenido no textual
                    const canvas = document.createElement('canvas')
                    const context = canvas.getContext('2d')
                    const outputScale = window.devicePixelRatio * 2
                    canvas.id = `canvas-page-${pageNum}`
                    canvas.width = Math.floor(viewport.width * outputScale)
                    canvas.height = Math.floor(viewport.height * outputScale)
                    canvas.style.width = `${Math.floor(viewport.width)}px`
                    canvas.style.height = `${Math.floor(viewport.height)}px`
                    pageContainer.appendChild(canvas)

                    context.scale(outputScale, outputScale)

                    const renderContext = {
                        canvasContext: context,
                        viewport: viewport,
                        renderInteractiveForms: false,
                        textLayer: {
                            beginLayout: () => {},
                            endLayout: () => {},
                            appendText: () => {},
                        },
                    }
                    await page.render(renderContext)

                    // Render texto como SVG
                    const textContent = await page.getTextContent()
                    const svg = buildSVG(viewport, textContent)
                    const svgContainer = document.createElement('div')
                    svgContainer.className = 'vector-container'
                    svgContainer.style.position = 'absolute'
                    svgContainer.style.top = '0'
                    svgContainer.style.left = '0'
                    svgContainer.appendChild(svg)
                    pageContainer.appendChild(svgContainer)

                    setPageRef((prevPageRef) => [...prevPageRef, canvas])

                    if (signBoxes) {
                        signBoxes.forEach((box, index) => {
                            if (pageNum === box.page) {
                                const signatureBox = document.createElement('div')
                                signatureBox.className = 'signature-box'
                                signatureBox.style.width = `${(150 * scale).toFixed(0)}px`
                                signatureBox.style.height = `${(75 * scale).toFixed(0)}px`
                                signatureBox.style.left = `${(canvas.clientWidth * box.x).toFixed(0)}px`
                                signatureBox.style.top = `${(canvas.clientHeight * box.y).toFixed(0)}px`
                                if (signed[index]) {
                                    signatureBox.style.opacity = '0.5'
                                    signatureBox.style.background = 'transparent'
                                    signatureBox.style.pointerEvents = 'none'
                                }

                                signatureBox.onclick = (e) => {
                                    if (document.querySelector('#signature')) {
                                        e.target.style.opacity = '0.5'
                                        e.target.style.background = 'transparent'
                                        e.target.style.pointerEvents = 'none'
                                        addToSigned(index)
                                    }
                                }

                                pageContainer.appendChild(signatureBox)
                            }
                        })
                        if (Object.keys(signed).length) {
                            signCanvas()
                        }
                    }
                }
            }

            renderPages()
        }
    }, [pdf, scale])

    useEffect(() => {
        pageRef.forEach((canvas) => {
            if (!!thumbnails[canvas.id]) return
            setThumbnails((prevThumbnails) => ({
                ...prevThumbnails,
                [canvas.id]: generateThumbnail(canvas, 0.25),
            }))
        })
    }, [pageRef])

    useEffect(() => {
        signCanvas()
    }, [signed])

    useEffect(() => {
        if (save) {
            handleSave()
            setSave(false)
        }
    }, [save])

    const addToSigned = (index) => {
        setSigned((prevSigned) => ({
            ...prevSigned,
            [index]: true,
        }))
    }

    const signCanvas = () => {
        Object.keys(signed).forEach((index) => {
            const canvas = document.getElementById(`canvas-page-${signBoxes[index].page}`)
            const ctx = canvas.getContext('2d')
            const img = new Image()
            img.onload = () => {
                ctx.drawImage(img, signBoxes[index].x * canvas.clientWidth, signBoxes[index].y * canvas.clientHeight, (150 * scale).toFixed(0), (75 * scale).toFixed(0))
            }
            img.src = signature
        })
    }

    const buildSVG = (viewport, textContent) => {
        const svg = document.createElementNS(SVG_NS, 'svg')
        svg.setAttribute('width', viewport.width + 'px')
        svg.setAttribute('height', viewport.height + 'px')
        svg.setAttribute('font-size', 1)

        textContent.items.forEach((textItem) => {
            const tx = PDFJS.Util.transform(PDFJS.Util.transform(viewport.transform, textItem.transform), [1, 0, 0, -1, 0, 0])
            const style = textContent.styles[textItem.fontName]
            const text = document.createElementNS(SVG_NS, 'text')
            text.setAttribute('transform', 'matrix(' + tx.join(' ') + ')')
            text.setAttribute('font-family', style.fontFamily)
            text.textContent = textItem.str
            svg.appendChild(text)
        })
        return svg
    }

    const generateThumbnail = (originalCanvas, scale = 0.5, quality = 0.5) => {
        const thumbnailCanvas = document.createElement('canvas')
        thumbnailCanvas.width = originalCanvas.width * scale
        thumbnailCanvas.height = originalCanvas.height * scale
        const thumbnailContext = thumbnailCanvas.getContext('2d')
        thumbnailContext.drawImage(originalCanvas, 0, 0, originalCanvas.width, originalCanvas.height, 0, 0, originalCanvas.width * scale, originalCanvas.height * scale)
        return thumbnailCanvas.toDataURL('image/jpeg', quality)
    }

    const handleSave = async () => {
        if (!signature || !Object.keys(signed).length) {
            return
        }

        try {
            const existingPdfBytes = await fetch(pdfUrl).then((res) => res.arrayBuffer())
            const pdfDoc = await PDFDocument.load(existingPdfBytes)
            const signatureCanvas = document.createElement('canvas')
            const signatureCtx = signatureCanvas.getContext('2d')
            const img = new Image()
            img.src = signature
            await new Promise((resolve) => (img.onload = resolve))

            signatureCanvas.width = img.width
            signatureCanvas.height = img.height
            signatureCtx.drawImage(img, 0, 0, img.width, img.height)

            Object.keys(signed).forEach(async (index) => {
                const page = pdfDoc.getPage(signBoxes[index].page - 1)
                const { width, height } = page.getSize()
                const canvas = document.getElementById(`canvas-page-${signBoxes[index].page}`)
                const pageScale = width / canvas.clientWidth
                const x = width * signBoxes[index].x * pageScale
                const y = (height - height * signBoxes[index].y - 75) * pageScale

                const embeddedPng = await pdfDoc.embedPng(signatureCanvas.toDataURL())
                page.drawImage(embeddedPng, {
                    x,
                    y,
                    width: 150 * pageScale,
                    height: 75 * pageScale,
                })
            })

            const pdfBytes = await pdfDoc.save()
            const blob = new Blob([pdfBytes], { type: 'application/pdf' })
            const link = document.createElement('a')
            link.href = URL.createObjectURL(blob)
            link.download = 'Bill-of-Sale_Signed.pdf'
            link.click()
        } catch (error) {
            console.error('Error al guardar el PDF:', error)
        }
    }

    return (
        <>
            <div className="pdf-viewer">
                <div className="page-selector">
                    {Object.keys(thumbnails).length > 0 &&
                        Object.keys(thumbnails).map((id, index) => (
                            <div
                                key={id}
                                className={`thumbnail ${id} ${selected == index ? 'selected' : ''}`}
                                onClick={() => {
                                    setSelected(index)
                                    document.querySelector(`#${id}`).scrollIntoView({ behavior: 'smooth' })
                                }}
                            >
                                <img src={thumbnails[id]} />
                                <div className="th-info">
                                    <span>{index}</span>
                                </div>
                            </div>
                        ))}
                </div>
                <div className="pdf-file" ref={containerRef}></div>
                <div className="sign-tools">
                    <span>Signature</span>
                    <div className="box">
                        {!signature && (
                            <button onClick={() => setModalOpen(true)}>
                                <span>+</span>
                            </button>
                        )}
                        {signature ? <img src={signature} id="signature" /> : <span>Add Signature</span>}
                    </div>
                </div>
            </div>
            {modalOpen && <SignModal setModalOpen={setModalOpen} setSignature={setSignature} />}
        </>
    )
}

const SignModal = ({ setModalOpen, setSignature }) => {
    const canvasRef = useRef(null)
    const lazyBrushRef = useRef(null)
    const [isDrawing, setIsDrawing] = useState(false)
    const lineWidth = 3
    const LAZY_RADIUS = 10

    useEffect(() => {
        const canvas = canvasRef.current
        const ctx = canvas.getContext('2d')
        canvas.width = canvas.offsetWidth
        canvas.height = canvas.offsetHeight

        ctx.lineWidth = lineWidth
        ctx.lineCap = 'round'
        ctx.lineJoin = 'round'

        lazyBrushRef.current = new LazyBrush({
            radius: LAZY_RADIUS,
            enabled: true,
            initialPoint: { x: canvas.width / 2, y: canvas.height / 2 },
        })
    }, [])

    const startDrawing = (e) => {
        setIsDrawing(true)
        draw(e)
    }

    const draw = (e) => {
        if (!isDrawing) return

        const canvas = canvasRef.current
        const ctx = canvas.getContext('2d')
        const rect = canvas.getBoundingClientRect()
        const x = e.clientX - rect.left
        const y = e.clientY - rect.top

        lazyBrushRef.current.update({ x, y })
        const brush = lazyBrushRef.current.getBrushCoordinates()

        ctx.lineTo(brush.x, brush.y)
        ctx.stroke()
        ctx.beginPath()
        ctx.moveTo(brush.x, brush.y)
    }

    const stopDrawing = () => {
        setIsDrawing(false)
        const canvas = canvasRef.current
        const ctx = canvas.getContext('2d')
        ctx.beginPath()
    }

    return (
        <div className="sign-modal">
            <div className="window">
                <div className="title">Add Your Signature</div>
                <div className="content">
                    <canvas ref={canvasRef} width={400} height={200} onMouseDown={startDrawing} onMouseMove={draw} onMouseUp={stopDrawing} onMouseLeave={stopDrawing} />
                    <div className="overlay">
                        <div className="line"></div>
                        <span>Draw your signature here</span>
                    </div>
                </div>
                <div className="actions">
                    <button onClick={() => setModalOpen(false)}>Cancel</button>
                    <button
                        onClick={() => {
                            setSignature(canvasRef.current.toDataURL('image/png'))
                            setModalOpen(false)
                        }}
                    >
                        Add Signature
                    </button>
                </div>
            </div>
        </div>
    )
}

export default PdfViewer
