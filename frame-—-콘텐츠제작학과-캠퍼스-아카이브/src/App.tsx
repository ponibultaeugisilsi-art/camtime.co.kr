import { User as FirebaseUser, onAuthStateChanged } from 'firebase/auth';
import { collection, doc, onSnapshot, query, where } from 'firebase/firestore';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { AuthModal } from './components/AuthModal';
import { ClubsView } from './components/ClubsView';
import { CommunityView } from './components/CommunityView';
import { ContestsView } from './components/ContestsView';
import { ErrorBoundary } from './components/ErrorBoundary';
import { MagazineHomeView } from './components/MagazineHomeView';
import { MajorHubView } from './components/MajorHubView';
import { MyPageView } from './components/MyPageView';
import { ScenicSearchHomeView } from './components/ScenicSearchHomeView';
import { ThemeMode, ThemeToggle } from './components/ThemeToggle';
import { TopBar } from './components/TopBar';
import {
  INITIAL_CLUBS,
  INITIAL_COMMUNITY_POSTS,
  INITIAL_CONTESTS,
  INITIAL_DEPARTMENT_NEWS,
  INITIAL_EQUIP_GUIDES,
  INITIAL_PORTFOLIOS,
  INITIAL_STUDY_TIPS,
  INITIAL_TEAM_RECRUITS,
  seedInitialCampusDataIfNeeded,
} from './data/seedData';
import { auth, db, handleFirestoreError, OperationType } from './firebase';
import { sortByNewest } from './lib/validation';
import {
  Bookmark,
  ClubPost,
  CommunityPost,
  CommunityReport,
  CommunitySubTab,
  Contest,
  DepartmentNews,
  EquipGuide,
  MainTab,
  MajorSubTab,
  MemberProfile,
  PortfolioWork,
  StudyTip,
  TeamRecruit,
  UserPrivate,
} from './types';

function getInitialTheme(): ThemeMode {
  try {
    return localStorage.getItem('camptime-theme') === 'dark' ? 'dark' : 'light';
  } catch {
    return 'light';
  }
}

function AppContent() {
  const [theme, setTheme] = useState<ThemeMode>(getInitialTheme);
  const [activeTab, setActiveTab] = useState<MainTab>('search');
  const [majorSubTab, setMajorSubTab] = useState<MajorSubTab>('study');
  const [communitySubTab, setCommunitySubTab] = useState<CommunitySubTab>('news');

  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [memberProfile, setMemberProfile] = useState<MemberProfile | null>(null);
  const [userPrivate, setUserPrivate] = useState<UserPrivate | null>(null);
  const [profileChecked, setProfileChecked] = useState(false);
  const [authModalOpen, setAuthModalOpen] = useState(false);

  const [liveContests, setLiveContests] = useState<Contest[]>([]);
  const [liveClubs, setLiveClubs] = useState<ClubPost[]>([]);
  const [liveStudyTips, setLiveStudyTips] = useState<StudyTip[]>([]);
  const [liveTeamRecruits, setLiveTeamRecruits] = useState<TeamRecruit[]>([]);
  const [livePortfolios, setLivePortfolios] = useState<PortfolioWork[]>([]);
  const [liveEquipGuides, setLiveEquipGuides] = useState<EquipGuide[]>([]);
  const [liveCommunityPosts, setLiveCommunityPosts] = useState<CommunityPost[]>([]);
  const [liveDepartmentNews, setLiveDepartmentNews] = useState<DepartmentNews[]>([]);
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const [reports, setReports] = useState<CommunityReport[]>([]);

  const [selectedContest, setSelectedContest] = useState<Contest | null>(null);
  const [selectedClub, setSelectedClub] = useState<ClubPost | null>(null);
  const [selectedPortfolio, setSelectedPortfolio] = useState<PortfolioWork | null>(null);
  const [selectedNews, setSelectedNews] = useState<DepartmentNews | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
    try {
      localStorage.setItem('camptime-theme', theme);
    } catch {
      // ignore storage errors
    }
  }, [theme]);

  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
  }, []);

  useEffect(() => {
    if (!toastMessage) return;
    const timer = setTimeout(() => setToastMessage(null), 3200);
    return () => clearTimeout(timer);
  }, [toastMessage]);

  // 1. Auth listener
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      setFirebaseUser(user);
      setAuthReady(true);
      if (!user) {
        setMemberProfile(null);
        setUserPrivate(null);
        setProfileChecked(true);
      } else {
        setProfileChecked(false);
        void seedInitialCampusDataIfNeeded(user.uid);
      }
    });
    return () => unsub();
  }, []);

  // 2. Member profile & private info listeners
  useEffect(() => {
    if (!firebaseUser) return;

    const unsubPub = onSnapshot(
      doc(db, 'memberProfiles', firebaseUser.uid),
      (snap) => {
        if (snap.exists()) {
          setMemberProfile(snap.data() as MemberProfile);
        } else {
          setMemberProfile(null);
          setAuthModalOpen(true);
        }
        setProfileChecked(true);
      },
      (err) => {
        setProfileChecked(true);
        handleFirestoreError(err, OperationType.GET, `memberProfiles/${firebaseUser.uid}`);
      }
    );

    const unsubPriv = onSnapshot(
      doc(db, 'usersPrivate', firebaseUser.uid),
      (snap) => {
        setUserPrivate(snap.exists() ? (snap.data() as UserPrivate) : null);
      },
      (err) => {
        handleFirestoreError(err, OperationType.GET, `usersPrivate/${firebaseUser.uid}`);
      }
    );

    return () => {
      unsubPub();
      unsubPriv();
    };
  }, [firebaseUser]);

  // 3. Public collection listeners (require isPublished == true per security rules)
  useEffect(() => {
    const unsubContests = onSnapshot(
      query(collection(db, 'contests'), where('isPublished', '==', true)),
      (snap) => {
        setLiveContests(
          sortByNewest(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Contest, 'id'>) })))
        );
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'contests')
    );

    const unsubClubs = onSnapshot(
      query(collection(db, 'clubs'), where('isPublished', '==', true)),
      (snap) => {
        setLiveClubs(
          sortByNewest(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<ClubPost, 'id'>) })))
        );
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'clubs')
    );

    const unsubTips = onSnapshot(
      query(collection(db, 'studyTips'), where('isPublished', '==', true)),
      (snap) => {
        setLiveStudyTips(
          sortByNewest(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<StudyTip, 'id'>) })))
        );
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'studyTips')
    );

    const unsubTeams = onSnapshot(
      query(collection(db, 'teamRecruits'), where('isPublished', '==', true)),
      (snap) => {
        setLiveTeamRecruits(
          sortByNewest(
            snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<TeamRecruit, 'id'>) }))
          )
        );
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'teamRecruits')
    );

    const unsubWorks = onSnapshot(
      query(collection(db, 'portfolioWorks'), where('isPublished', '==', true)),
      (snap) => {
        setLivePortfolios(
          sortByNewest(
            snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<PortfolioWork, 'id'>) }))
          )
        );
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'portfolioWorks')
    );

    const unsubGuides = onSnapshot(
      query(collection(db, 'equipGuides'), where('isPublished', '==', true)),
      (snap) => {
        setLiveEquipGuides(
          sortByNewest(
            snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<EquipGuide, 'id'>) }))
          )
        );
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'equipGuides')
    );

    const unsubCommunity = onSnapshot(
      query(collection(db, 'communityPosts'), where('isPublished', '==', true)),
      (snap) => {
        setLiveCommunityPosts(
          sortByNewest(
            snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<CommunityPost, 'id'>) }))
          )
        );
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'communityPosts')
    );

    const unsubNews = onSnapshot(
      query(collection(db, 'departmentNews'), where('isPublished', '==', true)),
      (snap) => {
        setLiveDepartmentNews(
          sortByNewest(
            snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<DepartmentNews, 'id'>) }))
          )
        );
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'departmentNews')
    );

    return () => {
      unsubContests();
      unsubClubs();
      unsubTips();
      unsubTeams();
      unsubWorks();
      unsubGuides();
      unsubCommunity();
      unsubNews();
    };
  }, []);

  // 4. User bookmarks listener
  useEffect(() => {
    if (!authReady || !firebaseUser) {
      setBookmarks([]);
      return;
    }
    const unsub = onSnapshot(
      query(collection(db, 'bookmarks'), where('userId', '==', firebaseUser.uid)),
      (snap) => {
        setBookmarks(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Bookmark, 'id'>) })));
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'bookmarks')
    );
    return () => unsub();
  }, [authReady, firebaseUser]);

  const isAdmin = firebaseUser?.email === 'ponibultaeugisilsi@gmail.com';

  // 5. Community reports listener (own reports for members, all reports for admin)
  useEffect(() => {
    if (!authReady || !firebaseUser) {
      setReports([]);
      return;
    }
    const reportsQuery = isAdmin
      ? collection(db, 'reports')
      : query(collection(db, 'reports'), where('reporterId', '==', firebaseUser.uid));

    const unsub = onSnapshot(
      reportsQuery,
      (snap) => {
        setReports(
          sortByNewest(
            snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<CommunityReport, 'id'>) }))
          )
        );
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'reports')
    );
    return () => unsub();
  }, [authReady, firebaseUser, isAdmin]);

  const contests = liveContests.length > 0 ? liveContests : INITIAL_CONTESTS;
  const clubs = liveClubs.length > 0 ? liveClubs : INITIAL_CLUBS;
  const studyTips = liveStudyTips.length > 0 ? liveStudyTips : INITIAL_STUDY_TIPS;
  const teamRecruits = liveTeamRecruits.length > 0 ? liveTeamRecruits : INITIAL_TEAM_RECRUITS;
  const portfolios = livePortfolios.length > 0 ? livePortfolios : INITIAL_PORTFOLIOS;
  const equipGuides = liveEquipGuides.length > 0 ? liveEquipGuides : INITIAL_EQUIP_GUIDES;
  const communityPosts =
    liveCommunityPosts.length > 0 ? liveCommunityPosts : INITIAL_COMMUNITY_POSTS;
  const departmentNews =
    liveDepartmentNews.length > 0 ? liveDepartmentNews : INITIAL_DEPARTMENT_NEWS;

  const bookmarkedIds = useMemo(() => new Set(bookmarks.map((b) => b.contestId)), [bookmarks]);
  const myReports = useMemo(
    () => (firebaseUser ? reports.filter((r) => r.reporterId === firebaseUser.uid) : []),
    [reports, firebaseUser]
  );
  const reportedKeys = useMemo(
    () => new Set(myReports.map((r) => `${r.targetType}:${r.targetId}`)),
    [myReports]
  );

  const handleNavigate = (tab: MainTab, subTab?: MajorSubTab) => {
    setActiveTab(tab);
    if (subTab) setMajorSubTab(subTab);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleRequireAuth = () => {
    setAuthModalOpen(true);
  };

  const isScenicSearch = activeTab === 'search';

  return (
    <div className="min-h-screen flex flex-col bg-[#FBF9F5] dark:bg-[#121110] text-[#1C1917] dark:text-[#F5F2EB] transition-colors">
      <TopBar
        activeTab={activeTab}
        onSelectTab={(tab) => {
          if (tab === 'mypage' && !firebaseUser) {
            setAuthModalOpen(true);
            return;
          }
          handleNavigate(tab);
        }}
        isAuthenticated={Boolean(firebaseUser)}
        memberProfile={memberProfile}
        onOpenAuth={() => setAuthModalOpen(true)}
        overlayMode={isScenicSearch}
      />

      {isScenicSearch ? (
        <main className="flex-1 w-full">
          <ScenicSearchHomeView
            contests={contests}
            clubs={clubs}
            studyTips={studyTips}
            teamRecruits={teamRecruits}
            portfolios={portfolios}
            equipGuides={equipGuides}
            communityPosts={communityPosts}
            departmentNews={departmentNews}
            theme={theme}
            onToggleTheme={setTheme}
            onNavigate={handleNavigate}
            onSelectContest={(c) => {
              setSelectedContest(c);
              handleNavigate('contests');
            }}
            onSelectClub={(club) => {
              setSelectedClub(club);
              handleNavigate('clubs');
            }}
            onSelectPortfolio={(work) => {
              setSelectedPortfolio(work);
              handleNavigate('major', 'portfolio');
            }}
            onSelectNews={(news) => {
              setSelectedNews(news);
              setCommunitySubTab('news');
              handleNavigate('community');
            }}
            onOpenNewsList={() => {
              setCommunitySubTab('news');
              handleNavigate('community');
            }}
          />
        </main>
      ) : (
        <main className="flex-1 max-w-[1200px] w-full mx-auto px-5 sm:px-8">
        {activeTab === 'home' && (
          <MagazineHomeView
            contests={contests}
            clubs={clubs}
            teamRecruits={teamRecruits}
            portfolios={portfolios}
            studyTips={studyTips}
            equipGuides={equipGuides}
            departmentNews={departmentNews}
            onNavigate={handleNavigate}
            onSelectContest={(c) => {
              setSelectedContest(c);
              handleNavigate('contests');
            }}
            onSelectClub={(club) => {
              setSelectedClub(club);
              handleNavigate('clubs');
            }}
            onSelectPortfolio={(work) => {
              setSelectedPortfolio(work);
              handleNavigate('major', 'portfolio');
            }}
            onSelectNews={(news) => {
              setSelectedNews(news);
              setCommunitySubTab('news');
              handleNavigate('community');
            }}
            onOpenNewsList={() => {
              setCommunitySubTab('news');
              handleNavigate('community');
            }}
          />
        )}

        {activeTab === 'contests' && (
          <ContestsView
            contests={contests}
            bookmarkedIds={bookmarkedIds}
            selectedContest={selectedContest}
            onSelectContest={setSelectedContest}
            currentUid={firebaseUser?.uid || null}
            memberProfile={memberProfile}
            isAdmin={isAdmin}
            isLiveCollection={liveContests.length > 0}
            onRequireAuth={handleRequireAuth}
            onNotify={showToast}
          />
        )}

        {activeTab === 'clubs' && (
          <ClubsView
            clubs={clubs}
            selectedClub={selectedClub}
            onSelectClub={setSelectedClub}
            currentUid={firebaseUser?.uid || null}
            memberProfile={memberProfile}
            isAdmin={isAdmin}
            isLiveCollection={liveClubs.length > 0}
            reportedKeys={reportedKeys}
            onRequireAuth={handleRequireAuth}
            onNotify={showToast}
          />
        )}

        {activeTab === 'major' && (
          <MajorHubView
            subTab={majorSubTab}
            onSelectSubTab={setMajorSubTab}
            studyTips={studyTips}
            teamRecruits={teamRecruits}
            portfolios={portfolios}
            equipGuides={equipGuides}
            selectedPortfolio={selectedPortfolio}
            onSelectPortfolio={setSelectedPortfolio}
            currentUid={firebaseUser?.uid || null}
            memberProfile={memberProfile}
            isAdmin={isAdmin}
            isLiveCollection={
              liveStudyTips.length > 0 ||
              liveTeamRecruits.length > 0 ||
              livePortfolios.length > 0 ||
              liveEquipGuides.length > 0
            }
            reportedKeys={reportedKeys}
            onRequireAuth={handleRequireAuth}
            onNotify={showToast}
          />
        )}

        {activeTab === 'community' && (
          <CommunityView
            subTab={communitySubTab}
            onSelectSubTab={setCommunitySubTab}
            posts={communityPosts}
            departmentNews={departmentNews}
            selectedNews={selectedNews}
            onSelectNews={setSelectedNews}
            currentUid={firebaseUser?.uid || null}
            memberProfile={memberProfile}
            isAdmin={isAdmin}
            isLiveCollection={liveCommunityPosts.length > 0}
            isLiveNewsCollection={liveDepartmentNews.length > 0}
            reports={reports}
            reportedKeys={reportedKeys}
            onRequireAuth={handleRequireAuth}
            onNotify={showToast}
          />
        )}

        {activeTab === 'mypage' && firebaseUser && (
          <MyPageView
            currentUid={firebaseUser.uid}
            memberProfile={memberProfile}
            userPrivate={userPrivate}
            contests={contests}
            bookmarkedIds={bookmarkedIds}
            clubs={clubs}
            studyTips={studyTips}
            teamRecruits={teamRecruits}
            portfolios={portfolios}
            communityPosts={communityPosts}
            myReports={myReports}
            onOpenContest={(c) => {
              setSelectedContest(c);
              handleNavigate('contests');
            }}
            onNavigate={handleNavigate}
            onOpenAuthOnboarding={() => setAuthModalOpen(true)}
            onNotify={showToast}
          />
        )}
        </main>
      )}

      {!isScenicSearch && (
        <>
          <footer className="border-t border-[#E5DEC9] dark:border-[#322E29] bg-[#F2EDE4]/40 dark:bg-[#1B1917]/70 mt-auto">
            <div className="max-w-[1200px] mx-auto px-5 sm:px-8 py-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-xs text-[#78716C] dark:text-[#8E867B]">
              <div className="space-y-1">
                <p className="text-sm text-[#1C1917] dark:text-[#F5F2EB]">
                  <span className="font-brand text-base tracking-wide">캠타임 CAMPTIME</span> · 콘텐츠제작학과 캠퍼스 매거진 아카이브
                </p>
                <p>교내·외 공모전, 동아리 모집, 전공 스터디와 학생 창작물을 연결합니다.</p>
              </div>
              <div className="flex flex-wrap items-center gap-5">
                <button
                  type="button"
                  onClick={() => handleNavigate('contests')}
                  className="hover:text-[#1C1917] dark:hover:text-[#F5F2EB] cursor-pointer"
                >
                  공모전
                </button>
                <button
                  type="button"
                  onClick={() => handleNavigate('clubs')}
                  className="hover:text-[#1C1917] dark:hover:text-[#F5F2EB] cursor-pointer"
                >
                  동아리
                </button>
                <button
                  type="button"
                  onClick={() => handleNavigate('major', 'wiki')}
                  className="hover:text-[#1C1917] dark:hover:text-[#F5F2EB] cursor-pointer"
                >
                  장비 위키
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setCommunitySubTab('news');
                    handleNavigate('community');
                  }}
                  className="hover:text-[#1C1917] dark:hover:text-[#F5F2EB] cursor-pointer"
                >
                  학과 소식
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setCommunitySubTab('board');
                    handleNavigate('community');
                  }}
                  className="hover:text-[#1C1917] dark:hover:text-[#F5F2EB] cursor-pointer"
                >
                  커뮤니티
                </button>
              </div>
            </div>
          </footer>

          <div className="fixed bottom-4 right-5 z-40">
            <ThemeToggle theme={theme} onToggle={setTheme} variant="surface" />
          </div>
        </>
      )}

      <AuthModal
        isOpen={authModalOpen && profileChecked}
        onClose={() => setAuthModalOpen(false)}
        firebaseUser={firebaseUser}
        existingProfile={memberProfile}
        onSavedProfile={() => setAuthModalOpen(false)}
        onNotify={showToast}
      />

      {toastMessage && (
        <div
          role="status"
          className="fixed bottom-16 right-5 z-50 bg-[#1C1917] dark:bg-[#F5F2EB] text-[#FBF9F5] dark:text-[#121110] text-xs font-medium px-4 py-3 rounded-lg shadow-lg border border-[#E5DEC9]/20 dark:border-[#322E29]/20"
        >
          {toastMessage}
        </div>
      )}
    </div>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <AppContent />
    </ErrorBoundary>
  );
}
