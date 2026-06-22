import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import { createClient, type InValue } from '@libsql/client';
import path from 'path';
import fs from 'fs';

// ── Database ────────────────────────────────────────────────────────────────
// One client serves local and hosted, switched by env:
//   - Local:  DATABASE_URL unset -> file:./data/nutrition.db
//   - Hosted: DATABASE_URL=libsql://<db>.turso.io + DATABASE_AUTH_TOKEN
//             (point the MCP server at the same Turso DB as the web app so
//              meals logged via Claude show up on your phone, and vice versa)

const LOCAL_DIR = path.join(process.cwd(), 'data');
const url = process.env.DATABASE_URL || `file:${path.join(LOCAL_DIR, 'nutrition.db')}`;
if (url.startsWith('file:') && !fs.existsSync(LOCAL_DIR)) fs.mkdirSync(LOCAL_DIR, { recursive: true });

const db = createClient({ url, authToken: process.env.DATABASE_AUTH_TOKEN });

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

async function initDb() {
  await db.executeMultiple(SCHEMA);
  const c = await db.execute('SELECT COUNT(*) as count FROM nutrition_goals');
  if (Number(c.rows[0].count) === 0) {
    await db.execute(`INSERT INTO nutrition_goals (daily_calories,daily_protein_g,daily_carbs_g,daily_fat_g,daily_sodium_mg,daily_water_ml) VALUES (2000,150,250,65,2300,2500)`);
  }
}

// ── Query helpers ────────────────────────────────────────────────────────────

type Row = Record<string, unknown>;

async function all(sql: string, args: InValue[] = []): Promise<Row[]> {
  return (await db.execute({ sql, args })).rows as unknown as Row[];
}
async function get(sql: string, args: InValue[] = []): Promise<Row | undefined> {
  return (await db.execute({ sql, args })).rows[0] as unknown as Row | undefined;
}
async function run(sql: string, args: InValue[] = []) {
  return db.execute({ sql, args });
}

async function today(): Promise<string> {
  const tz = (await get("SELECT value FROM settings WHERE key='timezone'"))?.value as string | undefined;
  if (tz) return new Date().toLocaleDateString('en-CA', { timeZone: tz });
  return new Date().toISOString().split('T')[0];
}

async function getGoals(): Promise<Record<string, number>> {
  const g = (await get('SELECT * FROM nutrition_goals ORDER BY id DESC LIMIT 1'))!;
  const out: Record<string, number> = {};
  for (const [k, v] of Object.entries(g)) out[k] = v == null ? 0 : Number(v);
  return out;
}

async function dayTotals(date: string) {
  const m = (await get('SELECT COALESCE(SUM(calories),0) cal, COALESCE(SUM(protein_g),0) pro, COALESCE(SUM(carbs_g),0) carb, COALESCE(SUM(fat_g),0) fat FROM meals WHERE date=?', [date]))!;
  const w = (await get('SELECT COALESCE(SUM(amount_ml),0) ml FROM water_logs WHERE date=?', [date]))!;
  return { calories: Number(m.cal), protein_g: Number(m.pro), carbs_g: Number(m.carb), fat_g: Number(m.fat), water_ml: Number(w.ml) };
}

function text(obj: unknown): { content: [{ type: 'text'; text: string }] } {
  return { content: [{ type: 'text', text: typeof obj === 'string' ? obj : JSON.stringify(obj, null, 2) }] };
}

// ── Server ──────────────────────────────────────────────────────────────────

const server = new McpServer({ name: 'nutrition', version: '1.0.0' });

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
}, async (args) => {
  const date = args.logged_at ?? await today();
  const rs = await run(
    `INSERT INTO meals (date,meal_type,description,calories,protein_g,carbs_g,fat_g,fiber_g,sugar_g,sodium_mg,notes)
     VALUES (?,?,?,?,?,?,?,?,?,?,?) RETURNING *`,
    [date, args.meal_type, args.description, args.calories, args.protein_g, args.carbs_g, args.fat_g, args.fiber_g, args.sugar_g, args.sodium_mg, args.notes ?? null]
  );
  const totals = await dayTotals(date);
  const goals = await getGoals();
  return text({ meal: rs.rows[0], day_totals: totals, calories_remaining: goals.daily_calories - totals.calories });
});

server.tool('get_meals_today', 'Get all meals logged today', {}, async () => {
  const date = await today();
  return text({ date, meals: await all('SELECT * FROM meals WHERE date=? ORDER BY logged_at', [date]), totals: await dayTotals(date) });
});

server.tool('get_meals_by_date', 'Get all meals for a specific date', {
  date: z.string().describe('YYYY-MM-DD'),
}, async (args) => {
  return text({ date: args.date, meals: await all('SELECT * FROM meals WHERE date=? ORDER BY logged_at', [args.date]), totals: await dayTotals(args.date) });
});

server.tool('get_meals_by_date_range', 'Get all meals between two dates (inclusive)', {
  start_date: z.string().describe('YYYY-MM-DD'),
  end_date: z.string().describe('YYYY-MM-DD'),
}, async (args) => {
  const meals = await all('SELECT * FROM meals WHERE date BETWEEN ? AND ? ORDER BY date,logged_at', [args.start_date, args.end_date]);
  return text({ start_date: args.start_date, end_date: args.end_date, meals, count: meals.length });
});

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
}, async (args) => {
  const { id, ...updates } = args;
  const keys = Object.keys(updates).filter(k => updates[k as keyof typeof updates] !== undefined);
  if (keys.length === 0) return text('No fields to update');
  const setClause = keys.map(k => `${k}=?`).join(', ');
  const vals = keys.map(k => updates[k as keyof typeof updates] as InValue);
  const rs = await run(`UPDATE meals SET ${setClause} WHERE id=? RETURNING *`, [...vals, id]);
  return text({ updated: rs.rows[0] });
});

server.tool('delete_meal', 'Delete a meal entry by ID', {
  id: z.number().int(),
}, async (args) => {
  const rs = await run('DELETE FROM meals WHERE id=?', [args.id]);
  return text({ deleted: rs.rowsAffected > 0, id: args.id });
});

server.tool('set_nutrition_goals', "Set the user's daily calorie and macro targets", {
  daily_calories: z.number().min(0).optional(),
  daily_protein_g: z.number().min(0).optional(),
  daily_carbs_g: z.number().min(0).optional(),
  daily_fat_g: z.number().min(0).optional(),
  daily_fiber_g: z.number().min(0).optional(),
  daily_sugar_g: z.number().min(0).optional(),
  daily_sodium_mg: z.number().min(0).optional(),
  daily_water_ml: z.number().min(0).optional(),
}, async (args) => {
  const current = await getGoals();
  const merged = { ...current, ...Object.fromEntries(Object.entries(args).filter(([, v]) => v !== undefined)) } as Record<string, number>;
  await run(
    `UPDATE nutrition_goals SET daily_calories=?, daily_protein_g=?, daily_carbs_g=?, daily_fat_g=?,
       daily_fiber_g=?, daily_sugar_g=?, daily_sodium_mg=?, daily_water_ml=?, updated_at=datetime('now') WHERE id=?`,
    [merged.daily_calories, merged.daily_protein_g, merged.daily_carbs_g, merged.daily_fat_g,
      merged.daily_fiber_g, merged.daily_sugar_g, merged.daily_sodium_mg, merged.daily_water_ml, merged.id]
  );
  return text({ goals: await getGoals() });
});

server.tool('get_nutrition_goals', "Get the user's current daily calorie and macro targets", {}, async () => {
  return text(await getGoals());
});

server.tool('get_goal_progress', 'Get progress against daily nutrition goals for a specific date', {
  date: z.string().optional().describe('YYYY-MM-DD, defaults to today'),
}, async (args) => {
  const date = args.date ?? await today();
  const totals = await dayTotals(date);
  const goals = await getGoals();
  return text({
    date,
    calories: { goal: goals.daily_calories, eaten: totals.calories, remaining: goals.daily_calories - totals.calories, pct: Math.round((totals.calories / goals.daily_calories) * 100) },
    protein_g: { goal: goals.daily_protein_g, eaten: totals.protein_g, remaining: goals.daily_protein_g - totals.protein_g },
    carbs_g: { goal: goals.daily_carbs_g, eaten: totals.carbs_g, remaining: goals.daily_carbs_g - totals.carbs_g },
    fat_g: { goal: goals.daily_fat_g, eaten: totals.fat_g, remaining: goals.daily_fat_g - totals.fat_g },
    water_ml: { goal: goals.daily_water_ml, consumed: totals.water_ml, remaining: goals.daily_water_ml - totals.water_ml },
  });
});

server.tool('get_nutrition_summary', 'Get daily nutrition totals for a date range', {
  start_date: z.string().describe('YYYY-MM-DD'),
  end_date: z.string().describe('YYYY-MM-DD'),
}, async (args) => {
  const rows = await all(
    `SELECT date, SUM(calories) calories, SUM(protein_g) protein_g, SUM(carbs_g) carbs_g, SUM(fat_g) fat_g
     FROM meals WHERE date BETWEEN ? AND ? GROUP BY date ORDER BY date`,
    [args.start_date, args.end_date]
  );
  const goals = await getGoals();
  return text({ rows: rows.map(r => ({ ...r, calorie_pct: Math.round((Number(r.calories) / goals.daily_calories) * 100) })), goals });
});

server.tool('log_water', 'Log a hydration entry', {
  amount_ml: z.number().min(1).describe('Amount in ml. Tip: 1 cup ≈ 240ml, 1 oz ≈ 30ml'),
  logged_at: z.string().optional().describe('YYYY-MM-DD, defaults to today'),
  notes: z.string().optional(),
}, async (args) => {
  const date = args.logged_at ?? await today();
  const rs = await run('INSERT INTO water_logs (date,amount_ml,notes) VALUES (?,?,?) RETURNING *', [date, args.amount_ml, args.notes ?? null]);
  const w = (await get('SELECT COALESCE(SUM(amount_ml),0) total FROM water_logs WHERE date=?', [date]))!;
  const goals = await getGoals();
  return text({ entry: rs.rows[0], day_total_ml: Number(w.total), goal_ml: goals.daily_water_ml, remaining_ml: goals.daily_water_ml - Number(w.total) });
});

server.tool('get_water_today', "Get today's total water intake", {}, async () => {
  const date = await today();
  const logs = await all('SELECT * FROM water_logs WHERE date=? ORDER BY logged_at', [date]);
  const total = logs.reduce((s, l) => s + Number(l.amount_ml), 0);
  const goals = await getGoals();
  return text({ date, logs, total_ml: total, goal_ml: goals.daily_water_ml, remaining_ml: goals.daily_water_ml - total });
});

server.tool('get_water_by_date', 'Get water intake for a specific date', {
  date: z.string().describe('YYYY-MM-DD'),
}, async (args) => {
  const logs = await all('SELECT * FROM water_logs WHERE date=? ORDER BY logged_at', [args.date]);
  const total = logs.reduce((s, l) => s + Number(l.amount_ml), 0);
  return text({ date: args.date, logs, total_ml: total });
});

server.tool('delete_water', 'Delete a water log entry by ID', {
  id: z.number().int(),
}, async (args) => {
  const rs = await run('DELETE FROM water_logs WHERE id=?', [args.id]);
  return text({ deleted: rs.rowsAffected > 0, id: args.id });
});

server.tool('get_trends', 'Rolling averages, streaks, and daily breakdowns', {
  days: z.number().int().min(2).max(365).default(30),
  end_date: z.string().optional().describe('YYYY-MM-DD, defaults to today'),
}, async (args) => {
  const end = args.end_date ?? await today();
  const rows = (await all(
    `SELECT date, SUM(calories) cal, SUM(protein_g) pro, SUM(carbs_g) carb, SUM(fat_g) fat
     FROM meals WHERE date<=? AND date>=date(?,'-'||?||' days') GROUP BY date ORDER BY date`,
    [end, end, args.days]
  )).map(r => ({ date: r.date as string, cal: Number(r.cal), pro: Number(r.pro), carb: Number(r.carb), fat: Number(r.fat) }));

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

server.tool('get_meal_patterns', 'Behavioural patterns: meal-type rates, weekday vs weekend', {
  days: z.number().int().min(7).max(365).default(30),
  end_date: z.string().optional(),
}, async (args) => {
  const end = args.end_date ?? await today();
  const meals = (await all(
    `SELECT date, meal_type, calories FROM meals WHERE date<=? AND date>=date(?,'-'||?||' days')`,
    [end, end, args.days]
  )).map(r => ({ date: r.date as string, meal_type: r.meal_type as string, calories: Number(r.calories) }));

  const dates = [...new Set(meals.map(m => m.date))];
  const loggedDays = dates.length;
  if (loggedDays === 0) return text({ message: 'No data in range' });

  const mealTypeRate = ['breakfast', 'lunch', 'dinner', 'snack'].map(type => {
    const daysWithType = dates.filter(d => meals.some(m => m.date === d && m.meal_type === type)).length;
    return { meal_type: type, days_logged: daysWithType, rate_pct: Math.round((daysWithType / loggedDays) * 100) };
  });

  const isWeekend = (d: string) => { const day = new Date(d + 'T00:00:00').getDay(); return day === 0 || day === 6; };
  const weekdayCals = meals.filter(m => !isWeekend(m.date)).reduce((s, m) => s + m.calories, 0);
  const weekendCals = meals.filter(m => isWeekend(m.date)).reduce((s, m) => s + m.calories, 0);
  const weekdayDays = dates.filter(d => !isWeekend(d)).length;
  const weekendDays = dates.filter(isWeekend).length;

  return text({
    period: { days: args.days, logged_days: loggedDays },
    meal_type_rates: mealTypeRate,
    weekday_avg_calories: weekdayDays > 0 ? Math.round(weekdayCals / weekdayDays) : null,
    weekend_avg_calories: weekendDays > 0 ? Math.round(weekendCals / weekendDays) : null,
  });
});

server.tool('export_meals', 'Export all logged meals as CSV text', {}, async () => {
  const meals = await all('SELECT * FROM meals ORDER BY date,logged_at');
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

server.tool('set_timezone', "Set the user's IANA timezone for correct date grouping", {
  timezone: z.string().describe('IANA timezone identifier, e.g. America/New_York'),
}, async (args) => {
  try {
    Intl.DateTimeFormat(undefined, { timeZone: args.timezone });
  } catch {
    return text({ error: `Invalid timezone: ${args.timezone}` });
  }
  await run("INSERT OR REPLACE INTO settings (key,value) VALUES ('timezone',?)", [args.timezone]);
  return text({ timezone: args.timezone, today: await today() });
});

server.tool('get_timezone', 'Get the configured timezone', {}, async () => {
  const tz = (await get("SELECT value FROM settings WHERE key='timezone'"))?.value as string | undefined;
  return text({ timezone: tz ?? 'UTC (not set)' });
});

// ── Start ────────────────────────────────────────────────────────────────────

async function main() {
  await initDb();
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch(err => { console.error(err); process.exit(1); });
