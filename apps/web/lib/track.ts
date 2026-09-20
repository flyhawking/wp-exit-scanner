/**
 * Thin wrapper around the PostHog browser client.
 *
 * Always safe to call: on the server, or when no key is configured, it no-ops.
 * Keeping every capture behind this one function means the funnel events stay
 * consistent and greppable.
 */
export function track(event: string, properties?: Record<string, unknown>): void {
  if (typeof window === 'undefined') return;
  window.posthog?.capture(event, properties);
}

export function hostOf(url: string): string {
  try {
    return new URL(url.includes('://') ? url : `https://${url}`).hostname;
  } catch {
    return 'unknown';
  }
}
