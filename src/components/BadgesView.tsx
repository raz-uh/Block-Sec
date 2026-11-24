import React from 'react';
import { BADGES } from '../data/badges';
import { useProgress } from '../context/ProgressContext';
import {
  Award,
  Sword,
  ShieldAlert,
  Shield,
  TrendingUp,
  Key,
  Percent,
  Cpu,
  Sparkles,
  Crown,
  CheckCircle2,
  Lock,
  Zap,
} from 'lucide-react';

export const BadgesView: React.FC = () => {
  const { progress } = useProgress();

  const getIcon = (iconName: string) => {
    switch (iconName) {
      case 'Sword':
        return <Sword className="h-5 w-5" />;
      case 'ShieldAlert':
        return <ShieldAlert className="h-5 w-5" />;
      case 'Shield':
        return <Shield className="h-5 w-5" />;
      case 'Lock':
        return <Lock className="h-5 w-5" />;
      case 'TrendingUp':
        return <TrendingUp className="h-5 w-5" />;
      case 'Key':
        return <Key className="h-5 w-5" />;
      case 'Percent':
        return <Percent className="h-5 w-5" />;
      case 'Cpu':
        return <Cpu className="h-5 w-5" />;
      case 'Sparkles':
        return <Sparkles className="h-5 w-5" />;
      case 'Crown':
        return <Crown className="h-5 w-5" />;
      case 'Zap':
        return <Zap className="h-5 w-5" />;
      default:
        return <Award className="h-5 w-5" />;
    }
  };

  const unlockedCount = progress.unlockedBadgeIds.length;

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <div className="text-xs uppercase tracking-wider font-semibold text-cyan-400">
            Verifiable Whitehat Achievements
          </div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight mt-1 flex items-center gap-2">
            <Award className="h-6 w-6 text-cyan-400" />
            <span>Auditor Badges & Credentials</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Earn cryptographic auditor badges by breaking protocols, identifying zero-days, and mastering smart contract security patterns.
          </p>
        </div>

        <div className="text-right">
          <div className="text-xs text-slate-400">Unlocked Badges</div>
          <div className="text-2xl font-bold font-mono tabular-nums text-cyan-300">
            {unlockedCount} <span className="text-xs font-normal text-slate-500">/ {BADGES.length}</span>
          </div>
        </div>
      </div>

      {/* Badges Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {BADGES.map((badge) => {
          const isUnlocked = progress.unlockedBadgeIds.includes(badge.id);

          return (
            <div
              key={badge.id}
              className={`flex flex-col justify-between rounded-xl border p-4 transition-all ${
                isUnlocked
                  ? 'border-cyan-800/80 bg-gradient-to-b from-[#0f1b2b] to-[#0c1421]'
                  : 'border-slate-800/80 bg-[#0a0f19] opacity-75'
              }`}
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div
                    className={`flex h-10 w-10 items-center justify-center rounded-lg border ${
                      isUnlocked
                        ? 'bg-cyan-950 border-cyan-700/60 text-cyan-300 shadow-sm'
                        : 'bg-slate-900 border-slate-800 text-slate-600'
                    }`}
                  >
                    {getIcon(badge.icon)}
                  </div>

                  {isUnlocked ? (
                    <div className="flex items-center gap-1 text-[11px] font-semibold text-emerald-400">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      <span>Unlocked</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1 text-[11px] text-slate-500">
                      <Lock className="h-3.5 w-3.5" />
                      <span>Locked</span>
                    </div>
                  )}
                </div>

                <div>
                  <h3 className={`text-sm font-bold ${isUnlocked ? 'text-white' : 'text-slate-400'}`}>
                    {badge.title}
                  </h3>
                  <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                    {badge.description}
                  </p>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-800/60 text-[10px] text-slate-500 uppercase tracking-wider font-mono">
                Category: <span className="text-slate-400 font-semibold">{badge.category}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
