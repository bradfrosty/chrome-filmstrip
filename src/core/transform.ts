export function transformToVideos({ profiles }: ResolvedOptions): Video[] {
	return profiles.map(profile => {
		let totalMs = 0;
		const screenshots = profile.filter(event => event.name === 'Screenshot');
		const frames = screenshots.map((curr, index) => {
			// read image data into a buffer
			const data = Buffer.from(curr.args.snapshot, 'base64');
			// get previous frame if it exists
			const prev = index > 0 ? screenshots[index - 1] : undefined;
			// compute the duration between the current frame and previous frame if it exists
			const durationMs = prev ? Math.round((curr.ts - prev.ts) / 1000) : 0;
			// accumulate total video time
			totalMs += durationMs;

			return { data, durationMs, totalMs };
		});

		const navigationEvent = profile.find(event => event.name === 'navigationStart');
		const title = navigationEvent.args.data.documentLoaderURL;
		return { title, frames };
	});
}
