// src/app/login/page.tsx
'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { 
  ShieldCheck, Lock, User, ArrowRight, 
  Eye, EyeOff, AlertCircle, Loader2
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { UserSession } from '@/context/AuthContext';

export default function LoginPage() {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMessage('');

    const cleanIdentifier = identifier.trim();
    const cleanPassword = password.trim();

    // 1. Acesso SysAdmin Master
    if (
      cleanIdentifier.toLowerCase() === 'sysadmin' || 
      cleanIdentifier.toLowerCase() === 'master@nws.com' || 
      cleanIdentifier.toLowerCase() === 'admin'
    ) {
      if (cleanPassword === 'NWS@MASTER2026') {
        sessionStorage.setItem('nws_sysadmin_auth', 'granted');
        const masterSession: UserSession = {
          id: 'SYS-MASTER',
          name: 'SysAdmin Master',
          email: 'master@nws.com',
          role: 'sysadmin',
          companyName: 'NWS Plataforma Global',
        };
        sessionStorage.setItem('nws_auth_session', JSON.stringify(masterSession));
        sessionStorage.setItem('nws_current_session', JSON.stringify(masterSession));
        window.location.replace('/sysadmin');
        return;
      }
    }

    try {
      // 2. Consulta no Supabase por e-mail ou username
      let { data: users, error } = await supabase
        .from('app_users')
        .select('*')
        .ilike('email', cleanIdentifier)
        .limit(1);

      if (!users || users.length === 0) {
        const { data: userByLogin } = await supabase
          .from('app_users')
          .select('*')
          .ilike('login_username', cleanIdentifier)
          .limit(1);

        if (userByLogin && userByLogin.length > 0) {
          users = userByLogin;
        } else {
          const { data: userByName } = await supabase
            .from('app_users')
            .select('*')
            .ilike('name', cleanIdentifier)
            .limit(1);

          if (userByName && userByName.length > 0) {
            users = userByName;
          }
        }
      }

      if (error) {
        setErrorMessage(`Erro ao consultar: ${error.message}`);
        setIsLoading(false);
        return;
      }

      if (!users || users.length === 0) {
        setErrorMessage('Nenhum usuário cadastrado com este e-mail ou login.');
        setIsLoading(false);
        return;
      }

      const foundUser = users[0];

      // 3. Validação de Senha
      if (String(foundUser.password).trim() !== cleanPassword) {
        setErrorMessage('Senha incorreta. Verifique suas credenciais.');
        setIsLoading(false);
        return;
      }

      // 4. Verificação de Status
      if (foundUser.status === 'blocked' || foundUser.status === 'inactive') {
        setErrorMessage('Sua conta de usuário está desativada ou bloqueada.');
        setIsLoading(false);
        return;
      }

      // 5. Permissões da Empresa (Tenant)
      let tenantPermissions = {
        canUseBuilder: true,
        canExportReports: true,
        canManageUsers: true,
        canUseCustomCode: true,
      };

      if (foundUser.tenant_id) {
        try {
          const { data: tenantData } = await supabase
            .from('tenants')
            .select('*')
            .eq('id', foundUser.tenant_id)
            .maybeSingle();

          if (tenantData) {
            if (tenantData.status === 'suspended') {
              setErrorMessage('A conta da sua empresa está suspensa.');
              setIsLoading(false);
              return;
            }
            tenantPermissions = {
              canUseBuilder: tenantData.can_use_builder ?? true,
              canExportReports: tenantData.can_export_reports ?? true,
              canManageUsers: tenantData.can_manage_users ?? true,
              canUseCustomCode: tenantData.can_use_custom_code ?? true,
            };
          }
        } catch {
          // segue com padrão
        }
      }

      // 6. Monta Sessão
      const sessionData: UserSession = {
        id: foundUser.id,
        name: foundUser.name || 'Usuário NWS',
        email: foundUser.email,
        role: foundUser.role || 'operator',
        tenantId: foundUser.tenant_id || undefined,
        companyName: foundUser.client_company_name || 'NWS Plataforma',
        allowedProjectIds: foundUser.allowed_project_ids || [],
        permissions: tenantPermissions,
      };

      sessionStorage.setItem('nws_auth_session', JSON.stringify(sessionData));
      sessionStorage.setItem('nws_current_session', JSON.stringify(sessionData));

      // 7. Redireciona
      if (sessionData.role === 'sysadmin') {
        window.location.replace('/sysadmin');
      } else if (sessionData.role === 'auditor') {
        window.location.replace('/reports');
      } else {
        window.location.replace('/');
      }

    } catch (err: any) {
      setErrorMessage(`Falha na autenticação: ${err.message || 'Erro inesperado'}`);
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 relative overflow-hidden font-sans">
      {/* Background Decorativo */}
      <div className="absolute w-[500px] h-[500px] bg-teal-500/10 rounded-full blur-[100px] pointer-events-none -top-20 -left-20" />
      <div className="absolute w-[500px] h-[500px] bg-emerald-500/10 rounded-full blur-[100px] pointer-events-none -bottom-20 -right-20" />

      <div className="w-full max-w-md relative z-10">
        <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-8 shadow-2xl backdrop-blur-xl space-y-6">
          
          <div className="text-center space-y-2">
            <div className="w-12 h-12 bg-gradient-to-tr from-teal-500 to-emerald-400 rounded-2xl flex items-center justify-center mx-auto shadow-lg shadow-teal-500/20">
              <ShieldCheck className="w-6 h-6 text-slate-950" />
            </div>
            <h1 className="text-2xl font-black text-white tracking-tight">NWS Plataforma</h1>
            <p className="text-xs text-slate-400">Entre com suas credenciais de operador ou administrador</p>
          </div>

          {errorMessage && (
            <div className="bg-rose-500/10 border border-rose-500/30 p-3 rounded-xl flex items-center gap-2.5 text-rose-400 text-xs animate-in fade-in">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          <form onSubmit={handleSignIn} className="space-y-4">
            <div>
              <label className="text-[11px] font-bold text-slate-300 uppercase tracking-wider block mb-1.5">
                E-mail ou Nome de Usuário
              </label>
              <div className="relative">
                <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input
                  type="text"
                  required
                  placeholder="ex: operador@empresa.com ou login"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 text-white placeholder:text-slate-600 pl-10 pr-4 py-3 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-teal-500 font-medium"
                />
              </div>
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-300 uppercase tracking-wider block mb-1.5">
                Senha de Acesso
              </label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 text-white placeholder:text-slate-600 pl-10 pr-10 py-3 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-teal-500 font-medium"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 p-1 cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3.5 bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-600 hover:to-emerald-600 disabled:opacity-50 text-slate-950 font-black text-xs uppercase tracking-wider rounded-xl transition shadow-lg shadow-teal-500/20 flex items-center justify-center gap-2 cursor-pointer mt-2"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Autenticando...</span>
                </>
              ) : (
                <>
                  <span>Acessar Meu Painel</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          <div className="pt-4 border-t border-slate-800/80 text-center">
            <Link
              href="/sysadmin"
              className="text-[11px] text-slate-500 hover:text-teal-400 transition"
            >
              Acesso exclusivo Dono da Plataforma (SysAdmin) &rarr;
            </Link>
          </div>

        </div>
      </div>
    </div>
  );
}