// src/components/Navbar.tsx
'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { FolderKanban, BarChart3, Users, Home, LogIn } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user: contextUser } = useAuth();
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    if (contextUser) {
      setCurrentUser(contextUser);
      return;
    }

    const session = 
      sessionStorage.getItem('nws_auth_session') || 
      sessionStorage.getItem('nws_current_session');

    if (session) {
      try {
        setCurrentUser(JSON.parse(session));
      } catch {
        setCurrentUser(null);
      }
    } else {
      setCurrentUser(null);
    }
  }, [pathname, contextUser]);

  if (pathname === '/login' || pathname.startsWith('/builder') || pathname.startsWith('/collect')) {
    return null;
  }

  const navItems = [
    { label: 'Início', href: '/', icon: Home },
    { label: 'Projetos & Formulários', href: '/projects', icon: FolderKanban },
    { label: 'Relatórios & Coletas', href: '/reports', icon: BarChart3 },
    ...(currentUser && currentUser.role !== 'operator'
      ? [{ label: 'Usuários & Acessos', href: '/users', icon: Users }]
      : []),
  ];

  const roleLabelMap: Record<string, string> = {
    sysadmin: 'SysAdmin Master',
    super_admin: 'Super Admin',
    admin: 'Administrador',
    auditor: 'Auditor',
    operator: 'Operador',
  };

  return (
    <header className="border-b border-slate-200 bg-white sticky top-0 z-40 shadow-2xs font-sans">
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
        
        {/* Logo do Infinito Original */}
        <div className="flex items-center gap-8">
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="w-9 h-9 rounded-xl bg-teal-50 border border-teal-200/80 flex items-center justify-center text-teal-600 transition-transform group-hover:scale-105 shadow-2xs">
              <svg 
                viewBox="0 0 24 24" 
                fill="none" 
                stroke="currentColor" 
                strokeWidth="2.5" 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                className="w-5 h-5"
              >
                <path d="M18.178 8c5.096 0 5.096 8 0 8-5.095 0-7.133-8-12.356-8-5.096 0-5.096 8 0 8 5.223 0 7.261-8 12.356-8Z" />
              </svg>
            </div>
            <div className="flex flex-col">
              <span className="text-base font-black tracking-tight text-slate-900 leading-none">
                NWS
              </span>
              <span className="text-[9px] font-bold tracking-widest text-teal-600 uppercase mt-0.5">
                Plataforma
              </span>
            </div>
          </Link>

          {/* Links de Navegação */}
          <nav className="hidden md:flex items-center gap-1.5">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold border transition ${
                    isActive
                      ? 'bg-teal-50 text-teal-900 border-teal-300 shadow-2xs'
                      : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-50 hover:border-slate-200'
                  }`}
                >
                  <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-teal-600' : 'text-slate-400'}`} />
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Lado Direito - Perfil do Usuário */}
        <div className="flex items-center gap-3">
          {isMounted && currentUser ? (
            <div className="flex items-center gap-2.5 bg-slate-50 border border-slate-200 px-3.5 py-1.5 rounded-xl shadow-2xs">
              <div className="flex flex-col text-right">
                <span className="text-xs font-bold text-slate-800 leading-none">
                  {currentUser.name}
                </span>
                <span className="text-[10px] text-teal-700 font-bold uppercase mt-0.5">
                  {roleLabelMap[currentUser.role] || currentUser.role} • {currentUser.companyName || 'NWS'}
                </span>
              </div>
            </div>
          ) : isMounted ? (
            <Link
              href="/login"
              className="flex items-center gap-1.5 bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-600 hover:to-emerald-600 text-white px-3.5 py-1.5 rounded-xl text-xs font-bold transition shadow-2xs"
            >
              <LogIn className="w-3.5 h-3.5" />
              Fazer Login
            </Link>
          ) : null}
        </div>

      </div>
    </header>
  );
}