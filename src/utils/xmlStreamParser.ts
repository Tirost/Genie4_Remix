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

// Preset color map mirroring Genie's PresetList and DragonRealms standards
export const PRESET_COLORS: Record<string, { color: string; bgColor?: string; bold?: boolean }> = {
  thoughts: { color: '#c084fc', bold: false },
  thought: { color: '#c084fc', bold: false },
  whispers: { color: '#38bdf8', bold: false },
  whisper: { color: '#38bdf8', bold: false },
  speech: { color: '#fef08a', bold: false },
  say: { color: '#fef08a', bold: false },
  roomname: { color: '#f59e0b', bold: true },
  roomdesc: { color: '#93c5fd', bold: false },
  creatures: { color: '#38bdf8', bold: true },
  familiar: { color: '#a7f3d0', bold: false },
  combat: { color: '#ef4444', bold: false },
  bold: { color: '#38bdf8', bold: true },
  watching: { color: '#67e8f9', bold: false },
  link: { color: '#38bdf8', bold: false },
  selected: { color: '#fbbf24', bold: true },
  chatter: { color: '#86efac', bold: false },
};

/**
 * High-performance XML Stream Parser for DragonRealms and Genie Remix.
 * Replicates Core/Game.cs stream target management with GRX-024 single-row flush fix,
 * full inline pushBold/popBold segment styling, and batch line emission for zero UI lag.
 */
export class GameXmlStreamParser {
  private streamStack: string[] = ['main'];
  private currentStream: string = 'main';
  private callbacks: XMLParserCallbacks;
  private isBold = false;
  private activePreset: string | null = null;
  private activeCmd: string | null = null;
  private rawMode = false;
  private pendingBatch: OutputLine[] = [];
  private currentLineSegments: { text: string; color?: string; bgColor?: string; bold?: boolean; cmd?: string }[] = [];

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
      this.flushSegmentToLine(rowText);
      this.emitCurrentLine();
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

    // End of row: flush remaining buffered text to line and emit
    if (textBuffer.length > 0) {
      this.flushSegmentToLine(textBuffer);
    }
    this.emitCurrentLine();

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
   * Appends text with active styling (bold, preset) to the current line's segment list.
   * Splits on newlines (\n) to emit completed lines immediately.
   */
  private flushSegmentToLine(text: string): void {
    if (!text) return;

    // Determine active segment formatting
    const preset = this.activePreset ? PRESET_COLORS[this.activePreset] : undefined;
    const isSegmentBold = this.isBold || (preset?.bold ?? false);
    let segColor = preset ? preset.color : undefined;
    const segBgColor = preset ? preset.bgColor : undefined;

    // DragonRealms & Genie standard: bold text inside <pushBold/> is styled with bold highlight color (Cyan '#38bdf8')
    if (this.isBold && !segColor) {
      segColor = PRESET_COLORS['bold']?.color || '#38bdf8';
    }

    // Normalize carriage returns
    const clean = text.replace(/\r\n/g, '\n').replace(/\r/g, '');

    if (clean.includes('\n')) {
      const parts = clean.split('\n');
      for (let idx = 0; idx < parts.length; idx++) {
        const part = parts[idx];
        if (part.length > 0) {
          this.currentLineSegments.push({
            text: part,
            color: segColor,
            bgColor: segBgColor,
            bold: isSegmentBold,
            cmd: this.activeCmd || undefined,
          });
        }
        if (idx < parts.length - 1) {
          this.emitCurrentLine();
        }
      }
    } else {
      this.currentLineSegments.push({
        text: clean,
        color: segColor,
        bgColor: segBgColor,
        bold: isSegmentBold,
        cmd: this.activeCmd || undefined,
      });
    }
  }

  /**
   * Finalizes the current line segments into an OutputLine in the current stream.
   */
  private emitCurrentLine(): void {
    if (this.currentLineSegments.length === 0) return;

    const fullText = this.currentLineSegments.map((s) => s.text).join('');
    if (fullText.length === 0) {
      this.currentLineSegments = [];
      return;
    }

    const allBold = this.currentLineSegments.every((s) => s.bold);
    const hasAnyBold = this.currentLineSegments.some((s) => s.bold);
    const hasAnyColor = this.currentLineSegments.some((s) => !!s.color);
    const hasAnyCmd = this.currentLineSegments.some((s) => !!s.cmd);
    const hasDifferentStyles = this.currentLineSegments.length > 1;

    const line: OutputLine = {
      id: `line-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      text: fullText,
      stream: this.currentStream,
      timestamp: new Date().toLocaleTimeString(),
      color: !hasDifferentStyles ? this.currentLineSegments[0].color : undefined,
      bgColor: !hasDifferentStyles ? this.currentLineSegments[0].bgColor : undefined,
      bold: allBold || this.isBold,
      segments: hasDifferentStyles || hasAnyBold || hasAnyColor || hasAnyCmd ? [...this.currentLineSegments] : undefined,
    };

    this.pendingBatch.push(line);
    this.currentLineSegments = [];
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

        // Flush text and current line to previous stream before switching
        if (currentBuffer.length > 0) {
          this.flushSegmentToLine(currentBuffer);
          updateBuffer('');
        }
        this.emitCurrentLine();

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
      // Flush text and line to current stream before popping
      if (currentBuffer.length > 0) {
        this.flushSegmentToLine(currentBuffer);
        updateBuffer('');
      }
      this.emitCurrentLine();

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
          this.flushSegmentToLine(currentBuffer);
          updateBuffer('');
        }
        this.emitCurrentLine();

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
        this.flushSegmentToLine(currentBuffer);
        updateBuffer('');
      }
      this.emitCurrentLine();

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

    // 5. Presets: <preset id="thought">, <preset id=thought>, <preset id="whisper" />, </preset>
    if (trimmed.toLowerCase().startsWith('preset')) {
      const match = tag.match(/id=['"]?([^'"\s>]+)/i);
      if (currentBuffer.length > 0) {
        this.flushSegmentToLine(currentBuffer);
        updateBuffer('');
      }
      if (match && match[1]) {
        const pId = match[1].toLowerCase();
        if (pId === 'default' || pId === '') {
          this.activePreset = null;
        } else {
          this.activePreset = pId;
        }
      }
      return;
    }
    if (trimmed.toLowerCase().startsWith('/preset')) {
      if (currentBuffer.length > 0) {
        this.flushSegmentToLine(currentBuffer);
        updateBuffer('');
      }
      this.activePreset = null;
      return;
    }

    // 6. Styles: <style id="roomName" />, <style id="bold" />, <style id="" />, </style>
    if (trimmed.toLowerCase().startsWith('style')) {
      const idMatch = tag.match(/id=['"]?([^'"\s>]*)/i);
      if (currentBuffer.length > 0) {
        this.flushSegmentToLine(currentBuffer);
        updateBuffer('');
      }
      if (idMatch) {
        const styleId = (idMatch[1] || '').toLowerCase();
        if (!styleId || styleId === 'default') {
          this.activePreset = null;
          this.isBold = false;
        } else if (styleId === 'bold') {
          this.isBold = true;
        } else {
          this.activePreset = styleId;
        }
      }
      return;
    }
    if (trimmed.toLowerCase() === '/style') {
      if (currentBuffer.length > 0) {
        this.flushSegmentToLine(currentBuffer);
        updateBuffer('');
      }
      this.activePreset = null;
      this.isBold = false;
      return;
    }

    // 7. Bold Open: <pushBold/>, <pushBold />, <pushbold/>, <b>, <bold>
    if (/^(pushBold|pushbold|b|bold)(\s*\/)?$/i.test(trimmed)) {
      if (currentBuffer.length > 0) {
        this.flushSegmentToLine(currentBuffer);
        updateBuffer('');
      }
      this.isBold = true;
      return;
    }

    // 8. Bold Close: <popBold/>, <popBold />, <popbold/>, </pushBold>, </pushbold>, </b>, </bold>
    if (/^(popBold|popbold|\/pushBold|\/pushbold|\/b|\/bold)(\s*\/)?$/i.test(trimmed)) {
      if (currentBuffer.length > 0) {
        this.flushSegmentToLine(currentBuffer);
        updateBuffer('');
      }
      this.isBold = false;
      return;
    }

    // 9. Dynamic Links: <d cmd="look">look</d>
    if (trimmed.toLowerCase().startsWith('d ') || trimmed.toLowerCase().startsWith('d=')) {
      const cmdMatch = tag.match(/cmd=['"]?([^'"]+)['"]?/i);
      if (cmdMatch && cmdMatch[1]) {
        if (currentBuffer.length > 0) {
          this.flushSegmentToLine(currentBuffer);
          updateBuffer('');
        }
        this.activeCmd = cmdMatch[1];
      }
      return;
    }
    if (trimmed.toLowerCase() === '/d') {
      if (currentBuffer.length > 0) {
        this.flushSegmentToLine(currentBuffer);
        updateBuffer('');
      }
      this.activeCmd = null;
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

    if (this.isBold && !color) {
      color = PRESET_COLORS['bold']?.color || '#38bdf8';
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
