'use client';

import { useEffect, useRef, useCallback, useState } from 'react';
import * as fabric from 'fabric';
import { v4 as uuidv4 } from 'uuid';
import { DrawingTool, WhiteboardObject, DEFAULTS } from '@skratch/shared';

interface UseWhiteboardOptions {
    canvasElId: string;
    ownerId: string;
    onObjectAdded?: (objectId: string, ownerId: string, data: Record<string, unknown>) => void;
    onObjectModified?: (objectId: string, data: Partial<Record<string, unknown>>) => void;
    onObjectRemoved?: (objectId: string) => void;
}

export function useWhiteboard(options: UseWhiteboardOptions) {
    const { canvasElId, ownerId } = options;

    const canvasRef = useRef<fabric.Canvas | null>(null);
    const callbacksRef = useRef(options);
    callbacksRef.current = options;

    const [activeTool, setActiveToolState] = useState<DrawingTool>('freehand');
    const activeToolRef = useRef<DrawingTool>('freehand');
    const [brushColor, setBrushColorState] = useState('#FFFFFF');
    const brushColorRef = useRef('#FFFFFF');
    const [brushSize, setBrushSizeState] = useState(3);
    const brushSizeRef = useRef(3);
    const [brushOpacity, setBrushOpacity] = useState(1);
    const [objectCount, setObjectCount] = useState(0);

    // Wrapper setters that sync ref + state
    const setActiveTool = useCallback((tool: DrawingTool) => {
        activeToolRef.current = tool;
        setActiveToolState(tool);
    }, []);

    const setBrushColor = useCallback((color: string) => {
        brushColorRef.current = color;
        setBrushColorState(color);
    }, []);

    const setBrushSize = useCallback((size: number) => {
        brushSizeRef.current = size;
        setBrushSizeState(size);
    }, []);

    // Track if the event is from remote (skip emitting)
    const isRemoteRef = useRef(false);
    // Track drawing state for shape tools
    const drawingRef = useRef<{
        isDrawing: boolean;
        startX: number;
        startY: number;
        shape: fabric.FabricObject | null;
        objectId: string;
    }>({
        isDrawing: false,
        startX: 0,
        startY: 0,
        shape: null,
        objectId: '',
    });
    // Panning
    const panRef = useRef({
        isPanning: false,
        lastX: 0,
        lastY: 0,
        spaceDown: false,
    });

    // Initialize canvas
    useEffect(() => {
        const el = document.getElementById(canvasElId) as HTMLCanvasElement;
        if (!el) return;

        const parent = el.parentElement;
        if (!parent) return;

        const canvas = new fabric.Canvas(el, {
            width: parent.clientWidth,
            height: parent.clientHeight,
            backgroundColor: '#12121a',
            isDrawingMode: true,
            selection: false,
        });

        canvas.freeDrawingBrush = new fabric.PencilBrush(canvas);
        canvas.freeDrawingBrush.color = '#FFFFFF';
        canvas.freeDrawingBrush.width = 3;

        canvasRef.current = canvas;

        // --- Resize ---
        const handleResize = () => {
            canvas.setDimensions({
                width: parent.clientWidth,
                height: parent.clientHeight,
            });
            canvas.renderAll();
        };
        window.addEventListener('resize', handleResize);

        // --- Zoom ---
        canvas.on('mouse:wheel', (opt: fabric.TEvent<WheelEvent>) => {
            const e = opt.e;
            e.preventDefault();
            e.stopPropagation();
            const delta = e.deltaY;
            let zoom = canvas.getZoom();
            zoom *= 0.999 ** delta;
            zoom = Math.max(DEFAULTS.ZOOM_MIN, Math.min(DEFAULTS.ZOOM_MAX, zoom));
            canvas.zoomToPoint(new fabric.Point(e.offsetX, e.offsetY), zoom);
            canvas.renderAll();
        });

        // --- Keyboard: pan with space ---
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.code === 'Space' && !panRef.current.spaceDown) {
                panRef.current.spaceDown = true;
                canvas.isDrawingMode = false;
                canvas.selection = false;
                canvas.defaultCursor = 'grab';
                canvas.renderAll();
            }
        };

        const handleKeyUp = (e: KeyboardEvent) => {
            if (e.code === 'Space') {
                panRef.current.spaceDown = false;
                panRef.current.isPanning = false;
                updateToolMode(canvas, activeToolRef.current);
            }
        };

        document.addEventListener('keydown', handleKeyDown);
        document.addEventListener('keyup', handleKeyUp);

        // --- Mouse events: pan, shape drawing, eraser ---
        canvas.on('mouse:down', (opt) => {
            const e = opt.e as MouseEvent;
            const pointer = canvas.getScenePoint(e);

            // Panning
            if (panRef.current.spaceDown) {
                panRef.current.isPanning = true;
                panRef.current.lastX = e.clientX;
                panRef.current.lastY = e.clientY;
                canvas.defaultCursor = 'grabbing';
                return;
            }

            const tool = activeToolRef.current;

            // Eraser: remove clicked object
            if (tool === 'eraser') {
                const target = canvas.findTarget(e);
                if (target && (target as any).objectId) {
                    const objId = (target as any).objectId;
                    canvas.remove(target);
                    canvas.renderAll();
                    setObjectCount(canvas.getObjects().length);
                    callbacksRef.current.onObjectRemoved?.(objId);
                }
                return;
            }

            // Text: place IText at click point
            if (tool === 'text') {
                const objId = uuidv4();
                const text = new fabric.IText('Text', {
                    left: pointer.x,
                    top: pointer.y,
                    fontSize: brushSizeRef.current * 5 + 10,
                    fill: brushColorRef.current,
                    fontFamily: 'system-ui, sans-serif',
                });
                (text as any).objectId = objId;
                (text as any).ownerId = ownerId;
                canvas.add(text);
                canvas.setActiveObject(text);
                text.enterEditing();
                canvas.renderAll();
                setObjectCount(canvas.getObjects().length);

                // Emit after exiting editing
                text.on('editing:exited', () => {
                    const data = (text as any).toObject(['objectId', 'ownerId']);
                    callbacksRef.current.onObjectAdded?.(objId, ownerId, data as Record<string, unknown>);
                });
                return;
            }

            // Shape tools: start drawing
            if (['rectangle', 'circle', 'line'].includes(tool)) {
                drawingRef.current.isDrawing = true;
                drawingRef.current.startX = pointer.x;
                drawingRef.current.startY = pointer.y;
                drawingRef.current.objectId = uuidv4();

                let shape: fabric.FabricObject | null = null;
                const color = brushColorRef.current;
                const strokeWidth = brushSizeRef.current;

                if (tool === 'rectangle') {
                    shape = new fabric.Rect({
                        left: pointer.x,
                        top: pointer.y,
                        width: 0,
                        height: 0,
                        fill: 'transparent',
                        stroke: color,
                        strokeWidth,
                    });
                } else if (tool === 'circle') {
                    shape = new fabric.Ellipse({
                        left: pointer.x,
                        top: pointer.y,
                        rx: 0,
                        ry: 0,
                        fill: 'transparent',
                        stroke: color,
                        strokeWidth,
                    });
                } else if (tool === 'line') {
                    shape = new fabric.Line([pointer.x, pointer.y, pointer.x, pointer.y], {
                        stroke: color,
                        strokeWidth,
                    });
                }

                if (shape) {
                    (shape as any).objectId = drawingRef.current.objectId;
                    (shape as any).ownerId = ownerId;
                    canvas.add(shape);
                    drawingRef.current.shape = shape;
                    canvas.renderAll();
                }
            }
        });

        canvas.on('mouse:move', (opt) => {
            const e = opt.e as MouseEvent;

            // Panning
            if (panRef.current.isPanning) {
                const vpt = canvas.viewportTransform;
                if (!vpt) return;
                vpt[4] += e.clientX - panRef.current.lastX;
                vpt[5] += e.clientY - panRef.current.lastY;
                panRef.current.lastX = e.clientX;
                panRef.current.lastY = e.clientY;
                canvas.requestRenderAll();
                return;
            }

            // Shape drawing
            if (!drawingRef.current.isDrawing || !drawingRef.current.shape) return;

            const pointer = canvas.getScenePoint(e);
            const { startX, startY, shape } = drawingRef.current;
            const tool = activeToolRef.current;

            if (tool === 'rectangle') {
                const rect = shape as fabric.Rect;
                const w = pointer.x - startX;
                const h = pointer.y - startY;
                rect.set({
                    left: w < 0 ? pointer.x : startX,
                    top: h < 0 ? pointer.y : startY,
                    width: Math.abs(w),
                    height: Math.abs(h),
                });
            } else if (tool === 'circle') {
                const ellipse = shape as fabric.Ellipse;
                const rx = Math.abs(pointer.x - startX) / 2;
                const ry = Math.abs(pointer.y - startY) / 2;
                ellipse.set({
                    left: Math.min(pointer.x, startX),
                    top: Math.min(pointer.y, startY),
                    rx,
                    ry,
                });
            } else if (tool === 'line') {
                const line = shape as fabric.Line;
                line.set({ x2: pointer.x, y2: pointer.y });
            }

            canvas.renderAll();
        });

        canvas.on('mouse:up', () => {
            // Pan end
            if (panRef.current.isPanning) {
                panRef.current.isPanning = false;
                canvas.defaultCursor = panRef.current.spaceDown ? 'grab' : 'default';
                return;
            }

            // Shape end
            if (drawingRef.current.isDrawing && drawingRef.current.shape) {
                const shape = drawingRef.current.shape;
                shape.setCoords();
                canvas.renderAll();
                setObjectCount(canvas.getObjects().length);

                const objId = drawingRef.current.objectId;
                const data = (shape as any).toObject(['objectId', 'ownerId']);
                callbacksRef.current.onObjectAdded?.(objId, ownerId, data as Record<string, unknown>);

                drawingRef.current.isDrawing = false;
                drawingRef.current.shape = null;
            }
        });

        // --- Freehand path creation ---
        canvas.on('path:created', (opt: { path: fabric.Path }) => {
            if (isRemoteRef.current) return;
            const path = opt.path;
            const objId = uuidv4();
            (path as any).objectId = objId;
            (path as any).ownerId = ownerId;
            setObjectCount((c) => c + 1);
            const data = (path as any).toObject(['objectId', 'ownerId']);
            callbacksRef.current.onObjectAdded?.(objId, ownerId, data as Record<string, unknown>);
        });

        // --- Object modifications (move, resize) ---
        canvas.on('object:modified', (opt) => {
            if (isRemoteRef.current) return;
            const obj = opt.target;
            if (!obj || !(obj as any).objectId) return;
            const data = (obj as any).toObject(['objectId', 'ownerId']);
            callbacksRef.current.onObjectModified?.((obj as any).objectId, data as Partial<Record<string, unknown>>);
        });

        return () => {
            window.removeEventListener('resize', handleResize);
            document.removeEventListener('keydown', handleKeyDown);
            document.removeEventListener('keyup', handleKeyUp);
            canvas.dispose();
            canvasRef.current = null;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [canvasElId, ownerId]);

    // Update brush properties when they change
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas || !canvas.freeDrawingBrush) return;
        canvas.freeDrawingBrush.color = brushColor;
        canvas.freeDrawingBrush.width = brushSize;
    }, [brushColor, brushSize, brushOpacity]);

    // Update tool mode when activeTool changes
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        updateToolMode(canvas, activeTool);
    }, [activeTool]);

    // --- Public methods ---

    const addRemoteObject = useCallback((data: Record<string, unknown>) => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        isRemoteRef.current = true;
        fabric.util.enlivenObjects([data]).then((objects: any[]) => {
            objects.forEach((obj) => {
                canvas.add(obj);
            });
            canvas.renderAll();
            setObjectCount(canvas.getObjects().length);
            isRemoteRef.current = false;
        });
    }, []);

    const updateRemoteObject = useCallback((objectId: string, data: Partial<Record<string, unknown>>) => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        isRemoteRef.current = true;
        const objects = canvas.getObjects();
        const target = objects.find((o) => (o as any).objectId === objectId);
        if (target) {
            target.set(data as Partial<fabric.FabricObject>);
            target.setCoords();
            canvas.renderAll();
        }
        isRemoteRef.current = false;
    }, []);

    const removeRemoteObject = useCallback((objectId: string) => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        isRemoteRef.current = true;
        const objects = canvas.getObjects();
        const target = objects.find((o) => (o as any).objectId === objectId);
        if (target) {
            canvas.remove(target);
            canvas.renderAll();
            setObjectCount(canvas.getObjects().length);
        }
        isRemoteRef.current = false;
    }, []);

    const loadObjects = useCallback((objects: WhiteboardObject[]) => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        isRemoteRef.current = true;
        const dataList = objects.map((o) => o.data);

        if (dataList.length === 0) {
            isRemoteRef.current = false;
            return;
        }

        fabric.util.enlivenObjects(dataList).then((enlivened: any[]) => {
            enlivened.forEach((obj) => {
                canvas.add(obj);
            });
            canvas.renderAll();
            setObjectCount(canvas.getObjects().length);
            isRemoteRef.current = false;
        });
    }, []);

    const clearCanvas = useCallback(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        canvas.clear();
        canvas.backgroundColor = '#12121a';
        canvas.renderAll();
        setObjectCount(0);
    }, []);

    const removeObjectById = useCallback((objectId: string) => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const objects = canvas.getObjects();
        const target = objects.find((o) => (o as any).objectId === objectId);
        if (target) {
            canvas.remove(target);
            canvas.renderAll();
            setObjectCount(canvas.getObjects().length);
            callbacksRef.current.onObjectRemoved?.(objectId);
        }
    }, []);

    const getCanvasElement = useCallback(() => canvasRef.current, []);

    // Export canvas to PNG data URL
    const exportToPNG = useCallback((): string | null => {
        const canvas = canvasRef.current;
        if (!canvas) return null;
        return canvas.toDataURL({ format: 'png', quality: 1, multiplier: 2 } as any);
    }, []);

    return {
        canvas: canvasRef,
        activeTool,
        setActiveTool,
        brushColor,
        setBrushColor,
        brushSize,
        setBrushSize,
        brushOpacity,
        setBrushOpacity,
        objectCount,
        addRemoteObject,
        updateRemoteObject,
        removeRemoteObject,
        loadObjects,
        clearCanvas,
        removeObjectById,
        getCanvasElement,
        exportToPNG,
    };
}

// --- Helpers ---

function updateToolMode(canvas: fabric.Canvas, tool: DrawingTool) {
    switch (tool) {
        case 'freehand':
            canvas.isDrawingMode = true;
            canvas.selection = false;
            canvas.defaultCursor = 'crosshair';
            break;
        case 'select':
            canvas.isDrawingMode = false;
            canvas.selection = true;
            canvas.defaultCursor = 'default';
            break;
        case 'eraser':
            canvas.isDrawingMode = false;
            canvas.selection = false;
            canvas.defaultCursor = 'crosshair';
            break;
        case 'rectangle':
        case 'circle':
        case 'line':
        case 'text':
            canvas.isDrawingMode = false;
            canvas.selection = false;
            canvas.defaultCursor = 'crosshair';
            break;
        default:
            canvas.isDrawingMode = false;
            canvas.selection = false;
            canvas.defaultCursor = 'default';
    }
    canvas.renderAll();
}
