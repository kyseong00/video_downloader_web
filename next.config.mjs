/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "i.ytimg.com" },
      { protocol: "https", hostname: "img.youtube.com" },
      { protocol: "https", hostname: "**.googleusercontent.com" },
    ],
  },
  experimental: {
    serverComponentsExternalPackages: ["better-sqlite3", "@libsql/client"],
  },
};

export default nextConfig;
