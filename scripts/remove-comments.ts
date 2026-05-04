import { Project, SyntaxKind } from "ts-morph";

const project = new Project({
  tsConfigFilePath: "tsconfig.json",
});

const sourceFiles = project.getSourceFiles([
  "src/**/*.{ts,tsx}",
  "!**/*.d.ts",
]);

for (const sourceFile of sourceFiles) {
  const fullText = sourceFile.getFullText();

  const ranges = [
    ...sourceFile.getDescendantsOfKind(SyntaxKind.SingleLineCommentTrivia),
    ...sourceFile.getDescendantsOfKind(SyntaxKind.MultiLineCommentTrivia),
  ]
    .map((node) => [node.getPos(), node.getEnd()] as const)
    .sort((a, b) => b[0] - a[0]);

  let updatedText = fullText;

  for (const [start, end] of ranges) {
    updatedText =
      updatedText.slice(0, start) +
      updatedText.slice(end);
  }

  sourceFile.replaceWithText(updatedText);
}

project.saveSync();

console.log("Comentarios eliminados.");