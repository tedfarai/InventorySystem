import { useCallback, useEffect, useRef } from 'react';
import type { StockItem } from '../types';

/**
 * usePushNotifications
 *
 * Manages Web Push subscription lifecycle and fires local/push notifications
 * when stock items drop below their reorder threshold.
 *
 * - Requests Notification permission on first call to `requestPermission`.
 * - Uses the Notifications API directly (no server VAPID required for local alerts).
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
   * Fires a local notification for a single low-stock item.
   * Safe to call even if permission hasn't been granted yet — it will silently no-op.
   */
  const notifyLowStock = useCallback((item: StockItem) => {
    if (!isSupported || Notification.permission !== 'granted') return;
    if (alertedIds.current.has(item.ItemID)) return;

    alertedIds.current.add(item.ItemID);

    const isOut = item.Qty <= 0;
    const title = isOut
      ? `🚨 Out of Stock: ${item.ItemName}`
      : `⚠️ Low Stock Alert: ${item.ItemName}`;
    const body = isOut
      ? `${item.ItemID} has reached 0 ${item.Unit}. Immediate replenishment required.`
      : `${item.ItemID} is at ${item.Qty} ${item.Unit} — below the ${item.ReorderLevel} ${item.Unit} reorder threshold.`;

    try {
      const n = new Notification(title, {
        body,
        icon: '/pwa-192x192.png',
        badge: '/pwa-192x192.png',
        tag: `low-stock-${item.ItemID}`,
        renotify: false,
      });
      // Auto-close after 8 s
      setTimeout(() => n.close(), 8000);
    } catch {
      // Notification constructor can throw in some sandboxed environments
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
          notifyLowStock(item);
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
