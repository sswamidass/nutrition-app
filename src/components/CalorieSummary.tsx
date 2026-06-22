import type { NutritionGoals, MacroTotals } from '@/lib/types';

function Stat({ label, value, color }: { label: string; value: number; color?: string }) {
  return (
    <div className="flex flex-col items-center gap-1">
      <span className={`text-2xl font-bold ${color ?? 'text-mfp-navy'}`}>
        {Math.round(value).toLocaleString()}
      </span>
      <span className="text-xs text-mfp-muted uppercase tracking-wide font-medium">{label}</span>
    </div>
  );
}

export default function CalorieSummary({ goals, totals }: { goals: NutritionGoals; totals: MacroTotals }) {
  const remaining = goals.daily_calories - totals.calories;
  const remainingColor = remaining < 0 ? 'text-mfp-red' : remaining < 200 ? 'text-mfp-orange' : 'text-mfp-green';

  const pct = Math.min((totals.calories / goals.daily_calories) * 100, 100);
  const barColor = remaining < 0 ? 'bg-mfp-red' : pct > 90 ? 'bg-mfp-orange' : 'bg-mfp-green';

  return (
    <div className="mfp-card overflow-hidden">
      <div className="mfp-section-header">
        <span>Calories Remaining</span>
      </div>
      <div className="px-6 py-4">
        <div className="flex items-center justify-between">
          <Stat label="Goal" value={goals.daily_calories} />
          <span className="text-2xl text-gray-300 font-light select-none">−</span>
          <Stat label="Food" value={totals.calories} />
          <span className="text-2xl text-gray-300 font-light select-none">=</span>
          <Stat label="Remaining" value={remaining} color={remainingColor} />
        </div>
        <div className="mt-4 progress-bar-track">
          <div className={`progress-bar-fill ${barColor}`} style={{ width: `${pct}%` }} />
        </div>
      </div>
    </div>
  );
}
