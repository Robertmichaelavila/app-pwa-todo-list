import { deflateSync } from "node:zlib";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const INK = [16, 34, 28];
const LIME = [214, 242, 92];

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n += 1) {
    let c = n;
    for (let k = 0; k < 8; k += 1) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[n] = c >>> 0;
  }
  return table;
})();

function crc32(buffer) {
  let crc = 0xffffffff;
  for (let i = 0; i < buffer.length; i += 1) {
    crc = CRC_TABLE[(crc ^ buffer[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length, 0);
  const body = Buffer.concat([Buffer.from(type), data]);
  const checksum = Buffer.alloc(4);
  checksum.writeUInt32BE(crc32(body), 0);
  return Buffer.concat([length, body, checksum]);
}

function encodePng(width, height, pixels) {
  const raw = Buffer.alloc((width * 4 + 1) * height);
  for (let y = 0; y < height; y += 1) {
    const row = y * (width * 4 + 1);
    raw[row] = 0;
    pixels.copy(raw, row + 1, y * width * 4, (y + 1) * width * 4);
  }
  const header = Buffer.alloc(13);
  header.writeUInt32BE(width, 0);
  header.writeUInt32BE(height, 4);
  header[8] = 8;
  header[9] = 6;
  header[10] = 0;
  header[11] = 0;
  header[12] = 0;
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  return Buffer.concat([
    signature,
    chunk("IHDR", header),
    chunk("IDAT", deflateSync(raw, { level: 9 })),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

function clamp01(value) {
  return Math.max(0, Math.min(1, value));
}

function mix(base, tint, amount) {
  const ratio = clamp01(amount);
  return [
    base[0] + (tint[0] - base[0]) * ratio,
    base[1] + (tint[1] - base[1]) * ratio,
    base[2] + (tint[2] - base[2]) * ratio,
  ];
}

function distanceToSegment(px, py, x1, y1, x2, y2) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const lengthSquared = dx * dx + dy * dy;
  const t =
    lengthSquared === 0
      ? 0
      : Math.max(0, Math.min(1, ((px - x1) * dx + (py - y1) * dy) / lengthSquared));
  return Math.hypot(px - (x1 + t * dx), py - (y1 + t * dy));
}

function roundedRectCoverage(px, py, x, y, width, height, radius) {
  if (px < x || py < y || px > x + width || py > y + height) return 0;
  const left = px < x + radius;
  const right = px > x + width - radius;
  const top = py < y + radius;
  const bottom = py > y + height - radius;
  if (!(left || right) || !(top || bottom)) return 1;
  const centerX = left ? x + radius : x + width - radius;
  const centerY = top ? y + radius : y + height - radius;
  const distance = Math.hypot(px - centerX, py - centerY);
  return clamp01((radius - distance + 0.8) / 1.6);
}

function checkCoverage(px, py, x, y, size) {
  const startX = x + size * 0.28;
  const startY = y + size * 0.52;
  const cornerX = x + size * 0.44;
  const cornerY = y + size * 0.68;
  const endX = x + size * 0.74;
  const endY = y + size * 0.34;
  const stroke = size * 0.095;
  const distance = Math.min(
    distanceToSegment(px, py, startX, startY, cornerX, cornerY),
    distanceToSegment(px, py, cornerX, cornerY, endX, endY),
  );
  return clamp01((stroke / 2 - distance + 0.7) / 1.4);
}

function sampleAny(px, py, size) {
  return mix(LIME, INK, checkCoverage(px, py, 0, 0, size));
}

function sampleMark(px, py, size) {
  const margin = size * 0.18;
  const plate = size - margin * 2;
  const plateCoverage = roundedRectCoverage(px, py, margin, margin, plate, plate, plate * 0.28);
  const check = checkCoverage(px, py, margin, margin, plate);
  return mix(mix(INK, LIME, plateCoverage), INK, check);
}

function paint(width, height, colorAt) {
  const pixels = Buffer.alloc(width * height * 4);
  const samples = width <= 512 ? 3 : 2;
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      let red = 0;
      let green = 0;
      let blue = 0;
      for (let sampleY = 0; sampleY < samples; sampleY += 1) {
        for (let sampleX = 0; sampleX < samples; sampleX += 1) {
          const color = colorAt(
            x + (sampleX + 0.5) / samples,
            y + (sampleY + 0.5) / samples,
          );
          red += color[0];
          green += color[1];
          blue += color[2];
        }
      }
      const count = samples * samples;
      const offset = (y * width + x) * 4;
      pixels[offset] = Math.round(red / count);
      pixels[offset + 1] = Math.round(green / count);
      pixels[offset + 2] = Math.round(blue / count);
      pixels[offset + 3] = 255;
    }
  }
  return pixels;
}

function writePng(relativePath, width, height, pixels) {
  const target = join(root, relativePath);
  mkdirSync(dirname(target), { recursive: true });
  writeFileSync(target, encodePng(width, height, pixels));
}

function splashColor(px, py, width, height) {
  const distance = Math.hypot(px - width / 2, py - height * 0.2);
  const reach = Math.min(width, height) * 0.62;
  const glow = clamp01(1 - distance / reach) ** 2 * 0.16;
  return mix(INK, LIME, glow);
}

const icon192 = paint(192, 192, (x, y) => sampleAny(x, y, 192));
const icon512 = paint(512, 512, (x, y) => sampleAny(x, y, 512));
const maskable192 = paint(192, 192, (x, y) => sampleMark(x, y, 192));
const maskable512 = paint(512, 512, (x, y) => sampleMark(x, y, 512));
const appleTouch = paint(180, 180, (x, y) => sampleAny(x, y, 180));

writePng("public/icons/icon-192.png", 192, 192, icon192);
writePng("public/icons/icon-512.png", 512, 512, icon512);
writePng("public/icons/icon-maskable-192.png", 192, 192, maskable192);
writePng("public/icons/icon-maskable-512.png", 512, 512, maskable512);
writePng("public/icons/apple-touch-icon.png", 180, 180, appleTouch);
writePng("app/icon.png", 192, 192, icon192);

function samplePlate(px, py, size) {
  const margin = size * 0.18;
  const plate = size - margin * 2;
  return {
    color: mix(LIME, INK, checkCoverage(px, py, margin, margin, plate)),
    alpha: roundedRectCoverage(px, py, margin, margin, plate, plate, plate * 0.28),
  };
}

function paintSplash(width, height) {
  const pixels = Buffer.alloc(width * height * 4);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const color = splashColor(x, y, width, height);
      const offset = (y * width + x) * 4;
      pixels[offset] = Math.round(color[0]);
      pixels[offset + 1] = Math.round(color[1]);
      pixels[offset + 2] = Math.round(color[2]);
      pixels[offset + 3] = 255;
    }
  }

  const mark = Math.round(Math.min(width, height) * 0.28);
  const originX = Math.round((width - mark) / 2);
  const originY = Math.round(height * 0.4 - mark / 2);
  const samples = 3;
  for (let y = 0; y < mark; y += 1) {
    for (let x = 0; x < mark; x += 1) {
      const offset = ((originY + y) * width + (originX + x)) * 4;
      const destination = [pixels[offset], pixels[offset + 1], pixels[offset + 2]];
      let red = 0;
      let green = 0;
      let blue = 0;
      for (let sampleY = 0; sampleY < samples; sampleY += 1) {
        for (let sampleX = 0; sampleX < samples; sampleX += 1) {
          const sample = samplePlate(
            x + (sampleX + 0.5) / samples,
            y + (sampleY + 0.5) / samples,
            mark,
          );
          const color = mix(destination, sample.color, sample.alpha);
          red += color[0];
          green += color[1];
          blue += color[2];
        }
      }
      const count = samples * samples;
      pixels[offset] = Math.round(red / count);
      pixels[offset + 1] = Math.round(green / count);
      pixels[offset + 2] = Math.round(blue / count);
    }
  }
  return pixels;
}

const startupImages = JSON.parse(readFileSync(join(root, "pwa/startup-images.json"), "utf8"));
for (const image of startupImages) {
  writePng(
    join("public/splash", image.file),
    image.width,
    image.height,
    paintSplash(image.width, image.height),
  );
}
