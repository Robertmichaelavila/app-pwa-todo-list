import { createHash, randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import type { NextConfig } from "next";
import withSerwistInit from "@serwist/next";

const gitRevision = spawnSync("git", ["rev-parse", "HEAD"], {
  encoding: "utf-8",
});
const revision =
  gitRevision.status === 0 && gitRevision.stdout.trim().length > 0
    ? gitRevision.stdout.trim()
    : randomUUID();

const publicFiles = [
  "icons/icon-192.png",
  "icons/icon-512.png",
  "icons/icon-maskable-192.png",
  "icons/icon-maskable-512.png",
  "icons/apple-touch-icon.png",
  "manifest.json",
];

function publicRevision(relativePath: string) {
  return createHash("sha256")
    .update(readFileSync(join(process.cwd(), "public", relativePath)))
    .digest("hex")
    .slice(0, 16);
}

const withSerwist = withSerwistInit({
  additionalPrecacheEntries: [
    { url: "/", revision },
    { url: "/offline", revision },
    ...publicFiles.map((file) => ({
      url: `/${file}`,
      revision: publicRevision(file),
    })),
  ],
  cacheOnNavigation: true,
  disable: process.env.NODE_ENV === "development",
  reloadOnOnline: false,
  swSrc: "app/sw.ts",
  swDest: "public/sw.js",
});

const nextConfig: NextConfig = {};

export default withSerwist(nextConfig);
