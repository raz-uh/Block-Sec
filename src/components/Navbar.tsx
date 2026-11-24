import React, { useState } from 'react';
import {
  Shield,
  Trophy,
  Award,
  Terminal,
  RotateCcw,
  LogIn,
  LogOut,
  User as UserIcon,
  Cloud,
  Check,
  ChevronDown,
  Sparkles,
} from 'lucide-react';
import { useProgress } from '../context/ProgressContext';
import { useAuth } from '../context/AuthContext';
import { AuthModal } from './AuthModal';

export type NavTab = 'challenges' | 'leaderboard' | 'badges' | 'docker-spec';

interface NavbarProps {
  currentTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  onOpenDockerSpec: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ currentTab, onSelectTab, onOpenDockerSpec }) => {
  const { progress, resetProgress, currentUserRank, isSyncing } = useProgress();
  const { user, signOutUser } = useAuth();

  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authModalMode, setAuthModalMode] = useState<'signin' | 'signup'>('signin');
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);

  const openAuth = (mode: 'signin' | 'signup') => {
    setAuthModalMode(mode);
    setIsAuthModalOpen(true);
    setIsProfileMenuOpen(false);
  };

  return (
    <>
      <header className="sticky top-0 z-40 w-full border-b border-slate-800 bg-[#090d16]/95 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
          {/* Zone 1: Brand Wordmark */}
          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={() => onSelectTab('challenges')}
              className="flex items-center gap-2.5 text-left group focus-visible:outline-none"
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-cyan-950 border border-cyan-800/60 text-cyan-400 group-hover:border-cyan-500 transition-colors">
                <Shield className="h-4 w-4" />
              </div>
              <div>
                <span className="text-base font-bold tracking-tight text-white group-hover:text-cyan-300 transition-colors whitespace-nowrap">
                  BlockSecLab
                </span>
                <span className="hidden sm:inline-block ml-2 text-[11px] text-slate-400 tracking-wide">
                  Web3 Security CTF
                </span>
              </div>
            </button>
          </div>

          {/* Zone 2: Navigation Links */}
          <nav className="hidden md:flex items-center gap-6 text-sm font-medium">
            <button
              onClick={() => onSelectTab('challenges')}
              className={`whitespace-nowrap transition-colors pb-1 border-b-2 ${
                currentTab === 'challenges'
                  ? 'border-cyan-400 text-cyan-300 font-semibold'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              Challenges
            </button>
            <button
              onClick={() => onSelectTab('leaderboard')}
              className={`flex items-center gap-1.5 whitespace-nowrap transition-colors pb-1 border-b-2 ${
                currentTab === 'leaderboard'
                  ? 'border-cyan-400 text-cyan-300 font-semibold'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <Trophy className="h-3.5 w-3.5" />
              <span>Leaderboard</span>
            </button>
            <button
              onClick={() => onSelectTab('badges')}
              className={`flex items-center gap-1.5 whitespace-nowrap transition-colors pb-1 border-b-2 ${
                currentTab === 'badges'
                  ? 'border-cyan-400 text-cyan-300 font-semibold'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <Award className="h-3.5 w-3.5" />
              <span>Badges</span>
              {progress.unlockedBadgeIds.length > 0 && (
                <span className="ml-1 text-[10px] font-bold px-1.5 py-0.2 rounded bg-cyan-950 text-cyan-300 border border-cyan-800/50">
                  {progress.unlockedBadgeIds.length}
                </span>
              )}
            </button>
            <button
              onClick={onOpenDockerSpec}
              className="flex items-center gap-1.5 whitespace-nowrap text-slate-400 hover:text-cyan-300 transition-colors pb-1 border-b-2 border-transparent"
            >
              <Terminal className="h-3.5 w-3.5 text-cyan-400" />
              <span>Docker Engine Spec</span>
            </button>
          </nav>

          {/* Zone 3: Auditor Status, Sync & Auth */}
          <div className="flex items-center gap-3 shrink-0">
            {/* Status indicators */}
            <div className="hidden sm:flex items-center gap-3 text-xs">
              <div className="text-right">
                <div className="text-[11px] text-slate-400 flex items-center justify-end gap-1">
                  <span>{progress.rankTitle}</span>
                  {isSyncing && (
                    <span title="Syncing to cloud...">
                      <Cloud className="h-3 w-3 text-cyan-400 animate-pulse" />
                    </span>
                  )}
                </div>
                <div className="font-mono tabular-nums font-semibold text-cyan-300">
                  {progress.totalXp.toLocaleString()} <span className="text-[10px] text-slate-400 font-normal">XP</span>
                </div>
              </div>
              <div className="h-8 w-px bg-slate-800" />
              <div className="text-right">
                <div className="text-[11px] text-slate-400">Rank</div>
                <div className="font-mono tabular-nums font-semibold text-emerald-400">
                  #{currentUserRank}
                </div>
              </div>
            </div>

            {/* User Auth Section */}
            {user ? (
              <div className="relative">
                <button
                  onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
                  className="flex items-center gap-2 pl-2 pr-2.5 py-1.5 rounded-xl border border-slate-700 bg-slate-900/90 hover:border-cyan-500/60 transition-all text-xs"
                >
                  {user.photoURL ? (
                    <img
                      src={user.photoURL}
                      alt={user.displayName || 'User'}
                      className="h-6 w-6 rounded-full border border-cyan-400/50"
                    />
                  ) : (
                    <div className="h-6 w-6 rounded-full bg-cyan-950 border border-cyan-800/80 flex items-center justify-center text-cyan-300 text-[11px] font-bold">
                      {(user.displayName || user.email || 'W')[0].toUpperCase()}
                    </div>
                  )}
                  <span className="font-medium text-slate-200 max-w-[100px] truncate hidden sm:inline">
                    {user.displayName || user.email?.split('@')[0]}
                  </span>
                  <ChevronDown className="h-3 w-3 text-slate-400" />
                </button>

                {/* Dropdown Menu */}
                {isProfileMenuOpen && (
                  <div className="absolute right-0 mt-2 w-56 rounded-xl border border-slate-800 bg-[#0d131f] p-2 shadow-2xl z-50 text-xs">
                    <div className="px-3 py-2 border-b border-slate-800/80 mb-1">
                      <div className="font-semibold text-white truncate">
                        {user.displayName || 'Whitehat Auditor'}
                      </div>
                      <div className="text-[11px] text-slate-400 truncate">{user.email}</div>
                      <div className="mt-1 flex items-center gap-1.5 text-[10px] text-emerald-400">
                        <Check className="h-3 w-3" />
                        <span>Cloud Database Synced</span>
                      </div>
                    </div>

                    <div className="px-3 py-1.5 text-slate-400 text-[11px]">
                      Security Rank:{' '}
                      <span className="text-cyan-300 font-semibold">{progress.rankTitle}</span>
                    </div>
                    <div className="px-3 py-1.5 text-slate-400 text-[11px]">
                      XP Balance:{' '}
                      <span className="font-mono text-cyan-300 font-bold">{progress.totalXp} XP</span>
                    </div>

                    <div className="border-t border-slate-800/80 my-1" />

                    <button
                      onClick={() => {
                        setIsProfileMenuOpen(false);
                        signOutUser();
                      }}
                      className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-rose-400 hover:bg-rose-950/30 transition-colors"
                    >
                      <LogOut className="h-3.5 w-3.5" />
                      <span>Sign Out</span>
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => openAuth('signin')}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-cyan-800/60 bg-cyan-950/40 hover:bg-cyan-900/50 text-cyan-300 text-xs font-semibold transition-all hover:border-cyan-500 shadow-sm"
                >
                  <LogIn className="h-3.5 w-3.5" />
                  <span>Sign In</span>
                </button>
                <button
                  onClick={() => openAuth('signup')}
                  className="hidden sm:flex items-center gap-1 px-3 py-1.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-bold transition-all shadow-md shadow-cyan-950"
                >
                  <Sparkles className="h-3.5 w-3.5" />
                  <span>Register</span>
                </button>
              </div>
            )}

            <button
              onClick={() => {
                if (window.confirm('Reset local progress and start fresh?')) {
                  resetProgress();
                }
              }}
              title="Reset progress"
              className="p-1.5 text-slate-500 hover:text-slate-300 hover:bg-slate-800 rounded transition-colors"
            >
              <RotateCcw className="h-4 w-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Auth Modal */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        initialMode={authModalMode}
      />
    </>
  );
};
