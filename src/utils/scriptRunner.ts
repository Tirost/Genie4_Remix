import { ScriptState } from '../types';
import { substituteVariablesInText, getCachedRegex } from './gameEngine';

export interface ScriptCallbacks {
  sendOutput: (text: string, color?: string) => void;
  sendCommand: (command: string) => void;
  onStateChange: (state: ScriptState) => void;
  onFinished: (name: string) => void;
  getGlobalVariable?: (name: string) => string | undefined;
  setGlobalVariable?: (name: string, value: string) => void;
  getAllGlobalVariables?: () => Record<string, string>;
}

interface ScriptAction {
  id: string;
  pattern: string;
  isRegex: boolean;
  command: string;
}

export class GenieScriptInterpreter {
  private state: ScriptState;
  private callbacks: ScriptCallbacks;
  private timeoutId: any = null;
  private isDestroyed = false;
  private callStack: number[] = [];
  private scriptActions: ScriptAction[] = [];
  private waitForMatch: { pattern: string; isRegex: boolean; label?: string } | null = null;
  private counter: number = 0;
  private lastStateNotifyTime: number = 0;
  private isWaitingForServerInteraction = false;
  private recentOutputBuffer: { text: string; time: number }[] = [];

  constructor(
    scriptName: string,
    scriptCode: string,
    callbacks: ScriptCallbacks,
    scriptArgs: string[] = []
  ) {
    this.callbacks = callbacks;
    const lines = scriptCode.split(/\r?\n/);
    const labels: Record<string, number> = {};

    // Index all labels: e.g. "loop:", "gotitem:", etc.
    lines.forEach((line, index) => {
      const trimmed = line.trim();
      if (trimmed.endsWith(':') && !trimmed.startsWith('#') && !trimmed.startsWith(';')) {
        const labelName = trimmed.slice(0, -1).trim().toLowerCase();
        labels[labelName] = index;
      }
    });

    // Populate script parameter variables: %0, %1, %2, etc.
    const initialVariables: Record<string, string> = {
      c: '0',
    };
    if (scriptArgs && scriptArgs.length > 0) {
      initialVariables['0'] = scriptArgs.join(' ');
      scriptArgs.forEach((arg, idx) => {
        initialVariables[(idx + 1).toString()] = arg;
      });
      initialVariables['argcount'] = scriptArgs.length.toString();
    } else {
      initialVariables['0'] = '';
      initialVariables['argcount'] = '0';
    }

    this.state = {
      name: scriptName,
      code: scriptCode,
      lines,
      currentLineIndex: 0,
      status: 'idle',
      variables: initialVariables,
      labels,
      activeMatches: [],
    };
  }

  public getState(): ScriptState {
    return {
      ...this.state,
      variables: { ...this.state.variables },
      activeMatches: [...this.state.activeMatches],
    };
  }

  private notifyStateChange(force = false) {
    const now = Date.now();
    if (force || now - this.lastStateNotifyTime > 150) {
      this.lastStateNotifyTime = now;
      this.callbacks.onStateChange(this.getState());
    }
  }

  public start() {
    this.state.status = 'running';
    this.state.currentLineIndex = 0;
    this.notifyStateChange(true);
    this.callbacks.sendOutput(`[Script] Started: ${this.state.name}`, '#38bdf8');
    this.step();
  }

  public pause() {
    if (this.state.status === 'running' || this.state.status === 'waiting') {
      this.state.status = 'paused';
      if (this.timeoutId) clearTimeout(this.timeoutId);
      this.notifyStateChange(true);
      this.callbacks.sendOutput(`[Script] Paused: ${this.state.name}`, '#f59e0b');
    }
  }

  public resume() {
    if (this.state.status === 'paused') {
      this.state.status = 'running';
      this.notifyStateChange(true);
      this.callbacks.sendOutput(`[Script] Resumed: ${this.state.name}`, '#38bdf8');
      this.step();
    }
  }

  public stop() {
    this.state.status = 'stopped';
    this.isWaitingForServerInteraction = false;
    this.recentOutputBuffer = [];
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
      this.timeoutId = null;
    }
    this.notifyStateChange(true);
    this.callbacks.sendOutput(`[Script] Stopped: ${this.state.name}`, '#ef4444');
    this.callbacks.onFinished(this.state.name);
  }

  public destroy() {
    this.isDestroyed = true;
    this.isWaitingForServerInteraction = false;
    this.recentOutputBuffer = [];
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
      this.timeoutId = null;
    }
  }

  /**
   * Helper to check a line against all active matches (match / matchre).
   * Returns true and triggers immediate label jump if matched.
   */
  private checkLineAgainstMatches(line: string): boolean {
    if (!line || this.state.activeMatches.length === 0) return false;

    for (const match of this.state.activeMatches) {
      let isMatched = false;
      let matchedGroups: string[] = [];

      if (match.isRegex) {
        const regex = getCachedRegex(match.pattern, true, true);
        if (regex) {
          regex.lastIndex = 0;
          const execMatch = regex.exec(line);
          if (execMatch) {
            isMatched = true;
            matchedGroups = Array.from(execMatch);
          }
        }
      } else {
        if (line.toLowerCase().includes(match.pattern.toLowerCase())) {
          isMatched = true;
        }
      }

      if (isMatched) {
        this.callbacks.sendOutput(
          `[Script] Matched "${match.pattern}" -> jumping to ${match.label}`,
          '#a855f7'
        );

        // Populate capture variables %0, %1, etc.
        if (matchedGroups.length > 0) {
          matchedGroups.forEach((g, idx) => {
            this.state.variables[idx.toString()] = g;
          });
        }

        this.state.activeMatches = [];
        this.state.status = 'running';
        this.state.waitReason = undefined;
        if (this.timeoutId) {
          clearTimeout(this.timeoutId);
          this.timeoutId = null;
        }
        this.jumpToLabel(match.label);
        return true;
      }
    }
    return false;
  }

  // Real-time game output processor: check script triggers, matches, wait, and waitfor
  public onGameOutput(line: string) {
    if (this.isDestroyed || !line) return;

    // Buffer recent output line for zero-lag matching
    const now = Date.now();
    this.recentOutputBuffer.push({ text: line, time: now });
    if (this.recentOutputBuffer.length > 25) {
      this.recentOutputBuffer.splice(0, this.recentOutputBuffer.length - 25);
    }

    // 1. Process script-scoped actions (active autonomous triggers declared in the script)
    for (const action of this.scriptActions) {
      const regex = getCachedRegex(action.pattern, action.isRegex, true);
      if (regex) regex.lastIndex = 0;
      if (regex && regex.test(line)) {
        const cmd = this.replaceVariables(action.command);
        this.callbacks.sendOutput(`[Script Trigger] -> ${cmd}`, '#a855f7');
        this.callbacks.sendCommand(cmd);
      }
    }

    // 2. Genie "wait" command: pauses script until next server interaction, resumes immediately!
    if (this.state.status === 'waiting' && this.isWaitingForServerInteraction) {
      this.isWaitingForServerInteraction = false;
      this.state.status = 'running';
      this.state.waitReason = undefined;
      if (this.timeoutId) {
        clearTimeout(this.timeoutId);
        this.timeoutId = null;
      }
      this.step();
      return;
    }

    // 3. Process active waitfor / waitforre
    if (this.state.status === 'waiting' && this.waitForMatch) {
      const target = this.waitForMatch;
      let matched = false;
      if (target.isRegex) {
        const regex = getCachedRegex(target.pattern, true, true);
        if (regex) regex.lastIndex = 0;
        if (regex && regex.test(line)) matched = true;
      } else {
        if (line.toLowerCase().includes(target.pattern.toLowerCase())) matched = true;
      }

      if (matched) {
        this.waitForMatch = null;
        this.state.status = 'running';
        this.state.waitReason = undefined;
        if (this.timeoutId) {
          clearTimeout(this.timeoutId);
          this.timeoutId = null;
        }
        if (target.label) {
          this.jumpToLabel(target.label);
        } else {
          this.step();
        }
        return;
      }
    }

    // 4. Process active matches from match / matchre / matchwait immediately
    if (this.state.status === 'waiting' && this.state.activeMatches.length > 0) {
      if (this.checkLineAgainstMatches(line)) {
        return;
      }
    }
  }

  // Variable notification: called when a global variable changes (e.g. from an active trigger)
  public onVariableChanged(name: string, value: string) {
    if (this.isDestroyed) return;
    // Script sees the updated global variable immediately through replaceVariables()
  }

  // Fast single-pass variable replacement
  public replaceVariables(text: string): string {
    if (!text || (!text.includes('%') && !text.includes('$'))) return text;

    const globalVars = this.callbacks.getAllGlobalVariables
      ? this.callbacks.getAllGlobalVariables()
      : undefined;

    return substituteVariablesInText(text, this.state.variables, globalVars);
  }

  private jumpToLabel(labelName: string) {
    const target = labelName.toLowerCase().replace(':', '').trim();
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

  // Evaluate simple condition: e.g. "%count < 10", "$health < 50", '"$guild" == "Barbarian"'
  private evaluateCondition(expr: string): boolean {
    const cleaned = expr.trim().replace(/^if\s+/i, '').trim();
    const processed = this.replaceVariables(cleaned);

    // Check for equality == or =
    const eqMatch = processed.match(/^(.+?)\s*(===?|==)\s*(.+)$/);
    if (eqMatch) {
      const left = eqMatch[1].replace(/["']/g, '').trim();
      const right = eqMatch[3].replace(/["']/g, '').trim();
      return left.toLowerCase() === right.toLowerCase();
    }

    // Check for inequality !=
    const neqMatch = processed.match(/^(.+?)\s*(!=|<=>)\s*(.+)$/);
    if (neqMatch) {
      const left = neqMatch[1].replace(/["']/g, '').trim();
      const right = neqMatch[3].replace(/["']/g, '').trim();
      return left.toLowerCase() !== right.toLowerCase();
    }

    // Check numerical comparison: <=, >=, <, >
    const numMatch = processed.match(/^(.+?)\s*(<=|>=|<|>)\s*(.+)$/);
    if (numMatch) {
      const left = parseFloat(numMatch[1].replace(/["']/g, '').trim()) || 0;
      const op = numMatch[2];
      const right = parseFloat(numMatch[3].replace(/["']/g, '').trim()) || 0;
      if (op === '<') return left < right;
      if (op === '<=') return left <= right;
      if (op === '>') return left > right;
      if (op === '>=') return left >= right;
    }

    // Truthy check if string is not empty and not "0" or "false"
    const val = processed.replace(/["']/g, '').trim().toLowerCase();
    return val !== '' && val !== '0' && val !== 'false';
  }

  /**
   * High-Performance Micro-Step Loop:
   * Executes consecutive non-blocking operations (variables, math, labels, comments, goto)
   * synchronously in the same loop tick without artificial setTimeout cascades.
   */
  private step() {
    if (this.isDestroyed || this.state.status !== 'running') return;

    let stepsInThisTick = 0;
    const MAX_SYNCHRONOUS_STEPS = 60;

    while (stepsInThisTick < MAX_SYNCHRONOUS_STEPS && this.state.status === 'running') {
      stepsInThisTick++;

      if (this.state.currentLineIndex >= this.state.lines.length) {
        this.callbacks.sendOutput(`[Script] Completed: ${this.state.name}`, '#22c55e');
        this.stop();
        return;
      }

      const rawLine = this.state.lines[this.state.currentLineIndex++];
      const trimmed = rawLine.trim();

      // Empty line, comment, or label definition: continue immediately
      if (!trimmed || trimmed.startsWith('#') || trimmed.startsWith(';') || trimmed.endsWith(':')) {
        continue;
      }

      const processedLine = this.replaceVariables(trimmed);
      const spaceIndex = processedLine.indexOf(' ');
      const cmd = (spaceIndex > 0 ? processedLine.slice(0, spaceIndex) : processedLine).toLowerCase();
      const args = spaceIndex > 0 ? processedLine.slice(spaceIndex + 1).trim() : '';

      switch (cmd) {
        case 'echo': {
          this.callbacks.sendOutput(`[Script] ${args}`, '#94a3b8');
          continue;
        }

        case 'put': {
          // Send command to game immediately without artificial delay, so matching text can be evaluated instantly
          this.callbacks.sendCommand(args);
          this.notifyStateChange();
          continue;
        }

        case 'wait': {
          // Genie "wait": pauses script until the next server interaction (or optional timeout)
          const timeoutSeconds = parseFloat(args) || 0;
          this.state.status = 'waiting';
          this.isWaitingForServerInteraction = true;
          this.state.waitReason = timeoutSeconds > 0
            ? `Waiting for server interaction (${timeoutSeconds}s max)`
            : 'Waiting for server interaction';
          this.notifyStateChange(true);

          if (timeoutSeconds > 0) {
            if (this.timeoutId) clearTimeout(this.timeoutId);
            this.timeoutId = setTimeout(() => {
              if (this.state.status === 'waiting' && this.isWaitingForServerInteraction) {
                this.isWaitingForServerInteraction = false;
                this.state.status = 'running';
                this.state.waitReason = undefined;
                this.step();
              }
            }, timeoutSeconds * 1000);
          }
          return;
        }

        case 'pause': {
          const seconds = parseFloat(args) || 1;
          this.state.waitReason = `Pausing for ${seconds}s`;
          this.notifyStateChange(true);
          this.timeoutId = setTimeout(() => {
            if (this.state.status === 'running' || this.state.status === 'waiting') {
              this.state.waitReason = undefined;
              this.state.status = 'running';
              this.step();
            }
          }, seconds * 1000);
          return;
        }

        case 'goto': {
          this.jumpToLabel(args);
          return;
        }

        case 'gosub': {
          this.callStack.push(this.state.currentLineIndex);
          this.jumpToLabel(args);
          return;
        }

        case 'return': {
          if (this.callStack.length > 0) {
            this.state.currentLineIndex = this.callStack.pop()!;
            continue;
          } else {
            this.callbacks.sendOutput(`[Script Warning] return called with empty callstack`, '#f59e0b');
            continue;
          }
        }

        // if condition [then] command
        case 'if': {
          // e.g. if (%count < 10) goto loop
          // e.g. if %count < 10 goto loop
          // e.g. if "$guild" == "Barbarian" echo barbarian guild
          let cond = args;
          let actionCmd = '';

          const thenIdx = args.toLowerCase().indexOf(' then ');
          if (thenIdx > 0) {
            cond = args.slice(0, thenIdx).trim();
            actionCmd = args.slice(thenIdx + 6).trim();
          } else {
            // Find goto or put or echo in expression
            const kwMatch = args.match(/\s+(goto|put|echo|gosub|var|math|exit|stop)\s+/i);
            if (kwMatch && kwMatch.index) {
              cond = args.slice(0, kwMatch.index).trim();
              actionCmd = args.slice(kwMatch.index).trim();
            }
          }

          if (this.evaluateCondition(cond)) {
            if (actionCmd.toLowerCase().startsWith('goto ')) {
              this.jumpToLabel(actionCmd.slice(5).trim());
              return;
            } else if (actionCmd.toLowerCase().startsWith('gosub ')) {
              this.callStack.push(this.state.currentLineIndex);
              this.jumpToLabel(actionCmd.slice(6).trim());
              return;
            } else if (actionCmd) {
              // Execute the inline action
              this.state.lines.splice(this.state.currentLineIndex, 0, actionCmd);
              continue;
            }
          }
          continue;
        }

        // if_1, if_2, etc. (check if parameter argument exists)
        case 'if_1':
        case 'if_2':
        case 'if_3':
        case 'if_4':
        case 'if_5': {
          const argNum = cmd.slice(3);
          const hasArg = Boolean(this.state.variables[argNum] && this.state.variables[argNum].trim() !== '');
          if (hasArg && args) {
            if (args.toLowerCase().startsWith('goto ')) {
              this.jumpToLabel(args.slice(5).trim());
              return;
            }
            this.state.lines.splice(this.state.currentLineIndex, 0, args);
          }
          continue;
        }

        case 'shift': {
          // Shift parameters: %1 becomes %2, %2 becomes %3, etc.
          let idx = 1;
          while (this.state.variables[(idx + 1).toString()] !== undefined) {
            this.state.variables[idx.toString()] = this.state.variables[(idx + 1).toString()];
            idx++;
          }
          delete this.state.variables[idx.toString()];
          continue;
        }

        case 'match': {
          const parts = args.split(' ');
          const label = parts[0];
          const pattern = parts.slice(1).join(' ');
          if (label && pattern) {
            this.state.activeMatches.push({ label, pattern, isRegex: false });
          }
          continue;
        }

        case 'matchre': {
          const parts = args.split(' ');
          const label = parts[0];
          const pattern = parts.slice(1).join(' ');
          if (label && pattern) {
            this.state.activeMatches.push({ label, pattern, isRegex: true });
          }
          continue;
        }

        case 'matchwait': {
          const timeoutSeconds = parseFloat(args) || 15;
          this.state.status = 'waiting';
          this.state.waitReason = `Waiting for game match (${timeoutSeconds}s max)`;
          this.notifyStateChange(true);

          // Zero-delay check: match immediately if game response arrived in this tick or recent buffer!
          const now = Date.now();
          const recent = this.recentOutputBuffer.filter((e) => now - e.time < 2500);
          for (let r = recent.length - 1; r >= 0; r--) {
            if (this.checkLineAgainstMatches(recent[r].text)) {
              return;
            }
          }

          if (this.timeoutId) clearTimeout(this.timeoutId);
          this.timeoutId = setTimeout(() => {
            if (this.state.status === 'waiting' && this.state.activeMatches.length > 0) {
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
          return;
        }

        case 'waitfor': {
          this.waitForMatch = { pattern: args, isRegex: false };
          this.state.status = 'waiting';
          this.state.waitReason = `Waiting for "${args}"`;
          this.notifyStateChange(true);

          // Check if already matched in recent output buffer
          const now = Date.now();
          const recent = this.recentOutputBuffer.filter((e) => now - e.time < 2500);
          for (let r = recent.length - 1; r >= 0; r--) {
            if (recent[r].text.toLowerCase().includes(args.toLowerCase())) {
              this.waitForMatch = null;
              this.state.status = 'running';
              this.state.waitReason = undefined;
              this.step();
              return;
            }
          }
          return;
        }

        case 'waitforre': {
          this.waitForMatch = { pattern: args, isRegex: true };
          this.state.status = 'waiting';
          this.state.waitReason = `Waiting for regex "${args}"`;
          this.notifyStateChange(true);

          // Check if already matched in recent output buffer
          const now = Date.now();
          const recent = this.recentOutputBuffer.filter((e) => now - e.time < 2500);
          const regex = getCachedRegex(args, true, true);
          if (regex) {
            for (let r = recent.length - 1; r >= 0; r--) {
              regex.lastIndex = 0;
              if (regex.test(recent[r].text)) {
                this.waitForMatch = null;
                this.state.status = 'running';
                this.state.waitReason = undefined;
                this.step();
                return;
              }
            }
          }
          return;
        }

        case 'action': {
          // e.g. action put stand when knocked to the ground
          // or action remove <pattern>
          if (args.toLowerCase().startsWith('remove ')) {
            const patToRemove = args.slice(7).trim();
            this.scriptActions = this.scriptActions.filter(
              (a) => a.pattern.toLowerCase() !== patToRemove.toLowerCase()
            );
          } else {
            const whenIdx = args.toLowerCase().indexOf(' when ');
            if (whenIdx > 0) {
              const actionCmd = args.slice(0, whenIdx).trim();
              const pattern = args.slice(whenIdx + 6).trim();
              this.scriptActions.push({
                id: `act-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
                pattern,
                isRegex: pattern.includes('.*') || pattern.includes('\\') || pattern.includes('^'),
                command: actionCmd,
              });
            }
          }
          continue;
        }

        // Local variable definition
        case 'var':
        case 'setvariable': {
          const parts = args.split(' ');
          const varName = parts[0];
          const val = parts.slice(1).join(' ');
          if (varName) {
            this.state.variables[varName.toLowerCase()] = val;
            this.state.variables[varName] = val;
          }
          continue;
        }

        // Global variable definition from script
        case '#var':
        case 'global':
        case 'setglobalvariable': {
          const parts = args.split(' ');
          const varName = parts[0];
          const val = parts.slice(1).join(' ');
          if (varName && this.callbacks.setGlobalVariable) {
            this.callbacks.setGlobalVariable(varName, val);
          }
          continue;
        }

        case 'deletevariable':
        case 'unvar': {
          delete this.state.variables[args.toLowerCase()];
          delete this.state.variables[args];
          continue;
        }

        case 'math': {
          // e.g. math count + 1, math count - 1, math count add 1
          const parts = args.split(' ');
          const varName = parts[0];
          const op = parts[1]?.toLowerCase();
          const val = parseFloat(parts[2]) || 0;
          const currentVal = parseFloat(this.state.variables[varName.toLowerCase()] || '0') || 0;
          let newVal = currentVal;

          if (op === '+' || op === 'add') newVal = currentVal + val;
          else if (op === '-' || op === 'sub' || op === 'subtract') newVal = currentVal - val;
          else if (op === '*' || op === 'mul' || op === 'multiply') newVal = currentVal * val;
          else if (op === '/' || op === 'div' || op === 'divide') newVal = val !== 0 ? currentVal / val : 0;
          else if (op === '%' || op === 'mod' || op === 'modulus') newVal = val !== 0 ? currentVal % val : 0;

          const strResult = newVal.toString();
          this.state.variables[varName.toLowerCase()] = strResult;
          this.state.variables[varName] = strResult;
          continue;
        }

        case 'counter': {
          // Classic Genie script counter: counter set 5, counter add 1, counter sub 1
          const parts = args.split(' ');
          const action = parts[0]?.toLowerCase();
          const val = parseInt(parts[1] || '0', 10);
          if (action === 'set') this.counter = val;
          else if (action === 'add') this.counter += val;
          else if (action === 'sub') this.counter -= val;
          else if (action === 'clear') this.counter = 0;
          this.state.variables['c'] = this.counter.toString();
          continue;
        }

        case 'exit':
        case 'stop':
        case 'abort': {
          this.stop();
          return;
        }

        default: {
          // Fallback: send as direct game command and continue immediately
          this.callbacks.sendCommand(processedLine);
          this.notifyStateChange();
          continue;
        }
      }
    }

    // Yield back to JS event loop if still running
    if (this.state.status === 'running') {
      this.timeoutId = setTimeout(() => this.step(), 0);
    }
  }
}
