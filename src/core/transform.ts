import { URL } from 'node:url';

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
		const url = new URL(navigationEvent.args.data.documentLoaderURL);
		const title = url.hostname + url.pathname;

		const fcpEvent = profile.find(event => event.name === 'firstContentfulPaint');
		const fcp: Metric = {
			ts: fcpEvent.ts,
			value: (fcpEvent.ts - navigationEvent.ts) / 1000,
		};

		let lcp: LargestContentfulPaint;
		for (let i = profile.length - 1; i >= 0; --i) {
			if (profile[i].name === 'largestContentfulPaint::Candidate') {
				const candidate = profile[i];
				lcp = {
					ts: candidate.ts,
					value: (candidate.ts - navigationEvent.ts) / 1000,
					type: candidate.args.data.type,
					size: candidate.args.data.size,
				};
			}
		}

		const cls: LayoutShift[] = profile.filter(event => event.name === 'LayoutShift').map(event => ({
			ts: event.ts,
			value: Number(event.args.data.score),
			cumulative_score: Number(event.args.data.cumulative_score),
		}));

		const domInteractive: Metric = profile.filter(event => event.name === 'domInteractive').map(event => ({
			ts: event.ts,
			value: (event.ts - navigationEvent.ts) / 1000,
		}))[0];

		return {
			title,
			frames,
			metrics: {
				fcp,
				lcp,
				cls,
				domInteractive,
			},
		};
	});
}
