module.exports = {
    reactStrictMode: true,
    env: {
        NEXT_PUBLIC_API_URL: 'https://m3.blocktype.cl',
    },
    async rewrites() {
        return [
            {
                source: '/api/:path*',
                destination: 'https://m3.blocktype.cl/api/:path*',
            },
        ];
    },
};
