'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Wifi, WifiOff, RefreshCw, CheckCircle } from 'lucide-react';
import {
  getOfflineQueue,
  syncOfflineQueue,
  setupAutoSyncListener,
  checkServerConnectivity,
} from '@/lib/offlineSync';

export function ConnectivityBadge({ className = '' }: { className?: string }) {
  const [isOnline, setIsOnline] = useState<boolean>(true);
  const [queueCount, setQueueCount] = useState<number>(() => getOfflineQueue().length);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    let mounted = true;

    const verifyNetwork = async () => {
      const reachable = await checkServerConnectivity();
      if (mounted) {
        setIsOnline(reachable);
        setQueueCount(getOfflineQueue().length);
      }
    };

    verifyNetwork();

    const updateStatus = () => {
      verifyNetwork();
    };

    window.addEventListener('online', updateStatus);
    window.addEventListener('offline', updateStatus);
    window.addEventListener('uepg_offline_queue_updated', updateStatus);
    window.addEventListener('uepg_offline_synced', updateStatus);

    const interval = setInterval(verifyNetwork, 25000);

    return () => {
      mounted = false;
      clearInterval(interval);
      window.removeEventListener('online', updateStatus);
      window.removeEventListener('offline', updateStatus);
      window.removeEventListener('uepg_offline_queue_updated', updateStatus);
      window.removeEventListener('uepg_offline_synced', updateStatus);
    };
  }, []);

  if (!isOnline && queueCount > 0) {
    return (
      <span
        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-100 text-amber-900 border border-amber-300 shadow-2xs ${className}`}
        title="Dispositivo sem conexão no momento. Dados armazenados localmente e sincronizados automaticamente."
      >
        <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
        <WifiOff className="w-3 h-3 text-amber-600" />
        <span>Fila Local ({queueCount})</span>
      </span>
    );
  }

  if (!isOnline) {
    return (
      <span
        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-slate-200 text-slate-700 border border-slate-300 shadow-2xs ${className}`}
        title="Sem resposta da rede no momento."
      >
        <span className="w-2 h-2 rounded-full bg-slate-500" />
        <WifiOff className="w-3 h-3 text-slate-500" />
        <span>Sem Rede</span>
      </span>
    );
  }

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 shadow-2xs ${className}`}
      title="Conectado ao servidor da UEPG."
    >
      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
      <Wifi className="w-3 h-3 text-emerald-600" />
      <span>Online</span>
    </span>
  );
}

export default function OfflineIndicator() {
  const [isOnline, setIsOnline] = useState<boolean>(true);
  const [queueCount, setQueueCount] = useState<number>(() => getOfflineQueue().length);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [syncFeedback, setSyncFeedback] = useState<string | null>(null);

  const handleManualSync = useCallback(async () => {
    if (isSyncing) return;
    setIsSyncing(true);
    setSyncFeedback(null);
    try {
      const res = await syncOfflineQueue();
      setQueueCount(getOfflineQueue().length);
      if (res.synced > 0) {
        setIsOnline(true);
        setSyncFeedback(`${res.synced} alteração(ões) gravada(s) no servidor!`);
        setTimeout(() => setSyncFeedback(null), 4000);
      }
    } catch (e) {
      console.error('Erro na sincronização da fila:', e);
    } finally {
      setIsSyncing(false);
    }
  }, [isSyncing]);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Desregistrar ativamente qualquer Service Worker legado para não bloquear a navegação
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistrations().then((registrations) => {
        for (const reg of registrations) {
          reg.unregister().then(() => console.log('[PWA] Service Worker desativado.'));
        }
      });
    }

    // Limpar caches HTTP antigos que poderiam prender respostas 503
    if ('caches' in window) {
      caches.keys().then((names) => {
        for (const name of names) {
          caches.delete(name);
        }
      });
    }

    // Verificar conectividade real com o servidor
    const checkStatus = async () => {
      const reachable = await checkServerConnectivity();
      setIsOnline(reachable);
      setQueueCount(getOfflineQueue().length);
      if (reachable && getOfflineQueue().length > 0) {
        handleManualSync();
      }
    };

    checkStatus();

    const handleQueueChange = () => {
      setQueueCount(getOfflineQueue().length);
    };

    window.addEventListener('online', checkStatus);
    window.addEventListener('offline', checkStatus);
    window.addEventListener('uepg_offline_queue_updated', handleQueueChange);

    const cleanupListener = setupAutoSyncListener();

    return () => {
      window.removeEventListener('online', checkStatus);
      window.removeEventListener('offline', checkStatus);
      window.removeEventListener('uepg_offline_queue_updated', handleQueueChange);
      cleanupListener();
    };
  }, [handleManualSync]);

  // Se está online e não há dados pendentes na fila nem feedback ativo, não polui a tela
  if (isOnline && queueCount === 0 && !syncFeedback) {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 animate-fadeIn flex flex-col items-end space-y-2 pointer-events-auto">
      {/* Feedback de Sincronização Concluída */}
      {syncFeedback && (
        <div className="bg-emerald-600 text-white text-xs font-bold px-3 py-1.5 rounded-full shadow-lg flex items-center space-x-1.5 animate-bounce">
          <CheckCircle className="w-3.5 h-3.5" />
          <span>{syncFeedback}</span>
        </div>
      )}

      {/* Pill Principal de Conectividade & Fila */}
      <div
        className={`px-3.5 py-2 rounded-2xl shadow-xl border flex items-center space-x-2.5 backdrop-blur-md transition-all ${
          !isOnline
            ? queueCount > 0
              ? 'bg-amber-900/95 border-amber-600 text-amber-100 ring-2 ring-amber-500/50'
              : 'bg-slate-900/90 border-slate-700 text-slate-200'
            : 'bg-slate-900/90 border-slate-700 text-slate-100'
        }`}
      >
        <div className="flex items-center space-x-1.5">
          {!isOnline ? (
            <WifiOff className="w-4 h-4 text-amber-400 animate-pulse" />
          ) : (
            <Wifi className="w-4 h-4 text-emerald-400" />
          )}
          <span className="text-xs font-bold">
            {!isOnline
              ? queueCount > 0
                ? 'Fila de Alterações Local'
                : 'Sem Conexão'
              : 'Conectado'}
          </span>
        </div>

        {queueCount > 0 && (
          <div className="flex items-center space-x-1.5 pl-2 border-l border-white/20">
            <span className="text-[11px] bg-white/20 px-2 py-0.5 rounded-full font-mono font-bold">
              {queueCount} {queueCount === 1 ? 'pendência' : 'pendências'}
            </span>
            <button
              onClick={handleManualSync}
              disabled={isSyncing}
              title="Salvar pendências agora no servidor da UEPG"
              className="p-1 hover:bg-white/20 rounded-lg transition disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
