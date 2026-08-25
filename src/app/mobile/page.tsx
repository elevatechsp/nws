// src/app/mobile/page.tsx
'use client';

import React, { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { 
  Lock, User, LogOut, Wifi, WifiOff, RefreshCw, 
  Send, Layers, ArrowLeft
} from 'lucide-react';
import { Project, FormField } from '@/types/project';
import NWSLogo from '@/components/NWSLogo';

// Carrega o DynamicField apenas no lado do cliente com proteção
const DynamicField = dynamic(() => import('@/components/DynamicField'), {
  ssr: false,
  loading: () => <p className="text-[11px] text-slate-400">Carregando campo...</p>,
});

export default function MobileOperatorScreen() {
  const [mounted, setMounted] = useState(false);
  const [isLogged, setIsLogged] = useState(false);
  const [operatorName, setOperatorName] = useState('');
  
  const [loginInput, setLoginInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');

  const [allowedProjects, setAllowedProjects] = useState<Project[]>([]);
  const [activeProject, setActiveProject] = useState<Project | null>(null);
  const [formData, setFormData] = useState<Record<string, any>>({});
  
  const [isOnline, setIsOnline] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [offlineQueue, setOfflineQueue] = useState<any[]>([]);

  // 1. Garantir montagem sem falhas de hidratação no iOS
  useEffect(() => {
    setMounted(true);
    setIsOnline(navigator.onLine);

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Recupera dados com segurança
    try {
      const savedUser = localStorage.getItem('nws_mobile_user');
      if (savedUser) {
        setOperatorName(savedUser);
        setIsLogged(true);
      }
      const savedQueue = localStorage.getItem('nws_offline_queue');
      if (savedQueue) {
        setOfflineQueue(JSON.parse(savedQueue));
      }
    } catch {}

    fetchProjects();

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const fetchProjects = async () => {
    try {
      const res = await fetch('/api/sync/projects');
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          setAllowedProjects(data);
          try {
            localStorage.setItem('smartinfo_projects', JSON.stringify(data));
          } catch {}
          return;
        }
      }
    } catch {}

    try {
      const local = JSON.parse(localStorage.getItem('smartinfo_projects') || '[]');
      setAllowedProjects(local);
    } catch {}
  };

  // 2. Ação de Login (Executa imediatamente no clique ou toque)
  const handleEnter = () => {
    const name = loginInput.trim() || 'Operador Teste';
    setOperatorName(name);
    setIsLogged(true);

    try {
      localStorage.setItem('nws_mobile_user', name);
    } catch {}

    fetchProjects();
  };

  const handleLogout = () => {
    try {
      localStorage.removeItem('nws_mobile_user');
    } catch {}
    setIsLogged(false);
    setActiveProject(null);
    setFormData({});
  };

  // 3. Envio de Coleta
  const handleSendForm = async () => {
    if (!activeProject) return;

    const payload = {
      id: `REC-${Math.floor(10000 + Math.random() * 90000)}`,
      projectId: activeProject.id,
      projectName: activeProject.name,
      operator: operatorName,
      location: 'Coleta em Campo (Mobile)',
      submittedAt: new Date().toLocaleString('pt-BR'),
      status: 'pending',
      data: formData,
    };

    if (navigator.onLine) {
      try {
        await fetch('/api/sync/submissions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        alert('Coleta enviada com sucesso para o painel Web!');
      } catch {
        saveOffline(payload);
      }
    } else {
      saveOffline(payload);
    }

    setFormData({});
    setActiveProject(null);
  };

  const saveOffline = (payload: any) => {
    const updated = [...offlineQueue, payload];
    setOfflineQueue(updated);
    try {
      localStorage.setItem('nws_offline_queue', JSON.stringify(updated));
    } catch {}
    alert('Sem conexão: Salvo localmente no aparelho.');
  };

  // 4. Sincronizar
  const handleSync = async () => {
    if (!navigator.onLine) {
      alert('Sem internet.');
      return;
    }

    setIsSyncing(true);
    try {
      await fetchProjects();
      if (offlineQueue.length > 0) {
        const res = await fetch('/api/sync/submissions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(offlineQueue),
        });
        if (res.ok) {
          try {
            localStorage.removeItem('nws_offline_queue');
          } catch {}
          setOfflineQueue([]);
          alert('Coletas sincronizadas com a Web!');
        }
      } else {
        alert('Formulários atualizados!');
      }
    } catch {
      alert('Erro ao conectar com o servidor.');
    } finally {
      setIsSyncing(false);
    }
  };

  if (!mounted) {
    return (
      <div className="fixed inset-0 bg-slate-900 flex items-center justify-center text-white text-xs font-bold">
        Carregando Coletor...
      </div>
    );
  }

  // ==========================================
  // TELA DE LOGIN
  // ==========================================
  if (!isLogged) {
    return (
      <div className="fixed inset-0 z-50 bg-slate-900 flex flex-col justify-center items-center px-4 select-none">
        <div className="w-full max-w-sm bg-white rounded-3xl p-6 shadow-2xl">
          <div className="text-center mb-6">
            <div className="inline-flex items-center justify-center p-3 bg-teal-50 rounded-2xl mb-2">
              <NWSLogo className="w-8 h-5" />
            </div>
            <h2 className="text-xl font-black text-slate-900">Acesso ao Coletor</h2>
            <p className="text-xs text-slate-500">Área exclusiva do aplicativo mobile</p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Usuário ou E-mail</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  value={loginInput}
                  onChange={(e) => setLoginInput(e.target.value)}
                  placeholder="Seu nome ou usuário"
                  className="w-full text-xs pl-9 pr-3 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 text-slate-900"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Senha</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="password"
                  value={passwordInput}
                  onChange={(e) => setPasswordInput(e.target.value)}
                  placeholder="Sua senha"
                  className="w-full text-xs pl-9 pr-3 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 text-slate-900"
                />
              </div>
            </div>

            <button
              type="button"
              onClick={handleEnter}
              onTouchEnd={(e) => {
                e.preventDefault();
                handleEnter();
              }}
              className="w-full bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-600 hover:to-emerald-600 text-white font-extrabold py-3.5 rounded-xl text-xs uppercase tracking-wider shadow-md active:scale-95 transition cursor-pointer"
            >
              Entrar no Coletor
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ==========================================
  // TELA PRINCIPAL (LISTAGEM & FORMULÁRIOS)
  // ==========================================
  return (
    <div className="fixed inset-0 z-50 bg-slate-100 text-slate-900 flex flex-col justify-between overflow-y-auto">
      {/* Cabeçalho Superior */}
      <header className="bg-teal-700 text-white p-4 sticky top-0 z-30 shadow-md flex items-center justify-between">
        <div className="flex items-center gap-2 truncate">
          {activeProject && (
            <button 
              type="button" 
              onClick={() => setActiveProject(null)} 
              className="p-1 hover:bg-teal-600 rounded mr-1"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
          )}
          <div className="truncate">
            <h1 className="font-extrabold text-xs truncate leading-tight">
              {activeProject ? activeProject.name : operatorName}
            </h1>
            <p className="text-[10px] text-teal-200 truncate">NWS Coleta Mobile</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {isOnline ? (
            <span className="flex items-center gap-1 bg-emerald-500/30 text-emerald-100 text-[10px] font-bold px-2 py-0.5 rounded-full border border-emerald-400/40">
              <Wifi className="w-3 h-3" /> Online
            </span>
          ) : (
            <span className="flex items-center gap-1 bg-rose-500/40 text-rose-100 text-[10px] font-bold px-2 py-0.5 rounded-full border border-rose-400/50">
              <WifiOff className="w-3 h-3" /> Offline
            </span>
          )}

          <button 
            type="button" 
            onClick={handleLogout} 
            className="p-1 text-teal-200 hover:text-white rounded" 
            title="Sair"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Conteúdo Principal */}
      <main className="flex-1 p-4 max-w-md w-full mx-auto space-y-4">
        
        {/* Card de Sincronização */}
        <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className={`p-2 rounded-xl ${offlineQueue.length > 0 ? 'bg-amber-100 text-amber-700' : 'bg-teal-50 text-teal-700'}`}>
              <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
            </div>
            <div>
              <span className="text-xs font-extrabold text-slate-800 block leading-tight">
                {offlineQueue.length > 0 ? `${offlineQueue.length} coletas pendentes` : 'Tudo Sincronizado'}
              </span>
              <span className="text-[10px] text-slate-400">
                {offlineQueue.length > 0 ? 'Salvas no aparelho' : 'Base atualizada'}
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={handleSync}
            disabled={isSyncing}
            className="px-3.5 py-2 bg-teal-600 hover:bg-teal-700 disabled:opacity-40 text-white rounded-xl text-xs font-bold transition shadow-xs cursor-pointer active:scale-95"
          >
            {isSyncing ? 'Sincronizando...' : 'Sincronizar'}
          </button>
        </div>

        {/* Listagem de Formulários */}
        {!activeProject ? (
          <div className="space-y-3">
            <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Formulários Disponíveis ({allowedProjects.length})
            </h2>

            {allowedProjects.length === 0 ? (
              <div className="bg-white p-8 rounded-2xl border border-slate-200 text-center space-y-2">
                <Layers className="w-8 h-8 text-slate-300 mx-auto" />
                <p className="text-xs font-bold text-slate-700">Nenhum formulário encontrado</p>
                <p className="text-[11px] text-slate-400">
                  Crie formulários na Web e toque em "Sincronizar" acima.
                </p>
              </div>
            ) : (
              allowedProjects.map((proj) => (
                <div
                  key={proj.id}
                  onClick={() => {
                    setActiveProject(proj);
                    setFormData({});
                  }}
                  className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs hover:border-teal-400 cursor-pointer transition flex items-center justify-between active:scale-98"
                >
                  <div>
                    <h3 className="font-bold text-sm text-slate-900">{proj.name}</h3>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      {proj.fields?.length || 0} campos cadastrados
                    </p>
                  </div>
                  <span className="text-xs font-bold text-teal-600 bg-teal-50 px-2.5 py-1 rounded-lg">
                    Iniciar &rarr;
                  </span>
                </div>
              ))
            )}
          </div>
        ) : (
          /* Preenchimento do Formulário */
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
            <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold text-teal-700 uppercase tracking-widest bg-teal-50 px-2 py-0.5 rounded border border-teal-100">
                  Formulário Ativo
                </span>
                <h2 className="font-extrabold text-slate-900 text-sm mt-1">{activeProject.name}</h2>
              </div>
              <button
                type="button"
                onClick={() => setActiveProject(null)}
                className="text-xs text-slate-400 hover:text-slate-600 font-bold"
              >
                Voltar
              </button>
            </div>

            {activeProject.fields?.map((field: FormField) => (
              <div key={field.id} className="border-b border-slate-100 pb-3.5 last:border-0 last:pb-0">
                <DynamicField
                  field={field}
                  value={formData[field.id]}
                  allValues={formData}
                  onChange={(val: any) => setFormData((prev) => ({ ...prev, [field.id]: val }))}
                />
              </div>
            ))}

            <button
              type="button"
              onClick={handleSendForm}
              className="w-full mt-4 bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-600 hover:to-emerald-600 text-white font-extrabold py-3.5 rounded-xl text-xs uppercase tracking-wider transition shadow-md flex items-center justify-center gap-2 cursor-pointer active:scale-98"
            >
              <Send className="w-4 h-4" />
              Enviar Coleta
            </button>
          </div>
        )}
      </main>

      <footer className="py-3 text-center text-[10px] text-slate-400 bg-white border-t border-slate-200">
        NWS Coleta Mobile • Operador: {operatorName}
      </footer>
    </div>
  );
}