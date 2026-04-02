import { AlertTriangle } from "lucide-react";

interface ErrorOverlayProps {
  error: Error | string | null;
}

export function ErrorOverlay({ error }: ErrorOverlayProps) {
  if (!error) return null;

  const message =
    typeof error === "string" ? error : error.message ?? "Unknown error";

  return (
    <div className="h-full w-full flex flex-col items-center justify-center p-6 bg-red-500/[0.03] backdrop-blur-sm">
      <AlertTriangle className="h-8 w-8 text-red-400/60 mb-3" />
      <div className="max-w-md text-center">
        <p className="text-sm font-medium text-red-400 mb-2">Preview Error</p>
        <pre className="text-xs text-red-300/70 font-mono whitespace-pre-wrap break-all bg-black/20 rounded-lg p-3 border border-red-500/10">
          {message}
        </pre>
      </div>
    </div>
  );
}
