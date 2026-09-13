import React, { useState } from 'react';
import {
  HighlightRule,
  TriggerRule,
  SubstituteRule,
  AliasRule,
  MacroRule,
} from '../types';
import {
  Sparkles,
  Zap,
  Repeat,
  Keyboard,
  Sliders,
  Plus,
  Trash2,
  Check,
  Edit2,
} from 'lucide-react';

interface ConfigModalProps {
  highlights: HighlightRule[];
  triggers: TriggerRule[];
  substitutes: SubstituteRule[];
  aliases: AliasRule[];
  macros: MacroRule[];
  variables: Record<string, string>;
  onUpdateHighlights: (hl: HighlightRule[]) => void;
  onUpdateTriggers: (tr: TriggerRule[]) => void;
  onUpdateSubstitutes: (sub: SubstituteRule[]) => void;
  onUpdateAliases: (al: AliasRule[]) => void;
  onUpdateMacros: (mc: MacroRule[]) => void;
  onUpdateVariables: (vars: Record<string, string>) => void;
}

export const ConfigModal: React.FC<ConfigModalProps> = ({
  highlights,
  triggers,
  substitutes,
  aliases,
  macros,
  variables,
  onUpdateHighlights,
  onUpdateTriggers,
  onUpdateSubstitutes,
  onUpdateAliases,
  onUpdateMacros,
  onUpdateVariables,
}) => {
  const [activeTab, setActiveTab] = useState<
    'highlights' | 'triggers' | 'substitutes' | 'aliases' | 'macros' | 'variables'
  >('highlights');

  // Highlight input state
  const [newHlPattern, setNewHlPattern] = useState('');
  const [newHlRegex, setNewHlRegex] = useState(false);
  const [newHlCase, setNewHlCase] = useState(true);
  const [newHlColor, setNewHlColor] = useState('#22c55e');
  const [newHlBold, setNewHlBold] = useState(true);

  // Trigger input state
  const [newTrPattern, setNewTrPattern] = useState('');
  const [newTrAction, setNewTrAction] = useState<'command' | 'echo' | 'sound'>('command');
  const [newTrValue, setNewTrValue] = useState('');

  // Substitute input state
  const [newSubPattern, setNewSubPattern] = useState('');
  const [newSubReplacement, setNewSubReplacement] = useState('');

  // Alias input state
  const [newAliasName, setNewAliasName] = useState('');
  const [newAliasExpansion, setNewAliasExpansion] = useState('');

  // Macro input state
  const [newMacroKey, setNewMacroKey] = useState('F7');
  const [newMacroCmd, setNewMacroCmd] = useState('');
  const [newMacroDesc, setNewMacroDesc] = useState('');

  // Variable input state
  const [newVarKey, setNewVarKey] = useState('');
  const [newVarVal, setNewVarVal] = useState('');

  // Add handlers
  const handleAddHighlight = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newHlPattern.trim()) return;
    const item: HighlightRule = {
      id: `hl-${Date.now()}`,
      pattern: newHlPattern.trim(),
      isRegex: newHlRegex,
      isCaseInsensitive: newHlCase,
      fgColor: newHlColor,
      bold: newHlBold,
      enabled: true,
    };
    onUpdateHighlights([...highlights, item]);
    setNewHlPattern('');
  };

  const handleAddTrigger = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTrPattern.trim() || !newTrValue.trim()) return;
    const item: TriggerRule = {
      id: `tr-${Date.now()}`,
      pattern: newTrPattern.trim(),
      isRegex: true,
      actionType: newTrAction,
      actionValue: newTrValue.trim(),
      enabled: true,
    };
    onUpdateTriggers([...triggers, item]);
    setNewTrPattern('');
    setNewTrValue('');
  };

  const handleAddSubstitute = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSubPattern.trim() || !newSubReplacement.trim()) return;
    const item: SubstituteRule = {
      id: `sub-${Date.now()}`,
      pattern: newSubPattern.trim(),
      replacement: newSubReplacement.trim(),
      isRegex: false,
      enabled: true,
    };
    onUpdateSubstitutes([...substitutes, item]);
    setNewSubPattern('');
    setNewSubReplacement('');
  };

  const handleAddAlias = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAliasName.trim() || !newAliasExpansion.trim()) return;
    const item: AliasRule = {
      id: `al-${Date.now()}`,
      alias: newAliasName.trim(),
      expansion: newAliasExpansion.trim(),
      enabled: true,
    };
    onUpdateAliases([...aliases, item]);
    setNewAliasName('');
    setNewAliasExpansion('');
  };

  const handleAddMacro = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMacroKey.trim() || !newMacroCmd.trim()) return;
    const item: MacroRule = {
      id: `mc-${Date.now()}`,
      key: newMacroKey.trim(),
      command: newMacroCmd.trim(),
      description: newMacroDesc.trim() || newMacroCmd.trim(),
    };
    onUpdateMacros([...macros, item]);
    setNewMacroCmd('');
    setNewMacroDesc('');
  };

  const handleAddVariable = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newVarKey.trim()) return;
    onUpdateVariables({
      ...variables,
      [newVarKey.trim()]: newVarVal.trim(),
    });
    setNewVarKey('');
    setNewVarVal('');
  };

  return (
    <div
      id="config-panel-container"
      className="flex-1 flex flex-col md:flex-row h-full bg-stone-950 text-stone-200 overflow-hidden select-none"
    >
      {/* Config Navigation Sidebar */}
      <div className="w-full md:w-56 bg-stone-900 border-r border-stone-800 flex flex-col p-2 space-y-1">
        <div className="px-3 py-2 text-xs font-bold text-stone-400 uppercase tracking-wider">
          Genie Configuration
        </div>

        <button
          onClick={() => setActiveTab('highlights')}
          className={`flex items-center space-x-2 w-full px-3 py-2 rounded text-xs text-left transition-colors ${
            activeTab === 'highlights'
              ? 'bg-stone-800 text-amber-400 font-bold border-l-2 border-amber-500'
              : 'text-stone-400 hover:text-stone-200 hover:bg-stone-800/40'
          }`}
        >
          <Sparkles className="w-4 h-4 text-emerald-400" />
          <span>Highlights</span>
        </button>

        <button
          onClick={() => setActiveTab('triggers')}
          className={`flex items-center space-x-2 w-full px-3 py-2 rounded text-xs text-left transition-colors ${
            activeTab === 'triggers'
              ? 'bg-stone-800 text-amber-400 font-bold border-l-2 border-amber-500'
              : 'text-stone-400 hover:text-stone-200 hover:bg-stone-800/40'
          }`}
        >
          <Zap className="w-4 h-4 text-amber-400" />
          <span>Triggers</span>
        </button>

        <button
          onClick={() => setActiveTab('substitutes')}
          className={`flex items-center space-x-2 w-full px-3 py-2 rounded text-xs text-left transition-colors ${
            activeTab === 'substitutes'
              ? 'bg-stone-800 text-amber-400 font-bold border-l-2 border-amber-500'
              : 'text-stone-400 hover:text-stone-200 hover:bg-stone-800/40'
          }`}
        >
          <Repeat className="w-4 h-4 text-sky-400" />
          <span>Substitutes</span>
        </button>

        <button
          onClick={() => setActiveTab('aliases')}
          className={`flex items-center space-x-2 w-full px-3 py-2 rounded text-xs text-left transition-colors ${
            activeTab === 'aliases'
              ? 'bg-stone-800 text-amber-400 font-bold border-l-2 border-amber-500'
              : 'text-stone-400 hover:text-stone-200 hover:bg-stone-800/40'
          }`}
        >
          <Sliders className="w-4 h-4 text-purple-400" />
          <span>Aliases</span>
        </button>

        <button
          onClick={() => setActiveTab('macros')}
          className={`flex items-center space-x-2 w-full px-3 py-2 rounded text-xs text-left transition-colors ${
            activeTab === 'macros'
              ? 'bg-stone-800 text-amber-400 font-bold border-l-2 border-amber-500'
              : 'text-stone-400 hover:text-stone-200 hover:bg-stone-800/40'
          }`}
        >
          <Keyboard className="w-4 h-4 text-rose-400" />
          <span>Macros</span>
        </button>

        <button
          onClick={() => setActiveTab('variables')}
          className={`flex items-center space-x-2 w-full px-3 py-2 rounded text-xs text-left transition-colors ${
            activeTab === 'variables'
              ? 'bg-stone-800 text-amber-400 font-bold border-l-2 border-amber-500'
              : 'text-stone-400 hover:text-stone-200 hover:bg-stone-800/40'
          }`}
        >
          <Sliders className="w-4 h-4 text-cyan-400" />
          <span>Variables</span>
        </button>
      </div>

      {/* Main Content Pane */}
      <div className="flex-1 p-5 overflow-y-auto max-w-4xl">
        {/* HIGHLIGHTS PANEL */}
        {activeTab === 'highlights' && (
          <div className="space-y-4">
            <div>
              <h2 className="text-base font-bold text-stone-100 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-emerald-400" />
                Text Highlights & Formatting
              </h2>
              <p className="text-xs text-stone-400 mt-0.5">
                Matches incoming text and applies custom colors. Case-insensitivity is preserved across restarts (Genie Remix fix).
              </p>
            </div>

            {/* Add Highlight Form */}
            <form
              onSubmit={handleAddHighlight}
              className="bg-stone-900 border border-stone-800 p-3 rounded-lg grid grid-cols-1 sm:grid-cols-12 gap-2 text-xs"
            >
              <div className="sm:col-span-5">
                <label className="block text-stone-400 mb-1">Pattern / String</label>
                <input
                  type="text"
                  value={newHlPattern}
                  onChange={(e) => setNewHlPattern(e.target.value)}
                  placeholder="e.g. direct hit|critical"
                  className="w-full bg-stone-950 border border-stone-700 rounded px-2.5 py-1.5 text-stone-200 font-mono focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="sm:col-span-3">
                <label className="block text-stone-400 mb-1">Color</label>
                <div className="flex items-center space-x-2">
                  <input
                    type="color"
                    value={newHlColor}
                    onChange={(e) => setNewHlColor(e.target.value)}
                    className="w-8 h-8 rounded border border-stone-700 cursor-pointer bg-transparent"
                  />
                  <input
                    type="text"
                    value={newHlColor}
                    onChange={(e) => setNewHlColor(e.target.value)}
                    className="flex-1 bg-stone-950 border border-stone-700 rounded px-2 py-1.5 font-mono text-stone-300"
                  />
                </div>
              </div>

              <div className="sm:col-span-2 flex flex-col justify-end space-y-1">
                <label className="flex items-center space-x-1.5 text-stone-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={newHlCase}
                    onChange={(e) => setNewHlCase(e.target.checked)}
                    className="rounded text-amber-500"
                  />
                  <span>Ignore Case</span>
                </label>
                <label className="flex items-center space-x-1.5 text-stone-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={newHlBold}
                    onChange={(e) => setNewHlBold(e.target.checked)}
                    className="rounded text-amber-500"
                  />
                  <span>Bold</span>
                </label>
              </div>

              <div className="sm:col-span-2 flex items-end">
                <button
                  type="submit"
                  className="w-full bg-amber-600 hover:bg-amber-500 text-stone-950 font-bold py-1.5 px-3 rounded flex items-center justify-center space-x-1 transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add</span>
                </button>
              </div>
            </form>

            {/* List */}
            <div className="bg-stone-900 border border-stone-800 rounded-lg divide-y divide-stone-800/80 overflow-hidden">
              {highlights.map((h) => (
                <div
                  key={h.id}
                  className="p-3 flex items-center justify-between hover:bg-stone-800/40 text-xs font-mono"
                >
                  <div className="flex items-center space-x-3">
                    <span
                      className="w-3.5 h-3.5 rounded-full border border-stone-600"
                      style={{ backgroundColor: h.fgColor }}
                    />
                    <span
                      style={{ color: h.fgColor, fontWeight: h.bold ? 700 : 400 }}
                      className="text-sm font-semibold"
                    >
                      {h.pattern}
                    </span>
                    {h.isCaseInsensitive && (
                      <span className="text-[10px] bg-stone-800 text-stone-400 px-1.5 py-0.5 rounded border border-stone-700">
                        /i
                      </span>
                    )}
                  </div>

                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() =>
                        onUpdateHighlights(
                          highlights.map((x) =>
                            x.id === h.id ? { ...x, enabled: !x.enabled } : x
                          )
                        )
                      }
                      className={`px-2 py-0.5 rounded text-[11px] font-medium border ${
                        h.enabled
                          ? 'bg-emerald-950 text-emerald-400 border-emerald-800'
                          : 'bg-stone-800 text-stone-500 border-stone-700'
                      }`}
                    >
                      {h.enabled ? 'Active' : 'Disabled'}
                    </button>
                    <button
                      onClick={() =>
                        onUpdateHighlights(highlights.filter((x) => x.id !== h.id))
                      }
                      className="p-1 text-stone-500 hover:text-rose-400 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TRIGGERS PANEL */}
        {activeTab === 'triggers' && (
          <div className="space-y-4">
            <div>
              <h2 className="text-base font-bold text-stone-100 flex items-center gap-2">
                <Zap className="w-4 h-4 text-amber-400" />
                Autonomous Event Triggers
              </h2>
              <p className="text-xs text-stone-400 mt-0.5">
                Automatically responds with game commands or echoes when game messages match.
              </p>
            </div>

            <form
              onSubmit={handleAddTrigger}
              className="bg-stone-900 border border-stone-800 p-3 rounded-lg grid grid-cols-1 sm:grid-cols-12 gap-2 text-xs"
            >
              <div className="sm:col-span-5">
                <label className="block text-stone-400 mb-1">Trigger Match Text / Regex</label>
                <input
                  type="text"
                  value={newTrPattern}
                  onChange={(e) => setNewTrPattern(e.target.value)}
                  placeholder="e.g. knocked to the ground"
                  className="w-full bg-stone-950 border border-stone-700 rounded px-2.5 py-1.5 text-stone-200 font-mono focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="sm:col-span-3">
                <label className="block text-stone-400 mb-1">Action Type</label>
                <select
                  value={newTrAction}
                  onChange={(e) => setNewTrAction(e.target.value as any)}
                  className="w-full bg-stone-950 border border-stone-700 rounded px-2 py-1.5 text-stone-200 font-mono focus:outline-none focus:border-amber-500"
                >
                  <option value="command">Send Command</option>
                  <option value="echo">Echo Notice</option>
                </select>
              </div>

              <div className="sm:col-span-3">
                <label className="block text-stone-400 mb-1">Command / Action Value</label>
                <input
                  type="text"
                  value={newTrValue}
                  onChange={(e) => setNewTrValue(e.target.value)}
                  placeholder="e.g. stand"
                  className="w-full bg-stone-950 border border-stone-700 rounded px-2.5 py-1.5 text-stone-200 font-mono focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="sm:col-span-1 flex items-end">
                <button
                  type="submit"
                  className="w-full bg-amber-600 hover:bg-amber-500 text-stone-950 font-bold py-1.5 px-3 rounded flex items-center justify-center transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>
            </form>

            <div className="bg-stone-900 border border-stone-800 rounded-lg divide-y divide-stone-800/80 overflow-hidden">
              {triggers.map((t) => (
                <div
                  key={t.id}
                  className="p-3 flex items-center justify-between hover:bg-stone-800/40 text-xs font-mono"
                >
                  <div>
                    <span className="text-amber-300 font-bold text-sm">{t.pattern}</span>
                    <div className="text-stone-400 text-[11px] mt-0.5">
                      → Action: <span className="text-sky-300">{t.actionType}</span> (
                      <span className="text-emerald-300 font-bold">{t.actionValue}</span>)
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() =>
                        onUpdateTriggers(
                          triggers.map((x) =>
                            x.id === t.id ? { ...x, enabled: !x.enabled } : x
                          )
                        )
                      }
                      className={`px-2 py-0.5 rounded text-[11px] font-medium border ${
                        t.enabled
                          ? 'bg-emerald-950 text-emerald-400 border-emerald-800'
                          : 'bg-stone-800 text-stone-500 border-stone-700'
                      }`}
                    >
                      {t.enabled ? 'Active' : 'Disabled'}
                    </button>
                    <button
                      onClick={() => onUpdateTriggers(triggers.filter((x) => x.id !== t.id))}
                      className="p-1 text-stone-500 hover:text-rose-400 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ALIASES PANEL */}
        {activeTab === 'aliases' && (
          <div className="space-y-4">
            <div>
              <h2 className="text-base font-bold text-stone-100 flex items-center gap-2">
                <Sliders className="w-4 h-4 text-purple-400" />
                Command Aliases
              </h2>
              <p className="text-xs text-stone-400 mt-0.5">
                Shorten frequent commands (e.g. typing &apos;prep&apos; automatically expands to &apos;prepare&apos;).
              </p>
            </div>

            <form
              onSubmit={handleAddAlias}
              className="bg-stone-900 border border-stone-800 p-3 rounded-lg grid grid-cols-1 sm:grid-cols-12 gap-2 text-xs"
            >
              <div className="sm:col-span-4">
                <label className="block text-stone-400 mb-1">Alias Shorthand</label>
                <input
                  type="text"
                  value={newAliasName}
                  onChange={(e) => setNewAliasName(e.target.value)}
                  placeholder="e.g. prep"
                  className="w-full bg-stone-950 border border-stone-700 rounded px-2.5 py-1.5 text-stone-200 font-mono focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="sm:col-span-6">
                <label className="block text-stone-400 mb-1">Expansion Command</label>
                <input
                  type="text"
                  value={newAliasExpansion}
                  onChange={(e) => setNewAliasExpansion(e.target.value)}
                  placeholder="e.g. prepare"
                  className="w-full bg-stone-950 border border-stone-700 rounded px-2.5 py-1.5 text-stone-200 font-mono focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="sm:col-span-2 flex items-end">
                <button
                  type="submit"
                  className="w-full bg-amber-600 hover:bg-amber-500 text-stone-950 font-bold py-1.5 px-3 rounded flex items-center justify-center space-x-1 transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add</span>
                </button>
              </div>
            </form>

            <div className="bg-stone-900 border border-stone-800 rounded-lg divide-y divide-stone-800/80 overflow-hidden">
              {aliases.map((a) => (
                <div
                  key={a.id}
                  className="p-3 flex items-center justify-between hover:bg-stone-800/40 text-xs font-mono"
                >
                  <div className="flex items-center space-x-2">
                    <span className="text-amber-400 font-bold text-sm">{a.alias}</span>
                    <span className="text-stone-500">→</span>
                    <span className="text-stone-200 font-semibold">{a.expansion}</span>
                  </div>

                  <button
                    onClick={() => onUpdateAliases(aliases.filter((x) => x.id !== a.id))}
                    className="p-1 text-stone-500 hover:text-rose-400 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* MACROS PANEL */}
        {activeTab === 'macros' && (
          <div className="space-y-4">
            <div>
              <h2 className="text-base font-bold text-stone-100 flex items-center gap-2">
                <Keyboard className="w-4 h-4 text-rose-400" />
                Keyboard Macros & Bindings
              </h2>
              <p className="text-xs text-stone-400 mt-0.5">
                Press function keys (F1-F12) to immediately execute game commands.
              </p>
            </div>

            <form
              onSubmit={handleAddMacro}
              className="bg-stone-900 border border-stone-800 p-3 rounded-lg grid grid-cols-1 sm:grid-cols-12 gap-2 text-xs"
            >
              <div className="sm:col-span-3">
                <label className="block text-stone-400 mb-1">Key Binding</label>
                <input
                  type="text"
                  value={newMacroKey}
                  onChange={(e) => setNewMacroKey(e.target.value)}
                  placeholder="e.g. F7"
                  className="w-full bg-stone-950 border border-stone-700 rounded px-2.5 py-1.5 text-stone-200 font-mono focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="sm:col-span-5">
                <label className="block text-stone-400 mb-1">Command</label>
                <input
                  type="text"
                  value={newMacroCmd}
                  onChange={(e) => setNewMacroCmd(e.target.value)}
                  placeholder="e.g. attack"
                  className="w-full bg-stone-950 border border-stone-700 rounded px-2.5 py-1.5 text-stone-200 font-mono focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="sm:col-span-3">
                <label className="block text-stone-400 mb-1">Description</label>
                <input
                  type="text"
                  value={newMacroDesc}
                  onChange={(e) => setNewMacroDesc(e.target.value)}
                  placeholder="Label..."
                  className="w-full bg-stone-950 border border-stone-700 rounded px-2.5 py-1.5 text-stone-200 font-mono focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="sm:col-span-1 flex items-end">
                <button
                  type="submit"
                  className="w-full bg-amber-600 hover:bg-amber-500 text-stone-950 font-bold py-1.5 px-3 rounded flex items-center justify-center transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>
            </form>

            <div className="bg-stone-900 border border-stone-800 rounded-lg divide-y divide-stone-800/80 overflow-hidden">
              {macros.map((m) => (
                <div
                  key={m.id}
                  className="p-3 flex items-center justify-between hover:bg-stone-800/40 text-xs font-mono"
                >
                  <div className="flex items-center space-x-3">
                    <span className="bg-stone-800 text-amber-400 font-bold px-2 py-0.5 rounded border border-stone-700 text-sm">
                      {m.key}
                    </span>
                    <span className="text-stone-200 font-semibold">{m.command}</span>
                    <span className="text-stone-500 text-[11px]">({m.description})</span>
                  </div>

                  <button
                    onClick={() => onUpdateMacros(macros.filter((x) => x.id !== m.id))}
                    className="p-1 text-stone-500 hover:text-rose-400 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* SUBSTITUTES PANEL */}
        {activeTab === 'substitutes' && (
          <div className="space-y-4">
            <div>
              <h2 className="text-base font-bold text-stone-100 flex items-center gap-2">
                <Repeat className="w-4 h-4 text-sky-400" />
                Text Substitutions
              </h2>
              <p className="text-xs text-stone-400 mt-0.5">
                Replaces incoming game terms with enriched or clearer phrases before rendering.
              </p>
            </div>

            <form
              onSubmit={handleAddSubstitute}
              className="bg-stone-900 border border-stone-800 p-3 rounded-lg grid grid-cols-1 sm:grid-cols-12 gap-2 text-xs"
            >
              <div className="sm:col-span-5">
                <label className="block text-stone-400 mb-1">Find String</label>
                <input
                  type="text"
                  value={newSubPattern}
                  onChange={(e) => setNewSubPattern(e.target.value)}
                  placeholder="e.g. Truffenyi"
                  className="w-full bg-stone-950 border border-stone-700 rounded px-2.5 py-1.5 text-stone-200 font-mono focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="sm:col-span-5">
                <label className="block text-stone-400 mb-1">Replace With</label>
                <input
                  type="text"
                  value={newSubReplacement}
                  onChange={(e) => setNewSubReplacement(e.target.value)}
                  placeholder="e.g. Truffenyi [Immortal of Compassion]"
                  className="w-full bg-stone-950 border border-stone-700 rounded px-2.5 py-1.5 text-stone-200 font-mono focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="sm:col-span-2 flex items-end">
                <button
                  type="submit"
                  className="w-full bg-amber-600 hover:bg-amber-500 text-stone-950 font-bold py-1.5 px-3 rounded flex items-center justify-center space-x-1 transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add</span>
                </button>
              </div>
            </form>

            <div className="bg-stone-900 border border-stone-800 rounded-lg divide-y divide-stone-800/80 overflow-hidden">
              {substitutes.map((s) => (
                <div
                  key={s.id}
                  className="p-3 flex items-center justify-between hover:bg-stone-800/40 text-xs font-mono"
                >
                  <div className="flex items-center space-x-2">
                    <span className="text-stone-300 font-bold">{s.pattern}</span>
                    <span className="text-stone-500">→</span>
                    <span className="text-emerald-300 font-semibold">{s.replacement}</span>
                  </div>

                  <button
                    onClick={() =>
                      onUpdateSubstitutes(substitutes.filter((x) => x.id !== s.id))
                    }
                    className="p-1 text-stone-500 hover:text-rose-400 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* VARIABLES PANEL */}
        {activeTab === 'variables' && (
          <div className="space-y-4">
            <div>
              <h2 className="text-base font-bold text-stone-100 flex items-center gap-2">
                <Sliders className="w-4 h-4 text-cyan-400" />
                Global Variables Engine
              </h2>
              <p className="text-xs text-stone-400 mt-0.5">
                Stores variables accessed by Genie scripts and aliases via %varname or $varname.
              </p>
            </div>

            <form
              onSubmit={handleAddVariable}
              className="bg-stone-900 border border-stone-800 p-3 rounded-lg grid grid-cols-1 sm:grid-cols-12 gap-2 text-xs"
            >
              <div className="sm:col-span-5">
                <label className="block text-stone-400 mb-1">Variable Name</label>
                <input
                  type="text"
                  value={newVarKey}
                  onChange={(e) => setNewVarKey(e.target.value)}
                  placeholder="e.g. guild or target"
                  className="w-full bg-stone-950 border border-stone-700 rounded px-2.5 py-1.5 text-stone-200 font-mono focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="sm:col-span-5">
                <label className="block text-stone-400 mb-1">Value</label>
                <input
                  type="text"
                  value={newVarVal}
                  onChange={(e) => setNewVarVal(e.target.value)}
                  placeholder="e.g. Warrior Mage"
                  className="w-full bg-stone-950 border border-stone-700 rounded px-2.5 py-1.5 text-stone-200 font-mono focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="sm:col-span-2 flex items-end">
                <button
                  type="submit"
                  className="w-full bg-amber-600 hover:bg-amber-500 text-stone-950 font-bold py-1.5 px-3 rounded flex items-center justify-center space-x-1 transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Set</span>
                </button>
              </div>
            </form>

            <div className="bg-stone-900 border border-stone-800 rounded-lg divide-y divide-stone-800/80 overflow-hidden">
              {Object.entries(variables).map(([k, v]) => (
                <div
                  key={k}
                  className="p-3 flex items-center justify-between hover:bg-stone-800/40 text-xs font-mono"
                >
                  <div className="flex items-center space-x-2">
                    <span className="text-purple-400 font-bold text-sm">%{k}</span>
                    <span className="text-stone-500">=</span>
                    <span className="text-stone-200 font-semibold">{v}</span>
                  </div>

                  <button
                    onClick={() => {
                      const copy = { ...variables };
                      delete copy[k];
                      onUpdateVariables(copy);
                    }}
                    className="p-1 text-stone-500 hover:text-rose-400 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
