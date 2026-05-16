import { Handle, Position, type NodeProps } from "@xyflow/react";
import type { PatientNodeData } from "./layout";

const HIDDEN = "!h-1 !w-1 !border-0 !bg-transparent";

export function PatientNode({ data }: NodeProps & { data: PatientNodeData }) {
  return (
    <div className="mindmap-patient-wrap">
      <div
        className="mindmap-patient flex items-center justify-center rounded-full px-6 py-3.5"
        style={{ width: 180, height: 84 }}
      >
        <Handle type="source" position={Position.Top} id="top" className={HIDDEN} />
        <Handle type="source" position={Position.Right} id="right" className={HIDDEN} />
        <Handle type="source" position={Position.Bottom} id="bottom" className={HIDDEN} />
        <Handle type="source" position={Position.Left} id="left" className={HIDDEN} />
        <div
          className="truncate text-center text-sm font-semibold tracking-tight"
          style={{
            color: "var(--color-fg)",
            textShadow:
              "0 0 14px color-mix(in srgb, var(--color-accent) 35%, transparent)",
          }}
          title={data.name}
        >
          {data.name}
        </div>
      </div>
    </div>
  );
}
