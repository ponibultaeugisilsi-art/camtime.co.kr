import { doc, serverTimestamp, setDoc } from 'firebase/firestore';
import { Flag, ShieldAlert, X } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { clampStr, FIELD_LIMITS } from '../lib/validation';
import {
  MemberProfile,
  ReportReason,
  ReportTargetCollection,
  ReportTargetType,
} from '../types';

export interface ReportTarget {
  targetType: ReportTargetType;
  targetCollection: ReportTargetCollection;
  targetId: string;
  parentId: string;
  targetAuthorId: string;
  targetAuthorName: string;
  targetPreview: string;
}

interface ReportModalProps {
  target: ReportTarget | null;
  currentUid: string | null;
  memberProfile: MemberProfile | null;
  isAlreadyReported: boolean;
  onClose: () => void;
  onRequireAuth: () => void;
  onNotify: (msg: string) => void;
}

const REPORT_REASONS: { value: ReportReason; desc: string }[] = [
  {
    value: '욕설·비하·혐오표현',
    desc: '악의적인 육두문자, 특정 학우·대상 비방, 모욕 또는 혐오 표현 포함',
  },
  {
    value: '도배·스팸홍보',
    desc: '동일 내용 반복 게시, 무분별한 상업성 광고·스팸 링크 도배',
  },
  {
    value: '허위정보·사기',
    desc: '금전 요구, 허위 공모전·모집 안내, 사칭 및 기만 행위',
  },
  {
    value: '개인정보노출·부적절콘텐츠',
    desc: '학번·연락처 무단 공개, 저작권 침해 또는 커뮤니티 성격에 부적절한 내용',
  },
];

export function ReportModal({
  target,
  currentUid,
  memberProfile,
  isAlreadyReported,
  onClose,
  onRequireAuth,
  onNotify,
}: ReportModalProps) {
  const [reason, setReason] = useState<ReportReason>('욕설·비하·혐오표현');
  const [reasonDetail, setReasonDetail] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!target) return;
    setReason('욕설·비하·혐오표현');
    setReasonDetail('');
  }, [target]);

  useEffect(() => {
    if (!target) return;
    const onEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onEsc);
    return () => window.removeEventListener('keydown', onEsc);
  }, [target, onClose]);

  if (!target) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUid || !memberProfile) {
      onClose();
      onRequireAuth();
      return;
    }
    if (isAlreadyReported) {
      onNotify('이미 신고가 접수된 항목입니다.');
      onClose();
      return;
    }

    const reportId = `${currentUid}_${target.targetType}_${target.targetId}`;
    const cleanPreview = clampStr(target.targetPreview, FIELD_LIMITS.REPORT_PREVIEW_MAX) || '(내용 없음)';
    const cleanDetail = clampStr(reasonDetail, FIELD_LIMITS.REPORT_DETAIL_MAX);

    setSubmitting(true);
    try {
      await setDoc(doc(db, 'reports', reportId), {
        reporterId: currentUid,
        reporterName: clampStr(memberProfile.nickname, FIELD_LIMITS.NICKNAME_MAX),
        targetType: target.targetType,
        targetCollection: target.targetCollection,
        targetId: target.targetId,
        parentId: target.parentId,
        targetAuthorId: target.targetAuthorId,
        targetAuthorName: clampStr(target.targetAuthorName, FIELD_LIMITS.NICKNAME_MAX),
        targetPreview: cleanPreview,
        reason,
        reasonDetail: cleanDetail,
        status: '접수됨',
        adminNote: '',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      onNotify('신고가 접수되었습니다. 학과 운영진이 검토 후 조치합니다.');
      onClose();
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, `reports/${reportId}`);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[60] bg-[#1C1917]/55 dark:bg-black/80 backdrop-blur-[2px] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="report-modal-title"
      onClick={onClose}
    >
      <div
        className="bg-[#FBF9F5] dark:bg-[#1B1917] border border-[#E5DEC9] dark:border-[#322E29] rounded-xl max-w-lg w-full max-h-[90vh] overflow-y-auto p-6 sm:p-8 shadow-2xl space-y-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4 border-b border-[#E5DEC9] dark:border-[#322E29] pb-4">
          <div className="space-y-1">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-[#9A3412] dark:text-[#FB923C]">
              <Flag className="w-3.5 h-3.5" />
              <span>커뮤니티 유해 게시물 신고</span>
            </div>
            <h2
              id="report-modal-title"
              className="font-editorial text-xl font-semibold text-[#1C1917] dark:text-[#F5F2EB]"
            >
              {target.targetType === 'post' ? '게시글 신고하기' : '댓글 신고하기'}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-[#57534E] dark:text-[#B8B0A4] hover:text-[#1C1917] dark:hover:text-[#F5F2EB] cursor-pointer"
            aria-label="신고 창 닫기"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="bg-[#F2EDE4]/70 dark:bg-[#221F1C] border border-[#E5DEC9] dark:border-[#322E29] rounded-lg p-3.5 space-y-1">
          <p className="text-[11px] text-[#78716C] dark:text-[#8E867B]">
            대상 작성자: <span className="font-medium text-[#1C1917] dark:text-[#F5F2EB]">{target.targetAuthorName}</span>
          </p>
          <p className="text-xs text-[#57534E] dark:text-[#B8B0A4] line-clamp-2">
            {target.targetPreview}
          </p>
        </div>

        {isAlreadyReported ? (
          <div className="p-4 rounded-lg border border-[#E5DEC9] dark:border-[#322E29] bg-white dark:bg-[#221F1C] text-xs text-[#57534E] dark:text-[#B8B0A4] space-y-2">
            <p className="font-semibold text-[#1C1917] dark:text-[#F5F2EB]">
              이미 신고가 접수된 항목입니다.
            </p>
            <p>접수된 신고의 처리 상태는 마이페이지의 신고 내역에서 확인할 수 있습니다.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label className="block text-xs font-medium text-[#1C1917] dark:text-[#F5F2EB]">
                신고 사유 선택 *
              </label>
              <div className="space-y-2">
                {REPORT_REASONS.map((item) => {
                  const selected = reason === item.value;
                  return (
                    <label
                      key={item.value}
                      className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                        selected
                          ? 'bg-white dark:bg-[#221F1C] border-[#9A3412] dark:border-[#FB923C]'
                          : 'bg-white/60 dark:bg-[#121110]/60 border-[#E5DEC9] dark:border-[#322E29] hover:border-[#78716C]'
                      }`}
                    >
                      <input
                        type="radio"
                        name="report-reason"
                        value={item.value}
                        checked={selected}
                        onChange={() => setReason(item.value)}
                        className="mt-0.5 accent-[#9A3412]"
                      />
                      <div className="space-y-0.5">
                        <p className="text-xs font-semibold text-[#1C1917] dark:text-[#F5F2EB]">
                          {item.value}
                        </p>
                        <p className="text-[11px] text-[#78716C] dark:text-[#8E867B]">
                          {item.desc}
                        </p>
                      </div>
                    </label>
                  );
                })}
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-[#1C1917] dark:text-[#F5F2EB] mb-1">
                상세 내용 (선택, 최대 500자)
              </label>
              <textarea
                rows={3}
                maxLength={FIELD_LIMITS.REPORT_DETAIL_MAX}
                value={reasonDetail}
                onChange={(e) => setReasonDetail(e.target.value)}
                placeholder="도배 빈도, 문제가 된 표현 등 운영진 검토에 도움이 될 맥락을 적어주세요."
                className="w-full px-3.5 py-2 text-sm bg-white dark:bg-[#121110] text-[#1C1917] dark:text-[#F5F2EB] placeholder:text-[#78716C] dark:placeholder:text-[#8E867B] border border-[#E5DEC9] dark:border-[#322E29] rounded-lg focus:outline-none focus:border-[#9A3412] dark:focus:border-[#FB923C]"
              />
            </div>

            <div className="flex items-start gap-2 text-[11px] text-[#78716C] dark:text-[#8E867B] bg-[#F2EDE4]/50 dark:bg-[#221F1C]/70 px-3 py-2.5 rounded-lg">
              <ShieldAlert className="w-3.5 h-3.5 shrink-0 mt-0.5 text-[#9A3412] dark:text-[#FB923C]" />
              <span>
                허위·악의적 반복 신고를 예방하기 위해 게시글·댓글당 1회만 접수되며, 신고자 정보는 운영진 외 비공개로 보호됩니다.
              </span>
            </div>

            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs border border-[#E5DEC9] dark:border-[#322E29] text-[#57534E] dark:text-[#B8B0A4] rounded-lg hover:text-[#1C1917] dark:hover:text-[#F5F2EB] cursor-pointer"
              >
                취소
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="px-4 py-2 text-xs font-medium bg-[#9A3412] dark:bg-[#FB923C] text-white dark:text-[#121110] rounded-lg hover:opacity-90 disabled:opacity-50 cursor-pointer"
              >
                {submitting ? '접수 중...' : '신고 접수'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
