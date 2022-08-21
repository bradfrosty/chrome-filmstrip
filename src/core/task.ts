import ora from 'ora';

interface TaskOptions {
	name: string;
	options: ResolvedOptions;
}

const capitalize = (val: string) => val.charAt(0).toUpperCase() + val.substring(1);

const spinner = ora({
	color: 'cyan',
	spinner: 'dots',
});

export async function runTask<R>(
	{ name, options }: TaskOptions,
	cb: () => R,
): Promise<Awaited<R>> {
	spinner.start(capitalize(name));
	options.onProgress({
		task: name,
		event: 'start',
		progress: 0,
	});

	try {
		return await cb();
	} finally {
		spinner.succeed(`Finished ${name}`);
		options.onProgress({
			task: name,
			event: 'end',
			progress: 100,
		});
	}
}
