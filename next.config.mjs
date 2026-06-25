/** @type {import('next').NextConfig} */
const nextConfig = {
  // Strict Mode must be OFF: Vidstack/Maverick inserts <video> into <shadow-root>
  // elements imperatively. With reactStrictMode:true, React's double-render pass
  // reconciles <shadow-root> back to its empty virtual-DOM state and removes the
  // Maverick-inserted <video>, causing the permanent black screen.
  reactStrictMode: false,
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

  // Prevent NFT from scanning large directories that are never needed at runtime
  // in the standalone output. The fs.existsSync(dynamicPath) in prisma.ts causes
  // NFT to trace ~17k files; excluding these well-known-large trees collapses that.
  //
  // src-tauri/** is critical: the Rust build target (src-tauri/target) can exceed
  // 10 GB and is never part of the Next.js runtime. Without this exclusion NFT
  // follows node_modules symlinks/junctions that resolve into the Tauri tree and
  // copies the entire artifact cache into .next/standalone.
  outputFileTracingIgnores: [
    "node_modules/@swc/**",
    "node_modules/next/dist/compiled/jest-worker/**",
    "node_modules/@esbuild/**",
    "node_modules/rollup/**",
    "node_modules/webpack/**",
    "node_modules/terser/**",
    "src-tauri/**",
  ],

  experimental: {
    // Only load the icons/components actually used from these barrel-file-heavy
    // packages, instead of pulling in the entire library on every import.
    // Confirmed valid for Next.js 16.x via Context7 docs (v16.1.5).
    optimizePackageImports: ["lucide-react", "framer-motion", "swiper"],
  },
};

export default nextConfig;
