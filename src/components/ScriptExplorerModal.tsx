import React, { useState } from 'react';
import { ScriptState } from '../types';
import {
  Play,
  Pause,
  Square,
  FileCode,
  Plus,
  Trash2,
  Check,
  AlertCircle,
  Clock,
  Terminal,
} from 'lucide-react';

interface ScriptItem {
  name: string;
  description: string;
  code: string;
}

interface ScriptExplorerModalProps {
  scripts: ScriptItem[];
  activeScriptState: ScriptState | null;
  onRunScript: (name: string, code: string) => void;
  onPauseScript: () => void;
  onResumeScript: () => void;
  onStopScript: () => void;
  onSaveScript: (script: ScriptItem) => void;
  onDeleteScript: (name: string) => void;
}

export const ScriptExplorerModal: React.FC<ScriptExplorerModalProps> = ({
  scripts,
  activeScriptState,
  onRunScript,
  onPauseScript,
  onResumeScript,
  onStopScript,
  onSaveScript,
  onDeleteScript,
}) => {
  const [selectedScriptName, setSelectedScriptName] = useState<string>(
    scripts[0]?.name || ''
  );
  const [editedCode, setEditedCode] = useState<string>(scripts[0]?.code || '');
  const [editedDescription, setEditedDescription] = useState<string>(
    scripts[0]?.description || ''
  );
  const [isSavedNotice, setIsSavedNotice] = useState(false);

  const selectedScript = scripts.find((s) => s.name === selectedScriptName);

  const handleSelectScript = (s: ScriptItem) => {
    setSelectedScriptName(s.name);
    setEditedCode(s.code);
    setEditedDescription(s.description);
    setIsSavedNotice(false);
  };

  const handleSave = () => {
    if (!selectedScriptName) return;
    onSaveScript({
      name: selectedScriptName,
      description: editedDescription,
      code: editedCode,
    });
    setIsSavedNotice(true);
    setTimeout(() => setIsSavedNotice(false), 2000);
  };

  const handleCreateNew = () => {
    const newName = `custom_script_${Date.now().toString().slice(-4)}.cmd`;
    const newScript: ScriptItem = {
      name: newName,
      description: 'Custom DragonRealms automation script',
      code: `# Genie Remix Custom Script
echo *** Running ${newName} ***
put look
pause 2
echo *** Routine complete ***
`,
    };
    onSaveScript(newScript);
    setSelectedScriptName(newName);
    setEditedCode(newScript.code);
    setEditedDescription(newScript.description);
  };

  const isCurrentScriptRunning =
    activeScriptState &&
    activeScriptState.name === selectedScriptName &&
    activeScriptState.status !== 'stopped' &&
    activeScriptState.status !== 'idle';

  return (
    <div
      id="script-explorer-container"
      className="flex-1 flex flex-col md:flex-row h-full bg-stone-950 text-stone-200 overflow-hidden select-none"
    >
      {/* Script List Sidebar */}
      <div className="w-full md:w-64 bg-stone-900 border-r border-stone-800 flex flex-col">
        <div className="p-3 border-b border-stone-800 flex items-center justify-between">
          <span className="text-xs font-bold text-stone-300 uppercase tracking-wider flex items-center gap-1.5">
            <FileCode className="w-4 h-4 text-amber-400" />
            Genie Scripts
          </span>
          <button
            id="btn-new-script"
            onClick={handleCreateNew}
            className="p-1 bg-stone-800 hover:bg-stone-700 text-amber-400 rounded border border-stone-700 transition-colors"
            title="Create new script"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto divide-y divide-stone-800/60 p-1 space-y-0.5">
          {scripts.map((s) => {
            const isRunning =
              activeScriptState?.name === s.name &&
              activeScriptState.status !== 'stopped' &&
              activeScriptState.status !== 'idle';

            return (
              <button
                key={s.name}
                onClick={() => handleSelectScript(s)}
                className={`w-full text-left p-2.5 rounded transition-all ${
                  selectedScriptName === s.name
                    ? 'bg-stone-800 border-l-2 border-amber-500 text-stone-100 shadow'
                    : 'text-stone-400 hover:text-stone-200 hover:bg-stone-800/40'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs font-bold truncate text-stone-200">
                    {s.name}
                  </span>
                  {isRunning && (
                    <span className="flex items-center space-x-1 text-[10px] bg-emerald-950 text-emerald-400 border border-emerald-800 px-1.5 py-0.5 rounded font-mono animate-pulse">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                      <span>{activeScriptState.status}</span>
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-stone-400 mt-1 line-clamp-2">
                  {s.description}
                </p>
              </button>
            );
          })}
        </div>
      </div>

      {/* Editor & Execution Pane */}
      <div className="flex-1 flex flex-col h-full bg-stone-950 overflow-hidden">
        {/* Editor Controls Bar */}
        <div className="bg-stone-900 border-b border-stone-800 px-4 py-2 flex flex-wrap items-center justify-between gap-2 select-none">
          <div className="flex items-center space-x-3">
            <span className="font-mono text-sm font-bold text-amber-300">
              {selectedScriptName}
            </span>
            <input
              type="text"
              value={editedDescription}
              onChange={(e) => setEditedDescription(e.target.value)}
              placeholder="Script description..."
              className="bg-stone-950 border border-stone-800 rounded px-2 py-0.5 text-xs text-stone-300 focus:outline-none focus:border-stone-600 w-64 hidden sm:inline-block"
            />
          </div>

          <div className="flex items-center space-x-2">
            {/* Run / Stop / Pause Controls */}
            {isCurrentScriptRunning ? (
              <>
                {activeScriptState.status === 'paused' ? (
                  <button
                    onClick={onResumeScript}
                    className="flex items-center space-x-1 px-3 py-1 bg-sky-600 hover:bg-sky-500 text-white rounded text-xs font-bold transition-colors cursor-pointer"
                  >
                    <Play className="w-3.5 h-3.5" />
                    <span>Resume</span>
                  </button>
                ) : (
                  <button
                    onClick={onPauseScript}
                    className="flex items-center space-x-1 px-3 py-1 bg-amber-600 hover:bg-amber-500 text-stone-950 rounded text-xs font-bold transition-colors cursor-pointer"
                  >
                    <Pause className="w-3.5 h-3.5" />
                    <span>Pause</span>
                  </button>
                )}

                <button
                  onClick={onStopScript}
                  className="flex items-center space-x-1 px-3 py-1 bg-rose-600 hover:bg-rose-500 text-white rounded text-xs font-bold transition-colors cursor-pointer"
                >
                  <Square className="w-3.5 h-3.5" />
                  <span>Stop</span>
                </button>
              </>
            ) : (
              <button
                id="btn-run-script"
                onClick={() => onRunScript(selectedScriptName, editedCode)}
                className="flex items-center space-x-1 px-3.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-xs font-bold transition-colors cursor-pointer shadow"
              >
                <Play className="w-3.5 h-3.5" />
                <span>Run Script</span>
              </button>
            )}

            <button
              onClick={handleSave}
              className="px-3 py-1 bg-stone-800 hover:bg-stone-700 text-stone-200 border border-stone-700 rounded text-xs font-medium transition-colors cursor-pointer flex items-center space-x-1"
            >
              {isSavedNotice ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-emerald-400">Saved</span>
                </>
              ) : (
                <span>Save</span>
              )}
            </button>

            {scripts.length > 1 && (
              <button
                onClick={() => onDeleteScript(selectedScriptName)}
                title="Delete script"
                className="p-1.5 text-stone-500 hover:text-rose-400 hover:bg-stone-800 rounded transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Active Script Status Banner */}
        {activeScriptState && activeScriptState.status !== 'stopped' && (
          <div className="bg-stone-900/90 border-b border-stone-800 px-4 py-2 flex flex-wrap items-center justify-between gap-3 text-xs font-mono">
            <div className="flex items-center space-x-2">
              <span className="text-stone-400">Executing:</span>
              <span className="text-amber-400 font-bold">{activeScriptState.name}</span>
              <span className="text-stone-500">|</span>
              <span className="text-stone-400">Line:</span>
              <span className="text-sky-300 font-bold">
                {activeScriptState.currentLineIndex} / {activeScriptState.lines.length}
              </span>
              {activeScriptState.waitReason && (
                <>
                  <span className="text-stone-500">|</span>
                  <span className="text-amber-300 flex items-center gap-1">
                    <Clock className="w-3 h-3" /> {activeScriptState.waitReason}
                  </span>
                </>
              )}
            </div>

            {/* Active Variables Display */}
            <div className="flex items-center space-x-2 text-[11px] overflow-x-auto">
              <span className="text-stone-500 font-semibold">Vars:</span>
              {Object.entries(activeScriptState.variables).map(([k, v]) => (
                <span
                  key={k}
                  className="bg-stone-950 border border-stone-800 px-1.5 py-0.5 rounded text-stone-300"
                >
                  <span className="text-purple-400">%{k}</span>={v}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Script Code Area */}
        <div className="flex-1 flex overflow-hidden relative">
          <textarea
            id="script-code-editor"
            value={editedCode}
            onChange={(e) => setEditedCode(e.target.value)}
            spellCheck={false}
            className="flex-1 p-4 font-mono text-sm leading-relaxed bg-stone-950 text-stone-200 resize-none focus:outline-none selection:bg-stone-800 border-none"
            placeholder="# Write DragonRealms Genie script commands here..."
          />
        </div>

        {/* Script Syntax Guide Bar */}
        <div className="bg-stone-900 border-t border-stone-800 px-4 py-1.5 text-[11px] text-stone-400 flex items-center space-x-4 overflow-x-auto select-none">
          <span className="text-stone-500 font-semibold uppercase text-[10px]">Commands:</span>
          <span>
            <strong className="text-stone-300 font-mono">put</strong> &lt;cmd&gt;
          </span>
          <span>
            <strong className="text-stone-300 font-mono">pause</strong> &lt;sec&gt;
          </span>
          <span>
            <strong className="text-stone-300 font-mono">match</strong> &lt;label&gt; &lt;text&gt;
          </span>
          <span>
            <strong className="text-stone-300 font-mono">matchwait</strong> &lt;timeout&gt;
          </span>
          <span>
            <strong className="text-stone-300 font-mono">goto</strong> &lt;label&gt;
          </span>
          <span>
            <strong className="text-stone-300 font-mono">var</strong> &lt;name&gt; &lt;val&gt;
          </span>
          <span>
            <strong className="text-stone-300 font-mono">math</strong> &lt;var&gt; + 1
          </span>
        </div>
      </div>
    </div>
  );
};
