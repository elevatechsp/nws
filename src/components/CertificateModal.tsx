// src/components/CertificateModal.tsx
'use client';

import React, { useState, useRef } from 'react';
import { 
  Award, Download, X, Edit3, 
  CheckCircle2, ShieldCheck, Building2, Calendar, User, Loader2
} from 'lucide-react';
import jsPDF from 'jspdf';
import { toPng } from 'html-to-image';

interface CertificateModalProps {
  isOpen: boolean;
  onClose: () => void;
  submission: {
    id: string;
    project_name: string;
    operator: string;
    company_name?: string;
    submitted_at: string;
    data: Record<string, any>;
    status?: string;
  } | null;
}

export default function CertificateModal({ isOpen, onClose, submission }: CertificateModalProps) {
  if (!isOpen || !submission) return null;

  const [certTitle, setCertTitle] = useState('CERTIFICADO DE CONFORMIDADE E COLETA TÉCNICA');
  const [certSubtitle, setCertSubtitle] = useState('COMPROVANTE OFICIAL DE INSPEÇÃO EM CAMPO');
  const [customNotes, setCustomNotes] = useState(
    'Certificamos para os devidos fins que as informações acima foram coletadas e validadas em campo seguindo os protocolos operacionais estabelecidos pela organização.'
  );
  const [signeeName, setSigneeName] = useState('Responsável Técnico / Validador');
  const [signeeRole, setSigneeRole] = useState('Departamento de Operações & Qualidade');
  const [isEditing, setIsEditing] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  const printRef = useRef<HTMLDivElement>(null);

  const handleDownloadPDF = async () => {
    if (!printRef.current) return;
    setIsExporting(true);

    try {
      const element = printRef.current;
      
      const imgData = await toPng(element, { 
        quality: 0.98,
        pixelRatio: 2,
        backgroundColor: '#ffffff'
      });

      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      const pdfWidth = pdf.internal.pageSize.getWidth();
      const imgProps = pdf.getImageProperties(imgData);
      const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;

      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`certificado_${submission.id}_${submission.project_name.toLowerCase().replace(/\s+/g, '_')}.pdf`);
    } catch (error: any) {
      console.error('Erro ao gerar PDF:', error);
      alert('Falha ao processar o arquivo PDF.');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto print:p-0 print:bg-white print:static">
      
      <div className="bg-white w-full max-w-4xl rounded-3xl shadow-2xl border border-slate-200 overflow-hidden my-8 flex flex-col max-h-[90vh] print:max-h-none print:shadow-none print:border-none print:rounded-none">
        
        {/* Barra de Ferramentas Superior */}
        <div className="bg-slate-900 text-white p-4 px-6 flex items-center justify-between border-b border-slate-800 print:hidden shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-teal-500/20 text-teal-400 flex items-center justify-center">
              <Award className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-black leading-none">Emissor de Certificado & Laudo</h3>
              <span className="text-[10px] text-slate-400">Protocolo: {submission.id}</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsEditing(!isEditing)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold border flex items-center gap-1.5 transition cursor-pointer ${
                isEditing 
                  ? 'bg-teal-500 text-white border-teal-400' 
                  : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
              }`}
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span>{isEditing ? 'Concluir Edição' : 'Editar Textos'}</span>
            </button>

            <button
              onClick={handleDownloadPDF}
              disabled={isExporting}
              className="px-3.5 py-1.5 bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-600 hover:to-emerald-600 text-white rounded-xl text-xs font-black shadow-sm flex items-center gap-1.5 transition cursor-pointer disabled:opacity-50"
            >
              {isExporting ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Download className="w-3.5 h-3.5" />
              )}
              <span>{isExporting ? 'Gerando...' : 'Baixar PDF'}</span>
            </button>

            <button
              onClick={onClose}
              className="p-1.5 rounded-xl bg-slate-800 text-slate-400 hover:text-white border border-slate-700 transition cursor-pointer ml-2"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Área do Certificado */}
        <div className="overflow-y-auto p-6 md:p-10 bg-slate-100 flex-1 print:p-0 print:bg-white print:overflow-visible">
          <div 
            ref={printRef}
            style={{ backgroundColor: '#ffffff' }}
            className="bg-white border-8 border-double border-slate-300 p-8 md:p-12 rounded-2xl space-y-8 print:border-4 print:border-slate-800 print:p-8"
          >
            
            {/* Cabeçalho */}
            <div className="text-center space-y-2 border-b-2 border-slate-100 pb-6">
              <div className="w-14 h-14 bg-teal-50 border border-teal-200 text-teal-600 rounded-2xl flex items-center justify-center mx-auto mb-2 print:border-teal-600">
                <ShieldCheck className="w-8 h-8" />
              </div>

              {isEditing ? (
                <div className="space-y-2 max-w-lg mx-auto">
                  <input
                    type="text"
                    value={certTitle}
                    onChange={(e) => setCertTitle(e.target.value)}
                    className="w-full text-center font-black text-lg text-slate-900 border border-teal-400 rounded-lg p-1"
                  />
                  <input
                    type="text"
                    value={certSubtitle}
                    onChange={(e) => setCertSubtitle(e.target.value)}
                    className="w-full text-center text-xs font-bold text-slate-500 border border-teal-400 rounded-lg p-1"
                  />
                </div>
              ) : (
                <>
                  <h1 className="text-xl md:text-2xl font-black tracking-tight text-slate-900 uppercase">
                    {certTitle}
                  </h1>
                  <p className="text-xs font-bold text-teal-700 tracking-widest uppercase">
                    {certSubtitle}
                  </p>
                </>
              )}
            </div>

            {/* Metadados */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase block">Empresa / Unidade</span>
                <span className="font-black text-slate-800 flex items-center gap-1 mt-0.5">
                  <Building2 className="w-3.5 h-3.5 text-teal-600" />
                  {submission.company_name || 'NWS Plataforma'}
                </span>
              </div>

              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase block">Operador Responsável</span>
                <span className="font-black text-slate-800 flex items-center gap-1 mt-0.5">
                  <User className="w-3.5 h-3.5 text-teal-600" />
                  {submission.operator}
                </span>
              </div>

              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase block">Data & Hora</span>
                <span className="font-black text-slate-800 flex items-center gap-1 mt-0.5">
                  <Calendar className="w-3.5 h-3.5 text-teal-600" />
                  {submission.submitted_at}
                </span>
              </div>

              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase block">Código Protocolo</span>
                <span className="font-mono font-black text-teal-700 mt-0.5 block">
                  #{submission.id}
                </span>
              </div>
            </div>

            {/* Respostas da Coleta */}
            <div className="space-y-3">
              <h4 className="text-xs font-black uppercase tracking-wider text-slate-500 border-b border-slate-200 pb-1">
                Atividade: {submission.project_name}
              </h4>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {Object.entries(submission.data || {}).map(([key, value]) => {
                  const rawString = typeof value === 'string' ? value.trim() : '';
                  
                  const isImage = 
                    rawString.includes('data:image/') || 
                    rawString.includes('base64') ||
                    rawString.startsWith('/9j/') || 
                    /\.(jpeg|jpg|gif|png|webp)($|\?)/i.test(rawString);

                  let imageSrc = rawString;
                  if (isImage) {
                    if (rawString.includes('/9j/')) {
                      imageSrc = 'data:image/jpeg;base64,' + rawString.substring(rawString.indexOf('/9j/'));
                    } else if (rawString.includes('base64,')) {
                      imageSrc = 'data:image/jpeg;base64,' + rawString.split('base64,')[1];
                    }
                  }

                  return (
                    <div 
                      key={key} 
                      className={`p-3 bg-slate-50 rounded-xl border border-slate-200 flex flex-col justify-between ${
                        isImage ? 'col-span-full' : ''
                      }`}
                    >
                      <span className="text-[10px] font-bold text-slate-400 uppercase">{key}</span>
                      
                      <div className="mt-1">
                        {isImage ? (
                          <div className="flex flex-col items-center justify-center p-3 bg-white rounded-xl border border-slate-200">
                            <img 
                              src={imageSrc} 
                              alt={key} 
                              crossOrigin="anonymous"
                              className="max-h-72 max-w-full rounded-lg object-contain border border-slate-200" 
                            />
                            <span className="text-[10px] text-slate-400 font-semibold mt-2">
                              Registro Fotográfico Anexo
                            </span>
                          </div>
                        ) : (
                          <span className="text-xs font-bold text-slate-800">
                            {typeof value === 'boolean' 
                              ? (value ? 'Sim / Conforme' : 'Não / Não Conforme') 
                              : String(value ?? '-')}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Termo de Conformidade */}
            <div className="space-y-2 pt-2">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Termo de Conformidade & Laudo
              </span>
              {isEditing ? (
                <textarea
                  rows={3}
                  value={customNotes}
                  onChange={(e) => setCustomNotes(e.target.value)}
                  className="w-full text-xs text-slate-600 border border-teal-400 rounded-xl p-2.5 leading-relaxed"
                />
              ) : (
                <p className="text-xs text-slate-600 leading-relaxed bg-slate-50 p-3 rounded-xl border border-dashed border-slate-200">
                  {customNotes}
                </p>
              )}
            </div>

            {/* Assinaturas */}
            <div className="pt-8 border-t border-slate-200 grid grid-cols-2 gap-8 text-center">
              <div className="space-y-1">
                <div className="h-10 border-b border-slate-400 flex items-end justify-center pb-1">
                  <span className="font-serif italic text-sm text-slate-800">{submission.operator}</span>
                </div>
                <span className="text-[11px] font-black text-slate-800 block">Operador de Coleta</span>
                <span className="text-[10px] text-slate-400 block">{submission.company_name}</span>
              </div>

              <div className="space-y-1">
                <div className="h-10 border-b border-slate-400 flex items-end justify-center pb-1">
                  {isEditing ? (
                    <input
                      type="text"
                      value={signeeName}
                      onChange={(e) => setSigneeName(e.target.value)}
                      className="text-center font-serif italic text-xs border border-teal-400 rounded px-1"
                    />
                  ) : (
                    <span className="font-serif italic text-sm text-slate-800">{signeeName}</span>
                  )}
                </div>
                <span className="text-[11px] font-black text-slate-800 block">
                  {isEditing ? (
                    <input
                      type="text"
                      value={signeeRole}
                      onChange={(e) => setSigneeRole(e.target.value)}
                      className="text-center text-[10px] border border-teal-400 rounded px-1 w-full"
                    />
                  ) : (
                    signeeRole
                  )}
                </span>
                <span className="text-[10px] text-teal-600 font-bold flex items-center justify-center gap-1">
                  <CheckCircle2 className="w-3 h-3" /> Assinado Digitalmente
                </span>
              </div>
            </div>

          </div>
        </div>

      </div>
    </div>
  );
}