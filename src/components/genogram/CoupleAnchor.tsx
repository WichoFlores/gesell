import { Handle, Position } from "@xyflow/react";

export function CoupleAnchor() {
  return (
    <div
      style={{ width: 1, height: 1, position: "relative", pointerEvents: "none" }}
    >
      <Handle
        type="target"
        position={Position.Left}
        id="left"
        className="!h-1 !w-1 !border-0 !bg-transparent"
      />
      <Handle
        type="target"
        position={Position.Right}
        id="right"
        className="!h-1 !w-1 !border-0 !bg-transparent"
      />
      <Handle
        type="source"
        position={Position.Bottom}
        id="bottom"
        className="!h-1 !w-1 !border-0 !bg-transparent"
      />
      <Handle
        type="target"
        position={Position.Top}
        id="top"
        className="!h-1 !w-1 !border-0 !bg-transparent"
      />
    </div>
  );
}
