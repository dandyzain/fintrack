/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ["@fintrack/shared", "@fintrack/database"],
  experimental: {
    // Enables instrumentation.ts (startup check for SESSION_SECRET).
    instrumentationHook: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**.supabase.co",
      },
    ],
  },
};

export default nextConfig;
