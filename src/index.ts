import { readFile } from 'fs/promises';
import { ffmpeg } from './core/ffmpeg.js';
import { render } from './core/render.js';
import { transformToVideos } from './core/transform.js';

export interface Options {
	input: string[];
	output: string;
	debug?: boolean;
	speed?: number;
	size?: number;
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
		speed: opts.speed,
		size: opts.size,
		fontSize: Math.round(24 * scale),
		padding: {
			x: opts.size * 1.2,
			y: opts.size * 1.2,
		},
	};
}

export async function createFilmstrip(opts: Options) {
	const options = await resolveOptions(opts);
	if (options.debug) {
		const { profiles, ...optionsToPrint } = options;
		console.debug(`Resolved Options: ${JSON.stringify(optionsToPrint, null, 2)}`);
	}

	ffmpeg.setLogging(options.debug);
	const videos = transformToVideos(options);
	return render(videos, options);
}
