import { readFile } from "node:fs/promises";
import ts from "typescript";

export async function resolve(specifier, context, nextResolve) {
  if (specifier === "cloudflare:workers") {
    const source = `export const env = new Proxy({}, {
      get(_target, key) {
        return globalThis.__CLOUDFLARE_TEST_ENV__?.[key];
      }
    });`;
    return {
      url: `data:text/javascript,${encodeURIComponent(source)}`,
      shortCircuit: true,
    };
  }
  return nextResolve(specifier, context);
}

// Tests also support the declared Node 22.13 minimum, before native type
// stripping became the default. Production builds use Vite, not this loader.
export async function load(url, context, nextLoad) {
  if (url.startsWith("file:") && new URL(url).pathname.endsWith(".ts")) {
    const source = await readFile(new URL(url), "utf8");
    return { format: "module", shortCircuit: true, source: ts.transpileModule(source, {
      compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
    }).outputText };
  }
  return nextLoad(url, context);
}
