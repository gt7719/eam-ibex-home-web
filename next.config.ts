import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  ...(process.env.IBEX_RUNTIME === "node" ? { output: "standalone" } : {}),
};

export default nextConfig;
