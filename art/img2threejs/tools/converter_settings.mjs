// Converter zoom / vOff from lib/city/units.ts (docs/city-rules.md section 4) for a model measured in the entrance lab.
// Usage: node art/img2threejs/tools/converter_settings.mjs <footprintW> <footprintH> <maxDim> <size> [density]
// Prints JSON {zoom, verticalOffset}; the lab's sprite view aims the front corner at the bottom centre, so vOff is not used there.
import { converterSettings } from '../../../lib/city/units.ts';
const [w, h, maxDim, size, d] = process.argv.slice(2).map(Number);
console.log(JSON.stringify(converterSettings({ footprintW: w, footprintH: h, footprintWidthModel: w, maxDim, groundY: 0, size, density: d || 2 })));
