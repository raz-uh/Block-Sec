import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../services/firebase';
import { useAuth } from './AuthContext';
import { UserProgress, AuditorRank, LeaderboardUser } from '../types';
import { CHALLENGES } from '../data/challenges';
import { INITIAL_LEADERBOARD } from '../data/leaderboard';

interface ProgressContextType {
  progress: UserProgress;
  leaderboard: LeaderboardUser[];
  unlockHint: (challengeId: string, hintId: string, costXp: number) => boolean;
  isHintUnlocked: (hintId: string) => boolean;
  recordSolve: (challengeId: string) => { earnedXp: number; unlockedBadges: string[] };
  isChallengeSolved: (challengeId: string) => boolean;
  resetProgress: () => void;
  currentUserRank: number;
  isSyncing: boolean;
}

const STORAGE_KEY = 'blockseclab_progress_v2';

export function calculateRank(xp: number): AuditorRank {
  if (xp >= 1500) return 'Apex Sovereign Auditor';
  if (xp >= 1000) return 'Lead Security Researcher';
  if (xp >= 500) return 'Protocol Whitehat';
  if (xp >= 200) return 'Junior Auditor';
  return 'Script Kiddie';
}

const defaultProgress: UserProgress = {
  userId: 'usr_whitehat_anon',
  username: '0xWhitehat',
  totalXp: 100, // Give starting XP so learners can explore hints right away
  rankTitle: 'Script Kiddie',
  completedChallengeIds: [],
  unlockedHintIds: [],
  unlockedBadgeIds: [],
  submissionsCount: 0,
};

const ProgressContext = createContext<ProgressContextType | null>(null);

export const ProgressProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [isSyncing, setIsSyncing] = useState<boolean>(false);

  const [progress, setProgress] = useState<UserProgress>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        return {
          ...defaultProgress,
          ...parsed,
          rankTitle: calculateRank(parsed.totalXp ?? defaultProgress.totalXp),
        };
      }
    } catch {
      // Fallback
    }
    return defaultProgress;
  });

  // Helper to save to Firestore for authenticated user
  const syncToFirestore = useCallback(async (state: UserProgress, currentUid: string, userEmail?: string | null) => {
    setIsSyncing(true);
    const path = `users/${currentUid}`;
    try {
      const userDocRef = doc(db, 'users', currentUid);
      await setDoc(
        userDocRef,
        {
          userId: currentUid,
          email: userEmail || `${currentUid}@blockseclab.local`,
          displayName: state.username.slice(0, 100),
          photoURL: (user?.photoURL || '').slice(0, 1024),
          xp: Math.max(0, Math.floor(state.totalXp)),
          rank: state.rankTitle.slice(0, 64),
          completedChallenges: state.completedChallengeIds.slice(0, 500),
          unlockedHints: state.unlockedHintIds.slice(0, 1000),
          badges: state.unlockedBadgeIds.slice(0, 100),
          updatedAt: new Date().toISOString(),
        },
        { merge: true }
      );
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, path);
    } finally {
      setIsSyncing(false);
    }
  }, [user]);

  // Sync user profile from Firestore when auth changes
  useEffect(() => {
    if (!user) {
      // Logged out: keep local progress or fallback username
      return;
    }

    const loadUserData = async () => {
      setIsSyncing(true);
      const path = `users/${user.uid}`;
      try {
        const docRef = doc(db, 'users', user.uid);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          const data = docSnap.data();
          const remoteXp = typeof data.xp === 'number' ? data.xp : progress.totalXp;
          const remoteCompleted = Array.isArray(data.completedChallenges) ? data.completedChallenges : [];
          const remoteHints = Array.isArray(data.unlockedHints) ? data.unlockedHints : [];
          const remoteBadges = Array.isArray(data.badges) ? data.badges : [];

          // Merge local and remote completed/hints
          const mergedCompleted = Array.from(new Set([...progress.completedChallengeIds, ...remoteCompleted]));
          const mergedHints = Array.from(new Set([...progress.unlockedHintIds, ...remoteHints]));
          const mergedBadges = Array.from(new Set([...progress.unlockedBadgeIds, ...remoteBadges]));
          const mergedXp = Math.max(progress.totalXp, remoteXp);

          const updatedState: UserProgress = {
            userId: user.uid,
            username: user.displayName || data.displayName || user.email?.split('@')[0] || 'Whitehat',
            totalXp: mergedXp,
            rankTitle: calculateRank(mergedXp),
            completedChallengeIds: mergedCompleted,
            unlockedHintIds: mergedHints,
            unlockedBadgeIds: mergedBadges,
            submissionsCount: progress.submissionsCount,
          };

          setProgress(updatedState);
          localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedState));
        } else {
          // First time sign-up for this user: initialize Firestore doc
          const username = user.displayName || user.email?.split('@')[0] || 'Whitehat';
          const initialData: UserProgress = {
            ...progress,
            userId: user.uid,
            username,
          };
          setProgress(initialData);
          await syncToFirestore(initialData, user.uid, user.email);
        }
      } catch (err) {
        console.error('Failed to load user profile from Firestore:', err);
      } finally {
        setIsSyncing(false);
      }
    };

    loadUserData();
  }, [user]);

  // Persist to local storage on change
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
    } catch {
      // ignore
    }
  }, [progress]);

  const isHintUnlocked = (hintId: string): boolean => {
    return progress.unlockedHintIds.includes(hintId);
  };

  const unlockHint = (_challengeId: string, hintId: string, costXp: number): boolean => {
    if (progress.unlockedHintIds.includes(hintId)) return true;

    // Deduct cost from total XP (floor at 0)
    const nextXp = Math.max(0, progress.totalXp - costXp);
    const updated: UserProgress = {
      ...progress,
      totalXp: nextXp,
      rankTitle: calculateRank(nextXp),
      unlockedHintIds: [...progress.unlockedHintIds, hintId],
    };

    setProgress(updated);

    if (user) {
      syncToFirestore(updated, user.uid, user.email).catch(() => {});
    }

    return true;
  };

  const isChallengeSolved = (challengeId: string): boolean => {
    return progress.completedChallengeIds.includes(challengeId);
  };

  const recordSolve = (challengeId: string): { earnedXp: number; unlockedBadges: string[] } => {
    const challenge = CHALLENGES.find((c) => c.id === challengeId);
    if (!challenge) return { earnedXp: 0, unlockedBadges: [] };

    const alreadySolved = progress.completedChallengeIds.includes(challengeId);
    const newCompleted = alreadySolved ? progress.completedChallengeIds : [...progress.completedChallengeIds, challengeId];

    // Calculate XP reward: Base XP
    let earnedXp = 0;
    if (!alreadySolved) {
      earnedXp = challenge.xpReward;
    }

    const nextTotalXp = progress.totalXp + earnedXp;
    const nextRank = calculateRank(nextTotalXp);

    // Evaluate newly unlocked badges
    const newlyUnlockedBadges: string[] = [];
    const currentBadges = new Set(progress.unlockedBadgeIds);

    // 1. First Blood
    if (newCompleted.length >= 1 && !currentBadges.has('badge-first-blood')) {
      newlyUnlockedBadges.push('badge-first-blood');
    }

    // 2. Challenge-specific badges
    if (challenge.slug === 'reentrancy-vault' && !currentBadges.has('badge-reentrancy-slayer')) {
      newlyUnlockedBadges.push('badge-reentrancy-slayer');
    }
    if (challenge.slug === 'oracle-manipulation' && !currentBadges.has('badge-flash-arbitrageur')) {
      newlyUnlockedBadges.push('badge-flash-arbitrageur');
    }
    if (challenge.slug === 'uninitialized-proxy-ownership' && !currentBadges.has('badge-proxy-sovereign')) {
      newlyUnlockedBadges.push('badge-proxy-sovereign');
    }
    if (challenge.slug === 'erc4626-share-inflation' && !currentBadges.has('badge-math-auditor')) {
      newlyUnlockedBadges.push('badge-math-auditor');
    }
    if (challenge.slug === 'storage-collision-delegatecall' && !currentBadges.has('badge-storage-master')) {
      newlyUnlockedBadges.push('badge-storage-master');
    }
    if (
      (challenge.slug === 'truster-flashloan-exploit' ||
        challenge.slug === 'side-entrance-flashloan' ||
        challenge.slug === 'naive-receiver-fee-drain') &&
      !currentBadges.has('badge-dvd-conqueror')
    ) {
      newlyUnlockedBadges.push('badge-dvd-conqueror');
    }
    if (challenge.slug === 'swc113-dos-unexpected-revert' && !currentBadges.has('badge-dos-king')) {
      newlyUnlockedBadges.push('badge-dos-king');
    }
    const swcSlugs = [
      'tx-origin-phishing',
      'force-balance-selfdestruct',
      'coinflip-predictable-randomness',
      'swc113-dos-unexpected-revert',
      'swc104-unchecked-call-return',
      'swc101-unchecked-overflow-truncation',
      'swc136-private-storage-leak',
      'swc128-dos-gas-limit',
    ];
    const solvedSwcCount = newCompleted.filter((id) => {
      const ch = CHALLENGES.find((c) => c.id === id);
      return ch && swcSlugs.includes(ch.slug);
    }).length;
    if (solvedSwcCount >= 3 && !currentBadges.has('badge-swc-master')) {
      newlyUnlockedBadges.push('badge-swc-master');
    }

    // 3. Clean Hands Auditor (No hints used for this challenge)
    const challengeHintIds = challenge.hints.map((h) => h.id);
    const usedChallengeHints = challengeHintIds.some((hId) => progress.unlockedHintIds.includes(hId));
    if (!usedChallengeHints && !currentBadges.has('badge-pure-auditor')) {
      newlyUnlockedBadges.push('badge-pure-auditor');
    }

    // 4. Apex Sovereign
    if (newCompleted.length === CHALLENGES.length && !currentBadges.has('badge-apex-sovereign')) {
      newlyUnlockedBadges.push('badge-apex-sovereign');
    }

    const allBadges = [...progress.unlockedBadgeIds, ...newlyUnlockedBadges];

    const updated: UserProgress = {
      ...progress,
      totalXp: nextTotalXp,
      rankTitle: nextRank,
      completedChallengeIds: newCompleted,
      unlockedBadgeIds: allBadges,
      submissionsCount: progress.submissionsCount + 1,
    };

    setProgress(updated);

    if (user) {
      syncToFirestore(updated, user.uid, user.email).catch(() => {});
    }

    return { earnedXp, unlockedBadges: newlyUnlockedBadges };
  };

  const resetProgress = () => {
    localStorage.removeItem(STORAGE_KEY);
    const resetState: UserProgress = {
      ...defaultProgress,
      userId: user?.uid || defaultProgress.userId,
      username: user?.displayName || user?.email?.split('@')[0] || defaultProgress.username,
    };
    setProgress(resetState);
    if (user) {
      syncToFirestore(resetState, user.uid, user.email).catch(() => {});
    }
  };

  // Build combined leaderboard including current user
  const userAvatar = user?.photoURL || `https://api.dicebear.com/7.x/bottts/svg?seed=${user?.uid || progress.username}`;
  const userEntry: LeaderboardUser = {
    rank: 1,
    username: progress.username,
    avatar: userAvatar,
    xp: progress.totalXp,
    challengesSolved: progress.completedChallengeIds.length,
    badgesCount: progress.unlockedBadgeIds.length,
    auditorTitle: progress.rankTitle,
    lastActive: 'Online',
    isCurrentUser: true,
  };

  const combined = [...INITIAL_LEADERBOARD.filter((u) => u.username !== progress.username), userEntry];
  combined.sort((a, b) => b.xp - a.xp);

  let userRank = 1;
  const rankedLeaderboard: LeaderboardUser[] = combined.map((entry, index) => {
    const rank = index + 1;
    if (entry.isCurrentUser) userRank = rank;
    return { ...entry, rank };
  });

  return (
    <ProgressContext.Provider
      value={{
        progress,
        leaderboard: rankedLeaderboard,
        unlockHint,
        isHintUnlocked,
        recordSolve,
        isChallengeSolved,
        resetProgress,
        currentUserRank: userRank,
        isSyncing,
      }}
    >
      {children}
    </ProgressContext.Provider>
  );
};

export function useProgress() {
  const context = useContext(ProgressContext);
  if (!context) {
    throw new Error('useProgress must be used within a ProgressProvider');
  }
  return context;
}
