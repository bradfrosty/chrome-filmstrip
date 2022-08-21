# chrome-filmstrip

Generate a filmstrip collage from Chrome performance profiles.

- Visually compare performance traces side by side 
- Show stopwatch of trace duration
- Show computed metrics from profile
- Output in variety of formats
- Change playback speed
- Adjust output video size
- Format filmstrip titles

![Example collage](./examples/videos/collage-simple.gif)

See more example videos [here](https://github.com/bradfrosty/chrome-filmstrip/tree/main/examples/videos).

## Install

```sh
# use your choice of package manager
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

# format the title
chrome-filmstrip ./*-profile.json collage.gif --title "{url.origin} ({networkThrottling}, {cpuThrottling})"

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

## Title Formatting

Filmstrip titles can be formatted by providing a format string with parameters wrapped in curly braces.

The available formatting parameters depends on how the profile was created.

### Always Available

These parameters are always available regardless of whether the trace was gathered from the Performance or Performance Insights panel.

URL parameters are determined on a best effort, since the trace is not guaranteed to be a page load.

- If a navigation event exists in the profile, this URL will be used.
- Otherwise, the URL at the time the trace began will be used.

Priority is given to the navigation event,
as it is common to start profiles from `about:blank` to ensure a clean slate for page loads.

- `index`: the index of the profile within the provided list
- `filename`: the filename of the profile
- `url.href`: URL.href seen in the profile
- `url.origin`: URL.origin seen in the profile
- `url.hostname`: URL.hostname seen in the profile
- `url.pathname`: URL.pathname seen in the profile
- `url.search`: URL.search seen in the profile
- `url.hash`: URL.hash seen in the profile
- `url.port`: URL.port seen in the profile
- `url.protocol`: URL.protocol seen in the profile

### Performance Insights Panel Only

If the trace is created from the Performance Insights panel,
the following additional metadata can be used in the title format.

- `networkThrotling`: the network throttling applied to the trace
- `cpuThrotling`: the cpu throttling applied to the trace
