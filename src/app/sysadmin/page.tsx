// src/app/sysadmin/page.tsx
'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  ShieldCheck, Users, FolderKanban, Building2, 
  Search, RefreshCw, Plus, Trash2, Edit2, CheckCircle2, 
  XCircle, Mail, User, Lock, ExternalLink, X, Check, 
  Database, LogOut, ArrowUpRight, BarChart3, Layers
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';

interface GlobalUser {
  id: string;
  name: string;
  email: string;
  role: 'sysadmin' | 'super_admin' | 'admin' | 'auditor' | 'operator';
  tenant_id?: string;
  company_name: string;
  status: 'active' | 'inactive';
  created_at?: string;
}

interface TenantRecord {
  id: string;
  name: string;
  created_at?: string;
  status?: string;
}

export default function SysAdminDashboard() {
  const router = useRouter();
  const { user: contextUser, logout } = useAuth();
  const [activeTab, setActiveTab] = useState<'tenants' | 'users' | 'projects'>('users');
  
  const [users, setUsers] = useState<GlobalUser[]>([]);
  const [tenants, setTenants] = useState<TenantRecord[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [totalSubmissions, setTotalSubmissions] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(true);

  // Filtros
  const [searchTerm, setSearchTerm] = useState('');
  const [companyFilter, setCompanyFilter] = useState('all');

  // Modal Usuário
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [isCustomCompany, setIsCustomCompany] = useState(false);
  const [customCompanyName, setCustomCompanyName] = useState('');

  const [userFormData, setUserFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'operator' as GlobalUser['role'],
    company_name: '',
    status: 'active' as 'active' | 'inactive',
  });

  // Modal Tenant / Empresa
  const [isTenantModalOpen, setIsTenantModalOpen] = useState(false);
  const [tenantNameInput, setTenantNameInput] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Validação de Segurança SysAdmin
  useEffect(() => {
    let active = contextUser;
    if (!active && typeof window !== 'undefined') {
      const raw = sessionStorage.getItem('nws_auth_session') || sessionStorage.getItem('nws_current_session');
      if (raw) {
        try { active = JSON.parse(raw); } catch {}
      }
    }

    if (!active || active.role !== 'sysadmin') {
      router.replace('/sysadmin/login');
    }
  }, [contextUser, router]);

  // Carregamento global de todas as tabelas
  const loadGlobalData = useCallback(async () => {
    setIsLoading(true);
    try {
      // 1. Usuários
      const usersRes = await supabase
        .from('users')
        .select('*')
        .order('created_at', { ascending: false });

      if (usersRes.data) {
        setUsers(usersRes.data);
      }

      // 2. Tenants / Empresas cadastradas
      const tenantsRes = await supabase
        .from('tenants')
        .select('*')
        .order('created_at', { ascending: false });

      if (tenantsRes.data) {
        setTenants(tenantsRes.data);
      }

      // 3. Projetos / Formulários
      const projectsRes = await supabase
        .from('projects')
        .select('*')
        .order('created_at', { ascending: false });

      if (projectsRes.data) {
        setProjects(projectsRes.data);
      }

      // 4. Contagem de Envios
      const subRes = await supabase.from('submissions').select('id', { count: 'exact', head: true });
      if (subRes.count !== null) {
        setTotalSubmissions(subRes.count);
      }

    } catch (err: any) {
      console.error('Erro ao sincronizar dados do SysAdmin:', err.message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadGlobalData();
  }, [loadGlobalData]);

  // Lista unificada e sem repetição de todas as empresas existentes
  const distinctCompanies = useMemo(() => {
    const set = new Set<string>();
    tenants.forEach(t => t.name && set.add(t.name.trim()));
    users.forEach(u => u.company_name && set.add(u.company_name.trim()));
    projects.forEach(p => {
      const comp = p.company_name || p.client_company_name;
      if (comp) set.add(comp.trim());
    });
    return Array.from(set).filter(Boolean).sort();
  }, [tenants, users, projects]);

  // Criação de Nova Empresa (Tenant)
  const handleCreateTenant = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tenantNameInput.trim()) return;

    setIsSaving(true);
    try {
      const payload = {
        id: `tenant-${Date.now()}`,
        name: tenantNameInput.trim(),
        created_at: new Date().toISOString()
      };

      const { error } = await supabase.from('tenants').insert([payload]);
      if (error) throw error;

      setIsTenantModalOpen(false);
      setTenantNameInput('');
      loadGlobalData();
      alert('Nova empresa registrada com sucesso!');
    } catch (err: any) {
      alert(`Falha ao registrar empresa: ${err.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  // Salvar Usuário Global
  const handleSaveGlobalUser = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const finalCompanyName = (isCustomCompany ? customCompanyName : userFormData.company_name).trim();

    if (!userFormData.name || !userFormData.email || !finalCompanyName) {
      alert('Preencha os campos obrigatórios e defina a empresa.');
      return;
    }

    setIsSaving(true);
    try {
      const payload: any = {
        name: userFormData.name.trim(),
        email: userFormData.email.trim().toLowerCase(),
        role: userFormData.role,
        company_name: finalCompanyName,
        status: userFormData.status,
      };

      if (userFormData.password) {
        payload.password = userFormData.password.trim();
      }

      if (editingUserId) {
        const { error } = await supabase.from('users').update(payload).eq('id', editingUserId);
        if (error) throw error;
      } else {
        payload.id = `usr-${Date.now()}`;
        payload.created_at = new Date().toISOString();
        const { error } = await supabase.from('users').insert([payload]);
        if (error) throw error;
      }

      setIsUserModalOpen(false);
      setEditingUserId(null);
      setIsCustomCompany(false);
      setCustomCompanyName('');
      setUserFormData({ name: '', email: '', password: '', role: 'operator', company_name: '', status: 'active' });
      loadGlobalData();
      alert('Usuário salvo no banco global com sucesso!');
    } catch (err: any) {
      alert(`Erro ao salvar usuário: ${err.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteUser = async (id: string, name: string) => {
    if (!confirm(`SysAdmin: Confirmar exclusão do usuário "${name}"?`)) return;

    try {
      const { error } = await supabase.from('users').delete().eq('id', id);
      if (error) throw error;
      setUsers(prev => prev.filter(u => u.id !== id));
      alert('Usuário removido.');
    } catch (err: any) {
      alert(`Erro: ${err.message}`);
    }
  };

  const handleDeleteProject = async (id: string, name: string) => {
    if (!confirm(`SysAdmin: Deseja apagar o formulário "${name}" do banco?`)) return;

    try {
      const { error } = await supabase.from('projects').delete().eq('id', id);
      if (error) throw error;
      setProjects(prev => prev.filter(p => p.id !== id));
      alert('Formulário excluído do banco.');
    } catch (err: any) {
      alert(`Erro: ${err.message}`);
    }
  };

  const handleLogout = () => {
    sessionStorage.clear();
    localStorage.clear();
    if (logout) logout();
    router.replace('/sysadmin/login');
  };

  // Abrir Modal de Criação com a primeira empresa já pré-selecionada
  const handleOpenCreateModal = () => {
    setEditingUserId(null);
    setIsCustomCompany(false);
    setCustomCompanyName('');
    setUserFormData({
      name: '',
      email: '',
      password: '',
      role: 'operator',
      company_name: distinctCompanies.length > 0 ? distinctCompanies[0] : '',
      status: 'active',
    });
    setIsUserModalOpen(true);
  };

  // Abrir Modal de Edição
  const handleOpenEditModal = (u: GlobalUser) => {
    setEditingUserId(u.id);
    const companyExists = distinctCompanies.includes(u.company_name);
    setIsCustomCompany(!companyExists && !!u.company_name);
    setCustomCompanyName(!companyExists ? u.company_name : '');
    
    setUserFormData({
      name: u.name,
      email: u.email,
      password: '',
      role: u.role,
      company_name: companyExists ? u.company_name : '__CUSTOM__',
      status: u.status || 'active',
    });
    setIsUserModalOpen(true);
  };

  // Usuários Filtrados
  const filteredUsers = useMemo(() => {
    return users.filter(u => {
      const matchesSearch = 
        u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        u.email.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCompany = companyFilter === 'all' || u.company_name === companyFilter;
      return matchesSearch && matchesCompany;
    });
  }, [users, searchTerm, companyFilter]);

  // Formulários Filtrados
  const filteredProjects = useMemo(() => {
    return projects.filter(p => {
      const comp = p.company_name || p.client_company_name || '';
      const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCompany = companyFilter === 'all' || comp === companyFilter;
      return matchesSearch && matchesCompany;
    });
  }, [projects, searchTerm, companyFilter]);

  return (
    <main className="max-w-7xl mx-auto px-6 py-8 w-full space-y-6 font-sans">
      
      {/* Top Header Master */}
      <div className="bg-slate-900 text-white rounded-2xl p-6 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4 border border-slate-800 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex items-center gap-4 relative z-10">
          <div className="w-12 h-12 rounded-2xl bg-teal-500/20 border border-teal-500/30 flex items-center justify-center text-teal-400 shadow-inner">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl md:text-2xl font-black tracking-tight">Root Console Master</h1>
              <span className="bg-teal-500/20 text-teal-300 text-[10px] font-extrabold px-2.5 py-0.5 rounded-full uppercase border border-teal-500/30">
                NWS Plataforma
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Supervisão global multi-tenant, instâncias, formulários e usuários.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 relative z-10">
          <button
            onClick={loadGlobalData}
            disabled={isLoading}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold transition border border-slate-700 cursor-pointer"
            title="Sincronizar com o Supabase"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            <span>Sincronizar</span>
          </button>

          <button
            onClick={handleLogout}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-rose-950/60 hover:bg-rose-900/80 text-rose-300 rounded-xl text-xs font-bold transition border border-rose-800/60 cursor-pointer"
            title="Encerrar Sessão Root"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sair</span>
          </button>
        </div>
      </div>

      {/* Cards de Métricas */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-bold uppercase tracking-wider">Empresas</span>
            <Building2 className="w-4 h-4 text-teal-600" />
          </div>
          <div className="text-2xl font-black text-slate-900 mt-2">{distinctCompanies.length}</div>
          <span className="text-[10px] text-slate-400 font-medium">Instâncias cadastradas</span>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-bold uppercase tracking-wider">Usuários Globais</span>
            <Users className="w-4 h-4 text-teal-600" />
          </div>
          <div className="text-2xl font-black text-slate-900 mt-2">{users.length}</div>
          <span className="text-[10px] text-slate-400 font-medium">Operadores e Admins</span>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-bold uppercase tracking-wider">Formulários</span>
            <FolderKanban className="w-4 h-4 text-teal-600" />
          </div>
          <div className="text-2xl font-black text-slate-900 mt-2">{projects.length}</div>
          <span className="text-[10px] text-slate-400 font-medium">Em todas as empresas</span>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-bold uppercase tracking-wider">Total de Coletas</span>
            <BarChart3 className="w-4 h-4 text-teal-600" />
          </div>
          <div className="text-2xl font-black text-slate-900 mt-2">{totalSubmissions}</div>
          <span className="text-[10px] text-slate-400 font-medium">Respostas gravadas</span>
        </div>
      </div>

      {/* Navegação por Abas */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
        <button
          onClick={() => setActiveTab('users')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
            activeTab === 'users'
              ? 'bg-teal-600 text-white shadow-2xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          Usuários Globais ({users.length})
        </button>

        <button
          onClick={() => setActiveTab('tenants')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
            activeTab === 'tenants'
              ? 'bg-teal-600 text-white shadow-2xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          Empresas / Tenants ({distinctCompanies.length})
        </button>

        <button
          onClick={() => setActiveTab('projects')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
            activeTab === 'projects'
              ? 'bg-teal-600 text-white shadow-2xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          Todos os Formulários ({projects.length})
        </button>
      </div>

      {/* ABA: USUÁRIOS GLOBAIS */}
      {activeTab === 'users' && (
        <div className="space-y-4">
          <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs flex flex-col md:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-3 w-full md:w-auto flex-1">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Buscar usuário por nome ou email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 font-medium"
                />
              </div>

              <select
                value={companyFilter}
                onChange={(e) => setCompanyFilter(e.target.value)}
                className="px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 font-medium text-slate-700"
              >
                <option value="all">Todas as Empresas</option>
                {distinctCompanies.map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            <button
              onClick={handleOpenCreateModal}
              className="flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-600 hover:to-emerald-600 text-white rounded-xl text-xs font-extrabold transition shadow-sm cursor-pointer whitespace-nowrap"
            >
              <Plus className="w-4 h-4" />
              <span>Criar Usuário Master</span>
            </button>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
            {isLoading ? (
              <div className="py-16 text-center text-slate-400 text-xs font-semibold">
                Sincronizando banco de dados...
              </div>
            ) : filteredUsers.length === 0 ? (
              <div className="py-16 text-center text-slate-400 space-y-2">
                <Users className="w-8 h-8 mx-auto opacity-30 text-teal-600" />
                <p className="text-xs font-bold text-slate-700">Nenhum usuário encontrado</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-slate-50/90 border-b border-slate-200 text-slate-500 uppercase tracking-wider font-semibold">
                    <tr>
                      <th className="px-6 py-3.5">Nome</th>
                      <th className="px-6 py-3.5">E-mail</th>
                      <th className="px-6 py-3.5">Empresa Pertencente</th>
                      <th className="px-6 py-3.5 text-center">Função</th>
                      <th className="px-6 py-3.5 text-center">Status</th>
                      <th className="px-6 py-3.5 text-right">Ações Master</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200/90 text-slate-700 font-medium">
                    {filteredUsers.map((u) => (
                      <tr key={u.id} className="hover:bg-slate-50 transition">
                        <td className="px-6 py-4 font-bold text-slate-900">{u.name}</td>
                        <td className="px-6 py-4 text-slate-500">{u.email}</td>
                        <td className="px-6 py-4">
                          <span className="px-2.5 py-1 rounded-md bg-slate-100 border border-slate-200 font-bold text-[11px] text-slate-800">
                            {u.company_name || 'Global'}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold border uppercase tracking-wide bg-teal-50 text-teal-800 border-teal-200">
                            {u.role}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-center">
                          {u.status === 'inactive' ? (
                            <span className="inline-flex items-center gap-1 text-rose-600 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded-full text-[10px] font-bold">
                              <XCircle className="w-3 h-3" /> Inativo
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-teal-700 bg-teal-50 border border-teal-200 px-2 py-0.5 rounded-full text-[10px] font-bold">
                              <CheckCircle2 className="w-3 h-3" /> Ativo
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => handleOpenEditModal(u)}
                              className="p-1.5 rounded-lg bg-slate-50 hover:bg-teal-50 text-slate-600 hover:text-teal-700 transition border border-slate-200 cursor-pointer"
                              title="Editar Usuário"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>

                            <button
                              onClick={() => handleDeleteUser(u.id, u.name)}
                              className="p-1.5 rounded-lg bg-slate-50 hover:bg-rose-50 text-slate-400 hover:text-rose-600 transition border border-slate-200 cursor-pointer"
                              title="Excluir do Banco"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ABA: EMPRESAS / TENANTS */}
      {activeTab === 'tenants' && (
        <div className="space-y-4">
          <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs flex items-center justify-between">
            <span className="text-xs font-bold text-slate-700">Empresas e Instâncias Cadastradas</span>
            <button
              onClick={() => setIsTenantModalOpen(true)}
              className="flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-600 hover:to-emerald-600 text-white rounded-xl text-xs font-extrabold transition shadow-sm cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Nova Empresa</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {distinctCompanies.map((companyName) => {
              const companyUsers = users.filter(u => u.company_name === companyName);
              const companyForms = projects.filter(p => (p.company_name || p.client_company_name) === companyName);

              return (
                <div key={companyName} className="bg-white border border-slate-200 rounded-2xl p-5 shadow-2xs space-y-4 hover:border-teal-300 transition">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-xl bg-teal-50 border border-teal-200 text-teal-700 flex items-center justify-center font-black text-sm">
                        {companyName.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <h3 className="font-extrabold text-sm text-slate-900">{companyName}</h3>
                        <span className="text-[10px] text-teal-700 font-bold bg-teal-50 px-2 py-0.5 rounded-full border border-teal-100">
                          Instância Ativa
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100 text-xs">
                    <div className="bg-slate-50 p-2.5 rounded-xl">
                      <span className="text-[10px] text-slate-400 font-semibold block">Usuários</span>
                      <span className="text-sm font-bold text-slate-800">{companyUsers.length}</span>
                    </div>
                    <div className="bg-slate-50 p-2.5 rounded-xl">
                      <span className="text-[10px] text-slate-400 font-semibold block">Formulários</span>
                      <span className="text-sm font-bold text-slate-800">{companyForms.length}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ABA: FORMULÁRIOS DE TODAS AS EMPRESAS */}
      {activeTab === 'projects' && (
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-50/90 border-b border-slate-200 text-slate-500 uppercase tracking-wider font-semibold">
                <tr>
                  <th className="px-6 py-3.5">Nome do Formulário</th>
                  <th className="px-6 py-3.5">Empresa</th>
                  <th className="px-6 py-3.5">Criador</th>
                  <th className="px-6 py-3.5 text-center">Campos</th>
                  <th className="px-6 py-3.5 text-right">Ações Master</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200/90 text-slate-700 font-medium">
                {filteredProjects.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50 transition">
                    <td className="px-6 py-4 font-bold text-slate-900">{p.name}</td>
                    <td className="px-6 py-4">
                      <span className="font-semibold text-teal-700 bg-teal-50 px-2.5 py-1 rounded-md border border-teal-200">
                        {p.company_name || p.client_company_name || 'Geral'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-slate-500">{p.author_name || p.created_by_name || 'Admin'}</td>
                    <td className="px-6 py-4 text-center font-bold">{p.fields?.length || 0}</td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Link
                          href={`/builder?id=${p.id}`}
                          className="text-teal-600 hover:text-teal-800 font-bold inline-flex items-center gap-1 bg-teal-50 px-2.5 py-1 rounded-lg border border-teal-200/60"
                        >
                          Builder <ExternalLink className="w-3 h-3" />
                        </Link>
                        <button
                          onClick={() => handleDeleteProject(p.id, p.name)}
                          className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                          title="Excluir"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal: Criar Nova Empresa / Tenant */}
      {isTenantModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
              <div className="flex items-center gap-2">
                <Building2 className="w-4 h-4 text-teal-600" />
                <h3 className="font-bold text-sm text-slate-900">Registrar Nova Empresa</h3>
              </div>
              <button onClick={() => setIsTenantModalOpen(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateTenant} className="p-6 space-y-4 text-xs">
              <div className="space-y-1">
                <label className="font-bold text-slate-700">Nome da Empresa</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Empresa C, Logística Alpha..."
                  value={tenantNameInput}
                  onChange={(e) => setTenantNameInput(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsTenantModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-600 rounded-xl font-bold hover:bg-slate-50 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-5 py-2 bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-600 hover:to-emerald-600 text-white rounded-xl font-bold cursor-pointer"
                >
                  {isSaving ? 'Salvando...' : 'Salvar Empresa'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Criar / Editar Usuário com SELETOR DINÂMICO DE EMPRESAS */}
      {isUserModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-teal-600" />
                <h3 className="font-bold text-sm text-slate-900">
                  {editingUserId ? 'Editar Usuário no Banco' : 'Novo Usuário Global (SysAdmin)'}
                </h3>
              </div>
              <button onClick={() => setIsUserModalOpen(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveGlobalUser} className="p-6 space-y-4 text-xs">
              <div className="space-y-1">
                <label className="font-bold text-slate-700">Nome Completo</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Carlos Silva"
                  value={userFormData.name}
                  onChange={(e) => setUserFormData({ ...userFormData, name: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700">E-mail de Acesso</label>
                <input
                  type="email"
                  required
                  placeholder="Ex: carlos@empresa.com"
                  value={userFormData.email}
                  onChange={(e) => setUserFormData({ ...userFormData, email: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>

              {/* SELETOR DE EMPRESAS EXISTENTES */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="font-bold text-slate-700">Empresa Vinculada</label>
                  <button
                    type="button"
                    onClick={() => {
                      setIsCustomCompany(!isCustomCompany);
                      if (!isCustomCompany) {
                        setCustomCompanyName('');
                      } else {
                        setUserFormData(prev => ({ ...prev, company_name: distinctCompanies[0] || '' }));
                      }
                    }}
                    className="text-[10px] font-bold text-teal-600 hover:text-teal-700 underline cursor-pointer"
                  >
                    {isCustomCompany ? '← Escolher existente' : '+ Digitar nova empresa'}
                  </button>
                </div>

                {isCustomCompany ? (
                  <input
                    type="text"
                    required
                    placeholder="Digite o nome da nova empresa..."
                    value={customCompanyName}
                    onChange={(e) => setCustomCompanyName(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-teal-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 font-semibold text-slate-900"
                  />
                ) : (
                  <select
                    required
                    value={userFormData.company_name}
                    onChange={(e) => {
                      if (e.target.value === '__CUSTOM__') {
                        setIsCustomCompany(true);
                      } else {
                        setUserFormData({ ...userFormData, company_name: e.target.value });
                      }
                    }}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 font-semibold text-slate-800"
                  >
                    {distinctCompanies.length === 0 ? (
                      <option value="">Nenhuma empresa encontrada</option>
                    ) : (
                      distinctCompanies.map((comp) => (
                        <option key={comp} value={comp}>
                          {comp}
                        </option>
                      ))
                    )}
                    <option value="__CUSTOM__">+ Inserir Outra Empresa...</option>
                  </select>
                )}
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700">
                  {editingUserId ? 'Nova Senha (deixe em branco para manter)' : 'Senha de Acesso'}
                </label>
                <input
                  type="password"
                  required={!editingUserId}
                  placeholder="••••••••"
                  value={userFormData.password}
                  onChange={(e) => setUserFormData({ ...userFormData, password: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Função</label>
                  <select
                    value={userFormData.role}
                    onChange={(e) => setUserFormData({ ...userFormData, role: e.target.value as any })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 font-medium text-slate-700"
                  >
                    <option value="operator">Operador</option>
                    <option value="auditor">Auditor</option>
                    <option value="admin">Administrador</option>
                    <option value="super_admin">Super Admin</option>
                    <option value="sysadmin">SysAdmin Master</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Status</label>
                  <select
                    value={userFormData.status}
                    onChange={(e) => setUserFormData({ ...userFormData, status: e.target.value as any })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 font-medium text-slate-700"
                  >
                    <option value="active">Ativo</option>
                    <option value="inactive">Inativo</option>
                  </select>
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsUserModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-600 rounded-xl font-bold hover:bg-slate-50 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-5 py-2 bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-600 hover:to-emerald-600 text-white rounded-xl font-bold cursor-pointer"
                >
                  {isSaving ? 'Salvando...' : 'Salvar no Banco'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </main>
  );
}