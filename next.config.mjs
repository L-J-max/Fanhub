/** @type {import('next').NextConfig} */
const nextConfig = {
  // @libsql/client (Turso) and @vercel/blob are pure-JS / fetch-based and work
  // on Vercel's Node.js runtime. Next.js 15 already externalizes them, but we
  // keep the list explicit for clarity and older toolchains.
  serverExternalPackages: ['@libsql/client', '@vercel/blob'],
};

export default nextConfig;
