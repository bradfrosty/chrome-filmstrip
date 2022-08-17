import { readFile, writeFile } from 'node:fs/promises';
import { extname, resolve } from 'node:path';
import yargs from 'yargs';
import { bin } from '../package.json' assert { type: 'json' };
import { createFilmstrip } from './index.js';

async function resolveOptions(opts: string[]): Promise<ResolvedOptions> {
	const argv = yargs(opts)
		.scriptName(Object.keys(bin)[0])
		.usage('Usage: $0 [options]')
		.options({
			'input': {
				alias: 'i',
				coerce: inputs => inputs.map(input => resolve(input)),
				demandOption: true,
				description: 'provide a path to one or more Chrome profile JSON files',
				normalize: true,
				type: 'array',
			},
			'output': {
				alias: 'o',
				coerce: output => resolve(output),
				demandOption: true,
				description: 'provide a path to output the filmstrip video',
				normalize: true,
				type: 'string',
			},
			'debug': {
				default: false,
				description: 'enable debug logs',
				type: 'boolean',
			},
			'speed': {
				alias: 'r',
				default: 1,
				description: 'change the playback speed of the video (ex: -r 0.5 to slow, -r 2 to speed up)',
				type: 'number',
			},
			'size': {
				alias: 's',
				default: 500,
				description: 'specify the output size of the video in pixels (ex: -s 800)',
				type: 'number',
			},
		})
		.version().alias('version', 'v')
		.help().alias('help', 'h')
		.argv;

	const profiles: Profile[] = await Promise.all(argv.input.map(
		async (inputPath) => JSON.parse(await readFile(inputPath, { encoding: 'utf-8' })),
	));

	// compute scale for font assuming 500 default
	const scale = argv.size / 500;

	return {
		profiles,
		format: extname(argv.output),
		output: argv.output,
		debug: argv.debug,
		speed: argv.speed,
		size: argv.size,
		fontSize: Math.round(24 * scale),
		padding: {
			x: argv.size * 1.2,
			y: argv.size * 1.2,
		},
	};
}

export async function main() {
	const options = await resolveOptions(process.argv.slice(2));
	if (options.debug) {
		const { profiles, ...optionsToPrint } = options;
		console.debug(`Resolved Options: ${JSON.stringify(optionsToPrint, null, 2)}`);
	}

	const filmstrip = await createFilmstrip(options);
	await writeFile(options.output, filmstrip);
	process.exit(0);
}

main();
