const fs = require("fs");
const path = require("path");
const { promisify } = require("util");
const glob = promisify(require("glob")); // Necesitarás instalar glob: npm install glob

async function fixTSDoc() {
  // 1. Definir los patrones a buscar y sus reemplazos (escapado)
  // Buscamos > , } y < que no estén precedidos por un backslash \
  const rules = [
    { name: "Greater Than", regex: /(?<!\\)>/g, replace: "\\>" },
    { name: "Right Brace", regex: /(?<!\\)}/g, replace: "\\}" },
    { name: "Less Than", regex: /(?<!\\)</g, replace: "\\<" },
  ];

  // 2. Buscar todos los archivos .d.ts en la carpeta temp/declarations
  const files = await glob("temp/declarations/**/*.d.ts");

  files.forEach((filePath) => {
    let content = fs.readFileSync(filePath, "utf8");

    // Solo aplicamos los cambios DENTRO de bloques de comentarios JSDoc/TSDoc
    const fixedContent = content.replace(/\/\*\*([\s\S]*?)\*\//g, (match) => {
      let cleanedBlock = match;
      rules.forEach((rule) => {
        cleanedBlock = cleanedBlock.replace(rule.regex, rule.replace);
      });

      // Corrección extra: Si escapamos por error una etiqueta válida como {@link}, la restauramos
      cleanedBlock = cleanedBlock.replace(/\\{@/g, "{@");

      return cleanedBlock;
    });

    if (content !== fixedContent) {
      fs.writeFileSync(filePath, fixedContent);
      console.log(`✅ Corregido: ${filePath}`);
    }
  });
}

fixTSDoc().catch(console.error);
