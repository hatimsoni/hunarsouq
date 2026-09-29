import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  distDir:
    process.env.HUNAR_PUBLIC_TEST === "1" ? ".next-public-test" : ".next",
  experimental: { serverActions: { bodySizeLimit: "3mb" } },
};

export default nextConfig;
