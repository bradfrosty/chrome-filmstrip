import { ffmpeg } from './ffmpeg.js';

const IN_MEM_CONCAT_PATH = 'concat.txt';
const IN_MEM_OUTPUT_PATH = 'output.mp4';

export async function render(videos: Video[]): Promise<Uint8Array> {
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
			'-f',
			'concat',
			'-i',
			IN_MEM_CONCAT_PATH,
			'-vf',
			'settb=1/1000,setpts=PTS/1000',
			'-vsync',
			'vfr',
			'-r',
			'1000',
			inMemoryVideoPath,
		];
		await ffmpeg.run(...videoCmd);
	}

	const renderCmd = inMemoryVideoPaths.flatMap(videoPath => ['-i', videoPath]);
	const complexFilter = [];
	const scale = Array.from(videos.keys()).map(index =>
		`[${index}:v]scale=500:500:force_original_aspect_ratio=decrease,pad=640:720:-1:-1:color=black,setsar=sar=1${
			videos.length > 1 ? `[${index}:v:scaled]` : '[out]'
		}`
	).join(';');
	complexFilter.push(scale);
	if (videos.length > 1) {
		const inputs = Array.from(videos.keys()).map(index => `[${index}:v:scaled]`).join('');
		const xstack = `${inputs}hstack=inputs=${videos.length}[out]`;
		complexFilter.push(xstack);
	}
	renderCmd.push('-filter_complex', complexFilter.join(';'));
	renderCmd.push('-map', '[out]');
	renderCmd.push(IN_MEM_OUTPUT_PATH);
	await ffmpeg.run(...renderCmd);
	return ffmpeg.FS('readFile', IN_MEM_OUTPUT_PATH);
}
