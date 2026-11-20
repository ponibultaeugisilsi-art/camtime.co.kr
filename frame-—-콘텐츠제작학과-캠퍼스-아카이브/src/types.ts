export type GradeOption = '1학년' | '2학년' | '3학년' | '4학년' | '졸업/대학원';
export type MajorTrackOption =
  | '영상제작·연출'
  | '콘텐츠기획·마케팅'
  | '3D·모션그래픽'
  | '디자인·UI/UX'
  | '사운드·포스트';

export type ContestScope = '교내' | '교외';
export type ContestCategory = '영상·영화' | '기획·마케팅' | '디자인·웹' | '3D·모션' | '사운드';

export type ClubField = '영상제작' | '시나리오·기획' | '모션·3D' | '사진·스튜디오' | '뉴미디어·웹';
export type ClubStatus = '모집중' | '상시모집' | '마감';

export type StudyTipType = '강의팁' | '과제노하우' | '스터디모집';
export type TeamStatus = '모집중' | '마감';
export type PortfolioTrack = '영상·영화' | '모션·3D' | '기획서·디자인' | '사운드' | '웹·인터랙티브';
export type EquipGuideType = '교내장비' | '소프트웨어';
export type CommunityCategory = '자유' | '질문Q&A' | '정보공유' | '장비·툴';
export type DepartmentNewsType = '학과공지' | '특강·세미나' | '전시·상영회' | '장학·취업';

export type MainTab = 'search' | 'home' | 'contests' | 'clubs' | 'major' | 'community' | 'mypage';
export type MajorSubTab = 'study' | 'team' | 'portfolio' | 'wiki';
export type CommunitySubTab = 'board' | 'news';

export interface TimestampLike {
  toDate?: () => Date;
  seconds?: number;
}

export interface MemberProfile {
  uid: string;
  nickname: string;
  grade: GradeOption;
  majorTrack: MajorTrackOption;
  tools: string[];
  bio: string;
  avatarUrl: string;
  isPublic: boolean;
  createdAt?: TimestampLike;
  updatedAt?: TimestampLike;
}

export interface UserPrivate {
  uid: string;
  email: string;
  studentNumber: string;
  createdAt?: TimestampLike;
  updatedAt?: TimestampLike;
}

export interface Contest {
  id: string;
  title: string;
  scope: ContestScope;
  category: ContestCategory;
  organizer: string;
  deadline: string; // YYYY-MM-DD
  prize: string;
  summary: string;
  description: string;
  externalUrl: string;
  imageUrl: string;
  authorId: string;
  authorName: string;
  isPublished: boolean;
  createdAt?: TimestampLike;
  updatedAt?: TimestampLike;
}

export interface ClubPost {
  id: string;
  clubName: string;
  title: string;
  field: ClubField;
  status: ClubStatus;
  recruitCount: string;
  schedule: string;
  contactInfo: string;
  description: string;
  imageUrl: string;
  authorId: string;
  authorName: string;
  isPublished: boolean;
  createdAt?: TimestampLike;
  updatedAt?: TimestampLike;
}

export interface ParentComment {
  id: string;
  parentId: string;
  authorId: string;
  authorName: string;
  authorTrack: string;
  content: string;
  isPublished: boolean;
  createdAt?: TimestampLike;
}

export interface StudyTip {
  id: string;
  courseName: string;
  tipType: StudyTipType;
  title: string;
  content: string;
  authorId: string;
  authorName: string;
  authorTrack: string;
  isPublished: boolean;
  createdAt?: TimestampLike;
  updatedAt?: TimestampLike;
}

export interface TeamRecruit {
  id: string;
  projectTitle: string;
  contestName: string;
  neededRoles: string[];
  currentMembers: number;
  targetMembers: number;
  status: TeamStatus;
  description: string;
  contactNote: string;
  authorId: string;
  authorName: string;
  isPublished: boolean;
  createdAt?: TimestampLike;
  updatedAt?: TimestampLike;
}

export interface PortfolioWork {
  id: string;
  title: string;
  track: PortfolioTrack;
  toolsUsed: string;
  imageUrl: string;
  mediaLink: string;
  description: string;
  authorId: string;
  authorName: string;
  authorGrade: string;
  isPublished: boolean;
  createdAt?: TimestampLike;
  updatedAt?: TimestampLike;
}

export interface EquipGuide {
  id: string;
  guideType: EquipGuideType;
  itemName: string;
  locationOrShortcut: string;
  summary: string;
  guideBody: string;
  authorId: string;
  authorName: string;
  isPublished: boolean;
  createdAt?: TimestampLike;
  updatedAt?: TimestampLike;
}

export interface CommunityPost {
  id: string;
  category: CommunityCategory;
  title: string;
  content: string;
  authorId: string;
  authorName: string;
  authorTrack: string;
  isPublished: boolean;
  createdAt?: TimestampLike;
  updatedAt?: TimestampLike;
}

export interface Bookmark {
  id: string;
  userId: string;
  contestId: string;
  createdAt?: TimestampLike;
}

export interface DepartmentNews {
  id: string;
  newsType: DepartmentNewsType;
  title: string;
  summary: string;
  content: string;
  eventSchedule: string;
  source: string;
  isPinned: boolean;
  authorId: string;
  authorName: string;
  isPublished: boolean;
  createdAt?: TimestampLike;
  updatedAt?: TimestampLike;
}

export type ReportTargetType = 'post' | 'comment';
export type ReportTargetCollection = 'communityPosts' | 'clubs' | 'teamRecruits' | 'portfolioWorks';
export type ReportReason =
  | '도배·스팸홍보'
  | '욕설·비하·혐오표현'
  | '허위정보·사기'
  | '개인정보노출·부적절콘텐츠';
export type ReportStatus = '접수됨' | '검토중' | '조치완료' | '반려됨';

export interface CommunityReport {
  id: string;
  reporterId: string;
  reporterName: string;
  targetType: ReportTargetType;
  targetCollection: ReportTargetCollection;
  targetId: string;
  parentId: string;
  targetAuthorId: string;
  targetAuthorName: string;
  targetPreview: string;
  reason: ReportReason;
  reasonDetail: string;
  status: ReportStatus;
  adminNote: string;
  createdAt?: TimestampLike;
  updatedAt?: TimestampLike;
}

