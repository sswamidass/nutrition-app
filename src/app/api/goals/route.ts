import { NextRequest, NextResponse } from 'next/server';
import { getGoals, updateGoals } from '@/lib/db';

export async function GET() {
  return NextResponse.json(getGoals());
}

export async function PUT(req: NextRequest) {
  const body = await req.json();
  const goals = updateGoals(body);
  return NextResponse.json(goals);
}
