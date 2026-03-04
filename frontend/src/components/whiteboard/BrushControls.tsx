'use client';

import { PRESET_COLORS, DEFAULTS } from '@skratch/shared';

interface BrushControlsProps {
    color: string;
    size: number;
    opacity: number;
    onColorChange: (color: string) => void;
    onSizeChange: (size: number) => void;
    onOpacityChange: (opacity: number) => void;
}

export default function BrushControls({
    color,
    size,
    opacity,
    onColorChange,
    onSizeChange,
    onOpacityChange,
}: BrushControlsProps) {
    return (
        <div className="brush-panel" id="brush-panel">
            <div className="brush-panel-title">Color</div>
            <div className="color-grid">
                {PRESET_COLORS.map((c) => (
                    <button
                        key={c}
                        className={`color-swatch ${color === c ? 'active' : ''}`}
                        style={{ backgroundColor: c }}
                        onClick={() => onColorChange(c)}
                        title={c}
                    />
                ))}
            </div>

            <div className="slider-group">
                <div className="slider-label">
                    <span>Size</span>
                    <span>{size}px</span>
                </div>
                <input
                    id="brush-size-slider"
                    type="range"
                    className="slider-input"
                    min={DEFAULTS.BRUSH_SIZE_MIN}
                    max={DEFAULTS.BRUSH_SIZE_MAX}
                    value={size}
                    onChange={(e) => onSizeChange(Number(e.target.value))}
                />
            </div>

            <div className="slider-group">
                <div className="slider-label">
                    <span>Opacity</span>
                    <span>{Math.round(opacity * 100)}%</span>
                </div>
                <input
                    id="brush-opacity-slider"
                    type="range"
                    className="slider-input"
                    min={DEFAULTS.BRUSH_OPACITY_MIN * 100}
                    max={DEFAULTS.BRUSH_OPACITY_MAX * 100}
                    value={opacity * 100}
                    onChange={(e) => onOpacityChange(Number(e.target.value) / 100)}
                />
            </div>
        </div>
    );
}
