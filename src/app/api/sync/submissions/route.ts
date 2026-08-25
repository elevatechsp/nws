import { NextResponse } from 'next/server';

// Memória local para armazenar os envios do operador
let sharedSubmissions: any[] = [];

export async function GET() {
  return NextResponse.json(sharedSubmissions);
}

export async function POST(req: Request) {
  try {
    const data = await req.json();
    const items = Array.isArray(data) ? data : [data];
    sharedSubmissions = [...items, ...sharedSubmissions];
    return NextResponse.json({ success: true, total: sharedSubmissions.length });
  } catch {
    return NextResponse.json({ error: 'Erro ao salvar submissões' }, { status: 400 });
  }
}