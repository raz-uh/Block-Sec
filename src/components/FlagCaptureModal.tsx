import React, { useEffect, useState } from 'react';
import confetti from 'canvas-confetti';
import { Challenge, ExecutionResult } from '../types';
import { BADGES } from '../data/badges';
import { Trophy, Check, Copy, Award, ArrowRight, ShieldCheck, X } from 'lucide-react';

interface FlagCaptureModalProps {
  challenge: Challenge;
  flag: string;
  earnedXp: number;
  unlockedBadgeIds: string[];
  executionResult: ExecutionResult;
  isOpen: boolean;
  onClose: () => void;
  onNextChallenge?: () => void;
  onViewLeaderboard: () => void;
}

export const FlagCaptureModal: React.FC<FlagCaptureModalProps> = ({
  challenge,
  flag,
  earnedXp,
  unlockedBadgeIds,
  executionResult,
  isOpen,
  onClose,
  onNextChallenge,
  onViewLeaderboard,
}) => {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (isOpen) {
      try {
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 },
          colors: ['#06b6d4', '#10b981', '#f59e0b', '#38bdf8'],
        });
      } catch {
        // ignore
      }
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(flag);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const unlockedBadges = BADGES.filter((b) => unlockedBadgeIds.includes(b.id));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <div className="relative w-full max-w-lg rounded-2xl border border-emerald-700/60 bg-gradient-to-b from-[#0e1d20] to-[#0a1219] p-6 shadow-2xl text-center space-y-5 animate-in fade-in zoom-in-95 duration-200">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute right-4 top-4 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800"
        >
          <X className="h-4 w-4" />
        </button>

        {/* Trophy Icon */}
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-950 border border-emerald-600/60 text-emerald-400 shadow-lg shadow-emerald-950/50">
          <ShieldCheck className="h-8 w-8" />
        </div>

        {/* Title */}
        <div className="space-y-1">
          <div className="text-xs font-mono uppercase tracking-wider text-emerald-400 font-bold">
            Foundry Invariants Satisfied · Exploit Verified
          </div>
          <h2 className="text-xl font-extrabold text-white tracking-tight">
            Proof Flag Captured!
          </h2>
          <p className="text-xs text-slate-300">
            You successfully exploited <span className="text-white font-semibold">{challenge.title}</span> and bypassed protocol defenses.
          </p>
        </div>

        {/* Flag Box */}
        <div className="p-3.5 rounded-xl border border-emerald-800/80 bg-black/50 space-y-1.5">
          <div className="text-[10px] uppercase font-mono text-slate-400">Cryptographic CTF Flag</div>
          <div className="flex items-center justify-between gap-2">
            <span className="font-mono text-xs font-bold text-emerald-300 select-all truncate">
              {flag}
            </span>
            <button
              onClick={handleCopy}
              className="flex items-center gap-1 px-2.5 py-1 rounded bg-emerald-900/60 hover:bg-emerald-800 text-emerald-200 text-xs font-medium transition-colors shrink-0"
            >
              {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
              <span>{copied ? 'Copied' : 'Copy'}</span>
            </button>
          </div>
        </div>

        {/* Rewards Summary */}
        <div className="grid grid-cols-2 gap-3 py-1">
          <div className="p-2.5 rounded-lg border border-slate-800 bg-slate-900/60 text-center">
            <div className="text-[11px] text-slate-400">Bounty Reward</div>
            <div className="text-lg font-bold font-mono text-cyan-300 tabular-nums">
              +{earnedXp > 0 ? earnedXp : challenge.xpReward} XP
            </div>
          </div>
          <div className="p-2.5 rounded-lg border border-slate-800 bg-slate-900/60 text-center">
            <div className="text-[11px] text-slate-400">Execution Gas</div>
            <div className="text-lg font-bold font-mono text-white tabular-nums">
              {executionResult.gasUsed.toLocaleString()}
            </div>
          </div>
        </div>

        {/* Newly Unlocked Badges */}
        {unlockedBadges.length > 0 && (
          <div className="p-3 rounded-xl border border-cyan-800/60 bg-cyan-950/20 text-left space-y-2">
            <div className="text-[11px] font-bold text-cyan-300 flex items-center gap-1.5">
              <Award className="h-4 w-4" />
              <span>New Auditor Badge Unlocked!</span>
            </div>
            {unlockedBadges.map((badge) => (
              <div key={badge.id} className="flex items-center gap-2 text-xs text-white font-medium">
                <span className="h-2 w-2 rounded-full bg-cyan-400" />
                <span>{badge.title}</span>
                <span className="text-[10px] text-slate-400 font-normal">— {badge.description}</span>
              </div>
            ))}
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center gap-2 pt-2">
          {onNextChallenge && (
            <button
              onClick={onNextChallenge}
              className="w-full flex items-center justify-center gap-1.5 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-xl transition-colors shadow-sm"
            >
              <span>Next Challenge</span>
              <ArrowRight className="h-4 w-4" />
            </button>
          )}
          <button
            onClick={onViewLeaderboard}
            className="w-full flex items-center justify-center gap-1.5 px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold rounded-xl transition-colors"
          >
            <Trophy className="h-4 w-4 text-amber-400" />
            <span>View Standings</span>
          </button>
          <button
            onClick={onClose}
            className="w-full py-2.5 text-xs font-semibold text-slate-400 hover:text-white transition-colors"
          >
            Review PoC
          </button>
        </div>
      </div>
    </div>
  );
};
