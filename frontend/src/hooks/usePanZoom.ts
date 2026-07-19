import { useCallback, useRef, useState } from "react";

export interface Transform {
  x: number;
  y: number;
  scale: number;
}

const MIN_SCALE = 0.35;
const MAX_SCALE = 2.2;

export function usePanZoom(initial: Transform) {
  const safeInitial = {
    x: Number.isFinite(initial.x) ? initial.x : 0,
    y: Number.isFinite(initial.y) ? initial.y : 0,
    scale: Number.isFinite(initial.scale) && initial.scale > 0 ? initial.scale : 1,
  };
  const [transform, setTransform] = useState<Transform>(safeInitial);
  const dragging = useRef<{ startX: number; startY: number; origX: number; origY: number } | null>(null);

  const onPointerDown = useCallback(
    (e: React.PointerEvent) => {
      (e.target as Element).setPointerCapture?.(e.pointerId);
      dragging.current = { startX: e.clientX, startY: e.clientY, origX: transform.x, origY: transform.y };
    },
    [transform]
  );

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    if (!dragging.current) return;
    const dx = e.clientX - dragging.current.startX;
    const dy = e.clientY - dragging.current.startY;
    const safeX = Number.isFinite(dragging.current!.origX + dx) ? dragging.current!.origX + dx : 0;
    const safeY = Number.isFinite(dragging.current!.origY + dy) ? dragging.current!.origY + dy : 0;
    setTransform((t) => ({ ...t, x: safeX, y: safeY }));
  }, []);

  const onPointerUp = useCallback(() => {
    dragging.current = null;
  }, []);

  const onWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    setTransform((t) => {
      const next = clamp(t.scale * (1 - e.deltaY * 0.001), MIN_SCALE, MAX_SCALE);
      return { ...t, scale: next };
    });
  }, []);

  const zoomBy = useCallback((factor: number) => {
    setTransform((t) => {
      let next = t.scale * factor;
      if (!Number.isFinite(next)) next = 1;
      return { ...t, scale: clamp(next, MIN_SCALE, MAX_SCALE) };
    });
  }, []);

  const safeSetTransform = useCallback((updater: Transform | ((prev: Transform) => Transform)) => {
    setTransform((prev) => {
      const next = typeof updater === "function" ? updater(prev) : updater;
      return {
        x: Number.isFinite(next.x) ? next.x : 0,
        y: Number.isFinite(next.y) ? next.y : 0,
        scale: Number.isFinite(next.scale) && next.scale > 0 ? clamp(next.scale, MIN_SCALE, MAX_SCALE) : 1,
      };
    });
  }, []);

  const reset = useCallback(() => setTransform(safeInitial), [safeInitial]);

  return { transform, onPointerDown, onPointerMove, onPointerUp, onWheel, zoomBy, reset, setTransform: safeSetTransform };
}

function clamp(v: number, min: number, max: number) {
  return Math.max(min, Math.min(max, v));
}
