import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  reactCompiler: true,
  
  // Enable standalone mode for Docker
  output: 'standalone',
};

export default nextConfig;
