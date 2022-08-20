import { readFile } from 'fs/promises';
import { loadFFmpeg } from './core/ffmpeg.js';
import { render } from './core/render.js';
import { SUPPORTED_METRICS, transformToVideos } from './core/transform.js';

export interface Options {
	inputs: string[];
	output: string;
	debug?: boolean;
	metrics?: boolean | SupportedMetrics[];
	speed?: number;
	scale?: number;
	onProgress?: (event: ProgressUpdate) => void;
}

async function resolveOptions(opts: Options) {
	const profiles: Profile[] = await Promise.all(opts.inputs.map(
		async (inputPath) => JSON.parse(await readFile(inputPath, { encoding: 'utf-8' })),
	));

	let resolvedMetrics: SupportedMetrics[];
	if (opts.metrics === true) {
		resolvedMetrics = SUPPORTED_METRICS;
	} else if (opts.metrics === false) {
		resolvedMetrics = [];
	} else {
		resolvedMetrics = opts.metrics.filter(metric => SUPPORTED_METRICS.includes(metric));
	}

	return {
		profiles,
		metrics: resolvedMetrics,
		format: opts.output.split('.').pop(),
		output: opts.output,
		debug: opts.debug,
		onProgress: opts.onProgress ?? (() => undefined),
		speed: opts.speed,
		scale: opts.scale,
	};
}

export async function createFilmstrip(opts: Options) {
	const options = await resolveOptions(opts);
	if (options.debug) {
		const { profiles, ...optionsToPrint } = options;
		console.debug(`Resolved Options: ${JSON.stringify(optionsToPrint, null, 2)}`);
	}

	const ffmpeg = await loadFFmpeg(options);

	ffmpeg.setLogging(options.debug);
	const videos = transformToVideos(options);
	return render(videos, options);
}
