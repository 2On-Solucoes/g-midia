/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Netlify usa o seu próprio adaptador; o modo standalone só serve para Docker.
  output: process.env.NETLIFY ? undefined : 'standalone',
  typescript: { ignoreBuildErrors: true },
  eslint: { ignoreDuringBuilds: true },
};

module.exports = nextConfig;
