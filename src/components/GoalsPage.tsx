'use client';

import { useEffect, useState } from 'react';
import type { NutritionGoals } from '@/lib/types';

type GoalForm = {
  daily_calories: string;
  daily_protein_g: string;
  daily_carbs_g: string;
  daily_fat_g: string;
  daily_fiber_g: string;
  daily_sugar_g: string;
  daily_sodium_mg: string;
  daily_water_ml: string;
};

function toForm(g: NutritionGoals): GoalForm {
  return {
    daily_calories: String(g.daily_calories),
    daily_protein_g: String(g.daily_protein_g),
    daily_carbs_g: String(g.daily_carbs_g),
    daily_fat_g: String(g.daily_fat_g),
    daily_fiber_g: g.daily_fiber_g != null ? String(g.daily_fiber_g) : '',
    daily_sugar_g: g.daily_sugar_g != null ? String(g.daily_sugar_g) : '',
    daily_sodium_mg: g.daily_sodium_mg != null ? String(g.daily_sodium_mg) : '',
    daily_water_ml: String(g.daily_water_ml),
  };
}

export default function GoalsPage() {
  const [form, setForm] = useState<GoalForm | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetch('/api/goals').then(r => r.json()).then((g: NutritionGoals) => setForm(toForm(g)));
  }, []);

  const set = (k: keyof GoalForm) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm(f => f ? { ...f, [k]: e.target.value } : f);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form) return;
    const body = {
      daily_calories: Number(form.daily_calories),
      daily_protein_g: Number(form.daily_protein_g),
      daily_carbs_g: Number(form.daily_carbs_g),
      daily_fat_g: Number(form.daily_fat_g),
      daily_fiber_g: form.daily_fiber_g ? Number(form.daily_fiber_g) : null,
      daily_sugar_g: form.daily_sugar_g ? Number(form.daily_sugar_g) : null,
      daily_sodium_mg: form.daily_sodium_mg ? Number(form.daily_sodium_mg) : null,
      daily_water_ml: Number(form.daily_water_ml),
    };
    await fetch('/api/goals', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  if (!form) return <div className="py-20 text-center text-mfp-muted">Loading...</div>;

  const fields: [keyof GoalForm, string, string, boolean][] = [
    ['daily_calories', 'Daily Calories', 'kcal', true],
    ['daily_protein_g', 'Protein', 'g per day', true],
    ['daily_carbs_g', 'Carbohydrates', 'g per day', true],
    ['daily_fat_g', 'Fat', 'g per day', true],
    ['daily_fiber_g', 'Fiber', 'g per day', false],
    ['daily_sugar_g', 'Sugar', 'g per day', false],
    ['daily_sodium_mg', 'Sodium', 'mg per day', false],
    ['daily_water_ml', 'Water', 'ml per day', true],
  ];

  return (
    <div className="space-y-4">
      <div className="mfp-card overflow-hidden">
        <div className="mfp-section-header">
          <span>Daily Nutrition Goals</span>
        </div>
        <form onSubmit={handleSubmit} className="divide-y divide-mfp-border">
          {fields.map(([key, label, unit, required]) => (
            <div key={key} className="flex items-center px-5 py-4 gap-4">
              <div className="flex-1">
                <div className="text-sm font-semibold text-mfp-text">{label}</div>
                <div className="text-xs text-mfp-muted mt-0.5">{unit}</div>
              </div>
              <input
                type="number"
                min="0"
                step="any"
                value={form[key]}
                onChange={set(key)}
                required={required}
                placeholder={required ? '' : 'No goal'}
                className="w-32 border border-mfp-border rounded px-3 py-2 text-sm text-right focus:outline-none focus:border-mfp-blue focus:ring-1 focus:ring-mfp-blue"
              />
            </div>
          ))}

          <div className="px-5 py-4">
            <button type="submit" className="mfp-btn-primary w-full">
              {saved ? 'Saved!' : 'Save Goals'}
            </button>
          </div>
        </form>
      </div>

      <div className="text-center text-xs text-mfp-muted pb-4">
        Changes take effect immediately on the Diary page.
      </div>
    </div>
  );
}
