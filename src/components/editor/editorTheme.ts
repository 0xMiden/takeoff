import type { editor } from "monaco-editor";

export const TAKEOFF_THEME: editor.IStandaloneThemeData = {
  base: "vs-dark",
  inherit: true,
  rules: [
    { token: "comment", foreground: "4a5568", fontStyle: "italic" },
    { token: "keyword", foreground: "4ade80" },
    { token: "string", foreground: "fbbf24" },
    { token: "number", foreground: "c084fc" },
    { token: "type", foreground: "38bdf8" },
    { token: "function", foreground: "f472b6" },
  ],
  colors: {
    "editor.background": "#0a0c14",
    "editor.foreground": "#e2e8f0",
    "editor.lineHighlightBackground": "#ffffff06",
    "editor.selectionBackground": "#4ade8020",
    "editor.inactiveSelectionBackground": "#4ade8010",
    "editorLineNumber.foreground": "#4a556840",
    "editorLineNumber.activeForeground": "#4a5568",
    "editorCursor.foreground": "#4ade80",
    "editorIndentGuide.background": "#ffffff08",
    "editorIndentGuide.activeBackground": "#ffffff15",
    "editor.selectionHighlightBackground": "#4ade8010",
    "editorWidget.background": "#0d1017",
    "editorWidget.border": "#ffffff10",
    "editorSuggestWidget.background": "#0d1017",
    "editorSuggestWidget.border": "#ffffff10",
    "editorSuggestWidget.selectedBackground": "#4ade8015",
    "scrollbarSlider.background": "#ffffff08",
    "scrollbarSlider.hoverBackground": "#ffffff12",
    "scrollbarSlider.activeBackground": "#ffffff18",
  },
};

export const THEME_NAME = "takeoff-dark";
