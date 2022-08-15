import { render } from './core/render.js';
import { transformToFrames } from './core/transform.js';

export function createFilmstrip(profile: ProfileEvent[]) {
  return render(transformToFrames(profile));
}
