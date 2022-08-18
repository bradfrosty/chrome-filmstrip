import { createFFmpeg, FFmpeg } from '@ffmpeg/ffmpeg';
import { runTask } from './task.js';

let _ffmpeg: FFmpeg;

export const ffmpeg = (): FFmpeg => _ffmpeg;
export const loadFFmpeg = (options: ResolvedOptions) =>
	runTask({ name: 'loading ffmpeg', options }, async () => {
		_ffmpeg = createFFmpeg({ log: false });
		await _ffmpeg.load();
		return ffmpeg();
	});
