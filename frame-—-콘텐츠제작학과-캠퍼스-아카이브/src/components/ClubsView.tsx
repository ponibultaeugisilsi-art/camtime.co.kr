import { addDoc, collection, deleteDoc, doc, serverTimestamp, updateDoc } from 'firebase/firestore';
import { Pencil, Plus, Search, Trash2, X } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { GENERATED_IMAGES } from '../data/seedData';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { clampStr, FIELD_LIMITS, formatKoreanDate } from '../lib/validation';
import { ClubField, ClubPost, ClubStatus, MemberProfile } from '../types';
import { CommentSection } from './CommentSection';
import { EditorialImage } from './EditorialImage';

interface ClubsViewProps {
  clubs: ClubPost[];
  selectedClub: ClubPost | null;
  onSelectClub: (club: ClubPost | null) => void;
  currentUid: string | null;
  memberProfile: MemberProfile | null;
  isAdmin: boolean;
  isLiveCollection: boolean;
  reportedKeys?: Set<string>;
  onRequireAuth: () => void;
  onNotify: (msg: string) => void;
}

const STATUSES: ('전체' | ClubStatus)[] = ['전체', '모집중', '상시모집', '마감'];
const FIELDS: ('전체' | ClubField)[] = [
  '전체',
  '영상제작',
  '시나리오·기획',
  '모션·3D',
  '사진·스튜디오',
  '뉴미디어·웹',
];

export function ClubsView({
  clubs,
  selectedClub,
  onSelectClub,
  currentUid,
  memberProfile,
  isAdmin,
  isLiveCollection,
  reportedKeys,
  onRequireAuth,
  onNotify,
}: ClubsViewProps) {
  const [statusFilter, setStatusFilter] = useState<'전체' | ClubStatus>('전체');
  const [fieldFilter, setFieldFilter] = useState<'전체' | ClubField>('전체');
  const [searchQuery, setSearchQuery] = useState('');

  const [formOpen, setFormOpen] = useState(false);
  const [editingClub, setEditingClub] = useState<ClubPost | null>(null);
  const [clubName, setClubName] = useState('');
  const [title, setTitle] = useState('');
  const [field, setField] = useState<ClubField>('영상제작');
  const [status, setStatus] = useState<ClubStatus>('모집중');
  const [recruitCount, setRecruitCount] = useState('');
  const [schedule, setSchedule] = useState('');
  const [contactInfo, setContactInfo] = useState('');
  const [description, setDescription] = useState('');
  const [imageUrl, setImageUrl] = useState<string>(GENERATED_IMAGES.clubWorkshop);
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (formOpen) setFormOpen(false);
        else if (selectedClub) onSelectClub(null);
      }
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [formOpen, selectedClub, onSelectClub]);

  const filtered = clubs.filter((c) => {
    if (statusFilter !== '전체' && c.status !== statusFilter) return false;
    if (fieldFilter !== '전체' && c.field !== fieldFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      return (
        c.clubName.toLowerCase().includes(q) ||
        c.title.toLowerCase().includes(q) ||
        c.description.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const openCreateForm = () => {
    if (!currentUid || !memberProfile) {
      onRequireAuth();
      return;
    }
    setEditingClub(null);
    setClubName('');
    setTitle('');
    setField('영상제작');
    setStatus('모집중');
    setRecruitCount('');
    setSchedule('');
    setContactInfo('');
    setDescription('');
    setImageUrl(GENERATED_IMAGES.clubWorkshop);
    setFormError('');
    setFormOpen(true);
  };

  const openEditForm = (club: ClubPost) => {
    setEditingClub(club);
    setClubName(club.clubName);
    setTitle(club.title);
    setField(club.field);
    setStatus(club.status);
    setRecruitCount(club.recruitCount);
    setSchedule(club.schedule);
    setContactInfo(club.contactInfo);
    setDescription(club.description);
    setImageUrl(club.imageUrl || GENERATED_IMAGES.clubWorkshop);
    setFormError('');
    setFormOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUid || !memberProfile) {
      onRequireAuth();
      return;
    }
    const cleanClubName = clampStr(clubName, FIELD_LIMITS.CLUB_NAME_MAX);
    const cleanTitle = clampStr(title, FIELD_LIMITS.POST_TITLE_MAX);
    const cleanCount = clampStr(recruitCount, FIELD_LIMITS.RECRUIT_COUNT_MAX);
    const cleanSchedule = clampStr(schedule, FIELD_LIMITS.SCHEDULE_MAX);
    const cleanContact = clampStr(contactInfo, FIELD_LIMITS.CONTACT_MAX);
    const cleanDesc = clampStr(description, FIELD_LIMITS.DESCRIPTION_MAX);
    const cleanImg = clampStr(imageUrl, FIELD_LIMITS.URL_MAX);

    if (!cleanClubName || cleanTitle.length < 2 || !cleanCount || !cleanSchedule || !cleanContact) {
      setFormError('필수 입력 항목을 모두 작성해 주세요.');
      return;
    }

    setSaving(true);
    setFormError('');
    try {
      if (editingClub) {
        await updateDoc(doc(db, 'clubs', editingClub.id), {
          clubName: cleanClubName,
          title: cleanTitle,
          field,
          status,
          recruitCount: cleanCount,
          schedule: cleanSchedule,
          contactInfo: cleanContact,
          description: cleanDesc,
          imageUrl: cleanImg,
          updatedAt: serverTimestamp(),
        });
        onNotify('동아리 모집 글이 수정되었습니다.');
        onSelectClub(null);
      } else {
        await addDoc(collection(db, 'clubs'), {
          clubName: cleanClubName,
          title: cleanTitle,
          field,
          status,
          recruitCount: cleanCount,
          schedule: cleanSchedule,
          contactInfo: cleanContact,
          description: cleanDesc,
          imageUrl: cleanImg,
          authorId: currentUid,
          authorName: clampStr(
            `${memberProfile.nickname} (${memberProfile.grade})`,
            FIELD_LIMITS.NICKNAME_MAX
          ),
          isPublished: true,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
        onNotify('동아리 모집 공고가 등록되었습니다.');
      }
      setFormOpen(false);
    } catch (err) {
      handleFirestoreError(
        err,
        editingClub ? OperationType.UPDATE : OperationType.CREATE,
        editingClub ? `clubs/${editingClub.id}` : 'clubs'
      );
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (club: ClubPost) => {
    try {
      await deleteDoc(doc(db, 'clubs', club.id));
      onNotify('동아리 모집 글이 삭제되었습니다.');
      onSelectClub(null);
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `clubs/${club.id}`);
    }
  };

  return (
    <div className="space-y-8 pb-16 pt-8">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-[#E5DEC9] dark:border-[#322E29] pb-6">
        <div>
          <p className="text-xs font-mono-tabular tracking-widest text-[#78716C] dark:text-[#8E867B] mb-1">
            CAMPUS CLUBS & CREWS
          </p>
          <h1 className="font-editorial text-3xl sm:text-4xl font-semibold text-[#1C1917] dark:text-[#F5F2EB]">
            동아리 모집 게시판
          </h1>
          <p className="text-sm text-[#57534E] dark:text-[#B8B0A4] mt-2">
            학과 전공 동아리와 소모임 모집 공고를 살펴보고, 댓글로 자유롭게 질문하거나 지원 의사를 남겨보세요.
          </p>
        </div>

        <button
          type="button"
          onClick={openCreateForm}
          className="px-4 py-2.5 bg-[#1C1917] dark:bg-[#F5F2EB] text-[#FBF9F5] dark:text-[#121110] text-xs font-medium rounded-lg hover:bg-[#1E3A8A] dark:hover:bg-[#93B4FF] transition-colors inline-flex items-center gap-2 whitespace-nowrap shrink-0 cursor-pointer self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>모집 글 작성</span>
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1 p-1 bg-[#F2EDE4] dark:bg-[#1B1917] rounded-lg">
            {STATUSES.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setStatusFilter(s)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  statusFilter === s
                    ? 'bg-white dark:bg-[#221F1C] text-[#1C1917] dark:text-[#F5F2EB] shadow-sm'
                    : 'text-[#57534E] dark:text-[#B8B0A4] hover:text-[#1C1917] dark:hover:text-[#F5F2EB]'
                }`}
              >
                {s}
              </button>
            ))}
          </div>

          <select
            value={fieldFilter}
            onChange={(e) => setFieldFilter(e.target.value as '전체' | ClubField)}
            aria-label="활동 분야 필터"
            className="px-3 py-2 text-xs font-medium bg-white dark:bg-[#1B1917] border border-[#E5DEC9] dark:border-[#322E29] rounded-lg text-[#1C1917] dark:text-[#F5F2EB] focus:outline-none focus:border-[#1E3A8A] dark:focus:border-[#93B4FF]"
          >
            {FIELDS.map((f) => (
              <option key={f} value={f}>
                {f === '전체' ? '분야: 전체' : f}
              </option>
            ))}
          </select>
        </div>

        <div className="relative w-full lg:w-72">
          <Search className="w-4 h-4 text-[#78716C] dark:text-[#8E867B] absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="동아리명, 모집 내용 검색"
            className="w-full pl-9 pr-3 py-2 text-xs bg-white dark:bg-[#1B1917] text-[#1C1917] dark:text-[#F5F2EB] placeholder:text-[#78716C] dark:placeholder:text-[#8E867B] border border-[#E5DEC9] dark:border-[#322E29] rounded-lg focus:outline-none focus:border-[#1E3A8A] dark:focus:border-[#93B4FF]"
          />
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="py-16 text-center bg-white dark:bg-[#221F1C] border border-[#E5DEC9] dark:border-[#322E29] rounded-xl">
          <p className="font-editorial text-lg text-[#1C1917] dark:text-[#F5F2EB] mb-1">
            등록된 동아리 모집 공고가 없습니다
          </p>
          <p className="text-xs text-[#78716C] dark:text-[#8E867B]">
            동아리 운영진이라면 첫 번째 신입 부원 모집 공고를 작성해 보세요.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map((club) => (
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

              <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
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

                  <h3 className="font-editorial text-xl font-semibold text-[#1C1917] dark:text-[#F5F2EB] leading-snug">
                    {club.clubName}
                  </h3>
                  <p className="text-sm font-medium text-[#1C1917] dark:text-[#F5F2EB] line-clamp-2">
                    {club.title}
                  </p>
                  <p className="text-xs text-[#57534E] dark:text-[#B8B0A4] line-clamp-2 leading-relaxed">
                    {club.description}
                  </p>
                </div>

                <div className="pt-3 border-t border-[#E5DEC9]/70 dark:border-[#322E29] flex items-center justify-between text-xs text-[#78716C] dark:text-[#8E867B]">
                  <span className="truncate">{club.schedule}</span>
                  <span className="shrink-0">댓글 소통</span>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}

      {/* Detail + Comments Modal */}
      {selectedClub && (
        <div
          className="fixed inset-0 z-50 bg-[#1C1917]/50 dark:bg-black/75 backdrop-blur-[2px] flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          onClick={() => onSelectClub(null)}
        >
          <div
            className="bg-[#FBF9F5] dark:bg-[#1B1917] border border-[#E5DEC9] dark:border-[#322E29] rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="aspect-[16/9] bg-[#F2EDE4] dark:bg-[#121110] relative">
              <EditorialImage
                src={selectedClub.imageUrl}
                alt={selectedClub.clubName}
                className="w-full h-full object-cover"
              />
              <button
                type="button"
                onClick={() => onSelectClub(null)}
                className="absolute top-4 right-4 p-2 bg-[#FBF9F5]/95 dark:bg-[#1B1917]/90 border border-[#E5DEC9] dark:border-[#322E29] rounded-lg text-[#1C1917] dark:text-[#F5F2EB] hover:bg-white dark:hover:bg-[#221F1C] cursor-pointer"
                aria-label="닫기"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 sm:p-8 space-y-6">
              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-2 text-xs text-[#57534E] dark:text-[#B8B0A4]">
                  <span className="font-semibold text-[#1E3A8A] dark:text-[#93B4FF]">
                    {selectedClub.status}
                  </span>
                  <span aria-hidden="true">·</span>
                  <span>{selectedClub.field}</span>
                  <span aria-hidden="true">·</span>
                  <span>{selectedClub.authorName}</span>
                  <span aria-hidden="true">·</span>
                  <span className="font-mono-tabular">
                    {formatKoreanDate(selectedClub.createdAt)}
                  </span>
                </div>
                <p className="text-sm font-semibold text-[#B45309] dark:text-[#FBBF24]">
                  {selectedClub.clubName}
                </p>
                <h2 className="font-editorial text-2xl sm:text-3xl font-semibold text-[#1C1917] dark:text-[#F5F2EB] leading-snug">
                  {selectedClub.title}
                </h2>
              </div>

              <dl className="grid grid-cols-1 sm:grid-cols-3 gap-4 py-4 border-y border-[#E5DEC9] dark:border-[#322E29] text-sm">
                <div>
                  <dt className="text-xs text-[#78716C] dark:text-[#8E867B] mb-0.5">모집 인원</dt>
                  <dd className="font-medium text-[#1C1917] dark:text-[#F5F2EB]">
                    {selectedClub.recruitCount}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-[#78716C] dark:text-[#8E867B] mb-0.5">
                    활동 일정·장소
                  </dt>
                  <dd className="font-medium text-[#1C1917] dark:text-[#F5F2EB]">
                    {selectedClub.schedule}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-[#78716C] dark:text-[#8E867B] mb-0.5">지원 및 문의</dt>
                  <dd className="font-medium text-[#1C1917] dark:text-[#F5F2EB]">
                    {selectedClub.contactInfo}
                  </dd>
                </div>
              </dl>

              <p className="text-sm text-[#57534E] dark:text-[#B8B0A4] leading-relaxed whitespace-pre-line">
                {selectedClub.description}
              </p>

              {isLiveCollection && (currentUid === selectedClub.authorId || isAdmin) && (
                <div className="flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => openEditForm(selectedClub)}
                    className="px-3 py-1.5 text-xs text-[#57534E] dark:text-[#B8B0A4] hover:text-[#1C1917] dark:hover:text-[#F5F2EB] inline-flex items-center gap-1 cursor-pointer"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                    <span>모집 글 수정</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(selectedClub)}
                    className="px-3 py-1.5 text-xs text-[#9A3412] dark:text-[#FB923C] hover:underline inline-flex items-center gap-1 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>삭제</span>
                  </button>
                </div>
              )}

              <CommentSection
                parentCollection="clubs"
                parentId={selectedClub.id}
                isLiveDocument={isLiveCollection}
                currentUid={currentUid}
                memberProfile={memberProfile}
                isAdmin={isAdmin}
                reportedKeys={reportedKeys}
                onRequireAuth={onRequireAuth}
                onNotify={onNotify}
                placeholder="동아리 활동 방식이나 지원에 대해 궁금한 점을 댓글로 남겨보세요."
              />
            </div>
          </div>
        </div>
      )}

      {/* Create/Edit Modal */}
      {formOpen && (
        <div
          className="fixed inset-0 z-50 bg-[#1C1917]/50 dark:bg-black/75 backdrop-blur-[2px] flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="bg-[#FBF9F5] dark:bg-[#1B1917] border border-[#E5DEC9] dark:border-[#322E29] rounded-xl max-w-xl w-full max-h-[90vh] overflow-y-auto p-6 sm:p-8 shadow-xl">
            <div className="flex items-center justify-between pb-4 border-b border-[#E5DEC9] dark:border-[#322E29]">
              <h2 className="font-editorial text-2xl font-semibold text-[#1C1917] dark:text-[#F5F2EB]">
                {editingClub ? '동아리 모집 글 수정' : '새 동아리 모집 글 작성'}
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
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium mb-1">동아리 / 학회명 *</label>
                  <input
                    type="text"
                    required
                    maxLength={FIELD_LIMITS.CLUB_NAME_MAX}
                    value={clubName}
                    onChange={(e) => setClubName(e.target.value)}
                    placeholder="예: 프레임랩 (FRAME LAB)"
                    className="w-full px-3.5 py-2 text-sm bg-white dark:bg-[#121110] text-[#1C1917] dark:text-[#F5F2EB] border border-[#E5DEC9] dark:border-[#322E29] rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1">활동 분야 *</label>
                  <select
                    value={field}
                    onChange={(e) => setField(e.target.value as ClubField)}
                    className="w-full px-3 py-2 text-sm bg-white dark:bg-[#121110] text-[#1C1917] dark:text-[#F5F2EB] border border-[#E5DEC9] dark:border-[#322E29] rounded-lg"
                  >
                    {FIELDS.filter((f) => f !== '전체').map((f) => (
                      <option key={f} value={f}>
                        {f}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium mb-1">모집 공고 제목 *</label>
                <input
                  type="text"
                  required
                  maxLength={FIELD_LIMITS.POST_TITLE_MAX}
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-3.5 py-2 text-sm bg-white dark:bg-[#121110] text-[#1C1917] dark:text-[#F5F2EB] border border-[#E5DEC9] dark:border-[#322E29] rounded-lg"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium mb-1">모집 상태 *</label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as ClubStatus)}
                    className="w-full px-3 py-2 text-sm bg-white dark:bg-[#121110] text-[#1C1917] dark:text-[#F5F2EB] border border-[#E5DEC9] dark:border-[#322E29] rounded-lg"
                  >
                    <option value="모집중">모집중</option>
                    <option value="상시모집">상시모집</option>
                    <option value="마감">마감</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1">모집 인원 *</label>
                  <input
                    type="text"
                    required
                    maxLength={FIELD_LIMITS.RECRUIT_COUNT_MAX}
                    value={recruitCount}
                    onChange={(e) => setRecruitCount(e.target.value)}
                    placeholder="예: 5명 내외"
                    className="w-full px-3.5 py-2 text-sm bg-white dark:bg-[#121110] text-[#1C1917] dark:text-[#F5F2EB] border border-[#E5DEC9] dark:border-[#322E29] rounded-lg"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium mb-1">정기 모임 일정 *</label>
                  <input
                    type="text"
                    required
                    maxLength={FIELD_LIMITS.SCHEDULE_MAX}
                    value={schedule}
                    onChange={(e) => setSchedule(e.target.value)}
                    placeholder="예: 매주 목 18:30 · 예술관 302호"
                    className="w-full px-3.5 py-2 text-sm bg-white dark:bg-[#121110] text-[#1C1917] dark:text-[#F5F2EB] border border-[#E5DEC9] dark:border-[#322E29] rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1">지원 및 문의 방법 *</label>
                  <input
                    type="text"
                    required
                    maxLength={FIELD_LIMITS.CONTACT_MAX}
                    value={contactInfo}
                    onChange={(e) => setContactInfo(e.target.value)}
                    placeholder="예: 오픈채팅 또는 댓글 문의"
                    className="w-full px-3.5 py-2 text-sm bg-white dark:bg-[#121110] text-[#1C1917] dark:text-[#F5F2EB] border border-[#E5DEC9] dark:border-[#322E29] rounded-lg"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium mb-1">동아리 소개 및 활동 계획 *</label>
                <textarea
                  rows={4}
                  required
                  maxLength={FIELD_LIMITS.DESCRIPTION_MAX}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-3.5 py-2 text-sm bg-white dark:bg-[#121110] text-[#1C1917] dark:text-[#F5F2EB] border border-[#E5DEC9] dark:border-[#322E29] rounded-lg"
                />
              </div>

              <div>
                <label className="block text-xs font-medium mb-1">대표 이미지 프리셋</label>
                <select
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-white dark:bg-[#121110] text-[#1C1917] dark:text-[#F5F2EB] border border-[#E5DEC9] dark:border-[#322E29] rounded-lg"
                >
                  <option value={GENERATED_IMAGES.clubWorkshop}>제작 워크숍 스튜디오</option>
                  <option value={GENERATED_IMAGES.heroStudio}>카메라·스토리보드 팀 작업</option>
                  <option value={GENERATED_IMAGES.portfolioFilm}>영상·모션 아트</option>
                  <option value={GENERATED_IMAGES.portfolioSound}>사운드·포스트 랩</option>
                </select>
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
                  {saving ? '저장 중...' : editingClub ? '수정 저장' : '모집 글 등록'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
