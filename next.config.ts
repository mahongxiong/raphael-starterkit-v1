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
