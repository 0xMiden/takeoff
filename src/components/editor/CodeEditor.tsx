import { useCallback, useRef } from "react";
import Editor, { type OnMount } from "@monaco-editor/react";
import type { editor as MonacoEditor } from "monaco-editor";
import { usePlaygroundStore } from "@/store/usePlaygroundStore";
import { TAKEOFF_THEME, THEME_NAME } from "./editorTheme";
import { EditorTabs } from "./EditorTabs";
import { setMonacoInstance } from "@/hooks/useCompile";

const LANGUAGE_MAP: Record<string, string> = {
  rust: "rust",
  typescript: "typescript",
  typescriptreact: "typescript",
  toml: "toml",
  json: "json",
  css: "css",
};

export function CodeEditor() {
  const activeFile = usePlaygroundStore((s) => s.activeFile);
  const files = usePlaygroundStore((s) => s.getFiles());
  const updateFile = usePlaygroundStore((s) => s.updateFile);
  const editorRef = useRef<MonacoEditor.IStandaloneCodeEditor | null>(null);

  const file = activeFile ? files.get(activeFile) : null;
  const language = file ? LANGUAGE_MAP[file.language] ?? "plaintext" : "plaintext";

  const handleMount: OnMount = useCallback((editor, monaco) => {
    editorRef.current = editor;
    setMonacoInstance(monaco);
    monaco.editor.defineTheme(THEME_NAME, TAKEOFF_THEME);
    monaco.editor.setTheme(THEME_NAME);

    // Configure TypeScript to understand JSX and not flag it as errors
    monaco.languages.typescript.typescriptDefaults.setCompilerOptions({
      jsx: monaco.languages.typescript.JsxEmit.ReactJSX,
      target: monaco.languages.typescript.ScriptTarget.ESNext,
      module: monaco.languages.typescript.ModuleKind.ESNext,
      moduleResolution: monaco.languages.typescript.ModuleResolutionKind.NodeJs,
      allowNonTsExtensions: true,
      allowJs: true,
      esModuleInterop: true,
      noEmit: true,
    });

    // Suppress all diagnostics for now — the preview eval is the real validator
    monaco.languages.typescript.typescriptDefaults.setDiagnosticsOptions({
      noSemanticValidation: true,
      noSyntaxValidation: false,
    });

    editor.updateOptions({
      fontFamily: "'JetBrains Mono', monospace",
      fontSize: 13,
      lineHeight: 20,
      minimap: { enabled: false },
      scrollBeyondLastLine: false,
      renderLineHighlight: "line",
      cursorBlinking: "smooth",
      cursorSmoothCaretAnimation: "on",
      smoothScrolling: true,
      padding: { top: 12, bottom: 12 },
      bracketPairColorization: { enabled: true },
      guides: { bracketPairs: true },
    });
  }, []);

  const handleChange = useCallback(
    (value: string | undefined) => {
      if (activeFile && value !== undefined) {
        updateFile(activeFile, value);
      }
    },
    [activeFile, updateFile]
  );

  return (
    <div className="h-full w-full flex flex-col overflow-hidden">
      <EditorTabs />
      <div className="flex-1 overflow-hidden">
        {file ? (
          <Editor
            theme={THEME_NAME}
            language={language}
            value={file.content}
            onChange={handleChange}
            onMount={handleMount}
            options={{
              readOnly: false,
              automaticLayout: true,
            }}
            loading={
              <div className="h-full w-full flex items-center justify-center text-muted-foreground/40 text-sm">
                Loading editor...
              </div>
            }
          />
        ) : (
          <div className="h-full w-full flex items-center justify-center text-muted-foreground/30 text-sm">
            Open a file from the explorer
          </div>
        )}
      </div>
    </div>
  );
}
