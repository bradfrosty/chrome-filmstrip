interface Options {
	input: string[];
	output: string;
	debug?: boolean;
	speed?: number;
	size?: number;
}

interface ResolvedOptions {
	profiles: Profile[];
	output: string;
	format: string;
	debug: boolean;
	speed: number;
	size: number;
	fontSize: number;
	padding: {
		x: number;
		y: number;
	};
}

// Profile event schema
// https://docs.google.com/document/d/1CvAClvFfyA5R-PhYUmn5OOQtYMH4h6I0nSsKchNAySU/edit#heading=h.lc5airzennvk
type EventType =
	| 'B'
	| 'E'
	| 'X'
	| 'i'
	| 'C'
	| 'b'
	| 'n'
	| 'e'
	| 's'
	| 't'
	| 'f'
	| 'P'
	| 'N'
	| 'O'
	| 'D'
	| 'M'
	| 'V'
	| 'v'
	| 'R'
	| 'c';

interface ProfileEvent {
	args: Record<string, any>;
	cat: string;
	name: string;
	ph: EventType;
	pid: number;
	tid: number;
	ts: number;
}

type Profile = ProfileEvent[];

interface Frame {
	durationMs: number;
	totalMs: number;
	data: Uint8Array;
}

interface Metric {
	ts: number;
	value: number;
}

interface LargestContentfulPaint extends Metric {
	type: string;
	size: number;
}

interface LayoutShift extends Metric {
	cumulative_score: number;
}

interface Video {
	title?: string;
	frames: Frame[];
	metrics: {
		fcp: Metric;
		lcp: LargestContentfulPaint;
		cls: LayoutShift[];
		domInteractive: Metric;
	};
}

type Filmstrip = Video[];
