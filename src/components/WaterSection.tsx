'use client';

import type { WaterLog } from '@/lib/types';

const GLASS_ML = 250;

export default function WaterSection({
  logs,
  goalMl,
  onAdd,
  onDelete,
}: {
  logs: WaterLog[];
  goalMl: number;
  onAdd: (ml: number) => void;
  onDelete: (id: number) => void;
}) {
  const totalMl = logs.reduce((s, l) => s + l.amount_ml, 0);
  const goalGlasses = Math.ceil(goalMl / GLASS_ML);
  const filledGlasses = Math.round(totalMl / GLASS_ML);
  const pct = Math.min((totalMl / goalMl) * 100, 100);

  return (
    <div className="mfp-card overflow-hidden">
      <div className="mfp-section-header">
        <span>Water</span>
        <span className="text-white/80 text-xs font-normal normal-case tracking-normal">
          {Math.round(totalMl)} / {Math.round(goalMl)} ml
        </span>
      </div>

      <div className="px-4 py-4">
        {/* Glass icons */}
        <div className="flex flex-wrap gap-2 mb-4">
          {Array.from({ length: goalGlasses }).map((_, i) => (
            <button
              key={i}
              onClick={() => {
                if (i < filledGlasses && logs.length > 0) {
                  onDelete(logs[logs.length - 1].id);
                } else if (i >= filledGlasses) {
                  onAdd(GLASS_ML);
                }
              }}
              className="transition-transform hover:scale-110"
              title={i < filledGlasses ? 'Remove a glass' : 'Add a glass'}
            >
              <svg width="28" height="36" viewBox="0 0 28 36" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path
                  d="M4 4 L6 32 Q6 34 14 34 Q22 34 22 32 L24 4 Z"
                  fill={i < filledGlasses ? '#2675C5' : '#E5E7EB'}
                  stroke={i < filledGlasses ? '#1A5FA8' : '#D1D5DB'}
                  strokeWidth="1.5"
                />
                <path d="M4 4 L24 4" stroke={i < filledGlasses ? '#1A5FA8' : '#D1D5DB'} strokeWidth="1.5" />
              </svg>
            </button>
          ))}
        </div>

        {/* Progress bar */}
        <div className="progress-bar-track mb-3">
          <div
            className={`progress-bar-fill ${pct >= 100 ? 'bg-mfp-green' : 'bg-mfp-blue'}`}
            style={{ width: `${pct}%` }}
          />
        </div>

        {/* Quick-add buttons */}
        <div className="flex gap-2">
          {[250, 500].map(ml => (
            <button key={ml} onClick={() => onAdd(ml)} className="mfp-btn-primary text-xs py-1.5 px-3">
              + {ml === 250 ? '1 glass' : '2 glasses'} ({ml}ml)
            </button>
          ))}
          {logs.length > 0 && (
            <button
              onClick={() => onDelete(logs[logs.length - 1].id)}
              className="text-xs py-1.5 px-3 border border-mfp-border rounded text-mfp-muted hover:text-mfp-red hover:border-mfp-red transition-colors"
            >
              Undo last
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
