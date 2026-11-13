/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false,
  transpilePackages: ['sonner', '@tanstack/react-query', '@tanstack/react-table'],
};

module.exports = nextConfig;
