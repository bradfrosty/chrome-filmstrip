import { createFFmpeg } from '@ffmpeg/ffmpeg';

export const ffmpeg = createFFmpeg({ log: true });
await ffmpeg.load();
