/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      // Cloudflare R2 storage - allow all R2 account endpoints
      {
        protocol: "https",
        hostname: "**.r2.cloudflarestorage.com",
      },
      // If using a custom domain for R2
      {
        protocol: "https",
        hostname: "**.r2.dev",
      },
      // Fallback for any direct endpoint
      {
        protocol: "https",
        hostname: "*.cloudflarestorage.com",
      },
    ],
  },
}

module.exports = nextConfig
