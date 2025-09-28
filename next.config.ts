import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  devIndicators: {
    appIsrStatus: false,
  },
  
  images: {
      remotePatterns: [
        {
          protocol: "https",
          hostname: "*.grsai.com",
          pathname: "/**",
        },
        {
          protocol: "https",
          hostname: "dfddfb4a49b1498c394801e35be8b692.r2.cloudflarestorage.com",
          pathname: "/**",
        },
      ],
    },

  // Configure webpack to ignore the external folder
  webpack: (config: any) => {
    config.watchOptions = {
      ...config.watchOptions,
      ignored: ['**/Chinesename.club/**', '**/node_modules/**'],
    };
    return config;
  },
};

export default nextConfig;
