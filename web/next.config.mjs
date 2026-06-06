/** @type {import('next').NextConfig} */
const nextConfig = {
  // 'standalone' for Docker SSR image; 'export' for Tauri static bundle (default)
  output: process.env.NEXT_OUTPUT || 'export',
  images: {
    // Unoptimized for static export (Tauri); Docker SSR can enable optimization
    unoptimized: process.env.NEXT_OUTPUT !== 'standalone',
    remotePatterns: [
      { protocol: 'https', hostname: 'i.discogs.com' },
      { protocol: 'https', hostname: 'st.discogs.com' },
      { protocol: 'https', hostname: '*.discogs.com' },
    ],
  },
};

export default nextConfig;
