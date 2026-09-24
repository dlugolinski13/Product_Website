// vi.mock() does not reliably intercept require() calls made from inside a CommonJS module
// (see CLAUDE.md — this is why the API stays CJS but tests can't rely on vi.mock for it).
// Instead, this loads a CJS module with specific dependencies swapped for fakes by temporarily
// overwriting Node's own require.cache before requiring it, then restoring the cache afterward.
export function loadWithMocks(nodeRequire, mocks, targetPath) {
  const savedEntries = {};
  for (const [specifier, exportsValue] of Object.entries(mocks)) {
    const resolved = nodeRequire.resolve(specifier);
    savedEntries[resolved] = nodeRequire.cache[resolved];
    nodeRequire.cache[resolved] = { id: resolved, filename: resolved, loaded: true, exports: exportsValue };
  }

  const resolvedTarget = nodeRequire.resolve(targetPath);
  delete nodeRequire.cache[resolvedTarget];
  const loaded = nodeRequire(resolvedTarget);
  delete nodeRequire.cache[resolvedTarget];

  for (const [resolved, original] of Object.entries(savedEntries)) {
    if (original === undefined) delete nodeRequire.cache[resolved];
    else nodeRequire.cache[resolved] = original;
  }

  return loaded;
}
