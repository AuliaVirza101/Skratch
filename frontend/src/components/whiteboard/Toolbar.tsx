'use client';

import {
    MousePointer2,
    Pencil,
    Square,
    Circle,
    Minus,
    Type,
    Eraser,
    Trash2,
} from 'lucide-react';
import { DrawingTool, SHORTCUTS } from '@skratch/shared';

interface ToolbarProps {
    activeTool: DrawingTool;
    onToolChange: (tool: DrawingTool) => void;
    onClear: () => void;
}

const TOOLS: { tool: DrawingTool; icon: React.ReactNode; label: string; shortcut: string }[] = [
    { tool: 'select', icon: <MousePointer2 size={18} />, label: 'Select', shortcut: 'V' },
    { tool: 'freehand', icon: <Pencil size={18} />, label: 'Pen', shortcut: 'P' },
    { tool: 'rectangle', icon: <Square size={18} />, label: 'Rectangle', shortcut: 'R' },
    { tool: 'circle', icon: <Circle size={18} />, label: 'Circle', shortcut: 'C' },
    { tool: 'line', icon: <Minus size={18} />, label: 'Line', shortcut: 'L' },
    { tool: 'text', icon: <Type size={18} />, label: 'Text', shortcut: 'T' },
    { tool: 'eraser', icon: <Eraser size={18} />, label: 'Eraser', shortcut: 'E' },
];

export default function Toolbar({ activeTool, onToolChange, onClear }: ToolbarProps) {
    return (
        <div className="toolbar" id="toolbar">
            {TOOLS.map((t) => (
                <button
                    key={t.tool}
                    id={`tool-${t.tool}`}
                    className={`toolbar-btn ${activeTool === t.tool ? 'active' : ''}`}
                    onClick={() => onToolChange(t.tool)}
                    title={`${t.label} (${t.shortcut})`}
                >
                    {t.icon}
                    <span className="shortcut-hint">{t.shortcut}</span>
                </button>
            ))}
            <div className="toolbar-separator" />
            <button
                id="tool-clear"
                className="toolbar-btn"
                onClick={onClear}
                title="Clear Canvas"
                style={{ color: 'var(--error)' }}
            >
                <Trash2 size={18} />
            </button>
        </div>
    );
}
