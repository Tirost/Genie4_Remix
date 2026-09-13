import { ScriptState } from '../types';

export interface ScriptCallbacks {
  sendOutput: (text: string, color?: string) => void;
  sendCommand: (command: string) => void;
  onStateChange: (state: ScriptState) => void;
  onFinished: (name: string) => void;
}

export class GenieScriptInterpreter {
  private state: ScriptState;
  private callbacks: ScriptCallbacks;
  private timeoutId: any = null;
  private isDestroyed = false;

  constructor(scriptName: string, scriptCode: string, callbacks: ScriptCallbacks) {
    this.callbacks = callbacks;
    const lines = scriptCode.split(/\r?\n/);
    const labels: Record<string, number> = {};

    // Index all labels
    lines.forEach((line, index) => {
      const trimmed = line.trim();
      if (trimmed.endsWith(':') && !trimmed.startsWith('#') && !trimmed.startsWith(';')) {
        const labelName = trimmed.slice(0, -1).trim().toLowerCase();
        labels[labelName] = index;
      }
    });

    this.state = {
      name: scriptName,
      code: scriptCode,
      lines,
      currentLineIndex: 0,
      status: 'idle',
      variables: {},
      labels,
      activeMatches: [],
    };
  }

  public getState(): ScriptState {
    return { ...this.state };
  }

  public start() {
    this.state.status = 'running';
    this.state.currentLineIndex = 0;
    this.callbacks.onStateChange(this.getState());
    this.callbacks.sendOutput(`[Script] Started: ${this.state.name}`, '#38bdf8');
    this.step();
  }

  public pause() {
    if (this.state.status === 'running' || this.state.status === 'waiting') {
      this.state.status = 'paused';
      if (this.timeoutId) clearTimeout(this.timeoutId);
      this.callbacks.onStateChange(this.getState());
      this.callbacks.sendOutput(`[Script] Paused: ${this.state.name}`, '#f59e0b');
    }
  }

  public resume() {
    if (this.state.status === 'paused') {
      this.state.status = 'running';
      this.callbacks.onStateChange(this.getState());
      this.callbacks.sendOutput(`[Script] Resumed: ${this.state.name}`, '#38bdf8');
      this.step();
    }
  }

  public stop() {
    this.state.status = 'stopped';
    if (this.timeoutId) clearTimeout(this.timeoutId);
    this.callbacks.onStateChange(this.getState());
    this.callbacks.sendOutput(`[Script] Stopped: ${this.state.name}`, '#ef4444');
    this.callbacks.onFinished(this.state.name);
  }

  public destroy() {
    this.isDestroyed = true;
    if (this.timeoutId) clearTimeout(this.timeoutId);
  }

  // Called when new game output line arrives, checking for active matches
  public onGameOutput(line: string) {
    if (this.state.status !== 'waiting' || this.state.activeMatches.length === 0) return;

    for (const match of this.state.activeMatches) {
      if (line.toLowerCase().includes(match.pattern.toLowerCase())) {
        this.callbacks.sendOutput(
          `[Script] Matched pattern "${match.pattern}" -> jumping to ${match.label}`,
          '#a855f7'
        );
        this.state.activeMatches = [];
        this.state.status = 'running';
        if (this.timeoutId) clearTimeout(this.timeoutId);
        this.jumpToLabel(match.label);
        return;
      }
    }
  }

  private replaceVariables(text: string): string {
    let result = text;
    for (const [key, val] of Object.entries(this.state.variables)) {
      result = result.split(`%${key}`).join(val);
      result = result.split(`$${key}`).join(val);
    }
    return result;
  }

  private jumpToLabel(labelName: string) {
    const target = labelName.toLowerCase().replace(':', '');
    const lineNum = this.state.labels[target];
    if (lineNum !== undefined) {
      this.state.currentLineIndex = lineNum + 1;
      this.step();
    } else {
      this.callbacks.sendOutput(
        `[Script Error] Label "${labelName}" not found in ${this.state.name}`,
        '#ef4444'
      );
      this.stop();
    }
  }

  private step() {
    if (this.isDestroyed || this.state.status !== 'running') return;

    if (this.state.currentLineIndex >= this.state.lines.length) {
      this.callbacks.sendOutput(`[Script] Completed: ${this.state.name}`, '#22c55e');
      this.stop();
      return;
    }

    const rawLine = this.state.lines[this.state.currentLineIndex];
    this.state.currentLineIndex++;
    this.callbacks.onStateChange(this.getState());

    const trimmed = rawLine.trim();
    if (!trimmed || trimmed.startsWith('#') || trimmed.startsWith(';') || trimmed.endsWith(':')) {
      // Empty line, comment, or label definition: execute next line immediately
      this.timeoutId = setTimeout(() => this.step(), 20);
      return;
    }

    const processedLine = this.replaceVariables(trimmed);
    const spaceIndex = processedLine.indexOf(' ');
    const cmd = (spaceIndex > 0 ? processedLine.slice(0, spaceIndex) : processedLine).toLowerCase();
    const args = spaceIndex > 0 ? processedLine.slice(spaceIndex + 1).trim() : '';

    switch (cmd) {
      case 'echo': {
        this.callbacks.sendOutput(`[Script] ${args}`, '#94a3b8');
        this.timeoutId = setTimeout(() => this.step(), 50);
        break;
      }

      case 'put': {
        this.callbacks.sendCommand(args);
        this.timeoutId = setTimeout(() => this.step(), 200);
        break;
      }

      case 'pause': {
        const seconds = parseFloat(args) || 1;
        this.state.waitReason = `Pausing for ${seconds}s`;
        this.callbacks.onStateChange(this.getState());
        this.timeoutId = setTimeout(() => {
          this.state.waitReason = undefined;
          this.step();
        }, seconds * 1000);
        break;
      }

      case 'goto': {
        this.jumpToLabel(args);
        break;
      }

      case 'match': {
        const parts = args.split(' ');
        const label = parts[0];
        const pattern = parts.slice(1).join(' ');
        if (label && pattern) {
          this.state.activeMatches.push({ label, pattern });
        }
        this.timeoutId = setTimeout(() => this.step(), 20);
        break;
      }

      case 'matchwait': {
        const timeoutSeconds = parseFloat(args) || 10;
        this.state.status = 'waiting';
        this.state.waitReason = `Waiting for game match (${timeoutSeconds}s max)`;
        this.callbacks.onStateChange(this.getState());

        this.timeoutId = setTimeout(() => {
          if (this.state.status === 'waiting') {
            this.callbacks.sendOutput(
              `[Script] matchwait timed out after ${timeoutSeconds}s`,
              '#f59e0b'
            );
            this.state.activeMatches = [];
            this.state.status = 'running';
            this.state.waitReason = undefined;
            this.step();
          }
        }, timeoutSeconds * 1000);
        break;
      }

      case 'var':
      case 'setvariable': {
        const parts = args.split(' ');
        const varName = parts[0];
        const val = parts.slice(1).join(' ');
        if (varName) {
          this.state.variables[varName] = val;
        }
        this.timeoutId = setTimeout(() => this.step(), 20);
        break;
      }

      case 'math': {
        // e.g. math count + 1 or math count - 1
        const parts = args.split(' ');
        const varName = parts[0];
        const op = parts[1];
        const val = parseFloat(parts[2]) || 0;
        const currentVal = parseFloat(this.state.variables[varName] || '0') || 0;
        let newVal = currentVal;
        if (op === '+') newVal = currentVal + val;
        else if (op === '-') newVal = currentVal - val;
        else if (op === '*') newVal = currentVal * val;
        else if (op === '/') newVal = val !== 0 ? currentVal / val : 0;
        this.state.variables[varName] = newVal.toString();
        this.timeoutId = setTimeout(() => this.step(), 20);
        break;
      }

      case 'exit':
      case 'stop': {
        this.stop();
        break;
      }

      default: {
        // Fallback: send as game command
        this.callbacks.sendCommand(processedLine);
        this.timeoutId = setTimeout(() => this.step(), 150);
        break;
      }
    }
  }
}
