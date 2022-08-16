import { fetchFile } from '@ffmpeg/ffmpeg';
import { ffmpeg } from './ffmpeg.js';

const CONCAT_INPUT_PATH = 'concat.txt';
const VIDEO_OUTPUT_PATH = 'output.mp4';
const VIDEO_FONT_FILE = 'OpenSans.ttf';
const VIDEO_FRAME_RATE = 60;
const VIDEO_SCALE = '500:500';
const VIDEO_PADDING = '640:640';
const VIDEO_BACKGROUND_COLOR = 'black';
const VIDEO_FONT_COLOR = 'white';
const VIDEO_FONT_SIZE = 24;
const DEFAULT_DRAWTEXT_ARGS = `fontsize=${VIDEO_FONT_SIZE}:fontcolor=${VIDEO_FONT_COLOR}:fontfile=${VIDEO_FONT_FILE}`;

async function renderVideos(videos: Video[]): Promise<string[]> {
	const videoPaths: string[] = [];

	// process each video in order
	for await (const [index, video] of videos.entries()) {
		const concatFilter = [];
		for (const frame of video.frames) {
			// write frame to in-memory file as {frame-timestamp}.png
			const filename = frame.totalMs + '.png';
			ffmpeg.FS('writeFile', filename, frame.data);

			// append the duration between the current frame and the previous one (if it exists e.g. duration > 0)
			if (frame.durationMs > 0) {
				concatFilter.push(`duration ${frame.durationMs}`);
			}

			// append the frame image file
			concatFilter.push(`file ${filename}`);
		}
		// write the concat filter input file to concat.txt
		ffmpeg.FS('writeFile', CONCAT_INPUT_PATH, concatFilter.join('\n'));

		const postprocessFilter = [
			// set timebase on scale of microseconds
			'settb=1/1000',
			// do the same for presentation timestamps
			'setpts=PTS/1000',
			// convert variable fr to constant fr which will interpolate new output frames
			// set the scene level to 0 — this prevents the interpolated frames from looking like an animation, which is inaccurate
			`framerate=fps=${VIDEO_FRAME_RATE}:scene=0`,
			// scale the video while, downscaling the original aspect ratio if needed
			`scale=${VIDEO_SCALE}:force_original_aspect_ratio=decrease`,
			// apply extra padding for text space, filling empty space with black background
			`pad=${VIDEO_PADDING}:-1:-1:color=${VIDEO_BACKGROUND_COLOR}`,
			// overlay video title (centered on the top)
			`drawtext=text='${video.title}':x=(w-tw)/2:y=(1*lh):${DEFAULT_DRAWTEXT_ARGS}`,
			// overlay frame timestamp (centered on the bottom)
			`drawtext=text='%{pts\\:hms}':x=(w-tw)/2:y=h-(2.5*lh):${DEFAULT_DRAWTEXT_ARGS}`,
		];

		// execute ffmpeg with concat filter to render an individual video
		const videoPath = `${index}.mp4`;
		await ffmpeg.run(
			// render snapshot images into video with concat filter
			'-f',
			'concat',
			'-i',
			CONCAT_INPUT_PATH,
			// apply postprocess filtergraph
			'-vf',
			postprocessFilter.join(','),
			videoPath,
		);
		videoPaths.push(videoPath);
	}
	return videoPaths;
}

async function renderCollage(videoPaths: string[]): Promise<Uint8Array> {
	// an array representing the ffmpeg command for rendering the collage video
	const cmd = [...videoPaths.flatMap(p => ['-i', p])];
	// if more than one video, run into collage with hstack
	if (videoPaths.length > 1) {
		cmd.push('-filter_complex', `hstack=inputs=${videoPaths.length}`);
	}
	cmd.push(VIDEO_OUTPUT_PATH);
	await ffmpeg.run(...cmd);
	return ffmpeg.FS('readFile', VIDEO_OUTPUT_PATH);
}

export async function render(videos: Video[]): Promise<Uint8Array> {
	// load font
	ffmpeg.FS('writeFile', VIDEO_FONT_FILE, await fetchFile(`./static/${VIDEO_FONT_FILE}`));
	// render individual videos from frame data
	const videoPaths = await renderVideos(videos);
	// render individual videos into a collage (or just output to path if only one)
	return renderCollage(videoPaths);
}
