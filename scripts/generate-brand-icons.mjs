// All favicon formats come from the same paths, colour and proportions as LogoMark.
// Run with --check to detect assets that have drifted from the shared source.
import { readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import sharp from 'sharp';

const root = new URL('../', import.meta.url);
const brand = JSON.parse(await readFile(new URL('src/constants/brandMark.json', root), 'utf8'));
const glyph = Math.round(brand.tileSize * brand.glyphScale);
const inset = (brand.tileSize - glyph) / 2;
const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${brand.tileSize}" height="${brand.tileSize}" viewBox="0 0 ${brand.tileSize} ${brand.tileSize}"><rect width="${brand.tileSize}" height="${brand.tileSize}" rx="${brand.tileRadius}" fill="${brand.color}"/><svg x="${inset}" y="${inset}" width="${glyph}" height="${glyph}" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="${brand.strokeWidth}" stroke-linecap="round" stroke-linejoin="round">${brand.paths.map(d => `<path d="${d}"/>`).join('')}</svg></svg>\n`;
const source = Buffer.from(svg);
const sizes = [16, 32, 48];
// Traditional BGRA/DIB ICO frames for browsers that do not choose the SVG icon.
const frames = await Promise.all(sizes.map(async size => {
  const rgba = await sharp(source).resize(size, size).ensureAlpha().raw().toBuffer();
  const stride = Math.ceil(size / 32) * 4;
  const dib = Buffer.alloc(40 + size * size * 4 + stride * size);
  dib.writeUInt32LE(40, 0); dib.writeInt32LE(size, 4); dib.writeInt32LE(size * 2, 8);
  dib.writeUInt16LE(1, 12); dib.writeUInt16LE(32, 14); dib.writeUInt32LE(size * size * 4, 20);
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const from = (y * size + x) * 4, to = 40 + ((size - 1 - y) * size + x) * 4;
    dib[to] = rgba[from + 2]; dib[to + 1] = rgba[from + 1]; dib[to + 2] = rgba[from]; dib[to + 3] = rgba[from + 3];
    if (!rgba[from + 3]) dib[40 + size * size * 4 + (size - 1 - y) * stride + (x >> 3)] |= 0x80 >> (x % 8);
  }
  return dib;
}));
const directory = Buffer.alloc(6 + sizes.length * 16);
directory.writeUInt16LE(1, 2); directory.writeUInt16LE(sizes.length, 4);
let offset = directory.length;
frames.forEach((frame, index) => {
  const entry = 6 + index * 16;
  directory[entry] = sizes[index]; directory[entry + 1] = sizes[index];
  directory.writeUInt16LE(1, entry + 4); directory.writeUInt16LE(32, entry + 6);
  directory.writeUInt32LE(frame.length, entry + 8); directory.writeUInt32LE(offset, entry + 12);
  offset += frame.length;
});
const version = createHash('sha256').update(source).digest('hex').slice(0, 12);
const files = new Map([
  ['public/favicon.svg', source],
  ['public/favicon.ico', Buffer.concat([directory, ...frames])],
  ['public/apple-touch-icon.png', await sharp(source).resize(180, 180).png().toBuffer()],
  ['src/constants/brandIconVersion.json', Buffer.from(`${JSON.stringify({ version }, null, 2)}\n`)],
]);
for (const [name, contents] of files) {
  const url = new URL(name, root);
  if (process.argv.includes('--check')) {
    const stored = await readFile(url);
    if (!stored.equals(contents)) throw new Error(`Regenerate stale brand asset: ${name}`);
  } else await writeFile(url, contents);
}
console.log(`Brand icons ${process.argv.includes('--check') ? 'verified' : 'generated'}: ${version}, ICO ${sizes.join('/')}, SVG, Apple 180`);
