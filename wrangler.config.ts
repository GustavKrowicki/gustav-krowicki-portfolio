import { defineWranglerConfig } from "wrangler/experimental-config";

// Build settings for cf: Wrangler uploads the Next.js static export (output: "export") from out/.
export default defineWranglerConfig({
  assetsDirectory: "./out",
});
