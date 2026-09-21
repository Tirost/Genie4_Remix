import {
  HighlightRule,
  TriggerRule,
  SubstituteRule,
  AliasRule,
  MacroRule,
  MapRoom,
  CharacterProfile,
} from '../types';

export const DEFAULT_ROOMS: MapRoom[] = [
  {
    id: 1,
    name: 'Town Square Central',
    zone: 'Crossing',
    x: 0,
    y: 0,
    z: 0,
    desc: 'The bustling center of the Crossing. A grand granite fountain carved in the likeness of Truffenyi sprays crystal water into a marble basin.',
    exits: [
      { dir: 'north', targetId: 2 },
      { dir: 'south', targetId: 7 },
      { dir: 'east', targetId: 9 },
      { dir: 'west', targetId: 10 },
      { dir: 'northeast', targetId: 4 },
    ],
    notes: 'Central meeting hub',
  },
  {
    id: 2,
    name: 'High Street North',
    zone: 'Crossing',
    x: 0,
    y: -80,
    z: 0,
    desc: 'Cobblestone lane paved with smooth grey river stones. Merchants hawk cloth and spices from storefront awnings.',
    exits: [
      { dir: 'south', targetId: 1 },
      { dir: 'north', targetId: 5 },
      { dir: 'east', targetId: 3 },
      { dir: 'west', targetId: 8 },
    ],
  },
  {
    id: 3,
    name: 'First Bank of Crossing',
    zone: 'Crossing',
    x: 100,
    y: -80,
    z: 0,
    desc: 'Polished oak counters and heavy wrought-iron tellers cages divide the hall. A stern teller peers through wire-rimmed spectacles.',
    exits: [
      { dir: 'west', targetId: 2 },
      { dir: 'south', targetId: 4 },
    ],
    notes: 'Safe banking deposit',
  },
  {
    id: 4,
    name: 'Temple of Chadatru',
    zone: 'Crossing',
    x: 100,
    y: 0,
    z: 0,
    desc: 'Incense smoke drifts across arched vaults of white marble. A golden lion emblem rests atop the holy altar of justice.',
    exits: [
      { dir: 'north', targetId: 3 },
      { dir: 'southwest', targetId: 1 },
    ],
    notes: 'Cleric altars & blessings',
  },
  {
    id: 5,
    name: 'Crossing North Gate',
    zone: 'Crossing',
    x: 0,
    y: -160,
    z: 0,
    desc: 'Massive iron-banded portcullis set into towering stone ramparts. Town guards in polished tabards keep diligent watch over the northern road.',
    exits: [
      { dir: 'south', targetId: 2 },
      { dir: 'north', targetId: 6 },
    ],
    notes: 'Gate guards & militia',
  },
  {
    id: 6,
    name: "King's Highway - Outskirts",
    zone: 'Crossing',
    x: 0,
    y: -240,
    z: 0,
    desc: 'A wide dirt highway winding north into the lush Zoluren pine forests. Grass and wildflowers line the earthen verges.',
    exits: [
      { dir: 'south', targetId: 5 },
      { dir: 'northeast', targetId: 12 },
    ],
  },
  {
    id: 7,
    name: 'South Gate Market Plaza',
    zone: 'Crossing',
    x: 0,
    y: 80,
    z: 0,
    desc: 'Colourful canopies shade stalls laden with fresh produce, dried herbs, and forged ironware from provincial trade caravans.',
    exits: [
      { dir: 'north', targetId: 1 },
      { dir: 'east', targetId: 11 },
    ],
  },
  {
    id: 8,
    name: "Gurn's Weaponsmith Shop",
    zone: 'Crossing',
    x: -100,
    y: -80,
    z: 0,
    desc: 'The smell of hot coals and quenching oil fills the shop. Racks of broadswords, scimitars, maces, and halberds line the stone walls.',
    exits: [{ dir: 'east', targetId: 2 }],
  },
  {
    id: 9,
    name: 'East Gate of Crossing',
    zone: 'Crossing',
    x: 120,
    y: 0,
    z: 0,
    desc: 'Heavy oak portal leading eastward toward the provinces of Zoluren and the mountain passes.',
    exits: [{ dir: 'west', targetId: 1 }],
  },
  {
    id: 10,
    name: 'West Gate of Crossing',
    zone: 'Crossing',
    x: -120,
    y: 0,
    z: 0,
    desc: 'Fortified watchtowers guard the western exit toward the Segoltha river valley and Riverhaven.',
    exits: [{ dir: 'east', targetId: 1 }],
  },
  {
    id: 11,
    name: "Dirk's Armor & Shield Emporium",
    zone: 'Crossing',
    x: 100,
    y: 80,
    z: 0,
    desc: 'Suit of full plate armor stands guard at the door. Polished chainmail vests and leather brigandines are displayed neatly.',
    exits: [{ dir: 'west', targetId: 7 }],
  },
  {
    id: 12,
    name: 'Ranger Guild & Deep Woods',
    zone: 'Crossing',
    x: 80,
    y: -300,
    z: 0,
    desc: 'Thick canopy of ancient oaks and hemlocks. Animal tracks crisscross the mossy soil, and fragrant wild herbs grow in dappled shade.',
    exits: [{ dir: 'southwest', targetId: 6 }],
    notes: 'Prime herb & wood foraging',
  },
];

export const DEFAULT_HIGHLIGHTS: HighlightRule[] = [
  {
    id: 'h-1',
    pattern: 'You land a|direct hit|critical hit|vicious strike',
    isRegex: true,
    isCaseInsensitive: true,
    fgColor: '#22c55e',
    bgColor: '',
    bold: true,
    enabled: true,
  },
  {
    id: 'h-2',
    pattern: 'falls to the ground|collapses in a heap',
    isRegex: true,
    isCaseInsensitive: true,
    fgColor: '#eab308',
    bgColor: '',
    bold: true,
    enabled: true,
  },
  {
    id: 'h-3',
    pattern: 'whispers|tells you|speaks to you',
    isRegex: true,
    isCaseInsensitive: true,
    fgColor: '#38bdf8',
    bgColor: '',
    bold: true,
    enabled: true,
  },
  {
    id: 'h-4',
    pattern: 'bleeding|wound|gash|severely injured',
    isRegex: true,
    isCaseInsensitive: true,
    fgColor: '#ef4444',
    bgColor: '',
    bold: true,
    enabled: true,
  },
  {
    id: 'h-5',
    pattern: 'roundtime',
    isRegex: false,
    isCaseInsensitive: true,
    fgColor: '#f97316',
    bgColor: '',
    bold: true,
    enabled: true,
  },
  {
    id: 'h-6',
    pattern: '\\[Lich\\]',
    isRegex: true,
    isCaseInsensitive: false,
    fgColor: '#a855f7',
    bgColor: '',
    bold: true,
    enabled: true,
  },
];

export const DEFAULT_TRIGGERS: TriggerRule[] = [
  {
    id: 't-1',
    pattern: 'You are knocked to the ground|You are swept to the ground',
    isRegex: true,
    actionType: 'command',
    actionValue: 'stand',
    enabled: true,
  },
  {
    id: 't-2',
    pattern: 'Your spell is fully prepared and ready to cast',
    isRegex: false,
    actionType: 'echo',
    actionValue: '[Genie Remix: Spell Ready!]',
    enabled: true,
  },
  {
    id: 't-3',
    pattern: 'waves to you|nods politely to you',
    isRegex: true,
    actionType: 'command',
    actionValue: 'nod',
    enabled: false,
  },
  {
    id: 't-4',
    pattern: '^You manage to find a ([a-zA-Z\\s]+)!',
    isRegex: true,
    actionType: 'command',
    actionValue: '#var last_foraged $1',
    enabled: true,
  },
  {
    id: 't-5',
    pattern: '^Roundtime:\\s*(\\d+)\\s*sec',
    isRegex: true,
    actionType: 'command',
    actionValue: '#var last_roundtime $1',
    enabled: true,
  },
];

export const DEFAULT_SUBSTITUTES: SubstituteRule[] = [
  {
    id: 's-1',
    pattern: 'Truffenyi',
    replacement: 'Truffenyi [Immortal of Compassion]',
    isRegex: false,
    enabled: true,
  },
];

export const DEFAULT_ALIASES: AliasRule[] = [
  { id: 'a-1', alias: 'prep', expansion: 'prepare', enabled: true },
  { id: 'a-2', alias: 'gc', expansion: 'get copper coins from pouch', enabled: true },
  { id: 'a-3', alias: 'la', expansion: 'look at', enabled: true },
  { id: 'a-4', alias: 'rel', expansion: 'release spell', enabled: true },
  { id: 'a-5', alias: 'cm', expansion: 'cast', enabled: true },
];

export const DEFAULT_MACROS: MacroRule[] = [
  { id: 'm-1', key: 'F1', command: 'look', description: 'Look at surroundings' },
  { id: 'm-2', key: 'F2', command: 'health', description: 'Check health & wounds' },
  { id: 'm-3', key: 'F3', command: 'exp', description: 'Check experience' },
  { id: 'm-4', key: 'F4', command: 'inventory', description: 'Inspect inventory' },
  { id: 'm-5', key: 'F5', command: 'stand', description: 'Stand up' },
  { id: 'm-6', key: 'F6', command: 'cast', description: 'Cast prepared spell' },
];

export const DEFAULT_SCRIPTS: { name: string; code: string; description: string }[] = [
  {
    name: 'forage.cmd',
    description: 'Autonomous herb & rock foraging with roundtime checks',
    code: `# DragonRealms Genie Forage Script
# Automatically forages, drops item, and loops
echo *** Genie Remix: Starting Foraging Routine ***
var item rock
setvariable count 0

loop:
put forage %item
pause 3
match gotitem You manage to find
match fumble You forage around but fail
match done Roundtime:
matchwait 4

gotitem:
put drop %item
math count + 1
echo *** Found and dropped %item (Total: %count) ***
pause 1
goto loop

fumble:
echo *** Forage failed, retrying... ***
pause 2
goto loop

done:
echo *** Finished foraging iteration ***
goto loop
`,
  },
  {
    name: 'spell_trainer.cmd',
    description: 'Prepares spell, harnesses mana, and casts with roundtime wait',
    code: `# Genie Remix: Spell Casting Routine
echo *** Starting Magic Training Routine ***
var spell Minor Shock
var mana 5

cast_loop:
put prep %spell %mana
echo Preparing %spell with %mana mana...
pause 4
put harness 2
pause 2
put cast
pause 3
echo *** Spell cast complete! ***
pause 2
goto cast_loop
`,
  },
  {
    name: 'crosswalk.cmd',
    description: 'AutoMapper demonstration route between Town Square & Gates',
    code: `# Genie Remix: Town Square to North Gate
echo *** Navigating Crossing Main Thoroughfare ***
put look
pause 2
echo *** Walking North along High Street ***
put north
pause 2
put look
pause 2
echo *** Arrived at Crossing North Gate ***
put north
pause 2
put look
echo *** Patrol destination reached! Returning south... ***
pause 3
put south
pause 2
put south
echo *** Back at Town Square Central ***
`,
  },
];

export const DEFAULT_PROFILES: CharacterProfile[] = [
  {
    id: 'p-1',
    name: 'Tirost',
    game: 'DragonRealms Prime',
    guild: 'Warrior Mage',
    host: 'dr.simutronics.net',
    port: 11024,
    useLich: true,
    lichScript: 'repository download lich5',
    notes: 'Primary DR character profile with Lich integration',
  },
  {
    id: 'p-2',
    name: 'Kragor',
    game: 'DragonRealms Platinum',
    guild: 'Barbarian',
    host: 'dr.simutronics.net',
    port: 11024,
    useLich: false,
    notes: 'Barbarian guild testing Inner Fire gauge',
  },
];
