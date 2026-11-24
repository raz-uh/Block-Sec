import React, { useState } from 'react';
import { DOCKER_SANDBOX_SPEC } from '../services/dockerRunnerSpec';
import { X, ShieldCheck, Terminal, FileCode, Copy, Check, Lock, Cpu } from 'lucide-react';

interface DockerSpecModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type TabKey = 'overview' | 'dockerfile' | 'runner' | 'foundry' | 'seccomp' | 'api';

export const DockerSpecModal: React.FC<DockerSpecModalProps> = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState<TabKey>('overview');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="relative w-full max-w-4xl max-h-[90vh] flex flex-col rounded-xl border border-slate-700 bg-[#0d131f] shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-[#0a0f19]">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-cyan-950 border border-cyan-800 text-cyan-400">
              <Terminal className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white tracking-tight">
                {DOCKER_SANDBOX_SPEC.title}
              </h2>
              <p className="text-[11px] text-slate-400">
                Production-grade multi-tenant Foundry execution architecture & jail specification
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Tab Strip */}
        <div className="flex items-center gap-1 px-6 border-b border-slate-800 bg-[#0a0f19] text-xs font-medium overflow-x-auto">
          <button
            onClick={() => setActiveTab('overview')}
            className={`px-3 py-2.5 border-b-2 transition-colors whitespace-nowrap ${
              activeTab === 'overview'
                ? 'border-cyan-400 text-cyan-300 font-semibold'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            Security Jail Matrix
          </button>
          <button
            onClick={() => setActiveTab('dockerfile')}
            className={`px-3 py-2.5 border-b-2 transition-colors whitespace-nowrap ${
              activeTab === 'dockerfile'
                ? 'border-cyan-400 text-cyan-300 font-semibold'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            runner.Dockerfile
          </button>
          <button
            onClick={() => setActiveTab('runner')}
            className={`px-3 py-2.5 border-b-2 transition-colors whitespace-nowrap ${
              activeTab === 'runner'
                ? 'border-cyan-400 text-cyan-300 font-semibold'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            runner.sh (Watchdog)
          </button>
          <button
            onClick={() => setActiveTab('foundry')}
            className={`px-3 py-2.5 border-b-2 transition-colors whitespace-nowrap ${
              activeTab === 'foundry'
                ? 'border-cyan-400 text-cyan-300 font-semibold'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            foundry.toml (Locked)
          </button>
          <button
            onClick={() => setActiveTab('seccomp')}
            className={`px-3 py-2.5 border-b-2 transition-colors whitespace-nowrap ${
              activeTab === 'seccomp'
                ? 'border-cyan-400 text-cyan-300 font-semibold'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            seccomp.json
          </button>
          <button
            onClick={() => setActiveTab('api')}
            className={`px-3 py-2.5 border-b-2 transition-colors whitespace-nowrap ${
              activeTab === 'api'
                ? 'border-cyan-400 text-cyan-300 font-semibold'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            Backend API Runner
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 p-6 overflow-y-auto text-xs text-slate-300 space-y-4">
          {activeTab === 'overview' && (
            <div className="space-y-4">
              <p className="text-slate-300 leading-relaxed">
                {DOCKER_SANDBOX_SPEC.description}
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                {DOCKER_SANDBOX_SPEC.securityFeatures.map((feat, i) => (
                  <div
                    key={i}
                    className="p-3.5 rounded-lg border border-slate-800 bg-slate-900/60 space-y-1.5"
                  >
                    <div className="flex items-center gap-1.5 font-bold text-white text-xs">
                      <ShieldCheck className="h-4 w-4 text-cyan-400" />
                      <span>{feat.feature}</span>
                    </div>
                    <p className="text-[11px] text-slate-300 leading-relaxed">
                      {feat.description}
                    </p>
                    <div className="text-[10px] text-cyan-300 font-mono pt-1">
                      Enforcement: {feat.enforcement}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'dockerfile' && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-slate-400">
                <span className="font-mono text-[11px]">Hardened Multi-Stage Dockerfile</span>
                <button
                  onClick={() => handleCopy(DOCKER_SANDBOX_SPEC.dockerfile, 'dockerfile')}
                  className="flex items-center gap-1 text-[11px] text-cyan-400 hover:text-cyan-300"
                >
                  {copiedKey === 'dockerfile' ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                  <span>{copiedKey === 'dockerfile' ? 'Copied' : 'Copy'}</span>
                </button>
              </div>
              <pre className="p-4 rounded-lg bg-black/40 border border-slate-800 font-mono text-[11px] text-cyan-200 overflow-x-auto leading-relaxed">
                {DOCKER_SANDBOX_SPEC.dockerfile}
              </pre>
            </div>
          )}

          {activeTab === 'runner' && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-slate-400">
                <span className="font-mono text-[11px]">runner.sh Entrypoint Script</span>
                <button
                  onClick={() => handleCopy(DOCKER_SANDBOX_SPEC.runnerScript, 'runner')}
                  className="flex items-center gap-1 text-[11px] text-cyan-400 hover:text-cyan-300"
                >
                  {copiedKey === 'runner' ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                  <span>{copiedKey === 'runner' ? 'Copied' : 'Copy'}</span>
                </button>
              </div>
              <pre className="p-4 rounded-lg bg-black/40 border border-slate-800 font-mono text-[11px] text-emerald-300 overflow-x-auto leading-relaxed">
                {DOCKER_SANDBOX_SPEC.runnerScript}
              </pre>
            </div>
          )}

          {activeTab === 'foundry' && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-slate-400">
                <span className="font-mono text-[11px]">foundry.toml (FFI & FS Disabled)</span>
                <button
                  onClick={() => handleCopy(DOCKER_SANDBOX_SPEC.foundryToml, 'foundry')}
                  className="flex items-center gap-1 text-[11px] text-cyan-400 hover:text-cyan-300"
                >
                  {copiedKey === 'foundry' ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                  <span>{copiedKey === 'foundry' ? 'Copied' : 'Copy'}</span>
                </button>
              </div>
              <pre className="p-4 rounded-lg bg-black/40 border border-slate-800 font-mono text-[11px] text-amber-200 overflow-x-auto leading-relaxed">
                {DOCKER_SANDBOX_SPEC.foundryToml}
              </pre>
            </div>
          )}

          {activeTab === 'seccomp' && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-slate-400">
                <span className="font-mono text-[11px]">seccomp-profile.json (Syscall Filtering)</span>
                <button
                  onClick={() => handleCopy(DOCKER_SANDBOX_SPEC.seccompProfileJson, 'seccomp')}
                  className="flex items-center gap-1 text-[11px] text-cyan-400 hover:text-cyan-300"
                >
                  {copiedKey === 'seccomp' ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                  <span>{copiedKey === 'seccomp' ? 'Copied' : 'Copy'}</span>
                </button>
              </div>
              <pre className="p-4 rounded-lg bg-black/40 border border-slate-800 font-mono text-[11px] text-slate-300 overflow-x-auto leading-relaxed">
                {DOCKER_SANDBOX_SPEC.seccompProfileJson}
              </pre>
            </div>
          )}

          {activeTab === 'api' && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-slate-400">
                <span className="font-mono text-[11px]">Node.js Express / NestJS Docker Runner</span>
                <button
                  onClick={() => handleCopy(DOCKER_SANDBOX_SPEC.apiEndpointSpec, 'api')}
                  className="flex items-center gap-1 text-[11px] text-cyan-400 hover:text-cyan-300"
                >
                  {copiedKey === 'api' ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                  <span>{copiedKey === 'api' ? 'Copied' : 'Copy'}</span>
                </button>
              </div>
              <pre className="p-4 rounded-lg bg-black/40 border border-slate-800 font-mono text-[11px] text-cyan-200 overflow-x-auto leading-relaxed">
                {DOCKER_SANDBOX_SPEC.apiEndpointSpec}
              </pre>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-800 bg-[#0a0f19] flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-white rounded-lg transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
