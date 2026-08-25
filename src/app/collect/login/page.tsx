// src/app/collect/login/page.tsx
'use client';

import React, { Suspense, useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { 
  Smartphone, User, Lock, ArrowRight, ShieldCheck, 
  Wifi, WifiOff, AlertCircle, Eye, EyeOff
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';

function OperatorLoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const returnToFormId = searchParams.get('formId') || '';

  const { login } = useAuth();
  const [emailOrUser, setEmailOrUser] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [loading, setLoading] = useState(false);
  const [isOnline, setIsOnline] = useState(true);

  // Monitora Conexão
  useEffect(() => {
    if (typeof window !== 'undefined') {
      setIsOnline(navigator.onLine);
      const onOnline = () => setIsOnline(true);
      const onOffline = () => setIsOnline(false);
      window.addEventListener('online', onOnline);
      window.addEventListener('offline', onOffline);
      return () => {
        window.removeEventListener('online', onOnline);
        window.removeEventListener('offline', onOffline);
      };
    }
  }, []);

  const handleOperatorLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setLoading(true);

    try {
      const cleanInput = emailOrUser.trim().toLowerCase();
      const cleanPass = password.trim();

      // 1. Busca por e-mail ou nome no Supabase
      const { data: userByEmail } = await supabase
        .from('users')
        .select('*')
        .ilike('email', cleanInput)
        .maybeSingle();

      let targetUser = userByEmail;

      if (!targetUser) {
        const { data: userByName } = await supabase
          .from('users')
          .select('*')
          .ilike('name', cleanInput)
          .maybeSingle();
        targetUser = userByName;
      }

      if (!targetUser) {
        throw new Error('Operador não encontrado. Verifique seu usuário ou e-mail.');
      }

      if (targetUser.password && targetUser.password !== cleanPass) {
        throw new Error('Senha incorreta.');
      }

      if (targetUser.status === 'inactive') {
        throw new Error('Seu cadastro de operador está inativo.');
      }

      // Monta sessão
      const sessionData = {
        id: targetUser.id,
        name: targetUser.name,
        email: targetUser.email,
        role: targetUser.role || 'operator',
        tenantId: targetUser.tenant_id || undefined,
        companyName: targetUser.company_name || 'Empresa',
        allowedProjectIds: targetUser.allowed_project_ids || [],
      };

      // Grava em todas as chaves de sessão para persistência segura
      if (typeof window !== 'undefined') {
        sessionStorage.setItem('nws_auth_session', JSON.stringify(sessionData));
        sessionStorage.setItem('nws_current_session', JSON.stringify(sessionData));
        localStorage.setItem('nws_auth_session', JSON.stringify(sessionData));
        localStorage.setItem('nws_current_session', JSON.stringify(sessionData));
      }

      if (login) {
        login(sessionData);
      }

      // REDIRECIONAMENTO DIRETO PARA O PORTAL DE COLETA DO OPERADOR
      const targetDestination = returnToFormId ? `/collect?id=${returnToFormId}` : '/collect';

      router.replace(targetDestination);

      // Fallback garantido para ambiente web
      if (typeof window !== 'undefined') {
        window.location.replace(targetDestination);
      }

    } catch (err: any) {
      setErrorMsg(err.message || 'Falha ao autenticar.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-between items-center p-4 sm:p-6 font-sans select-none text-slate-100">
      
      {/* Top Bar Conexão */}
      <div className="w-full max-w-sm flex items-center justify-between text-[11px] font-bold text-slate-400 py-2">
        <div className="flex items-center gap-1.5">
          {isOnline ? (
            <span className="flex items-center gap-1 text-teal-400">
              <Wifi className="w-3.5 h-3.5" /> Conectado
            </span>
          ) : (
            <span className="flex items-center gap-1 text-amber-400">
              <WifiOff className="w-3.5 h-3.5" /> Modo Offline
            </span>
          )}
        </div>
        <span className="text-slate-500">NWS Mobile</span>
      </div>

      {/* Card de Login Mobile */}
      <div className="w-full max-w-sm space-y-6 my-auto">
        <div className="text-center space-y-2">
          <div className="w-14 h-14 rounded-2xl bg-teal-500/10 border border-teal-500/30 text-teal-400 flex items-center justify-center mx-auto shadow-inner">
            <Smartphone className="w-7 h-7" />
          </div>
          <h1 className="text-xl font-black text-white tracking-tight">
            Portal do Coletor
          </h1>
          <p className="text-xs text-slate-400">
            Identifique-se para acessar e responder os formulários da sua empresa.
          </p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-4">
          {errorMsg && (
            <div className="bg-rose-950/60 border border-rose-800/80 text-rose-300 text-xs p-3 rounded-xl flex items-start gap-2 animate-in fade-in">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400 mt-0.5" />
              <div className="font-semibold">{errorMsg}</div>
            </div>
          )}

          <form onSubmit={handleOperatorLogin} className="space-y-4 text-xs">
            <div className="space-y-1.5">
              <label className="font-bold text-slate-300">Usuário ou E-mail</label>
              <div className="relative">
                <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input
                  type="text"
                  required
                  placeholder="Seu usuário ou e-mail..."
                  value={emailOrUser}
                  onChange={(e) => setEmailOrUser(e.target.value)}
                  className="w-full pl-10 pr-3 py-3 bg-slate-950 border border-slate-800 rounded-xl text-white text-xs focus:outline-none focus:ring-2 focus:ring-teal-500 font-medium placeholder:text-slate-600"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="font-bold text-slate-300">Senha de Acesso</label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-10 py-3 bg-slate-950 border border-slate-800 rounded-xl text-white text-xs focus:outline-none focus:ring-2 focus:ring-teal-500 font-medium placeholder:text-slate-600"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-400 hover:to-emerald-400 text-slate-950 font-black text-xs rounded-xl transition shadow-lg flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 mt-2"
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <span>Entrar nos Formulários</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          <div className="pt-2 border-t border-slate-800/80 text-center">
            <Link
              href="/login"
              className="text-[11px] text-slate-400 hover:text-teal-400 transition"
            >
              Painel de Gestão & Administração →
            </Link>
          </div>
        </div>
      </div>

      <div className="text-center text-[10px] text-slate-500 flex items-center justify-center gap-1 py-2">
        <ShieldCheck className="w-3.5 h-3.5 text-teal-500" />
        <span>NWS Plataforma • Suporte Offline-First</span>
      </div>

    </div>
  );
}

export default function OperatorLoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="w-8 h-8 border-3 border-teal-400 border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <OperatorLoginForm />
    </Suspense>
  );
}