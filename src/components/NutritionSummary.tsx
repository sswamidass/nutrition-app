import type { NutritionGoals, MacroTotals } from '@/lib/types';

interface Row {
  label: string;
  goal: number | null;
  actual: number;
  unit: string;
}

function pctColor(pct: number) {
  if (pct > 100) return 'bg-mfp-red';
  if (pct > 90) return 'bg-mfp-orange';
  return 'bg-mfp-green';
}

function MacroRow({ label, goal, actual, unit }: Row) {
  const pct = goal ? Math.min((actual / goal) * 100, 110) : 0;
  const remaining = goal !== null ? goal - actual : null;

  return (
    <tr className="border-b border-mfp-border last:border-0">
      <td className="py-2 pr-3 text-sm text-mfp-muted font-medium w-28">{label}</td>
      <td className="py-2 pr-4 text-sm text-right w-20">
        {goal !== null ? `${Math.round(goal)}${unit}` : '—'}
      </td>
      <td className="py-2 pr-4 text-sm text-right w-20 font-semibold text-mfp-text">
        {Math.round(actual)}{unit}
      </td>
      <td className="py-2 pr-4 w-32 hidden sm:table-cell">
        <div className="progress-bar-track">
          {goal !== null && <div className={`progress-bar-fill ${pctColor(pct)}`} style={{ width: `${Math.min(pct, 100)}%` }} />}
        </div>
      </td>
      <td className={`py-2 text-sm text-right w-20 font-medium ${remaining !== null && remaining < 0 ? 'text-mfp-red' : 'text-mfp-text'}`}>
        {remaining !== null ? `${Math.round(remaining)}${unit}` : '—'}
      </td>
    </tr>
  );
}

export default function NutritionSummary({ goals, totals }: { goals: NutritionGoals; totals: MacroTotals }) {
  const rows: Row[] = [
    { label: 'Calories', goal: goals.daily_calories, actual: totals.calories, unit: '' },
    { label: 'Carbs', goal: goals.daily_carbs_g, actual: totals.carbs_g, unit: 'g' },
    { label: 'Fat', goal: goals.daily_fat_g, actual: totals.fat_g, unit: 'g' },
    { label: 'Protein', goal: goals.daily_protein_g, actual: totals.protein_g, unit: 'g' },
    { label: 'Fiber', goal: goals.daily_fiber_g, actual: totals.fiber_g, unit: 'g' },
    { label: 'Sugar', goal: goals.daily_sugar_g, actual: totals.sugar_g, unit: 'g' },
    { label: 'Sodium', goal: goals.daily_sodium_mg, actual: totals.sodium_mg, unit: 'mg' },
  ];

  return (
    <div className="mfp-card overflow-hidden">
      <div className="mfp-section-header">
        <span>Nutrition Summary</span>
      </div>
      <div className="px-4 py-3 overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b-2 border-mfp-border">
              <th className="pb-2 text-left text-xs text-mfp-muted uppercase tracking-wide font-semibold w-28" />
              <th className="pb-2 text-right text-xs text-mfp-muted uppercase tracking-wide font-semibold w-20">Goal</th>
              <th className="pb-2 text-right text-xs text-mfp-muted uppercase tracking-wide font-semibold w-20">Eaten</th>
              <th className="pb-2 text-xs text-mfp-muted uppercase tracking-wide font-semibold w-32 hidden sm:table-cell" />
              <th className="pb-2 text-right text-xs text-mfp-muted uppercase tracking-wide font-semibold w-20">Left</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(row => (
              <MacroRow key={row.label} {...row} />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
