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
