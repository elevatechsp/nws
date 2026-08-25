// src/lib/pdfTemplateFiller.ts
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';

export interface FieldMapping {
  fieldKey: string;     // Identificador do campo ou metadado (ex: 'operator', 'submitted_at', 'id', 'temperatura')
  pageIndex: number;    // Índice da página (0 para a primeira página)
  x: number;            // Posição X em pontos
  y: number;            // Posição Y em pontos
  size?: number;        // Tamanho da fonte (padrão: 10)
  color?: { r: number; g: number; b: number };
}

/**
 * Preenche um PDF template existente em formato Base64 ou ArrayBuffer com os dados coletados
 */
export async function generatePdfFromTemplate(
  templatePdfSource: ArrayBuffer | string,
  submission: {
    id: string;
    operator: string;
    company_name?: string;
    submitted_at: string;
    project_name: string;
    data: Record<string, any>;
  },
  mappings: FieldMapping[]
): Promise<Uint8Array> {
  let pdfBytes: ArrayBuffer;

  if (typeof templatePdfSource === 'string') {
    // Se for Base64 (com ou sem data URI)
    const base64Data = templatePdfSource.replace(/^data:application\/pdf;base64,/, '');
    const binaryString = atob(base64Data);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    pdfBytes = bytes.buffer;
  } else {
    pdfBytes = templatePdfSource;
  }

  const pdfDoc = await PDFDocument.load(pdfBytes);
  const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const pages = pdfDoc.getPages();

  // Consolida metadados e respostas do formulário em um único objeto de busca
  const allValues: Record<string, any> = {
    id: submission.id,
    operator: submission.operator,
    company_name: submission.company_name || 'NWS Plataforma',
    submitted_at: submission.submitted_at,
    project_name: submission.project_name,
    ...submission.data,
  };

  for (const map of mappings) {
    const page = pages[map.pageIndex || 0];
    if (!page) continue;

    const rawVal = allValues[map.fieldKey];
    let textToDraw = '';

    if (rawVal !== undefined && rawVal !== null) {
      if (typeof rawVal === 'boolean') {
        textToDraw = rawVal ? 'SIM / CONFORME' : 'NÃO / NÃO CONFORME';
      } else if (typeof rawVal === 'object') {
        textToDraw = JSON.stringify(rawVal);
      } else {
        textToDraw = String(rawVal);
      }
    }

    if (!textToDraw) continue;

    const r = map.color?.r ?? 0.1;
    const g = map.color?.g ?? 0.1;
    const b = map.color?.b ?? 0.1;

    page.drawText(textToDraw, {
      x: map.x,
      y: map.y,
      size: map.size || 10,
      font: ['id', 'operator', 'project_name'].includes(map.fieldKey) ? fontBold : fontRegular,
      color: rgb(r, g, b),
    });
  }

  return await pdfDoc.save();
}