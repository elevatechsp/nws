// src/app/collect/page.tsx
'use client';

import React, { Suspense, useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { 
  Wifi, WifiOff, Send, CheckCircle2, ArrowLeft, 
  RotateCw, ShieldCheck,
  Layers, ChevronRight, Clock, 
  Check, X, FileText, RefreshCw,
  Save, AlertTriangle, Trash2
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import DynamicField from '@/components/DynamicField';
import { FormField } from '@/types/project';
import { 
  saveOfflineSubmission, 
  syncOfflineSubmissions, 
  getPendingSubmissions,
  PendingSubmission
} from '@/lib/offlineSync';

function CollectAppContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const rawId = searchParams.get('id');
  const projectIdFromUrl = rawId ? String(rawId).trim() : '';

  const { user: contextUser } = useAuth();
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [isAuthReady, setIsAuthReady] = useState(false);

  // Navegação
  const [currentTab, setCurrentTab] = useState<'forms' | 'my_submissions'>('forms');
  const [selectedProjectId, setSelectedProjectId] = useState<string>(projectIdFromUrl);
  
  // Dados
  const [availableProjects, setAvailableProjects] = useState<any[]>([]);
  const [project, setProject] = useState<any | null>(null);
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [myHistorySubmissions, setMyHistorySubmissions] = useState<any[]>([]);

  // Estados de Operação
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isOnline, setIsOnline] = useState(true);
  const [pendingQueue, setPendingQueue] = useState<PendingSubmission[]>([]);
  
  // Modais e Feedback
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showExitConfirmModal, setShowExitConfirmModal] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [hasRestoredDraft, setHasRestoredDraft] = useState(false);

  const initialSyncTriggered = useRef(false);

  // 1. Verificação Síncrona / Imediata de Sessão
  useEffect(() => {
    let active = contextUser;
    if (!active && typeof window !== 'undefined') {
      const saved = 
        sessionStorage.getItem('nws_auth_session') || 
        sessionStorage.getItem('nws_current_session') ||
        localStorage.getItem('nws_auth_session') ||
        localStorage.getItem('nws_current_session');
      if (saved) {
        try { active = JSON.parse(saved); } catch {}
      }
    }

    if (!active) {
      router.replace('/collect/login');
      return;
    }

    setCurrentUser(active);
    setIsAuthReady(true);
  }, [contextUser, router]);

  // 2. Monitoramento de Rede
  useEffect(() => {
    if (typeof window === 'undefined') return;
    setIsOnline(navigator.onLine);

    const handleOnline = () => { 
      setIsOnline(true); 
      triggerAutoSync(); 
    };
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const refreshQueue = useCallback(() => {
    const queue = getPendingSubmissions();
    setPendingQueue(queue);
  }, []);

  useEffect(() => {
    refreshQueue();
  }, [refreshQueue]);

  // 3. Gerenciamento de Rascunhos e Proteção de Saída
  const getDraftKey = useCallback((projId: string) => `nws_draft_${projId}`, []);

  const hasUnsavedChanges = useMemo(() => {
    if (!project) return false;
    return Object.values(formData).some((v) => v !== undefined && v !== '' && v !== null);
  }, [formData, project]);

  // Carregar rascunho ao selecionar o projeto
  useEffect(() => {
    if (project) {
      const savedDraft = localStorage.getItem(getDraftKey(project.id));
      if (savedDraft) {
        try {
          const parsed = JSON.parse(savedDraft);
          setFormData(parsed);
          setHasRestoredDraft(true);
          showToast('Rascunho anterior recuperado neste aparelho!');
        } catch {
          setFormData({});
        }
      } else {
        setFormData({});
        setHasRestoredDraft(false);
      }
    }
  }, [project, getDraftKey]);

  // Alerta nativo ao tentar fechar/recarregar a aba do navegador com dados não enviados
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasUnsavedChanges]);

  const handleSaveDraft = () => {
    if (!project) return;
    localStorage.setItem(getDraftKey(project.id), JSON.stringify(formData));
    setHasRestoredDraft(true);
    showToast('Rascunho temporário salvo com sucesso!');
  };

  const handleClearDraft = () => {
    if (!project) return;
    localStorage.removeItem(getDraftKey(project.id));
    setFormData({});
    setHasRestoredDraft(false);
    showToast('Rascunho descartado.');
  };

  const handleBackRequest = () => {
    if (hasUnsavedChanges) {
      setShowExitConfirmModal(true);
    } else {
      setSelectedProjectId('');
      setProject(null);
      setFormData({});
      setHasRestoredDraft(false);
    }
  };

  // 4. Histórico do Operador (Fallback Offline Imediato)
  const loadMySubmissions = useCallback(async (operatorName: string) => {
    if (!operatorName) return;

    if (typeof window !== 'undefined') {
      const cached = localStorage.getItem(`nws_my_submissions_${operatorName}`);
      if (cached) {
        try { setMyHistorySubmissions(JSON.parse(cached)); } catch {}
      }
    }

    if (!navigator.onLine) return;

    try {
      const { data } = await supabase
        .from('submissions')
        .select('*')
        .eq('operator', operatorName)
        .order('created_at', { ascending: false });

      if (data) {
        setMyHistorySubmissions(data);
        localStorage.setItem(`nws_my_submissions_${operatorName}`, JSON.stringify(data));
      }
    } catch {}
  }, []);

  // 5. Carregar Formulários
  const loadProjects = useCallback(async (user: any) => {
    if (!user) return;

    let list: any[] = [];
    const cacheKey = `nws_cached_forms_${user.companyName || 'all'}`;

    if (typeof window !== 'undefined') {
      const cached = localStorage.getItem(cacheKey);
      if (cached) {
        try { list = JSON.parse(cached); } catch {}
      }
    }

    if (list.length > 0) {
      if (user.role === 'operator' && user.allowedProjectIds?.length > 0) {
        list = list.filter((p: any) => user.allowedProjectIds.includes(p.id));
      }
      setAvailableProjects(list);
      if (selectedProjectId) {
        const target = list.find((p: any) => String(p.id) === String(selectedProjectId));
        setProject(target || null);
      }
    } else {
      setIsLoading(true);
    }

    if (!navigator.onLine) {
      setIsLoading(false);
      return;
    }

    try {
      let query = supabase.from('projects').select('*').order('created_at', { ascending: false });

      if (user.role !== 'sysadmin') {
        if (user.tenantId) {
          query = query.eq('tenant_id', user.tenantId);
        } else if (user.companyName) {
          query = query.eq('company_name', user.companyName);
        }
      }

      const { data } = await query;
      if (data && data.length > 0) {
        localStorage.setItem(cacheKey, JSON.stringify(data));
        let filtered = data;
        if (user.role === 'operator' && user.allowedProjectIds?.length > 0) {
          filtered = data.filter((p: any) => user.allowedProjectIds.includes(p.id));
        }
        setAvailableProjects(filtered);
        if (selectedProjectId) {
          const target = filtered.find((p: any) => String(p.id) === String(selectedProjectId));
          setProject(target || null);
        }
      }
    } catch {
    } finally {
      setIsLoading(false);
    }
  }, [selectedProjectId]);

  useEffect(() => {
    if (isAuthReady && currentUser && !initialSyncTriggered.current) {
      initialSyncTriggered.current = true;
      loadProjects(currentUser);
      loadMySubmissions(currentUser.name);
    }
  }, [isAuthReady, currentUser, loadProjects, loadMySubmissions]);

  // Sincronização
  const triggerAutoSync = async () => {
    if (!navigator.onLine) return;
    setIsSyncing(true);
    try {
      const { successCount } = await syncOfflineSubmissions();
      refreshQueue();
      if (currentUser?.name) {
        await loadMySubmissions(currentUser.name);
      }
      if (successCount > 0) {
        showToast(`${successCount} coleta(s) sincronizada(s) na nuvem!`);
      }
    } finally {
      setIsSyncing(false);
    }
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const handlePreSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!project || !currentUser) return;
    setShowConfirmModal(true);
  };

  const handleConfirmAndSave = async () => {
    setShowConfirmModal(false);
    setIsSubmitting(true);

    const now = new Date();
    const formattedTimestamp = now.toLocaleString('pt-BR', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });

    const submissionPayload: PendingSubmission = {
      id: `REC-${Math.floor(10000 + Math.random() * 90000)}`,
      project_id: String(project.id),
      project_name: project.name,
      operator: currentUser.name,
      operator_user_id: currentUser.id || null,
      tenant_id: project.tenant_id || currentUser.tenantId || null,
      company_name: project.company_name || currentUser.companyName || 'Empresa',
      location: 'Coleta em Campo (Mobile)',
      submitted_at: formattedTimestamp,
      status: 'pending',
      data: formData,
      created_at: now.toISOString(),
    };

    try {
      if (navigator.onLine) {
        const { error } = await supabase.from('submissions').insert([submissionPayload]);
        if (error) throw error;
        showToast('Coleta enviada com sucesso!');
      } else {
        saveOfflineSubmission(submissionPayload);
        refreshQueue();
        showToast('Modo Offline: Coleta salva no aparelho!');
      }

      // Limpa o rascunho temporário deste projeto após a finalização
      localStorage.removeItem(getDraftKey(project.id));
      setFormData({});
      setSelectedProjectId('');
      setProject(null);
      setHasRestoredDraft(false);
      if (currentUser?.name) loadMySubmissions(currentUser.name);

    } catch {
      saveOfflineSubmission(submissionPayload);
      refreshQueue();
      showToast('Salvo offline no dispositivo.');
      localStorage.removeItem(getDraftKey(project.id));
      setFormData({});
      setSelectedProjectId('');
      setProject(null);
      setHasRestoredDraft(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  const unifiedMySubmissions = useMemo(() => {
    const cloudIds = new Set(myHistorySubmissions.map(s => s.id));
    const uniqueOffline = pendingQueue
      .filter(p => p.operator === currentUser?.name && !cloudIds.has(p.id))
      .map(p => ({
        ...p,
        isOfflinePending: true
      }));

    const cloudItems = myHistorySubmissions.map(p => ({
      ...p,
      isOfflinePending: false
    }));

    return [...uniqueOffline, ...cloudItems];
  }, [pendingQueue, myHistorySubmissions, currentUser]);

  if (!isAuthReady) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 text-white text-center">
        <div className="w-10 h-10 border-3 border-teal-400 border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-xs font-bold text-slate-300">Carregando painel do operador...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col font-sans pb-20 select-none">
      
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-4 left-4 right-4 z-50 max-w-sm mx-auto bg-slate-900 text-white p-3.5 rounded-2xl shadow-2xl border border-teal-500/50 flex items-center gap-2.5 animate-in slide-in-from-top text-xs font-bold">
          <CheckCircle2 className="w-4 h-4 text-teal-400 shrink-0" />
          <span className="flex-1">{toastMessage}</span>
          <button onClick={() => setToastMessage(null)} className="text-slate-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Header */}
      <header className="bg-slate-900 text-white sticky top-0 z-40 px-4 py-3 shadow-md border-b border-slate-800">
        <div className="max-w-md mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-teal-500/20 border border-teal-500/40 text-teal-400 flex items-center justify-center font-black text-xs">
              {currentUser?.name?.charAt(0) || 'O'}
            </div>
            <div>
              <span className="text-xs font-black block leading-none">{currentUser?.name}</span>
              <span className="text-[10px] text-teal-400 font-bold uppercase tracking-wider">
                {currentUser?.companyName}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className={`px-2.5 py-1 rounded-full text-[10px] font-black flex items-center gap-1 border ${
              isOnline 
                ? 'bg-emerald-950/80 border-emerald-500/40 text-emerald-300' 
                : 'bg-amber-950/80 border-amber-500/40 text-amber-300 animate-pulse'
            }`}>
              {isOnline ? <Wifi className="w-3 h-3 text-emerald-400" /> : <WifiOff className="w-3.5 h-3.5" />}
              <span>{isOnline ? 'Online' : 'Offline'}</span>
            </div>
          </div>
        </div>
      </header>

      {/* Conteúdo Principal */}
      <main className="max-w-md mx-auto w-full p-4 flex-1 flex flex-col space-y-4">
        {project ? (
          <div className="space-y-4 animate-in fade-in">
            {/* Barra Superior do Formulário */}
            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={handleBackRequest}
                className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-600 hover:text-slate-900 bg-white px-3 py-1.5 rounded-xl border border-slate-200 shadow-2xs cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" /> Voltar
              </button>

              <div className="flex items-center gap-2">
                {hasRestoredDraft && (
                  <span className="text-[10px] font-bold text-amber-800 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-md flex items-center gap-1">
                    <Save className="w-3 h-3 text-amber-600" /> Rascunho Ativo
                  </span>
                )}
                <span className="text-[10px] font-black text-teal-800 bg-teal-50 border border-teal-200 px-2.5 py-1 rounded-full uppercase">
                  {project.fields?.length || 0} Itens
                </span>
              </div>
            </div>

            {/* Cartão do Formulário */}
            <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-sm space-y-5">
              <div className="border-b border-slate-100 pb-3.5">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">
                  Formulário Ativo
                </span>
                <h2 className="text-lg font-black text-slate-900 leading-tight mt-0.5">
                  {project.name}
                </h2>
                {project.description && (
                  <p className="text-xs text-slate-500 mt-1">{project.description}</p>
                )}
              </div>

              <form onSubmit={handlePreSubmit} className="space-y-5">
                <div className="space-y-4">
                  {project.fields?.map((field: FormField) => (
                    <div key={field.id} className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100">
                      <DynamicField
                        field={field}
                        value={formData[field.id]}
                        allValues={formData}
                        onChange={(val) => setFormData(prev => ({ ...prev, [field.id]: val }))}
                      />
                    </div>
                  ))}
                </div>

                {/* Ações de Envio e Rascunho */}
                <div className="pt-3 border-t border-slate-100 space-y-2">
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={handleSaveDraft}
                      className="py-3 px-3 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition flex items-center justify-center gap-1.5 cursor-pointer border border-slate-200"
                    >
                      <Save className="w-3.5 h-3.5 text-amber-600" />
                      <span>Salvar Rascunho</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleClearDraft}
                      disabled={!hasUnsavedChanges}
                      className="py-3 px-3 rounded-2xl bg-slate-100 hover:bg-red-50 hover:text-red-600 text-slate-400 font-bold text-xs transition flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed border border-slate-200"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Limpar Campos</span>
                    </button>
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full py-4 bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-600 hover:to-emerald-600 text-white font-black text-sm rounded-2xl transition shadow-lg flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    <Send className="w-4 h-4" />
                    <span>Finalizar & Salvar Coleta</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        ) : currentTab === 'forms' ? (
          <div className="space-y-4 animate-in fade-in">
            <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-2xs">
              <span className="text-[10px] font-bold text-teal-700 uppercase tracking-wider block">
                Área de Trabalho
              </span>
              <h2 className="text-base font-black text-slate-900 mt-0.5">
                Formulários Disponíveis
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Selecione qual atividade você irá executar:
              </p>
            </div>

            {isLoading ? (
              <div className="bg-white p-8 rounded-3xl border border-slate-200 text-center space-y-3 shadow-2xs">
                <div className="w-7 h-7 border-2 border-teal-500 border-t-transparent rounded-full animate-spin mx-auto" />
                <p className="text-xs font-bold text-slate-600">Buscando formulários...</p>
              </div>
            ) : availableProjects.length === 0 ? (
              <div className="bg-white p-8 rounded-3xl border border-slate-200 text-center space-y-2 text-slate-400 shadow-2xs">
                <Layers className="w-10 h-10 mx-auto opacity-30 text-teal-600" />
                <p className="text-xs font-bold text-slate-700">Nenhum formulário encontrado</p>
                <p className="text-[11px]">Não há formulários vinculados à empresa {currentUser?.companyName}.</p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {availableProjects.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => {
                      setSelectedProjectId(p.id);
                      setProject(p);
                    }}
                    className="w-full p-4 bg-white hover:bg-teal-50/40 border border-slate-200 hover:border-teal-300 rounded-2xl text-left transition shadow-2xs flex items-center justify-between group cursor-pointer"
                  >
                    <div className="pr-2 truncate">
                      <h3 className="text-sm font-black text-slate-900 group-hover:text-teal-700 truncate">
                        {p.name}
                      </h3>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[10px] font-bold bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md">
                          {p.fields?.length || 0} campos
                        </span>
                        <span className="text-[10px] text-slate-400 truncate">
                          {p.company_name || currentUser?.companyName}
                        </span>
                      </div>
                    </div>
                    <div className="w-8 h-8 rounded-xl bg-slate-50 group-hover:bg-teal-500 group-hover:text-white text-slate-400 flex items-center justify-center shrink-0 transition">
                      <ChevronRight className="w-4 h-4" />
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-4 animate-in fade-in">
            <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-2xs flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold text-teal-700 uppercase tracking-wider block">
                  Meus Registros
                </span>
                <h2 className="text-base font-black text-slate-900 mt-0.5">
                  Minhas Coletas
                </h2>
                <p className="text-xs text-slate-500">
                  {unifiedMySubmissions.length} registro(s) feitos por você
                </p>
              </div>

              {pendingQueue.length > 0 && isOnline && (
                <button
                  onClick={triggerAutoSync}
                  disabled={isSyncing}
                  className="px-3 py-2 bg-gradient-to-r from-teal-500 to-emerald-500 text-white rounded-xl text-xs font-black shadow-sm flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                  <span>Sincronizar</span>
                </button>
              )}
            </div>

            {unifiedMySubmissions.length === 0 ? (
              <div className="bg-white p-8 rounded-3xl border border-slate-200 text-center space-y-2 text-slate-400 shadow-2xs">
                <FileText className="w-10 h-10 mx-auto opacity-30 text-teal-600" />
                <p className="text-xs font-bold text-slate-700">Você ainda não realizou coletas</p>
                <p className="text-[11px]">Seus envios concluídos aparecerão listados aqui.</p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {unifiedMySubmissions.map((sub, index) => (
                  <div
                    key={`${sub.id}-${sub.isOfflinePending ? 'p' : 'c'}-${index}`}
                    className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-2.5"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h3 className="text-xs font-black text-slate-900 leading-tight">
                          {sub.project_name}
                        </h3>
                        <span className="text-[10px] font-mono text-slate-400">
                          {sub.id}
                        </span>
                      </div>

                      {sub.isOfflinePending ? (
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-amber-50 text-amber-700 border border-amber-200 flex items-center gap-1 shrink-0">
                          <Clock className="w-3 h-3 text-amber-500" />
                          <span>Pendente</span>
                        </span>
                      ) : (
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1 shrink-0">
                          <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                          <span>Salvo na Nuvem</span>
                        </span>
                      )}
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-slate-500 pt-2 border-t border-slate-100">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3 text-slate-400" />
                        {sub.submitted_at}
                      </span>

                      <span className="font-bold text-slate-700">
                        {Object.keys(sub.data || {}).length} campos
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>

      {/* Modal de Confirmação de Envio */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full space-y-4 shadow-2xl border border-slate-200">
            <div className="w-12 h-12 rounded-2xl bg-teal-50 border border-teal-200 text-teal-600 flex items-center justify-center mx-auto">
              <ShieldCheck className="w-6 h-6" />
            </div>

            <div className="text-center space-y-1">
              <h3 className="text-base font-black text-slate-900">
                Deseja realmente salvar esta coleta?
              </h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Os dados serão gravados em nome de <strong>{currentUser?.name}</strong>.
              </p>
            </div>

            <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100 text-xs text-slate-700 space-y-1">
              <div className="flex justify-between">
                <span className="text-slate-400">Formulário:</span>
                <span className="font-bold">{project?.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Campos preenchidos:</span>
                <span className="font-bold text-teal-700">{Object.keys(formData).length} de {project?.fields?.length || 0}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Conexão:</span>
                <span className="font-bold">{isOnline ? '🟢 Nuvem' : '🟡 Aparelho (Offline)'}</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowConfirmModal(false)}
                className="w-full py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition cursor-pointer"
              >
                Revisar
              </button>
              <button
                type="button"
                onClick={handleConfirmAndSave}
                disabled={isSubmitting}
                className="w-full py-3 bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-600 hover:to-emerald-600 text-white font-black text-xs rounded-xl transition shadow-sm flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {isSubmitting ? (
                  <RotateCw className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    <span>Confirmar</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Confirmação de Saída (Unsaved Changes) */}
      {showExitConfirmModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full space-y-4 shadow-2xl border border-slate-200">
            <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>

            <div className="text-center space-y-1">
              <h3 className="text-base font-black text-slate-900">
                Sair sem finalizar coleta?
              </h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Você tem alterações preenchidas que ainda não foram finalizadas.
              </p>
            </div>

            <div className="flex flex-col gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  handleSaveDraft();
                  setShowExitConfirmModal(false);
                  setSelectedProjectId('');
                  setProject(null);
                }}
                className="w-full py-3 bg-teal-600 hover:bg-teal-700 text-white font-black text-xs rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
              >
                <Save className="w-3.5 h-3.5" />
                <span>Salvar Rascunho e Sair</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  if (project) localStorage.removeItem(getDraftKey(project.id));
                  setFormData({});
                  setShowExitConfirmModal(false);
                  setSelectedProjectId('');
                  setProject(null);
                  setHasRestoredDraft(false);
                }}
                className="w-full py-3 bg-slate-100 hover:bg-red-50 hover:text-red-600 text-slate-600 font-bold text-xs rounded-xl transition cursor-pointer"
              >
                Descartar Alterações
              </button>

              <button
                type="button"
                onClick={() => setShowExitConfirmModal(false)}
                className="w-full py-2 text-slate-400 hover:text-slate-600 text-xs font-bold"
              >
                Continuar Preenchendo
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Navegação Inferior */}
      {!project && (
        <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200 px-6 py-2 shadow-lg">
          <div className="max-w-md mx-auto grid grid-cols-2 gap-2">
            <button
              onClick={() => setCurrentTab('forms')}
              className={`flex flex-col items-center justify-center py-1.5 rounded-xl transition cursor-pointer ${
                currentTab === 'forms' 
                  ? 'text-teal-600 font-black' 
                  : 'text-slate-400 font-bold hover:text-slate-600'
              }`}
            >
              <Layers className="w-5 h-5 mb-0.5" />
              <span className="text-[10px]">Formulários</span>
            </button>

            <button
              onClick={() => setCurrentTab('my_submissions')}
              className={`flex flex-col items-center justify-center py-1.5 rounded-xl transition relative cursor-pointer ${
                currentTab === 'my_submissions' 
                  ? 'text-teal-600 font-black' 
                  : 'text-slate-400 font-bold hover:text-slate-600'
              }`}
            >
              <FileText className="w-5 h-5 mb-0.5" />
              <span className="text-[10px]">Minhas Coletas</span>
              {pendingQueue.length > 0 && (
                <span className="absolute top-1 right-8 w-2 h-2 bg-amber-500 rounded-full animate-ping" />
              )}
            </button>
          </div>
        </nav>
      )}

    </div>
  );
}

export default function CollectPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="w-8 h-8 border-3 border-teal-400 border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <CollectAppContent />
    </Suspense>
  );
}