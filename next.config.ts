import type { NextConfig } from "next";

// Extract host from NEXT_PUBLIC_APP_URL for Server Actions allowedOrigins.
// Strips protocol and trailing slash: "https://mio.example.eu" → "mio.example.eu"
const appUrl  = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
const appHost = appUrl.replace(/^https?:\/\//, "").replace(/\/$/, "");

const allowedOrigins = Array.from(new Set([appHost, "localhost:3000"]));

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      allowedOrigins,
    },
  },
};

export default nextConfig;
