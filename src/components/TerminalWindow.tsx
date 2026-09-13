import React, { useState, useRef, useEffect } from 'react';
import {
  OutputLine,
  StreamId,
  HighlightRule,
  ThemeType,
  MacroRule,
} from '../types';
import { applyHighlights } from '../utils/gameEngine';
import {
  Send,
  Trash2,
  ArrowDown,
  Sparkles,
  Zap,
  MessageSquare,
  Swords,
  Layers,
} from 'lucide-react';

interface TerminalWindowProps {
  lines: OutputLine[];
  highlights: HighlightRule[];
  macros: MacroRule[];
  theme: ThemeType;
  onSendCommand: (cmd: string) => void;
  onClearOutput: () => void;
  onAddHighlightText: (text: string) => void;
  onAddTriggerText: (text: string) => void;
  onAddSubstituteText: (text: string) => void;
  onAddAliasText: (text: string) => void;
}

export const TerminalWindow: React.FC<TerminalWindowProps> = ({
  lines,
  highlights,
  macros,
  theme,
  onSendCommand,
  onClearOutput,
  onAddHighlightText,
  onAddTriggerText,
  onAddSubstituteText,
  onAddAliasText,
}) => {
  const [activeStream, setActiveStream] = useState<StreamId>('main');
  const [inputValue, setInputValue] = useState('');
  const [history, setHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState<number>(-1);
  const [selectedText, setSelectedText] = useState<string>('');
  const [contextMenuPos, setContextMenuPos] = useState<{ x: number; y: number } | null>(null);
  const [isAutoScroll, setIsAutoScroll] = useState(true);

  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Filter lines by active stream
  const filteredLines = lines.filter((line) => {
    if (activeStream === 'raw') return true;
    if (activeStream === 'main') return true;
    return line.stream === activeStream;
  });

  // Auto-scroll on new lines
  useEffect(() => {
    if (isAutoScroll && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [filteredLines, isAutoScroll]);

  // Track scroll position to pause auto-scroll if user scrolled up
  const handleScroll = () => {
    if (!scrollRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
    const isAtBottom = scrollHeight - scrollTop - clientHeight < 40;
    setIsAutoScroll(isAtBottom);
  };

  const handleSend = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = inputValue.trim();
    if (!trimmed) return;

    onSendCommand(trimmed);
    setHistory((prev) => [...prev, trimmed]);
    setHistoryIndex(-1);
    setInputValue('');
  };

  // Keyboard navigation for history (Up/Down) & Macros
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
      // Check Macro
      const matchedMacro = macros.find((m) => m.key.toLowerCase() === e.key.toLowerCase());
      if (matchedMacro) {
        e.preventDefault();
        onSendCommand(matchedMacro.command);
      }
    }
  };

  // Shift+Select detection for Genie Remix context menu
  const handleMouseUp = (e: React.MouseEvent) => {
    const selection = window.getSelection()?.toString().trim();
    if (selection && e.shiftKey) {
      setSelectedText(selection);
      setContextMenuPos({ x: e.clientX, y: e.clientY });
    } else {
      setContextMenuPos(null);
    }
  };

  // Theme-specific colors
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

  return (
    <div
      id="terminal-window"
      className="flex-1 flex flex-col h-full bg-stone-950 text-stone-200 relative overflow-hidden"
    >
      {/* Stream Selector Bar */}
      <div className="bg-stone-900/90 border-b border-stone-800 px-3 py-1 flex items-center justify-between text-xs select-none">
        <div className="flex items-center space-x-1">
          <button
            onClick={() => setActiveStream('main')}
            className={`flex items-center space-x-1 px-2 py-0.5 rounded text-xs transition-colors ${
              activeStream === 'main'
                ? 'bg-amber-600/30 text-amber-300 font-semibold border border-amber-600/50'
                : 'text-stone-400 hover:text-stone-200 hover:bg-stone-800'
            }`}
          >
            <Layers className="w-3 h-3" />
            <span>Main</span>
          </button>

          <button
            onClick={() => setActiveStream('combat')}
            className={`flex items-center space-x-1 px-2 py-0.5 rounded text-xs transition-colors ${
              activeStream === 'combat'
                ? 'bg-red-900/40 text-red-300 font-semibold border border-red-700/50'
                : 'text-stone-400 hover:text-stone-200 hover:bg-stone-800'
            }`}
          >
            <Swords className="w-3 h-3 text-red-400" />
            <span>Combat</span>
          </button>

          <button
            onClick={() => setActiveStream('speech')}
            className={`flex items-center space-x-1 px-2 py-0.5 rounded text-xs transition-colors ${
              activeStream === 'speech'
                ? 'bg-sky-900/40 text-sky-300 font-semibold border border-sky-700/50'
                : 'text-stone-400 hover:text-stone-200 hover:bg-stone-800'
            }`}
          >
            <MessageSquare className="w-3 h-3 text-sky-400" />
            <span>Speech</span>
          </button>

          <button
            onClick={() => setActiveStream('thoughts')}
            className={`flex items-center space-x-1 px-2 py-0.5 rounded text-xs transition-colors ${
              activeStream === 'thoughts'
                ? 'bg-purple-900/40 text-purple-300 font-semibold border border-purple-700/50'
                : 'text-stone-400 hover:text-stone-200 hover:bg-stone-800'
            }`}
          >
            <Sparkles className="w-3 h-3 text-purple-400" />
            <span>Thoughts</span>
          </button>

          <button
            onClick={() => setActiveStream('raw')}
            className={`flex items-center space-x-1 px-2 py-0.5 rounded text-xs transition-colors ${
              activeStream === 'raw'
                ? 'bg-stone-800 text-stone-200 font-semibold border border-stone-600'
                : 'text-stone-400 hover:text-stone-200 hover:bg-stone-800'
            }`}
          >
            <span>Raw XML</span>
          </button>
        </div>

        {/* Action Controls */}
        <div className="flex items-center space-x-2">
          <span className="text-[11px] text-stone-500 hidden sm:inline">
            Shift+Select text to configure
          </span>
          <button
            id="btn-clear-terminal"
            onClick={onClearOutput}
            title="Clear output buffer"
            className="p-1 rounded text-stone-400 hover:text-rose-400 hover:bg-stone-800 transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Main Terminal Output Buffer */}
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        onMouseUp={handleMouseUp}
        className={`flex-1 overflow-y-auto p-3 font-mono text-sm leading-relaxed space-y-0.5 ${getThemeClass()}`}
      >
        {filteredLines.map((line) => {
          const highlight = applyHighlights(line, highlights);
          const customColor = highlight.color || line.color;
          const customBg = highlight.bgColor || line.bgColor;
          const isBold = highlight.bold || line.bold;

          return (
            <div
              key={line.id}
              className={`transition-opacity duration-150 ${
                line.isInput ? 'text-amber-300 pl-2 border-l-2 border-amber-600' : ''
              } ${line.isSystem ? 'text-stone-500 text-xs italic' : ''}`}
              style={{
                color: customColor,
                backgroundColor: customBg,
                fontWeight: isBold ? 700 : 400,
              }}
            >
              {line.isInput && <span className="text-amber-500 mr-1 select-none">&gt;</span>}
              <span>{line.text}</span>
            </div>
          );
        })}

        {filteredLines.length === 0 && (
          <div className="text-stone-500 text-center italic py-8">
            Terminal ready. Type &apos;look&apos; or &apos;help&apos; to begin.
          </div>
        )}
      </div>

      {/* Scroll to Bottom Indicator */}
      {!isAutoScroll && (
        <button
          onClick={() => {
            setIsAutoScroll(true);
            if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
          }}
          className="absolute bottom-14 right-4 bg-amber-600/90 text-stone-950 font-bold px-2 py-1 rounded-full shadow-lg text-xs flex items-center gap-1 hover:bg-amber-500 transition-all z-10"
        >
          <ArrowDown className="w-3 h-3" />
          <span>Latest Output</span>
        </button>
      )}

      {/* Shift+Select Context Menu (Genie Remix Feature) */}
      {contextMenuPos && selectedText && (
        <div
          className="fixed z-50 bg-stone-900 border border-stone-700 text-stone-200 text-xs rounded-lg shadow-xl p-1 w-52"
          style={{ top: contextMenuPos.y, left: contextMenuPos.x }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="px-2 py-1 border-b border-stone-800 text-[11px] font-semibold text-amber-400 truncate">
            Send &quot;{selectedText}&quot; to:
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
            className="bg-stone-800 hover:bg-stone-700 text-stone-300 px-1.5 py-0.5 rounded border border-stone-700 font-mono transition-colors whitespace-nowrap"
            title={`${m.key}: ${m.command}`}
          >
            <span className="text-amber-400 font-bold">{m.key}</span> {m.command}
          </button>
        ))}
      </div>

      {/* Input Form */}
      <form
        id="genie-input-form"
        onSubmit={handleSend}
        className="bg-stone-900/95 border-t border-stone-800 p-2 flex items-center space-x-2"
      >
        <span className="font-mono text-amber-400 font-bold text-sm pl-1 select-none">&gt;</span>
        <input
          ref={inputRef}
          id="cmd-input"
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Enter DragonRealms or #command (e.g. look, forage, prep, #goto 5)..."
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
    </div>
  );
};
