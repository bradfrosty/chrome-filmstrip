import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import url from 'node:url';
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
				array: true,
				coerce: inputs => inputs.map(input => path.resolve(input)),
				demandOption: true,
				description: 'provide a path to one or more Chrome profile JSON files',
				normalize: true,
			},
			'output': {
				alias: 'o',
				coerce: output => path.resolve(output),
				demandOption: true,
				description: 'provide a path to output the filmstrip video',
				normalize: true,
			},
			'debug': {
				boolean: true,
				default: false,
				description: 'enable debug logs',
			},
		})
		.version().alias('version', 'v')
		.help().alias('help', 'h')
		.argv;

	const profiles: Profile[] = await Promise.all(argv.input.map(
		async (inputPath) => JSON.parse(await readFile(inputPath, { encoding: 'utf-8' })),
	));

	return {
		profiles,
		output: argv.output,
		debug: argv.debug,
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
