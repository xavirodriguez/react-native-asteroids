export type TouchPhase = 'began' | 'moved' | 'ended' | 'cancelled';

export interface TouchPoint {
  id: number;
  x: number;
  y: number;
  phase: TouchPhase;
  timestamp: number;
}

export type GestureType = 'tap' | 'swipe' | 'pinch' | 'hold';

export interface GestureEvent {
  type: GestureType;
  position: { x: number; y: number };
  direction?: { x: number; y: number }; // normalized for swipe
  scale?: number; // for pinch
  duration?: number; // in ms for hold
}
