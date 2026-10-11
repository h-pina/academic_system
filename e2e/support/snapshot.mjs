import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import pixelmatch from 'pixelmatch';
import { PNG } from 'pngjs';

const E2E = resolve(fileURLToPath(new URL('..', import.meta.url)));

/**
 * Compares a screenshot with its stored reference.
 *
 * - `update`: writes the reference (a deliberate act).
 * - A missing reference is a failure, with the hint to create it.
 * - Different sizes fail; otherwise `pixelmatch` counts differing pixels
 *   and the run fails above `maxDiffRatio` of the image.
 * - On failure the actual image and a diff image go to `__diffs__/`.
 */
export function compareSnapshot({ name, environment, png, update, maxDiffRatio, pixelThreshold }) {
  const referencePath = join(E2E, '__screenshots__', environment, `${name}.png`);

  if (update) {
    mkdirSync(dirname(referencePath), { recursive: true });
    writeFileSync(referencePath, png);
    return { ok: true, note: 'reference updated' };
  }

  if (!existsSync(referencePath)) {
    return {
      ok: false,
      note: `no reference image (run "npm run test:visual:update" to create ${referencePath})`,
    };
  }

  const expected = PNG.sync.read(readFileSync(referencePath));
  const actual = PNG.sync.read(png);

  if (expected.width !== actual.width || expected.height !== actual.height) {
    saveActual(name, environment, png);
    return {
      ok: false,
      note: `size changed: ${expected.width}x${expected.height} -> ${actual.width}x${actual.height}`,
    };
  }

  const diff = new PNG({ width: expected.width, height: expected.height });
  const differing = pixelmatch(expected.data, actual.data, diff.data, expected.width, expected.height, {
    threshold: pixelThreshold,
  });
  const ratio = differing / (expected.width * expected.height);

  if (ratio > maxDiffRatio) {
    const dir = saveActual(name, environment, png);
    writeFileSync(join(dir, `${name}.diff.png`), PNG.sync.write(diff));
    return {
      ok: false,
      note: `${(ratio * 100).toFixed(2)}% of pixels differ (limit ${(maxDiffRatio * 100).toFixed(2)}%); see ${dir}`,
    };
  }
  return { ok: true, note: `${(ratio * 100).toFixed(3)}% differ` };
}

function saveActual(name, environment, png) {
  const dir = join(E2E, '__diffs__', environment);
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, `${name}.actual.png`), png);
  return dir;
}
