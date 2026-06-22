'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function Header() {
  const pathname = usePathname();
  const isGoals = pathname === '/goals';

  return (
    <header className="bg-mfp-navy shadow-md">
      <div className="max-w-2xl mx-auto px-4">
        <div className="flex items-center justify-between h-14">
          <Link href="/" className="text-white font-bold text-xl tracking-tight">
            NutriTrack
          </Link>
          <nav className="flex gap-1">
            <Link
              href="/"
              className={`px-4 py-2 text-sm font-semibold rounded transition-colors ${
                !isGoals ? 'bg-white/20 text-white' : 'text-white/70 hover:text-white hover:bg-white/10'
              }`}
            >
              Diary
            </Link>
            <Link
              href="/goals"
              className={`px-4 py-2 text-sm font-semibold rounded transition-colors ${
                isGoals ? 'bg-white/20 text-white' : 'text-white/70 hover:text-white hover:bg-white/10'
              }`}
            >
              Goals
            </Link>
          </nav>
        </div>
      </div>
    </header>
  );
}
