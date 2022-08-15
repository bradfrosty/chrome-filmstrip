import { ffmpeg } from './ffmpeg.js';

const IN_MEM_VIDEO_PATH = 'output.mp4';
const IN_MEM_CONCAT_PATH = 'concat.txt';

export async function render(frames: Frame[]): Promise<Uint8Array> {
	const concat = [];
	for (const frame of frames) {
		const filename = frame.totalMs + '.png';
		ffmpeg.FS('writeFile', filename, frame.data);

		if (frame.durationMs > 0) {
			concat.push(`duration ${frame.durationMs}`);
		}

		concat.push(`file ${frame.totalMs}.png`);
	}

	ffmpeg.FS('writeFile', IN_MEM_CONCAT_PATH, concat.join('\n'));
	await ffmpeg.run(
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
		IN_MEM_VIDEO_PATH,
	);
	return ffmpeg.FS('readFile', IN_MEM_VIDEO_PATH);
}
