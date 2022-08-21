import { readFile } from 'fs/promises';
import { loadFFmpeg } from './core/ffmpeg.js';
import { parseFilmstripData, SUPPORTED_METRICS } from './core/parse.js';
import { render } from './core/render.js';

export interface Options {
	inputs: string[];
	output: string;
	debug?: boolean;
	metrics?: boolean | SupportedMetrics[];
	speed?: number;
	scale?: number;
	onProgress?: (event: ProgressUpdate) => void;
}

export const DEFAULTS = {
	debug: false,
	speed: 1,
	scale: 1,
	title: 'Profile {index}: {url.hostname}{url.pathname}',
	onProgress: () => undefined,
};
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
		debug: opts.debug ?? DEFAULTS.debug,
		onProgress: opts.onProgress ?? DEFAULTS.onProgress,
		speed: opts.speed ?? DEFAULTS.speed,
		scale: opts.scale ?? DEFAULTS.scale,
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
	const filmstrips = parseFilmstripData(options);
	return render(filmstrips, options);
}
