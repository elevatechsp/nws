// src/app/page.tsx
'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowRight, BarChart3 } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

export default function HomePage() {
  const router = useRouter();
  const { user: contextUser } = useAuth();
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);

    let active = contextUser;
    if (!active && typeof window !== 'undefined') {
      const raw = 
        sessionStorage.getItem('nws_auth_session') || 
        sessionStorage.getItem('nws_current_session');

      if (raw) {
        try {
          active = JSON.parse(raw);
        } catch {
          active = null;
        }
      }
    }

    if (!active) {
      router.replace('/login');
    } else {
      setCurrentUser(active);
    }
  }, [contextUser, router]);

  // Renderiza um placeholder invisível enquanto hidrata para o Turbopack/Next.js sempre receber um elemento JSX válido
  if (!isMounted || !currentUser) {
    return <div className="min-h-screen bg-white" />;
  }

  return (
    <main className="min-h-[calc(100vh-4rem)] bg-gradient-to-b from-teal-50/70 via-emerald-50/40 to-white flex flex-col items-center justify-center px-6 py-16 font-sans relative overflow-hidden">
      {/* Luzes e Efeito Suave de Fundo */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[350px] bg-teal-200/35 rounded-full blur-[120px] pointer-events-none" />

      <div className="max-w-4xl w-full text-center space-y-8 relative z-10">
        {/* Pílula Superior de Identificação */}
        <div className="inline-flex items-center gap-2.5 px-5 py-2 rounded-full bg-white/90 border border-teal-200 shadow-2xs text-slate-700 text-xs md:text-sm font-semibold backdrop-blur-xs">
          <span className="text-teal-700 font-extrabold text-sm tracking-tight">∞ NWS</span>
          <span className="text-slate-300">•</span>
          <span className="text-slate-600 font-medium">
            {currentUser.companyName || 'Data & Operations Platform'}
          </span>
          <span className="w-2 h-2 rounded-full bg-teal-500 animate-pulse" />
        </div>

        {/* Título Principal */}
        <div className="space-y-2">
          <h1 className="text-5xl sm:text-6xl md:text-7xl font-black tracking-tight text-slate-900 leading-[1.08]">
            Seja bem-vindo,
          </h1>
          <h2 className="text-5xl sm:text-6xl md:text-7xl font-black tracking-tight bg-gradient-to-r from-teal-400 via-teal-500 to-emerald-400 bg-clip-text text-transparent leading-[1.12] pb-2">
            {currentUser.name || 'Operador'}
          </h2>
        </div>

        {/* Descrição Subtítulo */}
        <p className="text-sm md:text-base text-slate-500 max-w-2xl mx-auto leading-relaxed font-normal">
          Crie formulários customizados, audite informações em campo com recursos avançados (OCR, QR, GPS e Assinatura) e gerencie aprovações em tempo real.
        </p>

        {/* Botões de Ação */}
        <div className="pt-3 flex flex-wrap items-center justify-center gap-4">
          <Link
            href="/projects"
            className="flex items-center gap-2 bg-gradient-to-r from-teal-400 to-emerald-400 hover:from-teal-500 hover:to-emerald-500 text-slate-950 font-black text-sm px-8 py-3.5 rounded-2xl transition shadow-md hover:shadow-lg shadow-teal-500/20 cursor-pointer"
          >
            <span>Gerenciar Sistemas</span>
            <ArrowRight className="w-4 h-4" />
          </Link>

          <Link
            href="/reports"
            className="flex items-center gap-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200/90 font-bold text-sm px-8 py-3.5 rounded-2xl transition shadow-2xs hover:shadow-xs cursor-pointer"
          >
            <BarChart3 className="w-4 h-4 text-teal-600" />
            <span>Ver Relatórios</span>
          </Link>
        </div>
      </div>
    </main>
  );
}