// One-off script: renders the source images for the Android icon and splash screen into assets/,
// then run: npx capacitor-assets generate --android   (npm run android:assets does both)
import sharp from 'sharp'
import { mkdirSync } from 'node:fs'

mkdirSync('assets', { recursive: true })
const INDIGO = '#4f46e5'
const euro = (size, fontSize, y, fill = '#ffffff') =>
  `<text x="${size / 2}" y="${y}" font-size="${fontSize}" font-family="Arial, sans-serif" font-weight="700" text-anchor="middle" fill="${fill}">€</text>`
const svg = (size, body) => `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">${body}</svg>`
const save = (name, s) => sharp(Buffer.from(s)).png().toFile(`assets/${name}`).then(() => console.log('created', name))

// Icon: 1024 px. The adaptive foreground keeps the € inside the central safe zone (66 %).
await save('icon-only.png', svg(1024, `<rect width="1024" height="1024" fill="${INDIGO}"/>${euro(1024, 620, 1024 / 2 + 620 * 0.36)}`))
await save('icon-foreground.png', svg(1024, euro(1024, 460, 1024 / 2 + 460 * 0.36)))
await save('icon-background.png', svg(1024, `<rect width="1024" height="1024" fill="${INDIGO}"/>`))

// Splash: 2732 px square, symbol in the middle (light = indigo, dark = near black).
await save('splash.png', svg(2732, `<rect width="2732" height="2732" fill="${INDIGO}"/>${euro(2732, 700, 2732 / 2 + 700 * 0.36)}`))
await save('splash-dark.png', svg(2732, `<rect width="2732" height="2732" fill="#0f172a"/>${euro(2732, 700, 2732 / 2 + 700 * 0.36, '#818cf8')}`))
