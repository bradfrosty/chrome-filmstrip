# chrome-filmstrip

Generate side-by-side filmstrip videos from a Chrome performance profile.

## Install

```sh
pnpm i -g chrome-filmstrip
```

## Usage

```sh
# one profile
chrome-filmstrip -i ./path/to/profile.json -o filmstrip.mp4

# many profiles
chrome-filmstrip -i ./path/to/*-profile.json -o compare.mp4
```
