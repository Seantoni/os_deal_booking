import type { NextConfig } from "next";

const withBundleAnalyzer = require('@next/bundle-analyzer')({
  enabled: process.env.ANALYZE === 'true',
});

const nextConfig: NextConfig = {
  // Performance optimizations
  experimental: {
    optimizePackageImports: ['@mui/icons-material', '@mui/material'],
  },
  // Exclude large packages from serverless bundle (required for Puppeteer on Vercel)
  serverExternalPackages: ['@sparticuz/chromium', 'puppeteer-core'],
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
