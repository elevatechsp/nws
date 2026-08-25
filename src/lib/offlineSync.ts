// src/lib/offlineSync.ts
import { supabase } from '@/lib/supabase';

export interface PendingSubmission {
  id: string;
  project_id: string;
  project_name: string;
  operator: string;
  operator_user_id?: string | null;
  tenant_id?: string | null;
  company_name: string;
  location?: string;
  submitted_at: string;
  status: 'pending' | 'approved' | 'rejected';
  data: Record<string, any>;
  created_at: string;
  synced?: boolean;
}

const OFFLINE_STORAGE_KEY = 'nws_offline_submissions_queue';

// Salva a coleta localmente no dispositivo do operador
export const saveOfflineSubmission = (submission: Omit<PendingSubmission, 'synced'>): PendingSubmission => {
  const item: PendingSubmission = {
    ...submission,
    synced: false
  };

  const raw = localStorage.getItem(OFFLINE_STORAGE_KEY);
  const queue: PendingSubmission[] = raw ? JSON.parse(raw) : [];
  queue.push(item);
  localStorage.setItem(OFFLINE_STORAGE_KEY, JSON.stringify(queue));

  return item;
};

// Retorna todas as coletas pendentes salvas no aparelho
export const getPendingSubmissions = (): PendingSubmission[] => {
  if (typeof window === 'undefined') return [];
  const raw = localStorage.getItem(OFFLINE_STORAGE_KEY);
  return raw ? JSON.parse(raw) : [];
};

// Sincroniza a fila local com o Supabase quando houver internet
export const syncOfflineSubmissions = async (): Promise<{ successCount: number; failedCount: number }> => {
  if (typeof window === 'undefined' || !navigator.onLine) {
    return { successCount: 0, failedCount: 0 };
  }

  const queue = getPendingSubmissions();
  if (queue.length === 0) return { successCount: 0, failedCount: 0 };

  let successCount = 0;
  let remainingQueue: PendingSubmission[] = [];

  for (const item of queue) {
    try {
      // Sanitiza o objeto para enviar apenas as colunas exatas existentes no Supabase
      const payload = {
        id: item.id,
        project_id: item.project_id,
        project_name: item.project_name,
        operator: item.operator,
        operator_user_id: item.operator_user_id || null,
        tenant_id: item.tenant_id || null,
        company_name: item.company_name,
        location: item.location || 'Coleta em Campo',
        submitted_at: item.submitted_at,
        status: item.status || 'pending',
        data: item.data || {},
        created_at: item.created_at || new Date().toISOString(),
      };

      const { error } = await supabase.from('submissions').insert([payload]);

      if (error) {
        console.error('Erro ao sincronizar item offline:', error.message);
        remainingQueue.push(item);
      } else {
        successCount++;
      }
    } catch (err) {
      remainingQueue.push(item);
    }
  }

  // Atualiza a fila apenas com os itens que ainda não conseguiram subir
  localStorage.setItem(OFFLINE_STORAGE_KEY, JSON.stringify(remainingQueue));

  return {
    successCount,
    failedCount: remainingQueue.length,
  };
};