/**
 * useKeyboardShortcuts - Hook for workflow editor keyboard shortcuts
 */

import { useEffect, useCallback } from 'react';

interface KeyboardShortcutHandlers {
  onSave?: () => void;
  onUndo?: () => void;
  onRedo?: () => void;
  onDelete?: () => void;
  onDuplicate?: () => void;
  onCopy?: () => void;
  onPaste?: () => void;
  onCut?: () => void;
  onSelectAll?: () => void;
  onEscape?: () => void;
  onRun?: () => void;
  onZoomIn?: () => void;
  onZoomOut?: () => void;
  onFitView?: () => void;
}

export function useKeyboardShortcuts(
  handlers: KeyboardShortcutHandlers,
  enabled: boolean = true
) {
  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (!enabled) return;

    // Don't trigger shortcuts when typing in inputs
    const target = event.target as HTMLElement;
    if (
      target.tagName === 'INPUT' ||
      target.tagName === 'TEXTAREA' ||
      target.isContentEditable
    ) {
      // Allow Escape in inputs
      if (event.key !== 'Escape') {
        return;
      }
    }

    const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
    const ctrlKey = isMac ? event.metaKey : event.ctrlKey;
    const shiftKey = event.shiftKey;

    // Ctrl+S - Save
    if (ctrlKey && event.key === 's') {
      event.preventDefault();
      handlers.onSave?.();
      return;
    }

    // Ctrl+Z - Undo
    if (ctrlKey && !shiftKey && event.key === 'z') {
      event.preventDefault();
      handlers.onUndo?.();
      return;
    }

    // Ctrl+Shift+Z or Ctrl+Y - Redo
    if ((ctrlKey && shiftKey && event.key === 'z') || (ctrlKey && event.key === 'y')) {
      event.preventDefault();
      handlers.onRedo?.();
      return;
    }

    // Delete or Backspace - Delete selected
    if (event.key === 'Delete' || event.key === 'Backspace') {
      // Only if not in an input
      if (target.tagName !== 'INPUT' && target.tagName !== 'TEXTAREA') {
        event.preventDefault();
        handlers.onDelete?.();
        return;
      }
    }

    // Ctrl+D - Duplicate
    if (ctrlKey && event.key === 'd') {
      event.preventDefault();
      handlers.onDuplicate?.();
      return;
    }

    // Ctrl+C - Copy
    if (ctrlKey && event.key === 'c') {
      event.preventDefault();
      handlers.onCopy?.();
      return;
    }

    // Ctrl+V - Paste
    if (ctrlKey && event.key === 'v') {
      event.preventDefault();
      handlers.onPaste?.();
      return;
    }

    // Ctrl+X - Cut
    if (ctrlKey && event.key === 'x') {
      event.preventDefault();
      handlers.onCut?.();
      return;
    }

    // Ctrl+A - Select All
    if (ctrlKey && event.key === 'a') {
      event.preventDefault();
      handlers.onSelectAll?.();
      return;
    }

    // Escape - Deselect
    if (event.key === 'Escape') {
      event.preventDefault();
      handlers.onEscape?.();
      return;
    }

    // F5 or Ctrl+Enter - Run
    if (event.key === 'F5' || (ctrlKey && event.key === 'Enter')) {
      event.preventDefault();
      handlers.onRun?.();
      return;
    }

    // Ctrl+Plus - Zoom In
    if (ctrlKey && (event.key === '+' || event.key === '=')) {
      event.preventDefault();
      handlers.onZoomIn?.();
      return;
    }

    // Ctrl+Minus - Zoom Out
    if (ctrlKey && event.key === '-') {
      event.preventDefault();
      handlers.onZoomOut?.();
      return;
    }

    // Ctrl+0 - Fit View
    if (ctrlKey && event.key === '0') {
      event.preventDefault();
      handlers.onFitView?.();
      return;
    }
  }, [enabled, handlers]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleKeyDown]);
}

// Keyboard shortcuts help text
export const KEYBOARD_SHORTCUTS = [
  { keys: 'Ctrl+S', description: 'Save workflow' },
  { keys: 'Ctrl+Z', description: 'Undo' },
  { keys: 'Ctrl+Shift+Z', description: 'Redo' },
  { keys: 'Delete', description: 'Delete selected' },
  { keys: 'Ctrl+D', description: 'Duplicate' },
  { keys: 'Ctrl+C', description: 'Copy' },
  { keys: 'Ctrl+V', description: 'Paste' },
  { keys: 'Ctrl+X', description: 'Cut' },
  { keys: 'Ctrl+A', description: 'Select all' },
  { keys: 'Escape', description: 'Deselect all' },
  { keys: 'F5', description: 'Run workflow' },
  { keys: 'Ctrl++', description: 'Zoom in' },
  { keys: 'Ctrl+-', description: 'Zoom out' },
  { keys: 'Ctrl+0', description: 'Fit to view' },
];

export default useKeyboardShortcuts;
