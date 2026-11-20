import { addDoc, collection, deleteDoc, doc, serverTimestamp, updateDoc } from 'firebase/firestore';
import {
  CheckCircle2,
  Flag,
  Pencil,
  Plus,
  Search,
  ShieldAlert,
  ShieldCheck,
  Trash2,
  X,
} from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { checkContentSafety, recordSubmission } from '../lib/moderation';
import { clampStr, FIELD_LIMITS, formatKoreanDate } from '../lib/validation';
import {
  CommunityCategory,
  CommunityPost,
  CommunityReport,
  CommunitySubTab,
  DepartmentNews,
  DepartmentNewsType,
  MemberProfile,
  ReportStatus,
} from '../types';
import { CommentSection } from './CommentSection';
import { ReportModal, ReportTarget } from './ReportModal';

interface CommunityViewProps {
  subTab: CommunitySubTab;
  onSelectSubTab: (tab: CommunitySubTab) => void;
  posts: CommunityPost[];
  departmentNews: DepartmentNews[];
  selectedNews: DepartmentNews | null;
  onSelectNews: (news: DepartmentNews | null) => void;
  currentUid: string | null;
  memberProfile: MemberProfile | null;
  isAdmin: boolean;
  isLiveCollection: boolean;
  isLiveNewsCollection: boolean;
  reports: CommunityReport[];
  reportedKeys: Set<string>;
  onRequireAuth: () => void;
  onNotify: (msg: string) => void;
}

const CATEGORIES: ('전체' | CommunityCategory)[] = [
  '전체',
  '자유',
  '질문Q&A',
  '정보공유',
  '장비·툴',
];

const NEWS_TYPES: ('전체' | DepartmentNewsType)[] = [
  '전체',
  '학과공지',
  '특강·세미나',
  '전시·상영회',
  '장학·취업',
];

const REPORT_STATUS_FILTERS: ('전체' | ReportStatus)[] = [
  '전체',
  '접수됨',
  '검토중',
  '조치완료',
  '반려됨',
];

export function CommunityView({
  subTab,
  onSelectSubTab,
  posts,
  departmentNews,
  selectedNews,
  onSelectNews,
  currentUid,
  memberProfile,
  isAdmin,
  isLiveCollection,
  isLiveNewsCollection,
  reports,
  reportedKeys,
  onRequireAuth,
  onNotify,
}: CommunityViewProps) {
  const [catFilter, setCatFilter] = useState<'전체' | CommunityCategory>('전체');
  const [newsFilter, setNewsFilter] = useState<'전체' | DepartmentNewsType>('전체');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPost, setSelectedPost] = useState<CommunityPost | null>(null);

  // Community post form states
  const [formOpen, setFormOpen] = useState(false);
  const [editingPost, setEditingPost] = useState<CommunityPost | null>(null);
  const [category, setCategory] = useState<CommunityCategory>('자유');
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [postSafetyWarning, setPostSafetyWarning] = useState<string | null>(null);

  // Department news form states
  const [newsFormOpen, setNewsFormOpen] = useState(false);
  const [editingNews, setEditingNews] = useState<DepartmentNews | null>(null);
  const [newsType, setNewsType] = useState<DepartmentNewsType>('학과공지');
  const [newsTitle, setNewsTitle] = useState('');
  const [newsSummary, setNewsSummary] = useState('');
  const [newsContent, setNewsContent] = useState('');
  const [newsSchedule, setNewsSchedule] = useState('');
  const [newsSource, setNewsSource] = useState('콘텐츠제작학과 학과사무실');
  const [newsPinned, setNewsPinned] = useState(false);

  // Reporting & admin moderation states
  const [reportTarget, setReportTarget] = useState<ReportTarget | null>(null);
  const [adminQueueOpen, setAdminQueueOpen] = useState(false);
  const [reportFilter, setReportFilter] = useState<'전체' | ReportStatus>('전체');
  const [adminNotes, setAdminNotes] = useState<Record<string, string>>({});
  const [processingReportId, setProcessingReportId] = useState<string | null>(null);

  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const onEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (reportTarget) setReportTarget(null);
        else if (adminQueueOpen) setAdminQueueOpen(false);
        else if (formOpen) setFormOpen(false);
        else if (newsFormOpen) setNewsFormOpen(false);
        else if (selectedPost) setSelectedPost(null);
        else if (selectedNews) onSelectNews(null);
      }
    };
    window.addEventListener('keydown', onEsc);
    return () => window.removeEventListener('keydown', onEsc);
  }, [reportTarget, adminQueueOpen, formOpen, newsFormOpen, selectedPost, selectedNews, onSelectNews]);

  const q = searchQuery.trim().toLowerCase();

  const filteredPosts = posts.filter((p) => {
    if (catFilter !== '전체' && p.category !== catFilter) return false;
    if (q) {
      return (
        p.title.toLowerCase().includes(q) ||
        p.content.toLowerCase().includes(q) ||
        p.authorName.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const filteredNews = departmentNews
    .filter((n) => {
      if (newsFilter !== '전체' && n.newsType !== newsFilter) return false;
      if (q) {
        return (
          n.title.toLowerCase().includes(q) ||
          n.summary.toLowerCase().includes(q) ||
          n.source.toLowerCase().includes(q) ||
          n.content.toLowerCase().includes(q)
        );
      }
      return true;
    })
    .sort((a, b) => Number(b.isPinned) - Number(a.isPinned));

  const pendingReportsCount = reports.filter(
    (r) => r.status === '접수됨' || r.status === '검토중'
  ).length;

  const filteredReports = reports.filter((r) =>
    reportFilter === '전체' ? true : r.status === reportFilter
  );

  const openCreateForm = () => {
    if (!currentUid || !memberProfile) return onRequireAuth();
    setEditingPost(null);
    setCategory('자유');
    setTitle('');
    setContent('');
    setPostSafetyWarning(null);
    setFormOpen(true);
  };

  const openEditForm = (post: CommunityPost) => {
    setEditingPost(post);
    setCategory(post.category);
    setTitle(post.title);
    setContent(post.content);
    setPostSafetyWarning(null);
    setFormOpen(true);
  };

  const handleSavePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUid || !memberProfile) return onRequireAuth();
    const cleanTitle = clampStr(title, FIELD_LIMITS.POST_TITLE_MAX);
    const cleanContent = clampStr(content, FIELD_LIMITS.POST_CONTENT_MAX);
    if (cleanTitle.length < 2 || cleanContent.length < 2) return;

    const safety = checkContentSafety(`${cleanTitle}\n${cleanContent}`, 'post', Boolean(editingPost));
    if (!safety.ok) {
      setPostSafetyWarning(safety.reason || '부적절한 표현 또는 도배성 글로 등록이 제한되었습니다.');
      return;
    }
    setPostSafetyWarning(null);

    setSaving(true);
    try {
      if (editingPost) {
        await updateDoc(doc(db, 'communityPosts', editingPost.id), {
          category,
          title: cleanTitle,
          content: cleanContent,
          updatedAt: serverTimestamp(),
        });
        onNotify('게시글이 수정되었습니다.');
        setSelectedPost(null);
      } else {
        await addDoc(collection(db, 'communityPosts'), {
          category,
          title: cleanTitle,
          content: cleanContent,
          authorId: currentUid,
          authorName: clampStr(memberProfile.nickname, FIELD_LIMITS.NICKNAME_MAX),
          authorTrack: clampStr(memberProfile.majorTrack, 40),
          isPublished: true,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
        recordSubmission(`${cleanTitle}\n${cleanContent}`, 'post');
        onNotify('커뮤니티에 글이 등록되었습니다.');
      }
      setFormOpen(false);
    } catch (err) {
      handleFirestoreError(
        err,
        editingPost ? OperationType.UPDATE : OperationType.CREATE,
        editingPost ? `communityPosts/${editingPost.id}` : 'communityPosts'
      );
    } finally {
      setSaving(false);
    }
  };

  const handleDeletePost = async (post: CommunityPost) => {
    try {
      await deleteDoc(doc(db, 'communityPosts', post.id));
      onNotify('게시글이 삭제되었습니다.');
      setSelectedPost(null);
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `communityPosts/${post.id}`);
    }
  };

  const handleOpenPostReport = (post: CommunityPost) => {
    if (!currentUid || !memberProfile) {
      onRequireAuth();
      return;
    }
    if (!isLiveCollection) {
      onNotify('잠시 후 데이터가 동기화되면 신고를 접수할 수 있습니다.');
      return;
    }
    setReportTarget({
      targetType: 'post',
      targetCollection: 'communityPosts',
      targetId: post.id,
      parentId: '',
      targetAuthorId: post.authorId,
      targetAuthorName: post.authorName,
      targetPreview: `[${post.category}] ${post.title} — ${post.content}`,
    });
  };

  const handleUpdateReportStatus = async (report: CommunityReport, nextStatus: ReportStatus) => {
    setProcessingReportId(report.id);
    try {
      const noteValue = clampStr(
        adminNotes[report.id] ?? report.adminNote ?? '',
        FIELD_LIMITS.ADMIN_NOTE_MAX
      );
      await updateDoc(doc(db, 'reports', report.id), {
        status: nextStatus,
        adminNote: noteValue,
        updatedAt: serverTimestamp(),
      });
      onNotify(`신고 상태가 '${nextStatus}'(으)로 변경되었습니다.`);
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `reports/${report.id}`);
    } finally {
      setProcessingReportId(null);
    }
  };

  const handleDeleteTargetAndResolve = async (report: CommunityReport) => {
    setProcessingReportId(report.id);
    try {
      if (report.targetType === 'post') {
        try {
          await deleteDoc(doc(db, report.targetCollection, report.targetId));
        } catch {
          // target may already have been deleted by author
        }
      } else if (report.targetType === 'comment' && report.parentId) {
        try {
          await deleteDoc(
            doc(db, report.targetCollection, report.parentId, 'comments', report.targetId)
          );
        } catch {
          // target may already have been deleted
        }
      }

      const defaultNote =
        clampStr(adminNotes[report.id] ?? '', FIELD_LIMITS.ADMIN_NOTE_MAX) ||
        '운영 정책 위반(도배·욕설 등)으로 해당 게시물 삭제 조치 완료';

      await updateDoc(doc(db, 'reports', report.id), {
        status: '조치완료',
        adminNote: defaultNote,
        updatedAt: serverTimestamp(),
      });
      onNotify('원본 게시물 삭제 및 신고 조치가 완료되었습니다.');
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `reports/${report.id}`);
    } finally {
      setProcessingReportId(null);
    }
  };

  const handleDeleteReportRecord = async (reportId: string) => {
    setProcessingReportId(reportId);
    try {
      await deleteDoc(doc(db, 'reports', reportId));
      onNotify('신고 기록이 삭제되었습니다.');
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `reports/${reportId}`);
    } finally {
      setProcessingReportId(null);
    }
  };

  // Department News handlers
  const openCreateNewsForm = () => {
    if (!currentUid || !memberProfile) return onRequireAuth();
    setEditingNews(null);
    setNewsType('학과공지');
    setNewsTitle('');
    setNewsSummary('');
    setNewsContent('');
    setNewsSchedule('');
    setNewsSource('콘텐츠제작학과 학과사무실');
    setNewsPinned(false);
    setNewsFormOpen(true);
  };

  const openEditNewsForm = (news: DepartmentNews) => {
    setEditingNews(news);
    setNewsType(news.newsType);
    setNewsTitle(news.title);
    setNewsSummary(news.summary);
    setNewsContent(news.content);
    setNewsSchedule(news.eventSchedule);
    setNewsSource(news.source);
    setNewsPinned(news.isPinned);
    setNewsFormOpen(true);
  };

  const handleSaveNews = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUid || !memberProfile) return onRequireAuth();
    const cleanTitle = clampStr(newsTitle, FIELD_LIMITS.POST_TITLE_MAX);
    const cleanSummary = clampStr(newsSummary, FIELD_LIMITS.SUMMARY_MAX);
    const cleanContent = clampStr(newsContent, FIELD_LIMITS.POST_CONTENT_MAX);
    const cleanSchedule = clampStr(newsSchedule, FIELD_LIMITS.NEWS_EVENT_SCHEDULE_MAX);
    const cleanSource = clampStr(newsSource, FIELD_LIMITS.NEWS_SOURCE_MAX);

    if (cleanTitle.length < 2 || cleanSummary.length < 2 || cleanContent.length < 2 || !cleanSource) {
      return;
    }

    setSaving(true);
    try {
      if (editingNews) {
        await updateDoc(doc(db, 'departmentNews', editingNews.id), {
          newsType,
          title: cleanTitle,
          summary: cleanSummary,
          content: cleanContent,
          eventSchedule: cleanSchedule,
          source: cleanSource,
          isPinned: newsPinned,
          updatedAt: serverTimestamp(),
        });
        onNotify('학과 소식이 수정되었습니다.');
        onSelectNews(null);
      } else {
        await addDoc(collection(db, 'departmentNews'), {
          newsType,
          title: cleanTitle,
          summary: cleanSummary,
          content: cleanContent,
          eventSchedule: cleanSchedule,
          source: cleanSource,
          isPinned: newsPinned,
          authorId: currentUid,
          authorName: clampStr(memberProfile.nickname, FIELD_LIMITS.NICKNAME_MAX),
          isPublished: true,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
        onNotify('새 학과 소식이 등록되었습니다.');
      }
      setNewsFormOpen(false);
    } catch (err) {
      handleFirestoreError(
        err,
        editingNews ? OperationType.UPDATE : OperationType.CREATE,
        editingNews ? `departmentNews/${editingNews.id}` : 'departmentNews'
      );
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteNews = async (news: DepartmentNews) => {
    try {
      await deleteDoc(doc(db, 'departmentNews', news.id));
      onNotify('학과 소식이 삭제되었습니다.');
      onSelectNews(null);
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `departmentNews/${news.id}`);
    }
  };

  const selectedPostReported = selectedPost ? reportedKeys.has(`post:${selectedPost.id}`) : false;
  const canReportSelectedPost =
    selectedPost &&
    isLiveCollection &&
    (selectedPost.id.startsWith('seed_') || currentUid !== selectedPost.authorId);

  return (
    <div className="space-y-8 pb-16 pt-8">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-[#E5DEC9] dark:border-[#322E29] pb-6">
        <div>
          <p className="text-xs font-mono-tabular tracking-widest text-[#78716C] dark:text-[#8E867B] mb-1">
            {subTab === 'news' ? 'DEPARTMENT NEWS & NOTICES' : 'CAMPUS LOUNGE & Q&A'}
          </p>
          <h1 className="font-editorial text-3xl sm:text-4xl font-semibold text-[#1C1917] dark:text-[#F5F2EB]">
            {subTab === 'news' ? '콘텐츠제작학과 소식' : '콘텐츠제작학과 커뮤니티'}
          </h1>
          <p className="text-sm text-[#57534E] dark:text-[#B8B0A4] mt-2">
            {subTab === 'news'
              ? '학과 공지사항, 현직자 특강, 졸업작품 상영회, 장학·실습 지원 소식을 확인하세요.'
              : '학교 생활 이야기부터 편집·장비 질문, 작업 정보 공유까지 학우들과 편하게 소통하세요.'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
          {isAdmin && (
            <button
              type="button"
              onClick={() => setAdminQueueOpen(true)}
              className="px-3.5 py-2.5 bg-white dark:bg-[#221F1C] border border-[#E5DEC9] dark:border-[#322E29] text-[#1C1917] dark:text-[#F5F2EB] text-xs font-medium rounded-lg hover:border-[#9A3412] dark:hover:border-[#FB923C] transition-colors inline-flex items-center gap-2 whitespace-nowrap shrink-0 cursor-pointer"
            >
              <ShieldCheck className="w-4 h-4 text-[#9A3412] dark:text-[#FB923C]" />
              <span>신고 관리함</span>
              <span className="font-mono-tabular text-[#9A3412] dark:text-[#FB923C]">
                {pendingReportsCount}건
              </span>
            </button>
          )}

          <button
            type="button"
            onClick={subTab === 'news' ? openCreateNewsForm : openCreateForm}
            className="px-4 py-2.5 bg-[#1C1917] dark:bg-[#F5F2EB] text-[#FBF9F5] dark:text-[#121110] text-xs font-medium rounded-lg hover:bg-[#1E3A8A] dark:hover:bg-[#93B4FF] transition-colors inline-flex items-center gap-2 whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>{subTab === 'news' ? '학과 소식 등록' : '새 글 쓰기'}</span>
          </button>
        </div>
      </div>

      {/* Mode Switch + Filters */}
      <div className="space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-1 p-1 bg-[#F2EDE4] dark:bg-[#1B1917] rounded-lg">
              <button
                type="button"
                onClick={() => onSelectSubTab('news')}
                className={`px-3.5 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  subTab === 'news'
                    ? 'bg-white dark:bg-[#221F1C] text-[#1C1917] dark:text-[#F5F2EB] shadow-sm'
                    : 'text-[#57534E] dark:text-[#B8B0A4] hover:text-[#1C1917] dark:hover:text-[#F5F2EB]'
                }`}
              >
                학과 소식 · 공지
              </button>
              <button
                type="button"
                onClick={() => onSelectSubTab('board')}
                className={`px-3.5 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  subTab === 'board'
                    ? 'bg-white dark:bg-[#221F1C] text-[#1C1917] dark:text-[#F5F2EB] shadow-sm'
                    : 'text-[#57534E] dark:text-[#B8B0A4] hover:text-[#1C1917] dark:hover:text-[#F5F2EB]'
                }`}
              >
                자유 · Q&A 게시판
              </button>
            </div>

            {subTab === 'news' ? (
              <div className="flex flex-wrap items-center gap-1.5">
                {NEWS_TYPES.map((nt) => (
                  <button
                    key={nt}
                    type="button"
                    onClick={() => setNewsFilter(nt)}
                    className={`px-3 py-1.5 text-xs rounded-md border transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                      newsFilter === nt
                        ? 'bg-[#1C1917] dark:bg-[#F5F2EB] text-white dark:text-[#121110] border-[#1C1917] dark:border-[#F5F2EB]'
                        : 'bg-white dark:bg-[#221F1C] text-[#57534E] dark:text-[#B8B0A4] border-[#E5DEC9] dark:border-[#322E29] hover:border-[#1C1917] dark:hover:border-[#F5F2EB]'
                    }`}
                  >
                    {nt}
                  </button>
                ))}
              </div>
            ) : (
              <div className="flex flex-wrap items-center gap-1.5">
                {CATEGORIES.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setCatFilter(c)}
                    className={`px-3 py-1.5 text-xs rounded-md border transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                      catFilter === c
                        ? 'bg-[#1C1917] dark:bg-[#F5F2EB] text-white dark:text-[#121110] border-[#1C1917] dark:border-[#F5F2EB]'
                        : 'bg-white dark:bg-[#221F1C] text-[#57534E] dark:text-[#B8B0A4] border-[#E5DEC9] dark:border-[#322E29] hover:border-[#1C1917] dark:hover:border-[#F5F2EB]'
                    }`}
                  >
                    {c}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="relative w-full lg:w-72">
            <Search className="w-4 h-4 text-[#78716C] dark:text-[#8E867B] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={subTab === 'news' ? '소식 제목, 주최, 일정 검색' : '제목, 내용, 작성자 검색'}
              className="w-full pl-9 pr-3 py-2 text-xs bg-white dark:bg-[#1B1917] text-[#1C1917] dark:text-[#F5F2EB] placeholder:text-[#78716C] dark:placeholder:text-[#8E867B] border border-[#E5DEC9] dark:border-[#322E29] rounded-lg focus:outline-none focus:border-[#1E3A8A] dark:focus:border-[#93B4FF]"
            />
          </div>
        </div>

        {subTab === 'board' && (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-4 py-3 bg-[#F2EDE4]/65 dark:bg-[#1B1917] border border-[#E5DEC9] dark:border-[#322E29] rounded-lg text-xs text-[#57534E] dark:text-[#B8B0A4]">
            <div className="flex items-start sm:items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-[#9A3412] dark:text-[#FB923C] shrink-0 mt-0.5 sm:mt-0" />
              <span>
                건강한 학과 커뮤니티를 위해 <strong className="text-[#1C1917] dark:text-[#F5F2EB]">연속 도배·광고 및 악의적 육두문자</strong> 사용이 자동 제한되며, 게시글과 댓글 상세 화면에서 즉시 신고할 수 있습니다.
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Content List */}
      {subTab === 'news' ? (
        filteredNews.length === 0 ? (
          <div className="py-16 text-center bg-white dark:bg-[#221F1C] border border-[#E5DEC9] dark:border-[#322E29] rounded-xl">
            <p className="font-editorial text-lg text-[#1C1917] dark:text-[#F5F2EB] mb-1">
              조건에 맞는 학과 소식이 없습니다
            </p>
            <p className="text-xs text-[#78716C] dark:text-[#8E867B]">
              새로운 특강, 상영회, 학과 공지 소식을 직접 등록해 보세요.
            </p>
          </div>
        ) : (
          <div className="bg-white dark:bg-[#221F1C] border border-[#E5DEC9] dark:border-[#322E29] rounded-xl divide-y divide-[#E5DEC9] dark:divide-[#322E29]">
            {filteredNews.map((news) => (
              <article
                key={news.id}
                onClick={() => onSelectNews(news)}
                className="p-6 hover:bg-[#F2EDE4]/35 dark:hover:bg-[#1B1917]/60 transition-colors cursor-pointer space-y-2"
              >
                <div className="flex flex-wrap items-center gap-2 text-xs text-[#57534E] dark:text-[#B8B0A4]">
                  {news.isPinned && (
                    <>
                      <span className="font-semibold text-[#9A3412] dark:text-[#FB923C]">주요</span>
                      <span aria-hidden="true">·</span>
                    </>
                  )}
                  <span className="font-semibold text-[#1E3A8A] dark:text-[#93B4FF]">
                    {news.newsType}
                  </span>
                  <span aria-hidden="true">·</span>
                  <span>{news.source}</span>
                  {news.eventSchedule && (
                    <>
                      <span aria-hidden="true">·</span>
                      <span className="font-mono-tabular">{news.eventSchedule}</span>
                    </>
                  )}
                </div>
                <h3 className="font-editorial text-xl font-semibold text-[#1C1917] dark:text-[#F5F2EB]">
                  {news.title}
                </h3>
                <p className="text-sm text-[#57534E] dark:text-[#B8B0A4] line-clamp-2 leading-relaxed">
                  {news.summary}
                </p>
              </article>
            ))}
          </div>
        )
      ) : filteredPosts.length === 0 ? (
        <div className="py-16 text-center bg-white dark:bg-[#221F1C] border border-[#E5DEC9] dark:border-[#322E29] rounded-xl">
          <p className="font-editorial text-lg text-[#1C1917] dark:text-[#F5F2EB] mb-1">
            아직 작성된 글이 없습니다
          </p>
          <p className="text-xs text-[#78716C] dark:text-[#8E867B]">
            학우들에게 첫 질문을 남기거나 소식을 공유해 보세요.
          </p>
        </div>
      ) : (
        <div className="bg-white dark:bg-[#221F1C] border border-[#E5DEC9] dark:border-[#322E29] rounded-xl divide-y divide-[#E5DEC9] dark:divide-[#322E29]">
          {filteredPosts.map((post) => {
            const isPostReported = reportedKeys.has(`post:${post.id}`);
            return (
              <article
                key={post.id}
                onClick={() => setSelectedPost(post)}
                className="p-6 hover:bg-[#F2EDE4]/35 dark:hover:bg-[#1B1917]/60 transition-colors cursor-pointer space-y-2"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-2 text-xs text-[#57534E] dark:text-[#B8B0A4]">
                    <span className="font-semibold text-[#1E3A8A] dark:text-[#93B4FF]">
                      {post.category}
                    </span>
                    <span aria-hidden="true">·</span>
                    <span className="font-medium text-[#1C1917] dark:text-[#F5F2EB]">
                      {post.authorName}
                    </span>
                    {post.authorTrack && (
                      <>
                        <span aria-hidden="true">·</span>
                        <span>{post.authorTrack}</span>
                      </>
                    )}
                    <span aria-hidden="true">·</span>
                    <span className="font-mono-tabular">{formatKoreanDate(post.createdAt)}</span>
                  </div>
                  {isPostReported && (
                    <span className="text-[11px] font-medium text-[#9A3412] dark:text-[#FB923C] inline-flex items-center gap-1">
                      <Flag className="w-3 h-3" />
                      <span>신고 접수됨</span>
                    </span>
                  )}
                </div>
                <h3 className="font-editorial text-xl font-semibold text-[#1C1917] dark:text-[#F5F2EB]">
                  {post.title}
                </h3>
                <p className="text-sm text-[#57534E] dark:text-[#B8B0A4] line-clamp-2 leading-relaxed">
                  {post.content}
                </p>
              </article>
            );
          })}
        </div>
      )}

      {/* Department News Detail Modal */}
      {selectedNews && (
        <div
          className="fixed inset-0 z-50 bg-[#1C1917]/50 dark:bg-black/75 backdrop-blur-[2px] flex items-center justify-center p-4"
          onClick={() => onSelectNews(null)}
        >
          <div
            className="bg-[#FBF9F5] dark:bg-[#1B1917] border border-[#E5DEC9] dark:border-[#322E29] rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 sm:p-8 space-y-5 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4 border-b border-[#E5DEC9] dark:border-[#322E29] pb-4">
              <div className="space-y-1.5">
                <div className="flex flex-wrap items-center gap-2 text-xs text-[#57534E] dark:text-[#B8B0A4]">
                  <span className="font-semibold text-[#1E3A8A] dark:text-[#93B4FF]">
                    {selectedNews.newsType}
                  </span>
                  <span aria-hidden="true">·</span>
                  <span>{selectedNews.source}</span>
                  <span aria-hidden="true">·</span>
                  <span className="font-mono-tabular">
                    {formatKoreanDate(selectedNews.createdAt)}
                  </span>
                </div>
                <h2 className="font-editorial text-2xl font-semibold text-[#1C1917] dark:text-[#F5F2EB]">
                  {selectedNews.title}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => onSelectNews(null)}
                className="p-2 text-[#57534E] dark:text-[#B8B0A4] hover:text-[#1C1917] dark:hover:text-[#F5F2EB] cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {selectedNews.eventSchedule && (
              <div className="bg-[#F2EDE4]/70 dark:bg-[#221F1C] border border-[#E5DEC9] dark:border-[#322E29] rounded-lg px-4 py-3 text-xs text-[#1C1917] dark:text-[#F5F2EB]">
                <span className="text-[#78716C] dark:text-[#8E867B] mr-2">일정 및 장소</span>
                <span className="font-mono-tabular font-medium">{selectedNews.eventSchedule}</span>
              </div>
            )}

            <p className="text-sm font-medium text-[#1C1917] dark:text-[#F5F2EB]">
              {selectedNews.summary}
            </p>
            <p className="text-sm text-[#57534E] dark:text-[#B8B0A4] leading-relaxed whitespace-pre-line">
              {selectedNews.content}
            </p>

            {isLiveNewsCollection && (currentUid === selectedNews.authorId || isAdmin) && (
              <div className="flex justify-end gap-3 pt-4 border-t border-[#E5DEC9] dark:border-[#322E29]">
                <button
                  type="button"
                  onClick={() => openEditNewsForm(selectedNews)}
                  className="text-xs text-[#57534E] dark:text-[#B8B0A4] hover:text-[#1C1917] dark:hover:text-[#F5F2EB] inline-flex items-center gap-1 cursor-pointer"
                >
                  <Pencil className="w-3.5 h-3.5" />
                  <span>수정</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleDeleteNews(selectedNews)}
                  className="text-xs text-[#9A3412] dark:text-[#FB923C] hover:underline inline-flex items-center gap-1 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>삭제</span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Community Post Detail + Comments Modal */}
      {selectedPost && (
        <div
          className="fixed inset-0 z-50 bg-[#1C1917]/50 dark:bg-black/75 backdrop-blur-[2px] flex items-center justify-center p-4"
          onClick={() => setSelectedPost(null)}
        >
          <div
            className="bg-[#FBF9F5] dark:bg-[#1B1917] border border-[#E5DEC9] dark:border-[#322E29] rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 sm:p-8 space-y-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4 border-b border-[#E5DEC9] dark:border-[#322E29] pb-4">
              <div className="space-y-1.5">
                <div className="flex flex-wrap items-center gap-2 text-xs text-[#57534E] dark:text-[#B8B0A4]">
                  <span className="font-semibold text-[#1E3A8A] dark:text-[#93B4FF]">
                    {selectedPost.category}
                  </span>
                  <span aria-hidden="true">·</span>
                  <span>{selectedPost.authorName}</span>
                  {selectedPost.authorTrack && (
                    <>
                      <span aria-hidden="true">·</span>
                      <span>{selectedPost.authorTrack}</span>
                    </>
                  )}
                  <span aria-hidden="true">·</span>
                  <span className="font-mono-tabular">
                    {formatKoreanDate(selectedPost.createdAt)}
                  </span>
                </div>
                <h2 className="font-editorial text-2xl font-semibold text-[#1C1917] dark:text-[#F5F2EB]">
                  {selectedPost.title}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setSelectedPost(null)}
                className="p-2 text-[#57534E] dark:text-[#B8B0A4] hover:text-[#1C1917] dark:hover:text-[#F5F2EB] cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-sm text-[#1C1917] dark:text-[#F5F2EB] leading-relaxed whitespace-pre-line">
              {selectedPost.content}
            </p>

            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                {canReportSelectedPost && (
                  <button
                    type="button"
                    onClick={() => handleOpenPostReport(selectedPost)}
                    disabled={selectedPostReported}
                    className={`px-3 py-1.5 text-xs rounded-lg border inline-flex items-center gap-1.5 transition-colors ${
                      selectedPostReported
                        ? 'border-[#9A3412]/30 dark:border-[#FB923C]/30 text-[#9A3412] dark:text-[#FB923C] bg-[#9A3412]/5 dark:bg-[#FB923C]/10 cursor-default'
                        : 'border-[#E5DEC9] dark:border-[#322E29] text-[#57534E] dark:text-[#B8B0A4] hover:border-[#9A3412] dark:hover:border-[#FB923C] hover:text-[#9A3412] dark:hover:text-[#FB923C] cursor-pointer'
                    }`}
                  >
                    <Flag className="w-3.5 h-3.5" />
                    <span>{selectedPostReported ? '신고 접수 완료' : '도배·욕설 신고하기'}</span>
                  </button>
                )}
              </div>

              {isLiveCollection && (currentUid === selectedPost.authorId || isAdmin) && (
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => openEditForm(selectedPost)}
                    className="text-xs text-[#57534E] dark:text-[#B8B0A4] hover:text-[#1C1917] dark:hover:text-[#F5F2EB] inline-flex items-center gap-1 cursor-pointer"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                    <span>수정</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeletePost(selectedPost)}
                    className="text-xs text-[#9A3412] dark:text-[#FB923C] hover:underline inline-flex items-center gap-1 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>삭제</span>
                  </button>
                </div>
              )}
            </div>

            <CommentSection
              parentCollection="communityPosts"
              parentId={selectedPost.id}
              isLiveDocument={isLiveCollection}
              currentUid={currentUid}
              memberProfile={memberProfile}
              isAdmin={isAdmin}
              reportedKeys={reportedKeys}
              onRequireAuth={onRequireAuth}
              onNotify={onNotify}
            />
          </div>
        </div>
      )}

      {/* Community Post Create/Edit Modal */}
      {formOpen && (
        <div className="fixed inset-0 z-50 bg-[#1C1917]/50 dark:bg-black/75 flex items-center justify-center p-4">
          <div className="bg-[#FBF9F5] dark:bg-[#1B1917] border border-[#E5DEC9] dark:border-[#322E29] rounded-xl max-w-lg w-full p-6 sm:p-8 shadow-xl">
            <div className="flex items-center justify-between pb-4 border-b border-[#E5DEC9] dark:border-[#322E29]">
              <h2 className="font-editorial text-xl font-semibold text-[#1C1917] dark:text-[#F5F2EB]">
                {editingPost ? '게시글 수정' : '커뮤니티 새 글 작성'}
              </h2>
              <button
                type="button"
                onClick={() => setFormOpen(false)}
                className="p-1.5 text-[#57534E] dark:text-[#B8B0A4] hover:text-[#1C1917] dark:hover:text-[#F5F2EB] cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSavePost} className="pt-4 space-y-4">
              {postSafetyWarning && (
                <div
                  role="alert"
                  className="flex items-start gap-2 text-xs text-[#9A3412] dark:text-[#FB923C] bg-[#9A3412]/10 dark:bg-[#FB923C]/10 border border-[#9A3412]/25 dark:border-[#FB923C]/25 rounded-lg px-3.5 py-2.5"
                >
                  <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{postSafetyWarning}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-medium text-[#1C1917] dark:text-[#F5F2EB] mb-1">
                  말머리 카테고리 *
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as CommunityCategory)}
                  className="w-full px-3 py-2 text-sm bg-white dark:bg-[#121110] text-[#1C1917] dark:text-[#F5F2EB] border border-[#E5DEC9] dark:border-[#322E29] rounded-lg"
                >
                  <option value="자유">자유</option>
                  <option value="질문Q&A">질문Q&A</option>
                  <option value="정보공유">정보공유</option>
                  <option value="장비·툴">장비·툴</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-[#1C1917] dark:text-[#F5F2EB] mb-1">
                  제목 *
                </label>
                <input
                  type="text"
                  required
                  maxLength={FIELD_LIMITS.POST_TITLE_MAX}
                  value={title}
                  onChange={(e) => {
                    setTitle(e.target.value);
                    if (postSafetyWarning) setPostSafetyWarning(null);
                  }}
                  className="w-full px-3.5 py-2 text-sm bg-white dark:bg-[#121110] text-[#1C1917] dark:text-[#F5F2EB] border border-[#E5DEC9] dark:border-[#322E29] rounded-lg"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-[#1C1917] dark:text-[#F5F2EB] mb-1">
                  본문 *
                </label>
                <textarea
                  rows={6}
                  required
                  maxLength={FIELD_LIMITS.POST_CONTENT_MAX}
                  value={content}
                  onChange={(e) => {
                    setContent(e.target.value);
                    if (postSafetyWarning) setPostSafetyWarning(null);
                  }}
                  className="w-full px-3.5 py-2 text-sm bg-white dark:bg-[#121110] text-[#1C1917] dark:text-[#F5F2EB] border border-[#E5DEC9] dark:border-[#322E29] rounded-lg"
                />
              </div>
              <p className="text-[11px] text-[#78716C] dark:text-[#8E867B]">
                비방·욕설 및 반복 도배 글은 사전 차단되거나 신고 접수 후 삭제될 수 있습니다.
              </p>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setFormOpen(false)}
                  className="px-4 py-2 text-xs border border-[#E5DEC9] dark:border-[#322E29] rounded-lg cursor-pointer"
                >
                  취소
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 text-xs bg-[#1C1917] dark:bg-[#F5F2EB] text-white dark:text-[#121110] rounded-lg hover:bg-[#1E3A8A] dark:hover:bg-[#93B4FF] cursor-pointer"
                >
                  {saving ? '저장 중...' : editingPost ? '수정 완료' : '글 등록'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Department News Create/Edit Modal */}
      {newsFormOpen && (
        <div className="fixed inset-0 z-50 bg-[#1C1917]/50 dark:bg-black/75 flex items-center justify-center p-4">
          <div className="bg-[#FBF9F5] dark:bg-[#1B1917] border border-[#E5DEC9] dark:border-[#322E29] rounded-xl max-w-lg w-full max-h-[90vh] overflow-y-auto p-6 sm:p-8 shadow-xl">
            <div className="flex items-center justify-between pb-4 border-b border-[#E5DEC9] dark:border-[#322E29]">
              <h2 className="font-editorial text-xl font-semibold text-[#1C1917] dark:text-[#F5F2EB]">
                {editingNews ? '학과 소식 수정' : '새 학과 소식 등록'}
              </h2>
              <button
                type="button"
                onClick={() => setNewsFormOpen(false)}
                className="p-1.5 text-[#57534E] dark:text-[#B8B0A4] hover:text-[#1C1917] dark:hover:text-[#F5F2EB] cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSaveNews} className="pt-4 space-y-3.5">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium mb-1">소식 분류 *</label>
                  <select
                    value={newsType}
                    onChange={(e) => setNewsType(e.target.value as DepartmentNewsType)}
                    className="w-full px-3 py-2 text-sm bg-white dark:bg-[#121110] text-[#1C1917] dark:text-[#F5F2EB] border border-[#E5DEC9] dark:border-[#322E29] rounded-lg"
                  >
                    <option value="학과공지">학과공지</option>
                    <option value="특강·세미나">특강·세미나</option>
                    <option value="전시·상영회">전시·상영회</option>
                    <option value="장학·취업">장학·취업</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1">주최 · 출처 *</label>
                  <input
                    type="text"
                    required
                    maxLength={FIELD_LIMITS.NEWS_SOURCE_MAX}
                    value={newsSource}
                    onChange={(e) => setNewsSource(e.target.value)}
                    className="w-full px-3 py-2 text-sm bg-white dark:bg-[#121110] text-[#1C1917] dark:text-[#F5F2EB] border border-[#E5DEC9] dark:border-[#322E29] rounded-lg"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">제목 *</label>
                <input
                  type="text"
                  required
                  maxLength={FIELD_LIMITS.POST_TITLE_MAX}
                  value={newsTitle}
                  onChange={(e) => setNewsTitle(e.target.value)}
                  className="w-full px-3.5 py-2 text-sm bg-white dark:bg-[#121110] text-[#1C1917] dark:text-[#F5F2EB] border border-[#E5DEC9] dark:border-[#322E29] rounded-lg"
                />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">일정 및 장소 (선택)</label>
                <input
                  type="text"
                  maxLength={FIELD_LIMITS.NEWS_EVENT_SCHEDULE_MAX}
                  value={newsSchedule}
                  onChange={(e) => setNewsSchedule(e.target.value)}
                  placeholder="예: 2026.12.02(수) 16:30 · 미디어홀 204호"
                  className="w-full px-3.5 py-2 text-sm bg-white dark:bg-[#121110] text-[#1C1917] dark:text-[#F5F2EB] border border-[#E5DEC9] dark:border-[#322E29] rounded-lg"
                />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">한 줄 요약 *</label>
                <input
                  type="text"
                  required
                  maxLength={FIELD_LIMITS.SUMMARY_MAX}
                  value={newsSummary}
                  onChange={(e) => setNewsSummary(e.target.value)}
                  className="w-full px-3.5 py-2 text-sm bg-white dark:bg-[#121110] text-[#1C1917] dark:text-[#F5F2EB] border border-[#E5DEC9] dark:border-[#322E29] rounded-lg"
                />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">상세 안내 *</label>
                <textarea
                  rows={5}
                  required
                  maxLength={FIELD_LIMITS.POST_CONTENT_MAX}
                  value={newsContent}
                  onChange={(e) => setNewsContent(e.target.value)}
                  className="w-full px-3.5 py-2 text-sm bg-white dark:bg-[#121110] text-[#1C1917] dark:text-[#F5F2EB] border border-[#E5DEC9] dark:border-[#322E29] rounded-lg"
                />
              </div>
              <label className="flex items-center gap-2 text-xs text-[#57534E] dark:text-[#B8B0A4] cursor-pointer">
                <input
                  type="checkbox"
                  checked={newsPinned}
                  onChange={(e) => setNewsPinned(e.target.checked)}
                />
                <span>상단 주요 학과 소식으로 고정 표시</span>
              </label>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setNewsFormOpen(false)}
                  className="px-4 py-2 text-xs border border-[#E5DEC9] dark:border-[#322E29] rounded-lg cursor-pointer"
                >
                  취소
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 text-xs bg-[#1C1917] dark:bg-[#F5F2EB] text-white dark:text-[#121110] rounded-lg hover:bg-[#1E3A8A] dark:hover:bg-[#93B4FF] cursor-pointer"
                >
                  {saving ? '저장 중...' : editingNews ? '수정 완료' : '소식 등록'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Admin Report Moderation Queue Modal */}
      {isAdmin && adminQueueOpen && (
        <div
          className="fixed inset-0 z-50 bg-[#1C1917]/55 dark:bg-black/80 backdrop-blur-[2px] flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          onClick={() => setAdminQueueOpen(false)}
        >
          <div
            className="bg-[#FBF9F5] dark:bg-[#1B1917] border border-[#E5DEC9] dark:border-[#322E29] rounded-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto p-6 sm:p-8 shadow-2xl space-y-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4 border-b border-[#E5DEC9] dark:border-[#322E29] pb-4">
              <div>
                <p className="text-[11px] font-mono-tabular tracking-widest text-[#9A3412] dark:text-[#FB923C] mb-1">
                  ADMIN MODERATION QUEUE
                </p>
                <h2 className="font-editorial text-2xl font-semibold text-[#1C1917] dark:text-[#F5F2EB]">
                  커뮤니티 신고 관리함
                </h2>
                <p className="text-xs text-[#57534E] dark:text-[#B8B0A4] mt-1">
                  접수된 도배·욕설 신고 내역을 검토하고 문제 게시물을 즉시 삭제하거나 처리 상태를 기록할 수 있습니다.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setAdminQueueOpen(false)}
                className="p-2 text-[#57534E] dark:text-[#B8B0A4] hover:text-[#1C1917] dark:hover:text-[#F5F2EB] cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-1.5">
              {REPORT_STATUS_FILTERS.map((st) => (
                <button
                  key={st}
                  type="button"
                  onClick={() => setReportFilter(st)}
                  className={`px-3 py-1.5 text-xs rounded-md border transition-colors cursor-pointer ${
                    reportFilter === st
                      ? 'bg-[#1C1917] dark:bg-[#F5F2EB] text-white dark:text-[#121110] border-[#1C1917] dark:border-[#F5F2EB]'
                      : 'bg-white dark:bg-[#221F1C] text-[#57534E] dark:text-[#B8B0A4] border-[#E5DEC9] dark:border-[#322E29]'
                  }`}
                >
                  {st}
                </button>
              ))}
            </div>

            {filteredReports.length === 0 ? (
              <div className="py-12 text-center bg-white dark:bg-[#221F1C] border border-[#E5DEC9] dark:border-[#322E29] rounded-xl text-xs text-[#78716C] dark:text-[#8E867B]">
                해당 상태의 신고 접수 내역이 없습니다.
              </div>
            ) : (
              <div className="space-y-4">
                {filteredReports.map((report) => {
                  const isBusy = processingReportId === report.id;
                  const noteDraft = adminNotes[report.id] ?? report.adminNote ?? '';
                  return (
                    <div
                      key={report.id}
                      className="bg-white dark:bg-[#221F1C] border border-[#E5DEC9] dark:border-[#322E29] rounded-xl p-5 space-y-3"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                        <div className="flex flex-wrap items-center gap-2 text-[#57534E] dark:text-[#B8B0A4]">
                          <span className="font-semibold text-[#9A3412] dark:text-[#FB923C]">
                            {report.reason}
                          </span>
                          <span aria-hidden="true">·</span>
                          <span>{report.targetType === 'post' ? '게시글' : '댓글'}</span>
                          <span aria-hidden="true">·</span>
                          <span>신고자: {report.reporterName}</span>
                          <span aria-hidden="true">·</span>
                          <span className="font-mono-tabular">
                            {formatKoreanDate(report.createdAt)}
                          </span>
                        </div>
                        <span
                          className={`text-xs font-semibold ${
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

                      <div className="bg-[#F2EDE4]/70 dark:bg-[#1B1917] border border-[#E5DEC9] dark:border-[#322E29] rounded-lg p-3 space-y-1">
                        <p className="text-[11px] text-[#78716C] dark:text-[#8E867B]">
                          대상 작성자: {report.targetAuthorName}
                        </p>
                        <p className="text-xs text-[#1C1917] dark:text-[#F5F2EB] leading-relaxed">
                          {report.targetPreview}
                        </p>
                        {report.reasonDetail && (
                          <p className="text-xs text-[#57534E] dark:text-[#B8B0A4] pt-1 border-t border-[#E5DEC9]/70 dark:border-[#322E29]">
                            신고 상세: {report.reasonDetail}
                          </p>
                        )}
                      </div>

                      <div className="space-y-2">
                        <input
                          type="text"
                          maxLength={FIELD_LIMITS.ADMIN_NOTE_MAX}
                          value={noteDraft}
                          onChange={(e) =>
                            setAdminNotes((prev) => ({ ...prev, [report.id]: e.target.value }))
                          }
                          placeholder="관리자 처리 메모 입력 (선택)"
                          className="w-full px-3 py-1.5 text-xs bg-[#FBF9F5] dark:bg-[#121110] text-[#1C1917] dark:text-[#F5F2EB] placeholder:text-[#78716C] dark:placeholder:text-[#8E867B] border border-[#E5DEC9] dark:border-[#322E29] rounded-lg"
                        />
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <button
                              type="button"
                              disabled={isBusy}
                              onClick={() => handleUpdateReportStatus(report, '검토중')}
                              className="px-2.5 py-1 text-[11px] border border-[#E5DEC9] dark:border-[#322E29] text-[#57534E] dark:text-[#B8B0A4] rounded hover:border-[#1C1917] dark:hover:border-[#F5F2EB] cursor-pointer"
                            >
                              검토중
                            </button>
                            <button
                              type="button"
                              disabled={isBusy}
                              onClick={() => handleUpdateReportStatus(report, '조치완료')}
                              className="px-2.5 py-1 text-[11px] border border-[#1E3A8A]/40 dark:border-[#93B4FF]/40 text-[#1E3A8A] dark:text-[#93B4FF] rounded hover:bg-[#1E3A8A]/10 cursor-pointer inline-flex items-center gap-1"
                            >
                              <CheckCircle2 className="w-3 h-3" />
                              <span>조치완료</span>
                            </button>
                            <button
                              type="button"
                              disabled={isBusy}
                              onClick={() => handleUpdateReportStatus(report, '반려됨')}
                              className="px-2.5 py-1 text-[11px] border border-[#E5DEC9] dark:border-[#322E29] text-[#78716C] dark:text-[#8E867B] rounded hover:border-[#1C1917] dark:hover:border-[#F5F2EB] cursor-pointer"
                            >
                              반려됨
                            </button>
                          </div>

                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              disabled={isBusy}
                              onClick={() => handleDeleteTargetAndResolve(report)}
                              className="px-2.5 py-1 text-[11px] font-medium bg-[#9A3412] dark:bg-[#FB923C] text-white dark:text-[#121110] rounded hover:opacity-90 cursor-pointer inline-flex items-center gap-1"
                            >
                              <Trash2 className="w-3 h-3" />
                              <span>원본 삭제 후 완료</span>
                            </button>
                            <button
                              type="button"
                              disabled={isBusy}
                              onClick={() => handleDeleteReportRecord(report.id)}
                              className="text-[11px] text-[#78716C] dark:text-[#8E867B] hover:text-[#9A3412] dark:hover:text-[#FB923C] cursor-pointer"
                            >
                              기록 삭제
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      <ReportModal
        target={reportTarget}
        currentUid={currentUid}
        memberProfile={memberProfile}
        isAlreadyReported={
          reportTarget
            ? reportedKeys.has(`${reportTarget.targetType}:${reportTarget.targetId}`)
            : false
        }
        onClose={() => setReportTarget(null)}
        onRequireAuth={onRequireAuth}
        onNotify={onNotify}
      />
    </div>
  );
}
