import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import url from 'node:url';
import yargs from 'yargs';
import { createFilmstrip } from './index.js';
import { bin } from '../package.json' assert { type: 'json' };

export interface Options {
  input: string;
  output: string;
  debug?: boolean;
}

export type ResolvedOptions = Required<Options>;

function resolveOptions(opts: string[]): ResolvedOptions {
  return yargs(opts)
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
}

export async function main() {
  const options = resolveOptions(process.argv.slice(2));
  if (options.debug) {
    console.debug(`Resolved Options: ${JSON.stringify(options, null, 2)}`);
  }

  const inputRaw = await readFile(options.input[0], { encoding: 'utf-8' });
  const profile: ProfileEvent[] = JSON.parse(inputRaw);
  const filmstrip = await createFilmstrip(profile);
  await writeFile(options.output, filmstrip);
  process.exit(0);
}

function isMain(): boolean {
  console.log(process.argv[1]);
  return import.meta.url === url.pathToFileURL(process.argv[1]).href;
}

if (isMain()) {
  main();
}
