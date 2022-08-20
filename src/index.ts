import { readFile } from 'fs/promises';
import { loadFFmpeg } from './core/ffmpeg.js';
import { render } from './core/render.js';
import { transformToVideos } from './core/transform.js';

export interface Options {
	input: string[];
	output: string;
	debug?: boolean;
	speed?: number;
	scale?: number;
	onProgress?: (event: ProgressUpdate) => void;
}

async function resolveOptions(opts: Options) {
	const profiles: Profile[] = await Promise.all(opts.input.map(
		async (inputPath) => JSON.parse(await readFile(inputPath, { encoding: 'utf-8' })),
	));

	// compute scale for font assuming 500 default
	const scale = opts.size / 500;

	return {
		profiles,
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
