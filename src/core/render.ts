import { fetchFile } from '@ffmpeg/ffmpeg';
import { ffmpeg } from './ffmpeg.js';

const CONCAT_INPUT_PATH = 'concat.txt';
const VIDEO_OUTPUT_PATH = 'output.mp4';
const VIDEO_FONT_FILE = 'OpenSans.ttf';
const VIDEO_SCALE = '500:500';
const VIDEO_PADDING = '640:720';
const VIDEO_BACKGROUND_COLOR = 'black';
const VIDEO_FONT_COLOR = 'white';
const VIDEO_FONT_SIZE = '24';

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

		// execute ffmpeg with concat filter to render an individual video
		const videoPath = `${index}.mp4`;
		await ffmpeg.run(
			// render snapshot images with concat filter
			'-f',
			'concat',
			'-i',
			CONCAT_INPUT_PATH,
			// tell ffmpeg that chrome's timestamps are in microseconds
			'-vf',
			'settb=1/1000,setpts=PTS/1000',
			// set framerate to 60fps
			'-r',
			'60',
			videoPath,
		);
		videoPaths.push(videoPath);
	}
	return videoPaths;
}

async function renderCollage(videoPaths: string[]): Promise<Uint8Array> {
	// an array representing the ffmpeg command for rendering the collage video
	const cmd = [];
	// define each video as an input
	cmd.push(...videoPaths.flatMap(p => ['-i', p]));

	const filterGraph = [];
	let scaleChainOutputs = [];
	for (const index in videoPaths) {
		// TODO: drawtext twice for multiline
		// TODO: perform this scale during the first ffmpeg invocation
		let scaleAndTextFilterChain = `[${index}:v]scale=${VIDEO_SCALE}:force_original_aspect_ratio=decrease,`;
		scaleAndTextFilterChain += `pad=${VIDEO_PADDING}:-1:-1:color=${VIDEO_BACKGROUND_COLOR},`;
		scaleAndTextFilterChain += `setsar=sar=1,`; // do i need this?
		scaleAndTextFilterChain +=
			`drawtext=text='%{pts\\:hms}\nVideo ${index}': x=(w-tw)/2: y=h-(2*lh): fontsize=${VIDEO_FONT_SIZE}: fontcolor=${VIDEO_FONT_COLOR}: fontfile=${VIDEO_FONT_FILE}`;

		// store chain output to use as input later
		const output = videoPaths.length > 1 ? `[tmp:${index}:scaled]` : '[out]';
		scaleChainOutputs.push(output);

		scaleAndTextFilterChain += output;
		filterGraph.push(scaleAndTextFilterChain);
	}
	// if more than one, create hstack chain to collage them. otherwise, just buffer them to [out].
	// hstack doesn't work on a single video and we need to get the output of the chain synchronized
	if (videoPaths.length > 1) {
		const collageChain = `${scaleChainOutputs.join('')} hstack=inputs=${videoPaths.length} [out]`;
		filterGraph.push(collageChain);
	}

	cmd.push('-filter_complex', filterGraph.join(';'));
	cmd.push('-map', '[out]');
	cmd.push(VIDEO_OUTPUT_PATH);
	console.log(cmd);
	await ffmpeg.run(...cmd);
	return ffmpeg.FS('readFile', VIDEO_OUTPUT_PATH);
}

export async function render(videos: Video[]): Promise<Uint8Array> {
	// load font
	ffmpeg.FS('writeFile', VIDEO_FONT_FILE, await fetchFile(`./static/${VIDEO_FONT_FILE}`));

	// render individual videos from frame data
	const videoPaths = await renderVideos(videos);

	// render individual videos into a collage
	const collageVideo = await renderCollage(videoPaths);

	return collageVideo;
}
