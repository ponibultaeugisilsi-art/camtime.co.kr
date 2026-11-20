import { signOut } from 'firebase/auth';
import { doc, serverTimestamp, updateDoc } from 'firebase/firestore';
import { Bookmark, Flag, LogOut, Pencil, User } from 'lucide-react';
import React, { useState } from 'react';
import { auth, db, handleFirestoreError, OperationType } from '../firebase';
import {
  clampStr,
  computeDday,
  FIELD_LIMITS,
  formatKoreanDate,
  sanitizeStringList,
} from '../lib/validation';
import {
  ClubPost,
  CommunityPost,
  CommunityReport,
  Contest,
  GradeOption,
  MainTab,
  MajorTrackOption,
  MemberProfile,
  PortfolioWork,
  StudyTip,
  TeamRecruit,
  UserPrivate,
} from '../types';

interface MyPageViewProps {
  currentUid: string;
  memberProfile: MemberProfile | null;
  userPrivate: UserPrivate | null;
  contests: Contest[];
  bookmarkedIds: Set<string>;
  clubs: ClubPost[];
  studyTips: StudyTip[];
  teamRecruits: TeamRecruit[];
  portfolios: PortfolioWork[];
  communityPosts: CommunityPost[];
  myReports: CommunityReport[];
  onOpenContest: (contest: Contest) => void;
  onNavigate: (tab: MainTab) => void;
  onOpenAuthOnboarding: () => void;
  onNotify: (msg: string) => void;
}

const GRADES: GradeOption[] = ['1학년', '2학년', '3학년', '4학년', '졸업/대학원'];
const TRACKS: MajorTrackOption[] = [
  '영상제작·연출',
  '콘텐츠기획·마케팅',
  '3D·모션그래픽',
  '디자인·UI/UX',
  '사운드·포스트',
];

export function MyPageView({
  currentUid,
  memberProfile,
  userPrivate,
  contests,
  bookmarkedIds,
  clubs,
  studyTips,
  teamRecruits,
  portfolios,
  communityPosts,
  myReports,
  onOpenContest,
  onNavigate,
  onOpenAuthOnboarding,
  onNotify,
}: MyPageViewProps) {
  const [editing, setEditing] = useState(false);
  const [nickname, setNickname] = useState(memberProfile?.nickname || '');
  const [grade, setGrade] = useState<GradeOption>(memberProfile?.grade || '2학년');
  const [majorTrack, setMajorTrack] = useState<MajorTrackOption>(
    memberProfile?.majorTrack || '영상제작·연출'
  );
  const [toolsText, setToolsText] = useState((memberProfile?.tools || []).join(', '));
  const [bio, setBio] = useState(memberProfile?.bio || '');
  const [studentNumber, setStudentNumber] = useState(userPrivate?.studentNumber || '');
  const [saving, setSaving] = useState(false);

  if (!memberProfile) {
    return (
      <div className="py-20 max-w-lg mx-auto text-center space-y-4">
        <h1 className="font-editorial text-3xl font-semibold text-[#1C1917] dark:text-[#F5F2EB]">
          학과 프로필 등록이 필요합니다
        </h1>
        <p className="text-sm text-[#57534E] dark:text-[#B8B0A4]">
          Google 인증은 완료되었으나 아직 학과 닉네임과 전공 트랙이 등록되지 않았습니다.
        </p>
        <button
          type="button"
          onClick={onOpenAuthOnboarding}
          className="px-5 py-2.5 bg-[#1C1917] dark:bg-[#F5F2EB] text-white dark:text-[#121110] text-sm font-medium rounded-lg hover:bg-[#1E3A8A] dark:hover:bg-[#93B4FF] cursor-pointer"
        >
          학과 간편 프로필 완성하기
        </button>
      </div>
    );
  }

  const bookmarkedContests = contests.filter((c) => bookmarkedIds.has(c.id));
  const myPostsCount =
    contests.filter((c) => c.authorId === currentUid).length +
    clubs.filter((c) => c.authorId === currentUid).length +
    studyTips.filter((t) => t.authorId === currentUid).length +
    teamRecruits.filter((r) => r.authorId === currentUid).length +
    portfolios.filter((w) => w.authorId === currentUid).length +
    communityPosts.filter((p) => p.authorId === currentUid).length;

  const startEditing = () => {
    setNickname(memberProfile.nickname);
    setGrade(memberProfile.grade);
    setMajorTrack(memberProfile.majorTrack);
    setToolsText(memberProfile.tools.join(', '));
    setBio(memberProfile.bio);
    setStudentNumber(userPrivate?.studentNumber || '');
    setEditing(true);
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanNick = clampStr(nickname, FIELD_LIMITS.NICKNAME_MAX);
    if (!cleanNick) return;
    const cleanTools = sanitizeStringList(
      toolsText.split(','),
      FIELD_LIMITS.TOOLS_MAX_COUNT,
      FIELD_LIMITS.TOOL_ITEM_MAX
    );

    setSaving(true);
    try {
      await updateDoc(doc(db, 'memberProfiles', currentUid), {
        nickname: cleanNick,
        grade,
        majorTrack,
        tools: cleanTools,
        bio: clampStr(bio, FIELD_LIMITS.BIO_MAX),
        updatedAt: serverTimestamp(),
      });
      if (userPrivate && clampStr(studentNumber, FIELD_LIMITS.STUDENT_NUMBER_MAX).length >= 2) {
        await updateDoc(doc(db, 'usersPrivate', currentUid), {
          studentNumber: clampStr(studentNumber, FIELD_LIMITS.STUDENT_NUMBER_MAX),
          updatedAt: serverTimestamp(),
        });
      }
      setEditing(false);
      onNotify('학과 회원 프로필이 수정되었습니다.');
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `memberProfiles/${currentUid}`);
    } finally {
      setSaving(false);
    }
  };

  const handleSignOut = async () => {
    await signOut(auth);
    onNotify('로그아웃되었습니다.');
    onNavigate('home');
  };

  return (
    <div className="space-y-10 pb-16 pt-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-[#E5DEC9] dark:border-[#322E29] pb-6">
        <div>
          <p className="text-xs font-mono-tabular tracking-widest text-[#78716C] dark:text-[#8E867B] mb-1">
            MEMBER ARCHIVE & BOOKMARKS
          </p>
          <h1 className="font-editorial text-3xl sm:text-4xl font-semibold text-[#1C1917] dark:text-[#F5F2EB]">
            마이페이지
          </h1>
        </div>
        <button
          type="button"
          onClick={handleSignOut}
          className="px-4 py-2 text-xs font-medium border border-[#E5DEC9] dark:border-[#322E29] bg-white dark:bg-[#221F1C] text-[#1C1917] dark:text-[#F5F2EB] rounded-lg hover:border-[#9A3412] dark:hover:border-[#FB923C] hover:text-[#9A3412] dark:hover:text-[#FB923C] inline-flex items-center gap-1.5 cursor-pointer self-start sm:self-auto"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span>로그아웃</span>
        </button>
      </div>

      {/* Profile Card */}
      <section className="bg-white dark:bg-[#221F1C] border border-[#E5DEC9] dark:border-[#322E29] rounded-xl p-6 sm:p-8">
        {!editing ? (
          <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-[#F2EDE4] dark:bg-[#1B1917] border border-[#E5DEC9] dark:border-[#322E29] flex items-center justify-center text-[#1E3A8A] dark:text-[#93B4FF] overflow-hidden shrink-0">
                  {memberProfile.avatarUrl ? (
                    <img
                      src={memberProfile.avatarUrl}
                      alt={memberProfile.nickname}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <User className="w-5 h-5" />
                  )}
                </div>
                <div>
                  <h2 className="font-editorial text-2xl font-semibold text-[#1C1917] dark:text-[#F5F2EB]">
                    {memberProfile.nickname}
                  </h2>
                  <p className="text-xs text-[#57534E] dark:text-[#B8B0A4]">
                    {memberProfile.majorTrack} · {memberProfile.grade}
                    {userPrivate?.studentNumber ? ` · ${userPrivate.studentNumber}` : ''}
                  </p>
                </div>
              </div>

              <p className="text-sm text-[#57534E] dark:text-[#B8B0A4] leading-relaxed max-w-2xl">
                {memberProfile.bio || '등록된 자기소개가 없습니다.'}
              </p>

              {memberProfile.tools.length > 0 && (
                <p className="text-xs text-[#78716C] dark:text-[#8E867B]">
                  활용 툴:{' '}
                  <span className="text-[#1C1917] dark:text-[#F5F2EB]">
                    {memberProfile.tools.join(' · ')}
                  </span>
                </p>
              )}
              {userPrivate?.email && (
                <p className="text-xs text-[#78716C] dark:text-[#8E867B]">
                  인증 이메일(비공개): {userPrivate.email}
                </p>
              )}
            </div>

            <div className="flex flex-col items-start md:items-end gap-3 shrink-0">
              <button
                type="button"
                onClick={startEditing}
                className="px-4 py-2 text-xs font-medium border border-[#E5DEC9] dark:border-[#322E29] text-[#1C1917] dark:text-[#F5F2EB] rounded-lg hover:border-[#1C1917] dark:hover:border-[#F5F2EB] inline-flex items-center gap-1.5 cursor-pointer"
              >
                <Pencil className="w-3.5 h-3.5" />
                <span>프로필 수정</span>
              </button>
              <p className="text-xs font-mono-tabular text-[#78716C] dark:text-[#8E867B]">
                내가 등록한 아카이브 · 게시글 {myPostsCount}건
              </p>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSaveProfile} className="space-y-4">
            <h2 className="font-editorial text-xl font-semibold text-[#1C1917] dark:text-[#F5F2EB]">
              프로필 수정
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-medium mb-1">닉네임 *</label>
                <input
                  type="text"
                  required
                  maxLength={FIELD_LIMITS.NICKNAME_MAX}
                  value={nickname}
                  onChange={(e) => setNickname(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-[#FBF9F5] dark:bg-[#121110] text-[#1C1917] dark:text-[#F5F2EB] border border-[#E5DEC9] dark:border-[#322E29] rounded-lg"
                />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">학년</label>
                <select
                  value={grade}
                  onChange={(e) => setGrade(e.target.value as GradeOption)}
                  className="w-full px-3 py-2 text-sm bg-[#FBF9F5] dark:bg-[#121110] text-[#1C1917] dark:text-[#F5F2EB] border border-[#E5DEC9] dark:border-[#322E29] rounded-lg"
                >
                  {GRADES.map((g) => (
                    <option key={g} value={g}>
                      {g}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">전공 트랙</label>
                <select
                  value={majorTrack}
                  onChange={(e) => setMajorTrack(e.target.value as MajorTrackOption)}
                  className="w-full px-3 py-2 text-sm bg-[#FBF9F5] dark:bg-[#121110] text-[#1C1917] dark:text-[#F5F2EB] border border-[#E5DEC9] dark:border-[#322E29] rounded-lg"
                >
                  {TRACKS.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium mb-1">학번 (비공개)</label>
                <input
                  type="text"
                  maxLength={FIELD_LIMITS.STUDENT_NUMBER_MAX}
                  value={studentNumber}
                  onChange={(e) => setStudentNumber(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-[#FBF9F5] dark:bg-[#121110] text-[#1C1917] dark:text-[#F5F2EB] border border-[#E5DEC9] dark:border-[#322E29] rounded-lg"
                />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">
                  활용 가능 툴 (쉼표로 구분)
                </label>
                <input
                  type="text"
                  value={toolsText}
                  onChange={(e) => setToolsText(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-[#FBF9F5] dark:bg-[#121110] text-[#1C1917] dark:text-[#F5F2EB] border border-[#E5DEC9] dark:border-[#322E29] rounded-lg"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">자기소개</label>
              <textarea
                rows={3}
                maxLength={FIELD_LIMITS.BIO_MAX}
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-[#FBF9F5] dark:bg-[#121110] text-[#1C1917] dark:text-[#F5F2EB] border border-[#E5DEC9] dark:border-[#322E29] rounded-lg"
              />
            </div>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setEditing(false)}
                className="px-4 py-2 text-xs border border-[#E5DEC9] dark:border-[#322E29] rounded-lg cursor-pointer"
              >
                취소
              </button>
              <button
                type="submit"
                disabled={saving}
                className="px-4 py-2 text-xs bg-[#1C1917] dark:bg-[#F5F2EB] text-white dark:text-[#121110] rounded-lg hover:bg-[#1E3A8A] dark:hover:bg-[#93B4FF] cursor-pointer"
              >
                {saving ? '저장 중...' : '저장하기'}
              </button>
            </div>
          </form>
        )}
      </section>

      {/* Bookmarked Contests */}
      <section className="space-y-4">
        <div className="flex items-center justify-between border-b border-[#E5DEC9] dark:border-[#322E29] pb-3">
          <div className="flex items-center gap-2">
            <Bookmark className="w-4 h-4 text-[#1E3A8A] dark:text-[#93B4FF]" />
            <h2 className="font-editorial text-2xl font-semibold text-[#1C1917] dark:text-[#F5F2EB]">
              저장한 공모전 북마크
            </h2>
          </div>
          <span className="font-mono-tabular text-xs text-[#78716C] dark:text-[#8E867B]">
            {bookmarkedContests.length}건
          </span>
        </div>

        {bookmarkedContests.length === 0 ? (
          <div className="p-8 bg-white dark:bg-[#221F1C] border border-[#E5DEC9] dark:border-[#322E29] rounded-xl text-center">
            <p className="text-sm text-[#57534E] dark:text-[#B8B0A4] mb-3">
              아직 북마크한 공모전이 없습니다. 관심 있는 교내·외 공모전을 저장해 마감일을 관리해 보세요.
            </p>
            <button
              type="button"
              onClick={() => onNavigate('contests')}
              className="px-4 py-2 text-xs font-medium bg-[#1C1917] dark:bg-[#F5F2EB] text-white dark:text-[#121110] rounded-lg hover:bg-[#1E3A8A] dark:hover:bg-[#93B4FF] cursor-pointer"
            >
              공모전 둘러보기
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {bookmarkedContests.map((contest) => {
              const dday = computeDday(contest.deadline);
              return (
                <article
                  key={contest.id}
                  onClick={() => onOpenContest(contest)}
                  className="bg-white dark:bg-[#221F1C] border border-[#E5DEC9] dark:border-[#322E29] rounded-xl p-5 hover:border-[#1C1917]/40 dark:hover:border-[#93B4FF]/50 cursor-pointer space-y-2"
                >
                  <div className="flex items-center justify-between text-xs text-[#57534E] dark:text-[#B8B0A4]">
                    <span>
                      {contest.scope} · {contest.category}
                    </span>
                    <span className="font-mono-tabular font-semibold text-[#1E3A8A] dark:text-[#93B4FF]">
                      {dday.label} ({contest.deadline})
                    </span>
                  </div>
                  <h3 className="font-editorial text-lg font-semibold text-[#1C1917] dark:text-[#F5F2EB]">
                    {contest.title}
                  </h3>
                  <p className="text-xs text-[#78716C] dark:text-[#8E867B]">{contest.organizer}</p>
                </article>
              );
            })}
          </div>
        )}
      </section>

      {/* My Community Reports */}
      <section className="space-y-4">
        <div className="flex items-center justify-between border-b border-[#E5DEC9] dark:border-[#322E29] pb-3">
          <div className="flex items-center gap-2">
            <Flag className="w-4 h-4 text-[#9A3412] dark:text-[#FB923C]" />
            <h2 className="font-editorial text-2xl font-semibold text-[#1C1917] dark:text-[#F5F2EB]">
              내가 접수한 커뮤니티 신고 내역
            </h2>
          </div>
          <span className="font-mono-tabular text-xs text-[#78716C] dark:text-[#8E867B]">
            {myReports.length}건
          </span>
        </div>

        {myReports.length === 0 ? (
          <div className="p-7 bg-white dark:bg-[#221F1C] border border-[#E5DEC9] dark:border-[#322E29] rounded-xl text-center">
            <p className="text-xs text-[#57534E] dark:text-[#B8B0A4]">
              접수한 도배·욕설 신고 내역이 없습니다. 깨끗한 커뮤니티 유지를 위해 문제 게시물을 발견하면 신고해 주세요.
            </p>
          </div>
        ) : (
          <div className="bg-white dark:bg-[#221F1C] border border-[#E5DEC9] dark:border-[#322E29] rounded-xl divide-y divide-[#E5DEC9] dark:divide-[#322E29]">
            {myReports.map((report) => (
              <div key={report.id} className="p-5 space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                  <div className="flex flex-wrap items-center gap-2 text-[#57534E] dark:text-[#B8B0A4]">
                    <span className="font-semibold text-[#9A3412] dark:text-[#FB923C]">
                      {report.reason}
                    </span>
                    <span aria-hidden="true">·</span>
                    <span>{report.targetType === 'post' ? '게시글' : '댓글'}</span>
                    <span aria-hidden="true">·</span>
                    <span>작성자: {report.targetAuthorName}</span>
                    <span aria-hidden="true">·</span>
                    <span className="font-mono-tabular">{formatKoreanDate(report.createdAt)}</span>
                  </div>
                  <span
                    className={`font-semibold ${
                      report.status === '조치완료'
                        ? 'text-[#1E3A8A] dark:text-[#93B4FF]'
                        : report.status === '반려됨'
                        ? 'text-[#78716C] dark:text-[#8E867B]'
                        : 'text-[#9A3412] dark:text-[#FB923C]'
                    }`}
                  >
                    {report.status}
                  </span>
                </div>
                <p className="text-xs text-[#1C1917] dark:text-[#F5F2EB] line-clamp-2">
                  {report.targetPreview}
                </p>
                {report.adminNote && (
                  <p className="text-xs text-[#57534E] dark:text-[#B8B0A4] bg-[#F2EDE4]/60 dark:bg-[#1B1917] px-3 py-2 rounded-lg">
                    운영진 안내: {report.adminNote}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
