import { createClient, type Client, type InValue } from '@libsql/client';
import path from 'path';
import fs from 'fs';
import type { Meal, WaterLog, NutritionGoals, MacroTotals } from './types';

// One client serves both local dev and production:
//   - Local:  DATABASE_URL unset  -> file:./data/nutrition.db
//   - Hosted: DATABASE_URL=libsql://<db>.turso.io + DATABASE_AUTH_TOKEN
const LOCAL_DIR = path.join(process.cwd(), 'data');
const LOCAL_FILE = `file:${path.join(LOCAL_DIR, 'nutrition.db')}`;

declare global {
  // eslint-disable-next-line no-var
  var __dbClient: Client | undefined;
  // eslint-disable-next-line no-var
  var __dbReady: Promise<void> | undefined;
}

function client(): Client {
  if (global.__dbClient) return global.__dbClient;

  const url = process.env.DATABASE_URL || LOCAL_FILE;
  if (url.startsWith('file:') && !fs.existsSync(LOCAL_DIR)) {
    fs.mkdirSync(LOCAL_DIR, { recursive: true });
  }

  global.__dbClient = createClient({
    url,
    authToken: process.env.DATABASE_AUTH_TOKEN,
  });
  return global.__dbClient;
}

const SCHEMA = `
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
`;

async function ready(): Promise<Client> {
  const c = client();
  if (!global.__dbReady) {
    global.__dbReady = (async () => {
      await c.executeMultiple(SCHEMA);
      const count = await c.execute('SELECT COUNT(*) as count FROM nutrition_goals');
      if (Number(count.rows[0].count) === 0) {
        await c.execute(`
          INSERT INTO nutrition_goals (daily_calories, daily_protein_g, daily_carbs_g, daily_fat_g, daily_sodium_mg, daily_water_ml)
          VALUES (2000, 150, 250, 65, 2300, 2500)
        `);
      }
    })();
  }
  await global.__dbReady;
  return c;
}

// ── Meals ──────────────────────────────────────────────────────────────────

export async function getMealsByDate(date: string): Promise<Meal[]> {
  const c = await ready();
  const rs = await c.execute({ sql: 'SELECT * FROM meals WHERE date = ? ORDER BY logged_at ASC', args: [date] });
  return rs.rows as unknown as Meal[];
}

export async function getMealsByDateRange(startDate: string, endDate: string): Promise<Meal[]> {
  const c = await ready();
  const rs = await c.execute({
    sql: 'SELECT * FROM meals WHERE date BETWEEN ? AND ? ORDER BY date ASC, logged_at ASC',
    args: [startDate, endDate],
  });
  return rs.rows as unknown as Meal[];
}

export async function getMealById(id: number): Promise<Meal | undefined> {
  const c = await ready();
  const rs = await c.execute({ sql: 'SELECT * FROM meals WHERE id = ?', args: [id] });
  return rs.rows[0] as unknown as Meal | undefined;
}

export async function addMeal(meal: Omit<Meal, 'id' | 'logged_at'>): Promise<Meal> {
  const c = await ready();
  const rs = await c.execute({
    sql: `INSERT INTO meals (date, meal_type, description, calories, protein_g, carbs_g, fat_g, fiber_g, sugar_g, sodium_mg, notes)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) RETURNING *`,
    args: [meal.date, meal.meal_type, meal.description, meal.calories, meal.protein_g, meal.carbs_g,
      meal.fat_g, meal.fiber_g, meal.sugar_g, meal.sodium_mg, meal.notes],
  });
  return rs.rows[0] as unknown as Meal;
}

export async function updateMeal(id: number, updates: Partial<Omit<Meal, 'id' | 'logged_at'>>): Promise<Meal | undefined> {
  const c = await ready();
  const keys = Object.keys(updates);
  if (keys.length === 0) return getMealById(id);
  const setClause = keys.map(k => `${k} = ?`).join(', ');
  const args = [...keys.map(k => (updates as Record<string, InValue>)[k]), id];
  const rs = await c.execute({ sql: `UPDATE meals SET ${setClause} WHERE id = ? RETURNING *`, args });
  return rs.rows[0] as unknown as Meal | undefined;
}

export async function deleteMeal(id: number): Promise<boolean> {
  const c = await ready();
  const rs = await c.execute({ sql: 'DELETE FROM meals WHERE id = ?', args: [id] });
  return rs.rowsAffected > 0;
}

// ── Water ──────────────────────────────────────────────────────────────────

export async function getWaterByDate(date: string): Promise<WaterLog[]> {
  const c = await ready();
  const rs = await c.execute({ sql: 'SELECT * FROM water_logs WHERE date = ? ORDER BY logged_at ASC', args: [date] });
  return rs.rows as unknown as WaterLog[];
}

export async function getWaterByDateRange(startDate: string, endDate: string): Promise<WaterLog[]> {
  const c = await ready();
  const rs = await c.execute({
    sql: 'SELECT * FROM water_logs WHERE date BETWEEN ? AND ? ORDER BY date ASC, logged_at ASC',
    args: [startDate, endDate],
  });
  return rs.rows as unknown as WaterLog[];
}

export async function addWater(water: Omit<WaterLog, 'id' | 'logged_at'>): Promise<WaterLog> {
  const c = await ready();
  const rs = await c.execute({
    sql: 'INSERT INTO water_logs (date, amount_ml, notes) VALUES (?, ?, ?) RETURNING *',
    args: [water.date, water.amount_ml, water.notes],
  });
  return rs.rows[0] as unknown as WaterLog;
}

export async function deleteWater(id: number): Promise<boolean> {
  const c = await ready();
  const rs = await c.execute({ sql: 'DELETE FROM water_logs WHERE id = ?', args: [id] });
  return rs.rowsAffected > 0;
}

// ── Goals ──────────────────────────────────────────────────────────────────

export async function getGoals(): Promise<NutritionGoals> {
  const c = await ready();
  const rs = await c.execute('SELECT * FROM nutrition_goals ORDER BY id DESC LIMIT 1');
  return rs.rows[0] as unknown as NutritionGoals;
}

export async function updateGoals(goals: Partial<Omit<NutritionGoals, 'id' | 'updated_at'>>): Promise<NutritionGoals> {
  const c = await ready();
  const current = await getGoals();
  const merged = { ...current, ...goals };
  await c.execute({
    sql: `UPDATE nutrition_goals SET
      daily_calories = ?, daily_protein_g = ?, daily_carbs_g = ?, daily_fat_g = ?,
      daily_fiber_g = ?, daily_sugar_g = ?, daily_sodium_mg = ?, daily_water_ml = ?,
      updated_at = datetime('now') WHERE id = ?`,
    args: [merged.daily_calories, merged.daily_protein_g, merged.daily_carbs_g, merged.daily_fat_g,
      merged.daily_fiber_g, merged.daily_sugar_g, merged.daily_sodium_mg, merged.daily_water_ml, merged.id],
  });
  return getGoals();
}

// ── Settings ───────────────────────────────────────────────────────────────

export async function getSetting(key: string): Promise<string | null> {
  const c = await ready();
  const rs = await c.execute({ sql: 'SELECT value FROM settings WHERE key = ?', args: [key] });
  return rs.rows[0] ? (rs.rows[0].value as string) : null;
}

export async function setSetting(key: string, value: string): Promise<void> {
  const c = await ready();
  await c.execute({ sql: 'INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)', args: [key, value] });
}

// ── Aggregates ─────────────────────────────────────────────────────────────

export async function getDayTotals(date: string): Promise<MacroTotals> {
  const c = await ready();
  const rs = await c.execute({
    sql: `SELECT
      COALESCE(SUM(calories), 0) as calories,
      COALESCE(SUM(protein_g), 0) as protein_g,
      COALESCE(SUM(carbs_g), 0) as carbs_g,
      COALESCE(SUM(fat_g), 0) as fat_g,
      COALESCE(SUM(fiber_g), 0) as fiber_g,
      COALESCE(SUM(sugar_g), 0) as sugar_g,
      COALESCE(SUM(sodium_mg), 0) as sodium_mg
    FROM meals WHERE date = ?`,
    args: [date],
  });
  const water = await c.execute({ sql: 'SELECT COALESCE(SUM(amount_ml), 0) as water_ml FROM water_logs WHERE date = ?', args: [date] });
  const row = rs.rows[0];
  return {
    calories: Number(row.calories), protein_g: Number(row.protein_g), carbs_g: Number(row.carbs_g),
    fat_g: Number(row.fat_g), fiber_g: Number(row.fiber_g), sugar_g: Number(row.sugar_g),
    sodium_mg: Number(row.sodium_mg), water_ml: Number(water.rows[0].water_ml),
  };
}

export async function getAllMealsForExport(): Promise<Meal[]> {
  const c = await ready();
  const rs = await c.execute('SELECT * FROM meals ORDER BY date ASC, logged_at ASC');
  return rs.rows as unknown as Meal[];
}
