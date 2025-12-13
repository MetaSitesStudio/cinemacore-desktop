const { app, nativeImage } = require('electron');
const path = require('path');
const fs = require('fs');

const sourceSvg = path.join(__dirname, '../src/assets/logo.svg');
const destDir = path.join(__dirname, '../electron/assets/icons');

// Ensure destination directory exists
if (!fs.existsSync(destDir)) {
  fs.mkdirSync(destDir, { recursive: true });
}

app.whenReady().then(() => {
  console.log('Generating icons from:', sourceSvg);
  
  const image = nativeImage.createFromPath(sourceSvg);
  
  if (image.isEmpty()) {
    console.error('Failed to load SVG image');
    app.quit();
    return;
  }

  const sizes = [192, 512];
  
  sizes.forEach(size => {
    try {
      const resized = image.resize({ width: size, height: size });
      const buffer = resized.toPNG();
      const destPath = path.join(destDir, `icon-${size}.png`);
      fs.writeFileSync(destPath, buffer);
      console.log(`Generated ${destPath}`);
    } catch (err) {
      console.error(`Error generating ${size}px icon:`, err);
    }
  });

  console.log('Icon generation complete.');
  app.quit();
});
