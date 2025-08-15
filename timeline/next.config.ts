import type { NextConfig } from "next";


const nextConfig: NextConfig = {
  basePath: process.env.NEXT_PUBLIC_BASE_PATH || '',
  output: process.env.NEXT_PUBLIC_EXPORT_STATIC === 'true' ? 'export' : undefined,
  // Note: staticFolder is not a valid Next.js config option
  // Static files should be served via http-server or similar for the www folder
  
  /* config options here */
};

export default nextConfig;
