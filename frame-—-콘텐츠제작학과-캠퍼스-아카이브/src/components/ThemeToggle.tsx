import { Moon, Sun } from 'lucide-react';

export type ThemeMode = 'light' | 'dark';

interface ThemeToggleProps {
  theme: ThemeMode;
  onToggle: (next: ThemeMode) => void;
  variant?: 'overlay' | 'surface';
}

export function ThemeToggle({ theme, onToggle, variant = 'surface' }: ThemeToggleProps) {
  if (variant === 'overlay') {
    return (
      <div
        role="group"
        aria-label="테마 모드 선택"
        className="flex items-center gap-0.5 bg-black/45 backdrop-blur-sm border border-white/20 rounded-lg p-1"
      >
        <button
          type="button"
          onClick={() => onToggle('light')}
          aria-pressed={theme === 'light'}
          className={`px-2.5 py-1 text-[11px] font-medium rounded-md inline-flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
            theme === 'light'
              ? 'bg-[#FBF9F5] text-[#1C1917] shadow-sm'
              : 'text-white/80 hover:text-white'
          }`}
        >
          <Sun className="w-3.5 h-3.5" />
          <span>Light</span>
        </button>
        <button
          type="button"
          onClick={() => onToggle('dark')}
          aria-pressed={theme === 'dark'}
          className={`px-2.5 py-1 text-[11px] font-medium rounded-md inline-flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
            theme === 'dark'
              ? 'bg-[#221F1C] text-[#F5F2EB] border border-white/20 shadow-sm'
              : 'text-white/80 hover:text-white'
          }`}
        >
          <Moon className="w-3.5 h-3.5" />
          <span>Night</span>
        </button>
      </div>
    );
  }

  return (
    <div
      role="group"
      aria-label="테마 모드 선택"
      className="inline-flex items-center gap-0.5 p-1 rounded-lg bg-[#F2EDE4]/95 dark:bg-[#1B1917]/95 backdrop-blur-md border border-[#E5DEC9] dark:border-[#322E29] shadow-md"
    >
      <button
        type="button"
        onClick={() => onToggle('light')}
        aria-pressed={theme === 'light'}
        className={`px-2.5 py-1.5 text-xs font-medium rounded-md inline-flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
          theme === 'light'
            ? 'bg-white text-[#1C1917] shadow-sm'
            : 'text-[#57534E] dark:text-[#B8B0A4] hover:text-[#1C1917] dark:hover:text-[#F5F2EB]'
        }`}
      >
        <Sun className="w-3.5 h-3.5" />
        <span>Light</span>
      </button>
      <button
        type="button"
        onClick={() => onToggle('dark')}
        aria-pressed={theme === 'dark'}
        className={`px-2.5 py-1.5 text-xs font-medium rounded-md inline-flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
          theme === 'dark'
            ? 'bg-[#221F1C] text-[#F5F2EB] border border-[#322E29] shadow-sm'
            : 'text-[#57534E] dark:text-[#B8B0A4] hover:text-[#1C1917] dark:hover:text-[#F5F2EB]'
        }`}
      >
        <Moon className="w-3.5 h-3.5" />
        <span>Night</span>
      </button>
    </div>
  );
}
