const createNextIntlPlugin = require('next-intl/plugin');

const withNextIntl = createNextIntlPlugin('./i18n/request.ts');

// Product images are served from the backend's /uploads folder.
const apiUrl = new URL(process.env.API_URL || 'http://localhost:5000');

/** @type {import('next').NextConfig} */
const nextConfig = {
  allowedDevOrigins: ['192.168.0.195'],
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'images.unsplash.com' },
      { protocol: 'https', hostname: 'placehold.co' },
      {
        protocol: apiUrl.protocol.replace(':', ''),
        hostname: apiUrl.hostname,
        port: apiUrl.port,
        pathname: '/uploads/**'
      }
    ],
    // Next 16 refuses to optimize images from private IPs. The local backend
    // runs on localhost in development, so allow it there only.
    dangerouslyAllowLocalIP: process.env.NODE_ENV !== 'production'
  }
};

module.exports = withNextIntl(nextConfig);
