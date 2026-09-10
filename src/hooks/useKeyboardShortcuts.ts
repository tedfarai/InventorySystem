import { useEffect } from 'react';
import { AppTab } from '../components/Navbar';

interface ShortcutActions {
  onSearchFocus?: () => void;
  onNewStockItem?: () => void;
  onIssueRequest?: () => void;
  onReceiveDelivery?: () => void;
  onPrintPreview?: () => void;
  onBackupManager?: () => void;
  onUserLogin?: () => void;
  onDepartmentManager?: () => void;
  onSuperiorManager?: () => void;
  onHelpModal?: () => void;
  onEscape?: () => void;
  onTabChange?: (tab: AppTab) => void;
}

export const useKeyboardShortcuts = (actions: ShortcutActions) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Check if user is typing in a textarea or text input (unless it's an Escape or global modifier key)
      const target = e.target as HTMLElement;
      const isInput =
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'SELECT' ||
          target.isContentEditable);

      // 1. Escape key: Close any modal / clear focus
      if (e.key === 'Escape') {
        if (actions.onEscape) {
          actions.onEscape();
        }
        return;
      }

      // 2. Help dialog ('?' key when not in an input, or Ctrl+/)
      if ((e.key === '?' && !isInput) || ((e.ctrlKey || e.metaKey) && e.key === '/')) {
        e.preventDefault();
        actions.onHelpModal?.();
        return;
      }

      const isCtrlOrMeta = e.ctrlKey || e.metaKey;

      // 3. Tab switching shortcuts: Ctrl + Shift + 1..7 or Alt + 1..7
      if (isCtrlOrMeta && e.shiftKey) {
        switch (e.key) {
          case '1':
          case '!':
            e.preventDefault();
            actions.onTabChange?.('simulator');
            return;
          case '2':
          case '@':
            e.preventDefault();
            actions.onTabChange?.('audit');
            return;
          case '3':
          case '#':
            e.preventDefault();
            actions.onTabChange?.('electron');
            return;
          case '4':
          case '$':
            e.preventDefault();
            actions.onTabChange?.('vba');
            return;
          case '5':
          case '%':
            e.preventDefault();
            actions.onTabChange?.('guide');
            return;
          case '6':
          case '^':
            e.preventDefault();
            actions.onTabChange?.('styleguide');
            return;
          case '7':
          case '&':
            e.preventDefault();
            actions.onTabChange?.('export');
            return;
          case 'N':
          case 'n':
            e.preventDefault();
            actions.onNewStockItem?.();
            return;
          case 'D':
          case 'd':
            e.preventDefault();
            actions.onDepartmentManager?.();
            return;
          case 'A':
          case 'a':
            e.preventDefault();
            actions.onSuperiorManager?.();
            return;
          default:
            break;
        }
      }

      // 4. Standard shortcuts with Ctrl / Cmd:
      if (isCtrlOrMeta) {
        const key = e.key.toLowerCase();

        // Ctrl + S or Ctrl + K: Search
        if (key === 's' || key === 'k') {
          e.preventDefault();
          actions.onSearchFocus?.();
          return;
        }

        // Ctrl + I: Requisition / Issue Request
        if (key === 'i' && !e.shiftKey) {
          e.preventDefault();
          actions.onIssueRequest?.();
          return;
        }

        // Ctrl + D: Receive Stock Delivery (without shift)
        if (key === 'd' && !e.shiftKey) {
          e.preventDefault();
          actions.onReceiveDelivery?.();
          return;
        }

        // Ctrl + P: Print Preview
        if (key === 'p') {
          e.preventDefault();
          actions.onPrintPreview?.();
          return;
        }

        // Ctrl + B: Backup Manager
        if (key === 'b') {
          e.preventDefault();
          actions.onBackupManager?.();
          return;
        }

        // Ctrl + U: User Manager / Login
        if (key === 'u') {
          e.preventDefault();
          actions.onUserLogin?.();
          return;
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [actions]);
};
