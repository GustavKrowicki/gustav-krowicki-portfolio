// The "take one" motion for the CV download (POR-42): a copy of the CV's first page lifts off the stack and
// flies out of the page to the spot where the visitor's own browser shows its downloads. A page cannot draw
// on the browser's toolbar, so the sheet leaves the viewport at the edge nearest that spot.

// Strong curves from Emil Kowalski's animation skills: ease-out for the lift, ease-in-out for the travel.
const EASE_OUT = 'cubic-bezier(0.23, 1, 0.32, 1)';
const EASE_IN_OUT = 'cubic-bezier(0.77, 0, 0.175, 1)';
// About 1 s in all: the lift, a short beat in the hand, then the flight.
const LIFT_MS = 220;
const HOLD_MS = 120;
const TRAVEL_MS = 680;

type Spot =
  | { kind: 'edge'; x: (w: number, h: number) => number; y: (w: number, h: number) => number }
  | { kind: 'button' };

// Where each browser shows a new download, as a point just outside the viewport.
// In-app browsers (LinkedIn, Facebook, Instagram) have no downloads place, so the sheet folds back into the note.
export function downloadSpot(): Spot {
  if (typeof navigator === 'undefined') return { kind: 'button' };
  const ua = navigator.userAgent;
  const touchMac = /Macintosh/.test(ua) && navigator.maxTouchPoints > 1;

  if (/LinkedInApp|FBAN|FBAV|Instagram/i.test(ua)) return { kind: 'button' };
  // iPhone and iPad Safari: the download arrow shows at the left of the address bar, which sits at the bottom.
  if ((/iPhone|iPod|iPad/.test(ua) || touchMac) && !/CriOS|FxiOS|EdgiOS/.test(ua)) {
    return { kind: 'edge', x: () => 56, y: (_, h) => h + 40 };
  }
  // Android and the other phone browsers: the download message slides up from the bottom.
  if (/Android|CriOS|FxiOS|EdgiOS/.test(ua)) return { kind: 'edge', x: (w) => w / 2, y: (_, h) => h + 40 };
  // Desktop: every browser keeps its downloads mark at the top right of the toolbar.
  // Windows puts the minimise, maximise and close buttons to its right, so the mark sits further in.
  if (/Windows/.test(ua)) return { kind: 'edge', x: (w) => w - 170, y: () => -40 };
  if (/Firefox\//.test(ua)) return { kind: 'edge', x: (w) => w - 96, y: () => -40 };
  if (/Safari\//.test(ua) && !/Chrome|Chromium|Edg\//.test(ua)) return { kind: 'edge', x: (w) => w - 128, y: () => -40 };
  if (/Chrome|Chromium|Edg\//.test(ua)) return { kind: 'edge', x: (w) => w - 104, y: () => -40 };
  return { kind: 'button' };
}

let running: { animation: Animation; flyer: HTMLElement } | null = null;

// Plays the motion. It never delays the download: the caller starts the real download on the same tap.
// `onLanded` runs when the sheet arrives (or at once with reduced motion), for the "Saved" state.
export function flyCvToDownloads(page: HTMLElement | null, button: HTMLElement | null, onLanded: () => void) {
  if (running) {
    running.animation.cancel();
    running.flyer.remove();
    running = null;
  }
  const canvas = page?.querySelector('canvas');
  if (!page || !canvas || typeof Element.prototype.animate !== 'function') {
    onLanded();
    return;
  }

  const rect = page.getBoundingClientRect();
  const flyer = document.createElement('canvas');
  flyer.width = canvas.width;
  flyer.height = canvas.height;
  flyer.getContext('2d')?.drawImage(canvas, 0, 0);
  Object.assign(flyer.style, {
    position: 'fixed',
    left: `${rect.left}px`,
    top: `${rect.top}px`,
    width: `${rect.width}px`,
    height: `${rect.height}px`,
    zIndex: '1000',
    pointerEvents: 'none',
    borderRadius: '4px',
    background: '#fff',
    boxShadow: '0 18px 40px rgba(0, 0, 0, 0.22)',
    willChange: 'transform, opacity',
  });
  document.body.appendChild(flyer);

  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let animation: Animation;
  if (reduce) {
    // Fewer, gentler: no travel, the sheet only fades.
    animation = flyer.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 200, easing: 'ease', fill: 'forwards' });
  } else {
    const spot = downloadSpot();
    const w = window.innerWidth;
    const h = window.innerHeight;
    let tx: number;
    let ty: number;
    if (spot.kind === 'edge' || !button) {
      const edge = spot.kind === 'edge' ? spot : { x: (vw: number) => vw - 104, y: () => -40 };
      tx = edge.x(w, h);
      ty = edge.y(w, h);
    } else {
      const b = button.getBoundingClientRect();
      tx = b.left + b.width / 2;
      ty = b.top + b.height / 2;
    }
    const dx = tx - (rect.left + rect.width / 2);
    const dy = ty - (rect.top + rect.height / 2);
    const tilt = dx >= 0 ? -1 : 1;
    const total = LIFT_MS + HOLD_MS + TRAVEL_MS;
    animation = flyer.animate(
      [
        { transform: 'none', opacity: 1, easing: EASE_OUT },
        { transform: `translate(-2px, -10px) scale(1.03) rotate(${tilt}deg)`, opacity: 1, offset: LIFT_MS / total },
        { transform: `translate(-2px, -10px) scale(1.03) rotate(${tilt}deg)`, opacity: 1, offset: (LIFT_MS + HOLD_MS) / total, easing: EASE_IN_OUT },
        { transform: `translate(${dx}px, ${dy}px) scale(0.08) rotate(${tilt * 12}deg)`, opacity: 0.3 },
      ],
      { duration: total, fill: 'forwards' }
    );
  }

  running = { animation, flyer };
  animation.onfinish = () => {
    flyer.remove();
    if (running?.flyer === flyer) running = null;
    onLanded();
  };
}
