import type { NextConfig } from "next";

const withBundleAnalyzer = require('@next/bundle-analyzer')({
  enabled: process.env.ANALYZE === 'true',
});

const nextConfig: NextConfig = {
  // Performance optimizations
  experimental: {
    optimizePackageImports: ['@mui/icons-material', '@mui/material'],
  },
  // Exclude puppeteer-core from bundle (chromium must be bundled for Vercel)
  serverExternalPackages: ['puppeteer-core'],
  // Allow S3 images
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.s3.*.amazonaws.com',
      },
      {
        protocol: 'https',
        hostname: '*.s3.amazonaws.com',
      },
    ],
  },
};

export default withBundleAnalyzer(nextConfig);
