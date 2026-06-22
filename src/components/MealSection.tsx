'use client';

import type { Meal, MealType } from '@/lib/types';

const LABEL: Record<MealType, string> = {
  breakfast: 'Breakfast',
  lunch: 'Lunch',
  dinner: 'Dinner',
  snack: 'Snacks',
};

function MacroBadge({ label, value, unit = 'g' }: { label: string; value: number; unit?: string }) {
  return (
    <span className="text-xs text-mfp-muted">
      {label}: <span className="text-mfp-text font-medium">{Math.round(value)}{unit}</span>
    </span>
  );
}

export default function MealSection({
  mealType,
  meals,
  onAddFood,
  onEditMeal,
  onDeleteMeal,
}: {
  mealType: MealType;
  meals: Meal[];
  onAddFood: () => void;
  onEditMeal: (meal: Meal) => void;
  onDeleteMeal: (id: number) => void;
}) {
  const totalCalories = meals.reduce((s, m) => s + m.calories, 0);
  const totalProtein = meals.reduce((s, m) => s + m.protein_g, 0);
  const totalCarbs = meals.reduce((s, m) => s + m.carbs_g, 0);
  const totalFat = meals.reduce((s, m) => s + m.fat_g, 0);

  return (
    <div className="mfp-card overflow-hidden">
      {/* Section header */}
      <div className="mfp-section-header">
        <span>{LABEL[mealType]}</span>
        <span className="text-white/80 text-xs font-normal normal-case tracking-normal">
          {totalCalories > 0 ? `${Math.round(totalCalories)} cal` : ''}
        </span>
      </div>

      {/* Column headers */}
      <div className="flex items-center px-4 py-1 bg-gray-50 border-b border-mfp-border text-xs text-mfp-muted font-medium uppercase tracking-wide">
        <span className="flex-1">Food</span>
        <span className="w-16 text-right">Calories</span>
        <span className="w-20 text-right">Protein</span>
        <span className="w-16 text-right">Carbs</span>
        <span className="w-16 text-right">Fat</span>
        <span className="w-8" />
      </div>

      {/* Food rows */}
      {meals.length === 0 ? (
        <div className="px-4 py-3 text-sm text-mfp-muted italic">No foods logged yet</div>
      ) : (
        meals.map((meal, idx) => (
          <div
            key={meal.id}
            className={`flex items-center px-4 py-2.5 border-b border-mfp-border text-sm group ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}`}
          >
            <button
              onClick={() => onEditMeal(meal)}
              className="flex-1 text-left text-mfp-blue hover:text-mfp-blue-dark hover:underline font-medium truncate"
            >
              {meal.description}
            </button>
            <span className="w-16 text-right text-mfp-text">{Math.round(meal.calories)}</span>
            <span className="w-20 text-right text-mfp-muted text-xs">{Math.round(meal.protein_g)}g</span>
            <span className="w-16 text-right text-mfp-muted text-xs">{Math.round(meal.carbs_g)}g</span>
            <span className="w-16 text-right text-mfp-muted text-xs">{Math.round(meal.fat_g)}g</span>
            <button
              onClick={() => onDeleteMeal(meal.id)}
              className="w-8 text-right text-gray-300 hover:text-mfp-red opacity-0 group-hover:opacity-100 transition-opacity text-lg leading-none"
              aria-label="Delete"
            >
              ×
            </button>
          </div>
        ))
      )}

      {/* Totals row */}
      {meals.length > 0 && (
        <div className="flex items-center px-4 py-2 bg-gray-100 border-b border-mfp-border text-xs font-semibold text-mfp-text">
          <span className="flex-1 uppercase tracking-wide text-mfp-muted">Totals</span>
          <span className="w-16 text-right">{Math.round(totalCalories)}</span>
          <span className="w-20 text-right text-mfp-muted">{Math.round(totalProtein)}g</span>
          <span className="w-16 text-right text-mfp-muted">{Math.round(totalCarbs)}g</span>
          <span className="w-16 text-right text-mfp-muted">{Math.round(totalFat)}g</span>
          <span className="w-8" />
        </div>
      )}

      {/* Add food button */}
      <div className="px-4 py-2.5">
        <button onClick={onAddFood} className="mfp-btn-ghost flex items-center gap-1">
          <span className="text-lg leading-none">+</span>
          <span>Add Food to {LABEL[mealType]}</span>
        </button>
      </div>
    </div>
  );
}
