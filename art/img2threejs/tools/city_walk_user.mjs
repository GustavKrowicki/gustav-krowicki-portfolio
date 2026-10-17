// Walk into the Valtech office the way a visitor does, on /new or /city: press Walk, then hold arrow keys (desktop)
// or drag the joystick (phone) until the player reaches each target tile. Prints positions, screenshots each stop.
// Usage: node art/img2threejs/tools/city_walk_user.mjs <base url> <outDir> <path: /new | /city> <desktop | phone> [avatar=3d]
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
const [, , base, out, path = '/new', mode = 'desktop', avatar = ''] = process.argv;
mkdirSync(out, { recursive: true });
const phone = mode === 'phone';
const b = await chromium.launch({ args: ['--use-gl=angle', '--enable-unsafe-swiftshader'] });
const p = await b.newPage({ viewport: phone ? { width: 390, height: 844 } : { width: 1440, height: 900 }, deviceScaleFactor: phone ? 2 : 1, isMobile: phone, hasTouch: phone });
await p.goto(`${base}${path}?e2e=1${avatar ? `&${avatar}` : ''}`, { waitUntil: 'load', timeout: 120000 });
await p.waitForFunction(() => { const s = window.__CITY_E2E__?.getScene(); return !!(s && s.isReady && s.grid.length); }, null, { timeout: 120000 });
await p.waitForTimeout(2500);
await p.getByRole('button', { name: /^walk$/i }).click();
await p.waitForFunction(() => !!window.__CITY_E2E__.getScene().playerController?.isReady, null, { timeout: 60000 });
const pos = () => p.evaluate(() => { const s = window.__CITY_E2E__.getScene(); const q = s.playerController.getPosition(); return { x: q.gridX, y: q.gridY, open: [...s.openBuildings], seated: !!s.seated }; });
const KEY = { up: 'ArrowUp', down: 'ArrowDown', left: 'ArrowLeft', right: 'ArrowRight' };
// joystick: screen axes map straight to the four directions (VirtualJoystick getDirection: drag up = Up)
const JOY = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };
async function step(dir, tx, ty) {
  for (let i = 0; i < 40; i++) {
    const q = await pos();
    if ((dir === 'up' && q.y <= ty) || (dir === 'down' && q.y >= ty) || (dir === 'left' && q.x <= tx) || (dir === 'right' && q.x >= tx)) break;
    if (!phone) { await p.keyboard.down(KEY[dir]); await p.waitForTimeout(180); await p.keyboard.up(KEY[dir]); await p.waitForTimeout(450); }
    else {
      const box = await p.getByTestId('city-joystick').locator('div').first().boundingBox();
      const cx = box.x + box.width / 2, cy = box.y + box.height / 2;
      const [dx, dy] = JOY[dir];
      const cdp = await p.context().newCDPSession(p);
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: cx, y: cy }] });
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: cx + dx * 40, y: cy + dy * 40 }] });
      await p.waitForTimeout(330);
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
      await p.waitForTimeout(450);
    }
  }
  const q = await pos();
  console.log(dir, '->', JSON.stringify(q));
  return q;
}
console.log('start', JSON.stringify(await pos()));
const s = await pos();
// to the approach tile in front of the gate (15, 27), then in through the gate, then the desk
if (s.x < 15) await step('right', 15, s.y); else if (s.x > 15) await step('left', 15, s.y);
await step('up', 15, 26);
await p.screenshot({ path: `${out}/1-gate.png` });
await step('left', 14, 26);
await p.waitForTimeout(2500);
console.log('at desk', JSON.stringify(await pos()));
await p.screenshot({ path: `${out}/2-desk.png` });
await b.close();
