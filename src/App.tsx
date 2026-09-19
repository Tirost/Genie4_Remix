import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  CharacterStatus,
  OutputLine,
  HighlightRule,
  TriggerRule,
  SubstituteRule,
  AliasRule,
  MacroRule,
  MapRoom,
  CharacterProfile,
  ScriptState,
  ThemeType,
} from './types';
import {
  DEFAULT_ROOMS,
  DEFAULT_HIGHLIGHTS,
  DEFAULT_TRIGGERS,
  DEFAULT_SUBSTITUTES,
  DEFAULT_ALIASES,
  DEFAULT_MACROS,
  DEFAULT_SCRIPTS,
  DEFAULT_PROFILES,
} from './data/defaultConfig';
import {
  createInitialCharacterStatus,
  expandAliases,
  applySubstitutes,
  processCommand,
  findPath,
} from './utils/gameEngine';
import { GenieScriptInterpreter } from './utils/scriptRunner';
import { TitleBar } from './components/TitleBar';
import { StatusBars } from './components/StatusBars';
import { TerminalWindow } from './components/TerminalWindow';
import { AutoMapperView } from './components/AutoMapperView';
import { ScriptExplorerModal } from './components/ScriptExplorerModal';
import { ConfigModal } from './components/ConfigModal';
import { ConnectModal } from './components/ConnectModal';
import { HelpModal } from './components/HelpModal';
import { DownloadModal } from './components/DownloadModal';

export const App: React.FC = () => {
  // Navigation
  const [activeTab, setActiveTab] = useState<
    'terminal' | 'mapper' | 'scripts' | 'config' | 'connect'
  >('terminal');
  const [showHelp, setShowHelp] = useState<boolean>(false);
  const [showDownload, setShowDownload] = useState<boolean>(false);
  const [theme, setTheme] = useState<ThemeType>('dark');

  // Connection & Profiles
  const [profiles, setProfiles] = useState<CharacterProfile[]>(DEFAULT_PROFILES);
  const [activeProfileId, setActiveProfileId] = useState<string>(DEFAULT_PROFILES[0].id);
  const [isConnected, setIsConnected] = useState<boolean>(true);
  const [connectionMode, setConnectionMode] = useState<string>('DragonRealms Sim');

  // Game Engine State
  const [currentRoomId, setCurrentRoomId] = useState<number>(1);
  const [rooms, setRooms] = useState<MapRoom[]>(DEFAULT_ROOMS);
  const [status, setStatus] = useState<CharacterStatus>(createInitialCharacterStatus());
  const [inventory, setInventory] = useState<string[]>(['broadsword', 'iron shield', 'leather pouch']);
  const [roomItems, setRoomItems] = useState<Record<number, string[]>>({
    1: ['granite fountain', 'brass plaque'],
    2: ['wooden cart', 'cobblestones'],
    3: ['oak counter', 'teller ledger'],
    6: ['wildflower sprig', 'fallen branch'],
  });

  // Terminal Buffer
  const [lines, setLines] = useState<OutputLine[]>([]);

  // Config Rules
  const [highlights, setHighlights] = useState<HighlightRule[]>(DEFAULT_HIGHLIGHTS);
  const [triggers, setTriggers] = useState<TriggerRule[]>(DEFAULT_TRIGGERS);
  const [substitutes, setSubstitutes] = useState<SubstituteRule[]>(DEFAULT_SUBSTITUTES);
  const [aliases, setAliases] = useState<AliasRule[]>(DEFAULT_ALIASES);
  const [macros, setMacros] = useState<MacroRule[]>(DEFAULT_MACROS);
  const [variables, setVariables] = useState<Record<string, string>>({
    guild: 'Warrior Mage',
    charactername: 'Tirost',
    game: 'DragonRealms',
    stance: 'Defending',
  });

  // Scripts
  const [scripts, setScripts] = useState(DEFAULT_SCRIPTS);
  const [activeScriptState, setActiveScriptState] = useState<ScriptState | null>(null);
  const interpreterRef = useRef<GenieScriptInterpreter | null>(null);

  const currentProfile = profiles.find((p) => p.id === activeProfileId) || profiles[0];

  // Helper to add output line with substitution
  const addOutputLine = useCallback(
    (lineData: Partial<OutputLine>) => {
      const processedText = lineData.text
        ? applySubstitutes(lineData.text, substitutes)
        : '';

      const newLine: OutputLine = {
        id: `line-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
        text: processedText,
        stream: lineData.stream || 'main',
        timestamp: new Date().toLocaleTimeString(),
        color: lineData.color,
        bgColor: lineData.bgColor,
        bold: lineData.bold,
        isPrompt: lineData.isPrompt,
        isInput: lineData.isInput,
        isSystem: lineData.isSystem,
      };

      setLines((prev) => [...prev.slice(-300), newLine]);

      // Inform active script of new output
      if (interpreterRef.current && processedText) {
        interpreterRef.current.onGameOutput(processedText);
      }

      // Check Autonomous Triggers
      if (!lineData.isInput && processedText) {
        triggers.forEach((tr) => {
          if (!tr.enabled) return;
          try {
            const regex = tr.isRegex
              ? new RegExp(tr.pattern, 'i')
              : new RegExp(tr.pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');

            if (regex.test(processedText)) {
              if (tr.actionType === 'command') {
                setTimeout(() => {
                  handleCommand(tr.actionValue, true);
                }, 300);
              } else if (tr.actionType === 'echo') {
                setTimeout(() => {
                  addOutputLine({
                    text: tr.actionValue,
                    stream: 'main',
                    color: '#a855f7',
                    bold: true,
                  });
                }, 200);
              }
            }
          } catch {
            // Ignore regex error
          }
        });
      }
    },
    [substitutes, triggers]
  );

  // Core Command Dispatcher
  const handleCommand = useCallback(
    (rawInput: string, isAutomated = false) => {
      const expanded = expandAliases(rawInput, aliases);

      // Print user input to terminal
      addOutputLine({
        text: expanded,
        stream: 'main',
        isInput: true,
      });

      // Check Genie client commands starting with '#'
      if (expanded.startsWith('#')) {
        const parts = expanded.slice(1).trim().split(' ');
        const cCmd = parts[0].toLowerCase();
        const cArg = parts.slice(1).join(' ');

        if (cCmd === 'clear') {
          setLines([]);
          return;
        }

        if (cCmd === 'echo') {
          addOutputLine({ text: cArg, stream: 'main', color: '#cbd5e1' });
          return;
        }

        if (cCmd === 'center') {
          setActiveTab('mapper');
          addOutputLine({
            text: '[Genie AutoMapper] Re-centered map on current room location.',
            stream: 'main',
            color: '#38bdf8',
          });
          return;
        }

        if (cCmd === 'goto') {
          const targetId = parseInt(cArg);
          if (!isNaN(targetId)) {
            const pathInfo = findPath(currentRoomId, targetId, rooms);
            if (pathInfo && pathInfo.directions.length > 0) {
              addOutputLine({
                text: `[Genie AutoMapper] Path found (${pathInfo.directions.length} steps): ${pathInfo.directions.join(' → ')}. Walking route...`,
                stream: 'main',
                color: '#38bdf8',
              });

              let delay = 0;
              pathInfo.directions.forEach((dir) => {
                setTimeout(() => {
                  handleCommand(dir);
                }, delay);
                delay += 800;
              });
            } else {
              addOutputLine({
                text: `[Genie AutoMapper] No path found to room #${targetId}.`,
                stream: 'main',
                color: '#ef4444',
              });
            }
          }
          return;
        }

        if (cCmd === 'script') {
          const sAction = parts[1]?.toLowerCase();
          const sName = parts[2];

          if (sAction === 'run' && sName) {
            const scr = scripts.find(
              (s) => s.name.toLowerCase() === sName.toLowerCase() || s.name.toLowerCase().startsWith(sName.toLowerCase())
            );
            if (scr) {
              startScript(scr.name, scr.code);
            } else {
              addOutputLine({
                text: `[Genie Script] Script '${sName}' not found. Available: ${scripts.map((s) => s.name).join(', ')}`,
                stream: 'main',
                color: '#ef4444',
              });
            }
          } else if (sAction === 'pause') {
            pauseScript();
          } else if (sAction === 'resume') {
            resumeScript();
          } else if (sAction === 'stop') {
            stopScript();
          }
          return;
        }
      }

      // Process command in game engine
      const res = processCommand(
        expanded,
        { status, currentRoomId, inventory, roomItems },
        rooms,
        addOutputLine,
        setStatus
      );

      if (res.newRoomId) {
        setCurrentRoomId(res.newRoomId);
      }
    },
    [aliases, currentRoomId, inventory, roomItems, rooms, status, addOutputLine, scripts]
  );

  // Script runner methods
  const startScript = (name: string, code: string) => {
    if (interpreterRef.current) {
      interpreterRef.current.destroy();
    }

    const interp = new GenieScriptInterpreter(name, code, {
      sendOutput: (text, color) => addOutputLine({ text, stream: 'main', color }),
      sendCommand: (cmd) => handleCommand(cmd, true),
      onStateChange: (st) => setActiveScriptState(st),
      onFinished: () => {
        setActiveScriptState(null);
        interpreterRef.current = null;
      },
    });

    interpreterRef.current = interp;
    interp.start();
  };

  const pauseScript = () => {
    if (interpreterRef.current) interpreterRef.current.pause();
  };

  const resumeScript = () => {
    if (interpreterRef.current) interpreterRef.current.resume();
  };

  const stopScript = () => {
    if (interpreterRef.current) {
      interpreterRef.current.stop();
      interpreterRef.current = null;
    }
    setActiveScriptState(null);
  };

  // Initial welcome text on boot
  useEffect(() => {
    addOutputLine({
      text: '*** Genie Remix v4.0.0 — Modernized DragonRealms Client ***',
      stream: 'main',
      color: '#f59e0b',
      bold: true,
    });
    addOutputLine({
      text: 'Connected to DragonRealms Simulation Realm. All modules loaded.',
      stream: 'main',
      color: '#4ade80',
    });
    addOutputLine({
      text: '[Lich] Lich 5.9.1 engine ready. Session protection active.',
      stream: 'main',
      color: '#a855f7',
    });
    addOutputLine({
      text: 'Type "look" or "help" to begin. Use AutoMapper tab or Scripts tab to test automation.',
      stream: 'main',
      color: '#94a3b8',
    });
    // Trigger first look
    setTimeout(() => {
      handleCommand('look');
    }, 400);
  }, []);

  // Timers: Roundtime & Cast Countdown Interval
  useEffect(() => {
    const timer = setInterval(() => {
      setStatus((prev) => {
        let changed = false;
        let newRt = prev.roundtimeRemaining;
        let newCast = prev.castTimeRemaining;
        let newCastReady = prev.castReady;

        // Action roundtime countdown
        if (newRt > 0) {
          newRt = Math.max(0, newRt - 1);
          changed = true;
        }

        // Spell cast timer countdown
        if (newCast > 0) {
          newCast = Math.max(0, newCast - 1);
          changed = true;
          if (newCast === 0 && prev.preparedSpell !== 'None') {
            // Genie Remix feature: Cast roundtime bar stays lit and shows Ready once spell timer finishes
            newCastReady = true;
            addOutputLine({
              text: `Your spell (${prev.preparedSpell}) is fully prepared and ready to cast!`,
              stream: 'main',
              color: '#34d399',
              bold: true,
            });
          }
        }

        // Slight natural vitality/fatigue regeneration
        let newFat = prev.fatigue;
        if (newFat < 100) {
          newFat = Math.min(100, newFat + 1);
          changed = true;
        }

        if (changed) {
          return {
            ...prev,
            roundtimeRemaining: newRt,
            castTimeRemaining: newCast,
            castReady: newCastReady,
            fatigue: newFat,
          };
        }
        return prev;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [addOutputLine]);

  // Context menu quick-adds from Shift+Select
  const handleAddHighlightText = (text: string) => {
    const rule: HighlightRule = {
      id: `hl-${Date.now()}`,
      pattern: text,
      isRegex: false,
      isCaseInsensitive: true,
      fgColor: '#38bdf8',
      bold: true,
      enabled: true,
    };
    setHighlights((prev) => [...prev, rule]);
    addOutputLine({
      text: `[Genie Config] Added new Highlight rule for "${text}".`,
      stream: 'main',
      color: '#38bdf8',
    });
  };

  const handleAddTriggerText = (text: string) => {
    const rule: TriggerRule = {
      id: `tr-${Date.now()}`,
      pattern: text,
      isRegex: false,
      actionType: 'echo',
      actionValue: `[Trigger matched: ${text}]`,
      enabled: true,
    };
    setTriggers((prev) => [...prev, rule]);
    addOutputLine({
      text: `[Genie Config] Added new Trigger rule for "${text}".`,
      stream: 'main',
      color: '#fbbf24',
    });
  };

  const handleAddSubstituteText = (text: string) => {
    const rule: SubstituteRule = {
      id: `sub-${Date.now()}`,
      pattern: text,
      replacement: `[${text}]`,
      isRegex: false,
      enabled: true,
    };
    setSubstitutes((prev) => [...prev, rule]);
    addOutputLine({
      text: `[Genie Config] Added new Substitute rule for "${text}".`,
      stream: 'main',
      color: '#a855f7',
    });
  };

  const handleAddAliasText = (text: string) => {
    const shorthand = text.split(' ')[0].toLowerCase().slice(0, 4);
    const rule: AliasRule = {
      id: `al-${Date.now()}`,
      alias: shorthand,
      expansion: text,
      enabled: true,
    };
    setAliases((prev) => [...prev, rule]);
    addOutputLine({
      text: `[Genie Config] Added new Alias: '${shorthand}' → '${text}'.`,
      stream: 'main',
      color: '#a855f7',
    });
  };

  return (
    <div
      id="genie-app-root"
      className="h-screen w-screen flex flex-col bg-stone-950 text-stone-100 overflow-hidden font-sans"
    >
      {/* Title Bar & Top Navigation */}
      <TitleBar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        isConnected={isConnected}
        connectionMode={connectionMode}
        characterName={currentProfile?.name || 'Tirost'}
        guild={status.guild}
        theme={theme}
        setTheme={setTheme}
        onOpenHelp={() => setShowHelp(true)}
        onOpenDownload={() => setShowDownload(true)}
      />

      {/* Character Gauges & Status Bar (Barbarian Aware + Cast Ready Bar) */}
      <StatusBars status={status} onCommand={handleCommand} />

      {/* Primary Workspace View */}
      <main className="flex-1 flex overflow-hidden relative">
        {activeTab === 'terminal' && (
          <TerminalWindow
            lines={lines}
            highlights={highlights}
            macros={macros}
            theme={theme}
            onSendCommand={handleCommand}
            onClearOutput={() => setLines([])}
            onAddHighlightText={handleAddHighlightText}
            onAddTriggerText={handleAddTriggerText}
            onAddSubstituteText={handleAddSubstituteText}
            onAddAliasText={handleAddAliasText}
          />
        )}

        {activeTab === 'mapper' && (
          <AutoMapperView
            rooms={rooms}
            currentRoomId={currentRoomId}
            onExecuteCommand={handleCommand}
          />
        )}

        {activeTab === 'scripts' && (
          <ScriptExplorerModal
            scripts={scripts}
            activeScriptState={activeScriptState}
            onRunScript={startScript}
            onPauseScript={pauseScript}
            onResumeScript={resumeScript}
            onStopScript={stopScript}
            onSaveScript={(scr) => {
              setScripts((prev) => {
                const idx = prev.findIndex((s) => s.name === scr.name);
                if (idx >= 0) {
                  const copy = [...prev];
                  copy[idx] = scr;
                  return copy;
                }
                return [...prev, scr];
              });
            }}
            onDeleteScript={(name) => {
              setScripts((prev) => prev.filter((s) => s.name !== name));
            }}
          />
        )}

        {activeTab === 'config' && (
          <ConfigModal
            highlights={highlights}
            triggers={triggers}
            substitutes={substitutes}
            aliases={aliases}
            macros={macros}
            variables={variables}
            onUpdateHighlights={setHighlights}
            onUpdateTriggers={setTriggers}
            onUpdateSubstitutes={setSubstitutes}
            onUpdateAliases={setAliases}
            onUpdateMacros={setMacros}
            onUpdateVariables={setVariables}
          />
        )}

        {activeTab === 'connect' && (
          <ConnectModal
            profiles={profiles}
            activeProfileId={activeProfileId}
            isConnected={isConnected}
            onConnect={(p) => {
              setActiveProfileId(p.id);
              setIsConnected(true);
              setStatus((prev) => ({ ...prev, guild: p.guild }));
              setConnectionMode(p.useLich ? 'Lich Session' : 'DragonRealms Live');
              addOutputLine({
                text: `[Session] Connected as ${p.name} (${p.guild}) via ${
                  p.useLich ? 'Lich 5.9.1' : 'Direct TCP'
                } to ${p.host}:${p.port}`,
                stream: 'main',
                color: '#34d399',
                bold: true,
              });
              setActiveTab('terminal');
            }}
            onDisconnect={() => {
              setIsConnected(false);
              addOutputLine({
                text: '[Session] Disconnected from game world.',
                stream: 'main',
                color: '#f87171',
              });
            }}
            onSaveProfile={(p) => {
              setProfiles((prev) => {
                const idx = prev.findIndex((x) => x.id === p.id);
                if (idx >= 0) {
                  const copy = [...prev];
                  copy[idx] = p;
                  return copy;
                }
                return [...prev, p];
              });
            }}
            onDeleteProfile={(id) => {
              setProfiles((prev) => prev.filter((x) => x.id !== id));
            }}
          />
        )}
      </main>

      {/* Help & Info Modal */}
      {showHelp && <HelpModal onClose={() => setShowHelp(false)} />}

      {/* Windows Release Download Modal */}
      {showDownload && <DownloadModal onClose={() => setShowDownload(false)} />}
    </div>
  );
};
