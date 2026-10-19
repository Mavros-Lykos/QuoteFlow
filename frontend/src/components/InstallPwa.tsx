import React, { useEffect, useState } from 'react';
import { Download, X } from 'lucide-react';
import { isDesktop } from '../lib/platform';

const DISMISS_KEY = 'quoteflow_pwa_install_dismissed';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export const InstallPwa: React.FC = () => {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [dismissed, setDismissed] = useState(() => localStorage.getItem(DISMISS_KEY) === '1');
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    if (isDesktop) return;
    const standalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as Navigator & { standalone?: boolean }).standalone === true;
    setIsStandalone(standalone);

    const onBip = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
    };
    window.addEventListener('beforeinstallprompt', onBip);
    return () => window.removeEventListener('beforeinstallprompt', onBip);
  }, []);

  if (isDesktop || isStandalone || dismissed || !deferred) return null;

  const install = async () => {
    await deferred.prompt();
    await deferred.userChoice;
    setDeferred(null);
  };

  const dismiss = () => {
    localStorage.setItem(DISMISS_KEY, '1');
    setDismissed(true);
    setDeferred(null);
  };

  return (
    <div className="banner banner--pwa" role="region" aria-label="Install app">
      <div className="banner__text">
        <Download size={18} aria-hidden style={{ flexShrink: 0 }} />
        <span>
          Add QuoteFlow to your home screen for quick access from the job site.{' '}
          <button type="button" className="link-btn" onClick={() => void install()}>
            Install
          </button>
        </span>
      </div>
      <button type="button" aria-label="Dismiss" onClick={dismiss}>
        <X size={18} />
      </button>
    </div>
  );
};
