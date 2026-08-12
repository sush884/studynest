import React, { useState, useEffect } from 'react';
import { WifiOff, CheckCircle2 } from 'lucide-react';

export const OfflineBanner: React.FC = () => {
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [showBackOnline, setShowBackOnline] = useState(false);

  useEffect(() => {
    const handleOffline = () => {
      setIsOffline(true);
      setShowBackOnline(false);
    };

    const handleOnline = () => {
      setIsOffline(false);
      setShowBackOnline(true);
      const timer = setTimeout(() => setShowBackOnline(false), 3000);
      return () => clearTimeout(timer);
    };

    window.addEventListener('offline', handleOffline);
    window.addEventListener('online', handleOnline);

    return () => {
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('online', handleOnline);
    };
  }, []);

  if (isOffline) {
    return (
      <div className="bg-amber-500 text-white text-xs font-extrabold px-4 py-2.5 flex items-center justify-center gap-2 shadow-md animate-pulse sticky top-0 z-50">
        <WifiOff className="w-4 h-4 shrink-0" />
        <span>You're offline. Some StudyNest features may be temporarily unavailable.</span>
      </div>
    );
  }

  if (showBackOnline) {
    return (
      <div className="bg-emerald-600 text-white text-xs font-extrabold px-4 py-2.5 flex items-center justify-center gap-2 shadow-md sticky top-0 z-50 transition-all duration-300">
        <CheckCircle2 className="w-4 h-4 shrink-0" />
        <span>Back online ✓</span>
      </div>
    );
  }

  return null;
};
