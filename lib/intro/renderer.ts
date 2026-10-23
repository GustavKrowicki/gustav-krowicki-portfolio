// A fullscreen fragment shader on a plain WebGL canvas: the load intro's runtime, shared by the site's overlay and
// the lab (/tools/intro-lab). One triangle, one program, one data texture; compiled again whenever the look changes.
import { EPILOGUE, PRELUDE, PRELUDE_LINES } from "./glsl";
import { LOTS, lotTexels } from "./lots";

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

const VERTEX = `attribute vec2 a_pos; void main() { gl_Position = vec4(a_pos, 0.0, 1.0); }`;
const UNIFORMS = ["u_resolution", "u_time", "u_progress", "u_reveal", "u_hour", "u_reduced", "u_seed", "u_pixel", "u_w2s", "u_pointer", "u_stage", "u_lots"] as const;

export class IntroRenderer {
  private gl: WebGLRenderingContext | null;
  private program: WebGLProgram | null = null;
  private locations = new Map<string, WebGLUniformLocation | null>();
  private lots: WebGLTexture | null = null;

  constructor(private canvas: HTMLCanvasElement) {
    // straight alpha out of the shader; the page composites the canvas over the city
    this.gl = canvas.getContext("webgl", { alpha: true, premultipliedAlpha: false, antialias: false, depth: false, stencil: false, preserveDrawingBuffer: false });
    const gl = this.gl;
    if (!gl) return;
    gl.getExtension("OES_standard_derivatives");
    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    this.lots = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, this.lots);
    gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, LOTS.width, LOTS.height, 0, gl.RGBA, gl.UNSIGNED_BYTE, lotTexels());
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  }

  get supported(): boolean { return this.gl !== null; }

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
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.lots);
    gl.uniform1i(loc("u_lots"), 0);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }

  // Frees the program and texture. The context itself stays with the canvas: React mounts twice in development, and a
  // context lost on purpose is what getContext() hands back the second time.
  dispose(): void {
    const gl = this.gl;
    if (!gl) return;
    if (this.program) gl.deleteProgram(this.program);
    if (this.lots) gl.deleteTexture(this.lots);
    this.program = null;
    this.lots = null;
    this.gl = null;
  }
}

// "ERROR: 0:123: ..." counts from the top of the whole shader; the preset's text starts after the prelude
function relocate(log: string): string {
  return log.replace(/ERROR: 0:(\d+):/g, (_, n: string) => `line ${Math.max(1, Number(n) - PRELUDE_LINES + 1)}:`).trim();
}
