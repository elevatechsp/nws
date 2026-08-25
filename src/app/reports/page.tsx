// src/app/reports/page.tsx
'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { 
  BarChart3, Search, Filter, RotateCcw, 
  CheckCircle2, XCircle, Clock, Eye, Trash2, 
  RefreshCw, Building2, User, FileSpreadsheet, 
  ChevronLeft, ChevronRight, X, CloudUpload, Award
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { syncOfflineSubmissions, getPendingSubmissions } from '@/lib/offlineSync';
import CertificateModal from '@/components/CertificateModal';

export interface SubmissionRecord {
  id: string;
  project_id: string;
  project_name: string;
  operator: string;
  operator_user_id?: string;
  operator_email?: string;
  tenant_id?: string;
  company_name?: string;
  location?: string;
  submitted_at: string;
  status: 'pending' | 'approved' | 'rejected';
  data: Record<string, any>;
  created_at: string;
}

export default function ReportsPage() {
  const router = useRouter();
  const { user: contextUser } = useAuth();
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [submissions, setSubmissions] = useState<SubmissionRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Fila Offline
  const [pendingCount, setPendingCount] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);

  // Filtros & Paginação
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');
  const [projectFilter, setProjectFilter] = useState('all');
  const [operatorFilter, setOperatorFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(15);

  // Modais
  const [selectedSubmission, setSelectedSubmission] = useState<SubmissionRecord | null>(null);
  const [selectedSubmissionForCert, setSelectedSubmissionForCert] = useState<SubmissionRecord | null>(null);
  const [isCertOpen, setIsCertOpen] = useState(false);

  // Identificação e Proteção de Rota
  useEffect(() => {
    let activeUser = contextUser;
    if (!activeUser && typeof window !== 'undefined') {
      const saved = 
        sessionStorage.getItem('nws_auth_session') || 
        sessionStorage.getItem('nws_current_session') ||
        localStorage.getItem('nws_auth_session') || 
        localStorage.getItem('nws_current_session');

      if (saved) {
        try { activeUser = JSON.parse(saved); } catch {}
      }
    }

    if (!activeUser) {
      router.replace('/login');
    } else {
      setCurrentUser(activeUser);
    }
  }, [contextUser, router]);

  // Atualização da fila local de offline
  const checkPendingQueue = useCallback(() => {
    const queue = getPendingSubmissions();
    setPendingCount(queue.length);
  }, []);

  useEffect(() => {
    checkPendingQueue();
  }, [checkPendingQueue]);

  // Sincronizar coletas pendentes
  const handleTriggerSync = async () => {
    if (!navigator.onLine) {
      alert('Você está offline no momento.');
      return;
    }

    setIsSyncing(true);
    try {
      const { successCount } = await syncOfflineSubmissions();
      checkPendingQueue();
      if (successCount > 0) {
        alert(`${successCount} coleta(s) pendente(s) foram sincronizadas com sucesso!`);
        loadSubmissions();
      }
    } finally {
      setIsSyncing(false);
    }
  };

  // Carregamento de Coletas do Supabase com Isolamento Multi-Tenant
  const loadSubmissions = useCallback(async () => {
    if (!currentUser) return;
    setIsLoading(true);

    try {
      let query = supabase
        .from('submissions')
        .select('*')
        .order('created_at', { ascending: false });

      if (currentUser.role !== 'sysadmin') {
        if (currentUser.tenantId) {
          query = query.eq('tenant_id', currentUser.tenantId);
        } else if (currentUser.companyName) {
          query = query.eq('company_name', currentUser.companyName);
        }
      }

      const { data, error } = await query;

      if (error) {
        console.error('Erro ao buscar relatórios:', error.message);
      } else if (data) {
        setSubmissions(data as SubmissionRecord[]);
      }
    } catch (err: any) {
      console.error('Erro ao conectar com o Supabase:', err.message);
    } finally {
      setIsLoading(false);
    }
  }, [currentUser]);

  useEffect(() => {
    if (currentUser) {
      loadSubmissions();
    }
  }, [currentUser, loadSubmissions]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter, projectFilter, operatorFilter, itemsPerPage]);

  // Atualizar Status (Aprovar / Rejeitar)
  const handleUpdateStatus = async (id: string, newStatus: 'approved' | 'rejected' | 'pending') => {
    try {
      const { error } = await supabase
        .from('submissions')
        .update({ status: newStatus })
        .eq('id', id);

      if (error) {
        alert(`Erro ao atualizar status: ${error.message}`);
      } else {
        setSubmissions(prev => prev.map(s => s.id === id ? { ...s, status: newStatus } : s));
        if (selectedSubmission?.id === id) {
          setSelectedSubmission(prev => prev ? { ...prev, status: newStatus } : null);
        }
      }
    } catch (err: any) {
      alert(`Erro: ${err.message}`);
    }
  };

  // Excluir Coleta
  const handleDeleteSubmission = async (id: string) => {
    if (!confirm('Deseja realmente excluir este registro de coleta permanentemente?')) return;

    try {
      const { error } = await supabase.from('submissions').delete().eq('id', id);
      if (error) {
        alert(`Erro ao excluir: ${error.message}`);
      } else {
        setSubmissions(prev => prev.filter(s => s.id !== id));
        if (selectedSubmission?.id === id) setSelectedSubmission(null);
        alert('Registro excluído com sucesso.');
      }
    } catch (err: any) {
      alert(`Erro: ${err.message}`);
    }
  };

  // Exportar Relatório em CSV
  const handleExportCSV = () => {
    if (filteredSubmissions.length === 0) {
      alert('Nenhum registro para exportar.');
      return;
    }

    const headers = ['ID', 'Formulário', 'Operador Responsável', 'Empresa', 'Data/Hora', 'Localização', 'Status'];
    const rows = filteredSubmissions.map(s => [
      `"${s.id}"`,
      `"${s.project_name || ''}"`,
      `"${s.operator || ''}"`,
      `"${s.company_name || currentUser?.companyName || ''}"`,
      `"${s.submitted_at || ''}"`,
      `"${s.location || ''}"`,
      `"${s.status}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' 
      + [headers.join(';'), ...rows.map(r => r.join(';'))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Relatorio_${currentUser?.companyName || 'Empresa'}_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Métricas do Painel
  const metrics = useMemo(() => {
    const total = submissions.length;
    const approved = submissions.filter(s => s.status === 'approved').length;
    const pending = submissions.filter(s => s.status === 'pending' || !s.status).length;
    const rejected = submissions.filter(s => s.status === 'rejected').length;
    return { total, approved, pending, rejected };
  }, [submissions]);

  // Listas Dinâmicas para os Selects
  const uniqueProjects = useMemo(() => {
    return Array.from(new Set(submissions.map(s => s.project_name).filter(Boolean))).sort();
  }, [submissions]);

  const uniqueOperators = useMemo(() => {
    return Array.from(new Set(submissions.map(s => s.operator).filter(Boolean))).sort();
  }, [submissions]);

  // Filtragem Geral
  const filteredSubmissions = useMemo(() => {
    return submissions.filter(s => {
      const matchesSearch = 
        (s.project_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (s.operator || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (s.id || '').toLowerCase().includes(searchTerm.toLowerCase());

      const matchesStatus = statusFilter === 'all' || s.status === statusFilter || (statusFilter === 'pending' && !s.status);
      const matchesProject = projectFilter === 'all' || s.project_name === projectFilter;
      const matchesOperator = operatorFilter === 'all' || s.operator === operatorFilter;

      return matchesSearch && matchesStatus && matchesProject && matchesOperator;
    });
  }, [submissions, searchTerm, statusFilter, projectFilter, operatorFilter]);

  const totalItems = filteredSubmissions.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage) || 1;
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = Math.min(startIndex + itemsPerPage, totalItems);
  const paginatedSubmissions = useMemo(() => {
    return filteredSubmissions.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredSubmissions, startIndex, itemsPerPage]);

  const hasActiveFilters = searchTerm !== '' || statusFilter !== 'all' || projectFilter !== 'all' || operatorFilter !== 'all';

  if (!currentUser) return null;

  return (
    <main className="max-w-7xl mx-auto px-6 py-8 w-full space-y-6 font-sans">
      
      {/* Cabeçalho */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-extrabold text-slate-900">Relatórios & Coletas</h1>
            <span className="bg-teal-50 text-teal-800 border border-teal-200 text-[10px] font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1">
              <Building2 className="w-3 h-3" />
              {currentUser.companyName || 'Sua Empresa'}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Auditoria, registros temporais e controle de aprovação das coletas da sua empresa.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {pendingCount > 0 && (
            <button
              onClick={handleTriggerSync}
              disabled={isSyncing}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-bold transition shadow-xs cursor-pointer"
            >
              <CloudUpload className={`w-3.5 h-3.5 ${isSyncing ? 'animate-bounce' : ''}`} />
              <span>Sincronizar {pendingCount} Offline</span>
            </button>
          )}

          <button
            onClick={loadSubmissions}
            disabled={isLoading}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-bold transition shadow-2xs cursor-pointer"
            title="Recarregar"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            <span>Atualizar</span>
          </button>

          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-600 hover:to-emerald-600 text-white rounded-xl text-xs font-extrabold transition shadow-sm cursor-pointer"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Exportar CSV</span>
          </button>
        </div>
      </div>

      {/* Cards de Métricas */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-2xs">
          <span className="text-[10px] font-bold uppercase text-slate-400 block">Total de Coletas</span>
          <span className="text-2xl font-black text-slate-900 mt-1 block">{metrics.total}</span>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-2xs">
          <span className="text-[10px] font-bold uppercase text-emerald-600 block">Aprovadas</span>
          <span className="text-2xl font-black text-emerald-600 mt-1 block">{metrics.approved}</span>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-2xs">
          <span className="text-[10px] font-bold uppercase text-amber-600 block">Pendentes</span>
          <span className="text-2xl font-black text-amber-600 mt-1 block">{metrics.pending}</span>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-2xs">
          <span className="text-[10px] font-bold uppercase text-rose-600 block">Rejeitadas</span>
          <span className="text-2xl font-black text-rose-600 mt-1 block">{metrics.rejected}</span>
        </div>
      </div>

      {/* Painel de Filtros */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs space-y-3">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-700">
            <Filter className="w-4 h-4 text-teal-600" />
            <span>Filtros e Busca</span>
          </div>

          {hasActiveFilters && (
            <button 
              onClick={() => {
                setSearchTerm('');
                setStatusFilter('all');
                setProjectFilter('all');
                setOperatorFilter('all');
              }}
              className="text-[11px] font-semibold text-rose-600 hover:text-rose-700 flex items-center gap-1 transition cursor-pointer"
            >
              <RotateCcw className="w-3 h-3" />
              Limpar Filtros
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
            <input 
              type="text" 
              placeholder="Buscar por dados, ID ou operador..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 focus:bg-white"
            />
          </div>

          <div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 focus:bg-white text-slate-700 font-medium"
            >
              <option value="all">Status: Todos</option>
              <option value="pending">Aguardando Auditoria</option>
              <option value="approved">Aprovados</option>
              <option value="rejected">Rejeitados</option>
            </select>
          </div>

          <div>
            <select
              value={projectFilter}
              onChange={(e) => setProjectFilter(e.target.value)}
              className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 focus:bg-white text-slate-700 font-medium"
            >
              <option value="all">Formulário: Todos</option>
              {uniqueProjects.map(pName => (
                <option key={pName} value={pName}>{pName}</option>
              ))}
            </select>
          </div>

          <div>
            <select
              value={operatorFilter}
              onChange={(e) => setOperatorFilter(e.target.value)}
              className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 focus:bg-white text-slate-700 font-medium"
            >
              <option value="all">Operador: Todos da Equipe</option>
              {uniqueOperators.map(opName => (
                <option key={opName} value={opName}>{opName}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Tabela de Relatórios */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
        {isLoading ? (
          <div className="py-16 text-center text-slate-400 space-y-2">
            <div className="w-6 h-6 border-2 border-teal-500 border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-xs font-semibold text-slate-600">Buscando coletas da equipe...</p>
          </div>
        ) : totalItems === 0 ? (
          <div className="py-16 text-center text-slate-400 space-y-2">
            <BarChart3 className="w-10 h-10 mx-auto opacity-30 text-teal-600" />
            <p className="text-sm font-semibold text-slate-700">
              Nenhuma coleta registrada para {currentUser.companyName || 'sua empresa'}
            </p>
            <p className="text-xs text-slate-400">
              Quando qualquer colaborador emitir um formulário, ele ficará disponível aqui em tempo real.
            </p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-50/90 border-b border-slate-200 text-slate-500 uppercase tracking-wider font-semibold">
                  <tr>
                    <th className="px-6 py-3.5">ID / Formulário</th>
                    <th className="px-6 py-3.5">Operador Responsável</th>
                    <th className="px-6 py-3.5">Data & Hora</th>
                    <th className="px-6 py-3.5">Status de Auditoria</th>
                    <th className="px-6 py-3.5 text-right">Ações</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-200/90 text-slate-700 font-medium">
                  {paginatedSubmissions.map((sub) => (
                    <tr key={sub.id} className="hover:bg-teal-50/40 transition-colors group">
                      <td className="px-6 py-4">
                        <div className="font-bold text-slate-900 text-sm group-hover:text-teal-700 transition">
                          {sub.project_name || 'Sem título'}
                        </div>
                        <span className="text-[10px] text-teal-700 font-mono bg-teal-50 px-2 py-0.5 rounded border border-teal-100">
                          {sub.id}
                        </span>
                      </td>

                      <td className="px-6 py-4">
                        <div className="flex items-center gap-1.5 text-slate-700 font-semibold">
                          <User className="w-3.5 h-3.5 text-teal-600" />
                          <span>{sub.operator}</span>
                        </div>
                        <span className="text-[10px] text-slate-400 block">{sub.operator_email || sub.company_name || currentUser.companyName}</span>
                      </td>

                      <td className="px-6 py-4">
                        <div className="flex items-center gap-1.5 text-slate-500">
                          <Clock className="w-3.5 h-3.5 text-slate-400" />
                          <span>{sub.submitted_at || (sub.created_at ? new Date(sub.created_at).toLocaleString('pt-BR') : 'Recente')}</span>
                        </div>
                      </td>

                      <td className="px-6 py-4">
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider inline-flex items-center gap-1 ${
                          sub.status === 'approved'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : sub.status === 'rejected'
                            ? 'bg-rose-50 text-rose-700 border border-rose-200'
                            : 'bg-amber-50 text-amber-700 border border-amber-200'
                        }`}>
                          {sub.status === 'approved' && <CheckCircle2 className="w-3 h-3" />}
                          {sub.status === 'rejected' && <XCircle className="w-3 h-3" />}
                          {(!sub.status || sub.status === 'pending') && <Clock className="w-3 h-3" />}
                          {sub.status === 'approved' ? 'Aprovado' : sub.status === 'rejected' ? 'Rejeitado' : 'Pendente'}
                        </span>
                      </td>

                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Botão de Certificado / Laudo */}
                          <button
                            onClick={() => {
                              setSelectedSubmissionForCert(sub);
                              setIsCertOpen(true);
                            }}
                            className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-teal-500 hover:bg-teal-600 text-white font-bold text-xs transition shadow-2xs cursor-pointer"
                            title="Emitir Certificado / Laudo"
                          >
                            <Award className="w-3.5 h-3.5" />
                            <span>Certificado</span>
                          </button>

                          {/* Botão de Visualizar */}
                          <button
                            onClick={() => setSelectedSubmission(sub)}
                            className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition border border-slate-200 cursor-pointer"
                            title="Ver Detalhes da Coleta"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>Visualizar</span>
                          </button>

                          {currentUser?.role !== 'operator' && (
                            <button
                              onClick={() => handleDeleteSubmission(sub.id)}
                              className="p-1.5 rounded-xl bg-slate-50 hover:bg-rose-50 text-slate-400 hover:text-rose-600 transition border border-slate-200 cursor-pointer"
                              title="Excluir"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Paginação */}
            <div className="px-6 py-3.5 bg-slate-50/70 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-600">
              <div className="flex items-center gap-2">
                <span>Exibir</span>
                <select
                  value={itemsPerPage}
                  onChange={(e) => setItemsPerPage(Number(e.target.value))}
                  className="bg-white border border-slate-200 rounded-lg px-2 py-0.5 font-semibold text-slate-800 focus:outline-none"
                >
                  <option value={10}>10</option>
                  <option value={15}>15</option>
                  <option value={30}>30</option>
                  <option value={50}>50</option>
                </select>
                <span>por página</span>
                <span className="text-slate-300">|</span>
                <span>Exibindo <strong>{startIndex + 1}</strong>–<strong>{endIndex}</strong> de <strong>{totalItems}</strong></span>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-40 font-medium text-slate-700 cursor-pointer"
                >
                  <ChevronLeft className="w-3.5 h-3.5" /> Anterior
                </button>
                <button
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                  disabled={currentPage === totalPages}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-40 font-medium text-slate-700 cursor-pointer"
                >
                  Próxima <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* MODAL DE DETALHES E AUDITORIA */}
      {selectedSubmission && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-2xl bg-white border border-slate-200 rounded-3xl p-6 shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <span className="text-[10px] font-bold text-teal-700 uppercase tracking-widest bg-teal-50 px-2 py-0.5 rounded border border-teal-100">
                  {selectedSubmission.company_name || currentUser.companyName}
                </span>
                <h3 className="font-extrabold text-base text-slate-900 mt-1">
                  {selectedSubmission.project_name}
                </h3>
                <p className="text-xs text-slate-400 font-mono">Protocolo: {selectedSubmission.id}</p>
              </div>
              <button
                onClick={() => setSelectedSubmission(null)}
                className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-full transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 bg-slate-50 p-3.5 rounded-2xl border border-slate-200 text-xs">
              <div>
                <span className="text-[10px] text-slate-400 font-bold uppercase block">Operador Responsável</span>
                <strong className="text-slate-800">{selectedSubmission.operator}</strong>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 font-bold uppercase block">Data e Hora Exata</span>
                <strong className="text-slate-800">{selectedSubmission.submitted_at}</strong>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 font-bold uppercase block">Localização</span>
                <strong className="text-slate-800 truncate block">{selectedSubmission.location || 'Coleta em Campo'}</strong>
              </div>
            </div>

            <div className="space-y-3">
              <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Dados Preenchidos pelo Operador
              </h4>

              {selectedSubmission.data && Object.keys(selectedSubmission.data).length > 0 ? (
                <div className="space-y-2 bg-slate-50/50 p-4 rounded-2xl border border-slate-100">
                  {Object.entries(selectedSubmission.data).map(([fieldKey, value]) => (
                    <div key={fieldKey} className="flex flex-col sm:flex-row sm:items-center justify-between py-2 border-b border-slate-100 last:border-0 text-xs gap-1">
                      <span className="font-bold text-slate-700">{fieldKey}:</span>
                      <span className="font-semibold text-slate-900 bg-white px-3 py-1.5 rounded-xl border border-slate-200 max-w-sm break-words shadow-2xs">
                        {typeof value === 'object' ? JSON.stringify(value) : String(value || '-')}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-400 italic">Nenhum dado registrado neste formulário.</p>
              )}
            </div>

            <div className="pt-4 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-500 font-medium">Auditoria:</span>
                <button
                  onClick={() => handleUpdateStatus(selectedSubmission.id, 'approved')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1 cursor-pointer ${
                    selectedSubmission.status === 'approved'
                      ? 'bg-emerald-600 text-white shadow-2xs'
                      : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200'
                  }`}
                >
                  <CheckCircle2 className="w-3.5 h-3.5" /> Aprovar
                </button>
                <button
                  onClick={() => handleUpdateStatus(selectedSubmission.id, 'rejected')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1 cursor-pointer ${
                    selectedSubmission.status === 'rejected'
                      ? 'bg-rose-600 text-white shadow-2xs'
                      : 'bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200'
                  }`}
                >
                  <XCircle className="w-3.5 h-3.5" /> Rejeitar
                </button>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    const sub = selectedSubmission;
                    setSelectedSubmission(null);
                    setSelectedSubmissionForCert(sub);
                    setIsCertOpen(true);
                  }}
                  className="px-4 py-2 bg-teal-500 hover:bg-teal-600 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
                >
                  <Award className="w-3.5 h-3.5" />
                  <span>Emitir Certificado</span>
                </button>

                <button
                  onClick={() => setSelectedSubmission(null)}
                  className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition cursor-pointer"
                >
                  Fechar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DO CERTIFICADO & LAUDO */}
      <CertificateModal
        isOpen={isCertOpen}
        onClose={() => {
          setIsCertOpen(false);
          setSelectedSubmissionForCert(null);
        }}
        submission={selectedSubmissionForCert}
      />

    </main>
  );
}