import React from 'react';
import { CharacterStatus } from '../types';
import { Shield, Sparkles, Flame, Activity, Zap, Compass } from 'lucide-react';

interface StatusBarsProps {
  status: CharacterStatus;
  onCommand: (cmd: string) => void;
}

export const StatusBars: React.FC<StatusBarsProps> = ({ status, onCommand }) => {
  const isBarbarian = status.guild === 'Barbarian';

  // Calculate percentage bar widths
  const vitPct = Math.min(100, Math.max(0, status.vitality));
  const manaPct = Math.min(100, Math.max(0, status.mana));
  const firePct = Math.min(100, Math.max(0, status.innerFire));
  const fatPct = Math.min(100, Math.max(0, status.fatigue));
  const spirPct = Math.min(100, Math.max(0, status.spirit));
  const concPct = Math.min(100, Math.max(0, status.concentration));

  // Roundtime calculations
  const rtPct =
    status.roundtimeTotal > 0
      ? (status.roundtimeRemaining / status.roundtimeTotal) * 100
      : 0;

  const castPct =
    status.castTimeTotal > 0
      ? ((status.castTimeTotal - status.castTimeRemaining) / status.castTimeTotal) * 100
      : status.castReady
      ? 100
      : 0;

  return (
    <div
      id="genie-status-bars"
      className="bg-stone-900/90 border-b border-stone-800 p-2 text-xs select-none shadow-md backdrop-blur"
    >
      <div className="grid grid-cols-1 md:grid-cols-12 gap-2 items-center">
        {/* Vitality & Resource Gauges */}
        <div className="md:col-span-5 grid grid-cols-2 gap-1.5">
          {/* Vitality */}
          <div className="bg-stone-950/80 rounded border border-stone-800 p-1 relative overflow-hidden">
            <div
              className="absolute left-0 top-0 bottom-0 bg-gradient-to-r from-red-800 to-red-600 opacity-70 transition-all duration-300"
              style={{ width: `${vitPct}%` }}
            />
            <div className="relative flex justify-between items-center px-1 text-[11px] font-mono">
              <span className="text-red-300 font-semibold flex items-center gap-1">
                <Activity className="w-3 h-3 text-red-400" /> Vit
              </span>
              <span className="text-white font-bold">{vitPct}%</span>
            </div>
          </div>

          {/* Mana OR Barbarian Inner Fire */}
          {isBarbarian ? (
            <div className="bg-stone-950/80 rounded border border-stone-800 p-1 relative overflow-hidden">
              <div
                className="absolute left-0 top-0 bottom-0 bg-gradient-to-r from-amber-700 to-orange-500 opacity-70 transition-all duration-300"
                style={{ width: `${firePct}%` }}
              />
              <div className="relative flex justify-between items-center px-1 text-[11px] font-mono">
                <span className="text-orange-300 font-semibold flex items-center gap-1">
                  <Flame className="w-3 h-3 text-orange-400" /> Inner Fire
                </span>
                <span className="text-white font-bold">{firePct}%</span>
              </div>
            </div>
          ) : (
            <div className="bg-stone-950/80 rounded border border-stone-800 p-1 relative overflow-hidden">
              <div
                className="absolute left-0 top-0 bottom-0 bg-gradient-to-r from-sky-800 to-blue-600 opacity-70 transition-all duration-300"
                style={{ width: `${manaPct}%` }}
              />
              <div className="relative flex justify-between items-center px-1 text-[11px] font-mono">
                <span className="text-sky-300 font-semibold flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-sky-400" /> Mana
                </span>
                <span className="text-white font-bold">{manaPct}%</span>
              </div>
            </div>
          )}

          {/* Fatigue */}
          <div className="bg-stone-950/80 rounded border border-stone-800 p-1 relative overflow-hidden">
            <div
              className="absolute left-0 top-0 bottom-0 bg-gradient-to-r from-emerald-800 to-emerald-600 opacity-70 transition-all duration-300"
              style={{ width: `${fatPct}%` }}
            />
            <div className="relative flex justify-between items-center px-1 text-[11px] font-mono">
              <span className="text-emerald-300 font-semibold flex items-center gap-1">
                <Zap className="w-3 h-3 text-emerald-400" /> Fat
              </span>
              <span className="text-white font-bold">{fatPct}%</span>
            </div>
          </div>

          {/* Spirit / Concentration */}
          <div className="bg-stone-950/80 rounded border border-stone-800 p-1 relative overflow-hidden">
            <div
              className="absolute left-0 top-0 bottom-0 bg-gradient-to-r from-purple-800 to-purple-600 opacity-70 transition-all duration-300"
              style={{ width: `${spirPct}%` }}
            />
            <div className="relative flex justify-between items-center px-1 text-[11px] font-mono">
              <span className="text-purple-300 font-semibold flex items-center gap-1">
                <Shield className="w-3 h-3 text-purple-400" /> Spir
              </span>
              <span className="text-white font-bold">{spirPct}%</span>
            </div>
          </div>
        </div>

        {/* Roundtime & Cast Timers (Genie Remix Signatures) */}
        <div className="md:col-span-4 flex flex-col space-y-1.5">
          {/* Action Roundtime countdown bar */}
          <div className="bg-stone-950/80 rounded border border-stone-800 p-1 relative overflow-hidden">
            <div
              className={`absolute left-0 top-0 bottom-0 transition-all duration-200 ${
                status.roundtimeRemaining > 0
                  ? 'bg-gradient-to-r from-amber-700 to-amber-500 opacity-80'
                  : 'bg-stone-900 opacity-30'
              }`}
              style={{ width: `${rtPct}%` }}
            />
            <div className="relative flex justify-between items-center px-1 text-[11px] font-mono">
              <span className="text-stone-300 font-medium">Roundtime</span>
              <span
                className={`font-bold ${
                  status.roundtimeRemaining > 0 ? 'text-amber-300' : 'text-stone-500'
                }`}
              >
                {status.roundtimeRemaining > 0 ? `${status.roundtimeRemaining}s` : 'None'}
              </span>
            </div>
          </div>

          {/* Cast Roundtime bar - Stays lit & Ready (Genie Remix specific feature) */}
          <div className="bg-stone-950/80 rounded border border-stone-800 p-1 relative overflow-hidden">
            <div
              className={`absolute left-0 top-0 bottom-0 transition-all duration-300 ${
                status.castReady
                  ? 'bg-gradient-to-r from-emerald-600 to-emerald-400 opacity-90'
                  : status.castTimeRemaining > 0
                  ? 'bg-gradient-to-r from-cyan-700 to-sky-500 opacity-80'
                  : 'bg-stone-900 opacity-20'
              }`}
              style={{ width: `${castPct}%` }}
            />
            <div className="relative flex justify-between items-center px-1 text-[11px] font-mono">
              <span className="text-stone-300 font-medium">Cast Spell</span>
              <span
                className={`font-bold ${
                  status.castReady
                    ? 'text-emerald-300 animate-pulse'
                    : status.castTimeRemaining > 0
                    ? 'text-cyan-300'
                    : 'text-stone-500'
                }`}
              >
                {status.castReady
                  ? '★ READY ★'
                  : status.castTimeRemaining > 0
                  ? `${status.castTimeRemaining}s`
                  : status.preparedSpell !== 'None'
                  ? 'Preparing...'
                  : 'Idle'}
              </span>
            </div>
          </div>
        </div>

        {/* Hands, Stance & Position */}
        <div className="md:col-span-3 flex flex-col justify-between space-y-1 bg-stone-950/50 p-1.5 rounded border border-stone-800/80 text-[11px]">
          <div className="flex justify-between items-center">
            <span className="text-stone-400">Right:</span>
            <span className="text-amber-200 truncate max-w-[120px] font-mono" title={status.rightHand}>
              {status.rightHand || 'Empty'}
            </span>
          </div>

          <div className="flex justify-between items-center">
            <span className="text-stone-400">Left:</span>
            <span className="text-amber-200 truncate max-w-[120px] font-mono" title={status.leftHand}>
              {status.leftHand || 'Empty'}
            </span>
          </div>

          <div className="flex justify-between items-center pt-0.5 border-t border-stone-800/60">
            <button
              onClick={() => onCommand('stance')}
              className="text-stone-300 hover:text-amber-400 transition-colors cursor-pointer font-mono"
              title="Click to cycle stance"
            >
              Stance: <span className="text-sky-300 font-semibold">{status.stance}</span>
            </button>
            <button
              onClick={() => onCommand('stand')}
              className="text-stone-300 hover:text-amber-400 transition-colors cursor-pointer font-mono"
              title="Click to stand up"
            >
              Pos: <span className="text-emerald-300 font-semibold">{status.position}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
