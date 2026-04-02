import { Allotment } from "allotment";
import "allotment/dist/style.css";
import { usePlaygroundStore } from "@/store/usePlaygroundStore";
import { LeftSidebar } from "./LeftSidebar";
import { CodeEditor } from "@/components/editor/CodeEditor";
import { ConsolePanel } from "@/components/console/ConsolePanel";
import { ChatPanel } from "@/components/chat/ChatPanel";
import { PreviewPane } from "@/components/preview/PreviewPane";

export function PanelLayout() {
  const mode = usePlaygroundStore((s) => s.mode);

  return (
    <div className="flex-1 overflow-hidden">
      <Allotment>
        {/* Left sidebar */}
        <Allotment.Pane minSize={180} maxSize={350} preferredSize={240}>
          <LeftSidebar />
        </Allotment.Pane>

        {/* Center: workspace + console */}
        <Allotment.Pane>
          <Allotment vertical>
            <Allotment.Pane minSize={200}>
              <div className="h-full w-full overflow-hidden">
                {mode === "contracts" ? (
                  <CodeEditor />
                ) : (
                  <Allotment>
                    <Allotment.Pane minSize={200}>
                      <CodeEditor />
                    </Allotment.Pane>
                    <Allotment.Pane minSize={200}>
                      <PreviewPane />
                    </Allotment.Pane>
                  </Allotment>
                )}
              </div>
            </Allotment.Pane>
            <Allotment.Pane minSize={80} preferredSize={160}>
              <ConsolePanel />
            </Allotment.Pane>
          </Allotment>
        </Allotment.Pane>

        {/* Right: chat */}
        <Allotment.Pane minSize={280} maxSize={500} preferredSize={340}>
          <ChatPanel />
        </Allotment.Pane>
      </Allotment>
    </div>
  );
}
