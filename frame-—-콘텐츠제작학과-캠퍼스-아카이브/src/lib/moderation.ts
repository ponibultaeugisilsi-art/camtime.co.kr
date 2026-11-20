// Client-side preventive guard against abusive profanity and rapid spam submissions.
// Works alongside the community reporting workflow in Firestore.

const SEVERE_PROFANITY_PATTERNS: RegExp[] = [
  /시[바발빨]/i,
  /씨[바발빨방]/i,
  /ㅅㅂ/i,
  /ㅆㅂ/i,
  /병신/i,
  /ㅂㅅ/i,
  /개새[끼키]/i,
  /미친[새놈년]/i,
  /지[랄럴]/i,
  /ㅈㄴ/i,
  /존[나니]/i,
  /느금마/i,
  /애[미비]뒤/i,
  /창[녀년]/i,
  /걸레년/i,
  /죽여버/i,
  /뒤져[라버]/i,
];

const REPEATED_CHAR_FLOOD_REGEX = /(.)\1{14,}/u;
const URL_REGEX = /https?:\/\/\S+/gi;

interface SubmissionRecord {
  lastTimestamp: number;
  recentNormalizedTexts: { text: string; timestamp: number }[];
}

const submissionHistory = new Map<string, SubmissionRecord>();

const COOLDOWN_MS = 10_000; // 10 seconds between consecutive writes
const DUPLICATE_WINDOW_MS = 120_000; // 2 minutes for identical spam text

function normalizeForSpamCheck(raw: string): string {
  return raw.toLowerCase().replace(/\s+/g, '').trim();
}

export interface ContentSafetyResult {
  ok: boolean;
  reason?: string;
}

export function checkContentSafety(
  text: string,
  scopeKey: 'post' | 'comment',
  isEditing = false
): ContentSafetyResult {
  const trimmed = text.trim();
  if (!trimmed) {
    return { ok: false, reason: '내용을 입력해 주세요.' };
  }

  for (const pattern of SEVERE_PROFANITY_PATTERNS) {
    if (pattern.test(trimmed)) {
      return {
        ok: false,
        reason:
          '악의적인 육두문자나 비하 표현이 감지되었습니다. 학우 간 존중을 위해 표현을 다듬은 뒤 등록해 주세요.',
      };
    }
  }

  if (REPEATED_CHAR_FLOOD_REGEX.test(trimmed)) {
    return {
      ok: false,
      reason: '동일한 문자나 기호가 과도하게 반복되어 도배성 게시글로 분류되었습니다.',
    };
  }

  const urls = trimmed.match(URL_REGEX);
  if (urls && urls.length >= 5) {
    return {
      ok: false,
      reason: '외부 링크가 과도하게 포함되어 스팸성 홍보 글로 제한되었습니다.',
    };
  }

  if (!isEditing) {
    const now = Date.now();
    const record = submissionHistory.get(scopeKey);
    if (record) {
      const elapsed = now - record.lastTimestamp;
      if (elapsed < COOLDOWN_MS) {
        const remainSec = Math.ceil((COOLDOWN_MS - elapsed) / 1000);
        return {
          ok: false,
          reason: `도배 예방을 위해 연속 등록이 잠시 제한됩니다. ${remainSec}초 후 다시 시도해 주세요.`,
        };
      }

      const norm = normalizeForSpamCheck(trimmed);
      const isDuplicate = record.recentNormalizedTexts.some(
        (entry) => now - entry.timestamp < DUPLICATE_WINDOW_MS && entry.text === norm
      );
      if (isDuplicate) {
        return {
          ok: false,
          reason: '방금 작성하신 것과 동일한 내용은 반복 등록할 수 없습니다.',
        };
      }
    }
  }

  return { ok: true };
}

export function recordSubmission(text: string, scopeKey: 'post' | 'comment'): void {
  const now = Date.now();
  const prev = submissionHistory.get(scopeKey);
  const recent = (prev?.recentNormalizedTexts || []).filter(
    (entry) => now - entry.timestamp < DUPLICATE_WINDOW_MS
  );
  recent.push({ text: normalizeForSpamCheck(text), timestamp: now });
  submissionHistory.set(scopeKey, {
    lastTimestamp: now,
    recentNormalizedTexts: recent.slice(-5),
  });
}
