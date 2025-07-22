import type { NextConfig } from "next";


const nextConfig: NextConfig = {
  basePath: process.env.NEXT_PUBLIC_BASE_PATH || '',
  output: process.env.NEXT_PUBLIC_EXPORT_STATIC === 'true' ? 'export' : undefined,
  /* config options here */
};

export default nextConfig;
