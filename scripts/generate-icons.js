const sharp = require('sharp');
const path = require('path');

async function generate() {
  const input = path.join(__dirname, '..', 'public', 'trainova-icon.svg');
  const iconsDir = path.join(__dirname, '..', 'public', 'icons');
  const publicDir = path.join(__dirname, '..', 'public');

  await sharp(input).resize(192, 192).png().toFile(path.join(iconsDir, 'icon-192.png'));
  await sharp(input).resize(512, 512).png().toFile(path.join(iconsDir, 'icon-512.png'));
  await sharp(input).resize(180, 180).png().toFile(path.join(publicDir, 'apple-touch-icon.png'));

  // Maskable: 20% padding (safe area)
  await sharp(input)
    .resize(410, 410)
    .extend({ top: 51, bottom: 51, left: 51, right: 51, background: '#0a0a0f' })
    .png()
    .toFile(path.join(iconsDir, 'icon-512-maskable.png'));

  // 192 maskable
  await sharp(input)
    .resize(154, 154)
    .extend({ top: 19, bottom: 19, left: 19, right: 19, background: '#0a0a0f' })
    .png()
    .toFile(path.join(iconsDir, 'icon-192-maskable.png'));

  // OG image
  await sharp(path.join(publicDir, 'trainova-logo-ptbr.svg'))
    .resize(1200, 630, { fit: 'contain', background: '#0a0a0f' })
    .png()
    .toFile(path.join(publicDir, 'og-image.png'));

  console.log('All icons generated!');
}

generate().catch(console.error);
