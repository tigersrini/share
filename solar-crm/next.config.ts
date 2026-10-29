import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // Build with a single worker. By default Next starts one worker per CPU core; on shared hosts with a
    // low per-account thread limit (e.g. Hostinger's build servers, 40+ cores) that dies with
    // "OS can't spawn worker thread: Resource temporarily unavailable".
    cpus: 1,
    workerThreads: false,
    staticGenerationMaxConcurrency: 1,
  },
};

export default nextConfig;
