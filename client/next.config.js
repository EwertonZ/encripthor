/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',

  async rewrites() {
    return [
      {
        source: '/socket.io/:path*',
        destination: 'http://socket-server:3001/socket.io/:path*',
      },
    ];
  },
};

module.exports = nextConfig;
