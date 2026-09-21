import React, { useState, useRef, useEffect, useLayoutEffect, memo } from 'react';
import {
  OutputLine,
  HighlightRule,
  ThemeType,
  MacroRule,
  StreamWindowConfig,
} from '../types';
import {
  Send,
  Trash2,
  ArrowDown,
  Sparkles,
  MessageSquare,
  Swords,
  Layers,
  Eye,
  Package,
  Wand2,
  Bird,
  Skull,
  UserCheck,
  Code2,
  Columns,
  Maximize2,
  Copy,
  Check,
  GraduationCap,
} from 'lucide-react';

interface TerminalWindowProps {
  windowBuffers: Record<string, OutputLine[]>;
  windowConfigs: StreamWindowConfig[];
  activeStream: string;
  setActiveStream: (streamId: string) => void;
  highlights: HighlightRule[];
  macros: MacroRule[];
  theme: ThemeType;
  onSendCommand: (cmd: string) => void;
  onClearOutput: (streamId?: string) => void;
  onAddHighlightText: (text: string) => void;
  onAddTriggerText: (text: string) => void;
  onAddSubstituteText: (text: string) => void;
  onAddAliasText: (text: string) => void;
  echoStreamsToMain: boolean;
  onToggleEchoStreams: () => void;
}

// Stream icons mapping
const getStreamIcon = (id: string) => {
  switch (id) {
    case 'combat':
      return <Swords className="w-3 h-3 text-red-400" />;
    case 'speech':
      return <MessageSquare className="w-3 h-3 text-sky-400" />;
    case 'thoughts':
      return <Sparkles className="w-3 h-3 text-purple-400" />;
    case 'room':
      return <Eye className="w-3 h-3 text-emerald-400" />;
    case 'experience':
      return <GraduationCap className="w-3 h-3 text-amber-400" />;
    case 'inv':
      return <Package className="w-3 h-3 text-amber-400" />;
    case 'activespells':
      return <Wand2 className="w-3 h-3 text-cyan-400" />;
    case 'familiar':
      return <Bird className="w-3 h-3 text-teal-400" />;
    case 'death':
      return <Skull className="w-3 h-3 text-rose-500" />;
    case 'logons':
      return <UserCheck className="w-3 h-3 text-lime-400" />;
    case 'raw':
      return <Code2 className="w-3 h-3 text-stone-400" />;
    case 'main':
    default:
      return <Layers className="w-3 h-3 text-amber-400" />;
  }
};

// Memoized individual terminal output line: Renders in O(1) time with 0 regex evaluation and zero animation flicker
const TerminalLineItem = memo(
  ({ line, onCommandClick }: { line: OutputLine; onCommandClick?: (cmd: string) => void }) => {
    return (
      <div
        className={`select-text ${
          line.isInput ? 'text-amber-300 pl-2 border-l-2 border-amber-600 my-0.5' : ''
        } ${line.isSystem ? 'text-stone-500 text-xs italic' : ''}`}
        style={{
          color: line.color,
          backgroundColor: line.bgColor,
          fontWeight: line.bold ? 700 : 400,
        }}
      >
        {line.isInput && <span className="text-amber-500 mr-1 select-none font-bold">&gt;</span>}
        {line.segments && line.segments.length > 0 ? (
          line.segments.map((seg, idx) => (
            <span
              key={idx}
              onClick={seg.cmd && onCommandClick ? () => onCommandClick(seg.cmd!) : undefined}
              className={`whitespace-pre-wrap break-words ${
                seg.cmd
                  ? 'cursor-pointer underline decoration-dotted text-sky-400 hover:text-amber-300 transition-colors'
                  : ''
              }`}
              style={{
                color: seg.color || line.color,
                backgroundColor: seg.bgColor || line.bgColor,
                fontWeight: seg.bold ? 700 : line.bold ? 700 : 400,
              }}
              title={seg.cmd ? `Click to send command: ${seg.cmd}` : undefined}
            >
              {seg.text}
            </span>
          ))
        ) : (
          <span className="whitespace-pre-wrap break-words">{line.text}</span>
        )}
      </div>
    );
  }
);
TerminalLineItem.displayName = 'TerminalLineItem';

// Single stream view pane with independent scroll and buffer
interface StreamPaneProps {
  streamId: string;
  title: string;
  lines: OutputLine[];
  themeClass: string;
  onClear: () => void;
  onShiftSelect: (e: React.MouseEvent) => void;
  onSendCommand?: (cmd: string) => void;
  isSubPane?: boolean;
}

const StreamPane: React.FC<StreamPaneProps> = ({
  streamId,
  title,
  lines,
  themeClass,
  onClear,
  onShiftSelect,
  onSendCommand,
  isSubPane = false,
}) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [isAutoScroll, setIsAutoScroll] = useState(true);
  const [copied, setCopied] = useState(false);
  const savedScrollTopRef = useRef<number>(0);

  // Preserve scroll position when scrolled back to eliminate scroll flicker when new lines arrive
  useLayoutEffect(() => {
    if (!scrollRef.current) return;
    if (isAutoScroll) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    } else {
      scrollRef.current.scrollTop = savedScrollTopRef.current;
    }
  }, [lines, isAutoScroll]);

  const handleScroll = () => {
    if (!scrollRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
    savedScrollTopRef.current = scrollTop;
    const isAtBottom = scrollHeight - scrollTop - clientHeight < 30;
    setIsAutoScroll(isAtBottom);
  };

  const handleCopyText = () => {
    const fullText = lines.map((l) => l.text).join('\n');
    navigator.clipboard.writeText(fullText);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className={`flex-1 flex flex-col h-full relative overflow-hidden ${isSubPane ? 'border-l border-stone-800' : ''}`}>
      {/* Pane Header (for sub-panes or docked windows) */}
      {isSubPane && (
        <div className="bg-stone-900/90 border-b border-stone-800 px-3 py-1 flex items-center justify-between text-xs select-none">
          <div className="flex items-center space-x-1.5 font-medium text-stone-300">
            {getStreamIcon(streamId)}
            <span>{title}</span>
            <span className="text-[10px] text-stone-500 font-mono">({lines.length} lines)</span>
          </div>
          <div className="flex items-center space-x-1">
            <button
              onClick={handleCopyText}
              title="Copy pane text"
              className="p-1 rounded text-stone-400 hover:text-stone-200 hover:bg-stone-800 transition-colors"
            >
              {copied ? <Check className="w-3 h-3 text-green-400" /> : <Copy className="w-3 h-3" />}
            </button>
            <button
              onClick={onClear}
              title="Clear this window"
              className="p-1 rounded text-stone-400 hover:text-rose-400 hover:bg-stone-800 transition-colors"
            >
              <Trash2 className="w-3 h-3" />
            </button>
          </div>
        </div>
      )}

      {/* Output Content Area */}
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        onMouseUp={onShiftSelect}
        className={`flex-1 overflow-y-auto p-3 font-mono text-sm leading-relaxed space-y-0.5 select-text ${themeClass}`}
      >
        {lines.map((line) => (
          <TerminalLineItem key={line.id} line={line} onCommandClick={onSendCommand} />
        ))}

        {lines.length === 0 && (
          <div className="text-stone-500 text-center italic py-12 select-none">
            {streamId === 'main'
              ? "Terminal ready. Type 'look', 'inv', 'spells', or 'help' to begin."
              : `Window [${title}] is active and listening for live game streams.`}
          </div>
        )}
      </div>

      {/* Scroll to Bottom Button */}
      {!isAutoScroll && (
        <button
          onClick={() => {
            setIsAutoScroll(true);
            if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
          }}
          className="absolute bottom-3 right-3 bg-amber-600/95 text-stone-950 font-bold px-2 py-1 rounded-full shadow-lg text-xs flex items-center gap-1 hover:bg-amber-500 transition-all z-10 select-none cursor-pointer"
        >
          <ArrowDown className="w-3 h-3" />
          <span>Latest</span>
        </button>
      )}
    </div>
  );
};

// Isolated Command Line Input: 0ms Typing Latency, Never re-renders buffer!
interface TerminalInputBarProps {
  onSendCommand: (cmd: string) => void;
  macros: MacroRule[];
}

const TerminalInputBar: React.FC<TerminalInputBarProps> = ({ onSendCommand, macros }) => {
  const [inputValue, setInputValue] = useState('');
  const [history, setHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState<number>(-1);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleSend = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = inputValue.trim();
    if (!trimmed) return;

    onSendCommand(trimmed);
    setHistory((prev) => [...prev, trimmed]);
    setHistoryIndex(-1);
    setInputValue('');
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (history.length === 0) return;
      const nextIndex = historyIndex === -1 ? history.length - 1 : Math.max(0, historyIndex - 1);
      setHistoryIndex(nextIndex);
      setInputValue(history[nextIndex]);
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (historyIndex === -1) return;
      const nextIndex = historyIndex + 1;
      if (nextIndex >= history.length) {
        setHistoryIndex(-1);
        setInputValue('');
      } else {
        setHistoryIndex(nextIndex);
        setInputValue(history[nextIndex]);
      }
    } else if (e.key.startsWith('F') && !e.ctrlKey && !e.altKey) {
      const matchedMacro = macros.find((m) => m.key.toLowerCase() === e.key.toLowerCase());
      if (matchedMacro) {
        e.preventDefault();
        onSendCommand(matchedMacro.command);
      }
    }
  };

  return (
    <form
      id="genie-input-form"
      onSubmit={handleSend}
      className="bg-stone-900/95 border-t border-stone-800 p-2 flex items-center space-x-2 select-none"
    >
      <span className="font-mono text-amber-400 font-bold text-sm pl-1">&gt;</span>
      <input
        ref={inputRef}
        id="cmd-input"
        type="text"
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Enter DragonRealms or #command (e.g. look, inv, prep, forage, #goto 5)..."
        className="flex-1 bg-stone-950 border border-stone-700 rounded px-3 py-1.5 text-stone-100 font-mono text-sm focus:outline-none focus:border-amber-500 transition-colors"
        autoFocus
      />
      <button
        id="btn-send-cmd"
        type="submit"
        className="bg-amber-600 hover:bg-amber-500 text-stone-950 font-bold px-3 py-1.5 rounded flex items-center space-x-1 text-xs transition-colors cursor-pointer"
      >
        <Send className="w-3.5 h-3.5" />
        <span className="hidden sm:inline">Send</span>
      </button>
    </form>
  );
};

export const TerminalWindow: React.FC<TerminalWindowProps> = ({
  windowBuffers,
  windowConfigs,
  activeStream,
  setActiveStream,
  macros,
  theme,
  onSendCommand,
  onClearOutput,
  onAddHighlightText,
  onAddTriggerText,
  onAddSubstituteText,
  onAddAliasText,
  echoStreamsToMain,
  onToggleEchoStreams,
}) => {
  const [selectedText, setSelectedText] = useState<string>('');
  const [contextMenuPos, setContextMenuPos] = useState<{ x: number; y: number } | null>(null);

  // Multi-window docking state (classic Genie split screen)
  const [isSplitMode, setIsSplitMode] = useState(false);
  const [dockedStream, setDockedStream] = useState<string>('combat');

  // Shift+Select detection for quick-add context menu
  const handleMouseUp = (e: React.MouseEvent) => {
    const selection = window.getSelection()?.toString().trim();
    if (selection && e.shiftKey) {
      setSelectedText(selection);
      setContextMenuPos({ x: e.clientX, y: e.clientY });
    } else {
      setContextMenuPos(null);
    }
  };

  // Theme-specific CSS classes
  const getThemeClass = () => {
    switch (theme) {
      case 'amber':
        return 'bg-amber-950/30 text-amber-200 border-amber-800/40';
      case 'emerald':
        return 'bg-emerald-950/30 text-emerald-300 border-emerald-800/40';
      case 'classic':
        return 'bg-stone-900 text-stone-200 border-stone-700';
      case 'light':
        return 'bg-stone-100 text-stone-900 border-stone-300';
      case 'dark':
      default:
        return 'bg-stone-950 text-stone-100 border-stone-800';
    }
  };

  const themeClass = getThemeClass();
  const activeConfig = windowConfigs.find((c) => c.id === activeStream) || {
    id: activeStream,
    title: activeStream.charAt(0).toUpperCase() + activeStream.slice(1),
    unreadCount: 0,
  };
  const activeLines = windowBuffers[activeStream] || [];
  const dockedLines = windowBuffers[dockedStream] || [];
  const dockedConfig = windowConfigs.find((c) => c.id === dockedStream) || {
    id: dockedStream,
    title: dockedStream.charAt(0).toUpperCase() + dockedStream.slice(1),
    unreadCount: 0,
  };

  return (
    <div
      id="terminal-window"
      className="flex-1 flex flex-col h-full bg-stone-950 text-stone-200 relative overflow-hidden"
    >
      {/* Stream Tabs Bar with Live Unread Badges */}
      <div className="bg-stone-900/95 border-b border-stone-800 px-2 py-1 flex items-center justify-between text-xs select-none overflow-x-auto gap-2">
        <div className="flex items-center space-x-1 overflow-x-auto py-0.5">
          {windowConfigs.map((cfg) => {
            const isActive = activeStream === cfg.id;
            const hasUnread = cfg.unreadCount > 0;

            return (
              <button
                key={cfg.id}
                id={`tab-stream-${cfg.id}`}
                onClick={() => setActiveStream(cfg.id)}
                className={`flex items-center space-x-1 px-2.5 py-1 rounded text-xs transition-all whitespace-nowrap relative ${
                  isActive
                    ? 'bg-stone-800 text-amber-300 font-semibold border border-amber-500/50 shadow-sm'
                    : 'text-stone-400 hover:text-stone-200 hover:bg-stone-800/80 border border-transparent'
                }`}
              >
                {getStreamIcon(cfg.id)}
                <span>{cfg.title}</span>

                {/* Live Unread Badge for Non-Active Windows */}
                {hasUnread && !isActive && (
                  <span className="ml-1 px-1.5 py-0.2 rounded-full bg-red-600 text-white font-bold text-[10px] animate-pulse">
                    {cfg.unreadCount > 99 ? '99+' : cfg.unreadCount}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* View & Split Controls */}
        <div className="flex items-center space-x-2 pl-2 border-l border-stone-800 whitespace-nowrap">
          {/* Toggle Echo to Main */}
          <button
            onClick={onToggleEchoStreams}
            title={echoStreamsToMain ? 'Streams also echo into Main window (Click to isolate)' : 'Streams isolated to own windows (Click to echo to Main)'}
            className={`px-2 py-0.5 rounded text-[11px] font-mono transition-colors ${
              echoStreamsToMain
                ? 'bg-stone-800 text-amber-400 border border-amber-600/40'
                : 'bg-stone-900 text-stone-400 hover:text-stone-200 border border-stone-700'
            }`}
          >
            Echo: {echoStreamsToMain ? 'ON' : 'OFF'}
          </button>

          {/* Toggle Split/Docked View */}
          <button
            id="btn-toggle-split"
            onClick={() => setIsSplitMode(!isSplitMode)}
            title={isSplitMode ? 'Switch to single window view' : 'Split screen (Dock Combat/Spells alongside Main)'}
            className={`flex items-center space-x-1 px-2 py-0.5 rounded text-[11px] transition-colors ${
              isSplitMode
                ? 'bg-amber-600/30 text-amber-300 font-semibold border border-amber-500/50'
                : 'text-stone-400 hover:text-stone-200 hover:bg-stone-800 border border-transparent'
            }`}
          >
            <Columns className="w-3 h-3" />
            <span className="hidden md:inline">{isSplitMode ? 'Single' : 'Split'}</span>
          </button>

          {/* Dock Target Selector when Split Mode is Active */}
          {isSplitMode && (
            <select
              value={dockedStream}
              onChange={(e) => setDockedStream(e.target.value)}
              className="bg-stone-950 border border-stone-700 text-stone-300 text-[11px] rounded px-1.5 py-0.5 focus:outline-none"
            >
              <option value="combat">Dock: Combat</option>
              <option value="room">Dock: Room</option>
              <option value="inv">Dock: Inventory</option>
              <option value="activespells">Dock: Spells</option>
              <option value="speech">Dock: Speech</option>
              <option value="thoughts">Dock: Thoughts</option>
              <option value="familiar">Dock: Familiar</option>
              <option value="raw">Dock: Raw XML</option>
            </select>
          )}

          {/* Clear Current Window Button */}
          <button
            id="btn-clear-terminal"
            onClick={() => onClearOutput(activeStream)}
            title={`Clear ${activeConfig.title} window buffer`}
            className="p-1 rounded text-stone-400 hover:text-rose-400 hover:bg-stone-800 transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Main Terminal Output Buffer: Single View or Split View */}
      <div className="flex-1 flex overflow-hidden">
        {/* Primary Window Pane */}
        <StreamPane
          streamId={activeStream}
          title={activeConfig.title}
          lines={activeLines}
          themeClass={themeClass}
          onClear={() => onClearOutput(activeStream)}
          onShiftSelect={handleMouseUp}
          onSendCommand={onSendCommand}
        />

        {/* Secondary Docked Window Pane (if Split Mode enabled) */}
        {isSplitMode && (
          <StreamPane
            streamId={dockedStream}
            title={dockedConfig.title}
            lines={dockedLines}
            themeClass={themeClass}
            onClear={() => onClearOutput(dockedStream)}
            onShiftSelect={handleMouseUp}
            onSendCommand={onSendCommand}
            isSubPane={true}
          />
        )}
      </div>

      {/* Shift+Select Context Menu */}
      {contextMenuPos && selectedText && (
        <div
          className="fixed z-50 bg-stone-900 border border-stone-700 text-stone-200 text-xs rounded-lg shadow-2xl p-1 w-52 select-none"
          style={{ top: contextMenuPos.y, left: contextMenuPos.x }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="px-2 py-1 border-b border-stone-800 text-[11px] font-semibold text-amber-400 truncate">
            Add rule for &quot;{selectedText}&quot;:
          </div>
          <button
            className="w-full text-left px-2 py-1 hover:bg-stone-800 rounded text-stone-300 hover:text-white"
            onClick={() => {
              onAddHighlightText(selectedText);
              setContextMenuPos(null);
            }}
          >
            🎨 Highlights
          </button>
          <button
            className="w-full text-left px-2 py-1 hover:bg-stone-800 rounded text-stone-300 hover:text-white"
            onClick={() => {
              onAddTriggerText(selectedText);
              setContextMenuPos(null);
            }}
          >
            ⚡ Triggers
          </button>
          <button
            className="w-full text-left px-2 py-1 hover:bg-stone-800 rounded text-stone-300 hover:text-white"
            onClick={() => {
              onAddSubstituteText(selectedText);
              setContextMenuPos(null);
            }}
          >
            🔄 Substitutes
          </button>
          <button
            className="w-full text-left px-2 py-1 hover:bg-stone-800 rounded text-stone-300 hover:text-white"
            onClick={() => {
              onAddAliasText(selectedText);
              setContextMenuPos(null);
            }}
          >
            📝 Aliases
          </button>
        </div>
      )}

      {/* Quick Macro Shortcut Bar */}
      <div className="bg-stone-900 border-t border-stone-800 px-3 py-1 flex items-center space-x-1.5 overflow-x-auto text-[11px] text-stone-400 select-none">
        <span className="text-stone-500 font-semibold uppercase text-[10px]">Macros:</span>
        {macros.slice(0, 6).map((m) => (
          <button
            key={m.id}
            onClick={() => onSendCommand(m.command)}
            className="bg-stone-800 hover:bg-stone-700 text-stone-300 px-1.5 py-0.5 rounded border border-stone-700 font-mono transition-colors whitespace-nowrap cursor-pointer"
            title={`${m.key}: ${m.command}`}
          >
            <span className="text-amber-400 font-bold">{m.key}</span> {m.command}
          </button>
        ))}
      </div>

      {/* Fully Decoupled Command Input Bar (Zero Typing Lag!) */}
      <TerminalInputBar onSendCommand={onSendCommand} macros={macros} />
    </div>
  );
};
