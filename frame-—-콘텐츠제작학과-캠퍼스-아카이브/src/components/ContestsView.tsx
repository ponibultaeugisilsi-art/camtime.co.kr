import { addDoc, collection, deleteDoc, doc, serverTimestamp, setDoc, updateDoc } from 'firebase/firestore';
import { Bookmark, BookmarkCheck, ExternalLink, Pencil, Plus, Search, Trash2, X } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { GENERATED_IMAGES } from '../data/seedData';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { clampStr, computeDday, DEADLINE_REGEX, FIELD_LIMITS } from '../lib/validation';
import { Contest, ContestCategory, ContestScope, MemberProfile } from '../types';
import { EditorialImage } from './EditorialImage';

interface ContestsViewProps {
  contests: Contest[];
  bookmarkedIds: Set<string>;
  selectedContest: Contest | null;
  onSelectContest: (c: Contest | null) => void;
  currentUid: string | null;
  memberProfile: MemberProfile | null;
  isAdmin: boolean;
  isLiveCollection: boolean;
  onRequireAuth: () => void;
  onNotify: (msg: string) => void;
}

const SCOPES: ('전체' | ContestScope)[] = ['전체', '교내', '교외'];
const CATEGORIES: ('전체' | ContestCategory)[] = [
  '전체',
  '영상·영화',
  '기획·마케팅',
  '디자인·웹',
  '3D·모션',
  '사운드',
];

export function ContestsView({
  contests,
  bookmarkedIds,
  selectedContest,
  onSelectContest,
  currentUid,
  memberProfile,
  isAdmin,
  isLiveCollection,
  onRequireAuth,
  onNotify,
}: ContestsViewProps) {
  const [scopeFilter, setScopeFilter] = useState<'전체' | ContestScope>('전체');
  const [catFilter, setCatFilter] = useState<'전체' | ContestCategory>('전체');
  const [sortBy, setSortBy] = useState<'deadline' | 'newest'>('deadline');
  const [searchQuery, setSearchQuery] = useState('');

  const [formOpen, setFormOpen] = useState(false);
  const [editingContest, setEditingContest] = useState<Contest | null>(null);
  const [title, setTitle] = useState('');
  const [scope, setScope] = useState<ContestScope>('교내');
  const [category, setCategory] = useState<ContestCategory>('영상·영화');
  const [organizer, setOrganizer] = useState('');
  const [deadline, setDeadline] = useState('2026-12-20');
  const [prize, setPrize] = useState('');
  const [summary, setSummary] = useState('');
  const [description, setDescription] = useState('');
  const [externalUrl, setExternalUrl] = useState('');
  const [imageUrl, setImageUrl] = useState<string>(GENERATED_IMAGES.contestFilm);
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (formOpen) setFormOpen(false);
        else if (selectedContest) onSelectContest(null);
      }
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [formOpen, selectedContest, onSelectContest]);

  const filtered = contests
    .filter((c) => {
      if (scopeFilter !== '전체' && c.scope !== scopeFilter) return false;
      if (catFilter !== '전체' && c.category !== catFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.trim().toLowerCase();
        return (
          c.title.toLowerCase().includes(q) ||
          c.organizer.toLowerCase().includes(q) ||
          c.summary.toLowerCase().includes(q)
        );
      }
      return true;
    })
    .sort((a, b) => {
      if (sortBy === 'deadline') {
        const da = computeDday(a.deadline).daysLeft;
        const dbDays = computeDday(b.deadline).daysLeft;
        const scoreA = da < 0 ? 10000 - da : da;
        const scoreB = dbDays < 0 ? 10000 - dbDays : dbDays;
        return scoreA - scoreB;
      }
      return 0;
    });

  const openCreateForm = () => {
    if (!currentUid || !memberProfile) {
      onRequireAuth();
      return;
    }
    setEditingContest(null);
    setTitle('');
    setScope('교내');
    setCategory('영상·영화');
    setOrganizer('');
    setDeadline('2026-12-20');
    setPrize('');
    setSummary('');
    setDescription('');
    setExternalUrl('');
    setImageUrl(GENERATED_IMAGES.contestFilm);
    setFormError('');
    setFormOpen(true);
  };

  const openEditForm = (contest: Contest) => {
    setEditingContest(contest);
    setTitle(contest.title);
    setScope(contest.scope);
    setCategory(contest.category);
    setOrganizer(contest.organizer);
    setDeadline(contest.deadline);
    setPrize(contest.prize);
    setSummary(contest.summary);
    setDescription(contest.description);
    setExternalUrl(contest.externalUrl);
    setImageUrl(contest.imageUrl || GENERATED_IMAGES.contestFilm);
    setFormError('');
    setFormOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUid || !memberProfile) {
      onRequireAuth();
      return;
    }
    const cleanTitle = clampStr(title, FIELD_LIMITS.CONTEST_TITLE_MAX);
    const cleanOrg = clampStr(organizer, FIELD_LIMITS.ORGANIZER_MAX);
    const cleanPrize = clampStr(prize, FIELD_LIMITS.PRIZE_MAX);
    const cleanSummary = clampStr(summary, FIELD_LIMITS.SUMMARY_MAX);
    const cleanDesc = clampStr(description, FIELD_LIMITS.DESCRIPTION_MAX);
    const cleanUrl = clampStr(externalUrl, FIELD_LIMITS.URL_MAX);
    const cleanImage = clampStr(imageUrl, FIELD_LIMITS.URL_MAX);

    if (cleanTitle.length < 2 || cleanOrg.length < 1 || cleanPrize.length < 1) {
      setFormError('제목, 주최 기관, 상금·혜택을 입력해 주세요.');
      return;
    }
    if (!DEADLINE_REGEX.test(deadline)) {
      setFormError('마감일은 YYYY-MM-DD 형식으로 입력해 주세요.');
      return;
    }
    if (cleanSummary.length < 2 || cleanDesc.length < 2) {
      setFormError('한 줄 요약과 상세 안내 내용을 2자 이상 입력해 주세요.');
      return;
    }

    setSaving(true);
    setFormError('');
    try {
      if (editingContest) {
        await updateDoc(doc(db, 'contests', editingContest.id), {
          title: cleanTitle,
          scope,
          category,
          organizer: cleanOrg,
          deadline,
          prize: cleanPrize,
          summary: cleanSummary,
          description: cleanDesc,
          externalUrl: cleanUrl,
          imageUrl: cleanImage,
          updatedAt: serverTimestamp(),
        });
        onNotify('공모전 정보가 수정되었습니다.');
        onSelectContest(null);
      } else {
        await addDoc(collection(db, 'contests'), {
          title: cleanTitle,
          scope,
          category,
          organizer: cleanOrg,
          deadline,
          prize: cleanPrize,
          summary: cleanSummary,
          description: cleanDesc,
          externalUrl: cleanUrl,
          imageUrl: cleanImage,
          authorId: currentUid,
          authorName: clampStr(memberProfile.nickname, FIELD_LIMITS.NICKNAME_MAX),
          isPublished: true,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
        onNotify('새 공모전이 아카이브에 등록되었습니다.');
      }
      setFormOpen(false);
    } catch (err) {
      handleFirestoreError(
        err,
        editingContest ? OperationType.UPDATE : OperationType.CREATE,
        editingContest ? `contests/${editingContest.id}` : 'contests'
      );
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (contest: Contest) => {
    try {
      await deleteDoc(doc(db, 'contests', contest.id));
      onNotify('공모전 게시글이 삭제되었습니다.');
      onSelectContest(null);
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `contests/${contest.id}`);
    }
  };

  const toggleBookmark = async (e: React.MouseEvent, contest: Contest) => {
    e.stopPropagation();
    if (!currentUid) {
      onRequireAuth();
      return;
    }
    if (!isLiveCollection) {
      onNotify('잠시 후 데이터가 동기화되면 북마크할 수 있습니다.');
      return;
    }
    const bookmarkId = `${currentUid}_${contest.id}`;
    try {
      if (bookmarkedIds.has(contest.id)) {
        await deleteDoc(doc(db, 'bookmarks', bookmarkId));
        onNotify('북마크에서 해제되었습니다.');
      } else {
        await setDoc(doc(db, 'bookmarks', bookmarkId), {
          userId: currentUid,
          contestId: contest.id,
          createdAt: serverTimestamp(),
        });
        onNotify('공모전을 북마크에 저장했습니다.');
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `bookmarks/${bookmarkId}`);
    }
  };

  return (
    <div className="space-y-8 pb-16 pt-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-[#E5DEC9] dark:border-[#322E29] pb-6">
        <div>
          <p className="text-xs font-mono-tabular tracking-widest text-[#78716C] dark:text-[#8E867B] mb-1">
            CONTEST ARCHIVE · ON-CAMPUS & EXTERNAL
          </p>
          <h1 className="font-editorial text-3xl sm:text-4xl font-semibold text-[#1C1917] dark:text-[#F5F2EB]">
            교내·외 공모전 홍보 아카이브
          </h1>
          <p className="text-sm text-[#57534E] dark:text-[#B8B0A4] mt-2">
            학과 및 학교 내부 행사부터 외부 콘텐츠·영상·디자인 공모전까지 마감 일정과 함께 확인하세요.
          </p>
        </div>

        <button
          type="button"
          onClick={openCreateForm}
          className="px-4 py-2.5 bg-[#1C1917] dark:bg-[#F5F2EB] text-[#FBF9F5] dark:text-[#121110] text-xs font-medium rounded-lg hover:bg-[#1E3A8A] dark:hover:bg-[#93B4FF] transition-colors inline-flex items-center gap-2 whitespace-nowrap shrink-0 cursor-pointer self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>공모전 등록하기</span>
        </button>
      </div>

      {/* Filters Toolbar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1 p-1 bg-[#F2EDE4] dark:bg-[#1B1917] rounded-lg">
            {SCOPES.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setScopeFilter(s)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  scopeFilter === s
                    ? 'bg-white dark:bg-[#221F1C] text-[#1C1917] dark:text-[#F5F2EB] shadow-sm'
                    : 'text-[#57534E] dark:text-[#B8B0A4] hover:text-[#1C1917] dark:hover:text-[#F5F2EB]'
                }`}
              >
                {s === '전체' ? '교내·외 전체' : `${s} 공모전`}
              </button>
            ))}
          </div>

          <select
            value={catFilter}
            onChange={(e) => setCatFilter(e.target.value as '전체' | ContestCategory)}
            aria-label="분야 필터"
            className="px-3 py-2 text-xs font-medium bg-white dark:bg-[#1B1917] border border-[#E5DEC9] dark:border-[#322E29] rounded-lg text-[#1C1917] dark:text-[#F5F2EB] focus:outline-none focus:border-[#1E3A8A] dark:focus:border-[#93B4FF]"
          >
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c === '전체' ? '분야: 전체' : c}
              </option>
            ))}
          </select>

          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as 'deadline' | 'newest')}
            aria-label="정렬 기준"
            className="px-3 py-2 text-xs font-medium bg-white dark:bg-[#1B1917] border border-[#E5DEC9] dark:border-[#322E29] rounded-lg text-[#1C1917] dark:text-[#F5F2EB] focus:outline-none focus:border-[#1E3A8A] dark:focus:border-[#93B4FF]"
          >
            <option value="deadline">마감 임박순</option>
            <option value="newest">최신 등록순</option>
          </select>
        </div>

        <div className="relative w-full lg:w-72">
          <Search className="w-4 h-4 text-[#78716C] dark:text-[#8E867B] absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="공모전명, 주최 기관 검색"
            className="w-full pl-9 pr-3 py-2 text-xs bg-white dark:bg-[#1B1917] text-[#1C1917] dark:text-[#F5F2EB] placeholder:text-[#78716C] dark:placeholder:text-[#8E867B] border border-[#E5DEC9] dark:border-[#322E29] rounded-lg focus:outline-none focus:border-[#1E3A8A] dark:focus:border-[#93B4FF]"
          />
        </div>
      </div>

      {/* Grid */}
      {filtered.length === 0 ? (
        <div className="py-16 text-center bg-white dark:bg-[#221F1C] border border-[#E5DEC9] dark:border-[#322E29] rounded-xl">
          <p className="font-editorial text-lg text-[#1C1917] dark:text-[#F5F2EB] mb-1">
            조건에 맞는 공모전이 없습니다
          </p>
          <p className="text-xs text-[#78716C] dark:text-[#8E867B]">
            필터를 변경하거나 새로운 교내·외 공모전 소식을 직접 공유해 보세요.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map((contest) => {
            const dday = computeDday(contest.deadline);
            const isBookmarked = bookmarkedIds.has(contest.id);
            return (
              <article
                key={contest.id}
                onClick={() => onSelectContest(contest)}
                className="bg-white dark:bg-[#221F1C] border border-[#E5DEC9] dark:border-[#322E29] rounded-xl overflow-hidden hover:border-[#1C1917]/40 dark:hover:border-[#93B4FF]/50 transition-colors cursor-pointer flex flex-col"
              >
                <div className="aspect-[4/3] bg-[#F2EDE4] dark:bg-[#1B1917] relative overflow-hidden">
                  <EditorialImage
                    src={contest.imageUrl}
                    alt={contest.title}
                    className="w-full h-full object-cover"
                  />
                  <button
                    type="button"
                    onClick={(e) => toggleBookmark(e, contest)}
                    aria-label={isBookmarked ? '북마크 해제' : '북마크 저장'}
                    className="absolute top-3 right-3 p-2 bg-[#FBF9F5]/95 dark:bg-[#1B1917]/90 border border-[#E5DEC9] dark:border-[#322E29] rounded-lg text-[#1C1917] dark:text-[#F5F2EB] hover:text-[#1E3A8A] dark:hover:text-[#93B4FF] transition-colors cursor-pointer"
                  >
                    {isBookmarked ? (
                      <BookmarkCheck className="w-4 h-4 text-[#1E3A8A] dark:text-[#93B4FF]" />
                    ) : (
                      <Bookmark className="w-4 h-4" />
                    )}
                  </button>
                </div>

                <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-2 text-xs text-[#57534E] dark:text-[#B8B0A4]">
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
                          dday.isClosed
                            ? 'text-[#78716C] dark:text-[#8E867B]'
                            : dday.isUrgent
                            ? 'text-[#9A3412] dark:text-[#FB923C]'
                            : 'text-[#1C1917] dark:text-[#F5F2EB]'
                        }`}
                      >
                        {dday.label}
                      </span>
                    </div>

                    <h3 className="font-editorial text-lg font-semibold text-[#1C1917] dark:text-[#F5F2EB] leading-snug line-clamp-2">
                      {contest.title}
                    </h3>
                    <p className="text-xs text-[#57534E] dark:text-[#B8B0A4] leading-relaxed line-clamp-2">
                      {contest.summary}
                    </p>
                  </div>

                  <div className="pt-3 border-t border-[#E5DEC9]/70 dark:border-[#322E29] flex items-center justify-between gap-2 text-xs text-[#78716C] dark:text-[#8E867B]">
                    <span className="truncate">{contest.organizer}</span>
                    <span className="font-mono-tabular shrink-0">{contest.deadline}</span>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {/* Detail Modal */}
      {selectedContest && (
        <div
          className="fixed inset-0 z-50 bg-[#1C1917]/50 dark:bg-black/75 backdrop-blur-[2px] flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          onClick={() => onSelectContest(null)}
        >
          <div
            className="bg-[#FBF9F5] dark:bg-[#1B1917] border border-[#E5DEC9] dark:border-[#322E29] rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="aspect-[16/9] bg-[#F2EDE4] dark:bg-[#121110] relative">
              <EditorialImage
                src={selectedContest.imageUrl}
                alt={selectedContest.title}
                className="w-full h-full object-cover"
              />
              <button
                type="button"
                onClick={() => onSelectContest(null)}
                className="absolute top-4 right-4 p-2 bg-[#FBF9F5]/95 dark:bg-[#1B1917]/90 border border-[#E5DEC9] dark:border-[#322E29] rounded-lg text-[#1C1917] dark:text-[#F5F2EB] hover:bg-white dark:hover:bg-[#221F1C] cursor-pointer"
                aria-label="닫기"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 sm:p-8 space-y-6">
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-xs text-[#57534E] dark:text-[#B8B0A4]">
                  <span
                    className={`font-semibold ${
                      selectedContest.scope === '교내'
                        ? 'text-[#1E3A8A] dark:text-[#93B4FF]'
                        : 'text-[#B45309] dark:text-[#FBBF24]'
                    }`}
                  >
                    {selectedContest.scope}
                  </span>
                  <span aria-hidden="true">·</span>
                  <span>{selectedContest.category}</span>
                  <span aria-hidden="true">·</span>
                  <span className="font-mono-tabular font-semibold text-[#1C1917] dark:text-[#F5F2EB]">
                    {computeDday(selectedContest.deadline).label} (마감 {selectedContest.deadline})
                  </span>
                </div>
                <h2 className="font-editorial text-2xl sm:text-3xl font-semibold text-[#1C1917] dark:text-[#F5F2EB] leading-snug">
                  {selectedContest.title}
                </h2>
              </div>

              <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-4 border-y border-[#E5DEC9] dark:border-[#322E29] text-sm">
                <div>
                  <dt className="text-xs text-[#78716C] dark:text-[#8E867B] mb-0.5">주최 · 주관</dt>
                  <dd className="font-medium text-[#1C1917] dark:text-[#F5F2EB]">
                    {selectedContest.organizer}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-[#78716C] dark:text-[#8E867B] mb-0.5">시상 · 혜택</dt>
                  <dd className="font-medium text-[#1C1917] dark:text-[#F5F2EB]">
                    {selectedContest.prize}
                  </dd>
                </div>
              </dl>

              <div className="space-y-2">
                <p className="text-sm font-medium text-[#1C1917] dark:text-[#F5F2EB]">
                  {selectedContest.summary}
                </p>
                <p className="text-sm text-[#57534E] dark:text-[#B8B0A4] leading-relaxed whitespace-pre-line">
                  {selectedContest.description}
                </p>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-[#E5DEC9] dark:border-[#322E29]">
                <div className="flex items-center gap-2.5">
                  <button
                    type="button"
                    onClick={(e) => toggleBookmark(e, selectedContest)}
                    className="px-4 py-2 text-xs font-medium border border-[#E5DEC9] dark:border-[#322E29] bg-white dark:bg-[#221F1C] text-[#1C1917] dark:text-[#F5F2EB] rounded-lg hover:border-[#1C1917] dark:hover:border-[#F5F2EB] inline-flex items-center gap-1.5 cursor-pointer"
                  >
                    {bookmarkedIds.has(selectedContest.id) ? (
                      <>
                        <BookmarkCheck className="w-4 h-4 text-[#1E3A8A] dark:text-[#93B4FF]" />
                        <span>북마크 저장됨</span>
                      </>
                    ) : (
                      <>
                        <Bookmark className="w-4 h-4" />
                        <span>북마크 저장</span>
                      </>
                    )}
                  </button>

                  {selectedContest.externalUrl && (
                    <a
                      href={selectedContest.externalUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="px-4 py-2 text-xs font-medium bg-[#1C1917] dark:bg-[#F5F2EB] text-[#FBF9F5] dark:text-[#121110] rounded-lg hover:bg-[#1E3A8A] dark:hover:bg-[#93B4FF] transition-colors inline-flex items-center gap-1.5"
                    >
                      <span>공고 원문 보기</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  )}
                </div>

                {isLiveCollection && (currentUid === selectedContest.authorId || isAdmin) && (
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => openEditForm(selectedContest)}
                      className="px-3 py-2 text-xs text-[#57534E] dark:text-[#B8B0A4] hover:text-[#1C1917] dark:hover:text-[#F5F2EB] inline-flex items-center gap-1 cursor-pointer"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                      <span>수정</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(selectedContest)}
                      className="px-3 py-2 text-xs text-[#9A3412] dark:text-[#FB923C] hover:underline inline-flex items-center gap-1 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>삭제</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Create/Edit Form Modal */}
      {formOpen && (
        <div
          className="fixed inset-0 z-50 bg-[#1C1917]/50 dark:bg-black/75 backdrop-blur-[2px] flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="bg-[#FBF9F5] dark:bg-[#1B1917] border border-[#E5DEC9] dark:border-[#322E29] rounded-xl max-w-xl w-full max-h-[90vh] overflow-y-auto p-6 sm:p-8 shadow-xl">
            <div className="flex items-center justify-between pb-4 border-b border-[#E5DEC9] dark:border-[#322E29]">
              <h2 className="font-editorial text-2xl font-semibold text-[#1C1917] dark:text-[#F5F2EB]">
                {editingContest ? '공모전 정보 수정' : '새 공모전 홍보 등록'}
              </h2>
              <button
                type="button"
                onClick={() => setFormOpen(false)}
                className="p-2 text-[#57534E] dark:text-[#B8B0A4] hover:text-[#1C1917] dark:hover:text-[#F5F2EB] cursor-pointer"
                aria-label="닫기"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="pt-5 space-y-4">
              <div>
                <label className="block text-xs font-medium mb-1">공모전 제목 *</label>
                <input
                  type="text"
                  required
                  maxLength={FIELD_LIMITS.CONTEST_TITLE_MAX}
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-3.5 py-2 text-sm bg-white dark:bg-[#121110] text-[#1C1917] dark:text-[#F5F2EB] border border-[#E5DEC9] dark:border-[#322E29] rounded-lg focus:outline-none focus:border-[#1E3A8A] dark:focus:border-[#93B4FF]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium mb-1">구분 *</label>
                  <select
                    value={scope}
                    onChange={(e) => setScope(e.target.value as ContestScope)}
                    className="w-full px-3 py-2 text-sm bg-white dark:bg-[#121110] text-[#1C1917] dark:text-[#F5F2EB] border border-[#E5DEC9] dark:border-[#322E29] rounded-lg"
                  >
                    <option value="교내">교내 공모전</option>
                    <option value="교외">교외 공모전</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1">분야 *</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value as ContestCategory)}
                    className="w-full px-3 py-2 text-sm bg-white dark:bg-[#121110] text-[#1C1917] dark:text-[#F5F2EB] border border-[#E5DEC9] dark:border-[#322E29] rounded-lg"
                  >
                    {CATEGORIES.filter((c) => c !== '전체').map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium mb-1">주최 · 주관 *</label>
                  <input
                    type="text"
                    required
                    maxLength={FIELD_LIMITS.ORGANIZER_MAX}
                    value={organizer}
                    onChange={(e) => setOrganizer(e.target.value)}
                    placeholder="예: 콘텐츠제작학과 학생회"
                    className="w-full px-3.5 py-2 text-sm bg-white dark:bg-[#121110] text-[#1C1917] dark:text-[#F5F2EB] border border-[#E5DEC9] dark:border-[#322E29] rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1">마감일 (YYYY-MM-DD) *</label>
                  <input
                    type="date"
                    required
                    value={deadline}
                    onChange={(e) => setDeadline(e.target.value)}
                    className="w-full px-3.5 py-2 text-sm bg-white dark:bg-[#121110] text-[#1C1917] dark:text-[#F5F2EB] border border-[#E5DEC9] dark:border-[#322E29] rounded-lg"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium mb-1">시상 규모 · 혜택 *</label>
                <input
                  type="text"
                  required
                  maxLength={FIELD_LIMITS.PRIZE_MAX}
                  value={prize}
                  onChange={(e) => setPrize(e.target.value)}
                  placeholder="예: 대상 200만 원 및 상영회 지원"
                  className="w-full px-3.5 py-2 text-sm bg-white dark:bg-[#121110] text-[#1C1917] dark:text-[#F5F2EB] border border-[#E5DEC9] dark:border-[#322E29] rounded-lg"
                />
              </div>

              <div>
                <label className="block text-xs font-medium mb-1">한 줄 요약 *</label>
                <input
                  type="text"
                  required
                  maxLength={FIELD_LIMITS.SUMMARY_MAX}
                  value={summary}
                  onChange={(e) => setSummary(e.target.value)}
                  className="w-full px-3.5 py-2 text-sm bg-white dark:bg-[#121110] text-[#1C1917] dark:text-[#F5F2EB] border border-[#E5DEC9] dark:border-[#322E29] rounded-lg"
                />
              </div>

              <div>
                <label className="block text-xs font-medium mb-1">상세 안내 *</label>
                <textarea
                  rows={4}
                  required
                  maxLength={FIELD_LIMITS.DESCRIPTION_MAX}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-3.5 py-2 text-sm bg-white dark:bg-[#121110] text-[#1C1917] dark:text-[#F5F2EB] border border-[#E5DEC9] dark:border-[#322E29] rounded-lg"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium mb-1">참고 링크 (선택)</label>
                  <input
                    type="url"
                    maxLength={FIELD_LIMITS.URL_MAX}
                    value={externalUrl}
                    onChange={(e) => setExternalUrl(e.target.value)}
                    placeholder="https://..."
                    className="w-full px-3.5 py-2 text-sm bg-white dark:bg-[#121110] text-[#1C1917] dark:text-[#F5F2EB] border border-[#E5DEC9] dark:border-[#322E29] rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1">커버 이미지 프리셋</label>
                  <select
                    value={imageUrl}
                    onChange={(e) => setImageUrl(e.target.value)}
                    className="w-full px-3 py-2 text-sm bg-white dark:bg-[#121110] text-[#1C1917] dark:text-[#F5F2EB] border border-[#E5DEC9] dark:border-[#322E29] rounded-lg"
                  >
                    <option value={GENERATED_IMAGES.contestFilm}>단편영화제 / 시네마</option>
                    <option value={GENERATED_IMAGES.heroStudio}>스튜디오 / 팀 워크숍</option>
                    <option value={GENERATED_IMAGES.clubWorkshop}>촬영·기획 프로덕션</option>
                    <option value={GENERATED_IMAGES.portfolioFilm}>모션·아키텍처 스틸</option>
                    <option value={GENERATED_IMAGES.portfolioSound}>사운드·미디어 랩</option>
                  </select>
                </div>
              </div>

              {formError && (
                <p className="text-xs text-[#9A3412] dark:text-[#FB923C] bg-[#9A3412]/10 dark:bg-[#FB923C]/15 px-3 py-2 rounded-lg">
                  {formError}
                </p>
              )}

              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setFormOpen(false)}
                  className="px-4 py-2 text-xs font-medium border border-[#E5DEC9] dark:border-[#322E29] rounded-lg hover:bg-[#F2EDE4] dark:hover:bg-[#221F1C] cursor-pointer"
                >
                  취소
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 text-xs font-medium bg-[#1C1917] dark:bg-[#F5F2EB] text-[#FBF9F5] dark:text-[#121110] rounded-lg hover:bg-[#1E3A8A] dark:hover:bg-[#93B4FF] disabled:opacity-50 cursor-pointer"
                >
                  {saving ? '저장 중...' : editingContest ? '수정 저장' : '공모전 등록'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
