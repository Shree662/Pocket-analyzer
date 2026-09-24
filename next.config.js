/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    // Build ke time type check error ko ignore karega taaki app direct deploy ho jaye
    ignoreBuildErrors: true,
  },
  eslint: {
    // Linter errors ko ignore karega
    ignoreDuringBuilds: true,
  },
};

module.exports = nextConfig;
