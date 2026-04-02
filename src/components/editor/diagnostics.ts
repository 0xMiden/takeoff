import type { editor } from "monaco-editor";

const MarkerSeverity = {
  Error: 8,
  Warning: 4,
} as const;

const ERROR_LINE_RE = /^(error|warning)(\[E\d+\])?: (.+)$/;

export function parseCargoOutput(output: string): editor.IMarkerData[] {
  const lines = output.split("\n");
  const markers: editor.IMarkerData[] = [];

  for (let i = 0; i < lines.length; i++) {
    const pointerMatch = lines[i].match(/^\s*-->\s+(.+?):(\d+):(\d+)/);
    if (!pointerMatch) continue;

    // Look back for the error/warning line (usually 1-2 lines above)
    let level: "error" | "warning" = "error";
    let message = "Unknown error";
    for (let j = i - 1; j >= Math.max(0, i - 3); j--) {
      const errMatch = lines[j].match(ERROR_LINE_RE);
      if (errMatch) {
        level = errMatch[1] as "error" | "warning";
        message = errMatch[3];
        break;
      }
    }

    markers.push({
      severity:
        level === "error" ? MarkerSeverity.Error : MarkerSeverity.Warning,
      message,
      startLineNumber: parseInt(pointerMatch[2]),
      startColumn: parseInt(pointerMatch[3]),
      endLineNumber: parseInt(pointerMatch[2]),
      endColumn: parseInt(pointerMatch[3]) + 1,
    });
  }

  return markers;
}
