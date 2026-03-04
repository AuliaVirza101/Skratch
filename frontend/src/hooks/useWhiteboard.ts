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
    const { canvasElId, ownerId, onObjectAdded, onObjectModified, onObjectRemoved } = options;

    const canvasRef = useRef<fabric.Canvas | null>(null);
    const callbacksRef = useRef(options);
    callbacksRef.current = options;

    const [activeTool, setActiveTool] = useState<DrawingTool>('freehand');
    const [brushColor, setBrushColor] = useState('#FFFFFF');
    const [brushSize, setBrushSize] = useState(3);
    const [brushOpacity, setBrushOpacity] = useState(1);
    const [objectCount, setObjectCount] = useState(0);

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
    // Panning state
    const panRef = useRef<{
        isPanning: boolean;
        lastX: number;
        lastY: number;
        spaceDown: boolean;
    }>({
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

        // Handle window resize
        const handleResize = () => {
            if (!parent) return;
            canvas.setDimensions({
                width: parent.clientWidth,
                height: parent.clientHeight,
            });
            canvas.renderAll();
        };
        window.addEventListener('resize', handleResize);

        // Handle zoom
        const handleWheel = (opt: fabric.TEvent<WheelEvent>) => {
            const e = opt.e;
            e.preventDefault();
            e.stopPropagation();

            const delta = e.deltaY;
            let zoom = canvas.getZoom();
            zoom *= 0.999 ** delta;
            zoom = Math.max(DEFAULTS.ZOOM_MIN, Math.min(DEFAULTS.ZOOM_MAX, zoom));

            canvas.zoomToPoint(new fabric.Point(e.offsetX, e.offsetY), zoom);
            canvas.renderAll();
        };
        canvas.on('mouse:wheel', handleWheel);

        // Handle keyboard for panning
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
                // Restore tool state
                updateToolMode(canvas, activeTool);
            }
        };

        document.addEventListener('keydown', handleKeyDown);
        document.addEventListener('keyup', handleKeyUp);

        // Pan with mouse when space is held
        canvas.on('mouse:down', (opt) => {
            if (panRef.current.spaceDown) {
                const e = opt.e as MouseEvent;
                panRef.current.isPanning = true;
                panRef.current.lastX = e.clientX;
                panRef.current.lastY = e.clientY;
                canvas.defaultCursor = 'grabbing';
            }
        });

        canvas.on('mouse:move', (opt) => {
            if (panRef.current.isPanning) {
                const e = opt.e as MouseEvent;
                const vpt = canvas.viewportTransform;
                if (!vpt) return;
                vpt[4] += e.clientX - panRef.current.lastX;
                vpt[5] += e.clientY - panRef.current.lastY;
                panRef.current.lastX = e.clientX;
                panRef.current.lastY = e.clientY;
                canvas.requestRenderAll();
            }
        });

        canvas.on('mouse:up', () => {
            if (panRef.current.isPanning) {
                panRef.current.isPanning = false;
                canvas.defaultCursor = panRef.current.spaceDown ? 'grab' : 'default';
            }
        });

        // Listen for freehand path creation
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

        // Listen for object modifications (move, resize)
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
        // fabric.js PencilBrush doesn't have opacity on brush directly
        // We handle opacity via globalCompositeOperation or stroke opacity
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
            canvas.defaultCursor = 'not-allowed';
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
