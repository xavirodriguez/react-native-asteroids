import { useEffect, useRef } from "react";
import { GameLoop } from "@tiny-aster/core";

/**
 * Hook to manage a game loop within a React component.
 *
 * @param loop - The GameLoop instance to manage.
 * @param onUpdate - Optional callback for each update tick.
 * @param onRender - Optional callback for each render frame.
 */
export function useGameLoop(
  loop: GameLoop | null,
  onUpdate?: (dt: number) => void,
  onRender?: (alpha: number) => void
) {
  const onUpdateRef = useRef(onUpdate);
  const onRenderRef = useRef(onRender);

  useEffect(() => {
    onUpdateRef.current = onUpdate;
    onRenderRef.current = onRender;
  }, [onUpdate, onRender]);

  useEffect(() => {
    if (!loop) return;

    const unsubUpdate = loop.subscribeUpdate((dt: number) => {
      onUpdateRef.current?.(dt);
    });

    const unsubRender = loop.subscribeRender((alpha: number) => {
      onRenderRef.current?.(alpha);
    });

    return () => {
      unsubUpdate();
      unsubRender();
    };
  }, [loop]);
}
