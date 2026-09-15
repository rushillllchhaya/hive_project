import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Disable Turbopack to avoid the Windows 0xc0000142 DLL crash in PostCSS worker
  turbopack: undefined,
};

export default nextConfig;
