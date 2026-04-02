import { FileExplorer } from "@/components/explorer/FileExplorer";
import { ContractList } from "@/components/explorer/ContractList";

export function LeftSidebar() {
  return (
    <div className="glass-panel h-full w-full flex flex-col overflow-hidden border-r">
      <FileExplorer />
      <ContractList />
    </div>
  );
}
