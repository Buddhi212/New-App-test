import { useState } from 'react';
import { Check, Copy, Download, Share, Smartphone, X } from 'lucide-react';

interface InstallAppModalProps {
  isOpen: boolean;
  onClose: () => void;
  isInstallable: boolean;
  isIOS: boolean;
  onTriggerNativeInstall: () => Promise<boolean>;
}

export function InstallAppModal({
  isOpen,
  onClose,
  isInstallable,
  isIOS,
  onTriggerNativeInstall,
}: InstallAppModalProps) {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const currentUrl = typeof window !== 'undefined' ? window.location.href : '';

  const handleCopyUrl = async () => {
    try {
      await navigator.clipboard.writeText(currentUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      setCopied(false);
    }
  };

  const handleNativeInstall = async () => {
    const accepted = await onTriggerNativeInstall();
    if (accepted) {
      onClose();
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="install-app-title"
    >
      <div className="w-full max-w-md rounded-xl bg-white border border-slate-200 p-6 text-slate-900 shadow-lg">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <Smartphone className="w-5 h-5 text-emerald-700 shrink-0" aria-hidden="true" />
            <h2 id="install-app-title" className="text-base font-bold text-slate-900">
              Download SheetLedger to Phone
            </h2>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close install instructions"
            className="p-1.5 -mr-1.5 -mt-1.5 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <p className="mt-2 text-sm text-slate-600">
          Install SheetLedger as a standalone app on your phone so it opens full-screen and works offline.
        </p>

        {isInstallable && (
          <div className="mt-4">
            <button
              type="button"
              onClick={handleNativeInstall}
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg transition-colors cursor-pointer"
            >
              <Download className="w-4 h-4" aria-hidden="true" />
              <span>Install App Now</span>
            </button>
          </div>
        )}

        <div className="mt-4 space-y-3">
          {(!isIOS || !isInstallable) && (
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3.5">
              <div className="text-xs font-semibold text-slate-900">Android (Chrome / Edge)</div>
              <ol className="mt-1.5 text-xs text-slate-600 space-y-1 list-decimal list-inside">
                <li>Open this link in Chrome on your phone.</li>
                <li>Tap the browser menu (three dots) in the top-right corner.</li>
                <li>
                  Tap <span className="font-semibold text-slate-800">Install app</span> or{' '}
                  <span className="font-semibold text-slate-800">Add to Home screen</span>.
                </li>
              </ol>
            </div>
          )}

          <div className="rounded-lg border border-slate-200 bg-slate-50 p-3.5">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-900">
              <Share className="w-3.5 h-3.5 text-slate-600" aria-hidden="true" />
              <span>iPhone / iPad (Safari)</span>
            </div>
            <ol className="mt-1.5 text-xs text-slate-600 space-y-1 list-decimal list-inside">
              <li>Open this link in Safari on your iPhone or iPad.</li>
              <li>
                Tap the <span className="font-semibold text-slate-800">Share</span> button in the
                bottom bar.
              </li>
              <li>
                Scroll down and tap{' '}
                <span className="font-semibold text-slate-800">Add to Home Screen</span>.
              </li>
            </ol>
          </div>
        </div>

        <div className="mt-4 pt-4 border-t border-slate-200">
          <label htmlFor="install-share-url" className="block text-xs font-medium text-slate-700 mb-1.5">
            Open on your phone
          </label>
          <div className="flex items-center gap-2">
            <input
              id="install-share-url"
              type="text"
              readOnly
              value={currentUrl}
              className="flex-1 min-w-0 h-9 px-2.5 text-xs font-mono text-slate-700 bg-slate-50 border border-slate-300 rounded-md"
            />
            <button
              type="button"
              onClick={handleCopyUrl}
              className="inline-flex items-center gap-1.5 h-9 px-3 text-xs font-semibold text-slate-800 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-700" aria-hidden="true" />
                  <span>Copied</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>Copy Link</span>
                </>
              )}
            </button>
          </div>
        </div>

        <div className="mt-4 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-700 hover:text-slate-900 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg transition-colors cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
