/** @type {import('next').NextConfig} */
const nextConfig = {
  // 'standalone' for Docker SSR image; 'export' for Tauri static bundle (default)
  output: process.env.NEXT_OUTPUT || 'export',
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
