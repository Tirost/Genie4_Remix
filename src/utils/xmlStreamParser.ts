import { OutputLine, StreamId, StreamWindowConfig, HighlightRule } from '../types';

// Default standard stream windows in Genie
export const DEFAULT_STREAM_WINDOWS: StreamWindowConfig[] = [
  { id: 'main', title: 'Main Story', unreadCount: 0 },
  { id: 'combat', title: 'Combat', unreadCount: 0 },
  { id: 'speech', title: 'Speech', unreadCount: 0 },
  { id: 'thoughts', title: 'Thoughts', unreadCount: 0 },
  { id: 'room', title: 'Room', unreadCount: 0 },
  { id: 'experience', title: 'Experience', unreadCount: 0 },
  { id: 'inv', title: 'Inventory', unreadCount: 0 },
  { id: 'activespells', title: 'Active Spells', unreadCount: 0 },
  { id: 'familiar', title: 'Familiar', unreadCount: 0 },
  { id: 'death', title: 'Deaths', unreadCount: 0 },
  { id: 'logons', title: 'Logons', unreadCount: 0 },
  { id: 'raw', title: 'Raw XML', unreadCount: 0 },
];

export interface XMLParserCallbacks {
  onAddLine?: (line: OutputLine) => void;
  onAddLines?: (lines: OutputLine[]) => void;
  onClearStream: (streamId: string) => void;
  onRegisterStreamWindow: (config: StreamWindowConfig) => void;
  onRoundTime?: (seconds: number) => void;
  onCastTime?: (seconds: number) => void;
  onSpellPrepared?: (spellName: string) => void;
  onIndicator?: (id: string, visible: boolean) => void;
  onPrompt?: (promptText: string) => void;
}

// Preset color map mirroring Genie's PresetList
export const PRESET_COLORS: Record<string, { color: string; bgColor?: string; bold?: boolean }> = {
  thoughts: { color: '#c084fc', bold: false },
  thought: { color: '#c084fc', bold: false },
  whispers: { color: '#38bdf8', bold: false },
  whisper: { color: '#38bdf8', bold: false },
  speech: { color: '#fef08a', bold: false },
  say: { color: '#fef08a', bold: false },
  roomname: { color: '#f59e0b', bold: true },
  roomdesc: { color: '#93c5fd', bold: false },
  creatures: { color: '#f87171', bold: true },
  familiar: { color: '#a7f3d0', bold: false },
  combat: { color: '#ef4444', bold: false },
};

/**
 * High-performance XML Stream Parser for DragonRealms and Genie Remix.
 * Replicates Core/Game.cs stream target management with GRX-024 single-row flush fix
 * and batch line emission for zero UI lag.
 */
export class GameXmlStreamParser {
  private streamStack: string[] = ['main'];
  private currentStream: string = 'main';
  private callbacks: XMLParserCallbacks;
  private isBold = false;
  private activePreset: string | null = null;
  private rawMode = false;
  private pendingBatch: OutputLine[] = [];

  constructor(callbacks: XMLParserCallbacks) {
    this.callbacks = callbacks;
  }

  public setRawMode(enabled: boolean) {
    this.rawMode = enabled;
  }

  public getCurrentStream(): string {
    return this.currentStream;
  }

  public getStreamStack(): string[] {
    return [...this.streamStack];
  }

  /**
   * Translates common XML and HTML entities in a single pass
   */
  public static decodeEntities(text: string): string {
    if (!text || !text.includes('&')) return text;
    return text
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&amp;/g, '&')
      .replace(/&quot;/g, '"')
      .replace(/&apos;/g, "'");
  }

  /**
   * Normalizes stream IDs from game XML tags (e.g. 'percWindow' -> 'activespells')
   */
  public static normalizeStreamId(id: string): string {
    const lower = id.toLowerCase();
    if (lower === 'percwindow' || lower === 'spells' || lower === 'buffs') {
      return 'activespells';
    }
    if (lower === 'conversations' || lower === 'whispers' || lower === 'chatter') {
      return 'speech';
    }
    if (lower === 'inventory') {
      return 'inv';
    }
    if (lower === 'experience' || lower === 'exp' || lower === 'skills') {
      return 'experience';
    }
    return lower;
  }

  /**
   * Process incoming text or game row.
   * Can contain XML tags, pushStream, popStream, clearStream, presets, roundTime, etc.
   */
  public parseGameRow(rowText: string) {
    if (!rowText) return;

    this.pendingBatch = [];

    // Send to raw stream if enabled
    if (this.rawMode) {
      this.pendingBatch.push({
        id: `raw-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        text: rowText,
        stream: 'raw',
        timestamp: new Date().toLocaleTimeString(),
        color: '#94a3b8',
      });
    }

    // Fast path: if no '<' and '&', route directly to current stream
    if (!rowText.includes('<') && !rowText.includes('&')) {
      this.emitLine(rowText, this.currentStream);
      this.flushBatch();
      return;
    }

    let textBuffer = '';
    let i = 0;
    const len = rowText.length;

    while (i < len) {
      const char = rowText[i];

      if (char === '<') {
        const closeIdx = rowText.indexOf('>', i);
        if (closeIdx === -1) {
          textBuffer += char;
          i++;
          continue;
        }

        const tagContent = rowText.substring(i + 1, closeIdx);
        i = closeIdx + 1;

        // Process XML Tag
        this.processXmlTag(tagContent, textBuffer, (flushed) => {
          textBuffer = flushed;
        });
      } else if (char === '&') {
        const semiIdx = rowText.indexOf(';', i);
        if (semiIdx !== -1 && semiIdx - i <= 8) {
          const entity = rowText.substring(i, semiIdx + 1);
          textBuffer += GameXmlStreamParser.decodeEntities(entity);
          i = semiIdx + 1;
        } else {
          textBuffer += char;
          i++;
        }
      } else {
        textBuffer += char;
        i++;
      }
    }

    // End of row: flush remaining buffered text to current target
    if (textBuffer.length > 0) {
      this.emitLine(textBuffer, this.currentStream);
    }

    this.flushBatch();
  }

  private flushBatch() {
    if (this.pendingBatch.length === 0) return;

    if (this.callbacks.onAddLines) {
      this.callbacks.onAddLines([...this.pendingBatch]);
    } else if (this.callbacks.onAddLine) {
      for (const line of this.pendingBatch) {
        this.callbacks.onAddLine(line);
      }
    }
    this.pendingBatch = [];
  }

  /**
   * Parse XML tag and handle stream stack changes.
   * Implements GRX-024: Flushes buffered text to previous target before switching!
   */
  private processXmlTag(
    tag: string,
    currentBuffer: string,
    updateBuffer: (newBuffer: string) => void
  ) {
    const trimmed = tag.trim();

    // 1. pushStream: <pushStream id="combat"/>
    if (trimmed.startsWith('pushStream')) {
      const match = tag.match(/id=['"]([^'"]+)['"]/i);
      if (match && match[1]) {
        const rawTarget = match[1];
        const newTarget = GameXmlStreamParser.normalizeStreamId(rawTarget);

        // GRX-024: Flush text buffered before this tag to the old target!
        if (currentBuffer.length > 0) {
          this.emitLine(currentBuffer, this.currentStream);
          updateBuffer('');
        }

        this.streamStack.push(this.currentStream);
        this.currentStream = newTarget;

        // Register custom stream window if not known
        this.callbacks.onRegisterStreamWindow({
          id: newTarget,
          title: rawTarget.charAt(0).toUpperCase() + rawTarget.slice(1),
          unreadCount: 0,
          isCustom: !DEFAULT_STREAM_WINDOWS.some((d) => d.id === newTarget),
        });
      }
      return;
    }

    // 2. popStream: <popStream/>
    if (trimmed.startsWith('popStream') || trimmed.startsWith('/pushStream')) {
      // GRX-024: Flush text buffered before popStream to the current stream before popping!
      if (currentBuffer.length > 0) {
        this.emitLine(currentBuffer, this.currentStream);
        updateBuffer('');
      }

      if (this.streamStack.length > 1) {
        this.currentStream = this.streamStack.pop() || 'main';
      } else {
        this.currentStream = 'main';
      }
      return;
    }

    // 3. clearStream: <clearStream id="inv"/> or <clearContainer id="room"/>
    if (trimmed.startsWith('clearStream') || trimmed.startsWith('clearContainer')) {
      const match = tag.match(/id=['"]([^'"]+)['"]/i);
      if (match && match[1]) {
        const target = GameXmlStreamParser.normalizeStreamId(match[1]);
        this.callbacks.onClearStream(target);
      }
      return;
    }

    // Component XML tags (Simutronics game XML for room descriptions, exits, exp)
    if (trimmed.startsWith('component') || trimmed.startsWith('compDef')) {
      const match = tag.match(/id=['"]([^'"]+)['"]/i);
      if (match && match[1]) {
        const compId = match[1].toLowerCase();
        if (currentBuffer.length > 0) {
          this.emitLine(currentBuffer, this.currentStream);
          updateBuffer('');
        }
        if (compId.startsWith('room')) {
          this.streamStack.push(this.currentStream);
          this.currentStream = 'room';
        } else if (compId.startsWith('exp')) {
          this.streamStack.push(this.currentStream);
          this.currentStream = 'experience';
        }
      }
      return;
    }

    if (trimmed.startsWith('/component') || trimmed.startsWith('/compDef')) {
      if (currentBuffer.length > 0) {
        this.emitLine(currentBuffer, this.currentStream);
        updateBuffer('');
      }
      if (this.streamStack.length > 1) {
        this.currentStream = this.streamStack.pop() || 'main';
      } else {
        this.currentStream = 'main';
      }
      return;
    }

    // 4. streamWindow: <streamWindow id="..." title="..." subtitle="..." ifClosed="..."/>
    if (trimmed.startsWith('streamWindow')) {
      const idMatch = tag.match(/id=['"]([^'"]+)['"]/i);
      const titleMatch = tag.match(/title=['"]([^'"]+)['"]/i);
      const subMatch = tag.match(/subtitle=['"]([^'"]+)['"]/i);
      const ifClosedMatch = tag.match(/ifClosed=['"]([^'"]+)['"]/i);

      if (idMatch && idMatch[1]) {
        const streamId = GameXmlStreamParser.normalizeStreamId(idMatch[1]);
        this.callbacks.onRegisterStreamWindow({
          id: streamId,
          title: titleMatch ? titleMatch[1] : idMatch[1],
          subtitle: subMatch ? subMatch[1] : undefined,
          ifClosed: ifClosedMatch ? ifClosedMatch[1] : 'main',
          unreadCount: 0,
          isCustom: true,
        });
      }
      return;
    }

    // 5. Presets: <preset id="thought">, <preset id="whisper">, </preset>
    if (trimmed.startsWith('preset')) {
      const match = tag.match(/id=['"]([^'"]+)['"]/i);
      if (match && match[1]) {
        this.activePreset = match[1].toLowerCase();
      }
      return;
    }
    if (trimmed.startsWith('/preset')) {
      this.activePreset = null;
      return;
    }

    // 6. Bold: <pushBold/>, <popBold/>
    if (trimmed === 'pushBold' || trimmed === 'pushBold/') {
      this.isBold = true;
      return;
    }
    if (trimmed === 'popBold' || trimmed === 'popBold/' || trimmed === '/pushBold') {
      this.isBold = false;
      return;
    }

    // 7. Roundtime: <roundTime value="3"/>
    if (trimmed.startsWith('roundTime')) {
      const match = tag.match(/value=['"]?(\d+)['"]?/i);
      if (match && match[1] && this.callbacks.onRoundTime) {
        this.callbacks.onRoundTime(parseInt(match[1], 10));
      }
      return;
    }

    // 8. CastTime: <castTime value="5"/>
    if (trimmed.startsWith('castTime')) {
      const match = tag.match(/value=['"]?(\d+)['"]?/i);
      if (match && match[1] && this.callbacks.onCastTime) {
        this.callbacks.onCastTime(parseInt(match[1], 10));
      }
      return;
    }

    // 9. Spell: <spell>Minor Fire</spell>
    if (trimmed.startsWith('spell')) {
      const content = tag.replace(/^spell/i, '').replace(/[\/<>]/g, '').trim();
      if (content && this.callbacks.onSpellPrepared) {
        this.callbacks.onSpellPrepared(content);
      }
      return;
    }

    // 10. Indicator: <indicator id="IconBLEEDING" visible="y"/>
    if (trimmed.startsWith('indicator')) {
      const idMatch = tag.match(/id=['"]([^'"]+)['"]/i);
      const visMatch = tag.match(/visible=['"]([yn])['"]/i);
      if (idMatch && idMatch[1] && this.callbacks.onIndicator) {
        this.callbacks.onIndicator(idMatch[1], visMatch ? visMatch[1].toLowerCase() === 'y' : false);
      }
      return;
    }

    // 11. Prompt: <prompt time="...">...</prompt>
    if (trimmed.startsWith('prompt')) {
      const promptMatch = tag.match(/>([^<]+)/);
      if (promptMatch && promptMatch[1] && this.callbacks.onPrompt) {
        this.callbacks.onPrompt(promptMatch[1]);
      }
      return;
    }
  }

  /**
   * Emits a line to the specified stream with active preset/bold styling
   */
  private emitLine(text: string, stream: string) {
    if (!text && text !== '') return;

    let color: string | undefined;
    let bgColor: string | undefined;
    let bold = this.isBold;

    // Apply preset colors if present
    if (this.activePreset && PRESET_COLORS[this.activePreset]) {
      const p = PRESET_COLORS[this.activePreset];
      color = p.color;
      bgColor = p.bgColor;
      if (p.bold !== undefined) bold = p.bold;
    }

    // Clean up carriage returns
    const cleanText = text.replace(/\r\n/g, '\n').replace(/\r/g, '');

    // Skip purely empty lines if they don't carry meaningful spacing
    if (cleanText.length === 0) return;

    const line: OutputLine = {
      id: `line-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      text: cleanText,
      stream,
      timestamp: new Date().toLocaleTimeString(),
      color,
      bgColor,
      bold,
    };

    this.pendingBatch.push(line);
  }
}
