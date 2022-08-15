import { fetchFile } from '@ffmpeg/ffmpeg';
import { ffmpeg } from './ffmpeg.js';

const IN_MEM_CONCAT_PATH = 'concat.txt';
const IN_MEM_OUTPUT_PATH = 'output.mp4';

export async function render(videos: Video[]): Promise<Uint8Array> {
	// load font
	ffmpeg.FS('writeFile', 'OpenSans.ttf', await fetchFile('./static/OpenSans.ttf'));

	// render each profile as its own video using concat filter
	const inMemoryVideoPaths: string[] = [];
	for await (const [index, video] of videos.entries()) {
		const concat = [];
		for (const frame of video.frames) {
			const filename = frame.totalMs + '.png';
			ffmpeg.FS('writeFile', filename, frame.data);

			if (frame.durationMs > 0) {
				concat.push(`duration ${frame.durationMs}`);
			}

			concat.push(`file ${frame.totalMs}.png`);
		}
		ffmpeg.FS('writeFile', IN_MEM_CONCAT_PATH, concat.join('\n'));

		const inMemoryVideoPath = `${index}-video.mp4`;
		inMemoryVideoPaths.push(inMemoryVideoPath);
		const videoCmd = [
			// render snapshot images with concat filter
			'-f',
			'concat',
			'-i',
			IN_MEM_CONCAT_PATH,
			// tell ffmpeg that chrome's timestamps are in microseconds
			'-vf',
			'settb=1/1000,setpts=PTS/1000',
			// set framerate to 60fps
			'-r',
			'60',
			inMemoryVideoPath,
		];
		await ffmpeg.run(...videoCmd);
	}

	const inputs = inMemoryVideoPaths.flatMap(videoPath => ['-i', videoPath]);
	const complexFilter = [];
	const scale = Array.from(videos.keys()).map(index =>
		`[${index}:v]scale=500:500:force_original_aspect_ratio=decrease,pad=640:720:-1:-1:color=black,setsar=sar=1,drawtext=text='%{pts\\:hms}': x=(w-tw)/2: y=h-(2*lh): fontsize=36: fontcolor=white: fontfile=OpenSans.ttf${
			videos.length > 1 ? `[${index}:v:scaled]` : '[out]'
		}`
	).join(';');
	complexFilter.push(scale);
	if (videos.length > 1) {
		const inputs = Array.from(videos.keys()).map(index => `[${index}:v:scaled]`).join('');
		const xstack = `${inputs}hstack=inputs=${videos.length}[out]`;
		complexFilter.push(xstack);
	}

	const renderCmd = [...inputs];
	renderCmd.push('-filter_complex', complexFilter.join(';'));
	renderCmd.push('-map', '[out]');
	renderCmd.push(IN_MEM_OUTPUT_PATH);
	await ffmpeg.run(...renderCmd);
	return ffmpeg.FS('readFile', IN_MEM_OUTPUT_PATH);
}
