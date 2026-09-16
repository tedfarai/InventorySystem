import React, { useState } from 'react';
import { Download, Sparkles, CheckCircle2, Laptop, Smartphone, X } from 'lucide-react';
import { DraggableResizableModal } from '../common/DraggableResizableModal';

interface PWAInstallButtonProps {
  isInstallable: boolean;
  isInstalled: boolean;
  onInstall: () => Promise<boolean>;
  className?: string;
  variant?: 'navbar' | 'banner' | 'compact';
}

export const PWAInstallButton: React.FC<PWAInstallButtonProps> = ({
  isInstallable,
  isInstalled,
  onInstall,
  className = '',
  variant = 'navbar',
}) => {
  const [isInstalling, setIsInstalling] = useState(false);
  const [showGuideModal, setShowGuideModal] = useState(false);

  const handleInstallClick = async () => {
    if (isInstalled) return;

    if (isInstallable) {
      setIsInstalling(true);
      try {
        await onInstall();
      } finally {
        setIsInstalling(false);
      }
    } else {
      // If browser doesn't expose beforeinstallprompt (e.g. iOS Safari or already running), show quick guide
      setShowGuideModal(true);
    }
  };

  if (isInstalled && variant === 'banner') {
    return null;
  }

  if (isInstalled) {
    return (
      <div
        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-teal-500/10 text-teal-700 dark:text-teal-300 border border-teal-500/20 text-xs font-semibold ${className}`}
        title="ProcureSim is running as an installed standalone Progressive Web App"
      >
        <CheckCircle2 className="w-3.5 h-3.5 text-teal-500" />
        <span className="hidden sm:inline">Installed PWA</span>
      </div>
    );
  }

  if (variant === 'banner') {
    return (
      <>
        <div className="bg-gradient-to-r from-teal-900 via-slate-900 to-slate-950 text-white px-4 py-2.5 border-b border-teal-500/30 flex flex-wrap items-center justify-between gap-3 shadow-md">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-teal-500/20 border border-teal-400/40 flex items-center justify-center shrink-0">
              <Sparkles className="w-4 h-4 text-teal-300" />
            </div>
            <div>
              <div className="text-xs font-bold text-white flex items-center gap-2">
                Install ProcureSim Desktop / Mobile App
                <span className="bg-teal-500/30 text-teal-200 text-[10px] px-1.5 py-0.2 rounded font-mono">100% Offline</span>
              </div>
              <p className="text-[11px] text-slate-300">
                Launch instantly from your dock or desktop with zero network connectivity and zero latency.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleInstallClick}
              disabled={isInstalling}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-teal-500 hover:bg-teal-400 active:bg-teal-600 text-slate-950 font-bold text-xs rounded-lg shadow-sm transition-all cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>{isInstalling ? 'Installing...' : 'Install App'}</span>
            </button>
          </div>
        </div>

        {/* Browser Manual Installation Modal (Safari / Non-prompt Browsers) */}
        {showGuideModal && (
          <DraggableResizableModal
            onClose={() => setShowGuideModal(false)}
            modalId="pwa-install-guide-banner"
            zIndex="z-[100]"
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 my-auto flex flex-col"
          >
            <div
              data-drag-handle="true"
              className="flex items-center justify-between cursor-grab active:cursor-grabbing select-none shrink-0"
            >
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-teal-50 dark:bg-teal-950/60 text-teal-600 dark:text-teal-400">
                  <Laptop className="w-5 h-5" />
                </div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">Install ProcureSim</h3>
              </div>
              <button
                onClick={() => setShowGuideModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-300 shrink-0">
              You can install ProcureSim directly through your browser menu to enjoy standalone window mode, dock access, and full offline caching:
            </p>

            <div className="space-y-2.5 text-xs flex-1 min-h-0 overflow-y-auto">
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 flex items-start gap-2.5">
                <Laptop className="w-4 h-4 text-teal-500 mt-0.5 shrink-0" />
                <div>
                  <span className="font-semibold text-slate-900 dark:text-white">Chrome / Edge / Brave:</span>
                  <p className="text-slate-500 dark:text-slate-400 mt-0.5">
                    Click the <span className="font-semibold text-teal-600 dark:text-teal-400">Install icon (⊕)</span> in the URL bar, or open the menu ⋮ &gt; <span className="font-semibold">Install ProcureSim</span>.
                  </p>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 flex items-start gap-2.5">
                <Smartphone className="w-4 h-4 text-teal-500 mt-0.5 shrink-0" />
                <div>
                  <span className="font-semibold text-slate-900 dark:text-white">Safari (iOS / macOS):</span>
                  <p className="text-slate-500 dark:text-slate-400 mt-0.5">
                    Tap the <span className="font-semibold">Share button (⎋)</span> &gt; <span className="font-semibold text-teal-600 dark:text-teal-400">Add to Home Screen / Dock</span>.
                  </p>
                </div>
              </div>
            </div>

            <div className="pt-2 flex justify-end shrink-0">
              <button
                onClick={() => setShowGuideModal(false)}
                className="px-4 py-2 bg-teal-600 hover:bg-teal-500 text-white rounded-xl text-xs font-semibold shadow-sm cursor-pointer"
              >
                Got It
              </button>
            </div>
          </DraggableResizableModal>
        )}
      </>
    );
  }

  // Navbar variant
  return (
    <>
      <button
        onClick={handleInstallClick}
        disabled={isInstalling}
        title="Install Progressive Web App for offline desktop & mobile launch"
        className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-teal-600 hover:bg-teal-500 active:bg-teal-700 text-white text-xs font-bold shadow-xs transition-all cursor-pointer ${className}`}
      >
        <Download className="w-3.5 h-3.5" />
        <span className="hidden sm:inline">{isInstalling ? 'Installing...' : 'Install App'}</span>
      </button>

      {showGuideModal && (
        <DraggableResizableModal
          onClose={() => setShowGuideModal(false)}
          modalId="pwa-install-guide-navbar"
          zIndex="z-[100]"
          className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 my-auto flex flex-col"
        >
          <div
            data-drag-handle="true"
            className="flex items-center justify-between cursor-grab active:cursor-grabbing select-none shrink-0"
          >
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-teal-50 dark:bg-teal-950/60 text-teal-600 dark:text-teal-400">
                <Laptop className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">Install ProcureSim PWA</h3>
            </div>
            <button
              onClick={() => setShowGuideModal(false)}
              className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <p className="text-xs text-slate-600 dark:text-slate-300 shrink-0">
            ProcureSim is configured as a standalone PWA. Follow these quick steps to install:
          </p>

          <div className="space-y-2.5 text-xs flex-1 min-h-0 overflow-y-auto">
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 flex items-start gap-2.5">
              <Laptop className="w-4 h-4 text-teal-500 mt-0.5 shrink-0" />
              <div>
                <span className="font-semibold text-slate-900 dark:text-white">Chrome / Edge / Brave:</span>
                <p className="text-slate-500 dark:text-slate-400 mt-0.5">
                  Click the <span className="font-semibold text-teal-600 dark:text-teal-400">Install icon (⊕)</span> on the right side of the address bar.
                </p>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 flex items-start gap-2.5">
              <Smartphone className="w-4 h-4 text-teal-500 mt-0.5 shrink-0" />
              <div>
                <span className="font-semibold text-slate-900 dark:text-white">Safari (iOS / macOS):</span>
                <p className="text-slate-500 dark:text-slate-400 mt-0.5">
                  Tap <span className="font-semibold">Share (⎋)</span> &gt; <span className="font-semibold text-teal-600 dark:text-teal-400">Add to Home Screen / Dock</span>.
                </p>
              </div>
            </div>
          </div>

          <div className="pt-2 flex justify-end shrink-0">
            <button
              onClick={() => setShowGuideModal(false)}
              className="px-4 py-2 bg-teal-600 hover:bg-teal-500 text-white rounded-xl text-xs font-semibold shadow-sm cursor-pointer"
            >
              Close
            </button>
          </div>
        </DraggableResizableModal>
      )}
    </>
  );
};
