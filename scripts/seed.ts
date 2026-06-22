/**
 * Seed the local database with a few days of realistic sample data so the
 * diary, summary table, water tracker, and trends/patterns all have something
 * to show.
 *
 *   npm run seed           # only seeds if the DB has no meals yet
 *   npm run seed -- --force # wipes meals & water, then reseeds
 *
 * Writes directly to data/nutrition.db (the same file the web app and MCP
 * server use), so it works whether or not the dev server is running.
 */
import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import type { MealType } from '../src/lib/types';

const DB_DIR = path.join(process.cwd(), 'data');
const DB_PATH = path.join(DB_DIR, 'nutrition.db');
const force = process.argv.includes('--force');

if (!fs.existsSync(DB_DIR)) fs.mkdirSync(DB_DIR, { recursive: true });

const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');

// Ensure schema exists (mirrors src/lib/db.ts) so seed works on a fresh clone.
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
  CREATE INDEX IF NOT EXISTS idx_meals_date ON meals(date);
  CREATE INDEX IF NOT EXISTS idx_water_date ON water_logs(date);
`);

if ((db.prepare('SELECT COUNT(*) as c FROM nutrition_goals').get() as { c: number }).c === 0) {
  db.prepare(
    `INSERT INTO nutrition_goals (daily_calories,daily_protein_g,daily_carbs_g,daily_fat_g,daily_fiber_g,daily_sugar_g,daily_sodium_mg,daily_water_ml)
     VALUES (2000,150,250,65,30,50,2300,2500)`
  ).run();
}

const existing = (db.prepare('SELECT COUNT(*) as c FROM meals').get() as { c: number }).c;
if (existing > 0 && !force) {
  console.log(`DB already has ${existing} meals. Re-run with "npm run seed -- --force" to wipe and reseed.`);
  process.exit(0);
}
if (force) {
  db.prepare('DELETE FROM meals').run();
  db.prepare('DELETE FROM water_logs').run();
  console.log('Cleared existing meals & water.');
}

function dateOffset(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().split('T')[0];
}

type SeedMeal = [MealType, string, number, number, number, number, number, number, number];
// [meal_type, description, cal, protein, carbs, fat, fiber, sugar, sodium]
const TEMPLATE: SeedMeal[] = [
  ['breakfast', 'Oatmeal with blueberries', 290, 10, 54, 5, 8, 14, 115],
  ['breakfast', 'Black coffee', 5, 0, 1, 0, 0, 0, 5],
  ['breakfast', 'Greek yogurt, plain 1 cup', 130, 22, 9, 0, 0, 7, 80],
  ['lunch', 'Grilled chicken salad', 420, 38, 18, 22, 6, 6, 540],
  ['lunch', 'Whole wheat roll', 120, 4, 23, 2, 3, 2, 200],
  ['dinner', 'Salmon fillet, baked 6oz', 350, 40, 0, 21, 0, 0, 110],
  ['dinner', 'Brown rice, 1 cup', 215, 5, 45, 2, 4, 1, 10],
  ['dinner', 'Steamed broccoli', 55, 4, 11, 1, 5, 2, 65],
  ['snack', 'Almonds, 1oz', 165, 6, 6, 14, 4, 1, 0],
  ['snack', 'Apple', 95, 0, 25, 0, 4, 19, 2],
];

const insertMeal = db.prepare(`
  INSERT INTO meals (date,meal_type,description,calories,protein_g,carbs_g,fat_g,fiber_g,sugar_g,sodium_mg)
  VALUES (?,?,?,?,?,?,?,?,?,?)
`);
const insertWater = db.prepare('INSERT INTO water_logs (date,amount_ml) VALUES (?,?)');

// Seed the last 7 days, with small daily variation so trends look natural.
let mealCount = 0;
for (let day = 6; day >= 0; day--) {
  const date = dateOffset(day);
  const wobble = 1 + (((day * 37) % 11) - 5) / 100; // ±5% deterministic variation
  for (const [type, desc, cal, p, c, f, fi, su, so] of TEMPLATE) {
    // Occasionally skip a snack on a couple of days for realistic patterns.
    if (type === 'snack' && (day === 3 || day === 5) && desc === 'Apple') continue;
    insertMeal.run(
      date, type, desc,
      Math.round(cal * wobble), Math.round(p * wobble), Math.round(c * wobble),
      Math.round(f * wobble), fi, su, so
    );
    mealCount++;
  }
  // Water: 5-6 glasses spread across the day.
  const glasses = day % 3 === 0 ? 5 : 6;
  for (let g = 0; g < glasses; g++) insertWater.run(date, 250);
}

console.log(`Seeded ${mealCount} meals and water across 7 days (through ${dateOffset(0)}).`);
console.log('Run "npm run dev" and open http://localhost:3000 to view.');
