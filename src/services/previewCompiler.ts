import * as MidenReact from "@miden-sdk/react";
import * as React from "react";
import { transform } from "sucrase";
import { init, parse } from "es-module-lexer";

const MODULE_MAP: Record<string, unknown> = {
  "@miden-sdk/react": MidenReact,
  react: React,
};

let lexerReady = false;

export async function compileComponent(
  code: string
): Promise<React.ComponentType> {
  // Ensure es-module-lexer WASM is initialized
  if (!lexerReady) {
    await init;
    lexerReady = true;
  }

  // Step 1: Sucrase transpile TSX→JS (preserving import statements)
  const transpiled = transform(code, {
    transforms: ["typescript", "jsx"],
    jsxRuntime: "automatic",
    production: true,
  }).code;

  // Step 2: Parse imports with es-module-lexer
  const [imports] = parse(transpiled);

  // Step 3: Collect import bindings and build injection code
  const moduleArgs: string[] = [];
  const moduleValues: unknown[] = [];
  let strippedCode = transpiled;

  // Process imports in reverse order so string indices stay valid
  const sortedImports = [...imports].sort((a, b) => b.ss - a.ss);

  for (const imp of sortedImports) {
    const source = imp.n;
    if (!source) continue;

    const mod = MODULE_MAP[source];
    if (!mod) {
      throw new Error(
        `Unknown module "${source}". Only these are available in the preview: ${Object.keys(MODULE_MAP).join(", ")}`
      );
    }

    // Extract the full import statement text
    const importStatement = transpiled.slice(imp.ss, imp.se);

    // Parse what's being imported from the statement
    const argName = `__mod_${moduleArgs.length}`;
    moduleArgs.push(argName);
    moduleValues.push(mod);

    // Build destructuring from the import statement
    const bindings = extractBindings(importStatement, argName);

    // Replace the import statement with variable declarations
    strippedCode =
      strippedCode.slice(0, imp.ss) + bindings + strippedCode.slice(imp.se);
  }

  // Step 4: Handle JSX runtime imports that Sucrase adds
  // Sucrase with jsxRuntime: "automatic" adds: import { jsx, jsxs, Fragment } from "react/jsx-runtime"
  // We need to provide these
  const jsxRuntimeCode = `
const { createElement, Fragment } = __React;
const jsx = (type, props, key) => __React.createElement(type, { ...props, key });
const jsxs = jsx;
`;

  // Step 5: Wrap in a function and execute
  const wrappedCode = `
${jsxRuntimeCode}
${strippedCode}

return typeof App !== 'undefined' ? App :
       typeof __default !== 'undefined' ? __default :
       (() => { throw new Error('No default export found. Export a default function component.'); })();
`;

  const fn = new Function("__React", ...moduleArgs, wrappedCode);
  const Component = fn(React, ...moduleValues);

  if (typeof Component !== "function") {
    throw new Error(
      "Default export is not a function component. Make sure to export a React function component."
    );
  }

  return Component;
}

function extractBindings(importStatement: string, argName: string): string {
  // Handle: import { a, b as c } from "..."
  const namedMatch = importStatement.match(
    /import\s*\{([^}]+)\}\s*from\s*/
  );
  if (namedMatch) {
    const specs = namedMatch[1]
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

    const bindings = specs
      .map((spec) => {
        const [orig, alias] = spec.split(/\s+as\s+/).map((s) => s.trim());
        const localName = alias ?? orig;
        return `const ${localName} = ${argName}["${orig}"];`;
      })
      .join("\n");

    // Also check for default import before the braces
    const defaultMatch = importStatement.match(
      /import\s+(\w+)\s*,\s*\{/
    );
    if (defaultMatch) {
      return `const ${defaultMatch[1]} = ${argName}.default ?? ${argName};\n${bindings}`;
    }

    return bindings;
  }

  // Handle: import Name from "..."
  const defaultMatch = importStatement.match(
    /import\s+(\w+)\s+from\s*/
  );
  if (defaultMatch) {
    return `const ${defaultMatch[1]} = ${argName}.default ?? ${argName};`;
  }

  // Handle: import * as Name from "..."
  const starMatch = importStatement.match(
    /import\s*\*\s*as\s+(\w+)\s+from\s*/
  );
  if (starMatch) {
    return `const ${starMatch[1]} = ${argName};`;
  }

  // Side-effect import: import "..."
  return `/* side-effect import: ${argName} */`;
}
