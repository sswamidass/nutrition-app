'use client';

import { useRouter } from 'next/navigation';

function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr + 'T00:00:00');
  d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0];
}

function formatDisplay(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  const today = new Date().toISOString().split('T')[0];
  const yesterday = addDays(today, -1);
  const tomorrow = addDays(today, 1);

  if (dateStr === today) return 'Today';
  if (dateStr === yesterday) return 'Yesterday';
  if (dateStr === tomorrow) return 'Tomorrow';

  return d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
}

export default function DateNav({ date }: { date: string }) {
  const router = useRouter();
  const today = new Date().toISOString().split('T')[0];

  return (
    <div className="mfp-card flex items-center justify-between px-4 py-3">
      <button
        onClick={() => router.push(`/diary/${addDays(date, -1)}`)}
        className="text-mfp-blue hover:text-mfp-blue-dark font-bold text-lg px-2 py-1 rounded hover:bg-blue-50 transition-colors"
        aria-label="Previous day"
      >
        ‹
      </button>

      <div className="text-center">
        <div className="font-bold text-mfp-navy text-base">{formatDisplay(date)}</div>
        {date !== today && (
          <button
            onClick={() => router.push(`/diary/${today}`)}
            className="text-xs text-mfp-blue hover:underline mt-0.5"
          >
            Back to Today
          </button>
        )}
      </div>

      <button
        onClick={() => router.push(`/diary/${addDays(date, 1)}`)}
        className="text-mfp-blue hover:text-mfp-blue-dark font-bold text-lg px-2 py-1 rounded hover:bg-blue-50 transition-colors"
        aria-label="Next day"
      >
        ›
      </button>
    </div>
  );
}
