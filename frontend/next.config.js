module.exports = {
    reactStrictMode: true,
    env: {
        NEXT_PUBLIC_API_URL: 'http://localhost:5001',
    },
    async rewrites() {
        return [
            {
                source: '/api/:path*',
                destination: 'http://localhost:5001/api/:path*',
            },
        ];
    },
};
