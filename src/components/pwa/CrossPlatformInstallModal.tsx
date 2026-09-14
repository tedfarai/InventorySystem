/**
 * ===============================================================================
 * CROSS-PLATFORM PWA INSTALLATION CENTER & MODAL
 * Dedicated installation guides and 1-click install triggers for Windows, macOS, Linux, Android, iOS
 * ===============================================================================
 */

import React, { useState } from 'react';
import {
  Download,
  CheckCircle2,
  Laptop,
  Monitor,
  Apple,
  Terminal,
  Smartphone,
  Sparkles,
  ShieldCheck,
  Zap,
  HardDrive,
  Globe,
  X,
  ExternalLink,
  ChevronRight,
} from 'lucide-react';
import { detectPlatform, PlatformDetails } from '../../utils/platformDetector';
import { PlatformType } from '../../types';

interface CrossPlatformInstallModalProps {
  isOpen: boolean;
  onClose: () => void;
  isInstallable: boolean;
  isInstalled: boolean;
  onDirectInstall: () => Promise<boolean>;
}

export const CrossPlatformInstallModal: React.FC<CrossPlatformInstallModalProps> = ({
  isOpen,
  onClose,
  isInstallable,
  isInstalled,
  onDirectInstall,
}) => {
  const [detected] = useState<PlatformDetails>(() => detectPlatform());
  const [activeTab, setActiveTab] = useState<PlatformType>(detected.platform || 'Windows');
  const [isInstalling, setIsInstalling] = useState(false);

  if (!isOpen) return null;

  const handleTriggerInstall = async () => {
    if (isInstallable) {
      setIsInstalling(true);
      try {
        const success = await onDirectInstall();
        if (success) {
          onClose();
        }
      } finally {
        setIsInstalling(false);
      }
    }
  };

  const platforms: Array<{
    id: PlatformType;
    label: string;
    icon: React.ReactNode;
    osDesc: string;
    steps: string[];
    features: string[];
  }> = [
    {
      id: 'Windows',
      label: 'Windows 10 / 11',
      icon: <Monitor className="w-4 h-4 text-blue-500" />,
      osDesc: 'Microsoft Windows (Edge, Chrome, Brave)',
      steps: [
        'In Microsoft Edge or Google Chrome, look at the address bar on the top right.',
        'Click the "Install App" icon (⊕ or ⤓), or open the browser menu (⋮ / ⋯) > "Apps" > "Install Stationery & Cleaning Inventory".',
        'Click "Install" in the pop-up dialog.',
        'Select "Pin to taskbar" and "Pin to Start Menu" for instant desktop launch.',
      ],
      features: [
        'Zero-latency native desktop window without browser bars',
        'Custom taskbar icon & Start Menu search shortcut',
        '100% offline launch with zero Internet required',
      ],
    },
    {
      id: 'macOS',
      label: 'macOS (Apple Mac)',
      icon: <Apple className="w-4 h-4 text-indigo-400" />,
      osDesc: 'Apple macOS Sequoia / Sonoma / Ventura (Safari, Chrome, Edge)',
      steps: [
        'Safari: Click "File" in the top menu bar > "Add to Dock..." (or click the Share button ⎋ > Add to Dock).',
        'Chrome / Edge: Click the Install icon (⊕) on the right side of the address bar.',
        'Click "Add" or "Install" to create a standalone Mac app in your Applications folder and Dock.',
        'Launch directly from Spotlight search (Command+Space) or your macOS Dock.',
      ],
      features: [
        'Standalone macOS application windowing',
        'High-resolution retina icon on macOS Dock & Launchpad',
        'Seamless Apple Silicon & Intel offline hardware acceleration',
      ],
    },
    {
      id: 'Linux',
      label: 'Linux (Ubuntu/Arch/Fedora)',
      icon: <Terminal className="w-4 h-4 text-orange-500" />,
      osDesc: 'Linux Desktop (Chrome, Chromium, Brave, Edge)',
      steps: [
        'Open this URL in Google Chrome, Chromium, or Brave on your Linux workstation.',
        'Click the Install icon (⊕) in the browser URL omnibox.',
        'Confirm the installation prompt.',
        'The desktop entry is saved to ~/.local/share/applications/ and immediately appears in your GNOME App Grid, KDE Kickoff, or rofi/dmenu.',
      ],
      features: [
        'Native X11 and Wayland standalone window integration',
        'Standard desktop launcher (.desktop) registration',
        'Zero external daemon or background service dependencies',
      ],
    },
    {
      id: 'iOS',
      label: 'iPhone & iPad',
      icon: <Smartphone className="w-4 h-4 text-violet-500" />,
      osDesc: 'Apple iOS & iPadOS (Safari)',
      steps: [
        'Open this URL in Apple Safari on your iPhone or iPad.',
        'Tap the Share icon (⎋) at the bottom (iPhone) or top (iPad) of the screen.',
        'Scroll down and tap "Add to Home Screen".',
        'Tap "Add" in the top-right corner to place the app on your home screen.',
      ],
      features: [
        'Full-screen touch interface with no Safari navigation bars',
        'Instant warehouse inventory checks on the go',
        'Offline capability with local SQLite database storage',
      ],
    },
    {
      id: 'Android',
      label: 'Android Phone / Tablet',
      icon: <Smartphone className="w-4 h-4 text-emerald-500" />,
      osDesc: 'Android (Chrome, Samsung Internet, Edge)',
      steps: [
        'Open this URL in Google Chrome on your Android device.',
        'Tap the three dots (⋮) in the top-right corner.',
        'Tap "Install app" or "Add to Home screen".',
        'Follow the system installation prompt to install ProcureSim.',
      ],
      features: [
        'Installs as a native Android app in your app drawer',
        'Full offline warehouse barcode scanning and requisition workflow',
        'Fast launch with zero data consumption',
      ],
    },
  ];

  const currentPlatformInfo = platforms.find((p) => p.id === activeTab) || platforms[0];

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-3xl shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-gradient-to-r from-teal-950 via-slate-900 to-slate-950 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-teal-500/20 border border-teal-400/40 flex items-center justify-center text-teal-300">
              <Download className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-white">
                  Cross-Platform PWA Installation
                </h2>
                <span className="bg-teal-500/20 text-teal-200 text-[10px] px-2 py-0.5 rounded font-mono font-bold">
                  Windows • Mac • Linux
                </span>
              </div>
              <p className="text-xs text-slate-300">
                Install as a standalone native desktop app with 100% offline capability and instant multi-user cloud sync.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 1-Click Fast Install Bar (if available in this browser) */}
        {isInstallable && (
          <div className="px-6 py-3.5 bg-teal-50 dark:bg-teal-950/40 border-b border-teal-200 dark:border-teal-800/60 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-teal-600 dark:text-teal-400 shrink-0" />
              <span className="text-xs font-semibold text-slate-800 dark:text-teal-200">
                One-Click Installation is supported in this browser!
              </span>
            </div>

            <button
              onClick={handleTriggerInstall}
              disabled={isInstalling}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 active:bg-teal-700 text-white font-bold text-xs shadow-md transition-all cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>{isInstalling ? 'Installing...' : '1-Click Install Now'}</span>
            </button>
          </div>
        )}

        {/* OS Platform Tabs */}
        <div className="px-6 pt-4 pb-0 bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex items-center gap-2 overflow-x-auto">
          {platforms.map((p) => {
            const isSelected = activeTab === p.id;
            const isCurrent = detected.platform === p.id;
            return (
              <button
                key={p.id}
                onClick={() => setActiveTab(p.id)}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-t-xl text-xs font-bold transition-all cursor-pointer border-t border-x -mb-px ${
                  isSelected
                    ? 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white shadow-xs'
                    : 'bg-transparent border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                }`}
              >
                {p.icon}
                <span>{p.label}</span>
                {isCurrent && (
                  <span className="text-[9px] bg-teal-100 dark:bg-teal-950 text-teal-700 dark:text-teal-300 px-1.5 py-0.2 rounded font-mono font-normal">
                    Detected
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Platform Guide Body */}
        <div className="p-6 space-y-5 bg-white dark:bg-slate-900 overflow-y-auto max-h-[60vh]">
          {/* OS Banner */}
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-lg bg-white dark:bg-slate-800 shadow-xs border border-slate-200 dark:border-slate-700">
                {currentPlatformInfo.icon}
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  {currentPlatformInfo.label} Installation Guide
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {currentPlatformInfo.osDesc}
                </p>
              </div>
            </div>

            {isInstalled && (
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 text-xs font-semibold">
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                <span>Installed</span>
              </div>
            )}
          </div>

          {/* Step-by-Step Instructions */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
              Step-by-Step Installation Instructions
            </h4>

            <div className="space-y-2.5">
              {currentPlatformInfo.steps.map((step, index) => (
                <div
                  key={index}
                  className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 flex items-start gap-3 text-xs"
                >
                  <div className="w-5 h-5 rounded-full bg-teal-600 text-white font-bold text-[10px] flex items-center justify-center shrink-0 mt-0.5">
                    {index + 1}
                  </div>
                  <p className="text-slate-700 dark:text-slate-200 leading-relaxed font-medium">
                    {step}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* App Capabilities */}
          <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
            <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
              Native Features Included on {currentPlatformInfo.label}
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
              {currentPlatformInfo.features.map((feat, idx) => (
                <div
                  key={idx}
                  className="p-2.5 rounded-lg bg-teal-50/50 dark:bg-teal-950/20 border border-teal-100 dark:border-teal-900/40 flex items-center gap-2 text-slate-700 dark:text-slate-300"
                >
                  <CheckCircle2 className="w-3.5 h-3.5 text-teal-500 shrink-0" />
                  <span className="text-[11px] leading-tight font-medium">{feat}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/80 flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <ShieldCheck className="w-4 h-4 text-emerald-500" />
            <span>Encrypted WebApp • 100% Zero-Loss SQLite &amp; Cloud Sync</span>
          </div>

          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-bold transition-colors cursor-pointer"
          >
            Close Guide
          </button>
        </div>
      </div>
    </div>
  );
};
