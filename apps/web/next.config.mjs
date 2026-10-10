/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ["@fintrack/shared", "@fintrack/database"],
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
