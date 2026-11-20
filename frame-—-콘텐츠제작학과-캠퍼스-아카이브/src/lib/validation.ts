import { TimestampLike } from '../types';

// Exact constants synchronized with firebase-blueprint.json and firestore.rules
export const FIELD_LIMITS = {
  NICKNAME_MAX: 40,
  STUDENT_NUMBER_MAX: 20,
  BIO_MAX: 300,
  TOOLS_MAX_COUNT: 8,
  TOOL_ITEM_MAX: 40,
  URL_MAX: 500,
  CONTEST_TITLE_MAX: 120,
  ORGANIZER_MAX: 80,
  PRIZE_MAX: 100,
  SUMMARY_MAX: 240,
  DESCRIPTION_MAX: 3000,
  CLUB_NAME_MAX: 60,
  RECRUIT_COUNT_MAX: 30,
  SCHEDULE_MAX: 80,
  CONTACT_MAX: 200,
  COMMENT_MAX: 1000,
  COURSE_NAME_MAX: 60,
  TEAM_ROLES_MAX_COUNT: 6,
  TEAM_ROLE_ITEM_MAX: 40,
  TEAM_DESC_MAX: 2000,
  PORTFOLIO_TITLE_MAX: 100,
  TOOLS_USED_MAX: 120,
  PORTFOLIO_DESC_MAX: 2000,
  GUIDE_ITEM_MAX: 80,
  GUIDE_LOC_MAX: 120,
  GUIDE_BODY_MAX: 4000,
  POST_TITLE_MAX: 120,
  POST_CONTENT_MAX: 3000,
  NEWS_SOURCE_MAX: 80,
  NEWS_EVENT_SCHEDULE_MAX: 80,
  REPORT_PREVIEW_MAX: 200,
  REPORT_DETAIL_MAX: 500,
  ADMIN_NOTE_MAX: 300,
} as const;

export const DEADLINE_REGEX = /^\d{4}-\d{2}-\d{2}$/;
export const VALID_ID_REGEX = /^[a-zA-Z0-9_-]+$/;

export function clampStr(val: string, maxLen: number): string {
  return val.trim().slice(0, maxLen);
}

export function sanitizeStringList(items: string[], maxItems: number, maxLen: number): string[] {
  return items
    .map((s) => s.trim().slice(0, maxLen))
    .filter((s) => s.length > 0)
    .slice(0, maxItems);
}

export function computeDday(deadline: string): { label: string; daysLeft: number; isUrgent: boolean; isClosed: boolean } {
  if (!DEADLINE_REGEX.test(deadline)) {
    return { label: '상시', daysLeft: 999, isUrgent: false, isClosed: false };
  }
  const now = new Date();
  const todayMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const [y, m, d] = deadline.split('-').map(Number);
  const targetMidnight = new Date(y, m - 1, d).getTime();
  const diffDays = Math.round((targetMidnight - todayMidnight) / (1000 * 60 * 60 * 24));

  if (diffDays < 0) {
    return { label: '마감', daysLeft: diffDays, isUrgent: false, isClosed: true };
  }
  if (diffDays === 0) {
    return { label: 'D-Day', daysLeft: 0, isUrgent: true, isClosed: false };
  }
  return {
    label: `D-${diffDays}`,
    daysLeft: diffDays,
    isUrgent: diffDays <= 7,
    isClosed: false,
  };
}

export function getTimestampMillis(ts?: TimestampLike): number {
  if (!ts) return 0;
  if (typeof ts.toDate === 'function') {
    return ts.toDate().getTime();
  }
  if (typeof ts.seconds === 'number') {
    return ts.seconds * 1000;
  }
  return 0;
}

export function formatKoreanDate(ts?: TimestampLike): string {
  const ms = getTimestampMillis(ts);
  if (!ms) return '방금 전';
  const date = new Date(ms);
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}.${m}.${d}`;
}

export function sortByNewest<T extends { createdAt?: TimestampLike }>(items: T[]): T[] {
  return [...items].sort((a, b) => getTimestampMillis(b.createdAt) - getTimestampMillis(a.createdAt));
}
