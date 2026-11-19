import { useEffect } from 'react';

/**
 * useAppBadging
 *
 * Automatically synchronizes the PWA application icon badge (on Windows taskbar,
 * macOS dock, Android launcher) with the number of pending items requiring action
 * (such as low stock alerts or pending stock adjustment approvals).
 *
 * Uses the Web App Badging API (`navigator.setAppBadge` / `navigator.clearAppBadge`)
 * with fallback handling.
 */
export function useAppBadging(badgeCount: number) {
  useEffect(() => {
    if (typeof navigator === 'undefined') return;

    const setBadge = async () => {
      try {
        if ('setAppBadge' in navigator) {
          if (badgeCount > 0) {
            await (navigator as any).setAppBadge(badgeCount);
          } else if ('clearAppBadge' in navigator) {
            await (navigator as any).clearAppBadge();
          }
        }
      } catch (err) {
        // App Badging is optional / best-effort depending on OS and user preferences
      }
    };

    void setBadge();

    return () => {
      if (typeof navigator !== 'undefined' && 'clearAppBadge' in navigator) {
        try {
          void (navigator as any).clearAppBadge().catch(() => undefined);
        } catch {
          // Ignore cleanup errors
        }
      }
    };
  }, [badgeCount]);
}
