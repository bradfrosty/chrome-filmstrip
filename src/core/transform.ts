import { URL } from 'node:url';

export const SUPPORTED_METRICS: SupportedMetrics[] = ['fp', 'fcp', 'lcp', 'interactive'];

export function transformToVideos({ metrics, profiles }: ResolvedOptions): Video[] {
	return profiles.map(profile => {
		const traceEvents = profile.traceEvents ?? profile;
		let totalMs = 0;
		const screenshots = traceEvents.filter(event => event.name === 'Screenshot');
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

		const navigationEvent = traceEvents.find(event => event.name === 'navigationStart');
		const url = new URL(navigationEvent.args.data.documentLoaderURL);
		const title = url.hostname + url.pathname;

		const computedMetrics: Metric[] = [];

		if (metrics.includes('fp')) {
			const fpEvent = traceEvents.find(event => event.name === 'firstPaint');
			const fp: Metric = {
				ts: fpEvent.ts,
				name: 'FP',
				value: (fpEvent.ts - navigationEvent.ts) / 1000,
			};
			computedMetrics.push(fp);
		}

		if (metrics.includes('fcp')) {
			const fcpEvent = traceEvents.find(event => event.name === 'firstContentfulPaint');
			const fcp: Metric = {
				ts: fcpEvent.ts,
				name: 'FCP',
				value: (fcpEvent.ts - navigationEvent.ts) / 1000,
			};
			computedMetrics.push(fcp);
		}

		if (metrics.includes('lcp')) {
			let lcp: LargestContentfulPaint;
			for (let i = traceEvents.length - 1; i >= 0; --i) {
				if (traceEvents[i].name === 'largestContentfulPaint::Candidate') {
					const candidate = traceEvents[i];
					lcp = {
						ts: candidate.ts,
						name: 'LCP',
						value: (candidate.ts - navigationEvent.ts) / 1000,
						type: candidate.args.data.type,
						size: candidate.args.data.size,
					};
				}
			}
			computedMetrics.push(lcp);
		}

		if (metrics.includes('interactive')) {
			const domInteractive: Metric = traceEvents.filter(event => event.name === 'domInteractive').map(event => ({
				ts: event.ts,
				name: 'Interactive',
				value: (event.ts - navigationEvent.ts) / 1000,
			}))[0];
			computedMetrics.push(domInteractive);
		}

		// TODO: figure out how to display CLS
		// const cls: LayoutShift[] = traceEvents.filter(event => event.name === 'LayoutShift').map(event => ({
		// 	ts: event.ts,
		// 	value: Number(event.args.data.score),
		// 	cumulative_score: Number(event.args.data.cumulative_score),
		// }));

		// const metrics: Metric[] = [fp, fcp, lcp, domInteractive].sort((a, b) => a.value - b.value);

		return {
			title,
			frames,
			metrics: computedMetrics.sort((a, b) => a.value - b.value),
		};
	});
}
