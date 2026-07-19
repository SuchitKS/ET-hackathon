import { useCallback, useRef, useState } from "react";

export interface Transform {
  x: number;
  y: number;
  scale: number;
}

const MIN_SCALE = 0.35;
const MAX_SCALE = 2.2;

export function usePanZoom(initial: Transform) {
  const [transform, setTransform] = useState<Transform>(initial);
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
    setTransform((t) => ({ ...t, x: dragging.current!.origX + dx, y: dragging.current!.origY + dy }));
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
    setTransform((t) => ({ ...t, scale: clamp(t.scale * factor, MIN_SCALE, MAX_SCALE) }));
  }, []);

  const reset = useCallback(() => setTransform(initial), [initial]);

  return { transform, onPointerDown, onPointerMove, onPointerUp, onWheel, zoomBy, reset, setTransform };
}

function clamp(v: number, min: number, max: number) {
  return Math.max(min, Math.min(max, v));
}
