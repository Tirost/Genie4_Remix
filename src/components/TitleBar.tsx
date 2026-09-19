import React from 'react';
import {
  Terminal,
  Compass,
  Code,
  Sliders,
  Radio,
  HelpCircle,
  Sun,
  Moon,
  Zap,
  Download,
} from 'lucide-react';
import { ThemeType } from '../types';

interface TitleBarProps {
  activeTab: 'terminal' | 'mapper' | 'scripts' | 'config' | 'connect';
  setActiveTab: (tab: 'terminal' | 'mapper' | 'scripts' | 'config' | 'connect') => void;
  isConnected: boolean;
  connectionMode: string;
  characterName: string;
  guild: string;
  theme: ThemeType;
  setTheme: (theme: ThemeType) => void;
  onOpenHelp: () => void;
  onOpenDownload: () => void;
}

export const TitleBar: React.FC<TitleBarProps> = ({
  activeTab,
  setActiveTab,
  isConnected,
  connectionMode,
  characterName,
  guild,
  theme,
  setTheme,
  onOpenHelp,
  onOpenDownload,
}) => {
  const cycleTheme = () => {
    const themes: ThemeType[] = ['dark', 'classic', 'amber', 'emerald', 'light'];
    const currentIndex = themes.indexOf(theme);
    const nextIndex = (currentIndex + 1) % themes.length;
    setTheme(themes[nextIndex]);
  };

  return (
    <header
      id="genie-titlebar"
      className="bg-stone-900 border-b border-stone-800 text-stone-200 px-3 py-1.5 flex items-center justify-between select-none shadow-sm"
    >
      {/* Brand & Character Status */}
      <div className="flex items-center space-x-3">
        <div className="flex items-center space-x-2">
          <div className="w-5 h-5 rounded bg-amber-600/30 border border-amber-500/50 flex items-center justify-center text-amber-400 font-serif font-bold text-xs">
            G
          </div>
          <span className="font-semibold text-sm tracking-tight text-stone-100 flex items-center gap-1.5">
            Genie Remix
            <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-stone-800 text-amber-400/90 border border-stone-700">
              v4.0.0
            </span>
          </span>
        </div>

        <div className="hidden sm:flex items-center text-xs text-stone-400 border-l border-stone-700 pl-3 space-x-2">
          <span className="text-stone-300 font-medium">{characterName}</span>
          <span className="text-stone-500">•</span>
          <span className="text-amber-300/80">{guild}</span>
        </div>

        {/* Connection status badge */}
        <button
          id="btn-status-badge"
          onClick={() => setActiveTab('connect')}
          className={`flex items-center space-x-1.5 text-xs px-2 py-0.5 rounded border transition-colors ${
            isConnected
              ? 'bg-emerald-950/60 border-emerald-700/60 text-emerald-400'
              : 'bg-rose-950/60 border-rose-800/60 text-rose-400'
          }`}
        >
          <span
            className={`w-1.5 h-1.5 rounded-full ${
              isConnected ? 'bg-emerald-400 animate-pulse' : 'bg-rose-400'
            }`}
          />
          <span className="font-mono text-[11px]">
            {isConnected ? connectionMode : 'Offline'}
          </span>
        </button>
      </div>

      {/* Navigation Tabs */}
      <nav className="flex items-center space-x-1">
        <button
          id="tab-terminal"
          onClick={() => setActiveTab('terminal')}
          className={`flex items-center space-x-1.5 px-3 py-1 text-xs rounded transition-all ${
            activeTab === 'terminal'
              ? 'bg-stone-800 text-amber-400 border border-stone-700 font-medium'
              : 'text-stone-400 hover:text-stone-200 hover:bg-stone-800/50'
          }`}
        >
          <Terminal className="w-3.5 h-3.5" />
          <span>Game Stream</span>
        </button>

        <button
          id="tab-mapper"
          onClick={() => setActiveTab('mapper')}
          className={`flex items-center space-x-1.5 px-3 py-1 text-xs rounded transition-all ${
            activeTab === 'mapper'
              ? 'bg-stone-800 text-amber-400 border border-stone-700 font-medium'
              : 'text-stone-400 hover:text-stone-200 hover:bg-stone-800/50'
          }`}
        >
          <Compass className="w-3.5 h-3.5" />
          <span>AutoMapper</span>
        </button>

        <button
          id="tab-scripts"
          onClick={() => setActiveTab('scripts')}
          className={`flex items-center space-x-1.5 px-3 py-1 text-xs rounded transition-all ${
            activeTab === 'scripts'
              ? 'bg-stone-800 text-amber-400 border border-stone-700 font-medium'
              : 'text-stone-400 hover:text-stone-200 hover:bg-stone-800/50'
          }`}
        >
          <Code className="w-3.5 h-3.5" />
          <span>Scripts</span>
        </button>

        <button
          id="tab-config"
          onClick={() => setActiveTab('config')}
          className={`flex items-center space-x-1.5 px-3 py-1 text-xs rounded transition-all ${
            activeTab === 'config'
              ? 'bg-stone-800 text-amber-400 border border-stone-700 font-medium'
              : 'text-stone-400 hover:text-stone-200 hover:bg-stone-800/50'
          }`}
        >
          <Sliders className="w-3.5 h-3.5" />
          <span>Config</span>
        </button>

        <button
          id="tab-connect"
          onClick={() => setActiveTab('connect')}
          className={`flex items-center space-x-1.5 px-3 py-1 text-xs rounded transition-all ${
            activeTab === 'connect'
              ? 'bg-stone-800 text-amber-400 border border-stone-700 font-medium'
              : 'text-stone-400 hover:text-stone-200 hover:bg-stone-800/50'
          }`}
        >
          <Radio className="w-3.5 h-3.5" />
          <span>Lich / Host</span>
        </button>
      </nav>

      {/* Utilities */}
      <div className="flex items-center space-x-1.5">
        <button
          id="btn-open-download-modal"
          onClick={onOpenDownload}
          title="Download Genie Remix 4.2.3 for Windows 10/11 (64-bit)"
          className="flex items-center space-x-1.5 px-2.5 py-1 text-xs rounded bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 font-medium transition-all shadow-xs"
        >
          <Download className="w-3.5 h-3.5 text-amber-400" />
          <span className="hidden sm:inline">Windows 10/11 Build</span>
          <span className="sm:hidden">Download</span>
        </button>

        <button
          id="btn-cycle-theme"
          onClick={cycleTheme}
          title={`Theme: ${theme}`}
          className="p-1.5 rounded hover:bg-stone-800 text-stone-400 hover:text-stone-200 transition-colors text-xs flex items-center gap-1"
        >
          {theme === 'light' ? (
            <Sun className="w-3.5 h-3.5 text-amber-400" />
          ) : theme === 'emerald' ? (
            <Zap className="w-3.5 h-3.5 text-emerald-400" />
          ) : (
            <Moon className="w-3.5 h-3.5 text-stone-300" />
          )}
          <span className="capitalize text-[11px] hidden md:inline">{theme}</span>
        </button>

        <button
          id="btn-help-modal"
          onClick={onOpenHelp}
          title="Genie Remix Help & Info"
          className="p-1.5 rounded hover:bg-stone-800 text-stone-400 hover:text-stone-200 transition-colors"
        >
          <HelpCircle className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
};
