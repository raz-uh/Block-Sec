import React, { useState, useEffect } from 'react';
import Editor from '@monaco-editor/react';
import { Challenge, ExecutionResult, TraceStep } from '../../types';
import { FoundryEngine } from '../../services/foundryEngine';
import { useProgress } from '../../context/ProgressContext';
import {
  ArrowLeft,
  Play,
  CheckCircle,
  HelpCircle,
  BookOpen,
  FileCode,
  Terminal as TerminalIcon,
  Activity,
  Layers,
  RotateCcw,
  Sparkles,
  Lock,
  Unlock,
  AlertTriangle,
  ExternalLink,
  ChevronDown,
  ChevronRight,
  Shield,
  Copy,
  Check,
  GraduationCap,
  Coins,
  AlertCircle,
  ArrowRight,
  Info,
} from 'lucide-react';

interface LabWorkspaceProps {
  challenge: Challenge;
  onBack: () => void;
  onExploitSolved: (flag: string, result: ExecutionResult) => void;
}

type EditorTab = 'exploit' | 'target' | 'test';
type LeftTab = 'briefing' | 'theory' | 'hints' | 'debrief';
type TerminalTab = 'console' | 'traces' | 'gas';

export const LabWorkspace: React.FC<LabWorkspaceProps> = ({ challenge, onBack, onExploitSolved }) => {
  const { isHintUnlocked, unlockHint, isChallengeSolved, progress } = useProgress();

  // Code state
  const storageKey = `blockseclab_code_${challenge.id}`;
  const [exploitCode, setExploitCode] = useState<string>(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) return saved;
    } catch {
      // fallback
    }
    return challenge.exploitInitialCode;
  });

  const [activeEditorTab, setActiveEditorTab] = useState<EditorTab>('exploit');
  const [activeLeftTab, setActiveLeftTab] = useState<LeftTab>('briefing');
  const [activeTerminalTab, setActiveTerminalTab] = useState<TerminalTab>('console');

  // Execution state
  const [isRunning, setIsRunning] = useState(false);
  const [executionResult, setExecutionResult] = useState<ExecutionResult | null>(null);
  const [copiedFlag, setCopiedFlag] = useState(false);

  // Multi-tier Progressive Hint State
  const [confirmHint, setConfirmHint] = useState<{
    id: string;
    tier: number;
    title: string;
    costXp: number;
  } | null>(null);
  const [copiedHintId, setCopiedHintId] = useState<string | null>(null);
  const [hintToast, setHintToast] = useState<string | null>(null);

  const canUnlockHint = (hint: { tier: number }) => {
    if (hint.tier <= 1) return true;
    const lowerTierHints = challenge.hints.filter((h) => h.tier < hint.tier);
    return lowerTierHints.every((h) => isHintUnlocked(h.id));
  };

  const handleConfirmUnlock = () => {
    if (!confirmHint) return;
    if (progress.totalXp < confirmHint.costXp) return;

    unlockHint(challenge.id, confirmHint.id, confirmHint.costXp);
    const msg = `Unlocked Tier ${confirmHint.tier} clue: "${confirmHint.title}" (-${confirmHint.costXp} XP)`;
    setHintToast(msg);
    setTimeout(() => setHintToast(null), 3500);
    setConfirmHint(null);
  };

  const handleCopyHintCode = (hintId: string, content: string) => {
    navigator.clipboard.writeText(content);
    setCopiedHintId(hintId);
    setTimeout(() => setCopiedHintId(null), 2000);
  };


  // Auto-save code edits
  useEffect(() => {
    try {
      localStorage.setItem(storageKey, exploitCode);
    } catch {
      // ignore
    }
  }, [storageKey, exploitCode]);

  const solved = isChallengeSolved(challenge.id);

  // Run Foundry Test
  const handleRunTest = async (isSubmission = false) => {
    setIsRunning(true);
    try {
      const result = await FoundryEngine.executeTest(challenge, exploitCode);
      setExecutionResult(result);

      if (result.status === 'PASS' && isSubmission) {
        onExploitSolved(result.flag || challenge.flag, result);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsRunning(false);
    }
  };

  const handleResetCode = () => {
    if (window.confirm('Reset exploit contract to initial challenge template?')) {
      setExploitCode(challenge.exploitInitialCode);
      setActiveEditorTab('exploit');
    }
  };

  const handleLoadSolution = () => {
    if (window.confirm('Load verified exploit solution into editor? (Use this for learning or testing)')) {
      setExploitCode(challenge.exploitSolutionCode);
      setActiveEditorTab('exploit');
    }
  };

  const handleCopyFlag = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedFlag(true);
    setTimeout(() => setCopiedFlag(false), 2000);
  };

  const unlockedHintsCount = challenge.hints.filter((h) => isHintUnlocked(h.id)).length;

  return (
    <div className="flex flex-col h-[calc(100vh-3.5rem)] bg-[#090d16] overflow-hidden">
      {/* Workspace Top Toolbar */}
      <div className="flex items-center justify-between px-4 py-2 bg-[#0d131f] border-b border-slate-800 text-xs shrink-0">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="flex items-center gap-1 text-slate-400 hover:text-white px-2 py-1 rounded hover:bg-slate-800 transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Challenges</span>
          </button>
          <div className="h-4 w-px bg-slate-800" />
          <div className="flex items-center gap-2">
            <span className="font-bold text-white tracking-tight">{challenge.title}</span>
            <span className="text-slate-500">·</span>
            <span className="font-mono text-slate-400">{challenge.swcTag}</span>
            <span className="text-slate-500">·</span>
            <span className="text-cyan-400 font-mono tabular-nums">+{challenge.xpReward} XP</span>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleResetCode}
            title="Reset code"
            className="flex items-center gap-1 px-2.5 py-1 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded transition-colors"
          >
            <RotateCcw className="h-3 w-3" />
            <span className="hidden sm:inline">Reset</span>
          </button>
          <button
            onClick={handleLoadSolution}
            title="Load reference PoC solution"
            className="flex items-center gap-1 px-2.5 py-1 text-cyan-400 hover:text-cyan-300 hover:bg-cyan-950/50 rounded border border-cyan-800/60 transition-colors"
          >
            <Sparkles className="h-3 w-3" />
            <span className="hidden sm:inline">Load Reference PoC</span>
          </button>
          <button
            onClick={() => handleRunTest(false)}
            disabled={isRunning}
            className="flex items-center gap-1.5 px-3 py-1 bg-slate-800 hover:bg-slate-700 text-white font-medium rounded transition-colors disabled:opacity-50"
          >
            <Play className={`h-3 w-3 ${isRunning ? 'animate-spin' : 'fill-white'}`} />
            <span>{isRunning ? 'Running Forge...' : 'Run forge test'}</span>
          </button>
          <button
            onClick={() => handleRunTest(true)}
            disabled={isRunning}
            className="flex items-center gap-1.5 px-3 py-1 bg-cyan-600 hover:bg-cyan-500 text-white font-medium rounded transition-colors shadow-sm disabled:opacity-50"
          >
            <CheckCircle className="h-3 w-3" />
            <span>Submit Solution</span>
          </button>
        </div>
      </div>

      {/* Main 3-Pane Body */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 min-h-0 overflow-hidden">
        {/* PANE 1: Left Briefing & Hints (4 cols) */}
        <div className="lg:col-span-4 flex flex-col border-r border-slate-800 bg-[#0c121d] overflow-hidden">
          {/* Tab Strip */}
          <div className="flex items-center border-b border-slate-800 px-3 bg-[#0a0f19] text-xs">
            <button
              onClick={() => setActiveLeftTab('briefing')}
              className={`flex items-center gap-1.5 px-3 py-2.5 border-b-2 font-medium transition-colors ${
                activeLeftTab === 'briefing'
                  ? 'border-cyan-400 text-cyan-300'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <BookOpen className="h-3.5 w-3.5" />
              <span>Briefing</span>
            </button>
            <button
              onClick={() => setActiveLeftTab('theory')}
              className={`flex items-center gap-1.5 px-3 py-2.5 border-b-2 font-medium transition-colors ${
                activeLeftTab === 'theory'
                  ? 'border-cyan-400 text-cyan-300'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <GraduationCap className="h-3.5 w-3.5" />
              <span>Theory & Concepts</span>
            </button>
            <button
              onClick={() => setActiveLeftTab('hints')}
              className={`flex items-center gap-1.5 px-3 py-2.5 border-b-2 font-medium transition-colors ${
                activeLeftTab === 'hints'
                  ? 'border-cyan-400 text-cyan-300'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <HelpCircle className="h-3.5 w-3.5" />
              <span>Progressive Hints</span>
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded font-mono ${
                  unlockedHintsCount === challenge.hints.length
                    ? 'bg-emerald-950 text-emerald-300 border border-emerald-800/60'
                    : unlockedHintsCount > 0
                    ? 'bg-cyan-950 text-cyan-300 border border-cyan-800/60'
                    : 'bg-slate-800 text-slate-400'
                }`}
              >
                {unlockedHintsCount}/{challenge.hints.length}
              </span>
            </button>
            <button
              onClick={() => setActiveLeftTab('debrief')}
              className={`flex items-center gap-1.5 px-3 py-2.5 border-b-2 font-medium transition-colors ${
                activeLeftTab === 'debrief'
                  ? 'border-cyan-400 text-cyan-300'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <Shield className="h-3.5 w-3.5" />
              <span>Audit Debrief</span>
              {solved && <span className="text-[10px] text-emerald-400 font-bold">✓</span>}
            </button>
          </div>

          {/* Left Content Area */}
          <div className="flex-1 overflow-y-auto p-4 space-y-5 text-slate-300 text-xs leading-relaxed">
            {activeLeftTab === 'briefing' && (
              <div className="space-y-4">
                <div>
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                    Mission Scenario
                  </h3>
                  <p className="mt-1 text-slate-200 leading-relaxed">{challenge.description}</p>
                </div>

                <div className="p-3 rounded-lg border border-slate-800 bg-slate-900/60 space-y-2">
                  <h4 className="text-xs font-semibold text-cyan-300 flex items-center gap-1.5">
                    <Activity className="h-3.5 w-3.5" />
                    <span>Target Protocol Architecture</span>
                  </h4>
                  <p className="text-slate-300 text-[11px]">{challenge.protocolArchitecture}</p>
                </div>

                <div className="p-3 rounded-lg border border-amber-900/40 bg-amber-950/20 space-y-2">
                  <h4 className="text-xs font-semibold text-amber-300 flex items-center gap-1.5">
                    <AlertTriangle className="h-3.5 w-3.5 text-amber-400" />
                    <span>Exploit Objective</span>
                  </h4>
                  <p className="text-amber-200/90 text-[11px] leading-relaxed">
                    {challenge.exploitObjective}
                  </p>
                </div>

                <div>
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                    Historical Precedent
                  </h3>
                  <div className="mt-1 p-3 rounded-lg border border-slate-800 bg-[#0d131f] space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-white">{challenge.historicalCase.protocolName}</span>
                      <span className="text-rose-400 font-mono font-bold">
                        {challenge.historicalCase.lossUsd}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400">{challenge.historicalCase.summary}</p>
                  </div>
                </div>
              </div>
            )}

            {activeLeftTab === 'theory' && (
              <div className="space-y-4">
                {challenge.conceptSummary && challenge.conceptSummary.length > 0 && (
                  <div className="p-3 rounded-lg border border-cyan-800/60 bg-cyan-950/20 space-y-2">
                    <h4 className="text-xs font-bold text-cyan-300 flex items-center gap-1.5">
                      <GraduationCap className="h-4 w-4" />
                      <span>Key Security Principles</span>
                    </h4>
                    <ul className="space-y-1.5 text-[11px] text-slate-300 list-disc list-inside">
                      {challenge.conceptSummary.map((item, i) => (
                        <li key={i}>{item}</li>
                      ))}
                    </ul>
                  </div>
                )}

                <div>
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                    EVM Architecture & Vulnerability Theory
                  </h3>
                  <div className="p-3.5 rounded-lg border border-slate-800 bg-black/30 font-mono text-[11px] text-slate-200 whitespace-pre-wrap leading-relaxed">
                    {challenge.theoryExplanation || 'Theory documentation for this lab is under active development.'}
                  </div>
                </div>

                {challenge.swcTag && (
                  <div className="p-2.5 rounded border border-slate-800 text-[11px] text-slate-400 flex items-center justify-between">
                    <span>SWC Registry Classification:</span>
                    <span className="font-mono font-bold text-cyan-300">{challenge.swcTag}</span>
                  </div>
                )}
              </div>
            )}

            {activeLeftTab === 'hints' && (
              <div className="space-y-4">
                {/* Header Stats Bar */}
                <div className="p-3.5 rounded-xl border border-slate-800 bg-slate-900/60 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 font-bold text-white text-xs">
                      <Sparkles className="h-4 w-4 text-cyan-400" />
                      <span>Multi-Tier Progressive Clues</span>
                    </div>
                    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-cyan-950/80 border border-cyan-800/80 text-cyan-300 font-mono text-[11px] font-semibold">
                      <Coins className="h-3 w-3 text-cyan-400" />
                      <span>{progress.totalXp} XP Available</span>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-[11px] text-slate-400">
                      <span>Clue Progression</span>
                      <span className="font-mono text-cyan-400 font-semibold">
                        {unlockedHintsCount} of {challenge.hints.length} Unlocked
                      </span>
                    </div>
                    <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-cyan-500 to-emerald-400 transition-all duration-300 rounded-full"
                        style={{
                          width: `${(unlockedHintsCount / Math.max(1, challenge.hints.length)) * 100}%`,
                        }}
                      />
                    </div>
                  </div>

                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    Clues unlock sequentially from high-level vulnerability surface flaws to deep EVM storage layout and exploit PoC blueprints.
                  </p>
                </div>

                {/* Toast Notification */}
                {hintToast && (
                  <div className="flex items-center gap-2 p-2.5 rounded-lg bg-emerald-950/50 border border-emerald-800/70 text-emerald-300 text-xs animate-in fade-in duration-200">
                    <Check className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                    <span>{hintToast}</span>
                  </div>
                )}

                {/* Spend XP Confirmation Dialog */}
                {confirmHint && (
                  <div className="p-4 rounded-xl border-2 border-cyan-500/80 bg-slate-900 p-4 space-y-3 shadow-xl shadow-cyan-950/40 animate-in fade-in zoom-in-95 duration-150">
                    <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-white">
                        <AlertCircle className="h-4 w-4 text-cyan-400" />
                        <span>Confirm Clue Unlock</span>
                      </div>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-950 border border-cyan-800 text-cyan-300 uppercase">
                        Tier {confirmHint.tier}
                      </span>
                    </div>

                    <div className="space-y-2 text-xs">
                      <div className="text-slate-200 font-medium">
                        "{confirmHint.title}"
                      </div>
                      <div className="grid grid-cols-3 gap-2 p-2 rounded-lg bg-black/40 border border-slate-800 font-mono text-[11px] text-center">
                        <div>
                          <div className="text-slate-500 text-[10px]">Current XP</div>
                          <div className="text-slate-300 font-semibold">{progress.totalXp}</div>
                        </div>
                        <div>
                          <div className="text-slate-500 text-[10px]">Clue Cost</div>
                          <div className="text-rose-400 font-semibold">-{confirmHint.costXp}</div>
                        </div>
                        <div>
                          <div className="text-slate-500 text-[10px]">Remaining</div>
                          <div className="text-emerald-400 font-semibold">
                            {Math.max(0, progress.totalXp - confirmHint.costXp)}
                          </div>
                        </div>
                      </div>

                      {progress.totalXp < confirmHint.costXp ? (
                        <div className="p-2 rounded bg-amber-950/40 border border-amber-800/60 text-amber-300 text-[11px]">
                          Insufficient XP balance! You need {confirmHint.costXp} XP, but only have {progress.totalXp} XP. Solve earlier CTF challenges to earn more XP.
                        </div>
                      ) : (
                        <div className="text-[11px] text-slate-400">
                          {confirmHint.costXp === 0
                            ? 'This foundation clue is free to unlock.'
                            : `Unlocking will permanently deduct ${confirmHint.costXp} XP from your balance.`}
                        </div>
                      )}
                    </div>

                    <div className="flex items-center justify-end gap-2 pt-1">
                      <button
                        onClick={() => setConfirmHint(null)}
                        className="px-3 py-1.5 rounded-lg text-slate-400 hover:text-slate-200 text-xs hover:bg-slate-800 transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleConfirmUnlock}
                        disabled={progress.totalXp < confirmHint.costXp}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 disabled:opacity-40 text-slate-950 font-bold text-xs transition-colors shadow"
                      >
                        <Unlock className="h-3 w-3" />
                        <span>Spend {confirmHint.costXp} XP & Reveal</span>
                      </button>
                    </div>
                  </div>
                )}

                {/* Progressive Hints List */}
                <div className="space-y-3">
                  {challenge.hints.map((hint) => {
                    const unlocked = isHintUnlocked(hint.id);
                    const canUnlock = canUnlockHint(hint);

                    const tierLabel =
                      hint.tier === 1
                        ? 'Tier 1 · Architectural Surface Flaw'
                        : hint.tier === 2
                        ? 'Tier 2 · EVM Execution Mechanics'
                        : 'Tier 3 · Exploit PoC Blueprint';

                    return (
                      <div
                        key={hint.id}
                        className={`rounded-xl border transition-all ${
                          unlocked
                            ? 'border-cyan-800/80 bg-cyan-950/20 shadow-sm'
                            : canUnlock
                            ? 'border-slate-800 bg-slate-900/50 hover:border-slate-700'
                            : 'border-slate-800/40 bg-black/20 opacity-60'
                        }`}
                      >
                        {/* Clue Header */}
                        <div className="p-3.5 flex items-start justify-between gap-3">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span
                                className={`text-[10px] uppercase font-mono px-2 py-0.5 rounded font-bold ${
                                  hint.tier === 1
                                    ? 'bg-blue-950 text-blue-300 border border-blue-800/60'
                                    : hint.tier === 2
                                    ? 'bg-purple-950 text-purple-300 border border-purple-800/60'
                                    : 'bg-amber-950 text-amber-300 border border-amber-800/60'
                                }`}
                              >
                                Tier {hint.tier}
                              </span>
                              <span className="text-[10px] text-slate-400 font-mono">
                                {tierLabel}
                              </span>
                            </div>
                            <h4 className="text-xs font-semibold text-white">
                              {hint.title}
                            </h4>
                          </div>

                          {/* Action / Status Button */}
                          <div>
                            {unlocked ? (
                              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-950/70 border border-emerald-800/70 text-emerald-300 text-[11px] font-semibold">
                                <Check className="h-3 w-3 text-emerald-400" />
                                <span>Unlocked</span>
                              </div>
                            ) : canUnlock ? (
                              <button
                                onClick={() => setConfirmHint(hint)}
                                className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-bold transition-all shadow-md shadow-cyan-950 hover:scale-[1.02]"
                              >
                                <Unlock className="h-3 w-3" />
                                <span>
                                  {hint.costXp === 0 ? 'Reveal Free' : `Unlock (-${hint.costXp} XP)`}
                                </span>
                              </button>
                            ) : (
                              <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-slate-800/80 text-slate-400 text-[11px]">
                                <Lock className="h-3 w-3 text-slate-500" />
                                <span>Tier {hint.tier - 1} Required</span>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Clue Content */}
                        {unlocked ? (
                          <div className="px-3.5 pb-3.5 pt-1 space-y-2 border-t border-slate-800/60">
                            <div className="relative p-3 rounded-lg bg-black/40 border border-slate-800/80 font-mono text-[11px] text-slate-200 whitespace-pre-wrap leading-relaxed">
                              {hint.content}

                              {/* Copy Button */}
                              <button
                                onClick={() => handleCopyHintCode(hint.id, hint.content)}
                                className="absolute top-2 right-2 flex items-center gap-1 px-2 py-0.5 rounded bg-slate-800/90 hover:bg-slate-700 text-slate-300 text-[10px] transition-colors border border-slate-700"
                                title="Copy clue text"
                              >
                                {copiedHintId === hint.id ? (
                                  <>
                                    <Check className="h-3 w-3 text-emerald-400" />
                                    <span className="text-emerald-300">Copied</span>
                                  </>
                                ) : (
                                  <>
                                    <Copy className="h-3 w-3" />
                                    <span>Copy</span>
                                  </>
                                )}
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="px-3.5 pb-3.5 text-[11px] text-slate-500 italic flex items-center gap-1.5">
                            {canUnlock ? (
                              <>
                                <Info className="h-3.5 w-3.5 text-cyan-500 shrink-0" />
                                <span>Click unlock above to reveal this clue stage for your challenge.</span>
                              </>
                            ) : (
                              <>
                                <Lock className="h-3.5 w-3.5 text-slate-600 shrink-0" />
                                <span>Unlock previous tier clues first to preserve the progressive learning curriculum.</span>
                              </>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {activeLeftTab === 'debrief' && (
              <div className="space-y-4">
                <div>
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-cyan-400">
                    Vulnerability Root Cause Analysis
                  </h3>
                  <p className="mt-1 text-slate-200 text-[11px] leading-relaxed">
                    {challenge.patchDiff.explanation}
                  </p>
                </div>

                {/* Diff Comparison */}
                <div className="space-y-3">
                  <div>
                    <div className="text-[11px] font-semibold text-rose-400 mb-1 flex items-center gap-1">
                      <span>Vulnerable Implementation</span>
                    </div>
                    <pre className="p-2.5 rounded bg-rose-950/20 border border-rose-900/40 text-[11px] text-rose-200 overflow-x-auto font-mono">
                      {challenge.patchDiff.vulnerableCode}
                    </pre>
                  </div>

                  <div>
                    <div className="text-[11px] font-semibold text-emerald-400 mb-1 flex items-center gap-1">
                      <span>Secured / Patched Code</span>
                    </div>
                    <pre className="p-2.5 rounded bg-emerald-950/20 border border-emerald-900/40 text-[11px] text-emerald-200 overflow-x-auto font-mono">
                      {challenge.patchDiff.secureCode}
                    </pre>
                  </div>
                </div>

                <div>
                  <h4 className="text-xs font-semibold text-white mb-2">Auditor Best Practices:</h4>
                  <ul className="space-y-1.5 text-[11px] text-slate-300 list-disc list-inside">
                    {challenge.patchDiff.recommendedBestPractices.map((rec, i) => (
                      <li key={i}>{rec}</li>
                    ))}
                  </ul>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* PANE 2: Center Monaco Editor & Bottom Terminal (8 cols) */}
        <div className="lg:col-span-8 flex flex-col min-h-0 bg-[#090d16]">
          {/* Editor Header / Tab Strip */}
          <div className="flex items-center justify-between border-b border-slate-800 px-3 bg-[#0a0f19] text-xs shrink-0">
            <div className="flex items-center">
              <button
                onClick={() => setActiveEditorTab('exploit')}
                className={`flex items-center gap-1.5 px-3 py-2 border-b-2 font-medium transition-colors ${
                  activeEditorTab === 'exploit'
                    ? 'border-cyan-400 text-cyan-300 bg-slate-900/40'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                <FileCode className="h-3.5 w-3.5 text-cyan-400" />
                <span>{challenge.exploitFileName}</span>
                <span className="text-[10px] text-cyan-400 font-bold ml-0.5">(Your Exploit)</span>
              </button>

              <button
                onClick={() => setActiveEditorTab('target')}
                className={`flex items-center gap-1.5 px-3 py-2 border-b-2 font-medium transition-colors ${
                  activeEditorTab === 'target'
                    ? 'border-cyan-400 text-cyan-300 bg-slate-900/40'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                <Lock className="h-3.5 w-3.5 text-slate-500" />
                <span>{challenge.targetFileName}</span>
                <span className="text-[10px] text-slate-500 ml-0.5">(Target)</span>
              </button>

              <button
                onClick={() => setActiveEditorTab('test')}
                className={`flex items-center gap-1.5 px-3 py-2 border-b-2 font-medium transition-colors ${
                  activeEditorTab === 'test'
                    ? 'border-cyan-400 text-cyan-300 bg-slate-900/40'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                <TerminalIcon className="h-3.5 w-3.5 text-slate-500" />
                <span>{challenge.testFileName}</span>
                <span className="text-[10px] text-slate-500 ml-0.5">(Foundry Test)</span>
              </button>
            </div>

            <div className="text-[11px] text-slate-500 font-mono">
              Solidity 0.8.20 · Foundry Testbed
            </div>
          </div>

          {/* Monaco Editor Container */}
          <div className="flex-1 min-h-[300px] border-b border-slate-800">
            {activeEditorTab === 'exploit' && (
              <Editor
                height="100%"
                defaultLanguage="sol"
                theme="vs-dark"
                value={exploitCode}
                onChange={(val) => setExploitCode(val || '')}
                loading={
                  <div className="flex h-full w-full items-center justify-center bg-[#090d16] text-xs text-slate-400 font-mono">
                    <div className="flex items-center gap-2">
                      <div className="h-3 w-3 animate-spin rounded-full border-2 border-cyan-400 border-t-transparent" />
                      <span>Loading Solidity Exploit Editor...</span>
                    </div>
                  </div>
                }
                options={{
                  fontSize: 13,
                  fontFamily: "'JetBrains Mono', monospace",
                  minimap: { enabled: false },
                  scrollBeyondLastLine: false,
                  lineNumbers: 'on',
                  roundedSelection: false,
                  automaticLayout: true,
                  tabSize: 4,
                  wordWrap: 'on',
                }}
              />
            )}

            {activeEditorTab === 'target' && (
              <Editor
                height="100%"
                defaultLanguage="sol"
                theme="vs-dark"
                value={challenge.targetCode}
                loading={
                  <div className="flex h-full w-full items-center justify-center bg-[#090d16] text-xs text-slate-400 font-mono">
                    <div className="flex items-center gap-2">
                      <div className="h-3 w-3 animate-spin rounded-full border-2 border-cyan-400 border-t-transparent" />
                      <span>Loading Target Contract...</span>
                    </div>
                  </div>
                }
                options={{
                  fontSize: 13,
                  fontFamily: "'JetBrains Mono', monospace",
                  minimap: { enabled: false },
                  scrollBeyondLastLine: false,
                  readOnly: true,
                  automaticLayout: true,
                  tabSize: 4,
                  wordWrap: 'on',
                }}
              />
            )}

            {activeEditorTab === 'test' && (
              <Editor
                height="100%"
                defaultLanguage="sol"
                theme="vs-dark"
                value={challenge.testCode}
                loading={
                  <div className="flex h-full w-full items-center justify-center bg-[#090d16] text-xs text-slate-400 font-mono">
                    <div className="flex items-center gap-2">
                      <div className="h-3 w-3 animate-spin rounded-full border-2 border-cyan-400 border-t-transparent" />
                      <span>Loading Foundry Test Suite...</span>
                    </div>
                  </div>
                }
                options={{
                  fontSize: 13,
                  fontFamily: "'JetBrains Mono', monospace",
                  minimap: { enabled: false },
                  scrollBeyondLastLine: false,
                  readOnly: true,
                  automaticLayout: true,
                  tabSize: 4,
                  wordWrap: 'on',
                }}
              />
            )}
          </div>

          {/* Bottom Pane: Foundry Console & Traces */}
          <div className="h-64 flex flex-col bg-[#070b13] shrink-0">
            {/* Terminal Header */}
            <div className="flex items-center justify-between px-3 border-b border-slate-800 bg-[#0a0f19] text-xs">
              <div className="flex items-center">
                <button
                  onClick={() => setActiveTerminalTab('console')}
                  className={`flex items-center gap-1.5 px-3 py-2 border-b-2 font-medium transition-colors ${
                    activeTerminalTab === 'console'
                      ? 'border-cyan-400 text-cyan-300'
                      : 'border-transparent text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <TerminalIcon className="h-3.5 w-3.5" />
                  <span>Forge Test Output</span>
                  {executionResult && (
                    <span
                      className={`text-[10px] font-bold px-1.5 py-0.2 rounded font-mono ${
                        executionResult.status === 'PASS'
                          ? 'bg-emerald-950 text-emerald-300'
                          : 'bg-rose-950 text-rose-300'
                      }`}
                    >
                      {executionResult.status}
                    </span>
                  )}
                </button>

                <button
                  onClick={() => setActiveTerminalTab('traces')}
                  className={`flex items-center gap-1.5 px-3 py-2 border-b-2 font-medium transition-colors ${
                    activeTerminalTab === 'traces'
                      ? 'border-cyan-400 text-cyan-300'
                      : 'border-transparent text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Layers className="h-3.5 w-3.5" />
                  <span>Call Trace Tree</span>
                  {executionResult?.traces.length ? (
                    <span className="text-[10px] text-slate-400 font-mono">
                      ({executionResult.traces.length})
                    </span>
                  ) : null}
                </button>

                <button
                  onClick={() => setActiveTerminalTab('gas')}
                  className={`flex items-center gap-1.5 px-3 py-2 border-b-2 font-medium transition-colors ${
                    activeTerminalTab === 'gas'
                      ? 'border-cyan-400 text-cyan-300'
                      : 'border-transparent text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Activity className="h-3.5 w-3.5" />
                  <span>Gas Profiler</span>
                </button>
              </div>

              {/* Status summary */}
              <div className="flex items-center gap-3 text-[11px] text-slate-400 font-mono">
                {executionResult && (
                  <>
                    <span>Time: {executionResult.durationMs}ms</span>
                    <span>·</span>
                    <span>Gas: {executionResult.gasUsed.toLocaleString()}</span>
                  </>
                )}
              </div>
            </div>

            {/* Terminal Body */}
            <div className="flex-1 p-3 overflow-y-auto font-mono text-xs">
              {activeTerminalTab === 'console' && (
                <div>
                  {executionResult ? (
                    <pre
                      className={`whitespace-pre-wrap leading-relaxed ${
                        executionResult.status === 'PASS'
                          ? 'text-emerald-300'
                          : executionResult.status === 'COMPILE_ERROR'
                          ? 'text-rose-400'
                          : 'text-amber-200'
                      }`}
                    >
                      {executionResult.stdout}
                    </pre>
                  ) : (
                    <div className="text-slate-500 py-4 text-center">
                      Click <span className="text-slate-300 font-semibold">"Run forge test"</span> or{' '}
                      <span className="text-cyan-300 font-semibold">"Submit Solution"</span> to compile and test
                      your exploit.
                    </div>
                  )}

                  {/* Flag Banner on Pass */}
                  {executionResult?.status === 'PASS' && (
                    <div className="mt-4 p-3 rounded-lg border border-emerald-800/80 bg-emerald-950/40 flex items-center justify-between gap-4">
                      <div className="space-y-0.5">
                        <div className="text-[10px] uppercase font-bold tracking-wider text-emerald-400">
                          Exploit Verified · Proof Flag Captured
                        </div>
                        <div className="text-sm font-bold text-white font-mono">
                          {executionResult.flag || challenge.flag}
                        </div>
                      </div>
                      <button
                        onClick={() => handleCopyFlag(executionResult.flag || challenge.flag)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-emerald-800 hover:bg-emerald-700 text-white text-xs font-semibold transition-colors"
                      >
                        {copiedFlag ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                        <span>{copiedFlag ? 'Copied' : 'Copy Flag'}</span>
                      </button>
                    </div>
                  )}
                </div>
              )}

              {activeTerminalTab === 'traces' && (
                <div className="space-y-1.5">
                  {executionResult && executionResult.traces.length > 0 ? (
                    executionResult.traces.map((trace, i) => {
                      const indentLevel = trace.depth * 16;
                      return (
                        <div
                          key={i}
                          style={{ paddingLeft: `${indentLevel}px` }}
                          className="flex items-center gap-2 py-0.5 text-[11px] font-mono hover:bg-slate-900/60 rounded"
                        >
                          <span
                            className={`px-1 rounded text-[10px] font-bold ${
                              trace.callType === 'DELEGATECALL'
                                ? 'bg-purple-950 text-purple-300 border border-purple-800/50'
                                : trace.callType === 'STATICCALL'
                                ? 'bg-blue-950 text-blue-300 border border-blue-800/50'
                                : 'bg-cyan-950 text-cyan-300 border border-cyan-800/50'
                            }`}
                          >
                            {trace.callType}
                          </span>
                          <span className="text-slate-400 font-mono">
                            [{trace.gas.toLocaleString()} gas]
                          </span>
                          <span className="text-slate-200">{trace.decodedFunction || trace.calldata}</span>
                          {trace.value && (
                            <span className="text-emerald-400 text-[10px]">
                              value: {(Number(trace.value) / 1e18).toFixed(1)} ETH
                            </span>
                          )}
                          {trace.returnVal && (
                            <span className="text-slate-500 text-[10px]">→ {trace.returnVal}</span>
                          )}
                        </div>
                      );
                    })
                  ) : (
                    <div className="text-slate-500 py-4 text-center">
                      No call traces recorded. Run a test suite to view cross-contract execution hierarchy.
                    </div>
                  )}
                </div>
              )}

              {activeTerminalTab === 'gas' && (
                <div>
                  {executionResult && executionResult.gasReport.length > 0 ? (
                    <table className="w-full text-left text-[11px] border-collapse font-mono">
                      <thead>
                        <tr className="border-b border-slate-800 text-slate-400">
                          <th className="py-1 px-2">Contract</th>
                          <th className="py-1 px-2">Function</th>
                          <th className="py-1 px-2 text-right">Min</th>
                          <th className="py-1 px-2 text-right">Avg</th>
                          <th className="py-1 px-2 text-right">Max</th>
                          <th className="py-1 px-2 text-right">Calls</th>
                        </tr>
                      </thead>
                      <tbody>
                        {executionResult.gasReport.map((row, i) => (
                          <tr key={i} className="border-b border-slate-900 hover:bg-slate-900/40 text-slate-300">
                            <td className="py-1.5 px-2 text-white font-semibold">{row.contract}</td>
                            <td className="py-1.5 px-2 text-cyan-300">{row.functionName}</td>
                            <td className="py-1.5 px-2 text-right tabular-nums">{row.min.toLocaleString()}</td>
                            <td className="py-1.5 px-2 text-right tabular-nums">{row.avg.toLocaleString()}</td>
                            <td className="py-1.5 px-2 text-right tabular-nums">{row.max.toLocaleString()}</td>
                            <td className="py-1.5 px-2 text-right tabular-nums text-slate-400">{row.calls}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  ) : (
                    <div className="text-slate-500 py-4 text-center">
                      No gas metrics generated. Run a passing test to populate Forge gas profile tables.
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
