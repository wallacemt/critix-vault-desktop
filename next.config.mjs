/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: "standalone",

  images: {
    unoptimized: true,
  },
  trailingSlash: true,
};

export default nextConfig;
