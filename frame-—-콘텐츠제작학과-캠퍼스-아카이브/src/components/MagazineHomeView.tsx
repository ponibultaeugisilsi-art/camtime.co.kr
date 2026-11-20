import { ArrowRight, ArrowUpRight } from 'lucide-react';
import { GENERATED_IMAGES } from '../data/seedData';
import { computeDday } from '../lib/validation';
import {
  ClubPost,
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

interface MagazineHomeViewProps {
  contests: Contest[];
  clubs: ClubPost[];
  teamRecruits: TeamRecruit[];
  portfolios: PortfolioWork[];
  studyTips: StudyTip[];
  equipGuides: EquipGuide[];
  departmentNews: DepartmentNews[];
  onNavigate: (tab: MainTab, subTab?: MajorSubTab) => void;
  onSelectContest: (contest: Contest) => void;
  onSelectClub: (club: ClubPost) => void;
  onSelectPortfolio: (work: PortfolioWork) => void;
  onSelectNews: (news: DepartmentNews) => void;
  onOpenNewsList: () => void;
}

export function MagazineHomeView({
  contests,
  clubs,
  teamRecruits,
  portfolios,
  studyTips,
  equipGuides,
  departmentNews,
  onNavigate,
  onSelectContest,
  onSelectClub,
  onSelectPortfolio,
  onSelectNews,
  onOpenNewsList,
}: MagazineHomeViewProps) {
  const activeContests = contests.filter((c) => !computeDday(c.deadline).isClosed);
  const leadContest =
    activeContests.find((c) => c.scope === '교내') || activeContests[0] || contests[0];
  const secondaryContests = contests.filter((c) => c.id !== leadContest?.id).slice(0, 3);
  const featuredClubs = clubs.slice(0, 3);
  const featuredWorks = portfolios.slice(0, 3);

  const openClubsCount = clubs.filter((c) => c.status !== '마감').length;
  const openTeamsCount = teamRecruits.filter((t) => t.status === '모집중').length;
  const archiveCount = portfolios.length + studyTips.length + equipGuides.length;

  return (
    <div className="space-y-16 pb-16">
      {/* 1. Split-Screen Editorial Hero */}
      <section className="pt-8 sm:pt-12">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-stretch">
          <div className="lg:col-span-6 flex flex-col justify-between py-2">
            <div className="space-y-5">
              <p className="text-xs font-mono-tabular tracking-widest text-[#78716C] dark:text-[#8E867B]">
                VOL. 14 · DEPARTMENT OF CONTENT PRODUCTION ARCHIVE
              </p>
              <h1 className="font-editorial text-4xl sm:text-5xl font-semibold tracking-tight leading-[1.18] text-[#1C1917] dark:text-[#F5F2EB] headline-balance">
                콘텐츠제작학과의 창작과 캠퍼스 기록을 한 권의 아카이브로
              </h1>
              <p className="text-base text-[#57534E] dark:text-[#B8B0A4] leading-relaxed max-w-xl">
                교내 단편영화제와 대외 공모전 소식부터 동아리 모집, 전공 과제 노하우,
                팀원 매칭, 기자재 사용 위키까지. 학과 생활에 필요한 모든 정보를
                매거진처럼 차분하게 모아두었습니다.
              </p>
            </div>

            <div className="pt-8 flex flex-wrap items-center gap-5">
              <button
                type="button"
                onClick={() => onNavigate('contests')}
                className="px-6 py-3 bg-[#1C1917] dark:bg-[#F5F2EB] text-[#FBF9F5] dark:text-[#121110] text-sm font-medium rounded-lg hover:bg-[#1E3A8A] dark:hover:bg-[#93B4FF] transition-colors inline-flex items-center gap-2 whitespace-nowrap shrink-0 cursor-pointer"
              >
                <span>공모전 아카이브 보기</span>
                <ArrowRight className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => onNavigate('major', 'portfolio')}
                className="text-sm font-medium text-[#1C1917] dark:text-[#F5F2EB] underline underline-offset-4 hover:text-[#1E3A8A] dark:hover:text-[#93B4FF] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                전공 허브 및 포트폴리오 탐색
              </button>
            </div>
          </div>

          <div className="lg:col-span-6 flex flex-col">
            <div className="flex-1 min-h-[300px] lg:min-h-[420px] rounded-xl overflow-hidden border border-[#E5DEC9] dark:border-[#322E29] bg-[#F2EDE4] dark:bg-[#1B1917]">
              <EditorialImage
                src={GENERATED_IMAGES.heroStudio}
                alt="콘텐츠제작학과 학생들이 스튜디오에서 스토리보드와 시네마 카메라를 점검하는 모습"
                className="w-full h-full object-cover"
              />
            </div>
            <p className="text-xs font-editorial italic text-[#78716C] dark:text-[#8E867B] mt-2.5">
              Fig. 1 — 예술관 302호 프로덕션 스튜디오 프리프로덕션 미팅 기록
            </p>
          </div>
        </div>

        {/* Full-Width Operational KPI Strip below Hero Split */}
        <div className="mt-10 grid grid-cols-2 lg:grid-cols-4 border-y border-[#E5DEC9] dark:border-[#322E29] bg-[#F2EDE4]/45 dark:bg-[#1B1917]">
          <button
            type="button"
            onClick={() => onNavigate('contests')}
            className="p-5 text-left border-b lg:border-b-0 border-r border-[#E5DEC9] dark:border-[#322E29] hover:bg-[#F2EDE4] dark:hover:bg-[#221F1C] transition-colors cursor-pointer"
          >
            <p className="text-xs text-[#78716C] dark:text-[#8E867B] mb-1">진행 중 교내·외 공모전</p>
            <p className="font-mono-tabular text-2xl font-semibold text-[#1C1917] dark:text-[#F5F2EB]">
              {activeContests.length}건
            </p>
          </button>
          <button
            type="button"
            onClick={() => onNavigate('clubs')}
            className="p-5 text-left border-b lg:border-b-0 lg:border-r border-[#E5DEC9] dark:border-[#322E29] hover:bg-[#F2EDE4] dark:hover:bg-[#221F1C] transition-colors cursor-pointer"
          >
            <p className="text-xs text-[#78716C] dark:text-[#8E867B] mb-1">모집 중 전공 동아리</p>
            <p className="font-mono-tabular text-2xl font-semibold text-[#1C1917] dark:text-[#F5F2EB]">
              {openClubsCount}곳
            </p>
          </button>
          <button
            type="button"
            onClick={() => onNavigate('major', 'team')}
            className="p-5 text-left border-r border-[#E5DEC9] dark:border-[#322E29] hover:bg-[#F2EDE4] dark:hover:bg-[#221F1C] transition-colors cursor-pointer"
          >
            <p className="text-xs text-[#78716C] dark:text-[#8E867B] mb-1">오픈 팀원 매칭</p>
            <p className="font-mono-tabular text-2xl font-semibold text-[#1C1917] dark:text-[#F5F2EB]">
              {openTeamsCount}팀
            </p>
          </button>
          <button
            type="button"
            onClick={() => onNavigate('major', 'wiki')}
            className="p-5 text-left hover:bg-[#F2EDE4] dark:hover:bg-[#221F1C] transition-colors cursor-pointer"
          >
            <p className="text-xs text-[#78716C] dark:text-[#8E867B] mb-1">전공 아카이브 · 가이드</p>
            <p className="font-mono-tabular text-2xl font-semibold text-[#1C1917] dark:text-[#F5F2EB]">
              {archiveCount}편
            </p>
          </button>
        </div>
      </section>

      {/* Department News Dispatch */}
      {departmentNews.length > 0 && (
        <section className="space-y-5">
          <div className="flex items-end justify-between border-b border-[#E5DEC9] dark:border-[#322E29] pb-4">
            <div>
              <p className="text-xs font-mono-tabular tracking-widest text-[#78716C] dark:text-[#8E867B] mb-1">
                00 · DEPARTMENT DISPATCH
              </p>
              <h2 className="font-editorial text-2xl sm:text-3xl font-semibold text-[#1C1917] dark:text-[#F5F2EB]">
                콘텐츠제작학과 주요 소식
              </h2>
            </div>
            <button
              type="button"
              onClick={onOpenNewsList}
              className="text-sm font-medium text-[#1E3A8A] dark:text-[#93B4FF] hover:underline inline-flex items-center gap-1 whitespace-nowrap shrink-0 cursor-pointer"
            >
              <span>소식 전체 보기</span>
              <ArrowUpRight className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {departmentNews.slice(0, 4).map((news) => (
              <article
                key={news.id}
                onClick={() => onSelectNews(news)}
                className="bg-white dark:bg-[#221F1C] border border-[#E5DEC9] dark:border-[#322E29] rounded-xl p-5 hover:border-[#1C1917]/40 dark:hover:border-[#93B4FF]/50 transition-colors cursor-pointer flex flex-col justify-between gap-3"
              >
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2 text-xs text-[#57534E] dark:text-[#B8B0A4]">
                    <span className="font-semibold text-[#1E3A8A] dark:text-[#93B4FF]">
                      {news.newsType}
                    </span>
                    <span aria-hidden="true">·</span>
                    <span>{news.source}</span>
                  </div>
                  <h3 className="font-editorial text-lg font-semibold text-[#1C1917] dark:text-[#F5F2EB] leading-snug">
                    {news.title}
                  </h3>
                  <p className="text-xs text-[#57534E] dark:text-[#B8B0A4] line-clamp-2 leading-relaxed">
                    {news.summary}
                  </p>
                </div>
                {news.eventSchedule && (
                  <p className="text-xs font-mono-tabular text-[#78716C] dark:text-[#8E867B] pt-2 border-t border-[#E5DEC9]/60 dark:border-[#322E29]">
                    {news.eventSchedule}
                  </p>
                )}
              </article>
            ))}
          </div>
        </section>
      )}

      {/* 2. Tier 1 & Tier 2: Lead Contest Feature + Secondary Contests */}
      <section className="space-y-6">
        <div className="flex items-end justify-between border-b border-[#E5DEC9] dark:border-[#322E29] pb-4">
          <div>
            <p className="text-xs font-mono-tabular tracking-widest text-[#78716C] dark:text-[#8E867B] mb-1">
              01 · CURATED CONTESTS
            </p>
            <h2 className="font-editorial text-2xl sm:text-3xl font-semibold text-[#1C1917] dark:text-[#F5F2EB]">
              이번 주 주목할 교내·외 공모전
            </h2>
          </div>
          <button
            type="button"
            onClick={() => onNavigate('contests')}
            className="text-sm font-medium text-[#1E3A8A] dark:text-[#93B4FF] hover:underline inline-flex items-center gap-1 whitespace-nowrap shrink-0 cursor-pointer"
          >
            <span>전체 보기</span>
            <ArrowUpRight className="w-4 h-4" />
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Lead Story */}
          {leadContest && (
            <article
              onClick={() => onSelectContest(leadContest)}
              className="lg:col-span-7 bg-white dark:bg-[#221F1C] border border-[#E5DEC9] dark:border-[#322E29] rounded-xl overflow-hidden hover:border-[#1C1917]/40 dark:hover:border-[#93B4FF]/50 transition-colors cursor-pointer flex flex-col"
            >
              <div className="aspect-[16/9] bg-[#F2EDE4] dark:bg-[#1B1917] overflow-hidden">
                <EditorialImage
                  src={leadContest.imageUrl}
                  alt={leadContest.title}
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="p-6 sm:p-8 flex-1 flex flex-col justify-between space-y-4">
                <div className="space-y-3">
                  <div className="flex flex-wrap items-center gap-2 text-xs text-[#57534E] dark:text-[#B8B0A4]">
                    <span className="font-semibold text-[#1E3A8A] dark:text-[#93B4FF]">
                      {leadContest.scope}
                    </span>
                    <span aria-hidden="true">·</span>
                    <span>{leadContest.category}</span>
                    <span aria-hidden="true">·</span>
                    <span className="font-mono-tabular">
                      {computeDday(leadContest.deadline).label} ({leadContest.deadline})
                    </span>
                  </div>
                  <h3 className="font-editorial text-2xl font-semibold text-[#1C1917] dark:text-[#F5F2EB] leading-snug headline-balance">
                    {leadContest.title}
                  </h3>
                  <p className="text-sm text-[#57534E] dark:text-[#B8B0A4] leading-relaxed line-clamp-2">
                    {leadContest.summary}
                  </p>
                </div>
                <div className="pt-4 border-t border-[#E5DEC9]/70 dark:border-[#322E29] flex items-center justify-between text-xs text-[#78716C] dark:text-[#8E867B]">
                  <span>주최: {leadContest.organizer}</span>
                  <span className="font-medium text-[#1C1917] dark:text-[#F5F2EB]">
                    {leadContest.prize}
                  </span>
                </div>
              </div>
            </article>
          )}

          {/* Secondary Contests List */}
          <div className="lg:col-span-5 flex flex-col divide-y divide-[#E5DEC9] dark:divide-[#322E29] border-t border-b border-[#E5DEC9] dark:border-[#322E29] bg-white/60 dark:bg-[#221F1C]/80 rounded-xl px-5">
            {secondaryContests.map((contest) => {
              const dday = computeDday(contest.deadline);
              return (
                <article
                  key={contest.id}
                  onClick={() => onSelectContest(contest)}
                  className="py-5 cursor-pointer group flex flex-col justify-between gap-2"
                >
                  <div className="flex items-center justify-between gap-3 text-xs text-[#57534E] dark:text-[#B8B0A4]">
                    <div className="flex items-center gap-2">
                      <span
                        className={`font-semibold ${
                          contest.scope === '교내'
                            ? 'text-[#1E3A8A] dark:text-[#93B4FF]'
                            : 'text-[#B45309] dark:text-[#FBBF24]'
                        }`}
                      >
                        {contest.scope}
                      </span>
                      <span aria-hidden="true">·</span>
                      <span>{contest.category}</span>
                    </div>
                    <span
                      className={`font-mono-tabular font-semibold ${
                        dday.isUrgent
                          ? 'text-[#9A3412] dark:text-[#FB923C]'
                          : 'text-[#57534E] dark:text-[#B8B0A4]'
                      }`}
                    >
                      {dday.label}
                    </span>
                  </div>
                  <h4 className="font-editorial text-lg font-semibold text-[#1C1917] dark:text-[#F5F2EB] group-hover:text-[#1E3A8A] dark:group-hover:text-[#93B4FF] transition-colors leading-snug">
                    {contest.title}
                  </h4>
                  <p className="text-xs text-[#57534E] dark:text-[#B8B0A4] line-clamp-2 leading-relaxed">
                    {contest.summary}
                  </p>
                  <p className="text-xs text-[#78716C] dark:text-[#8E867B]">
                    {contest.organizer} · {contest.prize}
                  </p>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      {/* 3. Club Recruitment Highlights */}
      <section className="space-y-6">
        <div className="flex items-end justify-between border-b border-[#E5DEC9] dark:border-[#322E29] pb-4">
          <div>
            <p className="text-xs font-mono-tabular tracking-widest text-[#78716C] dark:text-[#8E867B] mb-1">
              02 · CAMPUS CLUBS & SOCIETIES
            </p>
            <h2 className="font-editorial text-2xl sm:text-3xl font-semibold text-[#1C1917] dark:text-[#F5F2EB]">
              함께 만들 동아리 및 제작 크루
            </h2>
          </div>
          <button
            type="button"
            onClick={() => onNavigate('clubs')}
            className="text-sm font-medium text-[#1E3A8A] dark:text-[#93B4FF] hover:underline inline-flex items-center gap-1 whitespace-nowrap shrink-0 cursor-pointer"
          >
            <span>모집 게시판 이동</span>
            <ArrowUpRight className="w-4 h-4" />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {featuredClubs.map((club) => (
            <article
              key={club.id}
              onClick={() => onSelectClub(club)}
              className="bg-white dark:bg-[#221F1C] border border-[#E5DEC9] dark:border-[#322E29] rounded-xl overflow-hidden hover:border-[#1C1917]/40 dark:hover:border-[#93B4FF]/50 transition-colors cursor-pointer flex flex-col"
            >
              <div className="aspect-[4/3] bg-[#F2EDE4] dark:bg-[#1B1917] overflow-hidden">
                <EditorialImage
                  src={club.imageUrl}
                  alt={club.clubName}
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="p-5 flex-1 flex flex-col justify-between space-y-3">
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-xs text-[#57534E] dark:text-[#B8B0A4]">
                    <span
                      className={`font-semibold ${
                        club.status === '마감'
                          ? 'text-[#78716C] dark:text-[#8E867B]'
                          : 'text-[#1E3A8A] dark:text-[#93B4FF]'
                      }`}
                    >
                      {club.status}
                    </span>
                    <span aria-hidden="true">·</span>
                    <span>{club.field}</span>
                    <span aria-hidden="true">·</span>
                    <span>{club.recruitCount}</span>
                  </div>
                  <h3 className="font-editorial text-lg font-semibold text-[#1C1917] dark:text-[#F5F2EB] leading-snug">
                    {club.clubName}
                  </h3>
                  <p className="text-sm text-[#57534E] dark:text-[#B8B0A4] line-clamp-2">
                    {club.title}
                  </p>
                </div>
                <p className="pt-3 border-t border-[#E5DEC9]/70 dark:border-[#322E29] text-xs text-[#78716C] dark:text-[#8E867B]">
                  {club.schedule}
                </p>
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* 4. Portfolio Archive & Major Hub Directory */}
      <section className="space-y-6">
        <div className="flex items-end justify-between border-b border-[#E5DEC9] dark:border-[#322E29] pb-4">
          <div>
            <p className="text-xs font-mono-tabular tracking-widest text-[#78716C] dark:text-[#8E867B] mb-1">
              03 · STUDENT ARCHIVE & STUDY HUB
            </p>
            <h2 className="font-editorial text-2xl sm:text-3xl font-semibold text-[#1C1917] dark:text-[#F5F2EB]">
              학과 학생 작업물 & 전공 공부 허브
            </h2>
          </div>
          <button
            type="button"
            onClick={() => onNavigate('major', 'portfolio')}
            className="text-sm font-medium text-[#1E3A8A] dark:text-[#93B4FF] hover:underline inline-flex items-center gap-1 whitespace-nowrap shrink-0 cursor-pointer"
          >
            <span>포트폴리오 갤러리</span>
            <ArrowUpRight className="w-4 h-4" />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {featuredWorks.map((work) => (
            <article
              key={work.id}
              onClick={() => onSelectPortfolio(work)}
              className="bg-white dark:bg-[#221F1C] border border-[#E5DEC9] dark:border-[#322E29] rounded-xl overflow-hidden hover:border-[#1C1917]/40 dark:hover:border-[#93B4FF]/50 transition-colors cursor-pointer flex flex-col"
            >
              <div className="aspect-[4/3] bg-[#F2EDE4] dark:bg-[#1B1917] overflow-hidden">
                <EditorialImage
                  src={work.imageUrl}
                  alt={work.title}
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="p-5 space-y-2">
                <div className="flex items-center gap-2 text-xs text-[#57534E] dark:text-[#B8B0A4]">
                  <span className="font-medium text-[#1C1917] dark:text-[#F5F2EB]">
                    {work.track}
                  </span>
                  <span aria-hidden="true">·</span>
                  <span>{work.authorName}</span>
                  {work.authorGrade && (
                    <>
                      <span aria-hidden="true">·</span>
                      <span>{work.authorGrade}</span>
                    </>
                  )}
                </div>
                <h3 className="font-editorial text-lg font-semibold text-[#1C1917] dark:text-[#F5F2EB] leading-snug">
                  {work.title}
                </h3>
                <p className="text-xs text-[#78716C] dark:text-[#8E867B]">{work.toolsUsed}</p>
              </div>
            </article>
          ))}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-2">
          <button
            type="button"
            onClick={() => onNavigate('major', 'study')}
            className="p-5 bg-[#F2EDE4]/60 dark:bg-[#1B1917] border border-[#E5DEC9] dark:border-[#322E29] rounded-xl text-left hover:bg-[#F2EDE4] dark:hover:bg-[#221F1C] transition-colors cursor-pointer"
          >
            <p className="text-xs font-mono-tabular text-[#78716C] dark:text-[#8E867B] mb-1">
              01 · STUDY TIPS
            </p>
            <p className="font-editorial text-base font-semibold text-[#1C1917] dark:text-[#F5F2EB] mb-1">
              강의·과제 팁 & 스터디
            </p>
            <p className="text-xs text-[#57534E] dark:text-[#B8B0A4]">
              전공 과목 노하우와 스터디원 모집
            </p>
          </button>
          <button
            type="button"
            onClick={() => onNavigate('major', 'team')}
            className="p-5 bg-[#F2EDE4]/60 dark:bg-[#1B1917] border border-[#E5DEC9] dark:border-[#322E29] rounded-xl text-left hover:bg-[#F2EDE4] dark:hover:bg-[#221F1C] transition-colors cursor-pointer"
          >
            <p className="text-xs font-mono-tabular text-[#78716C] dark:text-[#8E867B] mb-1">
              02 · TEAM MATCHING
            </p>
            <p className="font-editorial text-base font-semibold text-[#1C1917] dark:text-[#F5F2EB] mb-1">
              공모전 팀원 매칭
            </p>
            <p className="text-xs text-[#57534E] dark:text-[#B8B0A4]">
              연출·촬영·편집·디자인 포지션 구인
            </p>
          </button>
          <button
            type="button"
            onClick={() => onNavigate('major', 'portfolio')}
            className="p-5 bg-[#F2EDE4]/60 dark:bg-[#1B1917] border border-[#E5DEC9] dark:border-[#322E29] rounded-xl text-left hover:bg-[#F2EDE4] dark:hover:bg-[#221F1C] transition-colors cursor-pointer"
          >
            <p className="text-xs font-mono-tabular text-[#78716C] dark:text-[#8E867B] mb-1">
              03 · CRITIQUE
            </p>
            <p className="font-editorial text-base font-semibold text-[#1C1917] dark:text-[#F5F2EB] mb-1">
              포트폴리오 피드백
            </p>
            <p className="text-xs text-[#57534E] dark:text-[#B8B0A4]">
              작업물 전시 및 동료 크리틱 교환
            </p>
          </button>
          <button
            type="button"
            onClick={() => onNavigate('major', 'wiki')}
            className="p-5 bg-[#F2EDE4]/60 dark:bg-[#1B1917] border border-[#E5DEC9] dark:border-[#322E29] rounded-xl text-left hover:bg-[#F2EDE4] dark:hover:bg-[#221F1C] transition-colors cursor-pointer"
          >
            <p className="text-xs font-mono-tabular text-[#78716C] dark:text-[#8E867B] mb-1">
              04 · GEAR & TOOLS
            </p>
            <p className="font-editorial text-base font-semibold text-[#1C1917] dark:text-[#F5F2EB] mb-1">
              교내 장비·툴 위키
            </p>
            <p className="text-xs text-[#57534E] dark:text-[#B8B0A4]">
              기자재실 대여 안내 및 편집 툴 팁
            </p>
          </button>
        </div>
      </section>
    </div>
  );
}
