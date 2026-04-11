import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function enrichDocs() {
  const docsPath = path.join(__dirname, '../docs/api');
  if (!fs.existsSync(docsPath)) {
    console.warn('Docs path not found. Run docs:generate first.');
    return;
  }

  const files = fs.readdirSync(docsPath).filter(f => f.endsWith('.md'));

  for (const file of files) {
    const filePath = path.join(docsPath, file);
    let content = fs.readFileSync(filePath, 'utf8');

    if (!content.includes('AI Insight')) {
      const enrichment = `\n\n> [!NOTE]\n> **AI Insight (Auto-generated)**: This component is a core part of the ECS engine. Ensure you understand its performance implications and data locality before making changes.\n`;
      content += enrichment;
      fs.writeFileSync(filePath, content);
      console.log(`Enriched ${file}`);
    }
  }

  console.log('Documentation enrichment complete.');
}

enrichDocs().catch(console.error);
