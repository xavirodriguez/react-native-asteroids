import * as fs from 'fs';
import * as path from 'path';

function checkFile(filePath: string) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');

  lines.forEach((line, index) => {
    // Check for direct property assignments that look like component mutations
    // This is a naive regex and might have false positives, but it's a good guardrail.
    // We look for patterns like 'comp.x =' where 'comp' is likely a component reference.
    if (line.match(/\w+\.(x|y|rotation|remaining|dx|dy|current|max)\s*(\+|-)?=/)) {
        // Exempt some common local variable names or known safe contexts if needed
        if (!line.includes('const ') && !line.includes('let ') && !line.includes('mutateComponent')) {
            console.warn(`[ECS Invariant] Potential direct mutation at ${filePath}:${index + 1}: ${line.trim()}`);
        }
    }

    // Check for eventBus.emit in simulation
    if (filePath.includes('src/simulation/') && line.includes('eventBus.emit(')) {
        console.error(`[ECS Invariant] Illegal synchronous event emission at ${filePath}:${index + 1}: ${line.trim()}`);
    }
  });
}

function walkDir(dir: string) {
  const files = fs.readdirSync(dir);
  files.forEach(file => {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      walkDir(fullPath);
    } else if (fullPath.endsWith('.ts') && !fullPath.includes('.test.ts')) {
      checkFile(fullPath);
    }
  });
}

const targetDirs = ['src/engine/systems', 'src/simulation'];
targetDirs.forEach(dir => {
    const fullDir = path.resolve(process.cwd(), dir);
    if (fs.existsSync(fullDir)) {
        walkDir(fullDir);
    }
});
