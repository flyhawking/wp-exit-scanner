/** PostHog browser client injected by the snippet in app/layout.tsx. */
interface Window {
  posthog?: {
    capture: (event: string, properties?: Record<string, unknown>) => void;
    identify: (distinctId?: string, properties?: Record<string, unknown>) => void;
    register: (properties: Record<string, unknown>) => void;
    reset: () => void;
  };
}
