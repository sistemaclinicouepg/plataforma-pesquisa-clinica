/**
 * Sistema de Sincronização e Resiliência de Rede
 * UEPG Pesquisa Clínica Odontológica
 *
 * Armazena localmente requisições em caso de falha física de rede (ex.: queda de sinal),
 * tentando sempre enviar ao servidor primeiro e retransmitindo pendências automaticamente.
 */

export type OfflineItemType = 'DIARY_REPORT' | 'SESSION_UPDATE' | 'FORM_RESPONSE';

export interface OfflineQueueItem {
  id: string;
  type: OfflineItemType;
  endpoint: string;
  payload: unknown;
  timestamp: string;
  retryCount: number;
  lastError?: string;
}

const STORAGE_KEY = 'uepg_clinical_offline_queue';

export function getOfflineQueue(): OfflineQueueItem[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    console.error('Erro ao ler fila offline:', e);
    return [];
  }
}

export function saveQueue(queue: OfflineQueueItem[]) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(queue));
    window.dispatchEvent(
      new CustomEvent('uepg_offline_queue_updated', { detail: { count: queue.length } })
    );
  } catch (e) {
    console.error('Erro ao salvar fila offline:', e);
  }
}

export function enqueueOfflineItem(
  type: OfflineItemType,
  endpoint: string,
  payload: unknown
): OfflineQueueItem {
  const queue = getOfflineQueue();
  const newItem: OfflineQueueItem = {
    id: `off_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
    type,
    endpoint,
    payload,
    timestamp: new Date().toISOString(),
    retryCount: 0,
  };

  queue.push(newItem);
  saveQueue(queue);
  return newItem;
}

export function removeOfflineItem(id: string): void {
  const queue = getOfflineQueue();
  const filtered = queue.filter((item) => item.id !== id);
  saveQueue(filtered);
}

export function removeOfflineItemByEndpoint(endpoint: string): void {
  const queue = getOfflineQueue();
  const filtered = queue.filter((item) => item.endpoint !== endpoint);
  saveQueue(filtered);
}

/**
 * Tenta enviar imediatamente todos os registros retidos na fila local
 */
export async function syncOfflineQueue(): Promise<{ synced: number; failed: number; total: number }> {
  const queue = getOfflineQueue();
  if (queue.length === 0) {
    return { synced: 0, failed: 0, total: 0 };
  }

  let synced = 0;
  let failed = 0;
  const remaining: OfflineQueueItem[] = [];

  for (const item of queue) {
    try {
      const res = await fetch(item.endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(item.payload),
      });

      if (res.ok) {
        synced++;
      } else {
        item.retryCount += 1;
        item.lastError = `Status HTTP ${res.status}`;
        remaining.push(item);
        failed++;
      }
    } catch (err: unknown) {
      item.retryCount += 1;
      item.lastError = err instanceof Error ? err.message : 'Falha de conexão';
      remaining.push(item);
      failed++;
    }
  }

  saveQueue(remaining);

  if (typeof window !== 'undefined' && synced > 0) {
    window.dispatchEvent(
      new CustomEvent('uepg_offline_synced', {
        detail: { synced, failed, total: queue.length },
      })
    );
  }

  return { synced, failed, total: queue.length };
}

/**
 * Probe ativo para checar se a API do servidor da UEPG está acessível
 */
export async function checkServerConnectivity(): Promise<boolean> {
  if (typeof window === 'undefined') return true;
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 6000);
    const res = await fetch('/api/auth/me', {
      method: 'HEAD',
      signal: controller.signal,
      cache: 'no-store',
    });
    clearTimeout(timeout);
    return res.status < 500;
  } catch {
    return typeof navigator !== 'undefined' ? navigator.onLine : false;
  }
}

// Inicia escuta por eventos de reconexão no navegador
export function setupAutoSyncListener(): () => void {
  if (typeof window === 'undefined') return () => {};

  const handleOnline = () => {
    syncOfflineQueue().then((res) => {
      if (res.synced > 0) {
        console.log(`[OfflineSync] ${res.synced} registros sincronizados com sucesso.`);
      }
    });
  };

  window.addEventListener('online', handleOnline);
  return () => {
    window.removeEventListener('online', handleOnline);
  };
}
