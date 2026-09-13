import React from 'react';
import { X, ExternalLink, Terminal, MapPin, Code, Zap } from 'lucide-react';

interface HelpModalProps {
  onClose: () => void;
}

export const HelpModal: React.FC<HelpModalProps> = ({ onClose }) => {
  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-stone-900 border border-stone-800 rounded-xl shadow-2xl max-w-2xl w-full max-h-[85vh] flex flex-col overflow-hidden text-stone-200">
        {/* Header */}
        <div className="px-5 py-4 border-b border-stone-800 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="w-6 h-6 rounded bg-amber-600/30 border border-amber-500/50 flex items-center justify-center text-amber-400 font-serif font-bold text-xs">
              G
            </div>
            <h2 className="text-base font-bold text-stone-100">About Genie Remix v4.0.0</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-stone-400 hover:text-white hover:bg-stone-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-5 text-xs text-stone-300 leading-relaxed">
          <p>
            <strong>Genie Remix</strong> is a modernized, drop-in replacement for Genie4 for DragonRealms, built for enhanced stability, Lich reliability, and an improved user experience.
          </p>

          <div className="space-y-3">
            <h3 className="font-bold text-stone-100 uppercase tracking-wider text-[11px] text-amber-400">
              Key Features & Modernizations
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="bg-stone-950 p-3 rounded-lg border border-stone-800 space-y-1">
                <div className="font-bold text-stone-200 flex items-center gap-1.5">
                  <Terminal className="w-3.5 h-3.5 text-sky-400" />
                  MUD Client Stream Engine
                </div>
                <p className="text-stone-400 text-[11px]">
                  Multi-window streams for Main, Combat, Speech, Thoughts, and Raw XML with customizable highlights, aliases, and macros.
                </p>
              </div>

              <div className="bg-stone-950 p-3 rounded-lg border border-stone-800 space-y-1">
                <div className="font-bold text-stone-200 flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-amber-400" />
                  AutoMapper with Center Button
                </div>
                <p className="text-stone-400 text-[11px]">
                  Interactive room maps with Dijkstra shortest-path navigation, room inspector, and a dedicated Center button to never lose your place.
                </p>
              </div>

              <div className="bg-stone-950 p-3 rounded-lg border border-stone-800 space-y-1">
                <div className="font-bold text-stone-200 flex items-center gap-1.5">
                  <Code className="w-3.5 h-3.5 text-emerald-400" />
                  Genie Scripting Interpreter
                </div>
                <p className="text-stone-400 text-[11px]">
                  Runs Genie scripts (.cmd) supporting labels, match/matchwait, pause, goto, math, and variable expansion (%var, $var).
                </p>
              </div>

              <div className="bg-stone-950 p-3 rounded-lg border border-stone-800 space-y-1">
                <div className="font-bold text-stone-200 flex items-center gap-1.5">
                  <Zap className="w-3.5 h-3.5 text-purple-400" />
                  First-Class Lich Integration
                </div>
                <p className="text-stone-400 text-[11px]">
                  Direct Lich options in profile configuration, preventing stuck sessions and password bypass issues.
                </p>
              </div>
            </div>
          </div>

          <div className="bg-stone-950/80 p-3.5 rounded-lg border border-stone-800 space-y-2">
            <h4 className="font-bold text-stone-200 text-xs">Quick Interaction Tips:</h4>
            <ul className="list-disc list-inside space-y-1 text-stone-400 text-[11px]">
              <li>
                <strong>Shift + Select text</strong> in the output window to open the quick-config menu for Highlights, Triggers, or Aliases.
              </li>
              <li>
                Type <code className="text-amber-300">look</code>, <code className="text-amber-300">forage rock</code>, or movement directions (<code className="text-amber-300">n</code>, <code className="text-amber-300">s</code>, etc.) to explore the world.
              </li>
              <li>
                In <strong>AutoMapper</strong>, click any room node to compute the shortest route and click <strong>&quot;Walk Route&quot;</strong> to travel automatically.
              </li>
              <li>
                In <strong>Scripts</strong>, click <strong>&quot;Run Script&quot;</strong> on <code className="text-emerald-300">forage.cmd</code> or <code className="text-emerald-300">spell_trainer.cmd</code> to watch autonomous DragonRealms automation.
              </li>
            </ul>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-stone-800 bg-stone-950/50 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-stone-800 hover:bg-stone-700 text-stone-200 font-semibold rounded-lg text-xs transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
