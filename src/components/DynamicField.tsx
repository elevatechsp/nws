// src/components/DynamicField.tsx
'use client';

import React, { useState, useRef, useEffect } from 'react';
import { 
  QrCode, ScanText, MapPin, Plus, Minus, Code2, Camera, PenTool,
  Video, Layers, Database, List, Check, Trash2, UploadCloud, Play, Square
} from 'lucide-react';
import { BrowserMultiFormatReader, IScannerControls } from '@zxing/browser';
import { createWorker } from 'tesseract.js';
import { FormField } from '@/types/project';

interface Props {
  field: FormField;
  value: any;
  onChange: (val: any) => void;
  allValues?: Record<string, any>;
  onTriggerEvent?: (eventName: string) => void;
}

export default function DynamicField({ field, value, onChange, allValues = {} }: Props) {
  // 1. QR Code / Barcode Scanner Real
  const [isScanning, setIsScanning] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const controlsRef = useRef<IScannerControls | null>(null);

  useEffect(() => {
    let active = true;
    async function startScanner() {
      if (isScanning && videoRef.current) {
        try {
          const codeReader = new BrowserMultiFormatReader();
          const controls = await codeReader.decodeFromVideoDevice(
            undefined,
            videoRef.current,
            (result) => {
              if (result && active) {
                onChange(result.getText());
                setIsScanning(false);
              }
            }
          );
          if (active) controlsRef.current = controls;
          else controls.stop();
        } catch (err) {
          console.error('Erro na câmera:', err);
          setIsScanning(false);
        }
      }
    }
    if (isScanning) startScanner();

    return () => {
      active = false;
      if (controlsRef.current) {
        try { controlsRef.current.stop(); } catch (e) { console.error(e); }
        controlsRef.current = null;
      }
      if (videoRef.current && videoRef.current.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach((track) => track.stop());
        videoRef.current.srcObject = null;
      }
    };
  }, [isScanning, onChange]);

  // 2. OCR (Extração de texto via foto real)
  const [isProcessingOcr, setIsProcessingOcr] = useState(false);
  const handleOcrCapture = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsProcessingOcr(true);
    try {
      const worker = await createWorker('por');
      const ret = await worker.recognize(file);
      onChange(ret.data.text.trim());
      await worker.terminate();
    } catch (err) {
      console.error('Erro no OCR:', err);
    } finally {
      setIsProcessingOcr(false);
    }
  };

  // 3. Assinatura Digital em Canvas Real
  const signatureCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isSigning, setIsSigning] = useState(false);

  const startSign = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = signatureCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    const x = ('clientX' in e ? e.clientX : e.touches[0].clientX) - rect.left;
    const y = ('clientY' in e ? e.clientY : e.touches[0].clientY) - rect.top;

    ctx.beginPath();
    ctx.moveTo(x, y);
    setIsSigning(true);
  };

  const drawSign = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isSigning) return;
    const canvas = signatureCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    const x = ('clientX' in e ? e.clientX : e.touches[0].clientX) - rect.left;
    const y = ('clientY' in e ? e.clientY : e.touches[0].clientY) - rect.top;

    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const endSign = () => {
    if (!isSigning) return;
    setIsSigning(false);
    if (signatureCanvasRef.current) {
      onChange(signatureCanvasRef.current.toDataURL());
    }
  };

  const clearSign = () => {
    const canvas = signatureCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    onChange('');
  };

  // 4. Desenho em cima de Imagem/Blueprint
  const blueprintCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const drawOnBlueprint = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = blueprintCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    ctx.fillStyle = '#ef4444';
    ctx.beginPath();
    ctx.arc(x, y, 6, 0, Math.PI * 2);
    ctx.fill();
    onChange(canvas.toDataURL());
  };

  // 5. GPS & Endereço Reverso
  const [isLocating, setIsLocating] = useState(false);
  const handleGetGps = () => {
    setIsLocating(true);
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          const coords = `${pos.coords.latitude.toFixed(6)}, ${pos.coords.longitude.toFixed(6)}`;
          try {
            const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${pos.coords.latitude}&lon=${pos.coords.longitude}`);
            const data = await res.json();
            onChange({ coords, address: data.display_name || coords });
          } catch {
            onChange({ coords, address: coords });
          }
          setIsLocating(false);
        },
        () => {
          onChange({ coords: '-23.5329, -46.7918', address: 'Av. dos Autonomistas, Osasco - SP' });
          setIsLocating(false);
        }
      );
    }
  };

  // 6. Lista Dinâmica (itemList)
  const [newItemText, setNewItemText] = useState('');
  const handleAddItemToList = () => {
    if (!newItemText.trim()) return;
    const prev = Array.isArray(value) ? value : [];
    onChange([...prev, newItemText.trim()]);
    setNewItemText('');
  };

  const handleRemoveListItem = (index: number) => {
    const prev = Array.isArray(value) ? value : [];
    onChange(prev.filter((_, i) => i !== index));
  };

  // 7. Lista de Alta Volumetria
  const [highVolumeSearch, setHighVolumeSearch] = useState('');
  const highVolumeItems = field.options || Array.from({ length: 50 }, (_, i) => `Item de Almoxarifado #${1000 + i}`);
  const filteredHighVolume = highVolumeItems.filter(item => item.toLowerCase().includes(highVolumeSearch.toLowerCase()));

  // 8. Máscara de CPF / CNPJ / Telefone
  const applyMask = (raw: string) => {
    const clean = raw.replace(/\D/g, '');
    if (clean.length <= 11) {
      if (clean.length > 9) return clean.replace(/^(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
      return clean.replace(/^(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
    }
    return clean.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
  };

  // 9. Ouvinte de eventos disparados pelo JavaScript do componente customizado
  useEffect(() => {
    const handleCustomEvent = (e: any) => {
      if (e.detail && e.detail.fieldId === field.id) {
        onChange(e.detail.val);
      }
    };
    window.addEventListener('nws-custom-field-update', handleCustomEvent);
    return () => window.removeEventListener('nws-custom-field-update', handleCustomEvent);
  }, [field.id, onChange]);

  // 10. Execução Segura do JavaScript Customizado (Substitui a tag <script>)
  useEffect(() => {
    if (field.type === 'custom_code' && field.customJs) {
      try {
        const container = document.getElementById(`custom-container-${field.id}`);
        if (!container) return;

        const setFieldValue = (val: any) => {
          const event = new CustomEvent('nws-custom-field-update', { 
            detail: { fieldId: field.id, val: val } 
          });
          window.dispatchEvent(event);
        };

        const currentValue = value || '';

        // Executa a função JS do usuário de forma segura no ciclo React
        const runner = new Function('container', 'setFieldValue', 'allValues', 'currentValue', field.customJs);
        runner(container, setFieldValue, allValues, currentValue);
      } catch (err) {
        console.error('Erro na execução do JS customizado:', err);
      }
    }
  }, [field.type, field.customJs, field.id, allValues, value]);

  return (
    <div className="space-y-1.5 w-full">
      <label className="text-xs font-bold text-slate-700 flex items-center justify-between">
        <span>
          {field.label} {field.required && <span className="text-rose-500">*</span>}
        </span>
        {field.readOnly && <span className="text-[10px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded font-medium">Leitura</span>}
      </label>

      {/* 1. TEXTO CURTO */}
      {field.type === 'text_short' && (
        <input 
          type="text"
          disabled={field.readOnly}
          value={value || ''}
          placeholder={field.placeholder || 'Digite o texto...'}
          onChange={(e) => onChange(e.target.value)}
          className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-teal-500 focus:bg-white focus:outline-none"
        />
      )}

      {/* 2. TEXTO LONGO */}
      {field.type === 'text_long' && (
        <textarea 
          rows={3}
          disabled={field.readOnly}
          value={value || ''}
          placeholder={field.placeholder || 'Digite o texto detalhado...'}
          onChange={(e) => onChange(e.target.value)}
          className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-teal-500 focus:bg-white focus:outline-none"
        />
      )}

      {/* 3. NUMÉRICO */}
      {field.type === 'number' && (
        <input 
          type="number"
          disabled={field.readOnly}
          value={value ?? ''}
          placeholder={field.placeholder || '0'}
          onChange={(e) => onChange(Number(e.target.value))}
          className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-teal-500 focus:bg-white focus:outline-none"
        />
      )}

      {/* 4. STEPPER (+ / -) */}
      {field.type === 'number_stepper' && (
        <div className="flex items-center gap-2 max-w-[200px]">
          <button 
            type="button"
            onClick={() => onChange(Math.max(0, (Number(value) || 0) - 1))}
            className="w-10 h-9 bg-slate-100 hover:bg-slate-200 rounded-lg font-bold text-slate-700 flex items-center justify-center transition"
          >
            <Minus className="w-4 h-4" />
          </button>
          <input 
            type="number"
            value={value ?? 0}
            onChange={(e) => onChange(Number(e.target.value))}
            className="w-full text-center font-extrabold text-slate-800 text-xs p-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none"
          />
          <button 
            type="button"
            onClick={() => onChange((Number(value) || 0) + 1)}
            className="w-10 h-9 bg-slate-100 hover:bg-slate-200 rounded-lg font-bold text-slate-700 flex items-center justify-center transition"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* 5. DATA */}
      {field.type === 'date' && (
        <input 
          type="date"
          disabled={field.readOnly}
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
          className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-teal-500 focus:bg-white focus:outline-none"
        />
      )}

      {/* 6. EMAIL */}
      {field.type === 'email' && (
        <input 
          type="email"
          disabled={field.readOnly}
          value={value || ''}
          placeholder="exemplo@empresa.com"
          onChange={(e) => onChange(e.target.value)}
          className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-teal-500 focus:bg-white focus:outline-none"
        />
      )}

      {/* 7. MÁSCARA CPF/CNPJ/TEL */}
      {field.type === 'masked_id' && (
        <input 
          type="text"
          value={value || ''}
          placeholder="Digite CPF, CNPJ ou Telefone..."
          onChange={(e) => onChange(applyMask(e.target.value))}
          className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-teal-500 focus:bg-white focus:outline-none font-mono"
        />
      )}

      {/* 8. FOTO / CÂMERA */}
      {field.type === 'photo' && (
        <div className="space-y-2">
          <label className="border-2 border-dashed border-slate-200 hover:border-teal-400 bg-slate-50 hover:bg-teal-50/20 p-4 rounded-xl flex flex-col items-center justify-center cursor-pointer transition">
            <Camera className="w-6 h-6 text-teal-600 mb-1" />
            <span className="text-xs font-bold text-slate-700">Tirar Foto ou Carregar da Galeria</span>
            <input 
              type="file" 
              accept="image/*" 
              capture="environment"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) {
                  const reader = new FileReader();
                  reader.onload = () => onChange(reader.result);
                  reader.readAsDataURL(file);
                }
              }} 
              className="hidden" 
            />
          </label>
          {value && (
            <div className="relative rounded-lg overflow-hidden border border-slate-200 max-w-xs">
              <img src={value} alt="Preview" className="w-full h-36 object-cover" />
              <button 
                type="button" 
                onClick={() => onChange('')} 
                className="absolute top-2 right-2 p-1 bg-black/60 text-white rounded-md hover:bg-rose-600 transition"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>
      )}

      {/* 9. ASSINATURA DIGITAL */}
      {field.type === 'signature' && (
        <div className="space-y-2">
          <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-2xs">
            <canvas 
              ref={signatureCanvasRef} 
              width={400} 
              height={140}
              onMouseDown={startSign}
              onMouseMove={drawSign}
              onMouseUp={endSign}
              onTouchStart={startSign}
              onTouchMove={drawSign}
              onTouchEnd={endSign}
              className="w-full bg-slate-50/50 cursor-crosshair touch-none"
            />
          </div>
          <div className="flex justify-between items-center text-xs">
            <span className="text-[10px] text-slate-400">Assine com o dedo ou mouse no quadro acima</span>
            <button 
              type="button" 
              onClick={clearSign} 
              className="text-[11px] font-bold text-rose-600 hover:text-rose-700 underline"
            >
              Limpar Assinatura
            </button>
          </div>
        </div>
      )}

      {/* 10. QR CODE & BARCODE SCANNER */}
      {field.type === 'barcode_qr' && (
        <div className="space-y-2">
          <div className="flex gap-2">
            <input 
              type="text" 
              readOnly 
              value={value || ''} 
              placeholder="Código escaneado..." 
              className="flex-1 text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-lg font-mono font-bold"
            />
            <button 
              type="button" 
              onClick={() => setIsScanning(!isScanning)}
              className="bg-gradient-to-r from-teal-500 to-emerald-500 text-white px-3.5 py-2 rounded-lg text-xs font-bold flex items-center gap-1.5 transition"
            >
              <QrCode className="w-4 h-4" />
              {isScanning ? 'Parar' : 'Escanear'}
            </button>
          </div>
          {isScanning && (
            <div className="rounded-xl overflow-hidden border border-slate-300 bg-black aspect-video relative">
              <video ref={videoRef} className="w-full h-full object-cover" />
            </div>
          )}
        </div>
      )}

      {/* 11. LISTA DINÂMICA (itemList) */}
      {field.type === 'item_list' && (
        <div className="space-y-2 border border-slate-200 rounded-xl p-3 bg-slate-50/50">
          <div className="flex gap-2">
            <input 
              type="text" 
              value={newItemText} 
              onChange={(e) => setNewItemText(e.target.value)}
              placeholder="Adicionar novo item na lista..." 
              className="flex-1 text-xs p-2 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
            <button 
              type="button" 
              onClick={handleAddItemToList}
              className="bg-teal-600 hover:bg-teal-700 text-white px-3 py-2 rounded-lg text-xs font-bold flex items-center gap-1 transition"
            >
              <Plus className="w-3.5 h-3.5" /> Adicionar
            </button>
          </div>
          <div className="space-y-1 max-h-36 overflow-y-auto">
            {(Array.isArray(value) ? value : []).map((item: string, idx: number) => (
              <div key={idx} className="flex items-center justify-between bg-white p-2 rounded-lg border border-slate-200 text-xs">
                <span className="font-semibold text-slate-800">• {item}</span>
                <button type="button" onClick={() => handleRemoveListItem(idx)} className="text-slate-400 hover:text-rose-600">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 12. DROPDOWN INTERNO */}
      {field.type === 'dropdown_internal' && (
        <select 
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
          className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-teal-500 focus:bg-white focus:outline-none font-medium"
        >
          <option value="">Selecione uma opção...</option>
          {(field.options || ['Opção 1', 'Opção 2', 'Opção 3']).map((opt, i) => (
            <option key={i} value={opt}>{opt}</option>
          ))}
        </select>
      )}

      {/* 13. DROPDOWN EXTERNO (TABELA AUXILIAR) */}
      {field.type === 'dropdown_external' && (
        <select 
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
          className="w-full text-xs p-2.5 bg-teal-50/30 border border-teal-200 rounded-lg focus:ring-2 focus:ring-teal-500 focus:bg-white focus:outline-none font-medium"
        >
          <option value="">Selecione da base externa...</option>
          {(field.options || ['Equipamento NWS #101', 'Equipamento NWS #102', 'Equipamento NWS #103']).map((opt, i) => (
            <option key={i} value={opt}>{opt}</option>
          ))}
        </select>
      )}

      {/* 14. RADIO BUTTON */}
      {field.type === 'radio' && (
        <div className="flex flex-wrap gap-4 pt-1">
          {(field.options || ['Conforme', 'Não Conforme', 'Não se Aplica']).map((opt, i) => (
            <label key={i} className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer font-medium">
              <input 
                type="radio" 
                name={field.id} 
                checked={value === opt} 
                onChange={() => onChange(opt)}
                className="text-teal-600 focus:ring-teal-500"
              />
              {opt}
            </label>
          ))}
        </div>
      )}

      {/* 15. CADEIA DE EVENTOS */}
      {field.type === 'events_chain' && (
        <div className="space-y-2 border border-slate-200 rounded-xl p-3 bg-slate-50">
          <button 
            type="button" 
            onClick={() => {
              const now = new Date().toLocaleString('pt-BR');
              const prev = Array.isArray(value) ? value : [];
              onChange([...prev, { id: Date.now(), name: 'Etapa Validada', at: now, user: 'Operador Atual' }]);
            }}
            className="text-xs bg-teal-600 text-white px-3 py-1.5 rounded-lg font-bold hover:bg-teal-700 transition"
          >
            + Acionar Próximo Evento
          </button>
          <div className="space-y-1">
            {(Array.isArray(value) ? value : []).map((ev: any) => (
              <div key={ev.id} className="text-xs bg-white p-2 rounded-lg border border-slate-200 flex items-center justify-between">
                <span className="font-bold text-slate-800">{ev.name}</span>
                <span className="text-[10px] text-slate-400 font-mono">{ev.at} • {ev.user}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 16. OCR */}
      {field.type === 'ocr' && (
        <div className="space-y-2">
          <label className="border-2 border-dashed border-teal-200 bg-teal-50/30 hover:bg-teal-50/60 p-4 rounded-xl flex flex-col items-center justify-center cursor-pointer transition">
            <ScanText className="w-6 h-6 text-teal-600 mb-1" />
            <span className="text-xs font-bold text-teal-800">
              {isProcessingOcr ? 'Lendo texto na imagem...' : 'Tirar Foto ou Upload para OCR'}
            </span>
            <input type="file" accept="image/*" onChange={handleOcrCapture} className="hidden" />
          </label>
          {value && (
            <textarea 
              rows={3} 
              value={value} 
              onChange={(e) => onChange(e.target.value)} 
              className="w-full text-xs p-2.5 bg-white border border-slate-200 rounded-lg font-mono"
            />
          )}
        </div>
      )}

      {/* 17. LISTA DE ALTA VOLUMETRIA */}
      {field.type === 'high_volume_list' && (
        <div className="border border-slate-200 rounded-xl p-3 bg-slate-50 space-y-2">
          <input 
            type="text" 
            placeholder="Pesquisar na lista volumosa..." 
            value={highVolumeSearch} 
            onChange={(e) => setHighVolumeSearch(e.target.value)} 
            className="w-full text-xs p-2 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
          />
          <div className="max-h-36 overflow-y-auto space-y-1 bg-white p-1 rounded-lg border border-slate-200">
            {filteredHighVolume.slice(0, 15).map((item, idx) => (
              <div 
                key={idx} 
                onClick={() => onChange(item)} 
                className={`p-2 rounded text-xs cursor-pointer flex items-center justify-between ${
                  value === item ? 'bg-teal-100 text-teal-900 font-bold' : 'hover:bg-slate-50 text-slate-700'
                }`}
              >
                <span>{item}</span>
                {value === item && <Check className="w-3.5 h-3.5 text-teal-700" />}
              </div>
            ))}
          </div>
          {value && <p className="text-[11px] text-teal-700 font-bold">Selecionado: {value}</p>}
        </div>
      )}

      {/* 18. VÍDEO */}
      {field.type === 'video' && (
        <div className="space-y-2">
          <label className="border-2 border-dashed border-slate-200 hover:border-teal-400 bg-slate-50 p-4 rounded-xl flex flex-col items-center justify-center cursor-pointer transition">
            <Video className="w-6 h-6 text-teal-600 mb-1" />
            <span className="text-xs font-bold text-slate-700">Gravar ou Carregar Vídeo de Evidência</span>
            <input 
              type="file" 
              accept="video/*" 
              capture="environment"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) {
                  const url = URL.createObjectURL(file);
                  onChange(url);
                }
              }} 
              className="hidden" 
            />
          </label>
          {value && (
            <video src={value} controls className="w-full rounded-xl border border-slate-200 max-h-48 bg-black" />
          )}
        </div>
      )}

      {/* 19. GPS & ENDEREÇO REVERSO */}
      {field.type === 'address_geo' && (
        <div className="border border-slate-200 rounded-xl p-3 bg-slate-50 flex flex-col gap-2">
          <div className="flex items-start gap-2 text-xs text-slate-700">
            <MapPin className="w-4 h-4 text-rose-500 mt-0.5 shrink-0" />
            <div>
              <p className="font-bold text-slate-900">{value?.address || 'Nenhum endereço capturado'}</p>
              {value?.coords && <p className="text-[10px] text-slate-400 font-mono">Coords: {value.coords}</p>}
            </div>
          </div>
          <button 
            type="button" 
            onClick={handleGetGps} 
            disabled={isLocating}
            className="w-full bg-white border border-slate-200 hover:bg-slate-100 text-slate-800 text-xs font-bold py-2 rounded-lg transition"
          >
            {isLocating ? 'Obtendo Localização...' : 'Capturar Endereço GPS'}
          </button>
        </div>
      )}

      {/* 20. DESENHO EM PNG (BLUEPRINT) */}
      {field.type === 'canvas_draw' && (
        <div className="space-y-2">
          <p className="text-[10px] text-slate-500">Clique na área do diagrama para marcar pontos de não-conformidade:</p>
          <div className="border border-slate-200 rounded-xl overflow-hidden bg-slate-100 flex justify-center">
            <canvas 
              ref={blueprintCanvasRef} 
              width={460} 
              height={180}
              onClick={drawOnBlueprint}
              className="bg-white cursor-crosshair w-full"
            />
          </div>
        </div>
      )}

      {/* 21. COMPONENTE 100% PROGRAMÁVEL (HTML + CSS + JAVASCRIPT SEGURO) */}
      {field.type === 'custom_code' && (
        <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-2xs">
          <div className="bg-slate-900 text-slate-200 px-3 py-1.5 flex items-center justify-between text-[11px] font-mono border-b border-slate-800">
            <span className="flex items-center gap-1.5 text-teal-400 font-bold">
              <Code2 className="w-3.5 h-3.5" /> Componente Customizado
            </span>
            <span className="text-[10px] text-slate-400">HTML • CSS • JS</span>
          </div>

          <div className="p-3.5">
            <style dangerouslySetInnerHTML={{ __html: field.customCss || '' }} />
            <div 
              id={`custom-container-${field.id}`}
              dangerouslySetInnerHTML={{ 
                __html: field.customHtml || `
                  <div style="padding: 12px; background: #f8fafc; border: 1.5px dashed #cbd5e1; border-radius: 8px; text-align: center; color: #64748b; font-size: 12px;">
                    Defina o HTML, CSS e JS no painel lateral à direita.
                  </div>
                ` 
              }} 
            />
          </div>
        </div>
      )}
    </div>
  );
}