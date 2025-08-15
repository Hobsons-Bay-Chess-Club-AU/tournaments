import type { NextConfig } from "next";


const nextConfig: NextConfig = {
  basePath: process.env.NEXT_PUBLIC_BASE_PATH || '',
  output: process.env.NEXT_PUBLIC_EXPORT_STATIC === 'true' ? 'export' : undefined,
  // Serve static files from the www folder
  staticFolder: '../www',
  // For Next.js 13+, use experimental config for custom public directory

  /* config options here */
};

export default nextConfig;
