import { ArrowRight, ChevronLeft, ChevronRight, Search, X } from 'lucide-react';
import React, { useMemo, useState } from 'react';
import { SCENIC_WALLPAPERS } from '../data/seedData';
import { computeDday } from '../lib/validation';
import {
  ClubPost,
  CommunityPost,
  Contest,
  DepartmentNews,
  EquipGuide,
  MainTab,
  MajorSubTab,
  PortfolioWork,
  StudyTip,
  TeamRecruit,
} from '../types';
import { EditorialImage } from './EditorialImage';
import { ThemeMode, ThemeToggle } from './ThemeToggle';

interface ScenicSearchHomeViewProps {
  contests: Contest[];
  clubs: ClubPost[];
  studyTips: StudyTip[];
  teamRecruits: TeamRecruit[];
  portfolios: PortfolioWork[];
  equipGuides: EquipGuide[];
  communityPosts: CommunityPost[];
  departmentNews: DepartmentNews[];
  theme: ThemeMode;
  onToggleTheme: (next: ThemeMode) => void;
  onNavigate: (tab: MainTab, subTab?: MajorSubTab) => void;
  onSelectContest: (contest: Contest) => void;
  onSelectClub: (club: ClubPost) => void;
  onSelectPortfolio: (work: PortfolioWork) => void;
  onSelectNews: (news: DepartmentNews) => void;
  onOpenNewsList: () => void;
}

interface UnifiedSearchItem {
  id: string;
  sectionLabel: string;
  title: string;
  subtitle: string;
  onOpen: () => void;
}

export function ScenicSearchHomeView({
  contests,
  clubs,
  studyTips,
  teamRecruits,
  portfolios,
  equipGuides,
  communityPosts,
  departmentNews,
  theme,
  onToggleTheme,
  onNavigate,
  onSelectContest,
  onSelectClub,
  onSelectPortfolio,
  onSelectNews,
  onOpenNewsList,
}: ScenicSearchHomeViewProps) {
  const [wallpaperIndex, setWallpaperIndex] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchSubmitted, setSearchSubmitted] = useState(false);

  const activeContests = useMemo(
    () => contests.filter((c) => !computeDday(c.deadline).isClosed),
    [contests]
  );
  const openClubs = useMemo(
    () => clubs.filter((c) => c.status !== '마감'),
    [clubs]
  );

  const [contestAdIndex, setContestAdIndex] = useState(0);
  const [clubAdIndex, setClubAdIndex] = useState(0);

  const featuredContest =
    activeContests[contestAdIndex % Math.max(activeContests.length, 1)] || contests[0];
  const featuredClub =
    openClubs[clubAdIndex % Math.max(openClubs.length, 1)] || clubs[0];

  const currentWallpaper = SCENIC_WALLPAPERS[wallpaperIndex];

  const searchResults = useMemo<UnifiedSearchItem[]>(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return [];

    const matches: UnifiedSearchItem[] = [];

    for (const news of departmentNews) {
      if (
        news.title.toLowerCase().includes(q) ||
        news.summary.toLowerCase().includes(q) ||
        news.source.toLowerCase().includes(q) ||
        news.newsType.toLowerCase().includes(q) ||
        news.content.toLowerCase().includes(q)
      ) {
        matches.push({
          id: `news-${news.id}`,
          sectionLabel: `학과 소식 · ${news.newsType}`,
          title: news.title,
          subtitle: `${news.source}${news.eventSchedule ? ` · ${news.eventSchedule}` : ''}`,
          onOpen: () => onSelectNews(news),
        });
      }
    }

    for (const c of contests) {
      if (
        c.title.toLowerCase().includes(q) ||
        c.organizer.toLowerCase().includes(q) ||
        c.category.toLowerCase().includes(q) ||
        c.summary.toLowerCase().includes(q)
      ) {
        matches.push({
          id: `contest-${c.id}`,
          sectionLabel: `공모전 · ${c.scope}`,
          title: c.title,
          subtitle: `${c.organizer} · ${computeDday(c.deadline).label}`,
          onOpen: () => onSelectContest(c),
        });
      }
    }

    for (const club of clubs) {
      if (
        club.clubName.toLowerCase().includes(q) ||
        club.title.toLowerCase().includes(q) ||
        club.field.toLowerCase().includes(q) ||
        club.description.toLowerCase().includes(q)
      ) {
        matches.push({
          id: `club-${club.id}`,
          sectionLabel: `동아리 · ${club.status}`,
          title: `${club.clubName} — ${club.title}`,
          subtitle: `${club.field} · ${club.schedule}`,
          onOpen: () => onSelectClub(club),
        });
      }
    }

    for (const tip of studyTips) {
      if (
        tip.title.toLowerCase().includes(q) ||
        tip.courseName.toLowerCase().includes(q) ||
        tip.content.toLowerCase().includes(q)
      ) {
        matches.push({
          id: `tip-${tip.id}`,
          sectionLabel: `전공 팁 · ${tip.tipType}`,
          title: tip.title,
          subtitle: `${tip.courseName} · ${tip.authorName}`,
          onOpen: () => onNavigate('major', 'study'),
        });
      }
    }

    for (const team of teamRecruits) {
      if (
        team.projectTitle.toLowerCase().includes(q) ||
        team.contestName.toLowerCase().includes(q) ||
        team.neededRoles.join(' ').toLowerCase().includes(q)
      ) {
        matches.push({
          id: `team-${team.id}`,
          sectionLabel: `팀원 매칭 · ${team.status}`,
          title: team.projectTitle,
          subtitle: `${team.contestName} · ${team.neededRoles.join(', ')}`,
          onOpen: () => onNavigate('major', 'team'),
        });
      }
    }

    for (const work of portfolios) {
      if (
        work.title.toLowerCase().includes(q) ||
        work.toolsUsed.toLowerCase().includes(q) ||
        work.track.toLowerCase().includes(q)
      ) {
        matches.push({
          id: `work-${work.id}`,
          sectionLabel: `포트폴리오 · ${work.track}`,
          title: work.title,
          subtitle: `${work.authorName} · ${work.toolsUsed}`,
          onOpen: () => onSelectPortfolio(work),
        });
      }
    }

    for (const guide of equipGuides) {
      if (
        guide.itemName.toLowerCase().includes(q) ||
        guide.summary.toLowerCase().includes(q) ||
        guide.locationOrShortcut.toLowerCase().includes(q)
      ) {
        matches.push({
          id: `wiki-${guide.id}`,
          sectionLabel: `장비·툴 위키 · ${guide.guideType}`,
          title: guide.itemName,
          subtitle: guide.locationOrShortcut,
          onOpen: () => onNavigate('major', 'wiki'),
        });
      }
    }

    for (const post of communityPosts) {
      if (
        post.title.toLowerCase().includes(q) ||
        post.content.toLowerCase().includes(q)
      ) {
        matches.push({
          id: `post-${post.id}`,
          sectionLabel: `커뮤니티 · ${post.category}`,
          title: post.title,
          subtitle: `${post.authorName} · ${post.authorTrack}`,
          onOpen: () => onNavigate('community'),
        });
      }
    }

    return matches.slice(0, 8);
  }, [
    searchQuery,
    departmentNews,
    contests,
    clubs,
    studyTips,
    teamRecruits,
    portfolios,
    equipGuides,
    communityPosts,
    onSelectNews,
    onSelectContest,
    onSelectClub,
    onSelectPortfolio,
    onNavigate,
  ]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    setSearchSubmitted(true);
  };

  const handlePrevWallpaper = () => {
    setWallpaperIndex((prev) => (prev - 1 + SCENIC_WALLPAPERS.length) % SCENIC_WALLPAPERS.length);
  };

  const handleNextWallpaper = () => {
    setWallpaperIndex((prev) => (prev + 1) % SCENIC_WALLPAPERS.length);
  };

  return (
    <section className="relative min-h-screen w-full overflow-hidden flex flex-col justify-between bg-[#1C1917] dark:bg-[#0D0C0B]">
      {/* Full-Bleed Scenic Background Image */}
      <div className="absolute inset-0 z-0">
        <EditorialImage
          src={currentWallpaper.imageUrl}
          alt={currentWallpaper.title}
          className="w-full h-full object-cover transition-opacity duration-500"
        />
        {/* Measured scrim for crisp AA+ legibility (deepens subtly in Night mode) */}
        <div
          className={`absolute inset-0 transition-colors duration-300 ${
            theme === 'dark'
              ? 'bg-gradient-to-b from-black/75 via-black/45 to-black/90'
              : 'bg-gradient-to-b from-black/55 via-black/25 to-black/80'
          }`}
        />
      </div>

      {/* Top Spacer for fixed header */}
      <div className="h-20 shrink-0 relative z-10" />

      {/* Center Stage: Bing-style Search Bar & Quick Campus Links */}
      <div className="relative z-20 flex-1 flex flex-col items-center justify-center px-5 sm:px-8 py-10">
        <div className="w-full max-w-2xl space-y-5">
          <div className="text-center space-y-2.5">
            <p className="font-brand text-4xl sm:text-5xl text-white tracking-wider drop-shadow-md">
              캠타임 CAMPTIME
            </p>
            <h1 className="font-editorial text-xl sm:text-2xl font-medium text-white/95 tracking-tight drop-shadow-sm headline-balance">
              콘텐츠제작학과 아카이브 — 오늘의 영감과 캠퍼스 소식을 검색하세요
            </h1>
          </div>

          <div className="relative">
            <form
              onSubmit={handleSearchSubmit}
              className="flex items-center bg-[#FBF9F5]/95 dark:bg-[#1B1917]/92 backdrop-blur-md rounded-2xl border border-white/50 dark:border-white/15 shadow-2xl px-4 sm:px-5 py-2.5 sm:py-3 focus-within:ring-2 focus-within:ring-white/80 dark:focus-within:ring-[#93B4FF]/60 transition-colors"
            >
              <Search className="w-5 h-5 text-[#57534E] dark:text-[#B8B0A4] shrink-0 mr-3" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setSearchSubmitted(false);
                }}
                placeholder="공모전, 동아리, 학과 소식, 카메라 장비, 팀원 매칭 검색..."
                aria-label="학과 통합 검색"
                className="flex-1 bg-transparent text-sm sm:text-base text-[#1C1917] dark:text-[#F5F2EB] placeholder:text-[#78716C] dark:placeholder:text-[#8E867B] focus:outline-none min-w-0"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery('');
                    setSearchSubmitted(false);
                  }}
                  aria-label="검색어 지우기"
                  className="p-1.5 text-[#78716C] dark:text-[#B8B0A4] hover:text-[#1C1917] dark:hover:text-[#F5F2EB] mr-1 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
              <button
                type="submit"
                className="px-4 py-2 bg-[#1C1917] dark:bg-[#F5F2EB] text-[#FBF9F5] dark:text-[#121110] text-xs font-medium rounded-xl hover:bg-[#1E3A8A] dark:hover:bg-[#93B4FF] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                검색
              </button>
            </form>

            {/* Instant Search Results Dropdown */}
            {searchQuery.trim().length > 0 && (
              <div className="mt-2 bg-[#FBF9F5]/98 dark:bg-[#1B1917]/98 backdrop-blur-md border border-[#E5DEC9] dark:border-[#322E29] rounded-xl shadow-2xl overflow-hidden max-h-80 overflow-y-auto">
                {searchResults.length === 0 ? (
                  <div className="p-5 text-center space-y-1">
                    <p className="text-sm font-medium text-[#1C1917] dark:text-[#F5F2EB]">
                      "{searchQuery}"에 해당하는 항목을 찾지 못했습니다
                    </p>
                    <p className="text-xs text-[#78716C] dark:text-[#8E867B]">
                      단편영화제, 특강, 프레임랩, Sony FX3, DaVinci 등의 키워드로 검색해 보세요.
                    </p>
                  </div>
                ) : (
                  <div className="divide-y divide-[#E5DEC9] dark:divide-[#322E29]">
                    <div className="px-4 py-2 bg-[#F2EDE4]/60 dark:bg-[#221F1C] flex items-center justify-between text-[11px] text-[#57534E] dark:text-[#B8B0A4]">
                      <span>
                        {searchSubmitted ? '통합 검색 결과' : '실시간 추천 결과'} ·{' '}
                        <span className="font-mono-tabular">{searchResults.length}건</span>
                      </span>
                      <span>항목을 클릭하면 바로 이동합니다</span>
                    </div>
                    {searchResults.map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={item.onOpen}
                        className="w-full text-left px-4 py-3 hover:bg-[#F2EDE4]/70 dark:hover:bg-[#221F1C] transition-colors flex items-center justify-between gap-4 cursor-pointer"
                      >
                        <div className="min-w-0">
                          <p className="text-[11px] font-medium text-[#1E3A8A] dark:text-[#93B4FF] mb-0.5">
                            {item.sectionLabel}
                          </p>
                          <p className="text-sm font-semibold text-[#1C1917] dark:text-[#F5F2EB] truncate">
                            {item.title}
                          </p>
                          <p className="text-xs text-[#57534E] dark:text-[#B8B0A4] truncate">
                            {item.subtitle}
                          </p>
                        </div>
                        <ArrowRight className="w-4 h-4 text-[#78716C] dark:text-[#8E867B] shrink-0" />
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Clean Unboxed Shortcut Strip */}
          <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-xs text-white/90 drop-shadow-sm pt-1">
            <button
              type="button"
              onClick={onOpenNewsList}
              className="hover:underline underline-offset-4 cursor-pointer whitespace-nowrap"
            >
              학과 소식 <span className="font-mono-tabular">{departmentNews.length}건</span>
            </button>
            <span aria-hidden="true" className="text-white/50">
              ·
            </span>
            <button
              type="button"
              onClick={() => onNavigate('contests')}
              className="hover:underline underline-offset-4 cursor-pointer whitespace-nowrap"
            >
              진행 중 공모전 <span className="font-mono-tabular">{activeContests.length}건</span>
            </button>
            <span aria-hidden="true" className="text-white/50">
              ·
            </span>
            <button
              type="button"
              onClick={() => onNavigate('clubs')}
              className="hover:underline underline-offset-4 cursor-pointer whitespace-nowrap"
            >
              모집 중 동아리 <span className="font-mono-tabular">{openClubs.length}곳</span>
            </button>
            <span aria-hidden="true" className="text-white/50">
              ·
            </span>
            <button
              type="button"
              onClick={() => onNavigate('major', 'team')}
              className="hover:underline underline-offset-4 cursor-pointer whitespace-nowrap"
            >
              공모전 팀원 매칭
            </button>
            <span aria-hidden="true" className="text-white/50">
              ·
            </span>
            <button
              type="button"
              onClick={() => onNavigate('major', 'wiki')}
              className="hover:underline underline-offset-4 cursor-pointer whitespace-nowrap"
            >
              기자재 · 편집 툴 위키
            </button>
          </div>

          {/* Single-Line Featured Department News Briefing */}
          {departmentNews.length > 0 && (
            <div className="flex justify-center pt-1">
              <button
                type="button"
                onClick={() => onSelectNews(departmentNews.find((n) => n.isPinned) || departmentNews[0])}
                className="max-w-xl text-xs text-white/90 hover:text-white bg-black/35 hover:bg-black/50 backdrop-blur-sm border border-white/20 rounded-lg px-4 py-2 transition-colors inline-flex items-center gap-2 cursor-pointer"
              >
                <span className="font-semibold text-white shrink-0">
                  {(departmentNews.find((n) => n.isPinned) || departmentNews[0]).newsType}
                </span>
                <span aria-hidden="true" className="text-white/50">
                  ·
                </span>
                <span className="truncate">
                  {(departmentNews.find((n) => n.isPinned) || departmentNews[0]).title}
                </span>
                <ArrowRight className="w-3.5 h-3.5 shrink-0 text-white/80" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Bottom Dock: Curated AD Spotlight Cards (Contest + Club Recruitment) & Scenic Switcher */}
      <div className="relative z-20 max-w-[1200px] w-full mx-auto px-5 sm:px-8 pb-6 sm:pb-8 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* AD Card 1: Contest Promotion */}
          {featuredContest && (
            <div className="bg-[#FBF9F5]/92 dark:bg-[#1B1917]/92 backdrop-blur-md border border-white/40 dark:border-white/15 rounded-xl p-4 sm:p-5 shadow-xl flex flex-col justify-between gap-3 transition-colors">
              <div className="flex items-center justify-between gap-3 text-xs text-[#57534E] dark:text-[#B8B0A4]">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="font-mono-tabular font-semibold text-[#1E3A8A] dark:text-[#93B4FF]">
                    AD
                  </span>
                  <span aria-hidden="true">·</span>
                  <span className="font-medium text-[#1C1917] dark:text-[#F5F2EB] truncate">
                    공모전 홍보
                  </span>
                  <span aria-hidden="true">·</span>
                  <span>{featuredContest.scope}</span>
                  <span aria-hidden="true">·</span>
                  <span className="font-mono-tabular font-semibold text-[#9A3412] dark:text-[#FB923C]">
                    {computeDday(featuredContest.deadline).label}
                  </span>
                </div>
                {activeContests.length > 1 && (
                  <button
                    type="button"
                    onClick={() => setContestAdIndex((i) => i + 1)}
                    className="text-[11px] text-[#57534E] dark:text-[#B8B0A4] hover:text-[#1C1917] dark:hover:text-[#F5F2EB] underline shrink-0 cursor-pointer"
                  >
                    다른 공모전
                  </button>
                )}
              </div>

              <div className="flex items-end justify-between gap-4">
                <div className="min-w-0 space-y-1">
                  <h2 className="font-editorial text-base sm:text-lg font-semibold text-[#1C1917] dark:text-[#F5F2EB] truncate">
                    {featuredContest.title}
                  </h2>
                  <p className="text-xs text-[#57534E] dark:text-[#B8B0A4] truncate">
                    {featuredContest.organizer} · {featuredContest.prize}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => onSelectContest(featuredContest)}
                  className="px-3.5 py-2 bg-[#1C1917] dark:bg-[#F5F2EB] text-[#FBF9F5] dark:text-[#121110] text-xs font-medium rounded-lg hover:bg-[#1E3A8A] dark:hover:bg-[#93B4FF] transition-colors inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer"
                >
                  <span>자세히 보기</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}

          {/* AD Card 2: Club Recruitment Promotion */}
          {featuredClub && (
            <div className="bg-[#FBF9F5]/92 dark:bg-[#1B1917]/92 backdrop-blur-md border border-white/40 dark:border-white/15 rounded-xl p-4 sm:p-5 shadow-xl flex flex-col justify-between gap-3 transition-colors">
              <div className="flex items-center justify-between gap-3 text-xs text-[#57534E] dark:text-[#B8B0A4]">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="font-mono-tabular font-semibold text-[#B45309] dark:text-[#FBBF24]">
                    AD
                  </span>
                  <span aria-hidden="true">·</span>
                  <span className="font-medium text-[#1C1917] dark:text-[#F5F2EB] truncate">
                    동아리 부원 모집
                  </span>
                  <span aria-hidden="true">·</span>
                  <span>{featuredClub.status}</span>
                  <span aria-hidden="true">·</span>
                  <span>{featuredClub.field}</span>
                </div>
                {openClubs.length > 1 && (
                  <button
                    type="button"
                    onClick={() => setClubAdIndex((i) => i + 1)}
                    className="text-[11px] text-[#57534E] dark:text-[#B8B0A4] hover:text-[#1C1917] dark:hover:text-[#F5F2EB] underline shrink-0 cursor-pointer"
                  >
                    다른 동아리
                  </button>
                )}
              </div>

              <div className="flex items-end justify-between gap-4">
                <div className="min-w-0 space-y-1">
                  <h2 className="font-editorial text-base sm:text-lg font-semibold text-[#1C1917] dark:text-[#F5F2EB] truncate">
                    {featuredClub.clubName} — {featuredClub.title}
                  </h2>
                  <p className="text-xs text-[#57534E] dark:text-[#B8B0A4] truncate">
                    {featuredClub.recruitCount} · {featuredClub.schedule}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => onSelectClub(featuredClub)}
                  className="px-3.5 py-2 bg-[#1C1917] dark:bg-[#F5F2EB] text-[#FBF9F5] dark:text-[#121110] text-xs font-medium rounded-lg hover:bg-[#1E3A8A] dark:hover:bg-[#93B4FF] transition-colors inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer"
                >
                  <span>모집 글 보기</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Bottom Caption, Light/Night Toggle & Bing-Style Wallpaper Switcher */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1 text-xs text-white/85">
          <div className="flex items-center gap-2 truncate">
            <span className="font-medium text-white">{currentWallpaper.title}</span>
            <span aria-hidden="true" className="text-white/50">
              ·
            </span>
            <span className="truncate text-white/75">{currentWallpaper.caption}</span>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={() => onNavigate('home')}
              className="text-xs font-medium text-white hover:underline underline-offset-4 cursor-pointer whitespace-nowrap mr-1"
            >
              매거진 아카이브 열기
            </button>
            <ThemeToggle theme={theme} onToggle={onToggleTheme} variant="overlay" />
            <div className="flex items-center gap-1 bg-black/45 backdrop-blur-sm border border-white/20 rounded-lg p-1">
              <button
                type="button"
                onClick={handlePrevWallpaper}
                aria-label="이전 배경화면"
                className="p-1 text-white/90 hover:text-white hover:bg-white/15 rounded transition-colors cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="font-mono-tabular text-[11px] px-1.5 text-white/90">
                {wallpaperIndex + 1}/{SCENIC_WALLPAPERS.length}
              </span>
              <button
                type="button"
                onClick={handleNextWallpaper}
                aria-label="다음 배경화면"
                className="p-1 text-white/90 hover:text-white hover:bg-white/15 rounded transition-colors cursor-pointer"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
