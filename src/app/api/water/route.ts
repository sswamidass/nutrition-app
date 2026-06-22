import { NextRequest, NextResponse } from 'next/server';
import { getWaterByDate, addWater } from '@/lib/db';

export async function GET(req: NextRequest) {
  const date = req.nextUrl.searchParams.get('date');
  if (!date) return NextResponse.json({ error: 'date required' }, { status: 400 });
  return NextResponse.json(getWaterByDate(date));
}

export async function POST(req: NextRequest) {
  const { date, amount_ml, notes = null } = await req.json();
  if (!date || !amount_ml) return NextResponse.json({ error: 'date and amount_ml required' }, { status: 400 });
  const entry = addWater({ date, amount_ml, notes });
  return NextResponse.json(entry, { status: 201 });
}
