// src/components/CertificateConfigModal.tsx
'use client';

import React, { useState } from 'react';
import { FileText, Upload, Plus, Trash2, X, Check } from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface FieldMapItem {
  fieldKey: string;
  label: string;
  pageIndex: number;
  x: number;
  y: number;
  size: number;
}

interface CertificateConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  project: {
    id: string;
    name: string;
    fields?: Array<{ id: string; label: string; name?: string }>;
    certificate_template_url?: string;
    certificate_fields_map?: FieldMapItem[];
  } | null;
  onSaved: () => void;
}

export default function CertificateConfigModal({
  isOpen,
  onClose,
  project,
  onSaved
}: CertificateConfigModalProps) {
  if (!isOpen || !project) return null;

  const [pdfBase64, setPdfBase64] = useState<string>(project.certificate_template_url || '');
  const [fileName, setFileName] = useState<string>(project.certificate_template_url ? 'Modelo Cadastrado.pdf' : '');
  const [mappings, setMappings] = useState<FieldMapItem[]>(
    project.certificate_fields_map && project.certificate_fields_map.length > 0
      ? project.certificate_fields_map
      : [
          { fieldKey: 'operator', label: 'Nome do Operador', pageIndex: 0, x: 120, y: 650, size: 10 },
          { fieldKey: 'submitted_at', label: 'Data e Hora', pageIndex: 0, x: 120, y: 620, size: 10 },
          { fieldKey: 'id', label: 'Protocolo / ID', pageIndex: 0, x: 450, y: 750, size: 10 },
        ]
  );
  const [isSaving, setIsSaving] = useState(false);

  // Upload do PDF
  const handlePdfUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type !== 'application/pdf') {
      alert('Selecione apenas arquivos PDF.');
      return;
    }

    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = () => {
      setPdfBase64(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  // Adicionar novo mapeamento
  const handleAddMapping = () => {
    setMappings(prev => [
      ...prev,
      { fieldKey: '', label: 'Novo Campo', pageIndex: 0, x: 100, y: 500, size: 10 }
    ]);
  };

  // Remover mapeamento
  const handleRemoveMapping = (index: number) => {
    setMappings(prev => prev.filter((_, i) => i !== index));
  };

  // Salvar no banco Supabase
  const handleSave = async () => {
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('projects')
        .update({
          certificate_template_url: pdfBase64,
          certificate_fields_map: mappings
        })
        .eq('id', project.id);

      if (error) {
        alert(`Erro ao salvar: ${error.message}`);
      } else {
        alert('Modelo de Certificado vinculado com sucesso ao formulário!');
        onSaved();
        onClose();
      }
    } catch (err: any) {
      alert(`Erro: ${err.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white w-full max-w-3xl rounded-3xl shadow-2xl border border-slate-200 overflow-hidden my-6 space-y-5 p-6">
        
        {/* Cabeçalho */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-teal-50 text-teal-600 border border-teal-200 flex items-center justify-center">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-black text-slate-900 leading-tight">Configurar Certificado / Laudo em PDF</h2>
              <p className="text-xs text-slate-500">Formulário: <strong>{project.name}</strong></p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-full transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 1. Upload do Modelo PDF */}
        <div className="space-y-2">
          <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
            1. Arquivo PDF Modelo (Timbrado / Base Oficial)
          </label>
          
          <div className="border-2 border-dashed border-slate-200 rounded-2xl p-5 text-center bg-slate-50/50 hover:bg-teal-50/20 transition flex flex-col items-center justify-center gap-2">
            <Upload className="w-6 h-6 text-teal-600" />
            <div className="text-xs">
              <label className="font-bold text-teal-600 hover:text-teal-700 cursor-pointer underline">
                Clique aqui para selecionar o PDF
                <input
                  type="file"
                  accept="application/pdf"
                  onChange={handlePdfUpload}
                  className="hidden"
                />
              </label>
              <span className="text-slate-400 ml-1">do seu computador</span>
            </div>
            {fileName && (
              <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
                Arquivo Carregado: {fileName}
              </span>
            )}
          </div>
        </div>

        {/* 2. Mapeamento de Coordenadas dos Textos */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                2. Mapeamento de Posição dos Dados
              </label>
              <p className="text-[11px] text-slate-400">
                Defina em quais coordenadas (X e Y em pontos A4, onde 0,0 é o canto inferior esquerdo) cada dado será carimbado.
              </p>
            </div>
            <button
              onClick={handleAddMapping}
              className="flex items-center gap-1 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" /> Adicionar Campo
            </button>
          </div>

          <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
            {mappings.map((item, index) => (
              <div key={index} className="flex items-center gap-2 bg-slate-50 p-2.5 rounded-xl border border-slate-200 text-xs">
                <div className="flex-1">
                  <span className="text-[9px] font-bold text-slate-400 uppercase block">Campo / Chave</span>
                  <input
                    type="text"
                    placeholder="Ex: operator, id, ou nome do campo"
                    value={item.fieldKey}
                    onChange={(e) => {
                      const val = e.target.value;
                      setMappings(prev => prev.map((m, i) => i === index ? { ...m, fieldKey: val, label: val } : m));
                    }}
                    className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1 text-xs font-bold text-slate-800"
                  />
                </div>

                <div className="w-16">
                  <span className="text-[9px] font-bold text-slate-400 uppercase block">Pág. (0=1ª)</span>
                  <input
                    type="number"
                    value={item.pageIndex}
                    onChange={(e) => {
                      const val = Number(e.target.value);
                      setMappings(prev => prev.map((m, i) => i === index ? { ...m, pageIndex: val } : m));
                    }}
                    className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1 text-xs text-center"
                  />
                </div>

                <div className="w-20">
                  <span className="text-[9px] font-bold text-slate-400 uppercase block">Posição X</span>
                  <input
                    type="number"
                    value={item.x}
                    onChange={(e) => {
                      const val = Number(e.target.value);
                      setMappings(prev => prev.map((m, i) => i === index ? { ...m, x: val } : m));
                    }}
                    className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1 text-xs text-center"
                  />
                </div>

                <div className="w-20">
                  <span className="text-[9px] font-bold text-slate-400 uppercase block">Posição Y</span>
                  <input
                    type="number"
                    value={item.y}
                    onChange={(e) => {
                      const val = Number(e.target.value);
                      setMappings(prev => prev.map((m, i) => i === index ? { ...m, y: val } : m));
                    }}
                    className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1 text-xs text-center"
                  />
                </div>

                <div className="w-16">
                  <span className="text-[9px] font-bold text-slate-400 uppercase block">Fonte</span>
                  <input
                    type="number"
                    value={item.size}
                    onChange={(e) => {
                      const val = Number(e.target.value);
                      setMappings(prev => prev.map((m, i) => i === index ? { ...m, size: val } : m));
                    }}
                    className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1 text-xs text-center"
                  />
                </div>

                <button
                  onClick={() => handleRemoveMapping(index)}
                  className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition mt-3 cursor-pointer"
                  title="Remover Campo"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Rodapé de Ações */}
        <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition cursor-pointer"
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="px-5 py-2 bg-teal-500 hover:bg-teal-600 text-white font-extrabold text-xs rounded-xl transition flex items-center gap-1.5 shadow-sm cursor-pointer disabled:opacity-50"
          >
            <Check className="w-4 h-4" />
            <span>{isSaving ? 'Salvando...' : 'Salvar Configuração'}</span>
          </button>
        </div>

      </div>
    </div>
  );
}