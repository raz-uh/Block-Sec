export type Difficulty = 'novice' | 'intermediate' | 'advanced' | 'elite';

export type ChallengeCategory = 'defi' | 'access-control' | 'math-logic' | 'low-level' | 'oracles';

export type AuditorRank = 
  | 'Script Kiddie' 
  | 'Junior Auditor' 
  | 'Protocol Whitehat' 
  | 'Lead Security Researcher' 
  | 'Apex Sovereign Auditor';

export interface HintTier {
  id: string;
  tier: 1 | 2 | 3;
  title: string;
  costXp: number;
  content: string;
}

export interface HistoricalCase {
  protocolName: string;
  date: string;
  lossUsd: string;
  summary: string;
  referenceUrl: string;
}

export interface PatchDiff {
  explanation: string;
  vulnerableCode: string;
  secureCode: string;
  recommendedBestPractices: string[];
}

export interface Challenge {
  id: string;
  slug: string;
  title: string;
  curriculumLevel: 0 | 1 | 2; // 0 = Basics, 1 = Security CTFs, 2 = Advanced DeFi
  category: ChallengeCategory;
  difficulty: Difficulty;
  xpReward: number;
  estimatedMinutes: number;
  swcTag: string; // e.g., SWC-107
  cweTag: string; // e.g., CWE-841
  solveRatePercent: number;
  tags?: string[];
  theoryExplanation?: string;
  conceptSummary?: string[];
  description: string;
  protocolArchitecture: string;
  exploitObjective: string;
  targetFileName: string;
  targetCode: string;
  exploitFileName: string;
  exploitInitialCode: string;
  exploitSolutionCode: string;
  testFileName: string;
  testCode: string;
  flag: string;
  hints: HintTier[];
  historicalCase: HistoricalCase;
  patchDiff: PatchDiff;
}

export type CallType = 'CALL' | 'DELEGATECALL' | 'STATICCALL' | 'CREATE' | 'REVERT';

export interface TraceStep {
  depth: number;
  callType: CallType;
  from: string;
  to: string;
  value?: string;
  gas: number;
  calldata: string;
  returnVal?: string;
  reverted?: boolean;
  revertReason?: string;
  decodedFunction?: string;
  success?: boolean;
}

export interface GasReportItem {
  contract: string;
  functionName: string;
  min: number;
  avg: number;
  max: number;
  calls: number;
}

export interface ExecutionResult {
  status: 'PASS' | 'FAIL' | 'COMPILE_ERROR';
  exitCode: number;
  durationMs: number;
  stdout: string;
  stderr: string;
  gasUsed: number;
  testsPassed: number;
  testsFailed: number;
  traces: TraceStep[];
  gasReport: GasReportItem[];
  compilerErrors?: string[];
  flag?: string;
}

export interface AuditorBadge {
  id: string;
  title: string;
  description: string;
  icon: string;
  category: ChallengeCategory | 'meta';
  requiredXp?: number;
  requiredChallengesCount?: number;
}

export interface LeaderboardUser {
  rank: number;
  username: string;
  avatar: string;
  xp: number;
  challengesSolved: number;
  badgesCount: number;
  auditorTitle: AuditorRank;
  lastActive: string;
  isCurrentUser?: boolean;
}

export interface UserProgress {
  userId: string;
  username: string;
  totalXp: number;
  rankTitle: AuditorRank;
  completedChallengeIds: string[];
  unlockedHintIds: string[];
  unlockedBadgeIds: string[];
  submissionsCount: number;
}
