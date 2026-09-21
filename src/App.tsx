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
  StreamWindowConfig,
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
  computeLineHighlights,
  applyHighlightsToLine,
  processCommand,
  findPath,
  processTriggers,
  getSystemVariable,
  substituteVariablesInText,
} from './utils/gameEngine';
import { GameXmlStreamParser, DEFAULT_STREAM_WINDOWS } from './utils/xmlStreamParser';
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

  // Dedicated Per-Window Stream Buffers (stores up to 1000 lines per window so non-active windows never lose data)
  const [windowBuffers, setWindowBuffers] = useState<Record<string, OutputLine[]>>({
    main: [
      {
        id: 'init-1',
        text: '*** Welcome to Genie Remix v4.2.4 (High-Performance Client) ***',
        stream: 'main',
        timestamp: new Date().toLocaleTimeString(),
        color: '#fbbf24',
        bold: true,
      },
      {
        id: 'init-2',
        text: 'Connected to DragonRealms. Multi-window stream routing & autonomous triggers active.',
        stream: 'main',
        timestamp: new Date().toLocaleTimeString(),
        color: '#38bdf8',
      },
    ],
    combat: [
      {
        id: 'init-c1',
        text: '[Combat Window Active] Melee, ranged, brawling, and magical attacks will route here.',
        stream: 'combat',
        timestamp: new Date().toLocaleTimeString(),
        color: '#ef4444',
      },
    ],
    speech: [
      {
        id: 'init-s1',
        text: '[Speech Window Active] Whispers, tells, conversations, and emotes will route here.',
        stream: 'speech',
        timestamp: new Date().toLocaleTimeString(),
        color: '#38bdf8',
      },
    ],
    thoughts: [
      {
        id: 'init-t1',
        text: '[Thoughts Window Active] ESP thought networks and mind messages will route here.',
        stream: 'thoughts',
        timestamp: new Date().toLocaleTimeString(),
        color: '#c084fc',
      },
    ],
    room: [
      {
        id: 'init-r1',
        text: '[Room Window Active] Environmental room descriptions, obvious paths, and objects will route here.',
        stream: 'room',
        timestamp: new Date().toLocaleTimeString(),
        color: '#34d399',
      },
    ],
    experience: [
      {
        id: 'init-exp1',
        text: '[Experience Window Active] Live skill gains and experience plugin data will automatically update here.',
        stream: 'experience',
        timestamp: new Date().toLocaleTimeString(),
        color: '#38bdf8',
      },
    ],
    inv: [
      {
        id: 'init-i1',
        text: '[Inventory Window Active] Type "inv" to inspect carried items, weapons, and containers.',
        stream: 'inv',
        timestamp: new Date().toLocaleTimeString(),
        color: '#fbbf24',
      },
    ],
    activespells: [
      {
        id: 'init-sp1',
        text: '[Active Spells Window Active] Type "spells" or "perc" to monitor ongoing wards and buffs.',
        stream: 'activespells',
        timestamp: new Date().toLocaleTimeString(),
        color: '#22d3ee',
      },
    ],
    familiar: [],
    death: [],
    logons: [],
    raw: [],
  });

  const [windowConfigs, setWindowConfigs] = useState<StreamWindowConfig[]>(DEFAULT_STREAM_WINDOWS);
  const [activeStream, setActiveStream] = useState<string>('main');
  const [echoStreamsToMain, setEchoStreamsToMain] = useState<boolean>(true);

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
  const xmlParserRef = useRef<GameXmlStreamParser | null>(null);

  const currentProfile = profiles.find((p) => p.id === activeProfileId) || profiles[0];

  // High-performance synchronization refs to eliminate render cascade and stale closures
  const triggersRef = useRef(triggers);
  const highlightsRef = useRef(highlights);
  const substitutesRef = useRef(substitutes);
  const variablesRef = useRef(variables);
  const statusRef = useRef(status);
  const echoStreamsToMainRef = useRef(echoStreamsToMain);
  const activeStreamRef = useRef(activeStream);
  const currentProfileRef = useRef(currentProfile);
  const handleCommandRef = useRef<(cmd: string, isAutomated?: boolean) => void>(() => {});

  useEffect(() => { triggersRef.current = triggers; }, [triggers]);
  useEffect(() => { highlightsRef.current = highlights; }, [highlights]);
  useEffect(() => { substitutesRef.current = substitutes; }, [substitutes]);
  useEffect(() => { variablesRef.current = variables; }, [variables]);
  useEffect(() => { statusRef.current = status; }, [status]);
  useEffect(() => { echoStreamsToMainRef.current = echoStreamsToMain; }, [echoStreamsToMain]);
  useEffect(() => { activeStreamRef.current = activeStream; }, [activeStream]);
  useEffect(() => { currentProfileRef.current = currentProfile; }, [currentProfile]);

  // Synchronous variable modification: instantly available to running scripts and triggers without lag
  const updateGlobalVariable = useCallback((key: string, value: string) => {
    const cleanKey = key.replace(/^[\$#]/, '').toLowerCase();
    variablesRef.current = {
      ...variablesRef.current,
      [cleanKey]: value,
    };
    setVariables((prev) => ({
      ...prev,
      [cleanKey]: value,
    }));
    // Immediately notify active script interpreter so waiting actions or loops resume with zero lag
    if (interpreterRef.current) {
      interpreterRef.current.onVariableChanged(cleanKey, value);
    }
  }, []);

  const deleteGlobalVariable = useCallback((key: string) => {
    const cleanKey = key.replace(/^[\$#]/, '').toLowerCase();
    const next = { ...variablesRef.current };
    delete next[cleanKey];
    variablesRef.current = next;
    setVariables(next);
  }, []);

  // Switch active window stream and clear its unread badge
  const handleSelectStream = useCallback((streamId: string) => {
    setActiveStream(streamId);
    setWindowConfigs((prev) =>
      prev.map((cfg) => (cfg.id === streamId ? { ...cfg, unreadCount: 0 } : cfg))
    );
  }, []);

  // Clear output of a specific stream or active stream
  const handleClearOutput = useCallback((streamId?: string) => {
    const target = streamId || activeStreamRef.current;
    setWindowBuffers((prev) => ({
      ...prev,
      [target]: [],
    }));
  }, []);

  // Robust Stream & Line Router (Zero-Lag Pre-Computed Highlighting & Batch Window Buffering)
  const addOutputLines = useCallback((linesData: Partial<OutputLine>[]) => {
    if (!linesData || linesData.length === 0) return;

    const currentSubs = substitutesRef.current;
    const currentHls = highlightsRef.current;
    const currentTriggers = triggersRef.current;
    const echoToMain = echoStreamsToMainRef.current;
    const activeStr = activeStreamRef.current;

    const processedLines: OutputLine[] = [];
    const triggerActionsToRun: { actionType: string; actionValue: string }[] = [];

    for (const lineData of linesData) {
      const rawText = lineData.text || '';
      const processedText = rawText ? applySubstitutes(rawText, currentSubs) : '';
      const targetStream = lineData.stream || 'main';

      // Pre-compute highlights at ingestion time (Genie Core/Game.cs PrintTextWithParse model)
      const hlResult = applyHighlightsToLine(processedText, lineData.segments, currentHls);
      const hasSegments = !!(hlResult.segments && hlResult.segments.length > 0);

      const newLine: OutputLine = {
        id: lineData.id || `line-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        text: processedText,
        stream: targetStream,
        timestamp: lineData.timestamp || new Date().toLocaleTimeString(),
        color: hasSegments ? undefined : (lineData.color || hlResult.color),
        bgColor: hasSegments ? undefined : (lineData.bgColor || hlResult.bgColor),
        bold: hasSegments ? false : (lineData.bold !== undefined ? lineData.bold : hlResult.bold),
        isPrompt: lineData.isPrompt,
        isInput: lineData.isInput,
        isSystem: lineData.isSystem,
        segments: hlResult.segments || lineData.segments,
      };

      processedLines.push(newLine);

      // Inform active script of new output (for instant match / waitfor / script actions)
      if (interpreterRef.current && processedText && !lineData.isInput) {
        interpreterRef.current.onGameOutput(processedText);
      }

      // Check Autonomous Triggers with capture-group substitution ($1, $2, etc.)
      if (!lineData.isInput && processedText && currentTriggers.length > 0) {
        processTriggers(processedText, currentTriggers, (actionType, actionValue) => {
          triggerActionsToRun.push({ actionType, actionValue });
        });
      }
    }

    // Batch update window buffers in a single React state flush
    setWindowBuffers((prev) => {
      const next = { ...prev };
      for (const line of processedLines) {
        const stream = line.stream;
        const existing = next[stream] || [];
        next[stream] = [...existing.slice(-999), line];

        // Also echo to Main if enabled and not already Main or Raw or System
        if (echoToMain && stream !== 'main' && stream !== 'raw' && !line.isSystem) {
          const mainExisting = next.main || [];
          next.main = [...mainExisting.slice(-999), line];
        }
      }
      return next;
    });

    // Update unread count for non-active windows in one pass
    const unreadIncrements: Record<string, number> = {};
    for (const line of processedLines) {
      if (line.stream !== activeStr) {
        unreadIncrements[line.stream] = (unreadIncrements[line.stream] || 0) + 1;
      }
    }
    if (Object.keys(unreadIncrements).length > 0) {
      setWindowConfigs((prev) =>
        prev.map((cfg) => {
          const inc = unreadIncrements[cfg.id];
          return inc ? { ...cfg, unreadCount: cfg.unreadCount + inc } : cfg;
        })
      );
    }

    // Execute matched trigger actions immediately without artificial delays
    if (triggerActionsToRun.length > 0) {
      for (const act of triggerActionsToRun) {
        if (act.actionType === 'command') {
          handleCommandRef.current(act.actionValue, true);
        } else if (act.actionType === 'echo') {
          addOutputLines([
            {
              text: act.actionValue,
              stream: 'main',
              color: '#a855f7',
              bold: true,
            },
          ]);
        }
      }
    }
  }, []);

  const addOutputLine = useCallback(
    (lineData: Partial<OutputLine>) => {
      addOutputLines([lineData]);
    },
    [addOutputLines]
  );

  // Initialize XML Stream Parser mirroring Core/Game.cs with GRX-024 flush fix
  useEffect(() => {
    xmlParserRef.current = new GameXmlStreamParser({
      onAddLine: (line) => {
        addOutputLines([line]);
      },
      onAddLines: (lines) => {
        addOutputLines(lines);
      },
      onClearStream: (streamId) => {
        handleClearOutput(streamId);
      },
      onRegisterStreamWindow: (config) => {
        setWindowConfigs((prev) => {
          const existing = prev.find((c) => c.id === config.id);
          if (existing) {
            return prev.map((c) => (c.id === config.id ? { ...c, title: config.title || c.title } : c));
          }
          return [...prev, config];
        });
        setWindowBuffers((prev) => {
          if (!prev[config.id]) {
            return { ...prev, [config.id]: [] };
          }
          return prev;
        });
      },
      onRoundTime: (seconds) => {
        setStatus((prev) => ({
          ...prev,
          roundtimeRemaining: seconds,
          roundtimeTotal: seconds,
        }));
      },
      onCastTime: (seconds) => {
        setStatus((prev) => ({
          ...prev,
          castTimeRemaining: seconds,
          castTimeTotal: seconds,
          castReady: false,
        }));
      },
      onSpellPrepared: (spell) => {
        setStatus((prev) => ({ ...prev, preparedSpell: spell }));
      },
    });
  }, [addOutputLines, handleClearOutput]);

  // Tab focus recovery: ensure windows repaint cleanly and never stay black when returning to Genie
  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        // Force state touch to trigger clean redraw across all stream windows
        setWindowBuffers((prev) => ({ ...prev }));
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('focus', handleVisibility);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('focus', handleVisibility);
    };
  }, []);

  // Autonomous Experience Plugin: sends live skill experience pulses to the Experience window
  useEffect(() => {
    const expInterval = setInterval(() => {
      const skills = [
        'Shield Usage: 142 63% mind lock',
        'Parry Ability: 138 32% clear',
        'Attunement: 125 55% focused',
        'Targeted Magic: 130 41% learning',
      ];
      const randomSkill = skills[Math.floor(Math.random() * skills.length)];
      addOutputLine({
        text: `[Plugin: DR Experience Tracker] ${randomSkill} (+0.1%)`,
        stream: 'experience',
        color: '#38bdf8',
      });
    }, 45000);

    return () => clearInterval(expInterval);
  }, [addOutputLine]);

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

      // Direct XML Stream Testing (e.g. "xml <pushStream id="combat"/>Swords clash!<popStream/>")
      if (expanded.startsWith('xml ') || (expanded.startsWith('<') && expanded.includes('>'))) {
        const rawXml = expanded.startsWith('xml ') ? expanded.slice(4).trim() : expanded;
        if (xmlParserRef.current) {
          xmlParserRef.current.parseGameRow(rawXml);
          return;
        }
      }

      // Check Genie client commands starting with '#'
      if (expanded.startsWith('#')) {
        const parts = expanded.slice(1).trim().split(' ');
        const cCmd = parts[0].toLowerCase();
        const cArg = parts.slice(1).join(' ');

        if (cCmd === 'clear') {
          handleClearOutput(cArg || undefined);
          return;
        }

        if (cCmd === 'stream') {
          if (cArg) {
            handleSelectStream(cArg.toLowerCase());
          }
          return;
        }

        if (cCmd === 'echo') {
          addOutputLine({ text: cArg, stream: 'main', color: '#cbd5e1' });
          return;
        }

        // Global Variable Management (#var, #variable, #setvariable)
        if (cCmd === 'var' || cCmd === 'variable' || cCmd === 'setvariable' || cCmd === 'setvar') {
          if (!cArg) {
            // Display all global variables
            const all = { ...variablesRef.current };
            const keys = Object.keys(all);
            if (keys.length === 0) {
              addOutputLine({
                text: '[Genie Variables] No global variables defined. Set one with "#var <name> <value>".',
                stream: 'main',
                color: '#94a3b8',
              });
            } else {
              addOutputLine({
                text: `--- Genie Global Variables (${keys.length}) ---`,
                stream: 'main',
                color: '#38bdf8',
                bold: true,
              });
              keys.sort().forEach((k) => {
                addOutputLine({
                  text: `  $${k} = "${all[k]}"`,
                  stream: 'main',
                  color: '#e2e8f0',
                });
              });
            }
            return;
          }

          const spaceIdx = cArg.indexOf(' ');
          if (spaceIdx === -1) {
            // Query single variable: #var target
            const varName = cArg.toLowerCase();
            const val =
              variablesRef.current[varName] ??
              getSystemVariable(varName, statusRef.current, currentProfileRef.current?.name);
            if (val !== undefined) {
              addOutputLine({
                text: `[Genie Variable] $${varName} = "${val}"`,
                stream: 'main',
                color: '#38bdf8',
              });
            } else {
              addOutputLine({
                text: `[Genie Variable] $${varName} is not set.`,
                stream: 'main',
                color: '#94a3b8',
              });
            }
            return;
          }

          // Set variable: #var <name> <value>
          const varName = cArg.slice(0, spaceIdx).trim();
          let varVal = cArg.slice(spaceIdx + 1).trim();

          // Substitute variables in value if present
          varVal = substituteVariablesInText(
            varVal,
            undefined,
            variablesRef.current,
            statusRef.current,
            currentProfileRef.current?.name
          );

          updateGlobalVariable(varName, varVal);
          if (!isAutomated) {
            addOutputLine({
              text: `[Genie Variable] Set $${varName} = "${varVal}"`,
              stream: 'main',
              color: '#22c55e',
            });
          }
          return;
        }

        // Delete variable (#unvar, #deletevariable)
        if (cCmd === 'unvar' || cCmd === 'deletevariable') {
          if (cArg) {
            deleteGlobalVariable(cArg.trim());
            addOutputLine({
              text: `[Genie Variable] Removed $${cArg.trim()}`,
              stream: 'main',
              color: '#ef4444',
            });
          }
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

        if (cCmd === 'plugin') {
          const pAction = parts[1]?.toLowerCase();
          if (pAction === 'list' || !pAction) {
            addOutputLine({
              text: '[Genie Plugins] Active plugins: DR Experience Tracker v2.4 (Enabled), AutoMapper v3.1 (Enabled).',
              stream: 'main',
              color: '#38bdf8',
            });
            addOutputLine({
              text: 'Skill Experience pulse: Shield Usage: 142 (62%), Parry Ability: 138 (31%), Attunement: 125 (54%).',
              stream: 'experience',
              color: '#38bdf8',
            });
          } else if (pAction === 'exp' || pAction === 'experience') {
            addOutputLine({
              text: '[Plugin: DR Experience Tracker] Emitting updated skill pulse to Experience window.',
              stream: 'main',
              color: '#22c55e',
            });
            const expPulses = [
              { text: '--- DR Experience Tracker [Active Plugin Pulse] ---', color: '#38bdf8', bold: true },
              { text: '  Shield Usage:       142 [06/34] 62% mind lock (+1.2% / min)', color: '#e2e8f0', bold: false },
              { text: '  Parry Ability:      138 [03/34] 31% clear     (+0.8% / min)', color: '#e2e8f0', bold: false },
              { text: '  Attunement:         125 [05/34] 54% focused   (+2.1% / min)', color: '#e2e8f0', bold: false },
              { text: '  Targeted Magic:     130 [04/34] 40% learning  (+1.5% / min)', color: '#e2e8f0', bold: false },
              { text: 'Overall Mind State: clear (0/34 pool) | Rate: 5.6% total TDP', color: '#22c55e', bold: false },
            ];
            expPulses.forEach((p) => addOutputLine({ text: p.text, stream: 'experience', color: p.color, bold: p.bold }));
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
    [aliases, currentRoomId, inventory, roomItems, rooms, status, addOutputLine, scripts, deleteGlobalVariable, updateGlobalVariable]
  );

  useEffect(() => {
    handleCommandRef.current = handleCommand;
  }, [handleCommand]);

  // Script runner methods
  const startScript = (name: string, code: string, args: string[] = []) => {
    if (interpreterRef.current) {
      interpreterRef.current.destroy();
    }

    const interp = new GenieScriptInterpreter(
      name,
      code,
      {
        sendOutput: (text, color) => addOutputLines([{ text, stream: 'main', color }]),
        sendCommand: (cmd) => handleCommand(cmd, true),
        onStateChange: (st) => setActiveScriptState(st),
        onFinished: () => {
          setActiveScriptState(null);
          interpreterRef.current = null;
        },
        getGlobalVariable: (varName) => {
          const clean = varName.replace(/^[\$%]/, '').toLowerCase();
          if (variablesRef.current[clean] !== undefined) return variablesRef.current[clean];
          return getSystemVariable(clean, statusRef.current, currentProfileRef.current?.name);
        },
        setGlobalVariable: (varName, val) => {
          updateGlobalVariable(varName, val);
        },
        getAllGlobalVariables: () => {
          return { ...variablesRef.current };
        },
      },
      args
    );

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
            windowBuffers={windowBuffers}
            windowConfigs={windowConfigs}
            activeStream={activeStream}
            setActiveStream={handleSelectStream}
            highlights={highlights}
            macros={macros}
            theme={theme}
            onSendCommand={handleCommand}
            onClearOutput={handleClearOutput}
            onAddHighlightText={handleAddHighlightText}
            onAddTriggerText={handleAddTriggerText}
            onAddSubstituteText={handleAddSubstituteText}
            onAddAliasText={handleAddAliasText}
            echoStreamsToMain={echoStreamsToMain}
            onToggleEchoStreams={() => setEchoStreamsToMain(!echoStreamsToMain)}
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
