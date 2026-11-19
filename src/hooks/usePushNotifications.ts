import { useCallback, useRef } from 'react';
import type { StockItem } from '../types';

/**
 * usePushNotifications
 *
 * Manages Web Notification lifecycle and fires local/push notifications
 * when stock items drop below their reorder threshold.
 *
 * - Requests Notification permission on first call to `requestPermission`.
 * - Uses ServiceWorkerRegistration.showNotification() when available (standard for PWAs and mobile),
 *   with fallback to new Notification() in standard window context.
 * - Deduplicates alerts: each item only fires once per browser session until
 *   its quantity recovers above the threshold.
 */
export function usePushNotifications() {
  // Track which ItemIDs have already triggered an alert this session
  const alertedIds = useRef<Set<string>>(new Set());

  const isSupported = typeof window !== 'undefined' && 'Notification' in window;

  const requestPermission = useCallback(async (): Promise<NotificationPermission> => {
    if (!isSupported) return 'denied';
    if (Notification.permission === 'granted') return 'granted';
    return Notification.requestPermission();
  }, [isSupported]);

  /**
   * Fires a notification for a single low-stock item via ServiceWorker showNotification
   * or Window Notification fallback.
   */
  const notifyLowStock = useCallback(async (item: StockItem) => {
    if (!isSupported || Notification.permission !== 'granted') return;
    if (alertedIds.current.has(item.ItemID)) return;

    alertedIds.current.add(item.ItemID);

    const isOut = (item.Qty ?? 0) <= 0;
    const title = isOut
      ? `🚨 Out of Stock: ${item.ItemName}`
      : `⚠️ Low Stock Alert: ${item.ItemName}`;
    const body = isOut
      ? `${item.ItemID} has reached 0 ${item.Unit || 'Units'}. Immediate replenishment required.`
      : `${item.ItemID} is at ${item.Qty} ${item.Unit || 'Units'} — below the ${item.ReorderLevel ?? 10} ${item.Unit || 'Units'} reorder threshold.`;

    const options: NotificationOptions & { renotify?: boolean; data?: any } = {
      body,
      icon: '/pwa-192x192.png',
      badge: '/pwa-192x192.png',
      tag: `low-stock-${item.ItemID}`,
      renotify: false,
      data: {
        url: '/?tab=simulator',
        itemId: item.ItemID,
        type: 'low-stock',
      },
    };

    // Prefer Service Worker showNotification (works on Android Chrome, iOS standalone, and desktop PWA)
    if ('serviceWorker' in navigator) {
      try {
        const registration = await navigator.serviceWorker.ready;
        if (registration && registration.showNotification) {
          await registration.showNotification(title, options);
          return;
        }
      } catch {
        // Fall back to window Notification
      }
    }

    try {
      const n = new Notification(title, options);
      setTimeout(() => n.close(), 8000);
    } catch {
      // Notification constructor can fail in some sandboxed browser environments
    }
  }, [isSupported]);

  /**
   * Scans the full stock list and fires notifications for any items that are
   * at or below their reorder level. Call this after any write transaction.
   */
  const checkAndNotifyLowStock = useCallback(
    (stockItems: StockItem[]) => {
      if (!isSupported || Notification.permission !== 'granted') return;
      for (const item of stockItems) {
        if ((item.Qty ?? 0) <= (item.ReorderLevel ?? 10)) {
          void notifyLowStock(item);
        }
      }
    },
    [isSupported, notifyLowStock]
  );

  /**
   * Clears the deduplication set for items whose quantity has recovered above
   * the threshold so they can alert again if they dip back down.
   */
  const clearRecoveredAlerts = useCallback((stockItems: StockItem[]) => {
    for (const item of stockItems) {
      if ((item.Qty ?? 0) > (item.ReorderLevel ?? 10)) {
        alertedIds.current.delete(item.ItemID);
      }
    }
  }, []);

  return {
    isSupported,
    permission: isSupported ? Notification.permission : ('denied' as NotificationPermission),
    requestPermission,
    notifyLowStock,
    checkAndNotifyLowStock,
    clearRecoveredAlerts,
  };
}
