/**
 * Utility function to merge classnames conditionally
 * Similar to the popular 'cn' utility used in shadcn/ui
 */
export function cn(...classes: (string | undefined | null | false)[]) {
  return classes.filter(Boolean).join(' ');
}

/**
 * Check if we should reduce motion based on user preferences
 */
export function shouldReduceMotion(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}
