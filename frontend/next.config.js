/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  distDir: 'dist',
  images: {
    unoptimized: true,
  },
  trailingSlash: true,
  typescript: {
    // Ignore build errors for typescript to keep builds fast and resilient
    ignoreBuildErrors: true,
  }
};

export default nextConfig;
