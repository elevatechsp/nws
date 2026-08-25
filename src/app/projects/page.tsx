// src/app/projects/page.tsx
'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import Link from 'next/link';
import { 
  Plus, Search, Trash2, Edit3, 
  Clock, Layers, Filter, RotateCcw, 
  ArrowUpDown, ChevronLeft, ChevronRight, X, Send,
  Smartphone, Signal, Wifi, Battery, RefreshCw, User, Building2, PlayCircle, FileText
} from 'lucide-react';
import { FormField } from '@/types/project';
import DynamicField from '@/components/DynamicField';
import CertificateConfigModal from '@/components/CertificateConfigModal';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';

export default function ProjectsPage() {
  const { user: contextUser } = useAuth();
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [projects, setProjects] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Filtros & Paginação
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'draft' | 'archived'>('all');
  const [complexityFilter, setComplexityFilter] = useState<'all' | 'small' | 'medium' | 'large'>('all');
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'name_asc' | 'fields_desc'>('newest');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [itemsPerPage, setItemsPerPage] = useState<number>(20);

  // Modais de Configuração & Teste
  const [activeCollectProject, setActiveCollectProject] = useState<any | null>(null);
  const [projectForCertConfig, setProjectForCertConfig] = useState<any | null>(null);
  const [isCertConfigOpen, setIsCertConfigOpen] = useState(false);

  const [collectFormData, setCollectFormData] = useState<Record<string, any>>({});
  const [currentTime, setCurrentTime] = useState('10:48');

  // Identificação do Usuário
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
    setCurrentUser(activeUser);
  }, [contextUser]);

  // Consulta com Isolamento Rígido por Empresa
  const loadProjectsFromDatabase = useCallback(async () => {
    if (!currentUser) return;
    setIsLoading(true);

    try {
      let query = supabase
        .from('projects')
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
        const fallbackRes = await supabase.from('projects').select('*').order('created_at', { ascending: false });
        if (fallbackRes.data) {
          let filtered = fallbackRes.data;
          if (currentUser.role !== 'sysadmin') {
            filtered = fallbackRes.data.filter((p: any) => {
              if (p.tenant_id && currentUser.tenantId) return p.tenant_id === currentUser.tenantId;
              if (p.company_name && currentUser.companyName) return p.company_name === currentUser.companyName;
              return true;
            });
          }
          setProjects(filtered);
          return;
        }
        throw error;
      }

      if (data) {
        let finalData = data;
        if (currentUser.role === 'operator' && currentUser.allowedProjectIds?.length > 0) {
          finalData = data.filter((p: any) => currentUser.allowedProjectIds.includes(p.id));
        }
        setProjects(finalData);
      }
    } catch (err: any) {
      console.error('Erro ao buscar formulários:', err.message);
    } finally {
      setIsLoading(false);
    }
  }, [currentUser]);

  useEffect(() => {
    if (currentUser) {
      loadProjectsFromDatabase();
    }
  }, [currentUser, loadProjectsFromDatabase]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter, complexityFilter, sortBy, itemsPerPage]);

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }));
    };
    updateTime();
    const interval = setInterval(updateTime, 10000);
    return () => clearInterval(interval);
  }, []);

  const handleDeleteProject = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este formulário da sua empresa?')) return;

    try {
      const { error } = await supabase.from('projects').delete().eq('id', id);
      if (error) {
        alert(`Erro ao excluir: ${error.message}`);
      } else {
        setProjects(projects.filter(p => p.id !== id));
        alert('Formulário excluído com sucesso!');
      }
    } catch (err: any) {
      alert(`Erro: ${err.message}`);
    }
  };

  const handleFinishSimulatorCollect = async () => {
    if (!activeCollectProject) return;

    const payload = {
      id: `REC-${Math.floor(10000 + Math.random() * 90000)}`,
      project_id: activeCollectProject.id,
      project_name: activeCollectProject.name,
      operator: currentUser?.name || 'Operador',
      operator_user_id: currentUser?.id || null,
      tenant_id: activeCollectProject.tenant_id || currentUser?.tenantId || null,
      company_name: activeCollectProject.company_name || currentUser?.companyName || 'NWS Plataforma',
      location: 'Coleta via Simulador Desktop',
      submitted_at: new Date().toLocaleString('pt-BR'),
      status: 'pending',
      data: collectFormData,
      created_at: new Date().toISOString()
    };

    try {
      const { error } = await supabase.from('submissions').insert([payload]);

      if (error) {
        alert(`Erro ao salvar coleta: ${error.message}`);
      } else {
        alert('Coleta salva no banco da sua empresa!');
        setActiveCollectProject(null);
        setCollectFormData({});
      }
    } catch (err: any) {
      alert(`Erro de conexão: ${err.message}`);
    }
  };

  const handleResetFilters = () => {
    setSearchTerm('');
    setStatusFilter('all');
    setComplexityFilter('all');
    setSortBy('newest');
  };

  const filteredProjects = useMemo(() => {
    return projects
      .filter((p) => {
        const matchesSearch = 
          (p.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
          (p.description || '').toLowerCase().includes(searchTerm.toLowerCase());

        if (!matchesSearch) return false;
        if (statusFilter !== 'all' && p.status !== statusFilter) return false;

        const count = p.fields?.length || 0;
        if (complexityFilter === 'small' && count > 5) return false;
        if (complexityFilter === 'medium' && (count < 6 || count > 10)) return false;
        if (complexityFilter === 'large' && count < 11) return false;

        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'name_asc') return (a.name || '').localeCompare(b.name || '');
        if (sortBy === 'fields_desc') return (b.fields?.length || 0) - (a.fields?.length || 0);
        if (sortBy === 'oldest') return (a.id || '').localeCompare(b.id || '');
        return (b.id || '').localeCompare(a.id || '');
      });
  }, [projects, searchTerm, statusFilter, complexityFilter, sortBy]);

  const totalItems = filteredProjects.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage) || 1;
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = Math.min(startIndex + itemsPerPage, totalItems);
  const paginatedProjects = useMemo(() => filteredProjects.slice(startIndex, startIndex + itemsPerPage), [filteredProjects, startIndex, itemsPerPage]);
  const hasActiveFilters = searchTerm !== '' || statusFilter !== 'all' || complexityFilter !== 'all' || sortBy !== 'newest';

  return (
    <main className="max-w-7xl mx-auto px-6 py-8 w-full relative font-sans">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-extrabold text-slate-900">Projetos & Formulários</h1>
            <span className="bg-teal-50 text-teal-800 border border-teal-200 text-[10px] font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1">
              <Building2 className="w-3 h-3" />
              {currentUser?.companyName || 'Sua Empresa'}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">Exibindo exclusivamente os formulários da sua empresa.</p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={loadProjectsFromDatabase}
            disabled={isLoading}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-bold transition shadow-2xs cursor-pointer"
            title="Atualizar do Banco de Dados"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            <span>Atualizar</span>
          </button>

          {currentUser?.role !== 'operator' && (
            <Link
              href="/builder"
              className="flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-600 hover:to-emerald-600 text-white rounded-xl text-xs font-extrabold transition shadow-sm cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              Novo Formulário
            </Link>
          )}
        </div>
      </div>

      {/* Painel de Filtros */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 mb-6 shadow-xs space-y-3">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-700">
            <Filter className="w-4 h-4 text-teal-600" />
            <span>Filtros e Busca</span>
          </div>

          {hasActiveFilters && (
            <button 
              onClick={handleResetFilters}
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
              placeholder="Buscar por nome..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:bg-white"
            />
          </div>

          <div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:bg-white text-slate-700"
            >
              <option value="all">Status: Todos</option>
              <option value="active">Status: Ativos</option>
              <option value="draft">Status: Rascunhos</option>
              <option value="archived">Status: Arquivados</option>
            </select>
          </div>

          <div>
            <select
              value={complexityFilter}
              onChange={(e) => setComplexityFilter(e.target.value as any)}
              className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:bg-white text-slate-700"
            >
              <option value="all">Campos: Qualquer quantidade</option>
              <option value="small">Campos: Simples (1 a 5)</option>
              <option value="medium">Campos: Médio (6 a 10)</option>
              <option value="large">Campos: Complexo (11+)</option>
            </select>
          </div>

          <div className="flex items-center gap-1.5">
            <ArrowUpDown className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:bg-white text-slate-700"
            >
              <option value="newest">Mais recentes primeiro</option>
              <option value="oldest">Mais antigos primeiro</option>
              <option value="name_asc">Nome (A - Z)</option>
              <option value="fields_desc">Mais campos primeiro</option>
            </select>
          </div>
        </div>
      </div>

      {/* Tabela de Formulários */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
        {isLoading ? (
          <div className="py-16 text-center text-slate-400 space-y-2">
            <div className="w-6 h-6 border-2 border-teal-500 border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-xs font-semibold text-slate-600">Buscando formulários da sua empresa...</p>
          </div>
        ) : totalItems === 0 ? (
          <div className="py-16 text-center text-slate-400 space-y-2">
            <Layers className="w-10 h-10 mx-auto opacity-30 text-teal-600" />
            <p className="text-sm font-semibold text-slate-700">Nenhum formulário cadastrado para {currentUser?.companyName || 'esta empresa'}</p>
            <p className="text-xs text-slate-400">Clique em "Novo Formulário" para criar um formulário restrito à sua equipe.</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-50/90 border-b border-slate-200 text-slate-500 uppercase tracking-wider font-semibold">
                  <tr>
                    <th className="px-6 py-3.5">Sistema / Formulário</th>
                    <th className="px-6 py-3.5">Criado Por</th>
                    <th className="px-6 py-3.5">Data de Criação</th>
                    <th className="px-6 py-3.5">Campos</th>
                    <th className="px-6 py-3.5">Status</th>
                    <th className="px-6 py-3.5 text-right">Ações</th>
                  </tr>
                </thead>
                
                <tbody className="divide-y divide-slate-200/90 text-slate-700 font-medium">
                  {paginatedProjects.map((project) => (
                    <tr 
                      key={project.id} 
                      className="hover:bg-teal-50/40 transition-colors group"
                    >
                      <td className="px-6 py-4 max-w-xs">
                        <div className="font-bold text-slate-900 text-sm group-hover:text-teal-700 transition">
                          {project.name}
                        </div>
                        <p className="text-[11px] text-slate-400 truncate mt-0.5">
                          {project.description || 'Sem descrição cadastrada.'}
                        </p>
                      </td>

                      <td className="px-6 py-4">
                        <div className="flex items-center gap-1.5 text-slate-700 font-semibold">
                          <User className="w-3.5 h-3.5 text-teal-600" />
                          <span>{project.created_by_name || 'Administrador'}</span>
                        </div>
                        <span className="text-[10px] text-slate-400 block">{project.company_name || currentUser?.companyName}</span>
                      </td>

                      <td className="px-6 py-4">
                        <div className="flex items-center gap-1.5 text-slate-500">
                          <Clock className="w-3.5 h-3.5 text-slate-400" />
                          <span>
                            {project.created_at
                              ? new Date(project.created_at).toLocaleDateString('pt-BR')
                              : 'Recente'}
                          </span>
                        </div>
                      </td>

                      <td className="px-6 py-4">
                        <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded text-[11px] font-bold">
                          {project.fields?.length || 0} campos
                        </span>
                      </td>

                      <td className="px-6 py-4">
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                          project.status === 'draft' 
                            ? 'bg-amber-50 text-amber-700 border border-amber-200' 
                            : 'bg-teal-50 text-teal-700 border border-teal-200'
                        }`}>
                          {project.status === 'draft' ? 'Rascunho' : 'Ativo'}
                        </span>
                      </td>

                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          
                          {/* Botão Configurar Certificado PDF */}
                          {currentUser?.role !== 'operator' && (
                            <button
                              onClick={() => {
                                setProjectForCertConfig(project);
                                setIsCertConfigOpen(true);
                              }}
                              className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg border font-bold text-xs transition cursor-pointer ${
                                project.certificate_template_url 
                                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100' 
                                  : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                              }`}
                              title="Configurar Modelo de Certificado em PDF"
                            >
                              <FileText className={`w-3.5 h-3.5 ${project.certificate_template_url ? 'text-emerald-600' : 'text-slate-500'}`} />
                              <span>{project.certificate_template_url ? 'Certificado ✓' : 'Certificado'}</span>
                            </button>
                          )}

                          {/* Iniciar Coleta Oficial (Offline-First) */}
                          <Link
                            href={`/collect?id=${project.id}`}
                            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-teal-50 hover:bg-teal-100 text-teal-800 border border-teal-200 font-bold text-xs transition cursor-pointer"
                            title="Abrir Tela de Coleta Oficial (Offline / Online)"
                          >
                            <PlayCircle className="w-3.5 h-3.5 text-teal-600" />
                            <span>Coleta</span>
                          </Link>

                          {/* Teste via Simulador */}
                          <button 
                            onClick={() => {
                              setActiveCollectProject(project);
                              setCollectFormData({});
                            }}
                            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white font-bold text-xs transition shadow-xs cursor-pointer"
                            title="Testar Formulário no Simulador Desktop"
                          >
                            <Smartphone className="w-3.5 h-3.5" />
                            <span>Testar</span>
                          </button>

                          {currentUser?.role !== 'operator' && (
                            <>
                              <Link 
                                href={`/builder?id=${project.id}`}
                                className="p-1.5 rounded-lg bg-slate-50 hover:bg-teal-50 text-slate-600 hover:text-teal-700 transition border border-slate-200 cursor-pointer inline-flex items-center justify-center"
                                title="Editar no Builder"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                              </Link>

                              <button 
                                onClick={() => handleDeleteProject(project.id)}
                                className="p-1.5 rounded-lg bg-slate-50 hover:bg-rose-50 text-slate-400 hover:text-rose-600 transition border border-slate-200 cursor-pointer"
                                title="Excluir"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </>
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
                  <option value={20}>20</option>
                  <option value={30}>30</option>
                  <option value={50}>50</option>
                </select>
                <span>por página</span>
                <span className="text-slate-300">|</span>
                <span>Exibindo <strong>{startIndex + 1}</strong>–<strong>{endIndex}</strong> de <strong>{totalItems}</strong></span>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-40 font-medium text-slate-700 cursor-pointer"
                >
                  <ChevronLeft className="w-3.5 h-3.5" /> Anterior
                </button>
                <button
                  onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
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

      {/* MODAL CONFIGURADOR DO CERTIFICADO PDF */}
      <CertificateConfigModal
        isOpen={isCertConfigOpen}
        onClose={() => {
          setIsCertConfigOpen(false);
          setProjectForCertConfig(null);
        }}
        project={projectForCertConfig}
        onSaved={loadProjectsFromDatabase}
      />

      {/* Simulador Smartphone */}
      {activeCollectProject && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
          <button 
            onClick={() => setActiveCollectProject(null)}
            className="absolute top-6 right-6 z-50 flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white border border-white/20 px-4 py-2 rounded-full text-xs font-bold transition backdrop-blur-md shadow-lg cursor-pointer"
          >
            <X className="w-4 h-4" /> Fechar Simulador
          </button>

          <div className="relative w-full max-w-[390px] h-[780px] max-h-[92vh] bg-slate-900 rounded-[50px] p-3.5 shadow-2xl border-4 border-slate-800 ring-1 ring-white/20 flex flex-col justify-between">
            <div className="absolute top-6 left-1/2 -translate-x-1/2 w-28 h-5 bg-slate-900 rounded-full z-40 flex items-center justify-end px-3">
              <div className="w-2.5 h-2.5 rounded-full bg-slate-950 border border-slate-800" />
            </div>

            <div className="w-full h-full bg-white rounded-[38px] overflow-hidden flex flex-col relative z-20">
              <div className="h-10 bg-white px-6 pt-2 flex items-center justify-between text-[11px] font-bold text-slate-800 select-none shrink-0">
                <span>{currentTime}</span>
                <div className="flex items-center gap-1.5 text-slate-700">
                  <Signal className="w-3.5 h-3.5" />
                  <Wifi className="w-3.5 h-3.5" />
                  <Battery className="w-4 h-4" />
                </div>
              </div>

              <div className="px-5 py-3 border-b border-slate-100 bg-slate-50/80 flex items-center justify-between shrink-0">
                <div className="truncate pr-2">
                  <span className="text-[9px] font-black text-teal-700 uppercase tracking-widest bg-teal-50 px-2 py-0.5 rounded border border-teal-100">
                    {currentUser?.companyName || 'NWS Mobile'}
                  </span>
                  <h4 className="font-extrabold text-slate-900 text-xs truncate mt-0.5">
                    {activeCollectProject.name}
                  </h4>
                </div>
                <button
                  onClick={() => setActiveCollectProject(null)}
                  className="p-1 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="flex-1 p-5 overflow-y-auto space-y-4 bg-white">
                {activeCollectProject.fields?.map((field: FormField) => (
                  <div key={field.id} className="border-b border-slate-100 pb-3.5 last:border-0 last:pb-0">
                    <DynamicField 
                      field={field}
                      value={collectFormData[field.id]}
                      allValues={collectFormData}
                      onChange={(val) => setCollectFormData(prev => ({ ...prev, [field.id]: val }))}
                    />
                  </div>
                ))}
              </div>

              <div className="p-3.5 bg-slate-50 border-t border-slate-100 flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={handleFinishSimulatorCollect}
                  className="w-full py-2.5 text-[11px] font-bold text-white bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-600 hover:to-emerald-600 rounded-xl transition shadow-xs flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Finalizar Coleta & Gravar no Banco</span>
                </button>
              </div>

              <div className="h-4 bg-slate-50 flex items-center justify-center pb-1 shrink-0">
                <div className="w-28 h-1 bg-slate-300 rounded-full" />
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}