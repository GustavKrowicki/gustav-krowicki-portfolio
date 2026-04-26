#!/usr/bin/env node

/**
 * Renders a 3D GLB character model into isometric walking GIF sprites.
 *
 * Usage: node scripts/render-character.js <path-to-glb>
 *
 * Outputs: public/game/pogicity/Characters/gustavwalk{north,south,east,west}.gif
 */

const puppeteer = require("puppeteer");
const path = require("path");
const fs = require("fs");
const { createCanvas, Image } = require("canvas");
const GIFEncoder = require("gif-encoder-2");

const OUTPUT_DIR = path.join(
  __dirname,
  "../public/game/pogicity/Characters"
);
const TARGET_HEIGHT = 60; // Notably larger than banana (37px) and apple (29px)
const FRAME_DELAY = 30; // ms per frame, matching existing characters
const DIRECTIONS = ["north", "south", "east", "west"];

async function main() {
  const glbPath = process.argv[2];
  if (!glbPath) {
    console.error("Usage: node scripts/render-character.js <path-to-glb>");
    process.exit(1);
  }

  const absoluteGlbPath = path.resolve(glbPath);
  if (!fs.existsSync(absoluteGlbPath)) {
    console.error(`File not found: ${absoluteGlbPath}`);
    process.exit(1);
  }

  console.log(`Loading GLB: ${absoluteGlbPath}`);
  console.log(`Output dir: ${OUTPUT_DIR}`);

  // Start a local HTTP server to serve the GLB and HTML
  const http = require("http");
  const htmlPath = path.join(__dirname, "render-character.html");

  const server = http.createServer((req, res) => {
    if (req.url === "/") {
      res.writeHead(200, { "Content-Type": "text/html" });
      res.end(fs.readFileSync(htmlPath));
    } else if (req.url === "/model/textured.glb") {
      res.writeHead(200, { "Content-Type": "model/gltf-binary" });
      res.end(fs.readFileSync(absoluteGlbPath));
    } else {
      res.writeHead(404);
      res.end("Not found");
    }
  });

  await new Promise((resolve) => server.listen(0, resolve));
  const port = server.address().port;
  console.log(`Server running on port ${port}`);

  const browser = await puppeteer.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 512, height: 512 });

    console.log("Loading three.js scene...");
    await page.goto(`http://localhost:${port}/`, {
      waitUntil: "networkidle0",
      timeout: 30000,
    });

    // Wait for renderer to be ready
    await page.waitForFunction("window.__RENDERER_READY__ === true", {
      timeout: 30000,
    });
    console.log("Renderer ready!");

    // Check for errors
    const error = await page.evaluate(() => window.__RENDERER_ERROR__);
    if (error) {
      throw new Error(`Renderer error: ${error}`);
    }

    for (const direction of DIRECTIONS) {
      console.log(`Rendering ${direction}...`);

      const frameDataUrls = await page.evaluate(
        (dir) => window.__renderFrames(dir),
        direction
      );

      console.log(`  Got ${frameDataUrls.length} frames, processing...`);

      // Convert data URLs to images and find bounding box
      const frames = [];
      let minX = Infinity, minY = Infinity, maxX = 0, maxY = 0;

      for (const dataUrl of frameDataUrls) {
        const img = new Image();
        img.src = dataUrl;

        const canvas = createCanvas(img.width, img.height);
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0);

        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

        // Find non-transparent bounding box
        for (let y = 0; y < canvas.height; y++) {
          for (let x = 0; x < canvas.width; x++) {
            const alpha = imageData.data[(y * canvas.width + x) * 4 + 3];
            if (alpha > 10) {
              minX = Math.min(minX, x);
              minY = Math.min(minY, y);
              maxX = Math.max(maxX, x);
              maxY = Math.max(maxY, y);
            }
          }
        }

        frames.push({ canvas, ctx });
      }

      // Crop to bounding box with padding
      const padding = 2;
      const cropX = Math.max(0, minX - padding);
      const cropY = Math.max(0, minY - padding);
      const cropW = maxX - cropX + padding * 2;
      const cropH = maxY - cropY + padding * 2;

      // Calculate target dimensions maintaining aspect ratio
      const scale = TARGET_HEIGHT / cropH;
      const targetW = Math.round(cropW * scale);
      const targetH = TARGET_HEIGHT;

      console.log(
        `  Crop: ${cropW}x${cropH}, Scale to: ${targetW}x${targetH}`
      );

      // Create GIF
      const encoder = new GIFEncoder(targetW, targetH, "neuquant", false);
      encoder.setDelay(FRAME_DELAY);
      encoder.setRepeat(0); // Loop forever
      encoder.setTransparent(0x000000);
      encoder.start();

      for (const frame of frames) {
        // Crop and scale
        const outCanvas = createCanvas(targetW, targetH);
        const outCtx = outCanvas.getContext("2d");

        // Disable image smoothing for pixel-art look
        outCtx.imageSmoothingEnabled = false;

        // Draw cropped and scaled
        outCtx.drawImage(
          frame.canvas,
          cropX,
          cropY,
          cropW,
          cropH,
          0,
          0,
          targetW,
          targetH
        );

        encoder.addFrame(outCtx);
      }

      encoder.finish();

      const outputPath = path.join(OUTPUT_DIR, `gustavwalk${direction}.gif`);
      fs.writeFileSync(outputPath, encoder.out.getData());
      console.log(`  Saved: ${outputPath}`);
    }

    console.log("\nDone! All GIFs generated.");
  } finally {
    await browser.close();
    server.close();
  }
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
