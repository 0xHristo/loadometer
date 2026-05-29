import * as nodeModule from 'node:module';
import { appendFileSync, writeFileSync } from 'node:fs';

const outputFile = process.env.LOADOMETER_OUT_FILE;

if (outputFile) {
  writeFileSync(outputFile, '');
}

const log = (line: string) => {
  if (outputFile) {
    appendFileSync(outputFile, line + '\n');
  } else {
    console.log(line);
  }
};

const importStack: string[] = [];

const originalRequire = nodeModule.Module.prototype.require;

nodeModule.Module.prototype.require = function (this: unknown, ...args: unknown[]) {
  const moduleId = String(args[0]);
  importStack.push(moduleId);
  const foldedStack = importStack.join(';');
  const start = performance.now();
  try {
    return originalRequire.apply(this, args as [string]);
  } finally {
    const loadTimeMs = Math.round(performance.now() - start);
    // log "a;b;c <ms>" — the folded-stack format flame-graph tools consume.
    if (foldedStack) {
      log(`${foldedStack} ${loadTimeMs}`);
    }
    importStack.pop();
  }
};
