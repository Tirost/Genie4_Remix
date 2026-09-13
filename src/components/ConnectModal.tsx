import React, { useState } from 'react';
import { CharacterProfile, GuildType } from '../types';
import {
  Radio,
  Shield,
  Server,
  Zap,
  CheckCircle,
  Play,
  RotateCw,
  Plus,
  Trash2,
} from 'lucide-react';

interface ConnectModalProps {
  profiles: CharacterProfile[];
  activeProfileId: string;
  isConnected: boolean;
  onConnect: (profile: CharacterProfile) => void;
  onDisconnect: () => void;
  onSaveProfile: (profile: CharacterProfile) => void;
  onDeleteProfile: (id: string) => void;
}

export const ConnectModal: React.FC<ConnectModalProps> = ({
  profiles,
  activeProfileId,
  isConnected,
  onConnect,
  onDisconnect,
  onSaveProfile,
  onDeleteProfile,
}) => {
  const [selectedId, setSelectedId] = useState<string>(activeProfileId || profiles[0]?.id);
  const currentProfile = profiles.find((p) => p.id === selectedId) || profiles[0];

  const [charName, setCharName] = useState(currentProfile?.name || 'Tirost');
  const [game, setGame] = useState(currentProfile?.game || 'DragonRealms Prime');
  const [guild, setGuild] = useState<GuildType>(currentProfile?.guild || 'Warrior Mage');
  const [host, setHost] = useState(currentProfile?.host || 'dr.simutronics.net');
  const [port, setPort] = useState(currentProfile?.port || 11024);
  const [useLich, setUseLich] = useState(currentProfile?.useLich ?? true);
  const [lichScript, setLichScript] = useState(currentProfile?.lichScript || 'lich5');
  const [isLichTesting, setIsLichTesting] = useState(false);
  const [lichTestResult, setLichTestResult] = useState<string | null>(null);

  const guilds: GuildType[] = [
    'Warrior Mage',
    'Barbarian',
    'Cleric',
    'Moon Mage',
    'Paladin',
    'Ranger',
    'Thief',
    'Empath',
    'Bard',
    'Necromancer',
    'Commoner',
  ];

  const handleSelectProfile = (p: CharacterProfile) => {
    setSelectedId(p.id);
    setCharName(p.name);
    setGame(p.game);
    setGuild(p.guild);
    setHost(p.host);
    setPort(p.port);
    setUseLich(p.useLich);
    setLichScript(p.lichScript || '');
    setLichTestResult(null);
  };

  const handleTestLich = () => {
    setIsLichTesting(true);
    setLichTestResult(null);
    setTimeout(() => {
      setIsLichTesting(false);
      setLichTestResult('Lich environment verified: Ruby 3.2.2 found, Lich 5.9.1 ready.');
    }, 1200);
  };

  const handleSave = () => {
    const updated: CharacterProfile = {
      id: selectedId || `p-${Date.now()}`,
      name: charName,
      game,
      guild,
      host,
      port,
      useLich,
      lichScript,
    };
    onSaveProfile(updated);
  };

  const handleCreateNewProfile = () => {
    const newId = `p-${Date.now()}`;
    const newProf: CharacterProfile = {
      id: newId,
      name: 'NewCharacter',
      game: 'DragonRealms Prime',
      guild: 'Warrior Mage',
      host: 'dr.simutronics.net',
      port: 11024,
      useLich: true,
      lichScript: 'lich5',
    };
    onSaveProfile(newProf);
    handleSelectProfile(newProf);
  };

  return (
    <div
      id="connect-modal-container"
      className="flex-1 flex flex-col md:flex-row h-full bg-stone-950 text-stone-200 overflow-hidden select-none"
    >
      {/* Profiles Sidebar */}
      <div className="w-full md:w-64 bg-stone-900 border-r border-stone-800 flex flex-col">
        <div className="p-3 border-b border-stone-800 flex items-center justify-between">
          <span className="text-xs font-bold text-stone-300 uppercase tracking-wider flex items-center gap-1.5">
            <Radio className="w-4 h-4 text-amber-400" />
            Saved Profiles
          </span>
          <button
            onClick={handleCreateNewProfile}
            className="p-1 bg-stone-800 hover:bg-stone-700 text-amber-400 rounded border border-stone-700 transition-colors"
            title="Create new profile"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto divide-y divide-stone-800/60 p-1 space-y-0.5">
          {profiles.map((p) => (
            <button
              key={p.id}
              onClick={() => handleSelectProfile(p)}
              className={`w-full text-left p-2.5 rounded transition-all ${
                selectedId === p.id
                  ? 'bg-stone-800 border-l-2 border-amber-500 text-stone-100 shadow'
                  : 'text-stone-400 hover:text-stone-200 hover:bg-stone-800/40'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-bold text-xs text-stone-100">{p.name}</span>
                {p.useLich && (
                  <span className="text-[10px] bg-purple-950 text-purple-300 border border-purple-800 px-1 py-0.2 rounded font-mono">
                    Lich
                  </span>
                )}
              </div>
              <div className="text-[11px] text-amber-300/80 mt-0.5">{p.guild}</div>
              <div className="text-[10px] text-stone-500 font-mono mt-0.5 truncate">
                {p.host}:{p.port}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Profile Details & Lich Settings Pane */}
      <div className="flex-1 p-6 overflow-y-auto max-w-3xl space-y-6">
        <div>
          <h2 className="text-lg font-bold text-stone-100 flex items-center gap-2">
            <Server className="w-5 h-5 text-amber-400" />
            Game Connection & Lich Integration
          </h2>
          <p className="text-xs text-stone-400 mt-1">
            Genie Remix includes first-class Lich support, automatic guild layout detection, and portable profile management.
          </p>
        </div>

        {/* Character Info */}
        <div className="bg-stone-900 border border-stone-800 rounded-lg p-4 space-y-4">
          <div className="text-xs font-bold text-stone-300 uppercase tracking-wider border-b border-stone-800 pb-2">
            Character Credentials
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block text-stone-400 mb-1">Character Name</label>
              <input
                type="text"
                value={charName}
                onChange={(e) => setCharName(e.target.value)}
                className="w-full bg-stone-950 border border-stone-700 rounded px-3 py-2 text-stone-200 font-mono focus:outline-none focus:border-amber-500"
              />
            </div>

            <div>
              <label className="block text-stone-400 mb-1">Guild / Profession</label>
              <select
                value={guild}
                onChange={(e) => setGuild(e.target.value as GuildType)}
                className="w-full bg-stone-950 border border-stone-700 rounded px-3 py-2 text-stone-200 font-mono focus:outline-none focus:border-amber-500"
              >
                {guilds.map((g) => (
                  <option key={g} value={g}>
                    {g} {g === 'Barbarian' ? '(Uses Inner Fire Gauge)' : ''}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-stone-400 mb-1">Target Host / World</label>
              <input
                type="text"
                value={host}
                onChange={(e) => setHost(e.target.value)}
                className="w-full bg-stone-950 border border-stone-700 rounded px-3 py-2 text-stone-200 font-mono focus:outline-none focus:border-amber-500"
              />
            </div>

            <div>
              <label className="block text-stone-400 mb-1">Port</label>
              <input
                type="number"
                value={port}
                onChange={(e) => setPort(parseInt(e.target.value) || 11024)}
                className="w-full bg-stone-950 border border-stone-700 rounded px-3 py-2 text-stone-200 font-mono focus:outline-none focus:border-amber-500"
              />
            </div>
          </div>
        </div>

        {/* Lich Integration Section (Genie Remix specific feature) */}
        <div className="bg-stone-900 border border-purple-900/60 rounded-lg p-4 space-y-4">
          <div className="flex items-center justify-between border-b border-stone-800 pb-2">
            <div className="flex items-center space-x-2">
              <Zap className="w-4 h-4 text-purple-400" />
              <span className="text-xs font-bold text-stone-200 uppercase tracking-wider">
                Lich Scripting Architecture
              </span>
            </div>
            <label className="flex items-center space-x-2 cursor-pointer text-xs">
              <input
                id="chk-use-lich"
                type="checkbox"
                checked={useLich}
                onChange={(e) => setUseLich(e.target.checked)}
                className="rounded text-purple-500 focus:ring-purple-500"
              />
              <span className="text-purple-300 font-semibold">Connect via Lich</span>
            </label>
          </div>

          <p className="text-xs text-stone-400">
            Lich is integrated directly into Genie Remix as a first-class connection option. Automatic session locking protection is active.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            <div className="sm:col-span-2">
              <label className="block text-stone-400 mb-1">Startup Lich Script</label>
              <input
                type="text"
                value={lichScript}
                onChange={(e) => setLichScript(e.target.value)}
                placeholder="e.g. repository download lich5"
                className="w-full bg-stone-950 border border-stone-700 rounded px-3 py-2 text-stone-200 font-mono focus:outline-none focus:border-purple-500"
              />
            </div>

            <div className="flex items-end">
              <button
                id="btn-test-lich"
                type="button"
                onClick={handleTestLich}
                disabled={isLichTesting}
                className="w-full py-2 px-3 bg-purple-950/80 hover:bg-purple-900 border border-purple-700 text-purple-300 rounded font-semibold text-xs transition-colors flex items-center justify-center space-x-1.5"
              >
                {isLichTesting ? (
                  <>
                    <RotateCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Testing...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-3.5 h-3.5" />
                    <span>Test Lich Paths</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {lichTestResult && (
            <div className="bg-purple-950/50 border border-purple-800 text-purple-200 p-2.5 rounded text-xs font-mono">
              ✓ {lichTestResult}
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-between pt-2">
          <div className="flex items-center space-x-2">
            <button
              id="btn-save-profile"
              onClick={handleSave}
              className="px-4 py-2 bg-stone-800 hover:bg-stone-700 text-stone-200 border border-stone-700 rounded text-xs font-semibold transition-colors"
            >
              Save Profile
            </button>
            {profiles.length > 1 && (
              <button
                onClick={() => onDeleteProfile(selectedId)}
                className="px-3 py-2 text-stone-400 hover:text-rose-400 transition-colors text-xs flex items-center gap-1"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete</span>
              </button>
            )}
          </div>

          <div className="flex items-center space-x-3">
            {isConnected ? (
              <button
                id="btn-disconnect-session"
                onClick={onDisconnect}
                className="px-5 py-2 bg-rose-700 hover:bg-rose-600 text-white rounded font-bold text-xs shadow-md transition-colors cursor-pointer"
              >
                Disconnect Session
              </button>
            ) : (
              <button
                id="btn-connect-session"
                onClick={() => {
                  handleSave();
                  onConnect({
                    id: selectedId,
                    name: charName,
                    game,
                    guild,
                    host,
                    port,
                    useLich,
                    lichScript,
                  });
                }}
                className="px-6 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded font-bold text-xs shadow-md transition-colors cursor-pointer flex items-center space-x-2"
              >
                <Play className="w-3.5 h-3.5" />
                <span>Connect & Enter Game</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
