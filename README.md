# chrome-filmstrip

Generate side-by-side filmstrip videos from Chrome performance profiles.

- Visually compare performance traces as a filmsrip video
- Show timestamp of trace
- Output in variety of formats
- Change playback speed
- Adjust output video size

See example videos [here](https://github.com/bradfrosty/chrome-filmstrip/tree/main/examples/videos).

## Install

```sh
pnpm i -g chrome-filmstrip
```

## Usage

### CLI

```sh
# one profile
chrome-filmstrip -i profile.json -o filmstrip.mp4

# many profiles
chrome-filmstrip -i ./*-profile.json -o compare.mp4

# output a gif (or other formats)
chrome-filmstrip -i profile.json -o filmstrip.gif

# change the playback speed
chrome-filmstrip -i fast-profile.json -o slow-filmstrip.webm --speed 0.5

# scale the output size
chrome-filmstrip -i slow-profile.json -o fast-filmstrip.mkv --speed 2 --scale 1.5

# print ffmpeg debug logs
chrome-filmstrip -i profile.json -o filmstrip.mov --debug
```

### Node

```ts
import { createFilmstrip } from 'chrome-filmstrip';

await createFilmstrip({
	input: ['profile.json'],
	output: 'filmstrip.mp4',
	debug: true,
	speed: 0.7,
	scale: 0.5,
});
```
