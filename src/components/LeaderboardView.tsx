import React, { useState } from 'react';
import { useProgress } from '../context/ProgressContext';
import { Trophy, Medal, Search, UserCheck } from 'lucide-react';

export const LeaderboardView: React.FC = () => {
  const { leaderboard } = useProgress();
  const [filterUser, setFilterUser] = useState('');

  const filtered = leaderboard.filter((u) =>
    u.username.toLowerCase().includes(filterUser.toLowerCase()) ||
    u.auditorTitle.toLowerCase().includes(filterUser.toLowerCase())
  );

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <div className="text-xs uppercase tracking-wider font-semibold text-cyan-400">
            Global Whitehat Standings
          </div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight mt-1 flex items-center gap-2">
            <Trophy className="h-6 w-6 text-amber-400" />
            <span>Auditor Leaderboard</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Rankings calculated based on verified CTF exploit submissions, solve speed, and captured proof flags.
          </p>
        </div>

        {/* Search */}
        <div className="relative min-w-[260px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
          <input
            type="text"
            value={filterUser}
            onChange={(e) => setFilterUser(e.target.value)}
            placeholder="Search auditor or title..."
            className="w-full rounded-lg bg-slate-900 border border-slate-800 pl-9 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:border-cyan-500 focus:outline-none"
          />
        </div>
      </div>

      {/* Leaderboard Table */}
      <div className="rounded-xl border border-slate-800 bg-[#0d131f] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-900/60 text-slate-400 font-semibold">
                <th className="py-3 px-4 w-16 text-center">Rank</th>
                <th className="py-3 px-4">Auditor</th>
                <th className="py-3 px-4">Title / Rank</th>
                <th className="py-3 px-4 text-center">Solved</th>
                <th className="py-3 px-4 text-center">Badges</th>
                <th className="py-3 px-4 text-right">Total XP</th>
                <th className="py-3 px-4 text-right">Activity</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filtered.map((user) => {
                const isTop1 = user.rank === 1;
                const isTop2 = user.rank === 2;
                const isTop3 = user.rank === 3;

                return (
                  <tr
                    key={user.username}
                    className={`transition-colors ${
                      user.isCurrentUser
                        ? 'bg-cyan-950/30 hover:bg-cyan-950/50'
                        : 'hover:bg-slate-900/40'
                    }`}
                  >
                    {/* Rank Number / Medal */}
                    <td className="py-3 px-4 text-center">
                      {isTop1 ? (
                        <div className="inline-flex items-center justify-center h-6 w-6 rounded-full bg-amber-400/10 text-amber-400 font-bold font-mono">
                          <Medal className="h-4 w-4" />
                        </div>
                      ) : isTop2 ? (
                        <div className="inline-flex items-center justify-center h-6 w-6 rounded-full bg-slate-300/10 text-slate-300 font-bold font-mono">
                          <Medal className="h-4 w-4" />
                        </div>
                      ) : isTop3 ? (
                        <div className="inline-flex items-center justify-center h-6 w-6 rounded-full bg-amber-700/10 text-amber-600 font-bold font-mono">
                          <Medal className="h-4 w-4" />
                        </div>
                      ) : (
                        <span className="font-mono tabular-nums text-slate-400 font-semibold">
                          #{user.rank}
                        </span>
                      )}
                    </td>

                    {/* Auditor Handle */}
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2.5">
                        <img
                          src={user.avatar}
                          alt={user.username}
                          className="h-7 w-7 rounded-full bg-slate-800 border border-slate-700"
                        />
                        <div className="flex items-center gap-1.5">
                          <span
                            className={`font-semibold ${
                              user.isCurrentUser ? 'text-cyan-300' : 'text-white'
                            }`}
                          >
                            {user.username}
                          </span>
                          {user.isCurrentUser && (
                            <span className="inline-flex items-center gap-0.5 text-[10px] text-cyan-400 bg-cyan-950 px-1.5 py-0.2 rounded border border-cyan-800">
                              <UserCheck className="h-2.5 w-2.5" />
                              You
                            </span>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Title */}
                    <td className="py-3 px-4 text-slate-300 font-medium">{user.auditorTitle}</td>

                    {/* Solved */}
                    <td className="py-3 px-4 text-center font-mono tabular-nums text-slate-300">
                      {user.challengesSolved}
                    </td>

                    {/* Badges */}
                    <td className="py-3 px-4 text-center font-mono tabular-nums text-slate-300">
                      {user.badgesCount}
                    </td>

                    {/* XP */}
                    <td className="py-3 px-4 text-right">
                      <span className="font-mono tabular-nums font-bold text-cyan-300 text-sm">
                        {user.xp.toLocaleString()}
                      </span>
                      <span className="text-[10px] text-slate-500 ml-1">XP</span>
                    </td>

                    {/* Last Active */}
                    <td className="py-3 px-4 text-right text-slate-400 text-[11px] font-mono">
                      {user.lastActive}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
