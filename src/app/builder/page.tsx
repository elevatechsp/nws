// src/app/builder/page.tsx
'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { 
  ArrowLeft, Plus, Trash2, Settings, Save, 
  Type, AlignLeft, Hash, Calendar, Camera, PenTool, 
  QrCode, List, ChevronDown, Database, Radio, GitCommit,
  ScanText, Code2, Layers, Video, PlusCircle, CreditCard, 
  MapPin, Mail, Image as ImageIcon, CheckCircle2, 
  ArrowRight, Check, FileCode, Palette, Terminal
} from 'lucide-react';
import { FormField, FieldType, Project } from '@/types/project';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';

const AVAILABLE_FIELD_TYPES: { type: FieldType; label: string; icon: React.ComponentType<{ className?: string }>; category: 'essential' | 'oh' }[] = [
  { type: 'text_short', label: 'Texto Curto', icon: Type, category: 'essential' },
  { type: 'text_long', label: 'Texto Longo', icon: AlignLeft, category: 'essential' },
  { type: 'number', label: 'Numérico', icon: Hash, category: 'essential' },
  { type: 'number_stepper', label: 'Numérico (+ / -)', icon: PlusCircle, category: 'oh' },
  { type: 'date', label: 'Data', icon: Calendar, category: 'essential' },
  { type: 'email', label: 'E-mail', icon: Mail, category: 'oh' },
  { type: 'masked_id', label: 'CPF / CNPJ / Tel', icon: CreditCard, category: 'oh' },
  { type: 'photo', label: 'Foto / Câmera', icon: Camera, category: 'essential' },
  { type: 'signature', label: 'Assinatura Digital', icon: PenTool, category: 'essential' },
  { type: 'barcode_qr', label: 'QR / Código de Barras', icon: QrCode, category: 'essential' },
  { type: 'item_list', label: 'Lista Dinâmica (itemList)', icon: List, category: 'essential' },
  { type: 'dropdown_internal', label: 'Dropdown Interno', icon: ChevronDown, category: 'essential' },
  { type: 'dropdown_external', label: 'Dropdown Externo (Tabela)', icon: Database, category: 'essential' },
  { type: 'radio', label: 'Radio Button', icon: Radio, category: 'essential' },
  { type: 'events_chain', label: 'Cadeia de Eventos', icon: GitCommit, category: 'essential' },
  { type: 'ocr', label: 'Leitura OCR (Texto na Foto)', icon: ScanText, category: 'oh' },
  { type: 'high_volume_list', label: 'Lista Alta Volumetria', icon: Layers, category: 'oh' },
  { type: 'video', label: 'Vídeo Evidência', icon: Video, category: 'oh' },
  { type: 'address_geo', label: 'Endereço GPS Automático', icon: MapPin, category: 'oh' },
  { type: 'canvas_draw', label: 'Desenho / Blueprint PNG', icon: ImageIcon, category: 'oh' },
  { type: 'custom_code', label: '100% Programável (HTML/CSS/JS)', icon: Code2, category: 'oh' },
];

function BuilderContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const editProjectId = searchParams.get('id');
  const { user } = useAuth();

  const [currentStep, setCurrentStep] = useState<number>(1);
  const [isSaving, setIsSaving] = useState(false);

  // Etapa 1: Dados Gerais
  const [projectName, setProjectName] = useState('Novo Projeto de Coleta');
  const [projectDescription, setProjectDescription] = useState('');
  const [category, setCategory] = useState('Auditoria & Inspeção');
  const [version, setVersion] = useState('1.0.0');
  const [requireGpsGeneral, setRequireGpsGeneral] = useState(true);
  const [allowOfflineDraft, setAllowOfflineDraft] = useState(true);

  // Etapa 2: Campos do Formulário
  const [fields, setFields] = useState<FormField[]>([]);
  const [selectedFieldId, setSelectedFieldId] = useState<string | null>(null);
  const [activeCodeTab, setActiveCodeTab] = useState<'html' | 'css' | 'js'>('html');

  // Carregar dados existentes do Supabase se for modo de edição
  useEffect(() => {
    if (editProjectId) {
      const loadEditData = async () => {
        try {
          const { data, error } = await supabase
            .from('projects')
            .select('*')
            .eq('id', editProjectId)
            .single();

          if (data && !error) {
            setProjectName(data.name || '');
            setProjectDescription(data.description || '');
            setVersion(data.version || '1.0.0');
            setFields(data.fields || []);
            if (data.fields && data.fields.length > 0) {
              setSelectedFieldId(data.fields[0].id);
            }
          }
        } catch (err) {
          console.error('Erro ao carregar projeto para edição:', err);
        }
      };
      loadEditData();
    }
  }, [editProjectId]);

  const selectedField = fields.find(f => f.id === selectedFieldId);

  // Adicionar campo ao formulário
  const handleAddField = (type: FieldType, label: string) => {
    const defaultOptions = 
      type === 'radio' ? ['Conforme', 'Não Conforme', 'Não se Aplica'] :
      type === 'dropdown_external' ? ['Equipamento NWS #101', 'Equipamento NWS #102', 'Equipamento NWS #103'] :
      ['Opção 1', 'Opção 2', 'Opção 3'];

    const defaultCustomHtml = `
<div class="custom-card">
  <label class="custom-label">Cálculo de Área e Volume Customizado</label>
  <div class="custom-flex">
    <input type="number" id="largura" placeholder="Largura (m)" class="custom-input" />
    <input type="number" id="comprimento" placeholder="Comprimento (m)" class="custom-input" />
  </div>
  <div id="resultado" class="custom-result">Resultado: 0.00 m²</div>
</div>
`.trim();

    const defaultCustomCss = `
.custom-card {
  background: #f0fdfa;
  border: 1.5px solid #5eead4;
  border-radius: 12px;
  padding: 14px;
}
.custom-label {
  display: block;
  font-size: 11px;
  font-weight: 800;
  color: #0f766e;
  margin-bottom: 8px;
  text-transform: uppercase;
}
.custom-flex {
  display: flex;
  gap: 8px;
}
.custom-input {
  flex: 1;
  padding: 8px 10px;
  font-size: 12px;
  border: 1px solid #99f6e4;
  border-radius: 8px;
  outline: none;
  background: #ffffff;
}
.custom-input:focus {
  border-color: #0d9488;
}
.custom-result {
  margin-top: 10px;
  font-weight: 800;
  font-size: 12px;
  color: #115e59;
}
`.trim();

    const defaultCustomJs = `
const inpL = container.querySelector('#largura');
const inpC = container.querySelector('#comprimento');
const res = container.querySelector('#resultado');

function calcular() {
  const l = parseFloat(inpL.value) || 0;
  const c = parseFloat(inpC.value) || 0;
  const area = (l * c).toFixed(2);
  res.innerText = 'Resultado: ' + area + ' m²';
  setFieldValue(area + ' m²');
}

inpL.addEventListener('input', calcular);
inpC.addEventListener('input', calcular);
`.trim();

    const newField: FormField = {
      id: `f_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      type,
      label: `Novo ${label}`,
      placeholder: '',
      required: false,
      readOnly: false,
      autoSaveTrigger: false,
      captureGeoLocation: type === 'address_geo',
      options: defaultOptions,
      customHtml: type === 'custom_code' ? defaultCustomHtml : undefined,
      customCss: type === 'custom_code' ? defaultCustomCss : undefined,
      customJs: type === 'custom_code' ? defaultCustomJs : undefined,
    };

    setFields([...fields, newField]);
    setSelectedFieldId(newField.id);
  };

  const handleRemoveField = (id: string) => {
    const updated = fields.filter(f => f.id !== id);
    setFields(updated);
    if (selectedFieldId === id) {
      setSelectedFieldId(updated.length > 0 ? updated[updated.length - 1].id : null);
    }
  };

  const handleUpdateField = (key: keyof FormField, value: any) => {
    if (!selectedFieldId) return;
    setFields(fields.map(f => f.id === selectedFieldId ? { ...f, [key]: value } : f));
  };

  // Salvar Projeto com Autoria e Isolamento
  const handleSaveProject = async () => {
    if (!projectName.trim()) {
      alert('Por favor, informe o nome do projeto.');
      setCurrentStep(1);
      return;
    }

    if (fields.length === 0) {
      alert('Adicione pelo menos 1 campo ao formulário na Etapa 2.');
      setCurrentStep(2);
      return;
    }

    setIsSaving(true);
    const projectId = editProjectId || `PRJ-${Math.floor(1000 + Math.random() * 9000)}`;

    let activeUser: any = user;
    if (!activeUser) {
      const saved = localStorage.getItem('nws_auth_session') || localStorage.getItem('nws_current_session');
      if (saved) {
        try { activeUser = JSON.parse(saved); } catch {}
      }
    }

    const payload = {
      id: projectId,
      name: projectName.trim(),
      description: projectDescription.trim(),
      fields,
      status: 'active',
      tenant_id: activeUser?.tenantId || 'NWS_DEFAULT',
      company_name: activeUser?.companyName || 'NWS Plataforma',
      created_by_user_id: activeUser?.id || 'USR-ADMIN',
      created_by_name: activeUser?.name || 'Administrador NWS',
      updated_at: new Date().toISOString(),
      ...(editProjectId ? {} : { created_at: new Date().toISOString() })
    };

    try {
      const { error } = await supabase
        .from('projects')
        .upsert([payload]);

      if (error) {
        alert(`Erro ao publicar no Supabase: ${error.message}`);
      } else {
        alert(`Projeto "${projectName}" salvo e publicado com sucesso no Supabase!`);
        router.push('/projects');
      }
    } catch (err: any) {
      alert(`Erro de conexão: ${err.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      {/* Header com Navegação de Etapas */}
      <header className="bg-white border-b border-slate-200 px-6 h-16 flex items-center justify-between sticky top-0 z-30 shadow-2xs">
        <div className="flex items-center gap-4">
          <Link href="/projects" className="p-2 hover:bg-slate-100 rounded-lg text-slate-600 transition">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="font-extrabold text-slate-900 text-sm md:text-base leading-tight">
              {projectName || 'Sem título'}
            </h1>
            <p className="text-[11px] text-slate-400">
              {editProjectId ? 'Editando Sistema Existente' : 'Criando Novo Sistema de Coleta'} • Empresa: <strong className="text-teal-700">{user?.companyName || 'NWS Plataforma'}</strong>
            </p>
          </div>
        </div>

        {/* Stepper Superior */}
        <div className="hidden md:flex items-center gap-3">
          {[
            { step: 1, label: '1. Informações Iniciais' },
            { step: 2, label: '2. Desenvolvimento dos Campos' },
            { step: 3, label: '3. Revisão & Publicação' },
          ].map((item) => (
            <button
              key={item.step}
              onClick={() => setCurrentStep(item.step)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                currentStep === item.step
                  ? 'bg-teal-50 text-teal-800 border border-teal-300 shadow-2xs'
                  : currentStep > item.step
                  ? 'text-emerald-700 bg-emerald-50/50'
                  : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${
                currentStep === item.step
                  ? 'bg-teal-600 text-white'
                  : currentStep > item.step
                  ? 'bg-emerald-500 text-white'
                  : 'bg-slate-200 text-slate-600'
              }`}>
                {currentStep > item.step ? <Check className="w-3 h-3" /> : item.step}
              </span>
              {item.label}
            </button>
          ))}
        </div>

        {/* Botões de Ação Topo */}
        <div className="flex items-center gap-2">
          {currentStep > 1 && (
            <button
              onClick={() => setCurrentStep(prev => prev - 1)}
              className="px-3 py-1.5 border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-semibold transition cursor-pointer"
            >
              Voltar
            </button>
          )}

          {currentStep < 3 ? (
            <button
              onClick={() => setCurrentStep(prev => prev + 1)}
              className="flex items-center gap-1.5 bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-600 hover:to-emerald-600 text-white px-4 py-1.5 rounded-lg text-xs font-bold transition shadow-xs cursor-pointer"
            >
              Próxima Etapa
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          ) : (
            <button
              onClick={handleSaveProject}
              disabled={isSaving}
              className="flex items-center gap-1.5 bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-600 hover:to-emerald-600 disabled:opacity-50 text-white px-4 py-1.5 rounded-lg text-xs font-bold transition shadow-xs cursor-pointer"
            >
              <Save className="w-3.5 h-3.5" />
              {isSaving ? 'Salvando...' : 'Salvar & Publicar'}
            </button>
          )}
        </div>
      </header>

      {/* ========================================================================= */}
      {/* ETAPA 1: DEFINIÇÕES INICIAIS                                              */}
      {/* ========================================================================= */}
      {currentStep === 1 && (
        <main className="flex-1 max-w-3xl w-full mx-auto p-6 md:p-10 space-y-6">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-5">
            <div className="border-b border-slate-100 pb-4">
              <span className="text-[10px] font-bold text-teal-600 uppercase tracking-widest bg-teal-50 px-2.5 py-1 rounded-full border border-teal-100">
                Passo 1 de 3
              </span>
              <h2 className="text-xl font-extrabold text-slate-900 mt-2">Identificação & Configurações Gerais</h2>
              <p className="text-xs text-slate-500">
                Defina o nome, objetivo e os parâmetros de campo para a empresa <strong className="text-teal-700">{user?.companyName || 'NWS Plataforma'}</strong>.
              </p>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1.5">
                Nome do Sistema / Formulário <span className="text-rose-500">*</span>
              </label>
              <input 
                type="text"
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
                placeholder="Ex: Auditoria de Segurança Predial"
                className="w-full text-xs p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-teal-500 focus:bg-white focus:outline-none font-medium text-slate-900"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1.5">Descrição do Objetivo</label>
              <textarea 
                rows={3}
                value={projectDescription}
                onChange={(e) => setProjectDescription(e.target.value)}
                placeholder="Explique resumidamente o objetivo desta coleta..."
                className="w-full text-xs p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-teal-500 focus:bg-white focus:outline-none font-medium text-slate-900"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1.5">Categoria</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full text-xs p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-teal-500 focus:bg-white text-slate-700 font-medium"
                >
                  <option value="Auditoria & Inspeção">Auditoria & Inspeção</option>
                  <option value="Manutenção de Equipamentos">Manutenção de Equipamentos</option>
                  <option value="Controle de Estoque & Materiais">Controle de Estoque & Materiais</option>
                  <option value="Cadastro de Clientes / Fornecedores">Cadastro de Clientes / Fornecedores</option>
                  <option value="Checklist Operacional de Campo">Checklist Operacional de Campo</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1.5">Versão Inicial</label>
                <input 
                  type="text"
                  value={version}
                  onChange={(e) => setVersion(e.target.value)}
                  placeholder="1.0.0"
                  className="w-full text-xs p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-teal-500 focus:bg-white font-mono"
                />
              </div>
            </div>

            <div className="border-t border-slate-100 pt-5 space-y-3">
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-2">Regras de Operação em Campo</h3>

              <label className="flex items-start gap-3 p-3 bg-slate-50/70 border border-slate-200/80 rounded-xl cursor-pointer hover:bg-slate-50 transition">
                <input 
                  type="checkbox"
                  checked={requireGpsGeneral}
                  onChange={(e) => setRequireGpsGeneral(e.target.checked)}
                  className="mt-0.5 rounded border-slate-300 text-teal-600 focus:ring-teal-500"
                />
                <div>
                  <span className="text-xs font-bold text-slate-800 block">Exigir carimbo GPS na submissão</span>
                  <span className="text-[11px] text-slate-500">Registra latitude e longitude no envio de cada coleta.</span>
                </div>
              </label>

              <label className="flex items-start gap-3 p-3 bg-slate-50/70 border border-slate-200/80 rounded-xl cursor-pointer hover:bg-slate-50 transition">
                <input 
                  type="checkbox"
                  checked={allowOfflineDraft}
                  onChange={(e) => setAllowOfflineDraft(e.target.checked)}
                  className="mt-0.5 rounded border-slate-300 text-teal-600 focus:ring-teal-500"
                />
                <div>
                  <span className="text-xs font-bold text-slate-800 block">Permitir Rascunhos Offline & Auto-save</span>
                  <span className="text-[11px] text-slate-500">Permite ao operador salvar rascunhos sem conexão com a internet.</span>
                </div>
              </label>
            </div>

            <div className="pt-4 flex justify-end">
              <button
                onClick={() => setCurrentStep(2)}
                className="flex items-center gap-2 bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-600 hover:to-emerald-600 text-white px-6 py-2.5 rounded-xl text-xs font-bold transition shadow-xs cursor-pointer"
              >
                Prosseguir para o Desenvolvimento dos Campos
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </main>
      )}

      {/* ========================================================================= */}
      {/* ETAPA 2: DESENVOLVIMENTO DOS CAMPOS (PALETA + CANVAS + PROPRIEDADES)       */}
      {/* ========================================================================= */}
      {currentStep === 2 && (
        <div className="flex-1 flex overflow-hidden">
          {/* PALETA ESQUERDA */}
          <aside className="w-80 bg-white border-r border-slate-200 p-4 overflow-y-auto shrink-0">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Campos Essenciais</h3>
            <div className="grid grid-cols-2 gap-2 mb-6">
              {AVAILABLE_FIELD_TYPES.filter(f => f.category === 'essential').map((f) => {
                const Icon = f.icon;
                return (
                  <button
                    key={f.type}
                    onClick={() => handleAddField(f.type, f.label)}
                    className="flex flex-col items-center justify-center p-3 text-center border border-slate-200 rounded-lg hover:border-teal-500 hover:bg-teal-50/50 transition group bg-white text-slate-700 shadow-2xs cursor-pointer"
                  >
                    <Icon className="w-5 h-5 text-slate-500 group-hover:text-teal-600 mb-1.5" />
                    <span className="text-[11px] font-medium leading-tight">{f.label}</span>
                  </button>
                );
              })}
            </div>

            <h3 className="text-xs font-bold text-teal-600 uppercase tracking-wider mb-3">Campos Avançados</h3>
            <div className="grid grid-cols-2 gap-2">
              {AVAILABLE_FIELD_TYPES.filter(f => f.category === 'oh').map((f) => {
                const Icon = f.icon;
                return (
                  <button
                    key={f.type}
                    onClick={() => handleAddField(f.type, f.label)}
                    className="flex flex-col items-center justify-center p-3 text-center border border-teal-100 rounded-lg hover:border-teal-500 hover:bg-teal-50/50 transition group bg-teal-50/20 text-slate-700 shadow-2xs cursor-pointer"
                  >
                    <Icon className="w-5 h-5 text-teal-600 group-hover:text-teal-700 mb-1.5" />
                    <span className="text-[11px] font-medium leading-tight">{f.label}</span>
                  </button>
                );
              })}
            </div>
          </aside>

          {/* CANVAS CENTRAL COM PREVIEW LIVE */}
          <main className="flex-1 p-8 overflow-y-auto flex justify-center bg-slate-100">
            <div className="w-full max-w-2xl bg-white rounded-2xl shadow-sm border border-slate-200 p-8 min-h-[600px] flex flex-col">
              <div className="border-b border-slate-100 pb-4 mb-6 flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-extrabold text-slate-900">{projectName}</h2>
                  <p className="text-xs text-slate-400 mt-0.5">{fields.length} campos estruturados</p>
                </div>
                <button
                  onClick={() => setCurrentStep(3)}
                  className="text-xs font-bold text-teal-700 bg-teal-50 border border-teal-200 px-3 py-1.5 rounded-lg hover:bg-teal-100 transition cursor-pointer"
                >
                  Avançar para Revisão &rarr;
                </button>
              </div>

              {fields.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center border-2 border-dashed border-slate-200 rounded-xl p-12 text-slate-400">
                  <Plus className="w-10 h-10 mb-2 opacity-40 text-teal-600" />
                  <p className="text-sm font-semibold text-slate-700">Nenhum campo adicionado</p>
                  <p className="text-xs mt-1 text-center max-w-sm">
                    Clique nos botões da paleta lateral esquerda para montar os blocos de coleta do seu formulário.
                  </p>
                </div>
              ) : (
                <div className="space-y-3 flex-1">
                  {fields.map((field, idx) => (
                    <div
                      key={field.id}
                      onClick={() => setSelectedFieldId(field.id)}
                      className={`p-4 rounded-xl border transition cursor-pointer relative group ${
                        selectedFieldId === field.id 
                          ? 'border-teal-500 bg-teal-50/20 ring-2 ring-teal-500/20 shadow-xs' 
                          : 'border-slate-200 hover:border-slate-300 bg-white'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-slate-400">#{idx + 1}</span>
                          <span className="text-xs font-bold text-slate-800">
                            {field.label} {field.required && <span className="text-rose-500">*</span>}
                          </span>
                        </div>
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRemoveField(field.id);
                          }}
                          className="text-slate-400 hover:text-rose-500 p-1 opacity-0 group-hover:opacity-100 transition cursor-pointer"
                          title="Excluir Campo"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>

                      {field.type === 'custom_code' ? (
                        <div className="mt-2 border border-slate-200 rounded-lg p-3 bg-white">
                          <style dangerouslySetInnerHTML={{ __html: field.customCss || '' }} />
                          <div dangerouslySetInnerHTML={{ __html: field.customHtml || '<p>Sem HTML configurado</p>' }} />
                        </div>
                      ) : (
                        <div className="text-xs text-slate-500 bg-slate-50 p-2.5 rounded-lg border border-slate-100 flex items-center justify-between">
                          <span>Componente: <strong className="text-slate-700">{field.type}</strong></span>
                          {field.options && field.options.length > 0 && (
                            <span className="text-[10px] text-teal-700 bg-teal-50 px-2 py-0.5 rounded font-bold">
                              {field.options.length} opções configuradas
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </main>

          {/* PAINEL DE PROPRIEDADES DIREITA COM EDITOR HTML/CSS/JS */}
          <aside className="w-96 bg-white border-l border-slate-200 p-5 overflow-y-auto shrink-0">
            {selectedField ? (
              <div className="space-y-4">
                <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                  <Settings className="w-4 h-4 text-teal-600" />
                  <h3 className="text-sm font-bold text-slate-800">Propriedades do Campo</h3>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Rótulo / Nome do Campo</label>
                  <input 
                    type="text" 
                    value={selectedField.label} 
                    onChange={(e) => handleUpdateField('label', e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 font-medium"
                  />
                </div>

                {/* EDITOR LIVE DE HTML, CSS E JAVASCRIPT */}
                {selectedField.type === 'custom_code' && (
                  <div className="pt-3 border-t border-slate-100 space-y-3">
                    <label className="text-xs font-extrabold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                      <Code2 className="w-4 h-4 text-teal-600" /> Código do Componente
                    </label>

                    <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg">
                      <button
                        type="button"
                        onClick={() => setActiveCodeTab('html')}
                        className={`flex-1 py-1 text-xs font-bold rounded-md flex items-center justify-center gap-1 transition cursor-pointer ${
                          activeCodeTab === 'html' ? 'bg-white text-teal-700 shadow-2xs' : 'text-slate-500 hover:text-slate-800'
                        }`}
                      >
                        <FileCode className="w-3.5 h-3.5" /> HTML
                      </button>
                      <button
                        type="button"
                        onClick={() => setActiveCodeTab('css')}
                        className={`flex-1 py-1 text-xs font-bold rounded-md flex items-center justify-center gap-1 transition cursor-pointer ${
                          activeCodeTab === 'css' ? 'bg-white text-teal-700 shadow-2xs' : 'text-slate-500 hover:text-slate-800'
                        }`}
                      >
                        <Palette className="w-3.5 h-3.5" /> CSS
                      </button>
                      <button
                        type="button"
                        onClick={() => setActiveCodeTab('js')}
                        className={`flex-1 py-1 text-xs font-bold rounded-md flex items-center justify-center gap-1 transition cursor-pointer ${
                          activeCodeTab === 'js' ? 'bg-white text-teal-700 shadow-2xs' : 'text-slate-500 hover:text-slate-800'
                        }`}
                      >
                        <Terminal className="w-3.5 h-3.5" /> JS
                      </button>
                    </div>

                    {activeCodeTab === 'html' && (
                      <textarea
                        rows={10}
                        value={selectedField.customHtml || ''}
                        onChange={(e) => handleUpdateField('customHtml', e.target.value)}
                        className="w-full text-xs font-mono p-3 bg-slate-900 text-teal-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500"
                      />
                    )}
                    {activeCodeTab === 'css' && (
                      <textarea
                        rows={10}
                        value={selectedField.customCss || ''}
                        onChange={(e) => handleUpdateField('customCss', e.target.value)}
                        className="w-full text-xs font-mono p-3 bg-slate-900 text-amber-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500"
                      />
                    )}
                    {activeCodeTab === 'js' && (
                      <textarea
                        rows={10}
                        value={selectedField.customJs || ''}
                        onChange={(e) => handleUpdateField('customJs', e.target.value)}
                        className="w-full text-xs font-mono p-3 bg-slate-900 text-emerald-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500"
                      />
                    )}
                  </div>
                )}

                {(selectedField.type === 'dropdown_internal' || 
                  selectedField.type === 'dropdown_external' || 
                  selectedField.type === 'radio' || 
                  selectedField.type === 'high_volume_list') && (
                  <div className="pt-3 border-t border-slate-100">
                    <label className="text-xs font-bold text-slate-700 block mb-1">
                      Opções (Separadas por vírgula)
                    </label>
                    <textarea
                      rows={3}
                      value={(selectedField.options || []).join(', ')}
                      onChange={(e) => {
                        const opts = e.target.value.split(',').map(s => s.trim()).filter(Boolean);
                        handleUpdateField('options', opts);
                      }}
                      className="w-full text-xs p-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 font-medium"
                    />
                  </div>
                )}

                <div className="space-y-2 pt-3 border-t border-slate-100">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input 
                      type="checkbox"
                      checked={selectedField.required}
                      onChange={(e) => handleUpdateField('required', e.target.checked)}
                      className="rounded border-slate-300 text-teal-600 focus:ring-teal-500"
                    />
                    <span className="text-xs font-medium text-slate-700">Campo Obrigatório</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input 
                      type="checkbox"
                      checked={selectedField.readOnly}
                      onChange={(e) => handleUpdateField('readOnly', e.target.checked)}
                      className="rounded border-slate-300 text-teal-600 focus:ring-teal-500"
                    />
                    <span className="text-xs font-medium text-slate-700">Apenas Leitura</span>
                  </label>
                </div>

                <div className="pt-4 border-t border-slate-100 flex justify-between items-center">
                  <button
                    type="button"
                    onClick={() => handleRemoveField(selectedField.id)}
                    className="text-xs text-rose-600 hover:text-rose-700 font-semibold flex items-center gap-1 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" /> Excluir Campo
                  </button>
                </div>
              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-center text-slate-400">
                <Settings className="w-8 h-8 mb-2 opacity-30" />
                <p className="text-xs font-medium">Nenhum campo selecionado</p>
                <p className="text-[11px] mt-1">Clique em um bloco central para editar suas propriedades.</p>
              </div>
            )}
          </aside>
        </div>
      )}

      {/* ========================================================================= */}
      {/* ETAPA 3: REVISÃO & PUBLICAÇÃO                                             */}
      {/* ========================================================================= */}
      {currentStep === 3 && (
        <main className="flex-1 max-w-3xl w-full mx-auto p-6 md:p-10 space-y-6">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-6">
            <div className="border-b border-slate-100 pb-4">
              <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-100">
                Passo 3 de 3 • Finalização
              </span>
              <h2 className="text-xl font-extrabold text-slate-900 mt-2">Revisão Final do Sistema</h2>
              <p className="text-xs text-slate-500">
                Este formulário será publicado para a empresa <strong className="text-teal-700">{user?.companyName || 'NWS Plataforma'}</strong>.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
              <div>
                <span className="text-[11px] text-slate-400 block font-medium">Empresa</span>
                <strong className="text-xs text-slate-800">{user?.companyName || 'NWS Plataforma'}</strong>
              </div>
              <div>
                <span className="text-[11px] text-slate-400 block font-medium">Criador</span>
                <strong className="text-xs text-slate-800">{user?.name || 'Administrador'}</strong>
              </div>
              <div>
                <span className="text-[11px] text-slate-400 block font-medium">Total de Campos</span>
                <strong className="text-xs text-teal-700 font-bold">{fields.length} campos</strong>
              </div>
            </div>

            <div className="pt-4 flex items-center justify-between border-t border-slate-100">
              <button
                onClick={() => setCurrentStep(2)}
                className="px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-semibold transition cursor-pointer"
              >
                &larr; Voltar e Ajustar Campos
              </button>

              <button
                onClick={handleSaveProject}
                disabled={isSaving}
                className="flex items-center gap-2 bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-600 hover:to-emerald-600 disabled:opacity-50 text-white px-6 py-2.5 rounded-xl text-xs font-bold transition shadow-md shadow-teal-500/20 cursor-pointer"
              >
                <CheckCircle2 className="w-4 h-4" />
                {isSaving ? 'Salvando no Supabase...' : 'Confirmar & Publicar para Minha Empresa'}
              </button>
            </div>
          </div>
        </main>
      )}
    </div>
  );
}

export default function FormBuilderPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-xs text-slate-400">Carregando Construtor...</div>}>
      <BuilderContent />
    </Suspense>
  );
}