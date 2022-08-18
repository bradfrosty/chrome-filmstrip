# chrome-filmstrip

Generate side-by-side filmstrip videos from a Chrome performance profile.

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

# change output size in pixels (default is 500)
chrome-filmstrip -i slow-profile.json -o fast-filmstrip.mkv --speed 2 --size 340

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
	size: 640,
});
```
