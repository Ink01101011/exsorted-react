import { gzipSync } from "node:zlib";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join, extname } from "node:path";

const DIST_DIR = "dist";
const MAX_RAW_BYTES = Number(process.env.BUNDLE_MAX_RAW_BYTES ?? 60 * 1024);
const MAX_GZIP_BYTES = Number(process.env.BUNDLE_MAX_GZIP_BYTES ?? 20 * 1024);

if (!existsSync(DIST_DIR)) {
  console.error("Bundle size check failed: dist directory not found. Run build first.");
  process.exit(1);
}

const files = readdirSync(DIST_DIR)
  .filter((name) => [".js", ".cjs", ".mjs"].includes(extname(name)))
  .map((name) => join(DIST_DIR, name));

if (files.length === 0) {
  console.error("Bundle size check failed: no JS artifacts found in dist/.");
  process.exit(1);
}

let totalRaw = 0;
let totalGzip = 0;

for (const file of files) {
  const raw = readFileSync(file);
  const gzip = gzipSync(raw);
  totalRaw += statSync(file).size;
  totalGzip += gzip.length;
}

console.log(`Bundle raw size: ${totalRaw} bytes`);
console.log(`Bundle gzip size: ${totalGzip} bytes`);
console.log(`Budget raw: <= ${MAX_RAW_BYTES} bytes`);
console.log(`Budget gzip: <= ${MAX_GZIP_BYTES} bytes`);

if (totalRaw > MAX_RAW_BYTES || totalGzip > MAX_GZIP_BYTES) {
  console.error("Bundle size check failed: bundle exceeds configured budget.");
  process.exit(1);
}

console.log("Bundle size check passed.");
