// A fullscreen fragment shader on a plain WebGL canvas: the load intro's runtime, shared by the site's overlay and
// the lab (/tools/intro-lab). One triangle, one program, the lot data texture, and the real city as an image
// (lib/intro/snapshot.ts): the small lossy one first, the lossless one swapped in when it arrives. Compiled again
// whenever the look changes.
import { EPILOGUE, PRELUDE, PRELUDE_LINES } from "./glsl";
import { LOTS, lotTexels } from "./lots";
import { SNAPSHOT, SNAPSHOT_URLS } from "./snapshot";

export interface IntroUniforms {
  time: number;
  progress: number;
  reveal: number;
  hour: number;
  reduced: boolean;
  seed: number;
  pixel: number;
  w2s: [number, number, number];
  pointer: [number, number];
  stage: [number, number, number, number];
}

export interface CompileResult { ok: boolean; error?: string }

export type CityStage = "preview" | "exact";

const VERTEX = `attribute vec2 a_pos; void main() { gl_Position = vec4(a_pos, 0.0, 1.0); }`;
const UNIFORMS = ["u_resolution", "u_time", "u_progress", "u_reveal", "u_hour", "u_reduced", "u_seed", "u_pixel", "u_w2s", "u_pointer", "u_stage", "u_lots", "u_city", "u_ids", "u_cityRect", "u_cityReady"] as const;

export class IntroRenderer {
  private gl: WebGLRenderingContext | null;
  private program: WebGLProgram | null = null;
  private locations = new Map<string, WebGLUniformLocation | null>();
  private lots: WebGLTexture | null = null;
  private city: WebGLTexture | null = null;
  private ids: WebGLTexture | null = null;
  private cityReady = false;
  private exactIn = false;
  // told when the real city's image is in (preview), and again when the lossless one has replaced it (exact)
  onCity: ((stage: CityStage) => void) | null = null;

  constructor(private canvas: HTMLCanvasElement) {
    // straight alpha out of the shader; the page composites the canvas over the city
    this.gl = canvas.getContext("webgl", { alpha: true, premultipliedAlpha: false, antialias: false, depth: false, stencil: false, preserveDrawingBuffer: false });
    const gl = this.gl;
    if (!gl) return;
    gl.getExtension("OES_standard_derivatives");
    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    this.lots = this.makeTexture();
    gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, LOTS.width, LOTS.height, 0, gl.RGBA, gl.UNSIGNED_BYTE, lotTexels());
    this.city = this.makeTexture();
    this.ids = this.makeTexture();
    this.loadCity();
  }

  get supported(): boolean { return this.gl !== null; }
  get cityStage(): CityStage | null { return this.exactIn ? "exact" : this.cityReady ? "preview" : null; }

  private makeTexture(): WebGLTexture | null {
    const gl = this.gl!;
    const tex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, tex);
    // nearest, as the scene draws its pixel art
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    return tex;
  }

  private upload(tex: WebGLTexture | null, img: HTMLImageElement): boolean {
    const gl = this.gl;
    if (!gl || !tex) return false;
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
    return true;
  }

  // The ids and the small image first, together they switch the looks from blocks to the real city; the lossless
  // image only starts once the small one is in, so it never slows the first second down
  private loadCity(): void {
    const load = (src: string, done: (img: HTMLImageElement) => void) => {
      const img = new Image();
      img.decoding = "async";
      img.onload = () => done(img);
      img.src = src;
    };
    let idsIn = false;
    let previewIn = false;
    const check = () => {
      if (!idsIn || !previewIn || this.cityReady || !this.gl) return;
      this.cityReady = true;
      this.onCity?.("preview");
      load(SNAPSHOT_URLS.exact, (img) => {
        if (!this.upload(this.city, img)) return;
        this.exactIn = true;
        this.onCity?.("exact");
      });
    };
    load(SNAPSHOT_URLS.ids, (img) => { if (this.upload(this.ids, img)) { idsIn = true; check(); } });
    load(SNAPSHOT_URLS.preview, (img) => { if (this.upload(this.city, img)) { previewIn = true; check(); } });
  }

  // body: the preset's GLSL, which defines vec4 intro(vec2 px). Errors come back with the body's own line numbers.
  setFragment(body: string): CompileResult {
    const gl = this.gl;
    if (!gl) return { ok: false, error: "WebGL is not available" };
    const compile = (type: number, source: string) => {
      const shader = gl.createShader(type)!;
      gl.shaderSource(shader, source);
      gl.compileShader(shader);
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        const log = gl.getShaderInfoLog(shader) ?? "compile error";
        gl.deleteShader(shader);
        throw new Error(log);
      }
      return shader;
    };
    try {
      const vs = compile(gl.VERTEX_SHADER, VERTEX);
      const fs = compile(gl.FRAGMENT_SHADER, PRELUDE + body + EPILOGUE);
      const program = gl.createProgram()!;
      gl.attachShader(program, vs);
      gl.attachShader(program, fs);
      gl.bindAttribLocation(program, 0, "a_pos");
      gl.linkProgram(program);
      gl.deleteShader(vs);
      gl.deleteShader(fs);
      if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
        const log = gl.getProgramInfoLog(program) ?? "link error";
        gl.deleteProgram(program);
        throw new Error(log);
      }
      if (this.program) gl.deleteProgram(this.program);
      this.program = program;
      this.locations.clear();
      for (const name of UNIFORMS) this.locations.set(name, gl.getUniformLocation(program, name));
      return { ok: true };
    } catch (e) {
      const error = relocate(String((e as Error).message));
      console.warn("[intro] shader did not compile:", error);
      return { ok: false, error };
    }
  }

  render(u: IntroUniforms): void {
    const gl = this.gl;
    if (!gl || !this.program) return;
    const { width, height } = this.canvas;
    gl.viewport(0, 0, width, height);
    gl.disable(gl.BLEND);
    gl.useProgram(this.program);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    const loc = (n: string) => this.locations.get(n) ?? null;
    gl.uniform2f(loc("u_resolution"), width, height);
    gl.uniform1f(loc("u_time"), u.time);
    gl.uniform1f(loc("u_progress"), u.progress);
    gl.uniform1f(loc("u_reveal"), u.reveal);
    gl.uniform1f(loc("u_hour"), u.hour);
    gl.uniform1f(loc("u_reduced"), u.reduced ? 1 : 0);
    gl.uniform1f(loc("u_seed"), u.seed);
    gl.uniform1f(loc("u_pixel"), u.pixel);
    gl.uniform3f(loc("u_w2s"), u.w2s[0], u.w2s[1], u.w2s[2]);
    gl.uniform2f(loc("u_pointer"), u.pointer[0], u.pointer[1]);
    gl.uniform4f(loc("u_stage"), u.stage[0], u.stage[1], u.stage[2], u.stage[3]);
    gl.uniform4f(loc("u_cityRect"), SNAPSHOT.x, SNAPSHOT.y, SNAPSHOT.w, SNAPSHOT.h);
    gl.uniform1f(loc("u_cityReady"), this.cityReady ? 1 : 0);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.lots);
    gl.uniform1i(loc("u_lots"), 0);
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, this.city);
    gl.uniform1i(loc("u_city"), 1);
    gl.activeTexture(gl.TEXTURE2);
    gl.bindTexture(gl.TEXTURE_2D, this.ids);
    gl.uniform1i(loc("u_ids"), 2);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }

  // Frees the program and textures. The context itself stays with the canvas: React mounts twice in development, and
  // a context lost on purpose is what getContext() hands back the second time.
  dispose(): void {
    const gl = this.gl;
    if (!gl) return;
    if (this.program) gl.deleteProgram(this.program);
    for (const t of [this.lots, this.city, this.ids]) if (t) gl.deleteTexture(t);
    this.program = null;
    this.lots = null;
    this.city = null;
    this.ids = null;
    this.onCity = null;
    this.gl = null;
  }
}

// "ERROR: 0:123: ..." counts from the top of the whole shader; the preset's text starts after the prelude
function relocate(log: string): string {
  return log.replace(/ERROR: 0:(\d+):/g, (_, n: string) => `line ${Math.max(1, Number(n) - PRELUDE_LINES + 1)}:`).trim();
}
