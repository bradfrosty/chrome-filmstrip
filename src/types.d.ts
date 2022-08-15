// Profile event schema
// https://docs.google.com/document/d/1CvAClvFfyA5R-PhYUmn5OOQtYMH4h6I0nSsKchNAySU/edit#heading=h.lc5airzennvk
type EventType = 'B' | 'E' | 'X' | 'i' | 'C' | 'b' | 'n' | 'e' | 's' | 't' | 'f' | 'P' | 'N' | 'O' | 'D' | 'M' | 'V' | 'v' | 'R' | 'c';

interface ProfileEvent {
  args: Record<string, any>;
  cat: string;
  name: string;
  ph: EventType;
  pid: number;
  tid: number;
  ts: number;
}

interface Frame {
  durationMs: number;
  totalMs: number;
  data: Uint8Array;
}