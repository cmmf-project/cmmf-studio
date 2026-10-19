import fs from "node:fs/promises";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { root } from "./prepare.mjs";

const compositor = path.join(
  root,
  "node_modules/@remotion/compositor-darwin-x64",
);
const env = { ...process.env, DYLD_LIBRARY_PATH: compositor };
const manifest = JSON.parse(
  await fs.readFile(path.join(root, "out/capture-manifest.json"), "utf8"),
);
const metadata = {};
for (const [name, clip] of Object.entries(manifest.clips)) {
  const src = path.join(root, `public/recordings/${name}.webm`);
  const data = JSON.parse(
    execFileSync(
      path.join(compositor, "ffprobe"),
      [
        "-v",
        "error",
        "-show_entries",
        "format=duration",
        "-show_entries",
        "stream=width,height,r_frame_rate",
        "-of",
        "json",
        src,
      ],
      { env, encoding: "utf8" },
    ),
  );
  // Playwright may encode a short extra interval when finalizing the context.
  // Metadata comes from the encoded file; proof frames below are checked visually.
  const duration = Number(data.format.duration);
  const trim = Math.max(0, clip.inPoint);
  metadata[name] = {
    trim,
    duration,
    cleanDuration: Number((duration - trim).toFixed(2)),
    width: data.streams[0].width,
    height: data.streams[0].height,
  };
  for (const [label, time] of [
    ["start", trim + 0.4],
    ["middle", trim + (duration - trim) / 2],
    ["end", duration - 1],
  ]) {
    execFileSync(
      path.join(compositor, "ffmpeg"),
      [
        "-hide_banner",
        "-loglevel",
        "error",
        "-ss",
        String(time),
        "-i",
        src,
        "-frames:v",
        "1",
        "-vf",
        "scale=960:540",
        "-y",
        path.join(root, `out/proof-${name}-${label}.png`),
      ],
      { env },
    );
  }
}
await fs.writeFile(
  path.join(root, "src/media-data.json"),
  JSON.stringify(metadata, null, 2),
);
await fs.writeFile(
  path.join(root, "out/encoded-metadata.json"),
  JSON.stringify(metadata, null, 2),
);
console.log(
  `Read encoded dimensions/durations and extracted ${Object.keys(metadata).length * 3} proof frames.`,
);
