/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: "standalone",

  images: {
    unoptimized: true,
  },
  trailingSlash: true,

  // Prevent Next.js / Turbopack from bundling packages that:
  //  • use native Node addons (better-sqlite3)
  //  • rely on browser-only globals like `location` (@tauri-apps/api)
  // These are externalized from the server bundle and required at runtime
  // instead, which eliminates the three "overly broad file pattern" Turbopack
  // warnings and the ReferenceError: location is not defined crash.
  serverExternalPackages: ["better-sqlite3", "@prisma/client", "@prisma/adapter-better-sqlite3", "@tauri-apps/api"],
};

export default nextConfig;
