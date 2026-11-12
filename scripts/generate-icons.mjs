// One-off script: renders the PNG app icons from SVG. Run with: node scripts/generate-icons.mjs
import sharp from 'sharp'
import { mkdirSync } from 'node:fs'

mkdirSync('public/icons', { recursive: true })

// "Maskable" icons need the artwork inside a central safe zone, so the symbol is smaller.
const svg = (symbolSize, rounded) => `
<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
  <rect width="512" height="512" ${rounded ? 'rx="112"' : ''} fill="#4f46e5"/>
  <text x="256" y="${256 + symbolSize * 0.36}" font-size="${symbolSize}" font-family="Arial, sans-serif"
        font-weight="700" text-anchor="middle" fill="#ffffff">€</text>
</svg>`

const jobs = [
  { file: 'icon-192.png', size: 192, svg: svg(300, true) },
  { file: 'icon-512.png', size: 512, svg: svg(300, true) },
  { file: 'icon-maskable-512.png', size: 512, svg: svg(230, false) },
  { file: 'apple-touch-icon.png', size: 180, svg: svg(300, false) },
]

for (const j of jobs) {
  await sharp(Buffer.from(j.svg)).resize(j.size, j.size).png().toFile(`public/icons/${j.file}`)
  console.log('created', j.file)
}
