// src/app/sysadmin/login/page.tsx
'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { 
  KeyRound, ShieldAlert, ArrowRight, 
  Terminal, Eye, EyeOff, ShieldCheck 
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';

export default function SysAdminLoginPage() {
  const router = useRouter();
  const { login } = useAuth();

  const [masterPassword, setMasterPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [loading, setLoading] = useState(false);

  const handleMasterAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setLoading(true);

    try {
      const cleanPass = masterPassword.trim();

      if (!cleanPass) {
        throw new Error('Por favor, informe a senha mestre de acesso.');
      }

      // 1. Verifica no Supabase se existe algum usuário SysAdmin com essa senha
      const { data } = await supabase
        .from('users')
        .select('*')
        .eq('role', 'sysadmin')
        .eq('password', cleanPass)
        .maybeSingle();

      let targetUser = data;

      // 2. Chave mestre de contingência (caso o banco ainda não tenha registros)
      if (!targetUser && cleanPass === '123456') {
        targetUser = {
          id: 'usr-sysadmin-01',
          name: 'SysAdmin Master',
          email: 'admin@nws.com',
          role: 'sysadmin',
          company_name: 'NWS Plataforma',
          status: 'active',
        };
      }

      if (!targetUser) {
        throw new Error('Senha mestre incorreta. Acesso não autorizado.');
      }

      // 3. Monta a sessão Root Master
      const sessionData = {
        id: targetUser.id,
        name: targetUser.name || 'SysAdmin Master',
        email: targetUser.email || 'admin@nws.com',
        role: 'sysadmin' as const,
        companyName: 'NWS Plataforma',
      };

      sessionStorage.setItem('nws_auth_session', JSON.stringify(sessionData));
      sessionStorage.setItem('nws_current_session', JSON.stringify(sessionData));
      sessionStorage.setItem('nws_sysadmin_auth', 'true');
      localStorage.setItem('nws_auth_session', JSON.stringify(sessionData));

      if (login) {
        login(sessionData);
      }
      
      router.push('/sysadmin');

    } catch (err: any) {
      setErrorMsg(err.message || 'Falha ao autenticar.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center items-center p-4 relative overflow-hidden font-sans select-none">
      
      {/* Background Decorativo Dark Cyber */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(20,184,166,0.18),transparent_70%)] pointer-events-none" />
      <div className="absolute -top-40 -right-40 w-96 h-96 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-sm relative z-10 space-y-6">
        
        {/* Cabeçalho */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-slate-900 border border-teal-500/30 text-teal-400 shadow-[0_0_30px_rgba(20,184,166,0.2)] mb-1">
            <Terminal className="w-8 h-8" />
          </div>
          <div className="flex items-center justify-center gap-2">
            <span className="text-[10px] font-black tracking-widest text-teal-400 uppercase bg-teal-950/80 border border-teal-800/80 px-2.5 py-0.5 rounded-full">
              Chave Mestre Root
            </span>
          </div>
          <h1 className="text-2xl font-black tracking-tight text-white">
            SysAdmin Master
          </h1>
          <p className="text-xs text-slate-400">
            Digite apenas a senha de segurança para liberar o painel global.
          </p>
        </div>

        {/* Card com Apenas Senha */}
        <div className="bg-slate-900/90 border border-slate-800/90 backdrop-blur-xl rounded-2xl p-7 shadow-2xl space-y-5">
          
          {errorMsg && (
            <div className="bg-rose-950/60 border border-rose-800/80 text-rose-300 text-xs p-3 rounded-xl flex items-center gap-2 animate-in fade-in">
              <ShieldAlert className="w-4 h-4 shrink-0 text-rose-400" />
              <div className="font-semibold">{errorMsg}</div>
            </div>
          )}

          <form onSubmit={handleMasterAuth} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-300 flex items-center justify-between">
                <span>Senha Mestre de Acesso</span>
                <KeyRound className="w-3.5 h-3.5 text-teal-400" />
              </label>
              
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  autoFocus
                  required
                  placeholder="Digite sua senha..."
                  value={masterPassword}
                  onChange={(e) => setMasterPassword(e.target.value)}
                  className="w-full bg-slate-950/90 border border-slate-700/80 text-white pl-4 pr-10 py-3 rounded-xl text-sm tracking-wider focus:outline-none focus:ring-2 focus:ring-teal-500/50 focus:border-teal-500 placeholder:text-slate-600 font-medium transition"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 py-3 bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-400 hover:to-emerald-400 text-slate-950 font-black text-xs rounded-xl transition shadow-[0_0_20px_rgba(20,184,166,0.3)] flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <span>Desbloquear Painel Master</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          <div className="pt-2 border-t border-slate-800/80 text-center">
            <a
              href="/login"
              className="text-[11px] text-slate-400 hover:text-teal-400 transition inline-flex items-center gap-1 font-medium"
            >
              ← Acessar como usuário de empresa
            </a>
          </div>
        </div>

        <div className="text-center text-[10px] text-slate-600 flex items-center justify-center gap-1.5">
          <ShieldCheck className="w-3.5 h-3.5 text-teal-600" />
          <span>Acesso direto ao Supabase com privilégios de superusuário</span>
        </div>

      </div>
    </div>
  );
}