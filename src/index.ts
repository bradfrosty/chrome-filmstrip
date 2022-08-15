import { ffmpeg } from './core/ffmpeg.js';
import { render } from './core/render.js';
import { transformToVideos } from './core/transform.js';

export function createFilmstrip(options: ResolvedOptions) {
	ffmpeg.setLogging(options.debug);
	const videos = transformToVideos(options);
	return render(videos);
}
