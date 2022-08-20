import { writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import ora from 'ora';
import yargs from 'yargs';
import { bin, version } from '../package.json' assert { type: 'json' };
import { createFilmstrip, type Options } from './index.js';

type CLIOptions = Omit<Options, 'onProgress'>;

function parseOptions(opts: string[]): Promise<CLIOptions> {
	return yargs(opts)
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
			'scale': {
				alias: 's',
				default: 1,
				description: 'specify a ratio to scale the output size of the video (ex: -s 1.2)',
				type: 'number',
			},
		})
		.version(version).alias('version', 'v')
		.help().alias('help', 'h')
		.argv;
}

export async function main() {
	const options = await parseOptions(process.argv.slice(2));
	const spinner = ora({
		text: `Initializing ffmpeg`,
		color: 'cyan',
		spinner: 'dots',
	});

	const filmstrip = await createFilmstrip({
		...options,
		onProgress: ({ task, event, progress }) => {
			const inProgressMessage = task.charAt(0).toUpperCase() + task.substring(1);
			switch (event) {
				case 'start': {
					spinner.start(inProgressMessage);
					break;
				}
				case 'update': {
					if (progress > 0 && progress < 1) {
						spinner.text = `${inProgressMessage} (${progress}%)`;
					}
					break;
				}
				case 'end': {
					spinner.succeed(`Finished ${task}`);
					break;
				}
				default: {
					console.error(`Unknown progress update event "${event}"`);
					break;
				}
			}
		},
	});
	await writeFile(options.output, filmstrip);
	spinner.text += ` ${options.output}`;
	process.exit(0);
}

main();
