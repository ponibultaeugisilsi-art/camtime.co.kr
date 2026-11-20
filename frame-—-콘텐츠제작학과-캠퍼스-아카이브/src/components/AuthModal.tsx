import { User as FirebaseUser, signInWithPopup, signOut } from 'firebase/auth';
import { doc, serverTimestamp, setDoc } from 'firebase/firestore';
import { Check, LogIn, ShieldCheck, X } from 'lucide-react';
import React, { useState } from 'react';
import { auth, db, googleProvider, handleFirestoreError, OperationType } from '../firebase';
import { clampStr, FIELD_LIMITS, sanitizeStringList } from '../lib/validation';
import { GradeOption, MajorTrackOption, MemberProfile } from '../types';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  firebaseUser: FirebaseUser | null;
  existingProfile: MemberProfile | null;
  onSavedProfile: () => void;
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
const SUGGESTED_TOOLS = [
  'Premiere Pro',
  'After Effects',
  'DaVinci Resolve',
  'Blender',
  'Cinema 4D',
  'Figma',
  'Pro Tools',
  'Photoshop',
];

export function AuthModal({
  isOpen,
  onClose,
  firebaseUser,
  existingProfile,
  onSavedProfile,
  onNotify,
}: AuthModalProps) {
  const [authTab, setAuthTab] = useState<'google' | 'campus'>('google');
  const [authError, setAuthError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const [nickname, setNickname] = useState(
    existingProfile?.nickname || firebaseUser?.displayName || ''
  );
  const [studentNumber, setStudentNumber] = useState('2025학번');
  const [grade, setGrade] = useState<GradeOption>(existingProfile?.grade || '2학년');
  const [majorTrack, setMajorTrack] = useState<MajorTrackOption>(
    existingProfile?.majorTrack || '영상제작·연출'
  );
  const [selectedTools, setSelectedTools] = useState<string[]>(
    existingProfile?.tools || ['Premiere Pro']
  );
  const [customTool, setCustomTool] = useState('');
  const [bio, setBio] = useState(existingProfile?.bio || '');

  if (!isOpen) return null;

  const needsOnboarding = Boolean(firebaseUser && !existingProfile);

  const handleGoogleSignIn = async () => {
    setAuthError('');
    setIsLoading(true);
    try {
      const res = await signInWithPopup(auth, googleProvider);
      if (!nickname && res.user.displayName) {
        setNickname(res.user.displayName.slice(0, FIELD_LIMITS.NICKNAME_MAX));
      }
      onNotify('Google 계정 인증이 완료되었습니다.');
    } catch (err) {
      const msg = err instanceof Error ? err.message : '로그인에 실패했습니다.';
      if (msg.includes('popup-closed-by-user')) {
        setAuthError('로그인 창이 닫혔습니다. 다시 시도해 주세요.');
      } else {
        setAuthError(`인증 중 오류가 발생했습니다: ${msg}`);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const toggleTool = (tool: string) => {
    setSelectedTools((prev) => {
      if (prev.includes(tool)) {
        return prev.filter((t) => t !== tool);
      }
      if (prev.length >= FIELD_LIMITS.TOOLS_MAX_COUNT) {
        return prev;
      }
      return [...prev, tool];
    });
  };

  const handleAddCustomTool = () => {
    const cleaned = clampStr(customTool, FIELD_LIMITS.TOOL_ITEM_MAX);
    if (!cleaned) return;
    if (!selectedTools.includes(cleaned) && selectedTools.length < FIELD_LIMITS.TOOLS_MAX_COUNT) {
      setSelectedTools((prev) => [...prev, cleaned]);
    }
    setCustomTool('');
  };

  const handleCompleteSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firebaseUser) return;

    const cleanNickname = clampStr(nickname, FIELD_LIMITS.NICKNAME_MAX);
    const cleanStudentNum = clampStr(studentNumber, FIELD_LIMITS.STUDENT_NUMBER_MAX);
    const cleanBio = clampStr(bio, FIELD_LIMITS.BIO_MAX);
    const cleanTools = sanitizeStringList(
      selectedTools,
      FIELD_LIMITS.TOOLS_MAX_COUNT,
      FIELD_LIMITS.TOOL_ITEM_MAX
    );

    if (cleanNickname.length < 1) {
      setAuthError('사용하실 학과 닉네임 또는 이름을 입력해 주세요.');
      return;
    }
    if (cleanStudentNum.length < 2) {
      setAuthError('학번 또는 입학년도(예: 2025학번)를 입력해 주세요.');
      return;
    }

    setAuthError('');
    setIsLoading(true);
    try {
      const profilePath = `memberProfiles/${firebaseUser.uid}`;
      try {
        await setDoc(doc(db, 'memberProfiles', firebaseUser.uid), {
          uid: firebaseUser.uid,
          nickname: cleanNickname,
          grade,
          majorTrack,
          tools: cleanTools,
          bio: cleanBio,
          avatarUrl: clampStr(firebaseUser.photoURL || '', FIELD_LIMITS.URL_MAX),
          isPublic: true,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, profilePath);
      }

      const privatePath = `usersPrivate/${firebaseUser.uid}`;
      try {
        await setDoc(doc(db, 'usersPrivate', firebaseUser.uid), {
          uid: firebaseUser.uid,
          email: clampStr(firebaseUser.email || 'unknown@univ.ac.kr', 120),
          studentNumber: cleanStudentNum,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, privatePath);
      }

      onNotify('콘텐츠제작학과 회원 가입이 완료되었습니다.');
      onSavedProfile();
      onClose();
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-[#1C1917]/50 dark:bg-black/75 backdrop-blur-[2px] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-label="로그인 및 학과 회원가입"
    >
      <div className="bg-[#FBF9F5] dark:bg-[#1B1917] border border-[#E5DEC9] dark:border-[#322E29] rounded-xl max-w-lg w-full max-h-[90vh] overflow-y-auto p-6 sm:p-8 shadow-xl">
        <div className="flex items-start justify-between gap-4 pb-5 border-b border-[#E5DEC9] dark:border-[#322E29]">
          <div>
            <p className="text-xs font-mono-tabular tracking-widest text-[#78716C] dark:text-[#8E867B] mb-1">
              {needsOnboarding ? 'STEP 02 · DEPARTMENT PROFILE' : 'MEMBER ACCESS'}
            </p>
            <h2 className="font-editorial text-2xl font-semibold text-[#1C1917] dark:text-[#F5F2EB]">
              {needsOnboarding ? (
                '학과 전용 간편 회원가입'
              ) : (
                <>
                  <span className="font-brand tracking-wide font-normal mr-1.5">캠타임 CAMPTIME</span>
                  <span>로그인 · 회원가입</span>
                </>
              )}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-[#57534E] dark:text-[#B8B0A4] hover:text-[#1C1917] dark:hover:text-[#F5F2EB] rounded-lg hover:bg-[#F2EDE4] dark:hover:bg-[#221F1C] transition-colors cursor-pointer"
            aria-label="닫기"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {!firebaseUser ? (
          <div className="pt-6 space-y-6">
            <div className="flex items-center gap-1 p-1 bg-[#F2EDE4] dark:bg-[#121110] rounded-lg">
              <button
                type="button"
                onClick={() => setAuthTab('google')}
                className={`flex-1 py-2 text-xs font-medium rounded-md transition-colors cursor-pointer ${
                  authTab === 'google'
                    ? 'bg-white dark:bg-[#221F1C] text-[#1C1917] dark:text-[#F5F2EB] shadow-sm'
                    : 'text-[#57534E] dark:text-[#B8B0A4] hover:text-[#1C1917] dark:hover:text-[#F5F2EB]'
                }`}
              >
                Google 로그인 · 가입
              </button>
              <button
                type="button"
                onClick={() => setAuthTab('campus')}
                className={`flex-1 py-2 text-xs font-medium rounded-md transition-colors cursor-pointer ${
                  authTab === 'campus'
                    ? 'bg-white dark:bg-[#221F1C] text-[#1C1917] dark:text-[#F5F2EB] shadow-sm'
                    : 'text-[#57534E] dark:text-[#B8B0A4] hover:text-[#1C1917] dark:hover:text-[#F5F2EB]'
                }`}
              >
                가입 절차 안내
              </button>
            </div>

            {authTab === 'google' ? (
              <div className="space-y-5">
                <p className="text-sm text-[#57534E] dark:text-[#B8B0A4] leading-relaxed">
                  Google 계정으로 안전하게 본인 인증을 완료한 뒤, 닉네임·학번·전공 트랙을 등록해
                  콘텐츠제작학과 회원으로 즉시 활동할 수 있습니다.
                </p>

                <button
                  type="button"
                  disabled={isLoading}
                  onClick={handleGoogleSignIn}
                  className="w-full py-3 px-5 bg-[#1C1917] dark:bg-[#F5F2EB] text-[#FBF9F5] dark:text-[#121110] rounded-lg font-medium text-sm flex items-center justify-center gap-2.5 hover:bg-[#1E3A8A] dark:hover:bg-[#93B4FF] transition-colors disabled:opacity-50 cursor-pointer"
                >
                  <LogIn className="w-4 h-4" />
                  <span>{isLoading ? '인증 연결 중...' : 'Google 계정으로 로그인 및 회원가입'}</span>
                </button>

                <div className="pt-3 border-t border-[#E5DEC9] dark:border-[#322E29] flex items-start gap-2.5 text-xs text-[#78716C] dark:text-[#8E867B]">
                  <ShieldCheck className="w-4 h-4 text-[#1E3A8A] dark:text-[#93B4FF] shrink-0 mt-0.5" />
                  <span>
                    이메일 및 학번 등 민감 개인정보는 비공개 보안 저장소에 분리 보관되며, 다른
                    학우에게는 닉네임·학년·전공 트랙만 공개됩니다.
                  </span>
                </div>
              </div>
            ) : (
              <div className="space-y-4 text-sm text-[#57534E] dark:text-[#B8B0A4] leading-relaxed">
                <div className="p-4 bg-white dark:bg-[#221F1C] border border-[#E5DEC9] dark:border-[#322E29] rounded-lg space-y-2">
                  <p className="font-semibold text-[#1C1917] dark:text-[#F5F2EB]">
                    1단계 · Google 본인 인증
                  </p>
                  <p className="text-xs">
                    별도 비밀번호 관리 없이 Google OAuth 팝업으로 검증된 이메일 인증을 진행합니다.
                  </p>
                </div>
                <div className="p-4 bg-white dark:bg-[#221F1C] border border-[#E5DEC9] dark:border-[#322E29] rounded-lg space-y-2">
                  <p className="font-semibold text-[#1C1917] dark:text-[#F5F2EB]">
                    2단계 · 학과 프로필 등록
                  </p>
                  <p className="text-xs">
                    첫 로그인 시 닉네임, 학번, 학년, 세부 전공 트랙(영상·기획·3D·디자인·사운드),
                    활용 툴을 입력하면 바로 공모전 등록, 동아리 댓글, 팀빌딩, 포트폴리오 업로드가
                    가능합니다.
                  </p>
                </div>
                <p className="text-xs text-[#78716C] dark:text-[#8E867B]">
                  * 이메일/비밀번호 직접 로그인 방식을 추가로 사용하려면 Firebase 콘솔 Authentication
                  메뉴에서 Email/Password 공급자를 활성화해야 합니다.
                </p>
              </div>
            )}

            {authError && (
              <p className="text-xs text-[#9A3412] dark:text-[#FB923C] bg-[#9A3412]/10 dark:bg-[#FB923C]/15 px-3 py-2.5 rounded-lg">
                {authError}
              </p>
            )}
          </div>
        ) : (
          <form onSubmit={handleCompleteSignup} className="pt-6 space-y-5">
            <div className="flex items-center justify-between text-xs text-[#57534E] dark:text-[#B8B0A4] bg-[#F2EDE4] dark:bg-[#221F1C] px-3.5 py-2.5 rounded-lg">
              <span>인증 계정 · {firebaseUser.email}</span>
              <button
                type="button"
                onClick={() => signOut(auth)}
                className="underline hover:text-[#1C1917] dark:hover:text-[#F5F2EB] cursor-pointer"
              >
                계정 전환
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-[#1C1917] dark:text-[#F5F2EB] mb-1.5">
                  활동 닉네임 (또는 실명) *
                </label>
                <input
                  type="text"
                  required
                  maxLength={FIELD_LIMITS.NICKNAME_MAX}
                  value={nickname}
                  onChange={(e) => setNickname(e.target.value)}
                  placeholder="예: 박서연"
                  className="w-full px-3.5 py-2.5 text-sm bg-white dark:bg-[#121110] text-[#1C1917] dark:text-[#F5F2EB] border border-[#E5DEC9] dark:border-[#322E29] rounded-lg focus:outline-none focus:border-[#1E3A8A] dark:focus:border-[#93B4FF]"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[#1C1917] dark:text-[#F5F2EB] mb-1.5">
                  학번 / 입학년도 (비공개) *
                </label>
                <input
                  type="text"
                  required
                  maxLength={FIELD_LIMITS.STUDENT_NUMBER_MAX}
                  value={studentNumber}
                  onChange={(e) => setStudentNumber(e.target.value)}
                  placeholder="예: 2025학번"
                  className="w-full px-3.5 py-2.5 text-sm bg-white dark:bg-[#121110] text-[#1C1917] dark:text-[#F5F2EB] border border-[#E5DEC9] dark:border-[#322E29] rounded-lg focus:outline-none focus:border-[#1E3A8A] dark:focus:border-[#93B4FF]"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-[#1C1917] dark:text-[#F5F2EB] mb-1.5">
                  학년 *
                </label>
                <select
                  value={grade}
                  onChange={(e) => setGrade(e.target.value as GradeOption)}
                  className="w-full px-3.5 py-2.5 text-sm bg-white dark:bg-[#121110] text-[#1C1917] dark:text-[#F5F2EB] border border-[#E5DEC9] dark:border-[#322E29] rounded-lg focus:outline-none focus:border-[#1E3A8A] dark:focus:border-[#93B4FF]"
                >
                  {GRADES.map((g) => (
                    <option key={g} value={g}>
                      {g}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-[#1C1917] dark:text-[#F5F2EB] mb-1.5">
                  주력 전공 트랙 *
                </label>
                <select
                  value={majorTrack}
                  onChange={(e) => setMajorTrack(e.target.value as MajorTrackOption)}
                  className="w-full px-3.5 py-2.5 text-sm bg-white dark:bg-[#121110] text-[#1C1917] dark:text-[#F5F2EB] border border-[#E5DEC9] dark:border-[#322E29] rounded-lg focus:outline-none focus:border-[#1E3A8A] dark:focus:border-[#93B4FF]"
                >
                  {TRACKS.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-[#1C1917] dark:text-[#F5F2EB] mb-1.5">
                활용 가능 툴 (최대 {FIELD_LIMITS.TOOLS_MAX_COUNT}개)
              </label>
              <div className="flex flex-wrap gap-1.5 mb-2.5">
                {SUGGESTED_TOOLS.map((tool) => {
                  const selected = selectedTools.includes(tool);
                  return (
                    <button
                      key={tool}
                      type="button"
                      onClick={() => toggleTool(tool)}
                      className={`px-2.5 py-1.5 text-xs rounded-md border transition-colors flex items-center gap-1 cursor-pointer ${
                        selected
                          ? 'bg-[#1E3A8A] dark:bg-[#93B4FF] text-white dark:text-[#121110] border-[#1E3A8A] dark:border-[#93B4FF]'
                          : 'bg-white dark:bg-[#221F1C] text-[#57534E] dark:text-[#B8B0A4] border-[#E5DEC9] dark:border-[#322E29] hover:border-[#1C1917] dark:hover:border-[#F5F2EB]'
                      }`}
                    >
                      {selected && <Check className="w-3 h-3" />}
                      <span>{tool}</span>
                    </button>
                  );
                })}
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  maxLength={FIELD_LIMITS.TOOL_ITEM_MAX}
                  value={customTool}
                  onChange={(e) => setCustomTool(e.target.value)}
                  placeholder="기타 툴 직접 추가 (예: Unreal Engine)"
                  className="flex-1 px-3 py-2 text-xs bg-white dark:bg-[#121110] text-[#1C1917] dark:text-[#F5F2EB] border border-[#E5DEC9] dark:border-[#322E29] rounded-lg focus:outline-none focus:border-[#1E3A8A] dark:focus:border-[#93B4FF]"
                />
                <button
                  type="button"
                  onClick={handleAddCustomTool}
                  className="px-3 py-2 text-xs font-medium bg-[#F2EDE4] dark:bg-[#221F1C] text-[#1C1917] dark:text-[#F5F2EB] rounded-lg hover:bg-[#E5DEC9] dark:hover:bg-[#322E29] cursor-pointer whitespace-nowrap"
                >
                  추가
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-[#1C1917] dark:text-[#F5F2EB] mb-1.5">
                한 줄 자기소개 (선택)
              </label>
              <textarea
                rows={2}
                maxLength={FIELD_LIMITS.BIO_MAX}
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="관심 있는 작업 분야나 협업 희망 포지션을 소개해 주세요."
                className="w-full px-3.5 py-2.5 text-sm bg-white dark:bg-[#121110] text-[#1C1917] dark:text-[#F5F2EB] border border-[#E5DEC9] dark:border-[#322E29] rounded-lg focus:outline-none focus:border-[#1E3A8A] dark:focus:border-[#93B4FF]"
              />
            </div>

            {authError && (
              <p className="text-xs text-[#9A3412] dark:text-[#FB923C] bg-[#9A3412]/10 dark:bg-[#FB923C]/15 px-3 py-2.5 rounded-lg">
                {authError}
              </p>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 bg-[#1C1917] dark:bg-[#F5F2EB] text-[#FBF9F5] dark:text-[#121110] rounded-lg text-sm font-medium hover:bg-[#1E3A8A] dark:hover:bg-[#93B4FF] transition-colors disabled:opacity-50 cursor-pointer"
            >
              {isLoading ? '저장 중...' : '학과 회원 등록 완료하기'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
