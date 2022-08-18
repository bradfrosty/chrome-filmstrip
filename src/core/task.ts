import type { AsyncReturnType, Promisable } from 'type-fest';
import { ffmpeg } from './ffmpeg.js';

interface TaskOptions {
	name: string;
	options: ResolvedOptions;
}

export async function runTask<R>(
	{ name, options }: TaskOptions,
	cb: () => R,
): Promise<Awaited<R>> {
	options.onProgress({
		task: name,
		event: 'start',
		progress: 0,
	});

	// this assumes ffmpeg tasks are serial
	ffmpeg()?.setProgress(({ ratio }) => {
		if (Number.isNaN(ratio)) {
			return;
		}

		options.onProgress({
			task: name,
			event: 'update',
			progress: Math.round(ratio * 100),
		});
	});

	try {
		return await cb();
	} finally {
		options.onProgress({
			task: name,
			event: 'end',
			progress: 100,
		});
	}
}
