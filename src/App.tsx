import React, { useState } from 'react';
import { AuthProvider } from './context/AuthContext';
import { ProgressProvider, useProgress } from './context/ProgressContext';
import { Navbar, NavTab } from './components/Navbar';
import { ChallengeList } from './components/ChallengeList';
import { LabWorkspace } from './components/IDE/LabWorkspace';
import { LeaderboardView } from './components/LeaderboardView';
import { BadgesView } from './components/BadgesView';
import { DockerSpecModal } from './components/DockerSpecModal';
import { FlagCaptureModal } from './components/FlagCaptureModal';
import { Challenge, ExecutionResult } from './types';
import { CHALLENGES } from './data/challenges';

function MainContent() {
  const [currentTab, setCurrentTab] = useState<NavTab>('challenges');
  const [selectedChallenge, setSelectedChallenge] = useState<Challenge | null>(null);
  const [isDockerSpecOpen, setIsDockerSpecOpen] = useState(false);

  // Flag capture modal state
  const [captureModalState, setCaptureModalState] = useState<{
    isOpen: boolean;
    challenge: Challenge;
    flag: string;
    earnedXp: number;
    unlockedBadgeIds: string[];
    result: ExecutionResult;
  } | null>(null);

  const { recordSolve } = useProgress();

  const handleSelectChallenge = (challenge: Challenge) => {
    setSelectedChallenge(challenge);
  };

  const handleBackToCatalog = () => {
    setSelectedChallenge(null);
  };

  const handleExploitSolved = (flag: string, result: ExecutionResult) => {
    if (!selectedChallenge) return;
    const { earnedXp, unlockedBadges } = recordSolve(selectedChallenge.id);

    setCaptureModalState({
      isOpen: true,
      challenge: selectedChallenge,
      flag,
      earnedXp,
      unlockedBadgeIds: unlockedBadges,
      result,
    });
  };

  const handleNextChallenge = () => {
    if (!selectedChallenge) return;
    const currentIndex = CHALLENGES.findIndex((c) => c.id === selectedChallenge.id);
    const nextChallenge = CHALLENGES[(currentIndex + 1) % CHALLENGES.length];
    setCaptureModalState(null);
    setSelectedChallenge(nextChallenge);
  };

  const handleViewLeaderboardFromModal = () => {
    setCaptureModalState(null);
    setSelectedChallenge(null);
    setCurrentTab('leaderboard');
  };

  return (
    <div className="min-h-screen bg-[#090d16] text-slate-100 flex flex-col font-sans">
      <Navbar
        currentTab={currentTab}
        onSelectTab={(tab) => {
          setSelectedChallenge(null);
          setCurrentTab(tab);
        }}
        onOpenDockerSpec={() => setIsDockerSpecOpen(true)}
      />

      <main className="flex-1 flex flex-col min-h-0">
        {selectedChallenge ? (
          <LabWorkspace
            challenge={selectedChallenge}
            onBack={handleBackToCatalog}
            onExploitSolved={handleExploitSolved}
          />
        ) : (
          <>
            {currentTab === 'challenges' && (
              <ChallengeList
                onSelectChallenge={handleSelectChallenge}
                onOpenDockerSpec={() => setIsDockerSpecOpen(true)}
              />
            )}
            {currentTab === 'leaderboard' && <LeaderboardView />}
            {currentTab === 'badges' && <BadgesView />}
          </>
        )}
      </main>

      {/* Docker Spec Architecture Modal */}
      <DockerSpecModal
        isOpen={isDockerSpecOpen}
        onClose={() => setIsDockerSpecOpen(false)}
      />

      {/* Flag Capture Celebratory Modal */}
      {captureModalState && (
        <FlagCaptureModal
          isOpen={captureModalState.isOpen}
          challenge={captureModalState.challenge}
          flag={captureModalState.flag}
          earnedXp={captureModalState.earnedXp}
          unlockedBadgeIds={captureModalState.unlockedBadgeIds}
          executionResult={captureModalState.result}
          onClose={() => setCaptureModalState(null)}
          onNextChallenge={handleNextChallenge}
          onViewLeaderboard={handleViewLeaderboardFromModal}
        />
      )}
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <ProgressProvider>
        <MainContent />
      </ProgressProvider>
    </AuthProvider>
  );
}
