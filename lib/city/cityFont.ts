import Phaser from "phaser";

// Geist Mono (app/layout.tsx) for every text the city draws on its canvas (Linear POR-12, Gustav 2026-10-21).
// next/font gives the face a generated name, so read it from the CSS variable it sets on <html>.
const FALLBACK = "ui-monospace, Menlo, monospace";

export function cityFont(): string {
  if (typeof document === "undefined") return FALLBACK;
  const family = getComputedStyle(document.documentElement).getPropertyValue("--font-geist-mono").trim();
  return family ? `${family}, ${FALLBACK}` : FALLBACK;
}

// Canvas text is drawn once: text made before the font has arrived keeps the fallback, so redraw it then
export function redrawWhenCityFontLoads(scene: Phaser.Scene): void {
  if (typeof document === "undefined" || !document.fonts) return;
  const family = cityFont();
  Promise.all([document.fonts.load(`400 8px ${family}`), document.fonts.load(`700 9px ${family}`)])
    .then(() => {
      if (!scene.sys.isActive()) return;
      const redraw = (objects: Phaser.GameObjects.GameObject[]) => {
        for (const o of objects) {
          if (o instanceof Phaser.GameObjects.Text) o.updateText();
          else if (o instanceof Phaser.GameObjects.Container) redraw(o.list);
        }
      };
      redraw(scene.children.list);
    })
    .catch(() => {});
}
