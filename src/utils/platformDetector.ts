/**
 * ===============================================================================
 * PLATFORM DETECTOR UTILITY
 * Detects Windows, macOS, Linux, ChromeOS, Android, iOS and provides native PWA install guides
 * ===============================================================================
 */

import { PlatformType } from '../types';

export interface PlatformDetails {
  platform: PlatformType;
  browser: 'Chrome' | 'Edge' | 'Safari' | 'Firefox' | 'Brave' | 'Opera' | 'Unknown';
  isStandalone: boolean;
  canDirectInstall: boolean;
  osName: string;
  installSteps: string[];
  shortcutKey: string;
  badgeColor: string;
}

export function detectPlatform(): PlatformDetails {
  if (typeof window === 'undefined') {
    return {
      platform: 'Web',
      browser: 'Unknown',
      isStandalone: false,
      canDirectInstall: false,
      osName: 'Web Browser',
      installSteps: ['Open in Chrome or Edge and click Install'],
      shortcutKey: 'Ctrl',
      badgeColor: 'bg-slate-500',
    };
  }

  const userAgent = window.navigator.userAgent.toLowerCase();
  const platformStr = (window.navigator as any).userAgentData?.platform || window.navigator.platform?.toLowerCase() || '';

  let platform: PlatformType = 'Web';
  let osName = 'Web Browser';
  let shortcutKey = 'Ctrl';
  let badgeColor = 'bg-teal-500';

  if (/win/.test(platformStr) || /windows/.test(userAgent)) {
    platform = 'Windows';
    osName = 'Windows (10 / 11)';
    shortcutKey = 'Ctrl';
    badgeColor = 'bg-blue-600';
  } else if (/mac/.test(platformStr) || /macintosh|mac os x/.test(userAgent)) {
    platform = 'macOS';
    osName = 'macOS (Apple Silicon / Intel)';
    shortcutKey = '⌘ Command';
    badgeColor = 'bg-indigo-600';
  } else if (/cros/.test(userAgent)) {
    platform = 'ChromeOS';
    osName = 'ChromeOS';
    shortcutKey = 'Ctrl';
    badgeColor = 'bg-amber-600';
  } else if (/linux/.test(platformStr) || /linux/.test(userAgent)) {
    platform = 'Linux';
    osName = 'Linux (Ubuntu, Fedora, Arch, Debian)';
    shortcutKey = 'Ctrl';
    badgeColor = 'bg-orange-600';
  } else if (/iphone|ipad|ipod/.test(userAgent)) {
    platform = 'iOS';
    osName = 'iOS / iPadOS';
    shortcutKey = '';
    badgeColor = 'bg-violet-600';
  } else if (/android/.test(userAgent)) {
    platform = 'Android';
    osName = 'Android';
    shortcutKey = '';
    badgeColor = 'bg-emerald-600';
  }

  // Browser detection
  let browser: 'Chrome' | 'Edge' | 'Safari' | 'Firefox' | 'Brave' | 'Opera' | 'Unknown' = 'Unknown';
  if ((navigator as any).brave && typeof (navigator as any).brave.isBrave === 'function') {
    browser = 'Brave';
  } else if (userAgent.includes('edg/')) {
    browser = 'Edge';
  } else if (userAgent.includes('opr/') || userAgent.includes('opera/')) {
    browser = 'Opera';
  } else if (userAgent.includes('chrome') && !userAgent.includes('edg/')) {
    browser = 'Chrome';
  } else if (userAgent.includes('safari') && !userAgent.includes('chrome')) {
    browser = 'Safari';
  } else if (userAgent.includes('firefox')) {
    browser = 'Firefox';
  }

  // Standalone detection
  const isStandalone =
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as any).standalone === true ||
    document.referrer.includes('android-app://');

  // Generate customized platform installation steps
  const installSteps: string[] = [];

  if (platform === 'Windows') {
    if (browser === 'Edge') {
      installSteps.push('Click the App Available icon (⊕) on the right side of the URL bar.');
      installSteps.push('Click "Install" when prompted by Microsoft Edge.');
      installSteps.push('Check "Pin to taskbar" and "Pin to Start" for instant 1-click launch.');
    } else if (browser === 'Chrome') {
      installSteps.push('Click the Install icon (⊕ / ⤓) in the address bar.');
      installSteps.push('Click "Install" to create a dedicated Windows desktop shortcut.');
      installSteps.push('The app opens in a distraction-free standalone desktop window.');
    } else {
      installSteps.push('In Chrome or Edge, click the three-dots menu (⋮) in the top-right.');
      installSteps.push('Select "Install Stationery & Cleaning Inventory..." or "Apps > Install this site as an app".');
      installSteps.push('Launch from the Start Menu, Taskbar, or Desktop shortcut.');
    }
  } else if (platform === 'macOS') {
    if (browser === 'Safari') {
      installSteps.push('In the top macOS menu bar, click "File" > "Add to Dock..." (or click Share ⎋ > Add to Dock).');
      installSteps.push('Name the application "ProcureSim" and click "Add".');
      installSteps.push('Launch directly from your macOS Dock or Launchpad like a native Mac app.');
    } else if (browser === 'Chrome' || browser === 'Edge' || browser === 'Brave') {
      installSteps.push('Click the Install icon (⊕) on the right side of the address bar.');
      installSteps.push('Click "Install" to add to your macOS Applications folder and Dock.');
      installSteps.push('Use Command+Space (Spotlight) to launch "ProcureSim" anytime.');
    } else {
      installSteps.push('Open this URL in Google Chrome or Safari on macOS.');
      installSteps.push('Click "Install App" or use File > Add to Dock.');
    }
  } else if (platform === 'Linux') {
    installSteps.push('In Chrome / Chromium / Brave, click the Install icon (⊕) in the omnibox.');
    installSteps.push('Click "Install" to automatically generate a .desktop file in ~/.local/share/applications/.');
    installSteps.push('Launch from GNOME App Grid, KDE Kickoff, or your system launcher.');
    installSteps.push('Fully compatible with Wayland and X11 native desktop windowing.');
  } else if (platform === 'iOS') {
    installSteps.push('Tap the Share button (⎋) at the bottom of Safari.');
    installSteps.push('Scroll down and tap "Add to Home Screen".');
    installSteps.push('Tap "Add" in the top right corner.');
  } else if (platform === 'Android') {
    installSteps.push('Tap the three dots (⋮) in Chrome.');
    installSteps.push('Tap "Install app" or "Add to Home screen".');
    installSteps.push('Follow the system prompt to install.');
  } else {
    installSteps.push('Open the browser menu and select "Install app" or "Add to Home screen".');
  }

  return {
    platform,
    browser,
    isStandalone,
    canDirectInstall: !isStandalone,
    osName,
    installSteps,
    shortcutKey,
    badgeColor,
  };
}
