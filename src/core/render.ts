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

async function renderVideos(videos: Video[], options: ResolvedOptions): Promise<string[]> {
	const videoPaths: string[] = [];

	// Process each video in order
	for await (const [index, video] of videos.entries()) {
		await runTask({ name: `rendering filmstrip #${index + 1}`, options }, async () => {
			const concatFilter = [];
			for (const frame of video.frames) {
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

			const DEFAULT_DRAWTEXT_ARGS =
				`fontsize=${options.fontSize}:fontcolor=${VIDEO_FONT_COLOR}:fontfile=${VIDEO_FONT_FILE}`;

			const postprocessFilter = [
				'format=yuva420p',
				// Set timebase on scale of microseconds
				'settb=1/1000',
				// Do the same for presentation timestamps
				'setpts=PTS/1000',
				// Convert variable fr to constant fr which will interpolate new output frames
				// Set the scene level to 0 — this prevents the interpolated frames from looking like an animation, which is inaccurate
				`framerate=fps=${VIDEO_FRAME_RATE}:scene=0`,
				// Scale the video while, downscaling the original aspect ratio if needed
				`scale=${`${options.size}:${options.size}`}:force_original_aspect_ratio=decrease`,
				// Apply extra padding for text space, filling empty space with black background
				`pad=${`${options.padding.x}:${options.padding.y}`}:-1:-1:color=${VIDEO_BACKGROUND_COLOR}`,
				// Overlay video title (centered on the top)
				`drawtext=text='${video.title}':x=(w-tw)/2:y=(1*lh):${DEFAULT_DRAWTEXT_ARGS}`,
				// Overlay frame timestamp (centered on the bottom)
				`drawtext=text='%{pts\\:hms}':x=(w-tw)/2:y=h-(2*lh):${DEFAULT_DRAWTEXT_ARGS}`,
				// TODO: render metrics
				// `drawtext=text='FCP\\: ${video.metrics.fcp.value}ms':x=(w-tw)/2:y=h-(5*lh):enable='gte(t, ${
				// 	video.metrics.fcp.value / 1000
				// })':${DEFAULT_DRAWTEXT_ARGS}`,
			];

			// Execute ffmpeg with concat filter to render an individual video
			const videoPath = index + '.mp4';
			await ffmpeg().run(
				// Render snapshot images into video with concat filter
				'-f',
				'concat',
				'-i',
				CONCAT_INPUT_PATH,
				// Apply postprocess filtergraph
				'-vf',
				postprocessFilter.join(','),
				videoPath,
			);
			videoPaths.push(videoPath);
		});
	}

	return videoPaths;
}

const renderCollage = (videoPaths: string[], options: ResolvedOptions): Promise<Uint8Array> =>
	runTask({
		name: 'rendering collage',
		options,
	}, async () => {
		// An array representing the ffmpeg command for rendering the collage video
		const cmd = [...videoPaths.flatMap(p => ['-i', p])];
		// If more than one video, run into collage with hstack
		if (videoPaths.length > 1) {
			cmd.push('-filter_complex', `hstack=inputs=${videoPaths.length}`);
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

export async function render(videos: Video[], options: ResolvedOptions): Promise<Uint8Array> {
	// Load font
	ffmpeg().FS(
		'writeFile',
		VIDEO_FONT_FILE,
		await fetchFile(resolve(fileURLToPath(import.meta.url), `../../static/${VIDEO_FONT_FILE}`)),
	);

	// Render individual videos from frame data
	const videoPaths = await renderVideos(videos, options);

	// Render individual videos into a collage (or just output to path if only one)
	return renderCollage(videoPaths, options);
}
