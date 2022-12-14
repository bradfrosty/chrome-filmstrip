import { fetchFile } from '@ffmpeg/ffmpeg';
import { resolve } from 'path';
import { fileURLToPath } from 'url';
import { ffmpeg } from './ffmpeg.js';
import { runTask } from './task.js';

const CONCAT_INPUT_PATH = 'concat.txt';
const VIDEO_FONT_FILE = 'OpenSans.ttf';
const VIDEO_FRAME_RATE = 60;
const VIDEO_BACKGROUND_COLOR = 'black';
const VIDEO_FONT_COLOR = 'white';
const DEFAULT_SIZE = 500;
const DEFAULT_FONT_SIZE = 24;

async function renderFilmstrips(filmstrips: FilmstripData[], options: ResolvedOptions): Promise<string[]> {
	const filmstripPaths: string[] = [];
	const size = options.scale * DEFAULT_SIZE;
	const fontSize = Math.round(options.scale * DEFAULT_FONT_SIZE);

	// Process each video in order
	for await (const [index, filmstrip] of filmstrips.entries()) {
		await runTask({ name: `rendering filmstrip #${index + 1}`, options }, async () => {
			const concatFilter = [];
			for (const frame of filmstrip.frames) {
				// Write frame to in-memory file as {frame-timestamp}.png
				const filename = frame.totalMs + '.png';
				ffmpeg().FS('writeFile', filename, frame.data);

				// Append the duration between the current frame and the previous one (if it exists e.g. duration > 0)
				if (frame.durationMs > 0) {
					concatFilter.push(`duration ${frame.durationMs}`);
				}

				// Append the frame image file
				concatFilter.push(`file ${filename}`);
			}
			// Write the concat filter input file to concat.txt
			ffmpeg().FS('writeFile', CONCAT_INPUT_PATH, concatFilter.join('\n'));

			const DEFAULT_DRAWTEXT_ARGS = `fontsize=${fontSize}:fontcolor=${VIDEO_FONT_COLOR}:fontfile=${VIDEO_FONT_FILE}`;

			const numTextElements = options.metrics.length + 1; // add one for stopwatch
			const paddingX = fontSize * 2;
			const paddingTop = fontSize * 2;
			const paddingBottom = fontSize * (numTextElements + 1);

			const postprocessFilter = [
				'format=yuva420p',
				// Set timebase on scale of microseconds
				'settb=1/1000',
				// Do the same for presentation timestamps
				'setpts=PTS/1000',
				// Convert variable fr to constant fr which will interpolate new output frames
				// Set the scene level to 0 ?????this prevents the interpolated frames from looking like an animation, which is inaccurate
				`framerate=fps=${VIDEO_FRAME_RATE}:scene=0`,
				// Scale the video to defined height while maintaining aspect ratio
				`scale=${`-1:${size}`}`,
				// Apply extra padding for text space, filling empty space with black background
				`pad=${`iw+${paddingX}:ih+${paddingTop + paddingBottom}`}:-1:${paddingTop}:color=${VIDEO_BACKGROUND_COLOR}`,
				// Overlay video title (centered above video)
				`drawtext=text='${filmstrip.title}':x=(w-tw)/2:y=(${paddingTop}-lh)/2:${DEFAULT_DRAWTEXT_ARGS}`,
				// Overlay stopwatch (centered beneath video)
				`drawtext=text='%{pts\\:hms}':x=(w-tw)/2:y=${size + paddingTop + fontSize / 2}:${DEFAULT_DRAWTEXT_ARGS}`,
				// Render metrics in order of timestamp
				...filmstrip.metrics.map((metric, index) =>
					`drawtext=text='${metric.name}\\: ${metric.value.toFixed(1)} ms':x=(w-tw)/2:y=${
						size + paddingTop + (fontSize / 2) + fontSize * (index + 1)
					}:enable='gte(t, ${metric.value / 1000})':${DEFAULT_DRAWTEXT_ARGS}`
				),
			];

			// Execute ffmpeg with concat filter to render an individual video
			const filmstripPath = index + '.mp4';
			await ffmpeg().run(
				// Render snapshot images into video with concat filter
				'-f',
				'concat',
				'-i',
				CONCAT_INPUT_PATH,
				// Apply postprocess filtergraph
				'-vf',
				postprocessFilter.join(','),
				filmstripPath,
			);
			filmstripPaths.push(filmstripPath);
		});
	}

	return filmstripPaths;
}

const renderCollage = (filmstripPaths: string[], options: ResolvedOptions): Promise<Uint8Array> =>
	runTask({
		name: 'rendering collage',
		options,
	}, async () => {
		const cmd = [...filmstripPaths.flatMap(p => ['-i', p])];

		// If more than one video, render into collage with hstack
		if (filmstripPaths.length > 1) {
			cmd.push('-filter_complex', `hstack=inputs=${filmstripPaths.length}`);
		}

		// Output file uses format specified by user
		// For gifs, we need to keep as mp4 to adjust dithering in post
		let outputPath = 'output.mp4';
		cmd.push(outputPath);

		await ffmpeg().run(...cmd);

		if (options.speed !== 1) {
			await ffmpeg().run(
				'-i',
				outputPath,
				'-vf',
				`setpts=PTS/${options.speed}`,
				outputPath = 'output-new-speed.mp4',
			);
		}

		// Gif post-process quality enhancement
		// http://blog.pkh.me/p/21-high-quality-gif-with-ffmpeg.html
		if (options.format === 'gif') {
			// Generate a color palette of the video, which creates of histogram of colors by frame
			await ffmpeg().run(
				'-i',
				outputPath,
				'-vf',
				'fps=30,scale=-1:-1:flags=lanczos,palettegen',
				'palette.png',
			);

			// Re-encode the gif using the palette to generate the final color quantized stream
			// This will choose an appropriate input color from the palette
			// This reduces most of the dithering I've seen in my tests
			await ffmpeg().run(
				'-i',
				outputPath,
				'-i',
				'palette.png',
				'-lavfi',
				'fps=30,scale=-1:-1:flags=lanczos[x];[x][1:v]paletteuse',
				outputPath = 'output-final.' + options.format,
			);
		} else {
			await ffmpeg().run('-i', outputPath, outputPath = 'output-final.' + options.format);
		}

		return ffmpeg().FS('readFile', outputPath);
	});

export async function render(filmstrips: FilmstripData[], options: ResolvedOptions): Promise<Uint8Array> {
	// Load font
	ffmpeg().FS(
		'writeFile',
		VIDEO_FONT_FILE,
		await fetchFile(resolve(fileURLToPath(import.meta.url), `../../static/${VIDEO_FONT_FILE}`)),
	);

	// Render individual profiles to filmstrip videos from frame data
	const filmstripPaths = await renderFilmstrips(filmstrips, options);

	// Render individual videos into a collage (or just output to path if only one)
	return renderCollage(filmstripPaths, options);
}
