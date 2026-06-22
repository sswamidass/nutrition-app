export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack';

export interface Meal {
  id: number;
  date: string;
  meal_type: MealType;
  description: string;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  fiber_g: number;
  sugar_g: number;
  sodium_mg: number;
  notes: string | null;
  logged_at: string;
}

export interface WaterLog {
  id: number;
  date: string;
  amount_ml: number;
  logged_at: string;
  notes: string | null;
}

export interface NutritionGoals {
  id: number;
  daily_calories: number;
  daily_protein_g: number;
  daily_carbs_g: number;
  daily_fat_g: number;
  daily_fiber_g: number | null;
  daily_sugar_g: number | null;
  daily_sodium_mg: number | null;
  daily_water_ml: number;
  updated_at: string;
}

export interface MacroTotals {
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  fiber_g: number;
  sugar_g: number;
  sodium_mg: number;
  water_ml: number;
}

export interface DaySummary {
  date: string;
  meals: Meal[];
  water_logs: WaterLog[];
  goals: NutritionGoals;
  totals: MacroTotals;
}
