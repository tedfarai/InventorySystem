import { useCallback } from 'react';
import type { AdminUser } from '../types';

/**
 * useWriteGuard
 *
 * Returns a `guardWrite` wrapper that:
 *  1. Executes the action immediately when a user is logged in.
 *  2. Opens the login modal and skips the action when no user is present.
 *
 * Usage:
 *   const { guardWrite } = useWriteGuard(currentUser, onOpenLogin);
 *   <button onClick={() => guardWrite(() => handleAddNewStockItem(item))}>Add Item</button>
 */
export function useWriteGuard(
  currentUser: AdminUser | null,
  onOpenLogin: () => void
) {
  const guardWrite = useCallback(
    <T>(action: () => T): T | undefined => {
      if (!currentUser) {
        onOpenLogin();
        return undefined;
      }
      return action();
    },
    [currentUser, onOpenLogin]
  );

  return { guardWrite, isReadOnly: !currentUser };
}
