type SupportedMetrics = 'fp' | 'fcp' | 'lcp' | 'interactive';

interface ResolvedOptions {
	debug: boolean;
	format: string;
	metrics: SupportedMetrics[];
	output: string;
	profiles: Profile[];
	speed: number;
	scale: number;
	title: string;
	onProgress: (event: ProgressUpdate) => void;
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

type Profile = {
	index: number;
	filename: string;
	traceEvents: ProfileEvent[];
	metadata: {
		source: string;
		useCase: string;
		networkThrottling: string;
		cpuThrottling: number;
	};
};

interface Frame {
	durationMs: number;
	totalMs: number;
	data: Uint8Array;
}

interface Metric {
	ts: number;
	name: string;
	value: number;
}

interface LargestContentfulPaint extends Metric {
	type: string;
	size: number;
}

interface LayoutShift extends Metric {
	cumulative_score: number;
}

interface FilmstripData {
	title?: string;
	frames: Frame[];
	metrics: Metric[];
}

interface ProgressUpdate {
	event: 'start' | 'end' | 'update';
	task: string;
	progress: number;
}
