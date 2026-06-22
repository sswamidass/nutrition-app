'use client';

import { useState, useEffect } from 'react';
import type { Meal, MealType } from '@/lib/types';

const MEAL_LABELS: Record<MealType, string> = {
  breakfast: 'Breakfast',
  lunch: 'Lunch',
  dinner: 'Dinner',
  snack: 'Snacks',
};

interface FormData {
  description: string;
  meal_type: MealType;
  calories: string;
  protein_g: string;
  carbs_g: string;
  fat_g: string;
  fiber_g: string;
  sugar_g: string;
  sodium_mg: string;
  notes: string;
}

const EMPTY: FormData = {
  description: '', meal_type: 'snack', calories: '', protein_g: '',
  carbs_g: '', fat_g: '', fiber_g: '', sugar_g: '', sodium_mg: '', notes: '',
};

function n(v: string) { return v === '' ? 0 : Number(v); }

export default function AddFoodModal({
  mealType,
  editing,
  onSave,
  onClose,
}: {
  mealType: MealType;
  editing: Meal | null;
  onSave: (data: Omit<Meal, 'id' | 'logged_at'>) => void;
  onClose: () => void;
}) {
  const [form, setForm] = useState<FormData>({ ...EMPTY, meal_type: mealType });

  useEffect(() => {
    if (editing) {
      setForm({
        description: editing.description,
        meal_type: editing.meal_type,
        calories: String(editing.calories || ''),
        protein_g: String(editing.protein_g || ''),
        carbs_g: String(editing.carbs_g || ''),
        fat_g: String(editing.fat_g || ''),
        fiber_g: String(editing.fiber_g || ''),
        sugar_g: String(editing.sugar_g || ''),
        sodium_mg: String(editing.sodium_mg || ''),
        notes: editing.notes ?? '',
      });
    } else {
      setForm({ ...EMPTY, meal_type: mealType });
    }
  }, [editing, mealType]);

  const set = (k: keyof FormData) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.description.trim()) return;
    onSave({
      date: new Date().toISOString().split('T')[0],
      meal_type: form.meal_type,
      description: form.description.trim(),
      calories: n(form.calories),
      protein_g: n(form.protein_g),
      carbs_g: n(form.carbs_g),
      fat_g: n(form.fat_g),
      fiber_g: n(form.fiber_g),
      sugar_g: n(form.sugar_g),
      sodium_mg: n(form.sodium_mg),
      notes: form.notes.trim() || null,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />

      {/* Dialog */}
      <div className="relative bg-white rounded-lg shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-mfp-border bg-mfp-navy rounded-t-lg">
          <h2 className="text-white font-bold text-base">
            {editing ? 'Edit Food' : `Add Food to ${MEAL_LABELS[mealType]}`}
          </h2>
          <button onClick={onClose} className="text-white/70 hover:text-white text-2xl leading-none">&times;</button>
        </div>

        <form onSubmit={handleSubmit} className="px-5 py-4 space-y-4">
          {/* Food name */}
          <div>
            <label className="block text-xs font-semibold text-mfp-muted uppercase tracking-wide mb-1">
              Food Name <span className="text-mfp-red">*</span>
            </label>
            <input
              type="text"
              value={form.description}
              onChange={set('description')}
              placeholder="e.g. Chicken breast, 150g"
              required
              autoFocus
              className="w-full border border-mfp-border rounded px-3 py-2 text-sm focus:outline-none focus:border-mfp-blue focus:ring-1 focus:ring-mfp-blue"
            />
          </div>

          {/* Meal type */}
          <div>
            <label className="block text-xs font-semibold text-mfp-muted uppercase tracking-wide mb-1">Meal</label>
            <select
              value={form.meal_type}
              onChange={set('meal_type')}
              className="w-full border border-mfp-border rounded px-3 py-2 text-sm focus:outline-none focus:border-mfp-blue"
            >
              {(Object.keys(MEAL_LABELS) as MealType[]).map(t => (
                <option key={t} value={t}>{MEAL_LABELS[t]}</option>
              ))}
            </select>
          </div>

          {/* Macros grid */}
          <div className="grid grid-cols-2 gap-3">
            {([
              ['calories', 'Calories', 'kcal'],
              ['protein_g', 'Protein', 'g'],
              ['carbs_g', 'Carbs', 'g'],
              ['fat_g', 'Fat', 'g'],
              ['fiber_g', 'Fiber', 'g'],
              ['sugar_g', 'Sugar', 'g'],
              ['sodium_mg', 'Sodium', 'mg'],
            ] as [keyof FormData, string, string][]).map(([field, label, unit]) => (
              <div key={field}>
                <label className="block text-xs font-semibold text-mfp-muted uppercase tracking-wide mb-1">
                  {label} <span className="font-normal normal-case">({unit})</span>
                </label>
                <input
                  type="number"
                  min="0"
                  step="any"
                  value={form[field]}
                  onChange={set(field)}
                  placeholder="0"
                  className="w-full border border-mfp-border rounded px-3 py-2 text-sm focus:outline-none focus:border-mfp-blue focus:ring-1 focus:ring-mfp-blue"
                />
              </div>
            ))}
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-semibold text-mfp-muted uppercase tracking-wide mb-1">Notes</label>
            <textarea
              value={form.notes}
              onChange={set('notes')}
              rows={2}
              placeholder="Optional notes..."
              className="w-full border border-mfp-border rounded px-3 py-2 text-sm resize-none focus:outline-none focus:border-mfp-blue"
            />
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-1">
            <button type="submit" className="mfp-btn-primary flex-1">
              {editing ? 'Save Changes' : 'Add Food'}
            </button>
            <button type="button" onClick={onClose} className="flex-1 border border-mfp-border rounded text-sm font-semibold text-mfp-muted hover:bg-gray-50 py-2 transition-colors">
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
