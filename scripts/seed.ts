/**
 * Seed the database with a few days of realistic sample data so the diary,
 * summary table, water tracker, and trends/patterns all have something to show.
 *
 *   npm run seed           # only seeds if the DB has no meals yet
 *   npm run seed -- --force # wipes meals & water, then reseeds
 *
 * Targets the same database as the app, switched by env:
 *   - Local:  DATABASE_URL unset -> file:./data/nutrition.db
 *   - Hosted: DATABASE_URL=libsql://<db>.turso.io + DATABASE_AUTH_TOKEN
 */
import { createClient } from '@libsql/client';
import path from 'path';
import fs from 'fs';
import type { MealType } from '../src/lib/types';

const LOCAL_DIR = path.join(process.cwd(), 'data');
const url = process.env.DATABASE_URL || `file:${path.join(LOCAL_DIR, 'nutrition.db')}`;
if (url.startsWith('file:') && !fs.existsSync(LOCAL_DIR)) fs.mkdirSync(LOCAL_DIR, { recursive: true });

const force = process.argv.includes('--force');
const db = createClient({ url, authToken: process.env.DATABASE_AUTH_TOKEN });

async function main() {
  await db.executeMultiple(`
    CREATE TABLE IF NOT EXISTS meals (
      id INTEGER PRIMARY KEY AUTOINCREMENT, date TEXT NOT NULL, meal_type TEXT NOT NULL DEFAULT 'snack',
      description TEXT NOT NULL, calories REAL NOT NULL DEFAULT 0, protein_g REAL NOT NULL DEFAULT 0,
      carbs_g REAL NOT NULL DEFAULT 0, fat_g REAL NOT NULL DEFAULT 0, fiber_g REAL NOT NULL DEFAULT 0,
      sugar_g REAL NOT NULL DEFAULT 0, sodium_mg REAL NOT NULL DEFAULT 0, notes TEXT,
      logged_at TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS water_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT, date TEXT NOT NULL, amount_ml REAL NOT NULL,
      logged_at TEXT DEFAULT (datetime('now')), notes TEXT
    );
    CREATE TABLE IF NOT EXISTS nutrition_goals (
      id INTEGER PRIMARY KEY AUTOINCREMENT, daily_calories REAL NOT NULL DEFAULT 2000,
      daily_protein_g REAL NOT NULL DEFAULT 150, daily_carbs_g REAL NOT NULL DEFAULT 250,
      daily_fat_g REAL NOT NULL DEFAULT 65, daily_fiber_g REAL, daily_sugar_g REAL,
      daily_sodium_mg REAL DEFAULT 2300, daily_water_ml REAL NOT NULL DEFAULT 2500,
      updated_at TEXT DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_meals_date ON meals(date);
    CREATE INDEX IF NOT EXISTS idx_water_date ON water_logs(date);
  `);

  if (Number((await db.execute('SELECT COUNT(*) c FROM nutrition_goals')).rows[0].c) === 0) {
    await db.execute(`INSERT INTO nutrition_goals (daily_calories,daily_protein_g,daily_carbs_g,daily_fat_g,daily_fiber_g,daily_sugar_g,daily_sodium_mg,daily_water_ml)
      VALUES (2000,150,250,65,30,50,2300,2500)`);
  }

  const existing = Number((await db.execute('SELECT COUNT(*) c FROM meals')).rows[0].c);
  if (existing > 0 && !force) {
    console.log(`DB already has ${existing} meals. Re-run with "npm run seed -- --force" to wipe and reseed.`);
    return;
  }
  if (force) {
    await db.execute('DELETE FROM meals');
    await db.execute('DELETE FROM water_logs');
    console.log('Cleared existing meals & water.');
  }

  const dateOffset = (days: number) => {
    const d = new Date();
    d.setDate(d.getDate() - days);
    return d.toISOString().split('T')[0];
  };

  type SeedMeal = [MealType, string, number, number, number, number, number, number, number];
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

  let mealCount = 0;
  for (let day = 6; day >= 0; day--) {
    const date = dateOffset(day);
    const wobble = 1 + (((day * 37) % 11) - 5) / 100; // ±5% deterministic variation
    for (const [type, desc, cal, p, c, f, fi, su, so] of TEMPLATE) {
      if (type === 'snack' && (day === 3 || day === 5) && desc === 'Apple') continue;
      await db.execute({
        sql: `INSERT INTO meals (date,meal_type,description,calories,protein_g,carbs_g,fat_g,fiber_g,sugar_g,sodium_mg)
              VALUES (?,?,?,?,?,?,?,?,?,?)`,
        args: [date, type, desc, Math.round(cal * wobble), Math.round(p * wobble), Math.round(c * wobble), Math.round(f * wobble), fi, su, so],
      });
      mealCount++;
    }
    const glasses = day % 3 === 0 ? 5 : 6;
    for (let g = 0; g < glasses; g++) {
      await db.execute({ sql: 'INSERT INTO water_logs (date,amount_ml) VALUES (?,?)', args: [date, 250] });
    }
  }

  console.log(`Seeded ${mealCount} meals and water across 7 days (through ${dateOffset(0)}).`);
  console.log('Run "npm run dev" and open http://localhost:3000 to view.');
}

main().catch(err => { console.error(err); process.exit(1); });
