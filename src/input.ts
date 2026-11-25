import type { Vec2 } from './types';

const MOVEMENT_KEYS = new Set([
  'KeyW',
  'KeyA',
  'KeyS',
  'KeyD',
  'ArrowUp',
  'ArrowDown',
  'ArrowLeft',
  'ArrowRight',
]);

const SPRINT_KEYS = new Set(['ShiftLeft', 'ShiftRight']);

export interface InputCallbacks {
  onUserGesture: () => void;
  onZoom: (deltaSteps: number) => void;
  onToggleInventory: () => void;
  onToggleMap: () => void;
  onToggleJournal: () => void;
  onInteract: () => void;
  onToggleLantern: () => void;
  onToggleStealth: () => void;
  onToggleMute: () => void;
  onCycleTime: () => void;
  onCycleWeather: () => void;
  onAttack: (aimClientX?: number, aimClientY?: number) => void;
  onDash: (aimClientX?: number, aimClientY?: number) => void;
  onRespawn: () => void;
  onEscape: () => void;
  onModalNavigate: (delta: number) => void;
  onModalConfirm: () => void;
  onModalQuickChoice: (index: number) => void;
  onMenuNavigate: (delta: number) => void;
  onMenuConfirm: () => void;
  isModalOpen: () => boolean;
  isListModalOpen: () => boolean;
  isMenuOpen: () => boolean;
}

export class InputManager {
  private readonly pressedKeys = new Set<string>();
  private readonly targetElement: HTMLElement;
  private readonly callbacks: InputCallbacks;
  private shiftDownTime = 0;
  private shiftUsedForSprint = false;

  private readonly handleKeyDownBound: (e: KeyboardEvent) => void;
  private readonly handleKeyUpBound: (e: KeyboardEvent) => void;
  private readonly handleWheelBound: (e: WheelEvent) => void;
  private readonly handleMouseDownBound: (e: MouseEvent) => void;
  private readonly handleContextMenuBound: (e: MouseEvent) => void;
  private readonly handleBlurBound: () => void;

  constructor(targetElement: HTMLElement, callbacks: InputCallbacks) {
    this.targetElement = targetElement;
    this.callbacks = callbacks;

    this.handleKeyDownBound = this.handleKeyDown.bind(this);
    this.handleKeyUpBound = this.handleKeyUp.bind(this);
    this.handleWheelBound = this.handleWheel.bind(this);
    this.handleMouseDownBound = this.handleMouseDown.bind(this);
    this.handleContextMenuBound = this.handleContextMenu.bind(this);
    this.handleBlurBound = this.clearKeys.bind(this);

    window.addEventListener('keydown', this.handleKeyDownBound);
    window.addEventListener('keyup', this.handleKeyUpBound);
    window.addEventListener('blur', this.handleBlurBound);
    this.targetElement.addEventListener('wheel', this.handleWheelBound, {
      passive: false,
    });
    this.targetElement.addEventListener('mousedown', this.handleMouseDownBound);
    this.targetElement.addEventListener('contextmenu', this.handleContextMenuBound);
  }

  private handleKeyDown(event: KeyboardEvent): void {
    this.callbacks.onUserGesture();

    // Let user type freely into the custom seed input without triggering game hotkeys
    const activeEl = document.activeElement;
    const isTypingInInput =
      activeEl instanceof HTMLInputElement || activeEl instanceof HTMLTextAreaElement;
    if (isTypingInInput) {
      if (event.code === 'Escape') {
        event.preventDefault();
        activeEl.blur();
        this.callbacks.onEscape();
      }
      return;
    }

    // Global UI toggle shortcuts (ignore auto-repeat)
    if (!event.repeat) {
      if (event.code === 'KeyN') {
        event.preventDefault();
        this.callbacks.onToggleMute();
        return;
      }

      if (event.code === 'Escape') {
        event.preventDefault();
        this.clearKeys();
        this.callbacks.onEscape();
        return;
      }

      if (event.code === 'KeyI' || event.code === 'Tab') {
        event.preventDefault();
        this.clearKeys();
        this.callbacks.onToggleInventory();
        return;
      }

      if (event.code === 'KeyM') {
        event.preventDefault();
        this.clearKeys();
        this.callbacks.onToggleMap();
        return;
      }

      if (event.code === 'KeyJ') {
        event.preventDefault();
        this.clearKeys();
        this.callbacks.onToggleJournal();
        return;
      }

      if (event.code === 'KeyE' && !this.callbacks.isModalOpen()) {
        event.preventDefault();
        this.clearKeys();
        this.callbacks.onInteract();
        return;
      }

      if (event.code === 'KeyF' && !this.callbacks.isModalOpen()) {
        event.preventDefault();
        this.callbacks.onToggleLantern();
        return;
      }

      if (event.code === 'KeyC' && !this.callbacks.isModalOpen()) {
        event.preventDefault();
        this.callbacks.onToggleStealth();
        return;
      }

      if (event.code === 'KeyT' && !this.callbacks.isModalOpen()) {
        event.preventDefault();
        this.callbacks.onCycleTime();
        return;
      }

      if (event.code === 'KeyP' && !this.callbacks.isModalOpen()) {
        event.preventDefault();
        this.callbacks.onCycleWeather();
        return;
      }

      if (event.code === 'KeyR' && !this.callbacks.isModalOpen()) {
        this.callbacks.onRespawn();
        return;
      }
    }

    // List modal navigation (Inventory, Journal, Quest Board)
    if (this.callbacks.isListModalOpen()) {
      if (event.code === 'ArrowUp' || event.code === 'KeyW') {
        event.preventDefault();
        this.callbacks.onModalNavigate(-1);
        return;
      }
      if (event.code === 'ArrowDown' || event.code === 'KeyS') {
        event.preventDefault();
        this.callbacks.onModalNavigate(1);
        return;
      }
      if (!event.repeat && (event.code === 'Enter' || event.code === 'Space' || event.code === 'KeyE')) {
        event.preventDefault();
        this.callbacks.onModalConfirm();
        return;
      }
      if (!event.repeat) {
        if (event.code === 'Digit1' || event.code === 'Numpad1') {
          event.preventDefault();
          this.callbacks.onModalQuickChoice(0);
          return;
        }
        if (event.code === 'Digit2' || event.code === 'Numpad2') {
          event.preventDefault();
          this.callbacks.onModalQuickChoice(1);
          return;
        }
        if (event.code === 'Digit3' || event.code === 'Numpad3') {
          event.preventDefault();
          this.callbacks.onModalQuickChoice(2);
          return;
        }
        if (event.code === 'Digit4' || event.code === 'Numpad4') {
          event.preventDefault();
          this.callbacks.onModalQuickChoice(3);
          return;
        }
        if (event.code === 'Digit5' || event.code === 'Numpad5') {
          event.preventDefault();
          this.callbacks.onModalQuickChoice(4);
          return;
        }
        if (event.code === 'Digit6' || event.code === 'Numpad6') {
          event.preventDefault();
          this.callbacks.onModalQuickChoice(5);
          return;
        }
      }
      return;
    }

    if (this.callbacks.isMenuOpen()) {
      if (event.code === 'ArrowUp' || event.code === 'KeyW') {
        event.preventDefault();
        this.callbacks.onMenuNavigate(-1);
        return;
      }
      if (event.code === 'ArrowDown' || event.code === 'KeyS') {
        event.preventDefault();
        this.callbacks.onMenuNavigate(1);
        return;
      }
      if (!event.repeat && (event.code === 'Enter' || event.code === 'Space')) {
        event.preventDefault();
        this.callbacks.onMenuConfirm();
        return;
      }
      if (MOVEMENT_KEYS.has(event.code)) {
        event.preventDefault();
      }
      return;
    }

    if (this.callbacks.isModalOpen()) {
      if (MOVEMENT_KEYS.has(event.code)) {
        event.preventDefault();
      }
      return;
    }

    // Melee weapon attack with Spacebar
    if (event.code === 'Space') {
      event.preventDefault();
      if (!event.repeat) {
        this.callbacks.onAttack();
      }
      return;
    }

    if (MOVEMENT_KEYS.has(event.code) || SPRINT_KEYS.has(event.code)) {
      if (MOVEMENT_KEYS.has(event.code)) {
        event.preventDefault();
      }
      if (SPRINT_KEYS.has(event.code) && !event.repeat && !this.pressedKeys.has(event.code)) {
        this.shiftDownTime = performance.now();
        this.shiftUsedForSprint = false;
      }
      this.pressedKeys.add(event.code);
    }
  }

  private handleKeyUp(event: KeyboardEvent): void {
    if (SPRINT_KEYS.has(event.code)) {
      const wasHeld = this.pressedKeys.has(event.code);
      this.pressedKeys.delete(event.code);
      if (
        wasHeld &&
        !this.shiftUsedForSprint &&
        !this.callbacks.isModalOpen() &&
        performance.now() - this.shiftDownTime < 260
      ) {
        this.callbacks.onToggleStealth();
      }
      return;
    }
    if (MOVEMENT_KEYS.has(event.code)) {
      this.pressedKeys.delete(event.code);
    }
  }

  private handleMouseDown(event: MouseEvent): void {
    this.callbacks.onUserGesture();
    if (this.callbacks.isModalOpen()) return;
    if (event.button === 0) {
      event.preventDefault();
      this.callbacks.onAttack(event.clientX, event.clientY);
    } else if (event.button === 2) {
      event.preventDefault();
      this.callbacks.onDash(event.clientX, event.clientY);
    }
  }

  private handleContextMenu(event: MouseEvent): void {
    event.preventDefault();
  }

  private handleWheel(event: WheelEvent): void {
    if (this.callbacks.isModalOpen()) return;
    event.preventDefault();
    if (event.deltaY === 0) return;

    const direction = event.deltaY < 0 ? 1 : -1;
    const magnitude = Math.min(Math.abs(event.deltaY) / 100, 1.5);
    const steps = direction * Math.max(0.35, magnitude);
    this.callbacks.onZoom(steps);
  }

  public clearKeys(): void {
    this.pressedKeys.clear();
    this.shiftUsedForSprint = false;
  }

  public isSprintHeld(): boolean {
    const shiftHeld = this.pressedKeys.has('ShiftLeft') || this.pressedKeys.has('ShiftRight');
    if (!shiftHeld) return false;
    let movingHeld = false;
    for (const k of MOVEMENT_KEYS) {
      if (this.pressedKeys.has(k)) {
        movingHeld = true;
        break;
      }
    }
    if (movingHeld && performance.now() - this.shiftDownTime >= 160) {
      this.shiftUsedForSprint = true;
      return true;
    }
    return false;
  }

  /**
   * Returns a normalized 2D movement vector (length 0 or 1),
   * ensuring diagonal speed matches cardinal speed.
   */
  public getMovementVector(): Vec2 {
    let x = 0;
    let y = 0;

    if (this.pressedKeys.has('KeyA') || this.pressedKeys.has('ArrowLeft')) x -= 1;
    if (this.pressedKeys.has('KeyD') || this.pressedKeys.has('ArrowRight')) x += 1;
    if (this.pressedKeys.has('KeyW') || this.pressedKeys.has('ArrowUp')) y -= 1;
    if (this.pressedKeys.has('KeyS') || this.pressedKeys.has('ArrowDown')) y += 1;

    if (x !== 0 && y !== 0) {
      const invLen = 1 / Math.hypot(x, y);
      x *= invLen;
      y *= invLen;
    }

    return { x, y };
  }

  public dispose(): void {
    window.removeEventListener('keydown', this.handleKeyDownBound);
    window.removeEventListener('keyup', this.handleKeyUpBound);
    window.removeEventListener('blur', this.handleBlurBound);
    this.targetElement.removeEventListener('wheel', this.handleWheelBound);
    this.targetElement.removeEventListener('mousedown', this.handleMouseDownBound);
    this.targetElement.removeEventListener('contextmenu', this.handleContextMenuBound);
  }
}
