// src/app/users/page.tsx
'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Users, UserPlus, Search, RefreshCw, 
  Trash2, Edit2, Shield, Building2, CheckCircle2, 
  XCircle, Lock, Mail, User, Check, X
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';

interface UserRecord {
  id: string;
  name: string;
  email: string;
  role: 'sysadmin' | 'super_admin' | 'admin' | 'auditor' | 'operator';
  tenant_id?: string;
  company_name?: string;
  status?: 'active' | 'inactive';
  allowed_project_ids?: string[];
  created_at?: string;
}

export default function UsersPage() {
  const router = useRouter();
  const { user: contextUser } = useAuth();
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Filtros
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  // Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'operator' as UserRecord['role'],
    status: 'active' as 'active' | 'inactive',
  });
  const [isSaving, setIsSaving] = useState(false);

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
    } else if (activeUser.role === 'operator') {
      router.replace('/');
    } else {
      setCurrentUser(activeUser);
    }
  }, [contextUser, router]);

  const fetchUsers = useCallback(async () => {
    if (!currentUser) return;
    setIsLoading(true);

    try {
      let query = supabase
        .from('users')
        .select('*')
        .order('created_at', { ascending: false });

      // ISOLAMENTO MULTI-TENANT:
      if (currentUser.role !== 'sysadmin') {
        if (currentUser.tenantId) {
          query = query.or(`tenant_id.eq.${currentUser.tenantId},company_name.ilike.${currentUser.companyName}`);
        } else if (currentUser.companyName) {
          query = query.ilike('company_name', currentUser.companyName);
        }
      }

      const { data, error } = await query;

      if (error) throw error;
      setUsers(data || []);
    } catch (err: any) {
      console.error('Erro ao buscar usuários:', err.message);
      setUsers([]);
    } finally {
      setIsLoading(false);
    }
  }, [currentUser]);

  useEffect(() => {
    if (currentUser) {
      fetchUsers();
    }
  }, [currentUser, fetchUsers]);

  const handleDeleteUser = async (id: string, name: string) => {
    if (id === currentUser.id) {
      alert('Você não pode excluir sua própria conta de administrador.');
      return;
    }

    if (!confirm(`Deseja realmente remover o usuário "${name}"?`)) return;

    try {
      const { error } = await supabase.from('users').delete().eq('id', id);
      if (error) throw error;
      setUsers((prev) => prev.filter((u) => u.id !== id));
      alert('Usuário removido com sucesso!');
    } catch (err: any) {
      alert(`Falha ao excluir: ${err.message}`);
    }
  };

  const handleSaveUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.email) {
      alert('Preencha os campos obrigatórios.');
      return;
    }

    setIsSaving(true);
    try {
      const payload: any = {
        name: formData.name,
        email: formData.email,
        role: formData.role,
        status: formData.status,
        company_name: currentUser.companyName || 'Empresa B',
        tenant_id: currentUser.tenantId || null,
      };

      if (formData.password) {
        payload.password = formData.password;
      }

      if (editingUserId) {
        const { error } = await supabase.from('users').update(payload).eq('id', editingUserId);
        if (error) throw error;
      } else {
        payload.created_at = new Date().toISOString();
        const { error } = await supabase.from('users').insert([payload]);
        if (error) throw error;
      }

      setIsModalOpen(false);
      setEditingUserId(null);
      setFormData({ name: '', email: '', password: '', role: 'operator', status: 'active' });
      fetchUsers();
      alert(editingUserId ? 'Usuário atualizado com sucesso!' : 'Novo usuário criado com sucesso!');
    } catch (err: any) {
      alert(`Erro ao salvar usuário: ${err.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  const openCreateModal = () => {
    setEditingUserId(null);
    setFormData({ name: '', email: '', password: '', role: 'operator', status: 'active' });
    setIsModalOpen(true);
  };

  const openEditModal = (u: UserRecord) => {
    setEditingUserId(u.id);
    setFormData({
      name: u.name,
      email: u.email,
      password: '',
      role: u.role,
      status: u.status || 'active',
    });
    setIsModalOpen(true);
  };

  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      const matchesSearch =
        u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        u.email.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesRole = roleFilter === 'all' || u.role === roleFilter;
      const matchesStatus = statusFilter === 'all' || (u.status || 'active') === statusFilter;

      return matchesSearch && matchesRole && matchesStatus;
    });
  }, [users, searchTerm, roleFilter, statusFilter]);

  const roleBadgeMap: Record<string, { label: string; color: string }> = {
    sysadmin: { label: 'SysAdmin Master', color: 'bg-purple-50 text-purple-700 border-purple-200' },
    super_admin: { label: 'Super Admin', color: 'bg-teal-50 text-teal-800 border-teal-200' },
    admin: { label: 'Administrador', color: 'bg-sky-50 text-sky-800 border-sky-200' },
    auditor: { label: 'Auditor', color: 'bg-amber-50 text-amber-800 border-amber-200' },
    operator: { label: 'Operador', color: 'bg-slate-100 text-slate-700 border-slate-200' },
  };

  if (!currentUser) return null;

  return (
    <main className="max-w-7xl mx-auto px-6 py-8 w-full space-y-6 font-sans">
      
      {/* Cabeçalho */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-extrabold text-slate-900">Usuários & Acessos</h1>
            <span className="bg-teal-50 text-teal-800 border border-teal-200 text-[10px] font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1">
              <Building2 className="w-3 h-3" />
              {currentUser.companyName || 'Sua Empresa'}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            {currentUser.role === 'sysadmin'
              ? 'Visão Global Master: gerenciando contas de todas as empresas.'
              : 'Gerencie exclusivamente os operadores e administradores da sua empresa.'}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchUsers}
            disabled={isLoading}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-bold transition shadow-2xs cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            <span>Atualizar</span>
          </button>

          <button
            onClick={openCreateModal}
            className="flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-600 hover:to-emerald-600 text-white rounded-xl text-xs font-extrabold transition shadow-sm cursor-pointer"
          >
            <UserPlus className="w-4 h-4" />
            <span>Novo Usuário</span>
          </button>
        </div>
      </div>

      {/* Filtros */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar por nome ou e-mail..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:bg-white"
          />
        </div>

        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          className="px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:bg-white text-slate-700"
        >
          <option value="all">Todas as Funções</option>
          <option value="super_admin">Super Admin</option>
          <option value="admin">Administrador</option>
          <option value="auditor">Auditor</option>
          <option value="operator">Operador</option>
        </select>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:bg-white text-slate-700"
        >
          <option value="all">Todos os Status</option>
          <option value="active">Ativos</option>
          <option value="inactive">Inativos</option>
        </select>
      </div>

      {/* Tabela de Usuários */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
        {isLoading ? (
          <div className="py-16 text-center text-slate-400 space-y-2">
            <div className="w-6 h-6 border-2 border-teal-500 border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-xs font-semibold text-slate-600">Buscando equipe da sua empresa...</p>
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="py-16 text-center space-y-2">
            <Users className="w-10 h-10 mx-auto opacity-30 text-teal-600" />
            <p className="text-sm font-semibold text-slate-700">Nenhum usuário encontrado</p>
            <p className="text-xs text-slate-400">Clique em "Novo Usuário" para cadastrar membros da sua empresa.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-50/90 border-b border-slate-200 text-slate-500 uppercase tracking-wider font-semibold">
                <tr>
                  <th className="px-6 py-3.5">Nome / Identificação</th>
                  <th className="px-6 py-3.5">E-mail</th>
                  <th className="px-6 py-3.5">Empresa</th>
                  <th className="px-6 py-3.5 text-center">Função</th>
                  <th className="px-6 py-3.5 text-center">Status</th>
                  <th className="px-6 py-3.5 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200/90 text-slate-700 font-medium">
                {filteredUsers.map((u) => {
                  const roleConfig = roleBadgeMap[u.role] || { label: u.role, color: 'bg-slate-100 text-slate-700' };

                  return (
                    <tr key={u.id} className="hover:bg-teal-50/30 transition">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-lg bg-teal-50 text-teal-700 flex items-center justify-center font-bold text-xs border border-teal-200/60">
                            {u.name.charAt(0).toUpperCase()}
                          </div>
                          <span className="font-bold text-slate-900">{u.name}</span>
                        </div>
                      </td>

                      <td className="px-6 py-4 text-slate-500">
                        <div className="flex items-center gap-1.5">
                          <Mail className="w-3.5 h-3.5 text-slate-400" />
                          <span>{u.email}</span>
                        </div>
                      </td>

                      <td className="px-6 py-4">
                        <span className="font-semibold text-slate-700">
                          {u.company_name || currentUser.companyName}
                        </span>
                      </td>

                      <td className="px-6 py-4 text-center">
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border uppercase tracking-wide ${roleConfig.color}`}>
                          {roleConfig.label}
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
                            onClick={() => openEditModal(u)}
                            className="p-1.5 rounded-lg bg-slate-50 hover:bg-teal-50 text-slate-600 hover:text-teal-700 transition border border-slate-200 cursor-pointer"
                            title="Editar Usuário"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>

                          {u.id !== currentUser.id && (
                            <button
                              onClick={() => handleDeleteUser(u.id, u.name)}
                              className="p-1.5 rounded-lg bg-slate-50 hover:bg-rose-50 text-slate-400 hover:text-rose-600 transition border border-slate-200 cursor-pointer"
                              title="Remover Usuário"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal Criar / Editar Usuário */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4 text-teal-600" />
                <h3 className="font-bold text-sm text-slate-900">
                  {editingUserId ? 'Editar Usuário' : 'Novo Usuário da Empresa'}
                </h3>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveUser} className="p-6 space-y-4 text-xs">
              <div className="space-y-1">
                <label className="font-bold text-slate-700">Nome Completo</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                  <input
                    type="text"
                    required
                    placeholder="Ex: João da Silva"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700">E-mail de Acesso</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                  <input
                    type="email"
                    required
                    placeholder="Ex: joao@suaempresa.com"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700">
                  {editingUserId ? 'Nova Senha (opcional)' : 'Senha de Acesso'}
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                  <input
                    type="password"
                    required={!editingUserId}
                    placeholder="••••••••"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Função / Perfil</label>
                  <select
                    value={formData.role}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value as any })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 text-slate-700 font-medium"
                  >
                    <option value="operator">Operador</option>
                    <option value="auditor">Auditor</option>
                    <option value="admin">Administrador</option>
                    {currentUser.role === 'sysadmin' && (
                      <option value="super_admin">Super Admin</option>
                    )}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Status</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 text-slate-700 font-medium"
                  >
                    <option value="active">Ativo</option>
                    <option value="inactive">Inativo</option>
                  </select>
                </div>
              </div>

              <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-600 rounded-lg font-bold hover:bg-slate-50 transition cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="flex items-center gap-1.5 px-5 py-2 bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-600 hover:to-emerald-600 text-white rounded-lg font-bold transition shadow-2xs cursor-pointer"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>{isSaving ? 'Salvando...' : 'Salvar Usuário'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </main>
  );
}