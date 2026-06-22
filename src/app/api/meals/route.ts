import { NextRequest, NextResponse } from 'next/server';
import { getMealsByDate, addMeal } from '@/lib/db';

export async function GET(req: NextRequest) {
  const date = req.nextUrl.searchParams.get('date');
  if (!date) return NextResponse.json({ error: 'date required' }, { status: 400 });
  return NextResponse.json(await getMealsByDate(date));
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { date, meal_type, description, calories = 0, protein_g = 0, carbs_g = 0,
    fat_g = 0, fiber_g = 0, sugar_g = 0, sodium_mg = 0, notes = null } = body;

  if (!date || !description) {
    return NextResponse.json({ error: 'date and description required' }, { status: 400 });
  }

  const meal = await addMeal({ date, meal_type: meal_type || 'snack', description,
    calories, protein_g, carbs_g, fat_g, fiber_g, sugar_g, sodium_mg, notes });
  return NextResponse.json(meal, { status: 201 });
}
