/** @type {import('next').NextConfig} */
const nextConfig = {
    reactStrictMode: false,
    swcMinify: true,
    output: 'export',
    webpack: (config) => {
        config.resolve.alias.canvas = false
        config.experiments = { ...config.experiments, topLevelAwait: true }

        return config
    },
}

export default nextConfig
