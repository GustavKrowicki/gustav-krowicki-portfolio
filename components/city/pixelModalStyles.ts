export const PIXEL_PANEL_CLIP = {
  clipPath: `polygon(
    0 8px, 8px 8px, 8px 0,
    calc(100% - 8px) 0, calc(100% - 8px) 8px, 100% 8px,
    100% calc(100% - 8px), calc(100% - 8px) calc(100% - 8px), calc(100% - 8px) 100%,
    8px 100%, 8px calc(100% - 8px), 0 calc(100% - 8px)
  )`,
} as const;

export const PIXEL_INSET_CLIP = {
  clipPath: `polygon(
    0 6px, 6px 6px, 6px 0,
    calc(100% - 6px) 0, calc(100% - 6px) 6px, 100% 6px,
    100% calc(100% - 6px), calc(100% - 6px) calc(100% - 6px), calc(100% - 6px) 100%,
    6px 100%, 6px calc(100% - 6px), 0 calc(100% - 6px)
  )`,
} as const;

export const pixelPanelOuterClass =
  "relative bg-[#1f2328] p-[6px] shadow-[0_16px_0_rgba(12,14,16,0.45)]";

export const pixelPanelInnerClass =
  "relative overflow-hidden border-[3px] border-[#0f1214] bg-[#6d6b5f]";

export const pixelHeaderClass =
  "border-b-[3px] border-[#0f1214] bg-[#504d42]";

export const pixelDividerClass = "border-t-[3px] border-[#474438]";

export const pixelSpriteFrameClass =
  "relative overflow-hidden border-[3px] border-[#14181b] bg-[#2f4d42] shadow-[inset_0_0_0_3px_#88a07e]";

export const pixelChipClass =
  "inline-flex items-center border-2 border-[#14181b] bg-[#8a846f] px-2 py-1 text-[11px] font-mono uppercase tracking-[0.12em] text-[#171512]";

export function pixelButtonClass(variant: "primary" | "secondary" | "ghost") {
  const base =
    "border-[3px] px-4 py-2 font-mono text-sm uppercase tracking-[0.08em] transition-transform duration-100 active:translate-y-px";

  if (variant === "primary") {
    return `${base} border-[#6e2e14] bg-[#d78432] text-[#21160a] shadow-[inset_0_-3px_0_#8a4717] hover:bg-[#e1933f]`;
  }

  if (variant === "secondary") {
    return `${base} border-[#1c3129] bg-[#5f7a59] text-[#f6f0d8] shadow-[inset_0_-3px_0_#31473b] hover:bg-[#6c8a65]`;
  }

  return `${base} border-[#2d3134] bg-[#474438] text-[#f0ead6] shadow-[inset_0_-3px_0_#2c2922] hover:bg-[#555144]`;
}

export const pixelHintClass =
  "border-2 border-[#1b1f22] bg-[#3e3c33] px-3 py-2 font-mono text-[11px] uppercase tracking-[0.08em] text-[#d9d1bb]";
