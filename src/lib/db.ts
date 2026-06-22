import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import type { Meal, WaterLog, NutritionGoals, MacroTotals } from './types';

const DB_DIR = path.join(process.cwd(), 'data');
const DB_PATH = path.join(DB_DIR, 'nutrition.db');

declare global {
  // eslint-disable-next-line no-var
  var __db: Database.Database | undefined;
}

function getDb(): Database.Database {
  if (global.__db) return global.__db;

  if (!fs.existsSync(DB_DIR)) {
    fs.mkdirSync(DB_DIR, { recursive: true });
  }

  const db = new Database(DB_PATH);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  initSchema(db);

  global.__db = db;
  return db;
}

function initSchema(db: Database.Database) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS meals (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date TEXT NOT NULL,
      meal_type TEXT NOT NULL DEFAULT 'snack',
      description TEXT NOT NULL,
      calories REAL NOT NULL DEFAULT 0,
      protein_g REAL NOT NULL DEFAULT 0,
      carbs_g REAL NOT NULL DEFAULT 0,
      fat_g REAL NOT NULL DEFAULT 0,
      fiber_g REAL NOT NULL DEFAULT 0,
      sugar_g REAL NOT NULL DEFAULT 0,
      sodium_mg REAL NOT NULL DEFAULT 0,
      notes TEXT,
      logged_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS water_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date TEXT NOT NULL,
      amount_ml REAL NOT NULL,
      logged_at TEXT DEFAULT (datetime('now')),
      notes TEXT
    );

    CREATE TABLE IF NOT EXISTS nutrition_goals (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      daily_calories REAL NOT NULL DEFAULT 2000,
      daily_protein_g REAL NOT NULL DEFAULT 150,
      daily_carbs_g REAL NOT NULL DEFAULT 250,
      daily_fat_g REAL NOT NULL DEFAULT 65,
      daily_fiber_g REAL,
      daily_sugar_g REAL,
      daily_sodium_mg REAL DEFAULT 2300,
      daily_water_ml REAL NOT NULL DEFAULT 2500,
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_meals_date ON meals(date);
    CREATE INDEX IF NOT EXISTS idx_water_date ON water_logs(date);
  `);

  const goalsCount = db.prepare('SELECT COUNT(*) as count FROM nutrition_goals').get() as { count: number };
  if (goalsCount.count === 0) {
    db.prepare(`
      INSERT INTO nutrition_goals (daily_calories, daily_protein_g, daily_carbs_g, daily_fat_g, daily_sodium_mg, daily_water_ml)
      VALUES (2000, 150, 250, 65, 2300, 2500)
    `).run();
  }
}

// ── Meals ──────────────────────────────────────────────────────────────────

export function getMealsByDate(date: string): Meal[] {
  return getDb().prepare('SELECT * FROM meals WHERE date = ? ORDER BY logged_at ASC').all(date) as Meal[];
}

export function getMealsByDateRange(startDate: string, endDate: string): Meal[] {
  return getDb()
    .prepare('SELECT * FROM meals WHERE date BETWEEN ? AND ? ORDER BY date ASC, logged_at ASC')
    .all(startDate, endDate) as Meal[];
}

export function getMealById(id: number): Meal | undefined {
  return getDb().prepare('SELECT * FROM meals WHERE id = ?').get(id) as Meal | undefined;
}

export function addMeal(meal: Omit<Meal, 'id' | 'logged_at'>): Meal {
  const db = getDb();
  const result = db.prepare(`
    INSERT INTO meals (date, meal_type, description, calories, protein_g, carbs_g, fat_g, fiber_g, sugar_g, sodium_mg, notes)
    VALUES (@date, @meal_type, @description, @calories, @protein_g, @carbs_g, @fat_g, @fiber_g, @sugar_g, @sodium_mg, @notes)
  `).run(meal);
  return db.prepare('SELECT * FROM meals WHERE id = ?').get(result.lastInsertRowid) as Meal;
}

export function updateMeal(id: number, updates: Partial<Omit<Meal, 'id' | 'logged_at'>>): Meal | undefined {
  const db = getDb();
  const fields = Object.keys(updates).map(k => `${k} = @${k}`).join(', ');
  db.prepare(`UPDATE meals SET ${fields} WHERE id = @id`).run({ ...updates, id });
  return db.prepare('SELECT * FROM meals WHERE id = ?').get(id) as Meal | undefined;
}

export function deleteMeal(id: number): boolean {
  const result = getDb().prepare('DELETE FROM meals WHERE id = ?').run(id);
  return result.changes > 0;
}

// ── Water ──────────────────────────────────────────────────────────────────

export function getWaterByDate(date: string): WaterLog[] {
  return getDb().prepare('SELECT * FROM water_logs WHERE date = ? ORDER BY logged_at ASC').all(date) as WaterLog[];
}

export function getWaterByDateRange(startDate: string, endDate: string): WaterLog[] {
  return getDb()
    .prepare('SELECT * FROM water_logs WHERE date BETWEEN ? AND ? ORDER BY date ASC, logged_at ASC')
    .all(startDate, endDate) as WaterLog[];
}

export function addWater(water: Omit<WaterLog, 'id' | 'logged_at'>): WaterLog {
  const db = getDb();
  const result = db.prepare(`
    INSERT INTO water_logs (date, amount_ml, notes) VALUES (@date, @amount_ml, @notes)
  `).run(water);
  return db.prepare('SELECT * FROM water_logs WHERE id = ?').get(result.lastInsertRowid) as WaterLog;
}

export function deleteWater(id: number): boolean {
  const result = getDb().prepare('DELETE FROM water_logs WHERE id = ?').run(id);
  return result.changes > 0;
}

// ── Goals ──────────────────────────────────────────────────────────────────

export function getGoals(): NutritionGoals {
  return getDb().prepare('SELECT * FROM nutrition_goals ORDER BY id DESC LIMIT 1').get() as NutritionGoals;
}

export function updateGoals(goals: Partial<Omit<NutritionGoals, 'id' | 'updated_at'>>): NutritionGoals {
  const db = getDb();
  const current = getGoals();
  const merged = { ...current, ...goals };
  db.prepare(`
    UPDATE nutrition_goals SET
      daily_calories = @daily_calories,
      daily_protein_g = @daily_protein_g,
      daily_carbs_g = @daily_carbs_g,
      daily_fat_g = @daily_fat_g,
      daily_fiber_g = @daily_fiber_g,
      daily_sugar_g = @daily_sugar_g,
      daily_sodium_mg = @daily_sodium_mg,
      daily_water_ml = @daily_water_ml,
      updated_at = datetime('now')
    WHERE id = @id
  `).run(merged);
  return getGoals();
}

// ── Settings ───────────────────────────────────────────────────────────────

export function getSetting(key: string): string | null {
  const row = getDb().prepare('SELECT value FROM settings WHERE key = ?').get(key) as { value: string } | undefined;
  return row?.value ?? null;
}

export function setSetting(key: string, value: string): void {
  getDb().prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)').run(key, value);
}

// ── Aggregates ─────────────────────────────────────────────────────────────

export function getDayTotals(date: string): MacroTotals {
  const row = getDb().prepare(`
    SELECT
      COALESCE(SUM(calories), 0) as calories,
      COALESCE(SUM(protein_g), 0) as protein_g,
      COALESCE(SUM(carbs_g), 0) as carbs_g,
      COALESCE(SUM(fat_g), 0) as fat_g,
      COALESCE(SUM(fiber_g), 0) as fiber_g,
      COALESCE(SUM(sugar_g), 0) as sugar_g,
      COALESCE(SUM(sodium_mg), 0) as sodium_mg
    FROM meals WHERE date = ?
  `).get(date) as Omit<MacroTotals, 'water_ml'>;

  const waterRow = getDb().prepare(`
    SELECT COALESCE(SUM(amount_ml), 0) as water_ml FROM water_logs WHERE date = ?
  `).get(date) as { water_ml: number };

  return { ...row, water_ml: waterRow.water_ml };
}

export function getTrends(days: number, endDate: string) {
  const db = getDb();
  const rows = db.prepare(`
    SELECT
      date,
      SUM(calories) as calories,
      SUM(protein_g) as protein_g,
      SUM(carbs_g) as carbs_g,
      SUM(fat_g) as fat_g
    FROM meals
    WHERE date <= ? AND date >= date(?, '-' || ? || ' days')
    GROUP BY date
    ORDER BY date
  `).all(endDate, endDate, days) as Array<{ date: string; calories: number; protein_g: number; carbs_g: number; fat_g: number }>;

  if (rows.length === 0) return { rows: [], averages: null, streakDays: 0 };

  const avg = {
    calories: rows.reduce((s, r) => s + r.calories, 0) / rows.length,
    protein_g: rows.reduce((s, r) => s + r.protein_g, 0) / rows.length,
    carbs_g: rows.reduce((s, r) => s + r.carbs_g, 0) / rows.length,
    fat_g: rows.reduce((s, r) => s + r.fat_g, 0) / rows.length,
  };

  return { rows, averages: avg, loggedDays: rows.length };
}

export function getAllMealsForExport(): Meal[] {
  return getDb().prepare('SELECT * FROM meals ORDER BY date ASC, logged_at ASC').all() as Meal[];
}
