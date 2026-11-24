import React, { useState } from 'react';
import { Challenge, ChallengeCategory, Difficulty } from '../types';
import { CHALLENGES } from '../data/challenges';
import { useProgress } from '../context/ProgressContext';
import { CheckCircle2, Clock, ChevronRight, Search, Zap, Layers, Sparkles, Shield } from 'lucide-react';

interface ChallengeListProps {
  onSelectChallenge: (challenge: Challenge) => void;
  onOpenDockerSpec: () => void;
}

export const ChallengeList: React.FC<ChallengeListProps> = ({ onSelectChallenge, onOpenDockerSpec }) => {
  const { isChallengeSolved, progress } = useProgress();
  const [selectedLevel, setSelectedLevel] = useState<'all' | 0 | 1 | 2>('all');
  const [selectedCategory, setSelectedCategory] = useState<ChallengeCategory | 'all' | 'swc'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredChallenges = CHALLENGES.filter((c) => {
    const matchesLevel = selectedLevel === 'all' || c.curriculumLevel === selectedLevel;
    const matchesCategory =
      selectedCategory === 'all'
        ? true
        : selectedCategory === 'swc'
        ? c.swcTag.startsWith('SWC-')
        : c.category === selectedCategory;
    const matchesSearch =
      searchQuery.trim() === '' ||
      c.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.swcTag.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (c.tags && c.tags.some((t) => t.toLowerCase().includes(searchQuery.toLowerCase())));
    return matchesLevel && matchesCategory && matchesSearch;
  });

  const getDifficultyColor = (diff: Difficulty) => {
    switch (diff) {
      case 'novice':
        return 'text-emerald-400';
      case 'intermediate':
        return 'text-cyan-400';
      case 'advanced':
        return 'text-amber-400';
      case 'elite':
        return 'text-rose-400';
    }
  };

  const getLevelLabel = (lvl: 0 | 1 | 2) => {
    switch (lvl) {
      case 0:
        return 'Level 0 · Basics';
      case 1:
        return 'Level 1 · Security CTF';
      case 2:
        return 'Level 2 · Advanced DeFi';
    }
  };

  const solvedCount = progress.completedChallengeIds.length;
  const totalXpAvailable = CHALLENGES.reduce((sum, c) => sum + c.xpReward, 0);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-8">
      {/* Hero & Platform Briefing */}
      <div className="border border-slate-800 rounded-xl bg-gradient-to-b from-[#111827]/80 to-[#0c121e]/80 p-6 sm:p-8">
        <div className="max-w-3xl space-y-4">
          <div className="text-xs uppercase tracking-wider font-semibold text-cyan-400">
            Zero-to-Hero Smart Contract Curriculum & Security Labs
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            BlockSecLab: Web3 Security & Audit Training
          </h1>
          <p className="text-sm sm:text-base text-slate-300 leading-relaxed">
            Master Solidity syntax, EVM memory layout, and real-world exploit development across 3 progressive tiers
            (Basics, Ethernaut-style CTFs, and Advanced DeFi exploits) using our browser-based Monaco Foundry sandbox.
          </p>

          {/* Quick Metrics Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-4 border-t border-slate-800/80">
            <div>
              <div className="text-xs text-slate-400">Curriculum Solved</div>
              <div className="text-xl font-bold font-mono tabular-nums text-white">
                {solvedCount} <span className="text-xs font-normal text-slate-500">/ {CHALLENGES.length}</span>
              </div>
            </div>
            <div>
              <div className="text-xs text-slate-400">Total Bounty Pool</div>
              <div className="text-xl font-bold font-mono tabular-nums text-cyan-400">
                {totalXpAvailable} <span className="text-xs font-normal text-slate-500">XP</span>
              </div>
            </div>
            <div>
              <div className="text-xs text-slate-400">Auditor Status</div>
              <div className="text-xl font-bold font-mono text-emerald-400 truncate">
                {progress.rankTitle}
              </div>
            </div>
            <div>
              <div className="text-xs text-slate-400">Execution Backend</div>
              <button
                onClick={onOpenDockerSpec}
                className="text-sm font-semibold text-cyan-400 hover:text-cyan-300 transition-colors flex items-center gap-1 mt-1"
              >
                <span>Foundry Forge</span>
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Tiered Curriculum Level Tabs */}
      <div className="space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <Layers className="h-4 w-4 text-cyan-400" />
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-200">
              Curriculum Progression Tiers
            </h2>
          </div>
          <div className="text-xs text-slate-400">
            {filteredChallenges.length} {filteredChallenges.length === 1 ? 'Lab' : 'Labs'} available
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 p-1.5 bg-slate-900/90 border border-slate-800 rounded-xl text-xs font-medium">
          <button
            onClick={() => setSelectedLevel('all')}
            className={`py-2 px-3 rounded-lg transition-colors text-left flex items-center justify-between ${
              selectedLevel === 'all'
                ? 'bg-cyan-950 text-cyan-300 font-semibold border border-cyan-800/80 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <span>All Levels</span>
            <span className="font-mono text-[11px] text-slate-500">{CHALLENGES.length}</span>
          </button>
          <button
            onClick={() => setSelectedLevel(0)}
            className={`py-2 px-3 rounded-lg transition-colors text-left flex items-center justify-between ${
              selectedLevel === 0
                ? 'bg-cyan-950 text-cyan-300 font-semibold border border-cyan-800/80 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <div>
              <div className="font-bold">Level 0: Basics</div>
              <div className="text-[10px] text-slate-400">Syntax & Transfers</div>
            </div>
            <span className="font-mono text-[11px] text-slate-500">
              {CHALLENGES.filter((c) => c.curriculumLevel === 0).length}
            </span>
          </button>
          <button
            onClick={() => setSelectedLevel(1)}
            className={`py-2 px-3 rounded-lg transition-colors text-left flex items-center justify-between ${
              selectedLevel === 1
                ? 'bg-cyan-950 text-cyan-300 font-semibold border border-cyan-800/80 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <div>
              <div className="font-bold">Level 1: CTFs</div>
              <div className="text-[10px] text-slate-400">Ethernaut Security</div>
            </div>
            <span className="font-mono text-[11px] text-slate-500">
              {CHALLENGES.filter((c) => c.curriculumLevel === 1).length}
            </span>
          </button>
          <button
            onClick={() => setSelectedLevel(2)}
            className={`py-2 px-3 rounded-lg transition-colors text-left flex items-center justify-between ${
              selectedLevel === 2
                ? 'bg-cyan-950 text-cyan-300 font-semibold border border-cyan-800/80 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <div>
              <div className="font-bold">Level 2: DeFi</div>
              <div className="text-[10px] text-slate-400">Flash Loans & Oracles</div>
            </div>
            <span className="font-mono text-[11px] text-slate-500">
              {CHALLENGES.filter((c) => c.curriculumLevel === 2).length}
            </span>
          </button>
        </div>
      </div>

      {/* Filter and Search Controls */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        {/* Segmented Category Buttons */}
        <div className="flex items-center gap-1 overflow-x-auto p-1 bg-slate-900 border border-slate-800 rounded-lg text-xs font-medium">
          <button
            onClick={() => setSelectedCategory('all')}
            className={`px-3 py-1.5 rounded transition-colors whitespace-nowrap ${
              selectedCategory === 'all'
                ? 'bg-cyan-950 text-cyan-300 font-semibold border border-cyan-800/80'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            All Categories
          </button>
          <button
            onClick={() => setSelectedCategory('swc')}
            className={`px-3 py-1.5 rounded transition-colors whitespace-nowrap flex items-center gap-1.5 ${
              selectedCategory === 'swc'
                ? 'bg-cyan-950 text-cyan-300 font-semibold border border-cyan-800/80'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Shield className="h-3.5 w-3.5 text-cyan-400" />
            <span>SWC Registry</span>
            <span className="font-mono text-[10px] px-1 py-0.2 bg-cyan-950/80 border border-cyan-800/40 rounded text-cyan-300">
              {CHALLENGES.filter((c) => c.swcTag.startsWith('SWC-')).length}
            </span>
          </button>
          <button
            onClick={() => setSelectedCategory('access-control')}
            className={`px-3 py-1.5 rounded transition-colors whitespace-nowrap ${
              selectedCategory === 'access-control'
                ? 'bg-cyan-950 text-cyan-300 font-semibold border border-cyan-800/80'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Access Control
          </button>
          <button
            onClick={() => setSelectedCategory('defi')}
            className={`px-3 py-1.5 rounded transition-colors whitespace-nowrap ${
              selectedCategory === 'defi'
                ? 'bg-cyan-950 text-cyan-300 font-semibold border border-cyan-800/80'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            DeFi & Reentrancy
          </button>
          <button
            onClick={() => setSelectedCategory('oracles')}
            className={`px-3 py-1.5 rounded transition-colors whitespace-nowrap ${
              selectedCategory === 'oracles'
                ? 'bg-cyan-950 text-cyan-300 font-semibold border border-cyan-800/80'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Oracles & Flash Loans
          </button>
          <button
            onClick={() => setSelectedCategory('low-level')}
            className={`px-3 py-1.5 rounded transition-colors whitespace-nowrap ${
              selectedCategory === 'low-level'
                ? 'bg-cyan-950 text-cyan-300 font-semibold border border-cyan-800/80'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Low-Level EVM
          </button>
          <button
            onClick={() => setSelectedCategory('math-logic')}
            className={`px-3 py-1.5 rounded transition-colors whitespace-nowrap ${
              selectedCategory === 'math-logic'
                ? 'bg-cyan-950 text-cyan-300 font-semibold border border-cyan-800/80'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Math & Precision
          </button>
        </div>

        {/* Search Input */}
        <div className="relative min-w-[240px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by title, tag, SWC..."
            className="w-full rounded-lg bg-slate-900 border border-slate-800 pl-9 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
          />
        </div>
      </div>

      {/* Challenge Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filteredChallenges.map((challenge, index) => {
          const solved = isChallengeSolved(challenge.id);

          return (
            <div
              key={challenge.id}
              className={`flex flex-col justify-between rounded-xl border p-5 transition-all duration-200 ${
                solved
                  ? 'border-emerald-900/60 bg-[#0d161d]'
                  : 'border-slate-800 bg-[#0d131f] hover:border-slate-700 hover:bg-[#101726]'
              }`}
            >
              <div className="space-y-3">
                {/* Clean unboxed metadata header */}
                <div className="flex items-center justify-between text-xs text-slate-400">
                  <div className="flex items-center gap-1.5">
                    <span className="font-semibold text-cyan-300">
                      {getLevelLabel(challenge.curriculumLevel)}
                    </span>
                    <span aria-hidden="true">·</span>
                    <span className={`capitalize font-semibold ${getDifficultyColor(challenge.difficulty)}`}>
                      {challenge.difficulty}
                    </span>
                    <span aria-hidden="true">·</span>
                    <span className="font-mono text-slate-400">{challenge.swcTag}</span>
                  </div>

                  {solved && (
                    <div className="flex items-center gap-1 text-emerald-400 text-xs font-semibold">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      <span>Solved</span>
                    </div>
                  )}
                </div>

                {/* Challenge Title */}
                <h3 className="text-lg font-bold text-white tracking-tight leading-snug">
                  {index + 1}. {challenge.title}
                </h3>

                {/* Description */}
                <p className="text-xs text-slate-300 line-clamp-3 leading-relaxed">
                  {challenge.description}
                </p>

                {/* Tags */}
                {challenge.tags && challenge.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pt-1 text-[11px] text-slate-400 font-mono">
                    {challenge.tags.map((tag) => (
                      <span key={tag} className="text-slate-400">
                        #{tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Card Footer: XP, Time, and CTA */}
              <div className="mt-5 pt-4 border-t border-slate-800/60 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3 text-xs text-slate-400 font-mono tabular-nums">
                  <div className="flex items-center gap-1 text-cyan-300 font-semibold">
                    <Zap className="h-3.5 w-3.5 text-cyan-400" />
                    <span>+{challenge.xpReward} XP</span>
                  </div>
                  <span aria-hidden="true">·</span>
                  <div className="flex items-center gap-1">
                    <Clock className="h-3 w-3 text-slate-500" />
                    <span>{challenge.estimatedMinutes}m</span>
                  </div>
                </div>

                <button
                  onClick={() => onSelectChallenge(challenge)}
                  className={`flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors whitespace-nowrap ${
                    solved
                      ? 'bg-emerald-950 text-emerald-300 hover:bg-emerald-900 border border-emerald-800/50'
                      : 'bg-cyan-600 text-white hover:bg-cyan-500 shadow-sm'
                  }`}
                >
                  <span>{solved ? 'Review Exploit' : 'Launch Lab'}</span>
                  <ChevronRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
