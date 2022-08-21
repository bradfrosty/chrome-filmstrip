# chrome-filmstrip

Generate side-by-side filmstrip videos from Chrome performance profiles.

- Visually compare performance traces as a filmsrip video
- Show timestamp of trace
- Output in variety of formats
- Change playback speed
- Adjust output video size

![Example collage](./examples/videos/collage-double-speed.gif)

See more example videos [here](https://github.com/bradfrosty/chrome-filmstrip/tree/main/examples/videos).

## Install

```sh
pnpm i -g chrome-filmstrip
```

## Usage

### CLI

```sh
# one profile
chrome-filmstrip profile.json filmstrip.mp4

# many profiles
chrome-filmstrip ./*-profile.json compare.mp4

# output a gif (or other formats)
chrome-filmstrip profile.json filmstrip.gif

# change the playback speed
chrome-filmstrip fast-profile.json slow-filmstrip.webm --speed 0.5

# scale the output size
chrome-filmstrip slow-profile.json fast-filmstrip.mkv --speed 2 --scale 1.5

# control which metrics to display (supported metrics: fp, fcp, lcp, interactive)
chrome-filmstrip profile.json filmstrip.gif --metrics all # default
chrome-filmstrip profile.json filmstrip.gif --metrics fcp,lcp
chrome-filmstrip profile.json filmstrip.gif --metrics none

# print ffmpeg debug logs
chrome-filmstrip profile.json filmstrip.mov --debug
```

### Node

```ts
import { createFilmstrip } from 'chrome-filmstrip';

await createFilmstrip({
	inputs: ['profile.json'],
	output: 'filmstrip.mp4',
	debug: true,
	speed: 0.7,
	scale: 0.5,
});
```
