import { readFile, writeFile } from "node:fs/promises";
import ts from "typescript";

// The Node ingress and the Worker/proxy share one policy source.
const source = await readFile("app/runtime/web-security.ts", "utf8");
const output = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
}).outputText;
await writeFile("dist/standalone/web-security.mjs", output);
