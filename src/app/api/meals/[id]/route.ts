import { NextRequest, NextResponse } from 'next/server';
import { updateMeal, deleteMeal } from '@/lib/db';

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();
  const meal = await updateMeal(Number(id), body);
  if (!meal) return NextResponse.json({ error: 'not found' }, { status: 404 });
  return NextResponse.json(meal);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ok = await deleteMeal(Number(id));
  if (!ok) return NextResponse.json({ error: 'not found' }, { status: 404 });
  return NextResponse.json({ success: true });
}
