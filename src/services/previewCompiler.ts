import * as MidenReact from "@miden-sdk/react";
import * as MidenSdk from "@miden-sdk/miden-sdk";
import * as React from "react";
import { transform } from "sucrase";

const MODULE_MAP: Record<string, unknown> = {
  "@miden-sdk/react": MidenReact,
  "@miden-sdk/miden-sdk": MidenSdk,
  react: React,
};

// Regex to match import statements (handles multiline)
const IMPORT_RE =
  /^import\s+(?:(?:\{[^}]*\}|\*\s+as\s+\w+|\w+)(?:\s*,\s*(?:\{[^}]*\}|\*\s+as\s+\w+))?)\s+from\s+["']([^"']+)["'];?\s*$/gm;

interface ParsedImport {
  fullMatch: string;
  bindings: string; // everything between `import` and `from`
  source: string; // module name
}

function parseImports(code: string): { imports: ParsedImport[]; codeWithoutImports: string } {
  const imports: ParsedImport[] = [];
  const codeWithoutImports = code.replace(IMPORT_RE, (fullMatch, source) => {
    // Extract bindings: everything between "import " and " from"
    const bindingsMatch = fullMatch.match(/^import\s+([\s\S]+?)\s+from\s+/);
    const bindings = bindingsMatch ? bindingsMatch[1].trim() : "";
    imports.push({ fullMatch, bindings, source });
    return ""; // Remove import from code
  });
  return { imports, codeWithoutImports };
}

function buildBindings(bindings: string, argName: string): string {
  // Handle: { a, b as c }
  const namedMatch = bindings.match(/\{([^}]+)\}/);
  const defaultMatch = bindings.match(/^(\w+)/);
  const starMatch = bindings.match(/\*\s+as\s+(\w+)/);

  const parts: string[] = [];

  // Check for default import before braces: `Name, { a, b }`
  if (namedMatch) {
    const specs = namedMatch[1]
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

    for (const spec of specs) {
      const [orig, alias] = spec.split(/\s+as\s+/).map((s) => s.trim());
      const localName = alias ?? orig;
      parts.push(`const ${localName} = ${argName}["${orig}"];`);
    }

    // Default import before braces
    const preDefault = bindings.match(/^(\w+)\s*,\s*\{/);
    if (preDefault) {
      parts.unshift(`const ${preDefault[1]} = ${argName}.default ?? ${argName};`);
    }
  } else if (starMatch) {
    parts.push(`const ${starMatch[1]} = ${argName};`);
  } else if (defaultMatch) {
    parts.push(`const ${defaultMatch[1]} = ${argName}.default ?? ${argName};`);
  }

  return parts.join("\n");
}

export async function compileComponent(
  code: string
): Promise<React.ComponentType> {
  // Step 1: Parse and extract imports from raw source (before Sucrase)
  const { imports, codeWithoutImports } = parseImports(code);

  // Step 2: Sucrase transpile the remaining code (TSX → JS)
  const transpiled = transform(codeWithoutImports, {
    transforms: ["typescript", "jsx"],
    jsxRuntime: "classic",
    production: true,
  }).code;

  // Step 3: Build module injection from parsed imports
  const moduleArgs: string[] = [];
  const moduleValues: unknown[] = [];

  for (const imp of imports) {
    const mod = MODULE_MAP[imp.source];
    if (!mod) {
      throw new Error(
        `Unknown module "${imp.source}". Only these are available in the preview: ${Object.keys(MODULE_MAP).join(", ")}`
      );
    }

    const argName = `__mod_${moduleArgs.length}`;
    moduleArgs.push(argName);
    moduleValues.push(mod);
  }

  // Step 4: Build variable declarations from import bindings
  const bindingCode = imports
    .map((imp, i) => buildBindings(imp.bindings, `__mod_${i}`))
    .join("\n");

  // Step 5: Strip export statements
  let strippedCode = transpiled
    .replace(/export\s+default\s+function\s+/g, "function ")
    .replace(/export\s+default\s+/g, "const __default = ")
    .replace(/export\s+function\s+/g, "function ")
    .replace(/export\s+const\s+/g, "const ")
    .replace(/export\s+\{[^}]*\};?/g, "");

  // Step 6: Wrap and execute
  const wrappedCode = `
const React = __React;
${bindingCode}
${strippedCode}

return typeof App !== 'undefined' ? App :
       typeof __default !== 'undefined' ? __default :
       (() => { throw new Error('No default export found. Export a default function component.'); })();
`;

  let fn: Function;
  try {
    fn = new Function("__React", ...moduleArgs, wrappedCode);
  } catch (e) {
    console.error("Preview compile error in generated code:");
    console.error(wrappedCode);
    throw e;
  }
  const Component = fn(React, ...moduleValues);

  if (typeof Component !== "function") {
    throw new Error(
      "Default export is not a function component. Make sure to export a React function component."
    );
  }

  return Component;
}
