import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

// ── Database ────────────────────────────────────────────────────────────────

const DB_DIR = path.join(process.cwd(), 'data');
const DB_PATH = path.join(DB_DIR, 'nutrition.db');

if (!fs.existsSync(DB_DIR)) fs.mkdirSync(DB_DIR, { recursive: true });

const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

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
  db.prepare(`INSERT INTO nutrition_goals (daily_calories,daily_protein_g,daily_carbs_g,daily_fat_g,daily_sodium_mg,daily_water_ml) VALUES (2000,150,250,65,2300,2500)`).run();
}

// ── Helpers ─────────────────────────────────────────────────────────────────

function today(): string {
  const tz = (db.prepare("SELECT value FROM settings WHERE key='timezone'").get() as { value: string } | undefined)?.value;
  if (tz) {
    return new Date().toLocaleDateString('en-CA', { timeZone: tz });
  }
  return new Date().toISOString().split('T')[0];
}

function getGoals() {
  return db.prepare('SELECT * FROM nutrition_goals ORDER BY id DESC LIMIT 1').get() as Record<string, number | string | null>;
}

function dayTotals(date: string) {
  const meals = db.prepare('SELECT COALESCE(SUM(calories),0) as cal, COALESCE(SUM(protein_g),0) as pro, COALESCE(SUM(carbs_g),0) as carb, COALESCE(SUM(fat_g),0) as fat FROM meals WHERE date=?').get(date) as { cal: number; pro: number; carb: number; fat: number };
  const water = db.prepare('SELECT COALESCE(SUM(amount_ml),0) as ml FROM water_logs WHERE date=?').get(date) as { ml: number };
  return { calories: meals.cal, protein_g: meals.pro, carbs_g: meals.carb, fat_g: meals.fat, water_ml: water.ml };
}

function text(obj: unknown): { content: [{ type: 'text'; text: string }] } {
  return { content: [{ type: 'text', text: typeof obj === 'string' ? obj : JSON.stringify(obj, null, 2) }] };
}

// ── Server ──────────────────────────────────────────────────────────────────

const server = new McpServer({ name: 'nutrition', version: '1.0.0' });

// log_meal
server.tool('log_meal', 'Log a meal entry with nutritional information', {
  description: z.string().describe('Food name and description'),
  meal_type: z.enum(['breakfast', 'lunch', 'dinner', 'snack']).default('snack'),
  calories: z.number().min(0).default(0),
  protein_g: z.number().min(0).default(0),
  carbs_g: z.number().min(0).default(0),
  fat_g: z.number().min(0).default(0),
  fiber_g: z.number().min(0).default(0),
  sugar_g: z.number().min(0).default(0),
  sodium_mg: z.number().min(0).default(0),
  logged_at: z.string().optional().describe('ISO date YYYY-MM-DD, defaults to today'),
  notes: z.string().optional(),
}, (args) => {
  const date = args.logged_at ?? today();
  const result = db.prepare(`
    INSERT INTO meals (date,meal_type,description,calories,protein_g,carbs_g,fat_g,fiber_g,sugar_g,sodium_mg,notes)
    VALUES (?,?,?,?,?,?,?,?,?,?,?)
  `).run(date, args.meal_type, args.description, args.calories, args.protein_g, args.carbs_g, args.fat_g, args.fiber_g, args.sugar_g, args.sodium_mg, args.notes ?? null);
  const meal = db.prepare('SELECT * FROM meals WHERE id=?').get(result.lastInsertRowid);
  const totals = dayTotals(date);
  const goals = getGoals();
  return text({ meal, day_totals: totals, calories_remaining: Number(goals.daily_calories) - totals.calories });
});

// get_meals_today
server.tool('get_meals_today', 'Get all meals logged today', {}, () => {
  const date = today();
  const meals = db.prepare('SELECT * FROM meals WHERE date=? ORDER BY logged_at').all(date);
  const totals = dayTotals(date);
  return text({ date, meals, totals });
});

// get_meals_by_date
server.tool('get_meals_by_date', 'Get all meals for a specific date', {
  date: z.string().describe('YYYY-MM-DD'),
}, (args) => {
  const meals = db.prepare('SELECT * FROM meals WHERE date=? ORDER BY logged_at').all(args.date);
  const totals = dayTotals(args.date);
  return text({ date: args.date, meals, totals });
});

// get_meals_by_date_range
server.tool('get_meals_by_date_range', 'Get all meals between two dates (inclusive)', {
  start_date: z.string().describe('YYYY-MM-DD'),
  end_date: z.string().describe('YYYY-MM-DD'),
}, (args) => {
  const meals = db.prepare('SELECT * FROM meals WHERE date BETWEEN ? AND ? ORDER BY date,logged_at').all(args.start_date, args.end_date);
  return text({ start_date: args.start_date, end_date: args.end_date, meals, count: meals.length });
});

// update_meal
server.tool('update_meal', 'Update fields of an existing meal entry', {
  id: z.number().int(),
  description: z.string().optional(),
  meal_type: z.enum(['breakfast', 'lunch', 'dinner', 'snack']).optional(),
  calories: z.number().min(0).optional(),
  protein_g: z.number().min(0).optional(),
  carbs_g: z.number().min(0).optional(),
  fat_g: z.number().min(0).optional(),
  fiber_g: z.number().min(0).optional(),
  sugar_g: z.number().min(0).optional(),
  sodium_mg: z.number().min(0).optional(),
  notes: z.string().optional(),
}, (args) => {
  const { id, ...updates } = args;
  const fields = Object.keys(updates).filter(k => updates[k as keyof typeof updates] !== undefined);
  if (fields.length === 0) return text('No fields to update');
  const setClause = fields.map(f => `${f}=@${f}`).join(', ');
  db.prepare(`UPDATE meals SET ${setClause} WHERE id=@id`).run({ ...updates, id });
  const meal = db.prepare('SELECT * FROM meals WHERE id=?').get(id);
  return text({ updated: meal });
});

// delete_meal
server.tool('delete_meal', 'Delete a meal entry by ID', {
  id: z.number().int(),
}, (args) => {
  const result = db.prepare('DELETE FROM meals WHERE id=?').run(args.id);
  return text({ deleted: result.changes > 0, id: args.id });
});

// set_nutrition_goals
server.tool('set_nutrition_goals', "Set the user's daily calorie and macro targets", {
  daily_calories: z.number().min(0).optional(),
  daily_protein_g: z.number().min(0).optional(),
  daily_carbs_g: z.number().min(0).optional(),
  daily_fat_g: z.number().min(0).optional(),
  daily_fiber_g: z.number().min(0).optional(),
  daily_sugar_g: z.number().min(0).optional(),
  daily_sodium_mg: z.number().min(0).optional(),
  daily_water_ml: z.number().min(0).optional(),
}, (args) => {
  const current = getGoals() as Record<string, unknown>;
  const merged = { ...current, ...Object.fromEntries(Object.entries(args).filter(([, v]) => v !== undefined)) };
  db.prepare(`
    UPDATE nutrition_goals SET
      daily_calories=@daily_calories, daily_protein_g=@daily_protein_g,
      daily_carbs_g=@daily_carbs_g, daily_fat_g=@daily_fat_g,
      daily_fiber_g=@daily_fiber_g, daily_sugar_g=@daily_sugar_g,
      daily_sodium_mg=@daily_sodium_mg, daily_water_ml=@daily_water_ml,
      updated_at=datetime('now')
    WHERE id=@id
  `).run(merged);
  return text({ goals: getGoals() });
});

// get_nutrition_goals
server.tool('get_nutrition_goals', "Get the user's current daily calorie and macro targets", {}, () => {
  return text(getGoals());
});

// get_goal_progress
server.tool('get_goal_progress', 'Get progress against daily nutrition goals for a specific date', {
  date: z.string().optional().describe('YYYY-MM-DD, defaults to today'),
}, (args) => {
  const date = args.date ?? today();
  const totals = dayTotals(date);
  const goals = getGoals() as Record<string, number>;
  return text({
    date,
    calories: { goal: goals.daily_calories, eaten: totals.calories, remaining: goals.daily_calories - totals.calories, pct: Math.round((totals.calories / goals.daily_calories) * 100) },
    protein_g: { goal: goals.daily_protein_g, eaten: totals.protein_g, remaining: goals.daily_protein_g - totals.protein_g },
    carbs_g: { goal: goals.daily_carbs_g, eaten: totals.carbs_g, remaining: goals.daily_carbs_g - totals.carbs_g },
    fat_g: { goal: goals.daily_fat_g, eaten: totals.fat_g, remaining: goals.daily_fat_g - totals.fat_g },
    water_ml: { goal: goals.daily_water_ml, consumed: totals.water_ml, remaining: goals.daily_water_ml - totals.water_ml },
  });
});

// get_nutrition_summary
server.tool('get_nutrition_summary', 'Get daily nutrition totals for a date range', {
  start_date: z.string().describe('YYYY-MM-DD'),
  end_date: z.string().describe('YYYY-MM-DD'),
}, (args) => {
  const rows = db.prepare(`
    SELECT date, SUM(calories) as calories, SUM(protein_g) as protein_g, SUM(carbs_g) as carbs_g, SUM(fat_g) as fat_g
    FROM meals WHERE date BETWEEN ? AND ? GROUP BY date ORDER BY date
  `).all(args.start_date, args.end_date) as Array<{ date: string; calories: number; protein_g: number; carbs_g: number; fat_g: number }>;
  const goals = getGoals() as Record<string, number>;
  return text({ rows: rows.map(r => ({ ...r, calorie_pct: Math.round((r.calories / goals.daily_calories) * 100) })), goals });
});

// log_water
server.tool('log_water', 'Log a hydration entry', {
  amount_ml: z.number().min(1).describe('Amount in ml. Tip: 1 cup ≈ 240ml, 1 oz ≈ 30ml'),
  logged_at: z.string().optional().describe('YYYY-MM-DD, defaults to today'),
  notes: z.string().optional(),
}, (args) => {
  const date = args.logged_at ?? today();
  const result = db.prepare('INSERT INTO water_logs (date,amount_ml,notes) VALUES (?,?,?)').run(date, args.amount_ml, args.notes ?? null);
  const entry = db.prepare('SELECT * FROM water_logs WHERE id=?').get(result.lastInsertRowid);
  const waterRow = db.prepare('SELECT COALESCE(SUM(amount_ml),0) as total FROM water_logs WHERE date=?').get(date) as { total: number };
  const goals = getGoals() as Record<string, number>;
  return text({ entry, day_total_ml: waterRow.total, goal_ml: goals.daily_water_ml, remaining_ml: goals.daily_water_ml - waterRow.total });
});

// get_water_today
server.tool('get_water_today', "Get today's total water intake", {}, () => {
  const date = today();
  const logs = db.prepare('SELECT * FROM water_logs WHERE date=? ORDER BY logged_at').all(date);
  const total = (logs as Array<{ amount_ml: number }>).reduce((s, l) => s + l.amount_ml, 0);
  const goals = getGoals() as Record<string, number>;
  return text({ date, logs, total_ml: total, goal_ml: goals.daily_water_ml, remaining_ml: goals.daily_water_ml - total });
});

// get_water_by_date
server.tool('get_water_by_date', 'Get water intake for a specific date', {
  date: z.string().describe('YYYY-MM-DD'),
}, (args) => {
  const logs = db.prepare('SELECT * FROM water_logs WHERE date=? ORDER BY logged_at').all(args.date);
  const total = (logs as Array<{ amount_ml: number }>).reduce((s, l) => s + l.amount_ml, 0);
  return text({ date: args.date, logs, total_ml: total });
});

// delete_water
server.tool('delete_water', 'Delete a water log entry by ID', {
  id: z.number().int(),
}, (args) => {
  const result = db.prepare('DELETE FROM water_logs WHERE id=?').run(args.id);
  return text({ deleted: result.changes > 0, id: args.id });
});

// get_trends
server.tool('get_trends', 'Rolling averages, streaks, and daily breakdowns', {
  days: z.number().int().min(2).max(365).default(30),
  end_date: z.string().optional().describe('YYYY-MM-DD, defaults to today'),
}, (args) => {
  const end = args.end_date ?? today();
  const rows = db.prepare(`
    SELECT date, SUM(calories) as cal, SUM(protein_g) as pro, SUM(carbs_g) as carb, SUM(fat_g) as fat
    FROM meals WHERE date<=? AND date>=date(?,'-'||?||' days') GROUP BY date ORDER BY date
  `).all(end, end, args.days) as Array<{ date: string; cal: number; pro: number; carb: number; fat: number }>;

  if (rows.length === 0) return text({ message: 'No data in range', days: args.days, end_date: end });

  const avg = (arr: number[]) => arr.reduce((s, v) => s + v, 0) / arr.length;
  const cals = rows.map(r => r.cal);
  const avgCal = avg(cals);
  const stdDev = Math.sqrt(avg(cals.map(c => Math.pow(c - avgCal, 2))));

  return text({
    period: { days: args.days, end_date: end, logged_days: rows.length },
    averages: { calories: Math.round(avgCal), protein_g: Math.round(avg(rows.map(r => r.pro))), carbs_g: Math.round(avg(rows.map(r => r.carb))), fat_g: Math.round(avg(rows.map(r => r.fat))) },
    variability: { std_dev_calories: Math.round(stdDev), cv_pct: Math.round((stdDev / avgCal) * 100) },
    best_day: rows.reduce((a, b) => a.cal > b.cal ? a : b),
    daily: rows,
  });
});

// get_meal_patterns
server.tool('get_meal_patterns', 'Behavioural patterns: meal-type rates, weekday vs weekend', {
  days: z.number().int().min(7).max(365).default(30),
  end_date: z.string().optional(),
}, (args) => {
  const end = args.end_date ?? today();
  const meals = db.prepare(`
    SELECT date, meal_type, calories FROM meals
    WHERE date<=? AND date>=date(?,'-'||?||' days')
  `).all(end, end, args.days) as Array<{ date: string; meal_type: string; calories: number }>;

  const dates = [...new Set(meals.map(m => m.date))];
  const loggedDays = dates.length;
  if (loggedDays === 0) return text({ message: 'No data in range' });

  const mealTypeRate = ['breakfast', 'lunch', 'dinner', 'snack'].map(type => {
    const daysWithType = dates.filter(d => meals.some(m => m.date === d && m.meal_type === type)).length;
    return { meal_type: type, days_logged: daysWithType, rate_pct: Math.round((daysWithType / loggedDays) * 100) };
  });

  const weekdayCals = meals.filter(m => { const d = new Date(m.date + 'T00:00:00').getDay(); return d > 0 && d < 6; }).reduce((s, m) => s + m.calories, 0);
  const weekendCals = meals.filter(m => { const d = new Date(m.date + 'T00:00:00').getDay(); return d === 0 || d === 6; }).reduce((s, m) => s + m.calories, 0);
  const weekdayDays = dates.filter(d => { const day = new Date(d + 'T00:00:00').getDay(); return day > 0 && day < 6; }).length;
  const weekendDays = dates.filter(d => { const day = new Date(d + 'T00:00:00').getDay(); return day === 0 || day === 6; }).length;

  return text({
    period: { days: args.days, logged_days: loggedDays },
    meal_type_rates: mealTypeRate,
    weekday_avg_calories: weekdayDays > 0 ? Math.round(weekdayCals / weekdayDays) : null,
    weekend_avg_calories: weekendDays > 0 ? Math.round(weekendCals / weekendDays) : null,
  });
});

// export_meals
server.tool('export_meals', 'Export all logged meals as CSV text', {}, () => {
  const meals = db.prepare('SELECT * FROM meals ORDER BY date,logged_at').all() as Array<Record<string, unknown>>;
  if (meals.length === 0) return text('No meals to export.');

  const headers = ['id', 'date', 'meal_type', 'description', 'calories', 'protein_g', 'carbs_g', 'fat_g', 'fiber_g', 'sugar_g', 'sodium_mg', 'notes', 'logged_at'];
  const csv = [
    headers.join(','),
    ...meals.map(m => headers.map(h => {
      const v = m[h] ?? '';
      return typeof v === 'string' && (v.includes(',') || v.includes('"')) ? `"${String(v).replace(/"/g, '""')}"` : v;
    }).join(',')),
  ].join('\n');

  return text(csv);
});

// set_timezone
server.tool('set_timezone', "Set the user's IANA timezone for correct date grouping", {
  timezone: z.string().describe('IANA timezone identifier, e.g. America/New_York'),
}, (args) => {
  try {
    Intl.DateTimeFormat(undefined, { timeZone: args.timezone });
  } catch {
    return text({ error: `Invalid timezone: ${args.timezone}` });
  }
  db.prepare("INSERT OR REPLACE INTO settings (key,value) VALUES ('timezone',?)").run(args.timezone);
  return text({ timezone: args.timezone, today: today() });
});

// get_timezone
server.tool('get_timezone', "Get the configured timezone", {}, () => {
  const tz = (db.prepare("SELECT value FROM settings WHERE key='timezone'").get() as { value: string } | undefined)?.value ?? 'UTC (not set)';
  return text({ timezone: tz });
});

// ── Start ────────────────────────────────────────────────────────────────────

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch(err => { console.error(err); process.exit(1); });
