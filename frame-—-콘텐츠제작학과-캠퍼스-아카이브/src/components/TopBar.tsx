import { Menu, X } from 'lucide-react';
import { useState } from 'react';
import { MainTab, MemberProfile } from '../types';

interface TopBarProps {
  activeTab: MainTab;
  onSelectTab: (tab: MainTab) => void;
  isAuthenticated: boolean;
  memberProfile: MemberProfile | null;
  onOpenAuth: () => void;
  overlayMode?: boolean;
}

const NAV_ITEMS: { id: MainTab; label: string }[] = [
  { id: 'home', label: '매거진' },
  { id: 'contests', label: '공모전' },
  { id: 'clubs', label: '동아리' },
  { id: 'major', label: '전공 허브' },
  { id: 'community', label: '커뮤니티' },
];

export function TopBar({
  activeTab,
  onSelectTab,
  isAuthenticated,
  memberProfile,
  onOpenAuth,
  overlayMode = false,
}: TopBarProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleNavClick = (tab: MainTab) => {
    onSelectTab(tab);
    setMobileMenuOpen(false);
  };

  return (
    <header
      className={
        overlayMode
          ? 'fixed top-0 left-0 right-0 z-40 bg-gradient-to-b from-black/70 via-black/35 to-transparent text-white'
          : 'sticky top-0 z-40 bg-[#FBF9F5]/95 dark:bg-[#121110]/95 backdrop-blur-sm border-b border-[#E5DEC9] dark:border-[#322E29] text-[#1C1917] dark:text-[#F5F2EB] transition-colors'
      }
    >
      <div className="max-w-[1200px] mx-auto px-5 sm:px-8 h-16 flex items-center justify-between gap-8">
        {/* Zone 1: Single-element Brand Wordmark */}
        <button
          type="button"
          onClick={() => handleNavClick('search')}
          className={`font-brand text-2xl tracking-wide whitespace-nowrap shrink-0 cursor-pointer transition-colors ${
            overlayMode
              ? 'text-white hover:text-white/80 drop-shadow-sm'
              : 'text-[#1C1917] dark:text-[#F5F2EB] hover:text-[#1E3A8A] dark:hover:text-[#93B4FF]'
          }`}
        >
          캠타임 CAMPTIME
        </button>

        {/* Zone 2: 5 concise single-line text nav links */}
        <nav className="hidden md:flex items-center gap-7" aria-label="주 메뉴">
          {NAV_ITEMS.map((item) => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => handleNavClick(item.id)}
                className={`text-sm whitespace-nowrap shrink-0 py-1 border-b-2 transition-colors cursor-pointer ${
                  overlayMode
                    ? isActive
                      ? 'border-white text-white font-semibold'
                      : 'border-transparent text-white/90 hover:text-white font-medium drop-shadow-sm'
                    : isActive
                    ? 'border-[#1E3A8A] dark:border-[#93B4FF] text-[#1C1917] dark:text-[#F5F2EB] font-semibold'
                    : 'border-transparent text-[#57534E] dark:text-[#B8B0A4] hover:text-[#1C1917] dark:hover:text-[#F5F2EB] font-medium'
                }`}
              >
                {item.label}
              </button>
            );
          })}
        </nav>

        {/* Zone 3: 1 primary action */}
        <div className="flex items-center gap-3 shrink-0">
          {isAuthenticated ? (
            <button
              type="button"
              onClick={() => handleNavClick(memberProfile ? 'mypage' : 'home')}
              className={`px-4 py-2 text-xs font-medium rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                overlayMode
                  ? 'bg-[#FBF9F5] text-[#1C1917] hover:bg-white dark:bg-[#221F1C] dark:text-[#F5F2EB] dark:border dark:border-white/20 dark:hover:bg-[#322E29] shadow-sm'
                  : 'bg-[#1C1917] dark:bg-[#F5F2EB] text-[#FBF9F5] dark:text-[#121110] hover:bg-[#1E3A8A] dark:hover:bg-[#93B4FF]'
              }`}
            >
              {memberProfile ? `${memberProfile.nickname} · 마이` : '프로필 완성'}
            </button>
          ) : (
            <button
              type="button"
              onClick={onOpenAuth}
              className={`px-4 py-2 text-xs font-medium rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                overlayMode
                  ? 'bg-[#FBF9F5] text-[#1C1917] hover:bg-white dark:bg-[#221F1C] dark:text-[#F5F2EB] dark:border dark:border-white/20 dark:hover:bg-[#322E29] shadow-sm'
                  : 'bg-[#1C1917] dark:bg-[#F5F2EB] text-[#FBF9F5] dark:text-[#121110] hover:bg-[#1E3A8A] dark:hover:bg-[#93B4FF]'
              }`}
            >
              로그인 · 가입
            </button>
          )}

          <button
            type="button"
            onClick={() => setMobileMenuOpen((prev) => !prev)}
            className={`md:hidden p-2 rounded-lg transition-colors cursor-pointer ${
              overlayMode
                ? 'text-white hover:bg-white/15'
                : 'text-[#1C1917] dark:text-[#F5F2EB] hover:bg-[#F2EDE4] dark:hover:bg-[#221F1C]'
            }`}
            aria-label={mobileMenuOpen ? '메뉴 닫기' : '메뉴 열기'}
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {mobileMenuOpen && (
        <div className="md:hidden border-t border-[#E5DEC9] dark:border-[#322E29] bg-[#FBF9F5] dark:bg-[#1B1917] text-[#1C1917] dark:text-[#F5F2EB] px-5 py-4 flex flex-col gap-2 shadow-lg">
          {NAV_ITEMS.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => handleNavClick(item.id)}
              className={`text-left px-3 py-2.5 rounded-lg text-sm font-medium whitespace-nowrap ${
                activeTab === item.id
                  ? 'bg-[#F2EDE4] dark:bg-[#221F1C] text-[#1E3A8A] dark:text-[#93B4FF] font-semibold'
                  : 'text-[#57534E] dark:text-[#B8B0A4] hover:bg-[#F2EDE4]/60 dark:hover:bg-[#221F1C]/60'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      )}
    </header>
  );
}
