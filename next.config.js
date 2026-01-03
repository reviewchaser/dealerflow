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
      // Fallback for any direct endpoint (single wildcard)
      {
        protocol: "https",
        hostname: "*.cloudflarestorage.com",
      },
      // R2 public development domain
      {
        protocol: "https",
        hostname: "pub-*.r2.dev",
      },
      // Cloudflare R2 signed URLs format
      // Note: Signed URLs use the same endpoint but with query params
      // Next.js Image with unoptimized=true bypasses domain checking
    ],
    // Increase timeout for slow CDN responses
    minimumCacheTTL: 60,
  },
}

module.exports = nextConfig
