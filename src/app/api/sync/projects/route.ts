// src/app/api/sync/submissions/route.ts
import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const { data, error } = await supabase
      .from('submissions')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Erro GET submissions:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json(data || []);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const items = Array.isArray(body) ? body : [body];

    const rows = items.map((sub) => ({
      id: sub.id,
      project_id: sub.project_id || sub.projectId || null,
      project_name: sub.project_name || sub.projectName,
      operator: sub.operator,
      location: sub.location || 'Coleta em Campo',
      submitted_at: sub.submitted_at || sub.submittedAt || new Date().toLocaleString('pt-BR'),
      status: sub.status || 'pending',
      data: sub.data || {},
      created_at: new Date().toISOString(),
    }));

    const { error } = await supabase
      .from('submissions')
      .upsert(rows, { onConflict: 'id' });

    if (error) {
      console.error('Erro POST submissions no Supabase:', error);
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, count: rows.length });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}