import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  query,
  serverTimestamp,
  where,
} from 'firebase/firestore';
import { Flag, MessageSquare, ShieldAlert, Trash2 } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { checkContentSafety, recordSubmission } from '../lib/moderation';
import { clampStr, FIELD_LIMITS, formatKoreanDate, getTimestampMillis } from '../lib/validation';
import { MemberProfile, ParentComment } from '../types';
import { ReportModal, ReportTarget } from './ReportModal';

interface CommentSectionProps {
  parentCollection: 'clubs' | 'teamRecruits' | 'portfolioWorks' | 'communityPosts';
  parentId: string;
  isLiveDocument: boolean;
  currentUid: string | null;
  memberProfile: MemberProfile | null;
  isAdmin: boolean;
  reportedKeys?: Set<string>;
  onRequireAuth: () => void;
  onNotify: (msg: string) => void;
  placeholder?: string;
}

export function CommentSection({
  parentCollection,
  parentId,
  isLiveDocument,
  currentUid,
  memberProfile,
  isAdmin,
  reportedKeys,
  onRequireAuth,
  onNotify,
  placeholder = '궁금한 점이나 피드백, 참여 의사를 댓글로 남겨보세요.',
}: CommentSectionProps) {
  const [comments, setComments] = useState<ParentComment[]>([]);
  const [text, setText] = useState('');
  const [safetyWarning, setSafetyWarning] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [reportingTarget, setReportingTarget] = useState<ReportTarget | null>(null);

  const subPath = `${parentCollection}/${parentId}/comments`;

  useEffect(() => {
    if (!isLiveDocument || !parentId) {
      setComments([]);
      return;
    }

    const q = query(
      collection(db, parentCollection, parentId, 'comments'),
      where('isPublished', '==', true)
    );
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const list: ParentComment[] = snapshot.docs.map((d) => ({
          id: d.id,
          ...(d.data() as Omit<ParentComment, 'id'>),
        }));
        list.sort((a, b) => getTimestampMillis(a.createdAt) - getTimestampMillis(b.createdAt));
        setComments(list);
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, subPath);
      }
    );

    return () => unsubscribe();
  }, [parentCollection, parentId, isLiveDocument, subPath]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUid || !memberProfile) {
      onRequireAuth();
      return;
    }
    if (!isLiveDocument) {
      onNotify('잠시 후 데이터가 동기화되면 댓글을 작성할 수 있습니다.');
      return;
    }
    const cleanContent = clampStr(text, FIELD_LIMITS.COMMENT_MAX);
    if (!cleanContent) return;

    const safety = checkContentSafety(cleanContent, 'comment');
    if (!safety.ok) {
      setSafetyWarning(safety.reason || '부적절한 표현이나 도배가 감지되었습니다.');
      return;
    }
    setSafetyWarning(null);

    setSubmitting(true);
    try {
      await addDoc(collection(db, parentCollection, parentId, 'comments'), {
        parentId,
        authorId: currentUid,
        authorName: clampStr(memberProfile.nickname, FIELD_LIMITS.NICKNAME_MAX),
        authorTrack: clampStr(memberProfile.majorTrack, 40),
        content: cleanContent,
        isPublished: true,
        createdAt: serverTimestamp(),
      });
      recordSubmission(cleanContent, 'comment');
      setText('');
      onNotify('댓글이 등록되었습니다.');
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, subPath);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (commentId: string) => {
    try {
      await deleteDoc(doc(db, parentCollection, parentId, 'comments', commentId));
      onNotify('댓글이 삭제되었습니다.');
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `${subPath}/${commentId}`);
    }
  };

  const handleOpenReport = (comment: ParentComment) => {
    if (!currentUid || !memberProfile) {
      onRequireAuth();
      return;
    }
    setReportingTarget({
      targetType: 'comment',
      targetCollection: parentCollection,
      targetId: comment.id,
      parentId,
      targetAuthorId: comment.authorId,
      targetAuthorName: comment.authorName,
      targetPreview: comment.content,
    });
  };

  return (
    <div className="pt-6 border-t border-[#E5DEC9] dark:border-[#322E29] space-y-5">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-sm font-semibold text-[#1C1917] dark:text-[#F5F2EB]">
          <MessageSquare className="w-4 h-4 text-[#1E3A8A] dark:text-[#93B4FF]" />
          <span>댓글 소통</span>
          <span className="font-mono-tabular text-xs text-[#78716C] dark:text-[#8E867B]">
            {comments.length}
          </span>
        </div>
        <span className="text-[11px] text-[#78716C] dark:text-[#8E867B]">
          도배·육두문자 발견 시 신고 버튼으로 제보 가능
        </span>
      </div>

      {comments.length === 0 ? (
        <p className="text-xs text-[#78716C] dark:text-[#8E867B] py-3">
          아직 등록된 댓글이 없습니다. 첫 번째 의견을 남겨보세요.
        </p>
      ) : (
        <div className="space-y-3">
          {comments.map((comment) => {
            const canDelete = currentUid === comment.authorId || isAdmin;
            const isReported = reportedKeys?.has(`comment:${comment.id}`) ?? false;
            return (
              <div
                key={comment.id}
                className="bg-[#F2EDE4]/60 dark:bg-[#221F1C] border border-[#E5DEC9]/80 dark:border-[#322E29] rounded-lg px-4 py-3"
              >
                <div className="flex items-center justify-between gap-3 mb-1.5">
                  <div className="flex items-center gap-2 text-xs text-[#57534E] dark:text-[#B8B0A4]">
                    <span className="font-semibold text-[#1C1917] dark:text-[#F5F2EB]">
                      {comment.authorName}
                    </span>
                    {comment.authorTrack && (
                      <>
                        <span aria-hidden="true">·</span>
                        <span>{comment.authorTrack}</span>
                      </>
                    )}
                    <span aria-hidden="true">·</span>
                    <span className="font-mono-tabular">{formatKoreanDate(comment.createdAt)}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {isLiveDocument && currentUid !== comment.authorId && (
                      <button
                        type="button"
                        onClick={() => handleOpenReport(comment)}
                        disabled={isReported}
                        className={`text-[11px] inline-flex items-center gap-1 px-1.5 py-0.5 rounded transition-colors ${
                          isReported
                            ? 'text-[#9A3412] dark:text-[#FB923C] opacity-75 cursor-default'
                            : 'text-[#78716C] dark:text-[#8E867B] hover:text-[#9A3412] dark:hover:text-[#FB923C] cursor-pointer'
                        }`}
                        aria-label="댓글 신고"
                      >
                        <Flag className="w-3 h-3" />
                        <span>{isReported ? '신고됨' : '신고'}</span>
                      </button>
                    )}
                    {canDelete && (
                      <button
                        type="button"
                        onClick={() => handleDelete(comment.id)}
                        className="text-[#78716C] dark:text-[#8E867B] hover:text-[#9A3412] dark:hover:text-[#FB923C] p-1 transition-colors cursor-pointer"
                        aria-label="댓글 삭제"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
                <p className="text-sm text-[#1C1917] dark:text-[#F5F2EB] leading-relaxed whitespace-pre-line">
                  {comment.content}
                </p>
              </div>
            );
          })}
        </div>
      )}

      {safetyWarning && (
        <div
          role="alert"
          className="flex items-start gap-2 text-xs text-[#9A3412] dark:text-[#FB923C] bg-[#9A3412]/10 dark:bg-[#FB923C]/10 border border-[#9A3412]/25 dark:border-[#FB923C]/25 rounded-lg px-3.5 py-2.5"
        >
          <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{safetyWarning}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-2.5">
        <input
          type="text"
          maxLength={FIELD_LIMITS.COMMENT_MAX}
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            if (safetyWarning) setSafetyWarning(null);
          }}
          placeholder={
            currentUid && memberProfile
              ? placeholder
              : '로그인 후 댓글을 작성할 수 있습니다.'
          }
          onFocus={() => {
            if (!currentUid || !memberProfile) {
              onRequireAuth();
            }
          }}
          className="flex-1 px-3.5 py-2.5 text-sm bg-white dark:bg-[#121110] text-[#1C1917] dark:text-[#F5F2EB] placeholder:text-[#78716C] dark:placeholder:text-[#8E867B] border border-[#E5DEC9] dark:border-[#322E29] rounded-lg focus:outline-none focus:border-[#1E3A8A] dark:focus:border-[#93B4FF]"
        />
        <button
          type="submit"
          disabled={submitting || !text.trim()}
          className="px-4 py-2.5 text-xs font-medium bg-[#1C1917] dark:bg-[#F5F2EB] text-[#FBF9F5] dark:text-[#121110] rounded-lg hover:bg-[#1E3A8A] dark:hover:bg-[#93B4FF] transition-colors disabled:opacity-40 whitespace-nowrap shrink-0 cursor-pointer"
        >
          {submitting ? '등록 중...' : '댓글 남기기'}
        </button>
      </form>

      <ReportModal
        target={reportingTarget}
        currentUid={currentUid}
        memberProfile={memberProfile}
        isAlreadyReported={
          reportingTarget ? (reportedKeys?.has(`comment:${reportingTarget.targetId}`) ?? false) : false
        }
        onClose={() => setReportingTarget(null)}
        onRequireAuth={onRequireAuth}
        onNotify={onNotify}
      />
    </div>
  );
}
