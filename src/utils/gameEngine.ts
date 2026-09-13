import {
  CharacterStatus,
  OutputLine,
  HighlightRule,
  TriggerRule,
  SubstituteRule,
  AliasRule,
  MapRoom,
} from '../types';

export interface GameEngineState {
  status: CharacterStatus;
  currentRoomId: number;
  inventory: string[];
  roomItems: Record<number, string[]>;
}

export function createInitialCharacterStatus(): CharacterStatus {
  return {
    vitality: 100,
    mana: 100,
    innerFire: 100,
    fatigue: 100,
    spirit: 100,
    concentration: 100,
    guild: 'Warrior Mage',
    stance: 'Defending',
    position: 'Standing',
    roundtimeRemaining: 0,
    roundtimeTotal: 0,
    castTimeRemaining: 0,
    castTimeTotal: 0,
    castReady: false,
    leftHand: 'Empty',
    rightHand: 'steel broadsword',
    preparedSpell: 'None',
    isBleeding: false,
    isPoisoned: false,
    isDiseased: false,
    isHidden: false,
    roomName: 'Town Square Central',
    roomDesc:
      'The bustling center of the Crossing. A grand granite fountain carved in the likeness of Truffenyi sprays crystal water into a marble basin.',
    roomExits: ['north', 'south', 'east', 'west', 'northeast'],
  };
}

export const DIRECTION_MAP: Record<string, string> = {
  n: 'north',
  s: 'south',
  e: 'east',
  w: 'west',
  ne: 'northeast',
  nw: 'northwest',
  se: 'southeast',
  sw: 'southwest',
  u: 'up',
  d: 'down',
  out: 'out',
};

// Expand user aliases
export function expandAliases(input: string, aliases: AliasRule[]): string {
  const trimmed = input.trim();
  const parts = trimmed.split(' ');
  const firstWord = parts[0];

  const matched = aliases.find((a) => a.enabled && a.alias.toLowerCase() === firstWord.toLowerCase());
  if (matched) {
    const rest = parts.slice(1).join(' ');
    return rest ? `${matched.expansion} ${rest}` : matched.expansion;
  }
  return trimmed;
}

// Apply substitutes to text
export function applySubstitutes(text: string, substitutes: SubstituteRule[]): string {
  let result = text;
  for (const sub of substitutes) {
    if (!sub.enabled) continue;
    try {
      if (sub.isRegex) {
        const regex = new RegExp(sub.pattern, 'gi');
        result = result.replace(regex, sub.replacement);
      } else {
        result = result.split(sub.pattern).join(sub.replacement);
      }
    } catch {
      // Ignore invalid regex
    }
  }
  return result;
}

// Apply highlights to an output line
export function applyHighlights(
  line: OutputLine,
  highlights: HighlightRule[]
): { color?: string; bgColor?: string; bold?: boolean } {
  for (const h of highlights) {
    if (!h.enabled) continue;
    try {
      const flags = h.isCaseInsensitive ? 'i' : '';
      const regex = h.isRegex
        ? new RegExp(h.pattern, flags)
        : new RegExp(h.pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), flags);

      if (regex.test(line.text)) {
        return {
          color: h.fgColor,
          bgColor: h.bgColor || undefined,
          bold: h.bold,
        };
      }
    } catch {
      // Ignore invalid regex
    }
  }
  return {};
}

// Execute player command in the simulated DragonRealms world
export function processCommand(
  rawInput: string,
  state: GameEngineState,
  rooms: MapRoom[],
  sendOutput: (line: Partial<OutputLine>) => void,
  updateStatus: (updater: (prev: CharacterStatus) => CharacterStatus) => void,
  triggerCallback?: (matchedCommand: string) => void
): { newRoomId?: number } {
  const input = rawInput.trim();
  if (!input) return {};

  const currentRoom = rooms.find((r) => r.id === state.currentRoomId) || rooms[0];
  const parts = input.split(' ');
  const cmd = parts[0].toLowerCase();
  const args = parts.slice(1).join(' ');
  const normalizedCmd = DIRECTION_MAP[cmd] || cmd;

  // Check movement
  const exit = currentRoom.exits.find((e) => e.dir.toLowerCase() === normalizedCmd);
  if (exit) {
    const nextRoom = rooms.find((r) => r.id === exit.targetId);
    if (nextRoom) {
      sendOutput({
        text: `You head ${exit.dir}...`,
        stream: 'main',
        color: '#a3a3a3',
      });

      sendOutput({
        text: `[${nextRoom.name}]`,
        stream: 'main',
        color: '#38bdf8',
        bold: true,
      });

      if (nextRoom.desc) {
        sendOutput({
          text: nextRoom.desc,
          stream: 'main',
          color: '#d4d4d4',
        });
      }

      const exitStr = nextRoom.exits.map((e) => e.dir).join(', ');
      sendOutput({
        text: `[Obvious paths: ${exitStr}]`,
        stream: 'main',
        color: '#facc15',
      });

      updateStatus((prev) => ({
        ...prev,
        roomName: nextRoom.name,
        roomDesc: nextRoom.desc || '',
        roomExits: nextRoom.exits.map((e) => e.dir),
      }));

      return { newRoomId: nextRoom.id };
    }
  }

  // Handle standard DragonRealms MUD commands
  switch (cmd) {
    case 'look':
    case 'l': {
      sendOutput({
        text: `[${currentRoom.name}]`,
        stream: 'main',
        color: '#38bdf8',
        bold: true,
      });
      if (currentRoom.desc) {
        sendOutput({
          text: currentRoom.desc,
          stream: 'main',
          color: '#d4d4d4',
        });
      }
      const exitStr = currentRoom.exits.map((e) => e.dir).join(', ');
      sendOutput({
        text: `[Obvious paths: ${exitStr}]`,
        stream: 'main',
        color: '#facc15',
      });
      const items = state.roomItems[currentRoom.id] || [];
      if (items.length > 0) {
        sendOutput({
          text: `You also see: ${items.join(', ')}.`,
          stream: 'main',
          color: '#4ade80',
        });
      }
      break;
    }

    case 'forage': {
      const itemToForage = args || 'rock';
      sendOutput({
        text: `You forage around the area searching for a ${itemToForage}...`,
        stream: 'main',
        color: '#cbd5e1',
      });

      // Set roundtime
      updateStatus((prev) => ({
        ...prev,
        roundtimeRemaining: 3,
        roundtimeTotal: 3,
        fatigue: Math.max(10, prev.fatigue - 2),
      }));

      setTimeout(() => {
        sendOutput({
          text: `You manage to find a smooth ${itemToForage}!`,
          stream: 'main',
          color: '#22c55e',
          bold: true,
        });
        sendOutput({
          text: `Roundtime: 3 sec.`,
          stream: 'main',
          color: '#f97316',
        });
        updateStatus((prev) => ({
          ...prev,
          leftHand: itemToForage,
          roundtimeRemaining: 0,
        }));
      }, 3000);
      break;
    }

    case 'prep':
    case 'prepare': {
      const spellName = args || 'Minor Shock';
      sendOutput({
        text: `You begin softly chanting the syllables for ${spellName}...`,
        stream: 'main',
        color: '#c084fc',
      });
      updateStatus((prev) => ({
        ...prev,
        preparedSpell: spellName,
        castTimeRemaining: 4,
        castTimeTotal: 4,
        castReady: false,
        mana: Math.max(0, prev.mana - 5),
      }));
      break;
    }

    case 'harness': {
      sendOutput({
        text: `You draw elemental power from the surrounding planar currents into your matrix.`,
        stream: 'main',
        color: '#a855f7',
      });
      updateStatus((prev) => ({
        ...prev,
        mana: Math.max(0, prev.mana - 3),
        concentration: Math.max(0, prev.concentration - 4),
      }));
      break;
    }

    case 'cast': {
      updateStatus((prev) => {
        if (prev.preparedSpell === 'None') {
          sendOutput({
            text: `You do not have a spell prepared! Use 'prep <spell>' first.`,
            stream: 'main',
            color: '#ef4444',
          });
          return prev;
        }

        sendOutput({
          text: `You gesture with your hands and unleash ${prev.preparedSpell}! A brilliant flare of magical energy erupts outward!`,
          stream: 'main',
          color: '#38bdf8',
          bold: true,
        });
        sendOutput({
          text: `Roundtime: 2 sec.`,
          stream: 'main',
          color: '#f97316',
        });

        return {
          ...prev,
          preparedSpell: 'None',
          castReady: false,
          castTimeRemaining: 0,
          roundtimeRemaining: 2,
          roundtimeTotal: 2,
        };
      });
      break;
    }

    case 'health':
    case 'hp': {
      sendOutput({
        text: `Your body is in peak condition. No wounds or scars detected.`,
        stream: 'main',
        color: '#4ade80',
      });
      sendOutput({
        text: `Vitality: ${state.status.vitality}%  Mana: ${state.status.mana}%  Fatigue: ${state.status.fatigue}%  Spirit: ${state.status.spirit}%`,
        stream: 'main',
        color: '#38bdf8',
      });
      break;
    }

    case 'stand': {
      updateStatus((prev) => ({ ...prev, position: 'Standing' }));
      sendOutput({ text: `You stand back up.`, stream: 'main', color: '#e2e8f0' });
      break;
    }

    case 'kneel': {
      updateStatus((prev) => ({ ...prev, position: 'Kneeling' }));
      sendOutput({ text: `You kneel down on the ground.`, stream: 'main', color: '#e2e8f0' });
      break;
    }

    case 'sit': {
      updateStatus((prev) => ({ ...prev, position: 'Sitting' }));
      sendOutput({ text: `You sit down.`, stream: 'main', color: '#e2e8f0' });
      break;
    }

    case 'lie':
    case 'prone': {
      updateStatus((prev) => ({ ...prev, position: 'Prone' }));
      sendOutput({ text: `You lie flat on the ground.`, stream: 'main', color: '#e2e8f0' });
      break;
    }

    case 'stance': {
      const targetStance = (args || 'neutral').toLowerCase();
      const validStances = [
        'Offensive',
        'Advancing',
        'Forward',
        'Neutral',
        'Defending',
        'Guarded',
      ];
      const match = validStances.find((s) => s.toLowerCase().startsWith(targetStance));
      if (match) {
        updateStatus((prev) => ({ ...prev, stance: match as any }));
        sendOutput({
          text: `You are now set to ${match} stance.`,
          stream: 'main',
          color: '#38bdf8',
        });
      } else {
        sendOutput({
          text: `Valid stances: offensive, advancing, forward, neutral, defending, guarded.`,
          stream: 'main',
          color: '#f87171',
        });
      }
      break;
    }

    case 'attack':
    case 'kill': {
      sendOutput({
        text: `You thrust forward with your ${state.status.rightHand || 'fist'}!`,
        stream: 'combat',
        color: '#f87171',
      });
      sendOutput({
        text: `** You land a vicious strike! The target recoils from the heavy impact! **`,
        stream: 'combat',
        color: '#22c55e',
        bold: true,
      });
      updateStatus((prev) => ({
        ...prev,
        roundtimeRemaining: 3,
        roundtimeTotal: 3,
        fatigue: Math.max(10, prev.fatigue - 4),
      }));
      sendOutput({
        text: `Roundtime: 3 sec.`,
        stream: 'main',
        color: '#f97316',
      });
      break;
    }

    case 'say': {
      sendOutput({
        text: `You say, "${args}"`,
        stream: 'speech',
        color: '#fef08a',
      });
      break;
    }

    case 'think': {
      sendOutput({
        text: `You mentally transmit: [Thoughts: "${args}"]`,
        stream: 'thoughts',
        color: '#c084fc',
      });
      break;
    }

    case 'whisper': {
      sendOutput({
        text: `You whisper: "${args}"`,
        stream: 'speech',
        color: '#38bdf8',
      });
      break;
    }

    case 'get':
    case 'take': {
      updateStatus((prev) => ({
        ...prev,
        leftHand: args || 'item',
      }));
      sendOutput({
        text: `You pick up a ${args || 'item'}.`,
        stream: 'main',
        color: '#e2e8f0',
      });
      break;
    }

    case 'drop': {
      const itemToDrop = args || state.status.leftHand || 'item';
      updateStatus((prev) => ({
        ...prev,
        leftHand: prev.leftHand.toLowerCase().includes(itemToDrop.toLowerCase()) ? 'Empty' : prev.leftHand,
      }));
      sendOutput({
        text: `You drop ${itemToDrop} to the ground.`,
        stream: 'main',
        color: '#e2e8f0',
      });
      break;
    }

    case 'wield': {
      updateStatus((prev) => ({
        ...prev,
        rightHand: args || 'weapon',
      }));
      sendOutput({
        text: `You wield your ${args || 'weapon'} in your right hand.`,
        stream: 'main',
        color: '#38bdf8',
      });
      break;
    }

    case 'help': {
      sendOutput({
        text: `=== Genie Remix Commands & Features ===`,
        stream: 'main',
        color: '#38bdf8',
        bold: true,
      });
      sendOutput({
        text: `MUD Commands: look (l), n/s/e/w/ne/nw/se/sw/u/d, forage <item>, prep <spell>, harness, cast, attack, stand, kneel, sit, stance <mode>, health (hp), say, whisper, think, get <item>, drop <item>.`,
        stream: 'main',
        color: '#cbd5e1',
      });
      sendOutput({
        text: `Genie Client Commands:`,
        stream: 'main',
        color: '#fbbf24',
      });
      sendOutput({
        text: `  #script run <name>    - Run a script (e.g. #script run forage.cmd)`,
        stream: 'main',
        color: '#cbd5e1',
      });
      sendOutput({
        text: `  #script pause/resume  - Pause or resume active script`,
        stream: 'main',
        color: '#cbd5e1',
      });
      sendOutput({
        text: `  #script stop          - Terminate running script`,
        stream: 'main',
        color: '#cbd5e1',
      });
      sendOutput({
        text: `  #goto <room_id>       - Pathfind and walk to AutoMapper room ID`,
        stream: 'main',
        color: '#cbd5e1',
      });
      sendOutput({
        text: `  #center               - Center AutoMapper on current location`,
        stream: 'main',
        color: '#cbd5e1',
      });
      sendOutput({
        text: `  #clear                - Clear the output window`,
        stream: 'main',
        color: '#cbd5e1',
      });
      break;
    }

    default: {
      sendOutput({
        text: `Unknown command '${input}'. Type 'help' for available DragonRealms and Genie commands.`,
        stream: 'main',
        color: '#f87171',
      });
      break;
    }
  }

  return {};
}

// Dijkstra shortest path algorithm for AutoMapper
export function findPath(
  startId: number,
  targetId: number,
  rooms: MapRoom[]
): { path: number[]; directions: string[] } | null {
  if (startId === targetId) return { path: [startId], directions: [] };

  const roomMap = new Map<number, MapRoom>();
  rooms.forEach((r) => roomMap.set(r.id, r));

  const distances = new Map<number, number>();
  const previous = new Map<number, { room: number; dir: string }>();
  const unvisited = new Set<number>();

  rooms.forEach((r) => {
    distances.set(r.id, Infinity);
    unvisited.add(r.id);
  });
  distances.set(startId, 0);

  while (unvisited.size > 0) {
    // Find node with smallest distance
    let current: number | null = null;
    let minDistance = Infinity;

    for (const id of unvisited) {
      const dist = distances.get(id) ?? Infinity;
      if (dist < minDistance) {
        minDistance = dist;
        current = id;
      }
    }

    if (current === null || minDistance === Infinity) break;
    if (current === targetId) break;

    unvisited.delete(current);
    const currRoom = roomMap.get(current);
    if (!currRoom) continue;

    for (const exit of currRoom.exits) {
      if (!unvisited.has(exit.targetId)) continue;
      const alt = minDistance + (exit.cost || 1);
      if (alt < (distances.get(exit.targetId) ?? Infinity)) {
        distances.set(exit.targetId, alt);
        previous.set(exit.targetId, { room: current, dir: exit.dir });
      }
    }
  }

  if (!previous.has(targetId)) return null;

  const path: number[] = [];
  const directions: string[] = [];
  let curr = targetId;

  while (curr !== startId) {
    path.unshift(curr);
    const step = previous.get(curr);
    if (!step) break;
    directions.unshift(step.dir);
    curr = step.room;
  }
  path.unshift(startId);

  return { path, directions };
}
