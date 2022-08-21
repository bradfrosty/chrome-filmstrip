import { URL } from 'node:url';

export const SUPPORTED_METRICS: SupportedMetrics[] = ['fp', 'fcp', 'lcp', 'interactive'];

interface TitleFormatParams {
	index: number;
	filename: string;
	source: string;
	useCase: string;
	networkThrottling: string;
	cpuThrottling: number;
	'url.href': string;
	'url.origin': string;
	'url.hostname': string;
	'url.pathname': string;
	'url.search': string;
	'url.hash': string;
	'url.port': string;
	'url.protocol': string;
}

function createTitleFormatParams(profile: Profile): TitleFormatParams {
	const navigationStartEvent = profile.traceEvents.find(event => event.name === 'navigationStart');
	const navigationStartUrl = navigationStartEvent.args.data.documentLoaderURL;
	const tracingStartedEvent = profile.traceEvents.find(event => event.name === 'TracingStartedInBrowser');
	const tracingStartUrl = tracingStartedEvent.args.data.frames[0].url;
	// Prefer navigation URL with fallback to URL at time of tracing start
	// This is because I often start from about:blank when creating page load profiles
	const url = new URL(navigationStartUrl || tracingStartUrl);

	return {
		index: profile.index,
		filename: profile.filename,
		source: profile.metadata.source,
		useCase: profile.metadata.useCase,
		networkThrottling: profile.metadata.networkThrottling,
		cpuThrottling: profile.metadata.cpuThrottling,
		'url.href': url.href,
		'url.origin': url.origin,
		'url.hostname': url.hostname,
		'url.pathname': url.pathname,
		'url.search': url.search,
		'url.hash': url.hash,
		'url.port': url.port,
		'url.protocol': url.protocol,
	};
}

function formatTitle(format: string, params: TitleFormatParams): string {
	let title = format;
	for (const [name, value] of Object.entries(params)) {
		title = title.replaceAll(`{${name}}`, String(value));
	}
	// escape colons for ffmpeg — these deliminate args on the filters
	return title.replaceAll(':', '\\:');
}

export function parseFilmstripData({ title, metrics, profiles }: ResolvedOptions): FilmstripData[] {
	return profiles.map(profile => {
		const traceEvents = profile.traceEvents;
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
			title: formatTitle(title, createTitleFormatParams(profile)),
			frames,
			metrics: computedMetrics.sort((a, b) => a.value - b.value),
		};
	});
}
