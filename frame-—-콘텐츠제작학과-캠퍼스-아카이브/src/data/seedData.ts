import { collection, doc, getDocs, limit, query, serverTimestamp, setDoc, where } from 'firebase/firestore';
import { db } from '../firebase';
import {
  ClubPost,
  CommunityPost,
  Contest,
  DepartmentNews,
  EquipGuide,
  PortfolioWork,
  StudyTip,
  TeamRecruit,
} from '../types';

export const GENERATED_IMAGES = {
  heroStudio: '/src/assets/images/hero_editorial_studio_1795154248765.jpg',
  contestFilm: '/src/assets/images/contest_film_festival_1795154248820.jpg',
  clubWorkshop: '/src/assets/images/club_production_workshop_1795154250285.jpg',
  portfolioFilm: '/src/assets/images/portfolio_motion_frame_1795154248895.jpg',
  portfolioSound: '/src/assets/images/portfolio_sound_design_1795154250335.jpg',
} as const;

export const SCENIC_WALLPAPERS = [
  {
    id: 'autumn-lake',
    imageUrl: '/src/assets/images/scenic_campus_autumn_1795154901674.jpg',
    title: '고산 호수와 단풍 숲의 여명',
    caption: '물안개 피어오르는 고요한 아침의 산악 호수 · Editorial Scenic Archive',
  },
  {
    id: 'coastal-dawn',
    imageUrl: '/src/assets/images/scenic_coastal_dawn_1795154901515.jpg',
    title: '황금빛 해안 절벽과 푸른 바다',
    caption: '이른 새벽 햇살을 머금은 해안 암벽과 바다 안개 · Editorial Scenic Archive',
  },
  {
    id: 'alpine-valley',
    imageUrl: '/src/assets/images/scenic_alpine_meadow_1795154901507.jpg',
    title: '초록 계곡을 흐르는 맑은 강물',
    caption: '아침 구름 아래 펼쳐진 고원의 초원과 설산 능선 · Editorial Scenic Archive',
  },
] as const;

export const INITIAL_CONTESTS: Omit<Contest, 'createdAt' | 'updatedAt'>[] = [
  {
    id: 'seed_contest_1',
    title: '제14회 콘텐츠제작학과 캠퍼스 단편영화제 〈시선의 프레임〉',
    scope: '교내',
    category: '영상·영화',
    organizer: '콘텐츠제작학과 학생회 · 학과사무실',
    deadline: '2026-12-12',
    prize: '대상 150만 원 · 학과 상영관 특별전',
    summary: '재학생이 직접 연출·촬영한 15분 이내 단편 극영화, 다큐멘터리, 실험영상을 모집합니다.',
    description:
      '매년 겨울 열리는 학과 대표 교내 영화제입니다. 개인 또는 5인 이하 팀으로 출품할 수 있으며, 본선 진출작은 예술관 소극장 시사회와 학과 공식 아카이브 매거진에 수록됩니다. 색보정·사운드 믹싱 멘토링도 함께 지원됩니다.',
    externalUrl: 'https://example.edu/film-festival',
    imageUrl: GENERATED_IMAGES.contestFilm,
    authorId: 'seed_admin',
    authorName: '학과 큐레이터',
    isPublished: true,
  },
  {
    id: 'seed_contest_2',
    title: '2026 교내 뉴미디어 인터랙티브 콘텐츠 어워드',
    scope: '교내',
    category: '디자인·웹',
    organizer: 'SW중심대학사업단 · 콘텐츠제작학과',
    deadline: '2026-12-04',
    prize: '최우수상 100만 원 · 창작 지원금',
    summary: '웹 인터랙티브 스토리텔링, XR 프로토타입, 데이터 저널리즘 작품을 발굴하는 교내 공모전.',
    description:
      '전공 수업 과제물이나 개인 프로젝트를 발전시켜 출품할 수 있는 교내 공모전입니다. 기획서(PDF 10매 이내)와 동작하는 프로토타입 링크 또는 시연 영상을 함께 제출하세요.',
    externalUrl: 'https://example.edu/newmedia-award',
    imageUrl: GENERATED_IMAGES.heroStudio,
    authorId: 'seed_admin',
    authorName: '학과 큐레이터',
    isPublished: true,
  },
  {
    id: 'seed_contest_3',
    title: '전국 대학생 브랜디드 숏폼·다큐멘터리 공모전',
    scope: '교외',
    category: '기획·마케팅',
    organizer: '한국디지털콘텐츠진흥회',
    deadline: '2026-12-22',
    prize: '총 상금 1,200만 원 · 인턴십 연계',
    summary: '지역 문화와 청년 창작자의 시선을 결합한 60초~3분 분량의 브랜디드 필름 및 마케팅 기획 공모.',
    description:
      '대학생 팀(2~4인)이 지역 소상공인 또는 문화 공간을 주제로 브랜디드 영상과 캠페인 전략서를 함께 제안하는 대외 공모전입니다. 예선 통과 팀에게는 제작 실비 50만 원이 지급됩니다.',
    externalUrl: 'https://example.org/branded-contest',
    imageUrl: GENERATED_IMAGES.clubWorkshop,
    authorId: 'seed_admin',
    authorName: '학과 큐레이터',
    isPublished: true,
  },
  {
    id: 'seed_contest_4',
    title: 'K-모션 & 3D 시퀀스 디자인 챌린지 2026',
    scope: '교외',
    category: '3D·모션',
    organizer: '서울모션그래픽협회',
    deadline: '2027-01-10',
    prize: '대상 300만 원 · 스튜디오 포트폴리오 리뷰',
    summary: '타이틀 시퀀스, 3D 비주얼 에세이, 아나모픽 미디어 아트 부문의 대학생 창작자를 찾습니다.',
    description:
      'Blender, Cinema 4D, After Effects 등 다양한 3D 및 모션 툴을 활용한 30초~90초 시퀀스 작품을 접수받습니다. 작업 과정(메이킹 브레이크다운) 3컷 이상 첨부 필수입니다.',
    externalUrl: 'https://example.org/motion-challenge',
    imageUrl: GENERATED_IMAGES.portfolioFilm,
    authorId: 'seed_admin',
    authorName: '학과 큐레이터',
    isPublished: true,
  },
];

export const INITIAL_CLUBS: Omit<ClubPost, 'createdAt' | 'updatedAt'>[] = [
  {
    id: 'seed_club_1',
    clubName: '프레임랩 (FRAME LAB)',
    title: '겨울방학 단편영화 & 다큐멘터리 제작 신입 부원 모집',
    field: '영상제작',
    status: '모집중',
    recruitCount: '연출·촬영·편집 6명',
    schedule: '매주 목요일 18:30 · 예술관 302호',
    contactInfo: '학과 오픈채팅 "프레임랩_2026" 또는 댓글 문의',
    description:
      '시나리오 집필부터 프리프로덕션, 교내 기자재실을 활용한 실제 현장 촬영, 후반 색보정까지 한 학기 1작품 완성을 목표로 하는 학과 대표 영상제작 동아리입니다. 비전공 트랙 학생이나 1학년도 촬영·조명 기초 스터디부터 함께합니다.',
    imageUrl: GENERATED_IMAGES.clubWorkshop,
    authorId: 'seed_admin',
    authorName: '박서연 (3학년)',
    isPublished: true,
  },
  {
    id: 'seed_club_2',
    clubName: '모션아카이브 (MOTION ARCHIVE)',
    title: '3D·모션그래픽 포트폴리오 합평 및 챌린지 크루 상시 모집',
    field: '모션·3D',
    status: '상시모집',
    recruitCount: '트랙 무관 4명',
    schedule: '매주 화요일 19:00 · 미디어랩 B',
    contactInfo: '인스타그램 @motion_archive_univ / 하단 댓글 지원',
    description:
      'After Effects, Blender, Cinema 4D를 다루며 매주 15초 모션 챌린지와 타이틀 시퀀스 리디자인 프로젝트를 진행합니다. 공모전 출품용 공동 쇼릴 제작도 함께 운영하고 있습니다.',
    imageUrl: GENERATED_IMAGES.portfolioFilm,
    authorId: 'seed_admin',
    authorName: '이도현 (4학년)',
    isPublished: true,
  },
  {
    id: 'seed_club_3',
    clubName: '사운드스케이프 (SOUNDSCAPE)',
    title: '영화 사운드 디자인 · 폴리(Foley) 녹음 & 믹싱 학회 8기 모집',
    field: '사진·스튜디오',
    status: '모집중',
    recruitCount: '음향·작곡 관심자 3명',
    schedule: '격주 수요일 18:00 · 음향실 104호',
    contactInfo: '댓글로 학번/관심 분야 남겨주시면 개별 연락드립니다.',
    description:
      '영상의 완성도를 결정짓는 사운드 디자인, 현장 동시녹음, 폴리 녹음 및 믹싱을 실습하는 학과 유일의 음향 특화 소모임입니다. 학내 단편영화제 출품작 사운드 포스트 프로덕션 협업 기회가 많습니다.',
    imageUrl: GENERATED_IMAGES.portfolioSound,
    authorId: 'seed_admin',
    authorName: '정하은 (3학년)',
    isPublished: true,
  },
];

export const INITIAL_STUDY_TIPS: Omit<StudyTip, 'createdAt' | 'updatedAt'>[] = [
  {
    id: 'seed_tip_1',
    courseName: '영상촬영기초',
    tipType: '과제노하우',
    title: '중간고사 단편 컷 편집 과제, 콘티와 샷 리스트 A+ 구성 팁',
    content:
      '촬영 당일 현장 변수를 줄이려면 스토리보드 옆에 반드시 렌즈 화각(24mm/50mm), 조명 방향, 동시녹음 마이크 위치까지 적어두는 것이 좋습니다. 특히 교내 복도 촬영 시 형광등 플리커(Flicker) 현상을 막기 위해 셔터 스피드를 1/60 또는 1/120으로 맞추는 체크리스트를 꼭 확인하세요.',
    authorId: 'seed_admin',
    authorName: '김민준',
    authorTrack: '영상제작·연출',
    isPublished: true,
  },
  {
    id: 'seed_tip_2',
    courseName: '콘텐츠기획론',
    tipType: '강의팁',
    title: '기획안 발표에서 설득력을 높이는 레퍼런스 무드보드 정리법',
    content:
      '단순히 핀터레스트 이미지를 나열하기보다 "왜 이 톤앤매너가 타깃 오디언스의 감정선과 맞는가"를 1줄 코멘트로 붙이면 교수님 피드백이 훨씬 좋습니다. 대조되는 레퍼런스(Avoid Case)를 2장 함께 보여주면 기획 의도가 선명해집니다.',
    authorId: 'seed_admin',
    authorName: '최유진',
    authorTrack: '콘텐츠기획·마케팅',
    isPublished: true,
  },
  {
    id: 'seed_tip_3',
    courseName: 'Blender & AE 모션 스터디',
    tipType: '스터디모집',
    title: '주 2회 비대면/대면 병행 모션그래픽 기초 탈출 스터디원 모집',
    content:
      '1~2학년 학우분들 중 에펙 그래프 에디터와 블렌더 기본 노드 세팅을 기초부터 다지고 싶은 분 4명을 모읍니다. 매주 1개의 짧은 모션 클립을 완성해 서로 피드백을 주고받는 형태로 운영합니다.',
    authorId: 'seed_admin',
    authorName: '이도현',
    authorTrack: '3D·모션그래픽',
    isPublished: true,
  },
];

export const INITIAL_TEAM_RECRUITS: Omit<TeamRecruit, 'createdAt' | 'updatedAt'>[] = [
  {
    id: 'seed_team_1',
    projectTitle: '〈캠퍼스의 밤을 기록하다〉 브랜디드 필름 제작팀',
    contestName: '전국 대학생 브랜디드 숏폼·다큐멘터리 공모전',
    neededRoles: ['촬영감독', '사운드믹싱', '모션타이포'],
    currentMembers: 2,
    targetMembers: 5,
    status: '모집중',
    description:
      '현재 연출과 기획·마케팅 2명이 모여 시놉시스 초안을 완성한 상태입니다. 감각적인 야간 촬영과 깔끔한 2D 모션 자막, 앰비언트 사운드를 함께 만들어갈 팀원을 찾습니다. 11월 말 1차 미팅 예정입니다.',
    contactNote: '댓글에 사용 가능한 툴/포트폴리오와 연락처를 남겨주세요.',
    authorId: 'seed_admin',
    authorName: '박서연',
    isPublished: true,
  },
  {
    id: 'seed_team_2',
    projectTitle: '인터랙티브 웹 다큐멘터리 〈사라진 극장들〉',
    contestName: '2026 교내 뉴미디어 인터랙티브 콘텐츠 어워드',
    neededRoles: ['UI/UX 디자인', '프론트엔드(웹)', '아카이브 리서치'],
    currentMembers: 2,
    targetMembers: 4,
    status: '모집중',
    description:
      '대학가 주변의 오래된 단관 극장 역사를 스크롤 인터랙션과 짧은 인터뷰 영상으로 풀어내는 웹 콘텐츠 프로젝트입니다. Figma 프로토타이핑이나 간단한 웹 구현 경험이 있는 학우를 환영합니다.',
    contactNote: '댓글 작성 후 오픈카톡 링크 공유드립니다.',
    authorId: 'seed_admin',
    authorName: '한지우',
    isPublished: true,
  },
];

export const INITIAL_PORTFOLIOS: Omit<PortfolioWork, 'createdAt' | 'updatedAt'>[] = [
  {
    id: 'seed_work_1',
    title: '단편영화 〈오후 네 시의 아치〉 촬영·색보정 스틸 아카이브',
    track: '영상·영화',
    toolsUsed: 'Sony FX3 · DaVinci Resolve 19',
    imageUrl: GENERATED_IMAGES.portfolioFilm,
    mediaLink: 'https://vimeo.com',
    description:
      '교내 회랑을 배경으로 시간의 흐름을 빛과 그림자의 대비만으로 담아낸 8분 분량 단편영화입니다. 16mm 필름 에뮬레이션 LUT를 커스텀 제작해 따뜻한 석회암 톤을 강조했습니다. 컷 전환 리듬과 색감 밸런스에 대한 솔직한 크리틱을 기다립니다.',
    authorId: 'seed_admin',
    authorName: '윤태오',
    authorGrade: '3학년',
    isPublished: true,
  },
  {
    id: 'seed_work_2',
    title: '다큐멘터리 사운드 리디자인 〈비 오는 날의 다방〉',
    track: '사운드',
    toolsUsed: 'Pro Tools · Zoom F6 · Rode NTG3',
    imageUrl: GENERATED_IMAGES.portfolioSound,
    mediaLink: 'https://soundcloud.com',
    description:
      '기존 무음 다큐멘터리 클립에 직접 채집한 빗소리, 커피 머신 스팀, 오래된 라디오 노이즈를 레이어링한 사운드 포스트 프로덕션 작업물입니다. 공간감(Reverb) 밸런스에 대한 피드백을 부탁드립니다.',
    authorId: 'seed_admin',
    authorName: '정하은',
    authorGrade: '3학년',
    isPublished: true,
  },
  {
    id: 'seed_work_3',
    title: '제14회 캠퍼스 단편영화제 트레일러 타이틀 시퀀스',
    track: '모션·3D',
    toolsUsed: 'After Effects · Cinema 4D · Redshift',
    imageUrl: GENERATED_IMAGES.contestFilm,
    mediaLink: 'https://behance.net',
    description:
      '영사기 빛의 산란과 세리프 타이포그래피의 조형미를 결합한 45초 오프닝 타이틀 시퀀스입니다. 프레임 레이트(12fps/24fps 혼합) 활용에 대한 의견을 듣고 싶습니다.',
    authorId: 'seed_admin',
    authorName: '이도현',
    authorGrade: '4학년',
    isPublished: true,
  },
];

export const INITIAL_EQUIP_GUIDES: Omit<EquipGuide, 'createdAt' | 'updatedAt'>[] = [
  {
    id: 'seed_guide_1',
    guideType: '교내장비',
    itemName: 'Sony FX3 시네마 카메라 & 24-70mm GM II',
    locationOrShortcut: '예술관 201호 기자재실 · 학생증 지참 48시간 전 예약',
    summary: '교내 단편·다큐 제작 시 가장 많이 대여하는 풀프레임 시네마 카메라 기본 세팅 및 반납 체크리스트.',
    guideBody:
      '1) 대여 절차: 학과 포털 기자재 예약 시스템에서 촬영일 기준 최소 2일 전 신청 후, 201호 조교실에서 학생증 확인 뒤 수령합니다.\n2) 권장 기본 세팅: Log 촬영 시 Cine EI 모드 → S-Log3 / S-Gamut3.Cine, Base ISO 800 또는 12800 활용.\n3) 주의사항: 배터리 2개 완충 여부, SD카드(V90 권장) 포맷 상태, ND 필터 스크래치 유무를 수령 직후 반드시 확인하세요.',
    authorId: 'seed_admin',
    authorName: '기자재실 근로장학생',
    isPublished: true,
  },
  {
    id: 'seed_guide_2',
    guideType: '교내장비',
    itemName: 'Zoom F6 필드 레코더 & Rode NTG3 샷건 마이크',
    locationOrShortcut: '예술관 201호 기자재실 · 붐폴·윈드실드 세트 포함',
    summary: '32-bit Float 녹음으로 클리핑을 방지하는 현장 동시녹음 표준 장비 세트 가이드.',
    guideBody:
      '1) 32-bit Float 모드 활성화: 현장 배우의 갑작스러운 고함이나 소음에도 피크가 깨지지 않도록 Menu > Rec > Bit Depth를 32-bit Float로 설정하세요.\n2) 팬텀 파워(+48V): Rode NTG3는 콘덴서 마이크이므로 XLR 연결 후 해당 채널의 +48V Phantom Power를 켜야 수음이 됩니다.\n3) 슬레이트 동기화: 촬영 시작 전 클래퍼보드 박수를 명확히 녹음해 편집 타임라인 싱크를 맞춥니다.',
    authorId: 'seed_admin',
    authorName: '정하은',
    isPublished: true,
  },
  {
    id: 'seed_guide_3',
    guideType: '소프트웨어',
    itemName: 'DaVinci Resolve 19 색보정 노드 기본 워크플로우',
    locationOrShortcut: 'Color 페이지 · Shift+S (시리얼 노드 추가) / Alt+S',
    summary: 'S-Log3 촬영본을 빠르게 Rec.709로 변환하고 톤을 정리하는 4-노드 표준 파이프라인.',
    guideBody:
      'Node 1 (Exposure & Contrast): Lift/Gamma/Gain으로 전체 노출 밸런스를 먼저 잡습니다.\nNode 2 (Color Balance): 화이트 밸런스 및 스킨 톤 보정.\nNode 3 (CST - Color Space Transform): Input Color Space를 Sony S-Gamut3.Cine / S-Log3로, Output을 Rec.709 Gamma 2.4로 지정합니다.\nNode 4 (Look / Grain): 창의적 색감 및 필름 그레인 적용. CST 노드 앞단에서 노출을 조절해야 하이라이트 디테일이 보존됩니다.',
    authorId: 'seed_admin',
    authorName: '윤태오',
    isPublished: true,
  },
  {
    id: 'seed_guide_4',
    guideType: '소프트웨어',
    itemName: 'Premiere Pro 4K 프록시(Proxy) 편집 속도 최적화',
    locationOrShortcut: 'Project 패널 우클릭 > Proxy > Create Proxies',
    summary: '고용량 4K 원본 영상 편집 시 노트북 렉을 줄이는 ProRes Proxy 인제스트 설정법.',
    guideBody:
      '1) 프로젝트 패널에서 4K 클립 전체 선택 → 우클릭 → Proxy → Create Proxies 선택.\n2) Format은 QuickTime, Preset은 ProRes Low Resolution Proxy를 선택해 저장합니다.\n3) 프로그램 모니터 하단 버튼 에디터(+)에서 Toggle Proxies 아이콘을 꺼내 파란색으로 켜두면 가볍게 편집되고, 최종 Export 시에는 자동으로 고화질 원본 파일로 렌더링됩니다.',
    authorId: 'seed_admin',
    authorName: '김민준',
    isPublished: true,
  },
];

export const INITIAL_COMMUNITY_POSTS: Omit<CommunityPost, 'createdAt' | 'updatedAt'>[] = [
  {
    id: 'seed_post_1',
    category: '질문Q&A',
    title: '예술관 3층 편집실 맥 스튜디오에서 외장 SSD 연결 시 포맷 질문!',
    content:
      '이번 주말에 편집실에서 DaVinci Resolve 작업을 하려고 하는데, 윈도우에서 쓰던 exFAT 외장 SSD 그대로 가져가도 속도 저하나 읽기 문제가 없을까요? APFS로 포맷해서 가는 게 나을지 선배님들 경험 궁금합니다!',
    authorId: 'seed_admin',
    authorName: '송지민',
    authorTrack: '영상제작·연출',
    isPublished: true,
  },
  {
    id: 'seed_post_2',
    category: '정보공유',
    title: '학생 인증으로 무료/할인받는 Adobe Creative Cloud & Figma 팁 정리',
    content:
      '학교 웹메일(@univ.ac.kr)로 Figma Education 플랜 무료 업그레이드와 Adobe 학생 할인을 적용받는 방법을 정리해 둡니다. 특히 Figma 학생 플랜은 팀 라이브러리와 무제한 프로젝트가 열려서 기획안 협업할 때 정말 유용해요.',
    authorId: 'seed_admin',
    authorName: '최유진',
    authorTrack: '콘텐츠기획·마케팅',
    isPublished: true,
  },
  {
    id: 'seed_post_3',
    category: '자유',
    title: '이번 학기 졸업작품 시사회 보러 가실 학우분 계신가요?',
    content:
      '다음 주 금요일 대강당에서 4학년 선배님들 졸업작품 상영회가 열린다고 합니다. 저학년 분들도 촬영·연출 레퍼런스 얻기 정말 좋으니 같이 관람하고 간단히 감상 나누실 분 댓글 달아주세요!',
    authorId: 'seed_admin',
    authorName: '강서현',
    authorTrack: '3D·모션그래픽',
    isPublished: true,
  },
];

export const INITIAL_DEPARTMENT_NEWS: Omit<DepartmentNews, 'createdAt' | 'updatedAt'>[] = [
  {
    id: 'seed_news_1',
    newsType: '전시·상영회',
    title: '제18회 콘텐츠제작학과 졸업작품 상영회 및 아카이브 전시 안내',
    summary: '4학년 예비 졸업생 24명의 단편영화, 모션그래픽, 인터랙티브 웹 작품을 예술관 소극장과 로비 갤러리에서 공개합니다.',
    content:
      '콘텐츠제작학과 4학년 학우들이 한 해 동안 준비한 졸업작품 상영회 및 전시가 열립니다. 1부 단편 극영화·다큐멘터리 상영 후 감독과의 대화(GV)가 진행되며, 로비에서는 기획서와 스틸컷 아카이브 북을 자유롭게 열람할 수 있습니다. 재학생 누구나 사전 신청 없이 관람 가능합니다.',
    eventSchedule: '2026.11.27(금) 15:00 · 예술관 소극장',
    source: '콘텐츠제작학과 졸업준비위원회',
    isPinned: true,
    authorId: 'seed_admin',
    authorName: '학과사무실',
    isPublished: true,
  },
  {
    id: 'seed_news_2',
    newsType: '특강·세미나',
    title: '현직 OTT 오리지널 다큐멘터리 PD 초청 특강 〈기획안에서 편성까지〉',
    summary: '글로벌 스트리밍 플랫폼의 다큐멘터리 제작 파이프라인과 신인 크리에이터 피칭 전략을 다루는 전공 특강입니다.',
    content:
      '재학생들의 실무 감각과 콘텐츠 기획 역량을 높이기 위해 현직 오리지널 다큐멘터리 프로듀서를 초청했습니다. 실제 채택된 기획안 구조 분석과 질의응답 시간이 마련되어 있으니 전공 수업 수강생 및 공모전 준비 학생들의 많은 참여 바랍니다.',
    eventSchedule: '2026.12.02(수) 16:30 · 미디어홀 204호',
    source: '콘텐츠제작학과 전공특강팀',
    isPinned: true,
    authorId: 'seed_admin',
    authorName: '학과사무실',
    isPublished: true,
  },
  {
    id: 'seed_news_3',
    newsType: '학과공지',
    title: '2026 동계방학 학과 기자재실 및 편집 스튜디오 운영 시간 안내',
    summary: '방학 기간 중 단편영화·공모전 촬영을 위한 카메라·조명 대여 시간과 야간 편집실 개방 기준을 공지합니다.',
    content:
      '동계방학 중 예술관 201호 기자재실은 평일 10:00~17:00 운영되며, 주말 촬영 팀은 금요일 오후 일괄 수령 후 월요일 오전 반납해야 합니다. 편집 스튜디오(302호)는 사전 출입 권한 신청 학생에 한해 22:00까지 개방됩니다.',
    eventSchedule: '2026.12.21 ~ 2027.02.20 평일 운영',
    source: '예술관 201호 기자재실',
    isPinned: false,
    authorId: 'seed_admin',
    authorName: '기자재실 조교',
    isPublished: true,
  },
  {
    id: 'seed_news_4',
    newsType: '장학·취업',
    title: '2026 하반기 콘텐츠 창작·실습 장비 지원 장학금 신청 공고',
    summary: '교내·외 공모전 본선 진출 팀 및 학과 프로젝트 우수 학생에게 제작 실비 장학금을 지원합니다.',
    content:
      '콘텐츠제작학과 재학생 중 대외 공모전 본선 진출 또는 교내 융합 프로젝트 제작 중인 학생은 활동 증빙서류와 예산 계획서를 학과사무실 이메일로 제출해 주세요. 심사를 거쳐 팀당 최대 50만 원의 제작 지원 장학금을 지급합니다.',
    eventSchedule: '2026.12.10(목) 18:00 마감',
    source: '콘텐츠제작학과 학과사무실',
    isPinned: false,
    authorId: 'seed_admin',
    authorName: '학과사무실',
    isPublished: true,
  },
];

let seedPromise: Promise<void> | null = null;

export async function seedInitialCampusDataIfNeeded(uid: string): Promise<void> {
  if (seedPromise) return seedPromise;
  seedPromise = (async () => {
    try {
      const [existingContestSnap, existingNewsSnap] = await Promise.all([
        getDocs(query(collection(db, 'contests'), where('isPublished', '==', true), limit(1))),
        getDocs(query(collection(db, 'departmentNews'), where('isPublished', '==', true), limit(1))),
      ]);

      const tasks: Promise<void>[] = [];

      if (existingContestSnap.empty) {
        for (const item of INITIAL_CONTESTS) {
          const { id, ...rest } = item;
          tasks.push(
            setDoc(doc(db, 'contests', id), {
              ...rest,
              authorId: uid,
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp(),
            })
          );
        }

        for (const item of INITIAL_CLUBS) {
          const { id, ...rest } = item;
          tasks.push(
            setDoc(doc(db, 'clubs', id), {
              ...rest,
              authorId: uid,
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp(),
            })
          );
        }

        for (const item of INITIAL_STUDY_TIPS) {
          const { id, ...rest } = item;
          tasks.push(
            setDoc(doc(db, 'studyTips', id), {
              ...rest,
              authorId: uid,
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp(),
            })
          );
        }

        for (const item of INITIAL_TEAM_RECRUITS) {
          const { id, ...rest } = item;
          tasks.push(
            setDoc(doc(db, 'teamRecruits', id), {
              ...rest,
              authorId: uid,
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp(),
            })
          );
        }

        for (const item of INITIAL_PORTFOLIOS) {
          const { id, ...rest } = item;
          tasks.push(
            setDoc(doc(db, 'portfolioWorks', id), {
              ...rest,
              authorId: uid,
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp(),
            })
          );
        }

        for (const item of INITIAL_EQUIP_GUIDES) {
          const { id, ...rest } = item;
          tasks.push(
            setDoc(doc(db, 'equipGuides', id), {
              ...rest,
              authorId: uid,
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp(),
            })
          );
        }

        for (const item of INITIAL_COMMUNITY_POSTS) {
          const { id, ...rest } = item;
          tasks.push(
            setDoc(doc(db, 'communityPosts', id), {
              ...rest,
              authorId: uid,
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp(),
            })
          );
        }
      }

      if (existingNewsSnap.empty) {
        for (const item of INITIAL_DEPARTMENT_NEWS) {
          const { id, ...rest } = item;
          tasks.push(
            setDoc(doc(db, 'departmentNews', id), {
              ...rest,
              authorId: uid,
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp(),
            })
          );
        }
      }

      if (tasks.length > 0) {
        await Promise.all(tasks);
      }
    } catch (err) {
      console.warn('Starter seed check skipped or deferred:', err);
    }
  })();
  return seedPromise;
}
