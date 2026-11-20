import { addDoc, collection, deleteDoc, doc, serverTimestamp, updateDoc } from 'firebase/firestore';
import { ExternalLink, Lock, Pencil, Plus, Search, Trash2, X } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { GENERATED_IMAGES } from '../data/seedData';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { clampStr, FIELD_LIMITS, formatKoreanDate, sanitizeStringList } from '../lib/validation';
import {
  EquipGuide,
  EquipGuideType,
  MajorSubTab,
  MemberProfile,
  PortfolioTrack,
  PortfolioWork,
  StudyTip,
  StudyTipType,
  TeamRecruit,
  TeamStatus,
} from '../types';
import { CommentSection } from './CommentSection';
import { EditorialImage } from './EditorialImage';

interface MajorHubViewProps {
  subTab: MajorSubTab;
  onSelectSubTab: (tab: MajorSubTab) => void;
  studyTips: StudyTip[];
  teamRecruits: TeamRecruit[];
  portfolios: PortfolioWork[];
  equipGuides: EquipGuide[];
  selectedPortfolio: PortfolioWork | null;
  onSelectPortfolio: (work: PortfolioWork | null) => void;
  currentUid: string | null;
  memberProfile: MemberProfile | null;
  isAdmin: boolean;
  isLiveCollection: boolean;
  reportedKeys?: Set<string>;
  onRequireAuth: () => void;
  onNotify: (msg: string) => void;
}

const SUB_TABS: { id: MajorSubTab; label: string }[] = [
  { id: 'study', label: '강의·과제 팁 & 스터디' },
  { id: 'team', label: '공모전 팀원 매칭' },
  { id: 'portfolio', label: '포트폴리오 피드백' },
  { id: 'wiki', label: '장비·소프트웨어 위키' },
];

export function MajorHubView({
  subTab,
  onSelectSubTab,
  studyTips,
  teamRecruits,
  portfolios,
  equipGuides,
  selectedPortfolio,
  onSelectPortfolio,
  currentUid,
  memberProfile,
  isAdmin,
  isLiveCollection,
  reportedKeys,
  onRequireAuth,
  onNotify,
}: MajorHubViewProps) {
  const [searchQuery, setSearchQuery] = useState('');

  // Study Tips states
  const [tipFilter, setTipFilter] = useState<'전체' | StudyTipType>('전체');
  const [selectedTip, setSelectedTip] = useState<StudyTip | null>(null);
  const [tipModalOpen, setTipModalOpen] = useState(false);
  const [editingTip, setEditingTip] = useState<StudyTip | null>(null);
  const [courseName, setCourseName] = useState('');
  const [tipType, setTipType] = useState<StudyTipType>('과제노하우');
  const [tipTitle, setTipTitle] = useState('');
  const [tipContent, setTipContent] = useState('');

  // Team Recruit states
  const [teamFilter, setTeamFilter] = useState<'전체' | TeamStatus>('전체');
  const [selectedTeam, setSelectedTeam] = useState<TeamRecruit | null>(null);
  const [teamModalOpen, setTeamModalOpen] = useState(false);
  const [editingTeam, setEditingTeam] = useState<TeamRecruit | null>(null);
  const [projectTitle, setProjectTitle] = useState('');
  const [contestName, setContestName] = useState('');
  const [rolesInput, setRolesInput] = useState('촬영, 편집');
  const [currentMembers, setCurrentMembers] = useState(1);
  const [targetMembers, setTargetMembers] = useState(4);
  const [teamStatus, setTeamStatus] = useState<TeamStatus>('모집중');
  const [teamDesc, setTeamDesc] = useState('');
  const [contactNote, setContactNote] = useState('');

  // Portfolio states
  const [trackFilter, setTrackFilter] = useState<'전체' | PortfolioTrack>('전체');
  const [workModalOpen, setWorkModalOpen] = useState(false);
  const [editingWork, setEditingWork] = useState<PortfolioWork | null>(null);
  const [workTitle, setWorkTitle] = useState('');
  const [workTrack, setWorkTrack] = useState<PortfolioTrack>('영상·영화');
  const [toolsUsed, setToolsUsed] = useState('');
  const [workImage, setWorkImage] = useState<string>(GENERATED_IMAGES.portfolioFilm);
  const [mediaLink, setMediaLink] = useState('');
  const [workDesc, setWorkDesc] = useState('');

  // Equip Wiki states
  const [wikiFilter, setWikiFilter] = useState<'전체' | EquipGuideType>('전체');
  const [selectedGuide, setSelectedGuide] = useState<EquipGuide | null>(null);
  const [guideModalOpen, setGuideModalOpen] = useState(false);
  const [editingGuide, setEditingGuide] = useState<EquipGuide | null>(null);
  const [guideType, setGuideType] = useState<EquipGuideType>('교내장비');
  const [itemName, setItemName] = useState('');
  const [locationOrShortcut, setLocationOrShortcut] = useState('');
  const [guideSummary, setGuideSummary] = useState('');
  const [guideBody, setGuideBody] = useState('');

  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const onEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setTipModalOpen(false);
        setTeamModalOpen(false);
        setWorkModalOpen(false);
        setGuideModalOpen(false);
        setSelectedTip(null);
        setSelectedTeam(null);
        setSelectedGuide(null);
        onSelectPortfolio(null);
      }
    };
    window.addEventListener('keydown', onEsc);
    return () => window.removeEventListener('keydown', onEsc);
  }, [onSelectPortfolio]);

  const q = searchQuery.trim().toLowerCase();

  // --- Handlers: Study Tips ---
  const openCreateTip = () => {
    if (!currentUid || !memberProfile) return onRequireAuth();
    setEditingTip(null);
    setCourseName('');
    setTipType('과제노하우');
    setTipTitle('');
    setTipContent('');
    setTipModalOpen(true);
  };

  const openEditTip = (tip: StudyTip) => {
    setEditingTip(tip);
    setCourseName(tip.courseName);
    setTipType(tip.tipType);
    setTipTitle(tip.title);
    setTipContent(tip.content);
    setTipModalOpen(true);
  };

  const saveTip = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUid || !memberProfile) return onRequireAuth();
    setSaving(true);
    try {
      const payload = {
        courseName: clampStr(courseName, FIELD_LIMITS.COURSE_NAME_MAX),
        tipType,
        title: clampStr(tipTitle, FIELD_LIMITS.POST_TITLE_MAX),
        content: clampStr(tipContent, FIELD_LIMITS.DESCRIPTION_MAX),
      };
      if (editingTip) {
        await updateDoc(doc(db, 'studyTips', editingTip.id), {
          ...payload,
          updatedAt: serverTimestamp(),
        });
        onNotify('전공 팁이 수정되었습니다.');
        setSelectedTip(null);
      } else {
        await addDoc(collection(db, 'studyTips'), {
          ...payload,
          authorId: currentUid,
          authorName: clampStr(memberProfile.nickname, FIELD_LIMITS.NICKNAME_MAX),
          authorTrack: clampStr(memberProfile.majorTrack, 40),
          isPublished: true,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
        onNotify('새 전공 팁이 등록되었습니다.');
      }
      setTipModalOpen(false);
    } catch (err) {
      handleFirestoreError(
        err,
        editingTip ? OperationType.UPDATE : OperationType.CREATE,
        editingTip ? `studyTips/${editingTip.id}` : 'studyTips'
      );
    } finally {
      setSaving(false);
    }
  };

  const deleteTip = async (tip: StudyTip) => {
    try {
      await deleteDoc(doc(db, 'studyTips', tip.id));
      onNotify('게시글이 삭제되었습니다.');
      setSelectedTip(null);
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `studyTips/${tip.id}`);
    }
  };

  // --- Handlers: Team Recruits ---
  const openCreateTeam = () => {
    if (!currentUid || !memberProfile) return onRequireAuth();
    setEditingTeam(null);
    setProjectTitle('');
    setContestName('');
    setRolesInput('촬영, 편집');
    setCurrentMembers(1);
    setTargetMembers(4);
    setTeamStatus('모집중');
    setTeamDesc('');
    setContactNote('');
    setTeamModalOpen(true);
  };

  const openEditTeam = (team: TeamRecruit) => {
    setEditingTeam(team);
    setProjectTitle(team.projectTitle);
    setContestName(team.contestName);
    setRolesInput(team.neededRoles.join(', '));
    setCurrentMembers(team.currentMembers);
    setTargetMembers(team.targetMembers);
    setTeamStatus(team.status);
    setTeamDesc(team.description);
    setContactNote(team.contactNote);
    setTeamModalOpen(true);
  };

  const saveTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUid || !memberProfile) return onRequireAuth();
    const roles = sanitizeStringList(
      rolesInput.split(','),
      FIELD_LIMITS.TEAM_ROLES_MAX_COUNT,
      FIELD_LIMITS.TEAM_ROLE_ITEM_MAX
    );
    if (roles.length === 0) roles.push('포지션 협의');

    setSaving(true);
    try {
      const payload = {
        projectTitle: clampStr(projectTitle, FIELD_LIMITS.POST_TITLE_MAX),
        contestName: clampStr(contestName, FIELD_LIMITS.POST_TITLE_MAX),
        neededRoles: roles,
        currentMembers: Math.max(1, Math.min(20, Number(currentMembers))),
        targetMembers: Math.max(2, Math.min(20, Number(targetMembers))),
        status: teamStatus,
        description: clampStr(teamDesc, FIELD_LIMITS.TEAM_DESC_MAX),
        contactNote: clampStr(contactNote, FIELD_LIMITS.CONTACT_MAX),
      };
      if (editingTeam) {
        await updateDoc(doc(db, 'teamRecruits', editingTeam.id), {
          ...payload,
          updatedAt: serverTimestamp(),
        });
        onNotify('팀원 모집 정보가 업데이트되었습니다.');
        setSelectedTeam(null);
      } else {
        await addDoc(collection(db, 'teamRecruits'), {
          ...payload,
          authorId: currentUid,
          authorName: clampStr(memberProfile.nickname, FIELD_LIMITS.NICKNAME_MAX),
          isPublished: true,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
        onNotify('새 팀원 매칭 공고가 등록되었습니다.');
      }
      setTeamModalOpen(false);
    } catch (err) {
      handleFirestoreError(
        err,
        editingTeam ? OperationType.UPDATE : OperationType.CREATE,
        editingTeam ? `teamRecruits/${editingTeam.id}` : 'teamRecruits'
      );
    } finally {
      setSaving(false);
    }
  };

  const deleteTeam = async (team: TeamRecruit) => {
    try {
      await deleteDoc(doc(db, 'teamRecruits', team.id));
      onNotify('팀원 매칭 공고가 삭제되었습니다.');
      setSelectedTeam(null);
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `teamRecruits/${team.id}`);
    }
  };

  // --- Handlers: Portfolio Works ---
  const openCreateWork = () => {
    if (!currentUid || !memberProfile) return onRequireAuth();
    setEditingWork(null);
    setWorkTitle('');
    setWorkTrack('영상·영화');
    setToolsUsed('');
    setWorkImage(GENERATED_IMAGES.portfolioFilm);
    setMediaLink('');
    setWorkDesc('');
    setWorkModalOpen(true);
  };

  const openEditWork = (work: PortfolioWork) => {
    setEditingWork(work);
    setWorkTitle(work.title);
    setWorkTrack(work.track);
    setToolsUsed(work.toolsUsed);
    setWorkImage(work.imageUrl || GENERATED_IMAGES.portfolioFilm);
    setMediaLink(work.mediaLink);
    setWorkDesc(work.description);
    setWorkModalOpen(true);
  };

  const saveWork = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUid || !memberProfile) return onRequireAuth();
    setSaving(true);
    try {
      const payload = {
        title: clampStr(workTitle, FIELD_LIMITS.PORTFOLIO_TITLE_MAX),
        track: workTrack,
        toolsUsed: clampStr(toolsUsed, FIELD_LIMITS.TOOLS_USED_MAX),
        imageUrl: clampStr(workImage, FIELD_LIMITS.URL_MAX),
        mediaLink: clampStr(mediaLink, FIELD_LIMITS.URL_MAX),
        description: clampStr(workDesc, FIELD_LIMITS.PORTFOLIO_DESC_MAX),
      };
      if (editingWork) {
        await updateDoc(doc(db, 'portfolioWorks', editingWork.id), {
          ...payload,
          updatedAt: serverTimestamp(),
        });
        onNotify('포트폴리오 작품이 수정되었습니다.');
        onSelectPortfolio(null);
      } else {
        await addDoc(collection(db, 'portfolioWorks'), {
          ...payload,
          authorId: currentUid,
          authorName: clampStr(memberProfile.nickname, FIELD_LIMITS.NICKNAME_MAX),
          authorGrade: clampStr(memberProfile.grade, 20),
          isPublished: true,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
        onNotify('포트폴리오 작품이 갤러리에 전시되었습니다.');
      }
      setWorkModalOpen(false);
    } catch (err) {
      handleFirestoreError(
        err,
        editingWork ? OperationType.UPDATE : OperationType.CREATE,
        editingWork ? `portfolioWorks/${editingWork.id}` : 'portfolioWorks'
      );
    } finally {
      setSaving(false);
    }
  };

  const deleteWork = async (work: PortfolioWork) => {
    try {
      await deleteDoc(doc(db, 'portfolioWorks', work.id));
      onNotify('포트폴리오 작품이 삭제되었습니다.');
      onSelectPortfolio(null);
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `portfolioWorks/${work.id}`);
    }
  };

  // --- Handlers: Equip Wiki ---
  const openCreateGuide = () => {
    if (!currentUid || !memberProfile) return onRequireAuth();
    setEditingGuide(null);
    setGuideType('교내장비');
    setItemName('');
    setLocationOrShortcut('');
    setGuideSummary('');
    setGuideBody('');
    setGuideModalOpen(true);
  };

  const openEditGuide = (guide: EquipGuide) => {
    setEditingGuide(guide);
    setGuideType(guide.guideType);
    setItemName(guide.itemName);
    setLocationOrShortcut(guide.locationOrShortcut);
    setGuideSummary(guide.summary);
    setGuideBody(guide.guideBody);
    setGuideModalOpen(true);
  };

  const saveGuide = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUid || !memberProfile) return onRequireAuth();
    setSaving(true);
    try {
      const payload = {
        guideType,
        itemName: clampStr(itemName, FIELD_LIMITS.GUIDE_ITEM_MAX),
        locationOrShortcut: clampStr(locationOrShortcut, FIELD_LIMITS.GUIDE_LOC_MAX),
        summary: clampStr(guideSummary, FIELD_LIMITS.SUMMARY_MAX),
        guideBody: clampStr(guideBody, FIELD_LIMITS.GUIDE_BODY_MAX),
      };
      if (editingGuide) {
        await updateDoc(doc(db, 'equipGuides', editingGuide.id), {
          ...payload,
          updatedAt: serverTimestamp(),
        });
        onNotify('위키 가이드가 수정되었습니다.');
        setSelectedGuide(null);
      } else {
        await addDoc(collection(db, 'equipGuides'), {
          ...payload,
          authorId: currentUid,
          authorName: clampStr(memberProfile.nickname, FIELD_LIMITS.NICKNAME_MAX),
          isPublished: true,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
        onNotify('새 장비·툴 가이드가 위키에 등록되었습니다.');
      }
      setGuideModalOpen(false);
    } catch (err) {
      handleFirestoreError(
        err,
        editingGuide ? OperationType.UPDATE : OperationType.CREATE,
        editingGuide ? `equipGuides/${editingGuide.id}` : 'equipGuides'
      );
    } finally {
      setSaving(false);
    }
  };

  const deleteGuide = async (guide: EquipGuide) => {
    try {
      await deleteDoc(doc(db, 'equipGuides', guide.id));
      onNotify('가이드 문서가 삭제되었습니다.');
      setSelectedGuide(null);
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `equipGuides/${guide.id}`);
    }
  };

  const handlePrimaryAction = () => {
    if (subTab === 'study') openCreateTip();
    else if (subTab === 'team') openCreateTeam();
    else if (subTab === 'portfolio') openCreateWork();
    else openCreateGuide();
  };

  const actionLabels: Record<MajorSubTab, string> = {
    study: '강의·과제 팁 작성',
    team: '팀원 모집 글 작성',
    portfolio: '작업물 업로드',
    wiki: '장비·툴 가이드 기여',
  };

  return (
    <div className="space-y-8 pb-16 pt-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-[#E5DEC9] dark:border-[#322E29] pb-6">
        <div>
          <p className="text-xs font-mono-tabular tracking-widest text-[#78716C] dark:text-[#8E867B] mb-1">
            DEPARTMENT STUDY & PRODUCTION HUB
          </p>
          <h1 className="font-editorial text-3xl sm:text-4xl font-semibold text-[#1C1917] dark:text-[#F5F2EB]">
            전공 공부 & 창작 아카이브 허브
          </h1>
          <p className="text-sm text-[#57534E] dark:text-[#B8B0A4] mt-2">
            전공 수업 노하우부터 공모전 팀빌딩, 포트폴리오 크리틱, 교내 기자재·소프트웨어 가이드까지 한곳에서 탐색하세요.
          </p>
        </div>

        <button
          type="button"
          onClick={handlePrimaryAction}
          className="px-4 py-2.5 bg-[#1C1917] dark:bg-[#F5F2EB] text-[#FBF9F5] dark:text-[#121110] text-xs font-medium rounded-lg hover:bg-[#1E3A8A] dark:hover:bg-[#93B4FF] transition-colors inline-flex items-center gap-2 whitespace-nowrap shrink-0 cursor-pointer self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>{actionLabels[subTab]}</span>
        </button>
      </div>

      {/* Sub-navigation & Search */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-1 p-1 bg-[#F2EDE4] dark:bg-[#1B1917] border border-transparent dark:border-[#322E29] rounded-lg">
          {SUB_TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => onSelectSubTab(t.id)}
              className={`px-3.5 py-2 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                subTab === t.id
                  ? 'bg-white dark:bg-[#221F1C] text-[#1C1917] dark:text-[#F5F2EB] shadow-sm'
                  : 'text-[#57534E] dark:text-[#B8B0A4] hover:text-[#1C1917] dark:hover:text-[#F5F2EB]'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="relative w-full lg:w-72">
          <Search className="w-4 h-4 text-[#78716C] dark:text-[#8E867B] absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="과목, 포지션, 툴, 장비명 검색"
            className="w-full pl-9 pr-3 py-2 text-xs bg-white dark:bg-[#221F1C] text-[#1C1917] dark:text-[#F5F2EB] placeholder:text-[#78716C] dark:placeholder:text-[#8E867B] border border-[#E5DEC9] dark:border-[#322E29] rounded-lg focus:outline-none focus:border-[#1E3A8A] dark:focus:border-[#93B4FF]"
          />
        </div>
      </div>

      {/* 1. Study Tips Tab */}
      {subTab === 'study' && (
        <div className="space-y-5">
          <div className="flex flex-wrap items-center gap-2">
            {(['전체', '강의팁', '과제노하우', '스터디모집'] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTipFilter(t)}
                className={`px-3 py-1.5 text-xs rounded-md border transition-colors cursor-pointer ${
                  tipFilter === t
                    ? 'bg-[#1C1917] dark:bg-[#F5F2EB] text-white dark:text-[#121110] border-[#1C1917] dark:border-[#F5F2EB]'
                    : 'bg-white dark:bg-[#221F1C] text-[#57534E] dark:text-[#B8B0A4] border-[#E5DEC9] dark:border-[#322E29] hover:border-[#1C1917] dark:hover:border-[#8E867B]'
                }`}
              >
                {t}
              </button>
            ))}
          </div>

          <div className="divide-y divide-[#E5DEC9] dark:divide-[#322E29] bg-white dark:bg-[#221F1C] border border-[#E5DEC9] dark:border-[#322E29] rounded-xl">
            {studyTips
              .filter((t) => (tipFilter === '전체' ? true : t.tipType === tipFilter))
              .filter(
                (t) =>
                  !q ||
                  t.title.toLowerCase().includes(q) ||
                  t.courseName.toLowerCase().includes(q) ||
                  t.content.toLowerCase().includes(q)
              )
              .map((tip) => (
                <article
                  key={tip.id}
                  onClick={() => setSelectedTip(tip)}
                  className="p-6 hover:bg-[#F2EDE4]/35 dark:hover:bg-[#1B1917]/60 transition-colors cursor-pointer space-y-2"
                >
                  <div className="flex flex-wrap items-center gap-2 text-xs text-[#57534E] dark:text-[#B8B0A4]">
                    <span className="font-semibold text-[#1E3A8A] dark:text-[#93B4FF]">
                      {tip.tipType}
                    </span>
                    <span aria-hidden="true">·</span>
                    <span className="font-medium text-[#1C1917] dark:text-[#F5F2EB]">
                      {tip.courseName}
                    </span>
                    <span aria-hidden="true">·</span>
                    <span>{tip.authorName}</span>
                    {tip.authorTrack && (
                      <>
                        <span aria-hidden="true">·</span>
                        <span>{tip.authorTrack}</span>
                      </>
                    )}
                  </div>
                  <h3 className="font-editorial text-xl font-semibold text-[#1C1917] dark:text-[#F5F2EB]">
                    {tip.title}
                  </h3>
                  <p className="text-sm text-[#57534E] dark:text-[#B8B0A4] line-clamp-2 leading-relaxed">
                    {tip.content}
                  </p>
                </article>
              ))}
          </div>
        </div>
      )}

      {/* 2. Team Matching Tab */}
      {subTab === 'team' && (
        <div className="space-y-5">
          <div className="flex flex-wrap items-center gap-2">
            {(['전체', '모집중', '마감'] as const).map((st) => (
              <button
                key={st}
                type="button"
                onClick={() => setTeamFilter(st)}
                className={`px-3 py-1.5 text-xs rounded-md border transition-colors cursor-pointer ${
                  teamFilter === st
                    ? 'bg-[#1C1917] dark:bg-[#F5F2EB] text-white dark:text-[#121110] border-[#1C1917] dark:border-[#F5F2EB]'
                    : 'bg-white dark:bg-[#221F1C] text-[#57534E] dark:text-[#B8B0A4] border-[#E5DEC9] dark:border-[#322E29] hover:border-[#1C1917] dark:hover:border-[#8E867B]'
                }`}
              >
                {st}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {teamRecruits
              .filter((r) => (teamFilter === '전체' ? true : r.status === teamFilter))
              .filter(
                (r) =>
                  !q ||
                  r.projectTitle.toLowerCase().includes(q) ||
                  r.contestName.toLowerCase().includes(q) ||
                  r.neededRoles.join(' ').toLowerCase().includes(q)
              )
              .map((team) => (
                <article
                  key={team.id}
                  onClick={() => setSelectedTeam(team)}
                  className="bg-white dark:bg-[#221F1C] border border-[#E5DEC9] dark:border-[#322E29] rounded-xl p-6 hover:border-[#1C1917]/40 dark:hover:border-[#8E867B] transition-colors cursor-pointer flex flex-col justify-between space-y-4"
                >
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between gap-2 text-xs text-[#57534E] dark:text-[#B8B0A4]">
                      <span
                        className={`font-semibold ${
                          team.status === '모집중'
                            ? 'text-[#1E3A8A] dark:text-[#93B4FF]'
                            : 'text-[#78716C] dark:text-[#8E867B]'
                        }`}
                      >
                        {team.status}
                      </span>
                      <span className="font-mono-tabular">
                        인원 {team.currentMembers}/{team.targetMembers}명
                      </span>
                    </div>
                    <p className="text-xs text-[#B45309] dark:text-[#FBBF24] font-medium">
                      {team.contestName}
                    </p>
                    <h3 className="font-editorial text-xl font-semibold text-[#1C1917] dark:text-[#F5F2EB] leading-snug">
                      {team.projectTitle}
                    </h3>
                    <p className="text-xs text-[#1C1917] dark:text-[#F5F2EB] font-medium">
                      모집 포지션 · {team.neededRoles.join(' / ')}
                    </p>
                    <p className="text-sm text-[#57534E] dark:text-[#B8B0A4] line-clamp-2 leading-relaxed">
                      {team.description}
                    </p>
                  </div>
                  <div className="pt-3 border-t border-[#E5DEC9]/70 dark:border-[#322E29] flex items-center justify-between text-xs text-[#78716C] dark:text-[#8E867B]">
                    <span>팀장: {team.authorName}</span>
                    <span>지원 댓글 소통</span>
                  </div>
                </article>
              ))}
          </div>
        </div>
      )}

      {/* 3. Portfolio Feedback Gallery Tab */}
      {subTab === 'portfolio' && (
        <div className="space-y-5">
          <div className="flex flex-wrap items-center gap-2">
            {(['전체', '영상·영화', '모션·3D', '기획서·디자인', '사운드', '웹·인터랙티브'] as const).map(
              (tr) => (
                <button
                  key={tr}
                  type="button"
                  onClick={() => setTrackFilter(tr)}
                  className={`px-3 py-1.5 text-xs rounded-md border transition-colors cursor-pointer ${
                    trackFilter === tr
                      ? 'bg-[#1C1917] dark:bg-[#F5F2EB] text-white dark:text-[#121110] border-[#1C1917] dark:border-[#F5F2EB]'
                      : 'bg-white dark:bg-[#221F1C] text-[#57534E] dark:text-[#B8B0A4] border-[#E5DEC9] dark:border-[#322E29] hover:border-[#1C1917] dark:hover:border-[#8E867B]'
                  }`}
                >
                  {tr}
                </button>
              )
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {portfolios
              .filter((w) => (trackFilter === '전체' ? true : w.track === trackFilter))
              .filter(
                (w) =>
                  !q ||
                  w.title.toLowerCase().includes(q) ||
                  w.toolsUsed.toLowerCase().includes(q) ||
                  w.authorName.toLowerCase().includes(q)
              )
              .map((work) => (
                <article
                  key={work.id}
                  onClick={() => onSelectPortfolio(work)}
                  className="bg-white dark:bg-[#221F1C] border border-[#E5DEC9] dark:border-[#322E29] rounded-xl overflow-hidden hover:border-[#1C1917]/40 dark:hover:border-[#8E867B] transition-colors cursor-pointer flex flex-col"
                >
                  <div className="aspect-[4/3] bg-[#F2EDE4] dark:bg-[#1B1917] overflow-hidden">
                    <EditorialImage
                      src={work.imageUrl}
                      alt={work.title}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="p-5 flex-1 flex flex-col justify-between space-y-3">
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2 text-xs text-[#57534E] dark:text-[#B8B0A4]">
                        <span className="font-semibold text-[#1E3A8A] dark:text-[#93B4FF]">
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
                    <p className="text-xs text-[#57534E] dark:text-[#B8B0A4] line-clamp-2">
                      {work.description}
                    </p>
                  </div>
                </article>
              ))}
          </div>
        </div>
      )}

      {/* 4. Equipment & Software Wiki Tab */}
      {subTab === 'wiki' && (
        <div className="space-y-5">
          <div className="flex flex-wrap items-center gap-2">
            {(['전체', '교내장비', '소프트웨어'] as const).map((gt) => (
              <button
                key={gt}
                type="button"
                onClick={() => setWikiFilter(gt)}
                className={`px-3 py-1.5 text-xs rounded-md border transition-colors cursor-pointer ${
                  wikiFilter === gt
                    ? 'bg-[#1C1917] dark:bg-[#F5F2EB] text-white dark:text-[#121110] border-[#1C1917] dark:border-[#F5F2EB]'
                    : 'bg-white dark:bg-[#221F1C] text-[#57534E] dark:text-[#B8B0A4] border-[#E5DEC9] dark:border-[#322E29] hover:border-[#1C1917] dark:hover:border-[#8E867B]'
                }`}
              >
                {gt}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {equipGuides
              .filter((g) => (wikiFilter === '전체' ? true : g.guideType === wikiFilter))
              .filter(
                (g) =>
                  !q ||
                  g.itemName.toLowerCase().includes(q) ||
                  g.summary.toLowerCase().includes(q) ||
                  g.locationOrShortcut.toLowerCase().includes(q)
              )
              .map((guide) => (
                <article
                  key={guide.id}
                  onClick={() => setSelectedGuide(guide)}
                  className="bg-white dark:bg-[#221F1C] border border-[#E5DEC9] dark:border-[#322E29] rounded-xl p-6 hover:border-[#1C1917]/40 dark:hover:border-[#8E867B] transition-colors cursor-pointer space-y-2.5"
                >
                  <div className="flex items-center justify-between gap-2 text-xs text-[#57534E] dark:text-[#B8B0A4]">
                    <span className="font-semibold text-[#1E3A8A] dark:text-[#93B4FF]">
                      {guide.guideType}
                    </span>
                    <span>작성: {guide.authorName}</span>
                  </div>
                  <h3 className="font-editorial text-xl font-semibold text-[#1C1917] dark:text-[#F5F2EB]">
                    {guide.itemName}
                  </h3>
                  <p className="text-xs font-mono-tabular text-[#B45309] dark:text-[#FBBF24]">
                    {guide.locationOrShortcut}
                  </p>
                  <p className="text-sm text-[#57534E] dark:text-[#B8B0A4] line-clamp-2 leading-relaxed">
                    {guide.summary}
                  </p>
                </article>
              ))}
          </div>
        </div>
      )}

      {/* Detail Modals */}
      {selectedTip && (
        <div
          className="fixed inset-0 z-50 bg-[#1C1917]/50 dark:bg-black/70 backdrop-blur-[2px] flex items-center justify-center p-4"
          onClick={() => setSelectedTip(null)}
        >
          <div
            className="bg-[#FBF9F5] dark:bg-[#1B1917] border border-[#E5DEC9] dark:border-[#322E29] rounded-xl max-w-2xl w-full max-h-[85vh] overflow-y-auto p-6 sm:p-8 space-y-5 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4 border-b border-[#E5DEC9] dark:border-[#322E29] pb-4">
              <div className="space-y-1.5">
                <p className="text-xs text-[#57534E] dark:text-[#B8B0A4]">
                  <span className="font-semibold text-[#1E3A8A] dark:text-[#93B4FF]">
                    {selectedTip.tipType}
                  </span>{' '}
                  · {selectedTip.courseName} · {selectedTip.authorName} ·{' '}
                  {formatKoreanDate(selectedTip.createdAt)}
                </p>
                <h2 className="font-editorial text-2xl font-semibold text-[#1C1917] dark:text-[#F5F2EB]">
                  {selectedTip.title}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setSelectedTip(null)}
                className="p-2 text-[#57534E] dark:text-[#B8B0A4] hover:text-[#1C1917] dark:hover:text-[#F5F2EB] cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-sm text-[#1C1917] dark:text-[#F5F2EB] leading-relaxed whitespace-pre-line">
              {selectedTip.content}
            </p>
            {isLiveCollection && (currentUid === selectedTip.authorId || isAdmin) && (
              <div className="flex justify-end gap-3 pt-4 border-t border-[#E5DEC9] dark:border-[#322E29]">
                <button
                  type="button"
                  onClick={() => openEditTip(selectedTip)}
                  className="text-xs text-[#57534E] dark:text-[#B8B0A4] hover:text-[#1C1917] dark:hover:text-[#F5F2EB] inline-flex items-center gap-1 cursor-pointer"
                >
                  <Pencil className="w-3.5 h-3.5" />
                  <span>수정</span>
                </button>
                <button
                  type="button"
                  onClick={() => deleteTip(selectedTip)}
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

      {selectedTeam && (
        <div
          className="fixed inset-0 z-50 bg-[#1C1917]/50 dark:bg-black/70 backdrop-blur-[2px] flex items-center justify-center p-4"
          onClick={() => setSelectedTeam(null)}
        >
          <div
            className="bg-[#FBF9F5] dark:bg-[#1B1917] border border-[#E5DEC9] dark:border-[#322E29] rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 sm:p-8 space-y-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4 border-b border-[#E5DEC9] dark:border-[#322E29] pb-4">
              <div className="space-y-1.5">
                <div className="flex items-center gap-2 text-xs text-[#57534E] dark:text-[#B8B0A4]">
                  <span className="font-semibold text-[#1E3A8A] dark:text-[#93B4FF]">
                    {selectedTeam.status}
                  </span>
                  <span aria-hidden="true">·</span>
                  <span className="font-mono-tabular">
                    {selectedTeam.currentMembers}/{selectedTeam.targetMembers}명
                  </span>
                  <span aria-hidden="true">·</span>
                  <span>팀장 {selectedTeam.authorName}</span>
                </div>
                <p className="text-xs font-medium text-[#B45309] dark:text-[#FBBF24]">
                  {selectedTeam.contestName}
                </p>
                <h2 className="font-editorial text-2xl font-semibold text-[#1C1917] dark:text-[#F5F2EB]">
                  {selectedTeam.projectTitle}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setSelectedTeam(null)}
                className="p-2 text-[#57534E] dark:text-[#B8B0A4] hover:text-[#1C1917] dark:hover:text-[#F5F2EB] cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              <p className="text-xs font-semibold text-[#1C1917] dark:text-[#F5F2EB]">
                구하는 포지션: {selectedTeam.neededRoles.join(' · ')}
              </p>
              <p className="text-sm text-[#57534E] dark:text-[#B8B0A4] leading-relaxed whitespace-pre-line">
                {selectedTeam.description}
              </p>
              <p className="text-xs text-[#78716C] dark:text-[#B8B0A4] bg-[#F2EDE4] dark:bg-[#221F1C] border border-transparent dark:border-[#322E29] px-3.5 py-2.5 rounded-lg">
                지원 및 연락 안내: {selectedTeam.contactNote}
              </p>
            </div>

            {isLiveCollection && (currentUid === selectedTeam.authorId || isAdmin) && (
              <div className="flex items-center justify-between pt-2">
                {selectedTeam.status === '마감' && !isAdmin ? (
                  <span className="text-xs text-[#78716C] dark:text-[#8E867B] inline-flex items-center gap-1">
                    <Lock className="w-3.5 h-3.5" />
                    <span>마감된 팀빌딩 공고는 수정이 잠금 처리됩니다.</span>
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={() => openEditTeam(selectedTeam)}
                    className="text-xs text-[#57534E] dark:text-[#B8B0A4] hover:text-[#1C1917] dark:hover:text-[#F5F2EB] inline-flex items-center gap-1 cursor-pointer"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                    <span>모집 정보 수정 / 마감 전환</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => deleteTeam(selectedTeam)}
                  className="text-xs text-[#9A3412] dark:text-[#FB923C] hover:underline inline-flex items-center gap-1 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>삭제</span>
                </button>
              </div>
            )}

            <CommentSection
              parentCollection="teamRecruits"
              parentId={selectedTeam.id}
              isLiveDocument={isLiveCollection}
              currentUid={currentUid}
              memberProfile={memberProfile}
              isAdmin={isAdmin}
              reportedKeys={reportedKeys}
              onRequireAuth={onRequireAuth}
              onNotify={onNotify}
              placeholder="지원 희망 포지션과 사용 가능한 툴을 댓글로 남겨주세요."
            />
          </div>
        </div>
      )}

      {/* Portfolio Lightbox Modal */}
      {selectedPortfolio && (
        <div
          className="fixed inset-0 z-50 bg-[#1C1917]/65 dark:bg-black/80 backdrop-blur-[2px] flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          onClick={() => onSelectPortfolio(null)}
        >
          <div
            className="bg-[#FBF9F5] dark:bg-[#1B1917] border border-[#E5DEC9] dark:border-[#322E29] rounded-xl max-w-3xl w-full max-h-[92vh] overflow-y-auto shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="aspect-[16/10] bg-[#1C1917] relative">
              <EditorialImage
                src={selectedPortfolio.imageUrl}
                alt={selectedPortfolio.title}
                className="w-full h-full object-cover"
              />
              <button
                type="button"
                onClick={() => onSelectPortfolio(null)}
                className="absolute top-4 right-4 p-2 bg-[#FBF9F5]/95 dark:bg-[#1B1917]/95 border border-[#E5DEC9] dark:border-[#322E29] rounded-lg text-[#1C1917] dark:text-[#F5F2EB] hover:bg-white dark:hover:bg-[#221F1C] cursor-pointer"
                aria-label="라이트박스 닫기"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 sm:p-8 space-y-6">
              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-2 text-xs text-[#57534E] dark:text-[#B8B0A4]">
                  <span className="font-semibold text-[#1E3A8A] dark:text-[#93B4FF]">
                    {selectedPortfolio.track}
                  </span>
                  <span aria-hidden="true">·</span>
                  <span>{selectedPortfolio.authorName}</span>
                  {selectedPortfolio.authorGrade && (
                    <>
                      <span aria-hidden="true">·</span>
                      <span>{selectedPortfolio.authorGrade}</span>
                    </>
                  )}
                  <span aria-hidden="true">·</span>
                  <span>{selectedPortfolio.toolsUsed}</span>
                </div>
                <h2 className="font-editorial text-2xl sm:text-3xl font-semibold text-[#1C1917] dark:text-[#F5F2EB]">
                  {selectedPortfolio.title}
                </h2>
              </div>

              <p className="text-sm text-[#57534E] dark:text-[#B8B0A4] leading-relaxed whitespace-pre-line">
                {selectedPortfolio.description}
              </p>

              <div className="flex flex-wrap items-center justify-between gap-3">
                {selectedPortfolio.mediaLink && (
                  <a
                    href={selectedPortfolio.mediaLink}
                    target="_blank"
                    rel="noreferrer"
                    className="px-4 py-2 text-xs font-medium bg-[#1C1917] dark:bg-[#F5F2EB] text-[#FBF9F5] dark:text-[#121110] rounded-lg hover:bg-[#1E3A8A] dark:hover:bg-[#93B4FF] inline-flex items-center gap-1.5 transition-colors"
                  >
                    <span>원본 영상·포트폴리오 링크</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                )}

                {isLiveCollection && (currentUid === selectedPortfolio.authorId || isAdmin) && (
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => openEditWork(selectedPortfolio)}
                      className="text-xs text-[#57534E] dark:text-[#B8B0A4] hover:text-[#1C1917] dark:hover:text-[#F5F2EB] inline-flex items-center gap-1 cursor-pointer"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                      <span>수정</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => deleteWork(selectedPortfolio)}
                      className="text-xs text-[#9A3412] dark:text-[#FB923C] hover:underline inline-flex items-center gap-1 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>삭제</span>
                    </button>
                  </div>
                )}
              </div>

              <CommentSection
                parentCollection="portfolioWorks"
                parentId={selectedPortfolio.id}
                isLiveDocument={isLiveCollection}
                currentUid={currentUid}
                memberProfile={memberProfile}
                isAdmin={isAdmin}
                reportedKeys={reportedKeys}
                onRequireAuth={onRequireAuth}
                onNotify={onNotify}
                placeholder="연출, 색보정, 구도, 사운드 등 작품에 대한 건설적인 피드백을 남겨주세요."
              />
            </div>
          </div>
        </div>
      )}

      {/* Equip Guide Detail Modal */}
      {selectedGuide && (
        <div
          className="fixed inset-0 z-50 bg-[#1C1917]/50 dark:bg-black/70 backdrop-blur-[2px] flex items-center justify-center p-4"
          onClick={() => setSelectedGuide(null)}
        >
          <div
            className="bg-[#FBF9F5] dark:bg-[#1B1917] border border-[#E5DEC9] dark:border-[#322E29] rounded-xl max-w-2xl w-full max-h-[85vh] overflow-y-auto p-6 sm:p-8 space-y-5 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4 border-b border-[#E5DEC9] dark:border-[#322E29] pb-4">
              <div className="space-y-1.5">
                <p className="text-xs text-[#57534E] dark:text-[#B8B0A4]">
                  <span className="font-semibold text-[#1E3A8A] dark:text-[#93B4FF]">
                    {selectedGuide.guideType}
                  </span>{' '}
                  · 작성 {selectedGuide.authorName}
                </p>
                <h2 className="font-editorial text-2xl font-semibold text-[#1C1917] dark:text-[#F5F2EB]">
                  {selectedGuide.itemName}
                </h2>
                <p className="text-xs font-mono-tabular text-[#B45309] dark:text-[#FBBF24]">
                  {selectedGuide.locationOrShortcut}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedGuide(null)}
                className="p-2 text-[#57534E] dark:text-[#B8B0A4] hover:text-[#1C1917] dark:hover:text-[#F5F2EB] cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-sm font-medium text-[#1C1917] dark:text-[#F5F2EB]">
              {selectedGuide.summary}
            </p>
            <div className="bg-white dark:bg-[#221F1C] border border-[#E5DEC9] dark:border-[#322E29] rounded-lg p-5 text-sm text-[#1C1917] dark:text-[#F5F2EB] leading-relaxed whitespace-pre-line">
              {selectedGuide.guideBody}
            </div>
            {isLiveCollection && (currentUid === selectedGuide.authorId || isAdmin) && (
              <div className="flex justify-end gap-3 pt-3 border-t border-[#E5DEC9] dark:border-[#322E29]">
                <button
                  type="button"
                  onClick={() => openEditGuide(selectedGuide)}
                  className="text-xs text-[#57534E] dark:text-[#B8B0A4] hover:text-[#1C1917] dark:hover:text-[#F5F2EB] inline-flex items-center gap-1 cursor-pointer"
                >
                  <Pencil className="w-3.5 h-3.5" />
                  <span>위키 수정</span>
                </button>
                <button
                  type="button"
                  onClick={() => deleteGuide(selectedGuide)}
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

      {/* Create/Edit Modals for 4 Sub-modules */}
      {tipModalOpen && (
        <div className="fixed inset-0 z-50 bg-[#1C1917]/50 dark:bg-black/70 backdrop-blur-[2px] flex items-center justify-center p-4">
          <div className="bg-[#FBF9F5] dark:bg-[#1B1917] border border-[#E5DEC9] dark:border-[#322E29] rounded-xl max-w-lg w-full p-6 sm:p-8 shadow-xl">
            <div className="flex items-center justify-between pb-4 border-b border-[#E5DEC9] dark:border-[#322E29]">
              <h2 className="font-editorial text-xl font-semibold text-[#1C1917] dark:text-[#F5F2EB]">
                {editingTip ? '전공 팁 수정' : '강의·과제 팁 / 스터디 작성'}
              </h2>
              <button
                type="button"
                onClick={() => setTipModalOpen(false)}
                className="p-1.5 text-[#57534E] dark:text-[#B8B0A4] hover:text-[#1C1917] dark:hover:text-[#F5F2EB] cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={saveTip} className="pt-4 space-y-3.5">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-[#1C1917] dark:text-[#F5F2EB] mb-1">
                    유형 *
                  </label>
                  <select
                    value={tipType}
                    onChange={(e) => setTipType(e.target.value as StudyTipType)}
                    className="w-full px-3 py-2 text-sm bg-white dark:bg-[#121110] text-[#1C1917] dark:text-[#F5F2EB] border border-[#E5DEC9] dark:border-[#322E29] rounded-lg focus:outline-none focus:border-[#1E3A8A] dark:focus:border-[#93B4FF]"
                  >
                    <option value="과제노하우">과제노하우</option>
                    <option value="강의팁">강의팁</option>
                    <option value="스터디모집">스터디모집</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#1C1917] dark:text-[#F5F2EB] mb-1">
                    과목명 / 주제 *
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={FIELD_LIMITS.COURSE_NAME_MAX}
                    value={courseName}
                    onChange={(e) => setCourseName(e.target.value)}
                    placeholder="예: 영상편집실습"
                    className="w-full px-3 py-2 text-sm bg-white dark:bg-[#121110] text-[#1C1917] dark:text-[#F5F2EB] placeholder:text-[#78716C] dark:placeholder:text-[#8E867B] border border-[#E5DEC9] dark:border-[#322E29] rounded-lg focus:outline-none focus:border-[#1E3A8A] dark:focus:border-[#93B4FF]"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-[#1C1917] dark:text-[#F5F2EB] mb-1">
                  제목 *
                </label>
                <input
                  type="text"
                  required
                  maxLength={FIELD_LIMITS.POST_TITLE_MAX}
                  value={tipTitle}
                  onChange={(e) => setTipTitle(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-white dark:bg-[#121110] text-[#1C1917] dark:text-[#F5F2EB] border border-[#E5DEC9] dark:border-[#322E29] rounded-lg focus:outline-none focus:border-[#1E3A8A] dark:focus:border-[#93B4FF]"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-[#1C1917] dark:text-[#F5F2EB] mb-1">
                  내용 *
                </label>
                <textarea
                  rows={5}
                  required
                  maxLength={FIELD_LIMITS.DESCRIPTION_MAX}
                  value={tipContent}
                  onChange={(e) => setTipContent(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-white dark:bg-[#121110] text-[#1C1917] dark:text-[#F5F2EB] border border-[#E5DEC9] dark:border-[#322E29] rounded-lg focus:outline-none focus:border-[#1E3A8A] dark:focus:border-[#93B4FF]"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setTipModalOpen(false)}
                  className="px-4 py-2 text-xs border border-[#E5DEC9] dark:border-[#322E29] text-[#57534E] dark:text-[#B8B0A4] rounded-lg hover:text-[#1C1917] dark:hover:text-[#F5F2EB] cursor-pointer"
                >
                  취소
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 text-xs bg-[#1C1917] dark:bg-[#F5F2EB] text-white dark:text-[#121110] font-medium rounded-lg hover:bg-[#1E3A8A] dark:hover:bg-[#93B4FF] cursor-pointer disabled:opacity-50"
                >
                  {saving ? '저장 중...' : '저장하기'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {teamModalOpen && (
        <div className="fixed inset-0 z-50 bg-[#1C1917]/50 dark:bg-black/70 backdrop-blur-[2px] flex items-center justify-center p-4">
          <div className="bg-[#FBF9F5] dark:bg-[#1B1917] border border-[#E5DEC9] dark:border-[#322E29] rounded-xl max-w-lg w-full max-h-[90vh] overflow-y-auto p-6 sm:p-8 shadow-xl">
            <div className="flex items-center justify-between pb-4 border-b border-[#E5DEC9] dark:border-[#322E29]">
              <h2 className="font-editorial text-xl font-semibold text-[#1C1917] dark:text-[#F5F2EB]">
                {editingTeam ? '팀원 매칭 수정' : '공모전 팀원 모집 글 작성'}
              </h2>
              <button
                type="button"
                onClick={() => setTeamModalOpen(false)}
                className="p-1.5 text-[#57534E] dark:text-[#B8B0A4] hover:text-[#1C1917] dark:hover:text-[#F5F2EB] cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={saveTeam} className="pt-4 space-y-3.5">
              <div>
                <label className="block text-xs font-medium text-[#1C1917] dark:text-[#F5F2EB] mb-1">
                  프로젝트 / 팀명 *
                </label>
                <input
                  type="text"
                  required
                  maxLength={FIELD_LIMITS.POST_TITLE_MAX}
                  value={projectTitle}
                  onChange={(e) => setProjectTitle(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-white dark:bg-[#121110] text-[#1C1917] dark:text-[#F5F2EB] border border-[#E5DEC9] dark:border-[#322E29] rounded-lg focus:outline-none focus:border-[#1E3A8A] dark:focus:border-[#93B4FF]"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-[#1C1917] dark:text-[#F5F2EB] mb-1">
                  목표 공모전 / 활동명 *
                </label>
                <input
                  type="text"
                  required
                  maxLength={FIELD_LIMITS.POST_TITLE_MAX}
                  value={contestName}
                  onChange={(e) => setContestName(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-white dark:bg-[#121110] text-[#1C1917] dark:text-[#F5F2EB] border border-[#E5DEC9] dark:border-[#322E29] rounded-lg focus:outline-none focus:border-[#1E3A8A] dark:focus:border-[#93B4FF]"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-[#1C1917] dark:text-[#F5F2EB] mb-1">
                  구하는 포지션 (쉼표로 구분, 최대 6개) *
                </label>
                <input
                  type="text"
                  required
                  value={rolesInput}
                  onChange={(e) => setRolesInput(e.target.value)}
                  placeholder="예: 촬영, 사운드믹싱, 모션그래픽"
                  className="w-full px-3 py-2 text-sm bg-white dark:bg-[#121110] text-[#1C1917] dark:text-[#F5F2EB] placeholder:text-[#78716C] dark:placeholder:text-[#8E867B] border border-[#E5DEC9] dark:border-[#322E29] rounded-lg focus:outline-none focus:border-[#1E3A8A] dark:focus:border-[#93B4FF]"
                />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium text-[#1C1917] dark:text-[#F5F2EB] mb-1">
                    현재 인원
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={20}
                    value={currentMembers}
                    onChange={(e) => setCurrentMembers(Number(e.target.value))}
                    className="w-full px-3 py-2 text-sm bg-white dark:bg-[#121110] text-[#1C1917] dark:text-[#F5F2EB] border border-[#E5DEC9] dark:border-[#322E29] rounded-lg focus:outline-none focus:border-[#1E3A8A] dark:focus:border-[#93B4FF]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#1C1917] dark:text-[#F5F2EB] mb-1">
                    목표 인원
                  </label>
                  <input
                    type="number"
                    min={2}
                    max={20}
                    value={targetMembers}
                    onChange={(e) => setTargetMembers(Number(e.target.value))}
                    className="w-full px-3 py-2 text-sm bg-white dark:bg-[#121110] text-[#1C1917] dark:text-[#F5F2EB] border border-[#E5DEC9] dark:border-[#322E29] rounded-lg focus:outline-none focus:border-[#1E3A8A] dark:focus:border-[#93B4FF]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#1C1917] dark:text-[#F5F2EB] mb-1">
                    상태
                  </label>
                  <select
                    value={teamStatus}
                    onChange={(e) => setTeamStatus(e.target.value as TeamStatus)}
                    className="w-full px-3 py-2 text-sm bg-white dark:bg-[#121110] text-[#1C1917] dark:text-[#F5F2EB] border border-[#E5DEC9] dark:border-[#322E29] rounded-lg focus:outline-none focus:border-[#1E3A8A] dark:focus:border-[#93B4FF]"
                  >
                    <option value="모집중">모집중</option>
                    <option value="마감">마감</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-[#1C1917] dark:text-[#F5F2EB] mb-1">
                  기획 방향 및 소개 *
                </label>
                <textarea
                  rows={4}
                  required
                  maxLength={FIELD_LIMITS.TEAM_DESC_MAX}
                  value={teamDesc}
                  onChange={(e) => setTeamDesc(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-white dark:bg-[#121110] text-[#1C1917] dark:text-[#F5F2EB] border border-[#E5DEC9] dark:border-[#322E29] rounded-lg focus:outline-none focus:border-[#1E3A8A] dark:focus:border-[#93B4FF]"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-[#1C1917] dark:text-[#F5F2EB] mb-1">
                  지원 및 연락 방법 *
                </label>
                <input
                  type="text"
                  required
                  maxLength={FIELD_LIMITS.CONTACT_MAX}
                  value={contactNote}
                  onChange={(e) => setContactNote(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-white dark:bg-[#121110] text-[#1C1917] dark:text-[#F5F2EB] border border-[#E5DEC9] dark:border-[#322E29] rounded-lg focus:outline-none focus:border-[#1E3A8A] dark:focus:border-[#93B4FF]"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setTeamModalOpen(false)}
                  className="px-4 py-2 text-xs border border-[#E5DEC9] dark:border-[#322E29] text-[#57534E] dark:text-[#B8B0A4] rounded-lg hover:text-[#1C1917] dark:hover:text-[#F5F2EB] cursor-pointer"
                >
                  취소
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 text-xs bg-[#1C1917] dark:bg-[#F5F2EB] text-white dark:text-[#121110] font-medium rounded-lg hover:bg-[#1E3A8A] dark:hover:bg-[#93B4FF] cursor-pointer disabled:opacity-50"
                >
                  {saving ? '저장 중...' : '저장하기'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {workModalOpen && (
        <div className="fixed inset-0 z-50 bg-[#1C1917]/50 dark:bg-black/70 backdrop-blur-[2px] flex items-center justify-center p-4">
          <div className="bg-[#FBF9F5] dark:bg-[#1B1917] border border-[#E5DEC9] dark:border-[#322E29] rounded-xl max-w-lg w-full max-h-[90vh] overflow-y-auto p-6 sm:p-8 shadow-xl">
            <div className="flex items-center justify-between pb-4 border-b border-[#E5DEC9] dark:border-[#322E29]">
              <h2 className="font-editorial text-xl font-semibold text-[#1C1917] dark:text-[#F5F2EB]">
                {editingWork ? '포트폴리오 수정' : '포트폴리오 작업물 등록'}
              </h2>
              <button
                type="button"
                onClick={() => setWorkModalOpen(false)}
                className="p-1.5 text-[#57534E] dark:text-[#B8B0A4] hover:text-[#1C1917] dark:hover:text-[#F5F2EB] cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={saveWork} className="pt-4 space-y-3.5">
              <div>
                <label className="block text-xs font-medium text-[#1C1917] dark:text-[#F5F2EB] mb-1">
                  작품명 *
                </label>
                <input
                  type="text"
                  required
                  maxLength={FIELD_LIMITS.PORTFOLIO_TITLE_MAX}
                  value={workTitle}
                  onChange={(e) => setWorkTitle(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-white dark:bg-[#121110] text-[#1C1917] dark:text-[#F5F2EB] border border-[#E5DEC9] dark:border-[#322E29] rounded-lg focus:outline-none focus:border-[#1E3A8A] dark:focus:border-[#93B4FF]"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-[#1C1917] dark:text-[#F5F2EB] mb-1">
                    분야 *
                  </label>
                  <select
                    value={workTrack}
                    onChange={(e) => setWorkTrack(e.target.value as PortfolioTrack)}
                    className="w-full px-3 py-2 text-sm bg-white dark:bg-[#121110] text-[#1C1917] dark:text-[#F5F2EB] border border-[#E5DEC9] dark:border-[#322E29] rounded-lg focus:outline-none focus:border-[#1E3A8A] dark:focus:border-[#93B4FF]"
                  >
                    <option value="영상·영화">영상·영화</option>
                    <option value="모션·3D">모션·3D</option>
                    <option value="기획서·디자인">기획서·디자인</option>
                    <option value="사운드">사운드</option>
                    <option value="웹·인터랙티브">웹·인터랙티브</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#1C1917] dark:text-[#F5F2EB] mb-1">
                    사용 툴 / 장비 *
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={FIELD_LIMITS.TOOLS_USED_MAX}
                    value={toolsUsed}
                    onChange={(e) => setToolsUsed(e.target.value)}
                    placeholder="예: Premiere · DaVinci"
                    className="w-full px-3 py-2 text-sm bg-white dark:bg-[#121110] text-[#1C1917] dark:text-[#F5F2EB] placeholder:text-[#78716C] dark:placeholder:text-[#8E867B] border border-[#E5DEC9] dark:border-[#322E29] rounded-lg focus:outline-none focus:border-[#1E3A8A] dark:focus:border-[#93B4FF]"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-[#1C1917] dark:text-[#F5F2EB] mb-1">
                  스틸 이미지 프리셋
                </label>
                <select
                  value={workImage}
                  onChange={(e) => setWorkImage(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-white dark:bg-[#121110] text-[#1C1917] dark:text-[#F5F2EB] border border-[#E5DEC9] dark:border-[#322E29] rounded-lg focus:outline-none focus:border-[#1E3A8A] dark:focus:border-[#93B4FF]"
                >
                  <option value={GENERATED_IMAGES.portfolioFilm}>단편영화 시네마 스틸</option>
                  <option value={GENERATED_IMAGES.portfolioSound}>사운드·오디오 믹싱 랩</option>
                  <option value={GENERATED_IMAGES.contestFilm}>타이틀 시퀀스·상영관</option>
                  <option value={GENERATED_IMAGES.heroStudio}>프로덕션 메이킹 현장</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-[#1C1917] dark:text-[#F5F2EB] mb-1">
                  영상/작품 외부 링크 (선택)
                </label>
                <input
                  type="url"
                  maxLength={FIELD_LIMITS.URL_MAX}
                  value={mediaLink}
                  onChange={(e) => setMediaLink(e.target.value)}
                  placeholder="https://vimeo.com/..."
                  className="w-full px-3 py-2 text-sm bg-white dark:bg-[#121110] text-[#1C1917] dark:text-[#F5F2EB] placeholder:text-[#78716C] dark:placeholder:text-[#8E867B] border border-[#E5DEC9] dark:border-[#322E29] rounded-lg focus:outline-none focus:border-[#1E3A8A] dark:focus:border-[#93B4FF]"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-[#1C1917] dark:text-[#F5F2EB] mb-1">
                  제작 의도 및 피드백 요청 사항 *
                </label>
                <textarea
                  rows={4}
                  required
                  maxLength={FIELD_LIMITS.PORTFOLIO_DESC_MAX}
                  value={workDesc}
                  onChange={(e) => setWorkDesc(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-white dark:bg-[#121110] text-[#1C1917] dark:text-[#F5F2EB] border border-[#E5DEC9] dark:border-[#322E29] rounded-lg focus:outline-none focus:border-[#1E3A8A] dark:focus:border-[#93B4FF]"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setWorkModalOpen(false)}
                  className="px-4 py-2 text-xs border border-[#E5DEC9] dark:border-[#322E29] text-[#57534E] dark:text-[#B8B0A4] rounded-lg hover:text-[#1C1917] dark:hover:text-[#F5F2EB] cursor-pointer"
                >
                  취소
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 text-xs bg-[#1C1917] dark:bg-[#F5F2EB] text-white dark:text-[#121110] font-medium rounded-lg hover:bg-[#1E3A8A] dark:hover:bg-[#93B4FF] cursor-pointer disabled:opacity-50"
                >
                  {saving ? '저장 중...' : '업로드'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {guideModalOpen && (
        <div className="fixed inset-0 z-50 bg-[#1C1917]/50 dark:bg-black/70 backdrop-blur-[2px] flex items-center justify-center p-4">
          <div className="bg-[#FBF9F5] dark:bg-[#1B1917] border border-[#E5DEC9] dark:border-[#322E29] rounded-xl max-w-lg w-full max-h-[90vh] overflow-y-auto p-6 sm:p-8 shadow-xl">
            <div className="flex items-center justify-between pb-4 border-b border-[#E5DEC9] dark:border-[#322E29]">
              <h2 className="font-editorial text-xl font-semibold text-[#1C1917] dark:text-[#F5F2EB]">
                {editingGuide ? '가이드 수정' : '교내 장비·소프트웨어 위키 작성'}
              </h2>
              <button
                type="button"
                onClick={() => setGuideModalOpen(false)}
                className="p-1.5 text-[#57534E] dark:text-[#B8B0A4] hover:text-[#1C1917] dark:hover:text-[#F5F2EB] cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={saveGuide} className="pt-4 space-y-3.5">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-[#1C1917] dark:text-[#F5F2EB] mb-1">
                    분류 *
                  </label>
                  <select
                    value={guideType}
                    onChange={(e) => setGuideType(e.target.value as EquipGuideType)}
                    className="w-full px-3 py-2 text-sm bg-white dark:bg-[#121110] text-[#1C1917] dark:text-[#F5F2EB] border border-[#E5DEC9] dark:border-[#322E29] rounded-lg focus:outline-none focus:border-[#1E3A8A] dark:focus:border-[#93B4FF]"
                  >
                    <option value="교내장비">교내장비</option>
                    <option value="소프트웨어">소프트웨어</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#1C1917] dark:text-[#F5F2EB] mb-1">
                    장비 / 툴 이름 *
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={FIELD_LIMITS.GUIDE_ITEM_MAX}
                    value={itemName}
                    onChange={(e) => setItemName(e.target.value)}
                    className="w-full px-3 py-2 text-sm bg-white dark:bg-[#121110] text-[#1C1917] dark:text-[#F5F2EB] border border-[#E5DEC9] dark:border-[#322E29] rounded-lg focus:outline-none focus:border-[#1E3A8A] dark:focus:border-[#93B4FF]"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-[#1C1917] dark:text-[#F5F2EB] mb-1">
                  대여 위치 또는 핵심 단축키 *
                </label>
                <input
                  type="text"
                  required
                  maxLength={FIELD_LIMITS.GUIDE_LOC_MAX}
                  value={locationOrShortcut}
                  onChange={(e) => setLocationOrShortcut(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-white dark:bg-[#121110] text-[#1C1917] dark:text-[#F5F2EB] border border-[#E5DEC9] dark:border-[#322E29] rounded-lg focus:outline-none focus:border-[#1E3A8A] dark:focus:border-[#93B4FF]"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-[#1C1917] dark:text-[#F5F2EB] mb-1">
                  한 줄 요약 *
                </label>
                <input
                  type="text"
                  required
                  maxLength={FIELD_LIMITS.SUMMARY_MAX}
                  value={guideSummary}
                  onChange={(e) => setGuideSummary(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-white dark:bg-[#121110] text-[#1C1917] dark:text-[#F5F2EB] border border-[#E5DEC9] dark:border-[#322E29] rounded-lg focus:outline-none focus:border-[#1E3A8A] dark:focus:border-[#93B4FF]"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-[#1C1917] dark:text-[#F5F2EB] mb-1">
                  상세 매뉴얼 및 팁 *
                </label>
                <textarea
                  rows={5}
                  required
                  maxLength={FIELD_LIMITS.GUIDE_BODY_MAX}
                  value={guideBody}
                  onChange={(e) => setGuideBody(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-white dark:bg-[#121110] text-[#1C1917] dark:text-[#F5F2EB] border border-[#E5DEC9] dark:border-[#322E29] rounded-lg focus:outline-none focus:border-[#1E3A8A] dark:focus:border-[#93B4FF]"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setGuideModalOpen(false)}
                  className="px-4 py-2 text-xs border border-[#E5DEC9] dark:border-[#322E29] text-[#57534E] dark:text-[#B8B0A4] rounded-lg hover:text-[#1C1917] dark:hover:text-[#F5F2EB] cursor-pointer"
                >
                  취소
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 text-xs bg-[#1C1917] dark:bg-[#F5F2EB] text-white dark:text-[#121110] font-medium rounded-lg hover:bg-[#1E3A8A] dark:hover:bg-[#93B4FF] cursor-pointer disabled:opacity-50"
                >
                  {saving ? '저장 중...' : '위키 저장'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
