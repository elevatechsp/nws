// src/components/IdleTimer.tsx
'use client';

import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';

// 10 minutos (10 * 60 * 1000)
const INACTIVITY_TIMEOUT_MS = 10 * 60 * 1000;

export default function IdleTimer() {
  const pathname = usePathname();
  const lastActivityRef = useRef<number>(Date.now());

  useEffect(() => {
    if (pathname === '/login') return;

    const resetTimer = () => {
      lastActivityRef.current = Date.now();
    };

    const events = ['mousedown', 'keydown', 'scroll', 'touchstart', 'click'];
    events.forEach(event => window.addEventListener(event, resetTimer, { passive: true }));

    const interval = setInterval(() => {
      if (pathname === '/login') return;

      const elapsed = Date.now() - lastActivityRef.current;

      if (elapsed >= INACTIVITY_TIMEOUT_MS) {
        clearInterval(interval);
        sessionStorage.clear();
        localStorage.clear();
        window.location.href = '/login';
      }
    }, 1000);

    return () => {
      events.forEach(event => window.removeEventListener(event, resetTimer));
      clearInterval(interval);
    };
  }, [pathname]);

  return null;
}