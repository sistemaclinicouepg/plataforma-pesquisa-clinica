'use client';

import { useEffect, useRef } from 'react';

/**
 * Componente que mantém a conexão do banco de dados (Neon Serverless)
 * aquecida enquanto o usuário estiver com a aba aberta e ativa,
 * prevenindo o auto-suspend (cold start) durante o uso.
 */
export default function KeepAlive() {
  const lastPingRef = useRef<number>(Date.now());

  useEffect(() => {
    let intervalId: NodeJS.Timeout;

    const doPing = async () => {
      if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
        try {
          await fetch('/api/health', {
            cache: 'no-store',
            headers: { 'Cache-Control': 'no-cache' },
          });
          lastPingRef.current = Date.now();
        } catch (_) {
          // Falha silenciosa em background
        }
      }
    };

    // Ping a cada 3 minutos e 30 segundos (Neon suspende em 5 min)
    intervalId = setInterval(doPing, 210000);

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        const elapsed = Date.now() - lastPingRef.current;
        // Se ficou em background por mais de 3 minutos, acorda o banco de forma preventiva
        if (elapsed > 180000) {
          doPing();
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      clearInterval(intervalId);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  return null;
}
