/**
 * BlockSecLab - Universal Challenge & Curriculum Specification
 * Supports:
 * - Level 0: Solidity Basics (Zero to Hero)
 * - Level 1: Intermediate Security & CTFs (Ethernaut Style)
 * - Level 2: Advanced DeFi & Architecture Exploits (Damn Vulnerable DeFi Style)
 */

export type CurriculumLevel = 0 | 1 | 2;

export type ChallengeDifficulty = 'Beginner' | 'Intermediate' | 'Advanced' | 'Elite';

export type ChallengeCategory =
  | 'basics-syntax'
  | 'functions-modifiers'
  | 'data-structures'
  | 'ether-transfers'
  | 'access-control'
  | 'arithmetic'
  | 'reentrancy'
  | 'force-balance'
  | 'delegatecall'
  | 'randomness'
  | 'defi-oracles'
  | 'flash-loans'
  | 'governance'
  | 'token-vaults'
  | 'proxies';

export interface HintDefinition {
  id: string;
  tier: 1 | 2 | 3;
  title: string;
  costXp: number;
  markdown: string;
}

export interface ContractFile {
  name: string;
  path: string;
  content: string;
  readOnly: boolean;
  description: string;
}

export interface LearningContent {
  conceptSummary: string[];
  theoryExplanation: string;
  swcTag?: string;
  cweTag?: string;
  hints: HintDefinition[];
  realWorldIncident?: {
    protocolName: string;
    date: string;
    lossUsd: string;
    summary: string;
    referenceUrl?: string;
  };
  remediation?: {
    explanation: string;
    vulnerableSnippet: string;
    securedSnippet: string;
    bestPractices: string[];
  };
}

export interface InvariantAssertion {
  description: string;
  formula: string; // e.g. "assertEq(target.owner(), attacker)"
  expectedOutcome: string;
}

export interface ChallengeDefinition {
  id: string;
  slug: string;
  title: string;
  level: CurriculumLevel;
  difficulty: ChallengeDifficulty;
  category: ChallengeCategory;
  tags: string[];
  xpPoints: number;
  estimatedMinutes: number;
  prerequisites?: string[];

  // Learning & Pedagogical Context
  learning: LearningContent;

  // Sandbox Code Assets
  contracts: {
    target: ContractFile;
    userExploit: ContractFile & {
      initialTemplate: string;
      verifiedSolution: string;
    };
    foundryTest: ContractFile & {
      testFunctionName: string;
      invariants: InvariantAssertion[];
    };
  };

  // Verification & Flags
  flag: string;
}
