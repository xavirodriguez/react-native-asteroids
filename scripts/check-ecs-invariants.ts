import * as fs from 'fs';
import * as path from 'path';

const FORBIDDEN_PATTERNS = [
  {
    name: 'Direct world.addComponent in System',
    pattern: /\.addComponent\(/,
    include: [/src\/engine\/systems/, /src\/games\/.*\/systems/, /src\/simulation/],
    exclude: [/WorldCommandBuffer\.ts/, /World\.ts/, /__tests__/, /ParticleSystem\.ts/],
    severity: 'error'
  },
  {
    name: 'Direct world.removeComponent in System',
    pattern: /\.removeComponent\(/,
    include: [/src\/engine\/systems/, /src\/games\/.*\/systems/, /src\/simulation/],
    exclude: [/WorldCommandBuffer\.ts/, /World\.ts/, /__tests__/],
    severity: 'error'
  },
  {
    name: 'Direct world.createEntity in System',
    pattern: /\.createEntity\(/,
    include: [/src\/engine\/systems/, /src\/games\/.*\/systems/, /src\/simulation/],
    exclude: [/WorldCommandBuffer\.ts/, /World\.ts/, /__tests__/, /ParticleSystem\.ts/],
    severity: 'error'
  },
  {
    name: 'Direct world.removeEntity in System',
    pattern: /\.removeEntity\(/,
    include: [/src\/engine\/systems/, /src\/games\/.*\/systems/, /src\/simulation/],
    exclude: [/WorldCommandBuffer\.ts/, /World\.ts/, /__tests__/],
    severity: 'error'
  },
  {
    name: 'Synchronous eventBus.emit in Simulation/System',
    pattern: /\.emit\(.*?\)/,
    include: [/src\/simulation/, /src\/engine\/systems/, /src\/games\/.*\/systems/],
    exclude: [/src\/engine\/core\/EventBus\.ts/, /__tests__/, /AsteroidsGame\.ts/],
    severity: 'warning',
    message: 'Use emitDeferred() for gameplay events to avoid non-deterministic side effects.'
  }
];

function checkFile(filepath: string): number {
  const content = fs.readFileSync(filepath, 'utf8');
  let errors = 0;

  FORBIDDEN_PATTERNS.forEach(rule => {
    if (rule.include && !rule.include.some(re => re.test(filepath))) return;
    if (rule.exclude && rule.exclude.some(re => re.test(filepath))) return;

    const matches = content.matchAll(new RegExp(rule.pattern, 'g'));
    for (const match of matches) {
        const lineStart = content.lastIndexOf('\n', match.index!) + 1;
        const lineEnd = content.indexOf('\n', match.index!);
        const line = content.substring(lineStart, lineEnd === -1 ? content.length : lineEnd);

        // Skip if it uses commandBuffer or if it's checking for existence
        if (line.includes('getCommandBuffer()') || line.includes('commands.') || line.includes('buffer.')) continue;
        if (line.includes('if (') && line.includes('.hasComponent')) continue;

        console.log(`[${rule.severity.toUpperCase()}] ${rule.name} in ${filepath}`);
        console.log(`  -> ${line.trim()}`);
        if (rule.message) console.log(`  -> ${rule.message}`);
        if (rule.severity === 'error') errors++;
    }
  });

  return errors;
}

function walk(dir: string, cb: (fp: string) => void) {
  fs.readdirSync(dir).forEach(file => {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      if (file !== 'node_modules' && file !== '.git' && file !== 'dist') {
        walk(fullPath, cb);
      }
    } else if (file.endsWith('.ts') || file.endsWith('.tsx')) {
      cb(fullPath);
    }
  });
}

let totalErrors = 0;
walk('./src', fp => {
  totalErrors += checkFile(fp);
});

if (totalErrors > 0) {
  console.log(`\nFound ${totalErrors} potential invariant violations.`);
} else {
  console.log('\nAll ECS invariants passed.');
}
