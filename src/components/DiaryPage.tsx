'use client';

import { useEffect, useState, useCallback } from 'react';
import type { DaySummary, Meal, MealType } from '@/lib/types';
import DateNav from './DateNav';
import CalorieSummary from './CalorieSummary';
import MealSection from './MealSection';
import NutritionSummary from './NutritionSummary';
import WaterSection from './WaterSection';
import AddFoodModal from './AddFoodModal';

const MEAL_ORDER: MealType[] = ['breakfast', 'lunch', 'dinner', 'snack'];

interface ModalState {
  open: boolean;
  mealType: MealType;
  editing: Meal | null;
}

export default function DiaryPage({ date }: { date: string }) {
  const [summary, setSummary] = useState<DaySummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<ModalState>({ open: false, mealType: 'snack', editing: null });

  const fetchSummary = useCallback(async () => {
    const res = await fetch(`/api/summary?date=${date}`);
    const data = await res.json();
    setSummary(data);
    setLoading(false);
  }, [date]);

  useEffect(() => {
    setLoading(true);
    fetchSummary();
  }, [fetchSummary]);

  const openAdd = (mealType: MealType) => setModal({ open: true, mealType, editing: null });
  const openEdit = (meal: Meal) => setModal({ open: true, mealType: meal.meal_type, editing: meal });
  const closeModal = () => setModal(m => ({ ...m, open: false, editing: null }));

  const handleDeleteMeal = async (id: number) => {
    await fetch(`/api/meals/${id}`, { method: 'DELETE' });
    fetchSummary();
  };

  const handleAddWater = async (amount_ml: number) => {
    await fetch('/api/water', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ date, amount_ml }),
    });
    fetchSummary();
  };

  const handleDeleteWater = async (id: number) => {
    await fetch(`/api/water/${id}`, { method: 'DELETE' });
    fetchSummary();
  };

  const handleModalSave = async (data: Omit<Meal, 'id' | 'logged_at'>) => {
    if (modal.editing) {
      await fetch(`/api/meals/${modal.editing.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
    } else {
      await fetch('/api/meals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...data, date }),
      });
    }
    closeModal();
    fetchSummary();
  };

  if (loading || !summary) {
    return (
      <div className="flex items-center justify-center py-20 text-mfp-muted">
        Loading...
      </div>
    );
  }

  const mealsByType = MEAL_ORDER.reduce((acc, type) => {
    acc[type] = summary.meals.filter(m => m.meal_type === type);
    return acc;
  }, {} as Record<MealType, Meal[]>);

  return (
    <div className="space-y-3">
      <DateNav date={date} />
      <CalorieSummary goals={summary.goals} totals={summary.totals} />

      {MEAL_ORDER.map(type => (
        <MealSection
          key={type}
          mealType={type}
          meals={mealsByType[type]}
          onAddFood={() => openAdd(type)}
          onEditMeal={openEdit}
          onDeleteMeal={handleDeleteMeal}
        />
      ))}

      <NutritionSummary goals={summary.goals} totals={summary.totals} />
      <WaterSection
        logs={summary.water_logs}
        goalMl={summary.goals.daily_water_ml}
        onAdd={handleAddWater}
        onDelete={handleDeleteWater}
      />

      {modal.open && (
        <AddFoodModal
          mealType={modal.mealType}
          editing={modal.editing}
          onSave={handleModalSave}
          onClose={closeModal}
        />
      )}
    </div>
  );
}
