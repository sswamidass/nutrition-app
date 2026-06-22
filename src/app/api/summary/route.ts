import { NextRequest, NextResponse } from 'next/server';
import { getMealsByDate, getWaterByDate, getGoals, getDayTotals } from '@/lib/db';

export async function GET(req: NextRequest) {
  const date = req.nextUrl.searchParams.get('date');
  if (!date) return NextResponse.json({ error: 'date required' }, { status: 400 });

  const [meals, water_logs, goals, totals] = [
    getMealsByDate(date),
    getWaterByDate(date),
    getGoals(),
    getDayTotals(date),
  ];

  return NextResponse.json({ date, meals, water_logs, goals, totals });
}
