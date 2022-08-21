import { createFilmstrip } from 'chrome-filmstrip';
import { writeFile } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const filmstrip = await createFilmstrip({
  inputs: [
    resolve(__dirname, '../profiles/webpagetest-fast3g.performance.json'),
  ],
  output: resolve(__dirname, '../videos/filmstrip-xl.gif'),
  metrics: false,
  scale: 2,
});

await writeFile(resolve(__dirname, '../videos/filmstrip-xl.gif'), filmstrip);
process.exit(0);
