import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export function hasPinnedBatiScaffolder(dockerfile) {
  const commands = [...dockerfile.replace(/\\\r?\n/g, ' ').matchAll(
    /^[ \t]*RUN[ \t]+npm[ \t]+create[ \t]+(bati(?:@[^\s;&|]+)?)(?=[ \t;&|]|\r?$)/gim,
  )];
  return commands.length > 0 && commands.every(([, spec]) =>
    /^bati@\d+\.\d+\.\d+(?:-[\da-z-]+(?:\.[\da-z-]+)*)?(?:\+[\da-z-]+(?:\.[\da-z-]+)*)?$/i.test(spec),
  );
}

const invokedDirectly = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (invokedDirectly) {
  const dockerfile = readFileSync(new URL('../Dockerfile', import.meta.url), 'utf8');
  if (!hasPinnedBatiScaffolder(dockerfile)) {
    console.error('Dockerfile must use npm create bati with an exact version');
    process.exitCode = 1;
  } else {
    console.log('Dockerfile uses an exact create-bati version');
  }
}
