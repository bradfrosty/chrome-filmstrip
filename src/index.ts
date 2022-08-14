import type { JsonArray } from 'type-fest';

export async function main(path: string) {
  const { default: data } = await import(path, { assert: { type: 'json' }});
  const profile = data as JsonArray;

  const screenshots = profile.filter(item => item['name'] === 'Screenshot');
  console.log(screenshots);
}


main();