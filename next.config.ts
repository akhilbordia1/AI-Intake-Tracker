import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The dev-only Next.js devtools badge — a dark rounded bubble pinned to a window corner. It reads as
  // a rendering artefact on the corner of whichever panel it lands over (it was mistaken for one), and
  // this is a prototype that gets reviewed by screenshot, so it's off. Nothing about the build changes.
  devIndicators: false,
};

export default nextConfig;
