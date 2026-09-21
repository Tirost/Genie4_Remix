export type GuildType =
  | 'Barbarian'
  | 'Bard'
  | 'Cleric'
  | 'Commoner'
  | 'Empath'
  | 'Moon Mage'
  | 'Necromancer'
  | 'Paladin'
  | 'Ranger'
  | 'Thief'
  | 'Warrior Mage';

export type CharacterStance =
  | 'Offensive'
  | 'Advancing'
  | 'Forward'
  | 'Neutral'
  | 'Defending'
  | 'Guarded';

export type CharacterPosition =
  | 'Standing'
  | 'Kneeling'
  | 'Sitting'
  | 'Prone'
  | 'Stunned'
  | 'Webbed';

export interface CharacterStatus {
  vitality: number; // 0 - 100
  mana: number; // 0 - 100
  innerFire: number; // 0 - 100 (for Barbarians)
  fatigue: number; // 0 - 100
  spirit: number; // 0 - 100
  concentration: number; // 0 - 100
  guild: GuildType;
  stance: CharacterStance;
  position: CharacterPosition;
  roundtimeRemaining: number;
  roundtimeTotal: number;
  castTimeRemaining: number;
  castTimeTotal: number;
  castReady: boolean; // Genie Remix feature: Cast timer stays lit with "Ready"
  leftHand: string;
  rightHand: string;
  preparedSpell: string;
  isBleeding: boolean;
  isPoisoned: boolean;
  isDiseased: boolean;
  isHidden: boolean;
  roomName: string;
  roomDesc: string;
  roomExits: string[];
}

export type StreamId =
  | 'main'
  | 'combat'
  | 'speech'
  | 'thoughts'
  | 'inv'
  | 'room'
  | 'experience'
  | 'activespells'
  | 'familiar'
  | 'death'
  | 'logons'
  | 'raw'
  | string;

export interface StreamWindowConfig {
  id: string;
  title: string;
  subtitle?: string;
  ifClosed?: string;
  isCustom?: boolean;
  unreadCount: number;
}

export type WindowLayoutMode = 'tabs' | 'split-vertical' | 'split-horizontal';

export interface LineSegment {
  text: string;
  color?: string;
  bgColor?: string;
  bold?: boolean;
}

export interface OutputLine {
  id: string;
  text: string;
  stream: StreamId;
  timestamp: string;
  color?: string;
  bgColor?: string;
  bold?: boolean;
  segments?: LineSegment[];
  isPrompt?: boolean;
  isInput?: boolean;
  isSystem?: boolean;
}

export interface MapExit {
  dir: string;
  targetId: number;
  cost?: number;
  command?: string;
}

export interface MapRoom {
  id: number;
  name: string;
  zone: string;
  x: number;
  y: number;
  z?: number;
  desc?: string;
  exits: MapExit[];
  color?: string;
  notes?: string;
}

export interface MapZone {
  id: string;
  name: string;
  rooms: MapRoom[];
}

export interface HighlightRule {
  id: string;
  pattern: string;
  isRegex: boolean;
  isCaseInsensitive: boolean;
  fgColor: string;
  bgColor?: string;
  bold?: boolean;
  enabled: boolean;
}

export interface TriggerRule {
  id: string;
  pattern: string;
  isRegex: boolean;
  actionType: 'command' | 'echo' | 'sound';
  actionValue: string;
  enabled: boolean;
}

export interface SubstituteRule {
  id: string;
  pattern: string;
  replacement: string;
  isRegex: boolean;
  enabled: boolean;
}

export interface AliasRule {
  id: string;
  alias: string;
  expansion: string;
  enabled: boolean;
}

export interface MacroRule {
  id: string;
  key: string; // e.g. "F1", "Ctrl+1", "Numpad8"
  command: string;
  description: string;
}

export interface ScriptState {
  name: string;
  code: string;
  lines: string[];
  currentLineIndex: number;
  status: 'idle' | 'running' | 'paused' | 'waiting' | 'stopped';
  waitReason?: string;
  variables: Record<string, string>;
  labels: Record<string, number>;
  activeMatches: { label: string; pattern: string; isRegex?: boolean }[];
  matchTimeoutTimer?: number;
}

export interface CharacterProfile {
  id: string;
  name: string;
  game: string;
  guild: GuildType;
  host: string;
  port: number;
  useLich: boolean;
  lichScript?: string;
  notes?: string;
}

export type ThemeType = 'dark' | 'classic' | 'amber' | 'emerald' | 'light';
