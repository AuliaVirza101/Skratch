'use client';

import { useRef, useCallback } from 'react';
import { DEFAULTS } from '@skratch/shared';

interface UndoAction {
    type: 'add' | 'remove' | 'modify';
    objectId: string;
    data?: Record<string, unknown>;          // for add/modify: the serialized object data
    previousData?: Record<string, unknown>;  // for modify: the data before modification
}

interface UseUndoRedoOptions {
    onUndo?: (action: UndoAction) => void;
    onRedo?: (action: UndoAction) => void;
}

export function useUndoRedo(options: UseUndoRedoOptions = {}) {
    const undoStack = useRef<UndoAction[]>([]);
    const redoStack = useRef<UndoAction[]>([]);

    const pushAction = useCallback((action: UndoAction) => {
        undoStack.current.push(action);
        // Limit stack size
        if (undoStack.current.length > DEFAULTS.MAX_UNDO_STEPS) {
            undoStack.current.shift();
        }
        // Clear redo stack when a new action is performed
        redoStack.current = [];
    }, []);

    const undo = useCallback((): UndoAction | null => {
        const action = undoStack.current.pop();
        if (!action) return null;

        redoStack.current.push(action);
        options.onUndo?.(action);
        return action;
    }, [options]);

    const redo = useCallback((): UndoAction | null => {
        const action = redoStack.current.pop();
        if (!action) return null;

        undoStack.current.push(action);
        options.onRedo?.(action);
        return action;
    }, [options]);

    const canUndo = useCallback(() => undoStack.current.length > 0, []);
    const canRedo = useCallback(() => redoStack.current.length > 0, []);

    const clear = useCallback(() => {
        undoStack.current = [];
        redoStack.current = [];
    }, []);

    return {
        pushAction,
        undo,
        redo,
        canUndo,
        canRedo,
        clear,
    };
}

export type { UndoAction };
