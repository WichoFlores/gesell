import { Handle, Position, type NodeProps } from "@xyflow/react";
import type { CSSProperties } from "react";
import type { SnippetNodeData } from "./layout";

const HIDDEN = "!h-1 !w-1 !border-0 !bg-transparent";

export function SnippetNode({ data }: NodeProps & { data: SnippetNodeData }) {
  const markClass = `tn-mark-${data.markId}`;
  // The CSS picks colors off the --mm-color custom property so the same
  // stylesheet works for every mark.
  const styleVar = {
    "--mm-color": `var(--mark-${data.markId}-color)`,
    maxWidth: 240,
  } as CSSProperties;

  return (
    <div
      className="mindmap-snippet rounded-full px-4 py-2 text-xs leading-snug"
      style={styleVar}
      title={data.text}
    >
      <Handle type="target" position={Position.Top} id="top" className={HIDDEN} />
      <Handle type="target" position={Position.Right} id="right" className={HIDDEN} />
      <Handle type="target" position={Position.Bottom} id="bottom" className={HIDDEN} />
      <Handle type="target" position={Position.Left} id="left" className={HIDDEN} />
      <span className={markClass}>{data.text}</span>
    </div>
  );
}
