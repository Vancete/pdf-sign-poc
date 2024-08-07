'use client'

import { useState } from 'react'
import PdfViewer from './PdfViewer/PdfViewer'
import SaveIcon from './Icons/save-icon.js'

import './page.scss'

const Home = () => {
    const pdfUrl = 'Bill-of-Sale.pdf'
    const signBoxes = [
        { page: 1, x: 0.621, y: 0.821 },
        { page: 2, x: 0.286, y: 0.669 },
        { page: 3, x: 0.114, y: 0.631 },
    ]
    const [scale, setScale] = useState(1)
    const [save, setSave] = useState(false)

    const zoomIn = () => {
        setScale((prevScale) => Math.min(prevScale + 0.25, 2))
    }

    const zoomOut = () => {
        setScale((prevScale) => Math.max(prevScale - 0.25, 0.5))
    }

    return (
        <div className="app">
            <header className="header">
                <div className="logo">
                    <span>-</span>
                    <span>-</span>
                </div>
                <h1>
                    <b>PDF</b>Sign
                </h1>
                <div className="user">Hello iserrano@...</div>
            </header>
            <main className="main-container">
                <div className="toolbar">
                    <span className="filename">Bill-of-Sale.pdf</span>
                    <div className="zoom">
                        <div onClick={() => zoomOut()}>-</div>
                        <span>{`${(scale * 100).toFixed(0)}%`}</span>
                        <div onClick={() => zoomIn()}>+</div>
                    </div>
                    <div className="actions">
                        <button onClick={() => setSave(true)}>
                            <SaveIcon />
                            Save
                        </button>
                    </div>
                </div>
                <PdfViewer pdfUrl={pdfUrl} signBoxes={signBoxes} scale={scale} save={save} setSave={setSave} />
            </main>
        </div>
    )
}

export default Home
