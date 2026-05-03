import { Handle, Position, type NodeProps } from "@xyflow/react";
import type { PersonNodeData } from "./layout";

const SHAPE_SIZE = 56;
const SHAPE_CENTER = SHAPE_SIZE / 2;

const HIDDEN_HANDLE = "!h-1 !w-1 !border-0 !bg-transparent";

export function PersonNode({ data }: NodeProps & { data: PersonNodeData }) {
  const accent = data.isPatient ? "var(--color-accent)" : "var(--color-fg)";
  const fill = "var(--color-bg)";

  return (
    <div
      className={`flex w-[120px] flex-col items-center gap-1.5 ${data.isPatient ? "" : "cursor-pointer"}`}
    >
      <Handle
        type="target"
        position={Position.Top}
        id="top"
        className={HIDDEN_HANDLE}
        style={{ top: 0, left: "50%" }}
      />
      <Handle
        type="source"
        position={Position.Left}
        id="left"
        className={HIDDEN_HANDLE}
        style={{ top: SHAPE_CENTER, left: `calc(50% - ${SHAPE_SIZE / 2}px)` }}
      />
      <Handle
        type="source"
        position={Position.Right}
        id="right"
        className={HIDDEN_HANDLE}
        style={{ top: SHAPE_CENTER, left: `calc(50% + ${SHAPE_SIZE / 2}px)` }}
      />
      <div className="relative" style={{ width: SHAPE_SIZE, height: SHAPE_SIZE }}>
        <Shape
          gender={data.gender}
          size={SHAPE_SIZE}
          stroke={accent}
          fill={fill}
          highlighted={data.isPatient}
        />
        {data.age != null ? (
          <span
            className="pointer-events-none absolute inset-0 flex items-center justify-center font-medium tabular-nums"
            style={{
              color: "var(--color-fg)",
              fontSize: 16,
              lineHeight: 1,
            }}
          >
            {data.age}
          </span>
        ) : null}
      </div>
      <div
        className="max-w-full truncate text-center text-xs"
        title={data.name}
        style={{ color: "var(--color-fg)" }}
      >
        {data.name || "—"}
      </div>
      <Handle
        type="source"
        position={Position.Bottom}
        id="bottom"
        className={HIDDEN_HANDLE}
        style={{ top: SHAPE_SIZE, left: "50%" }}
      />
    </div>
  );
}

function Shape({
  gender,
  size,
  stroke,
  fill,
  highlighted,
}: {
  gender: PersonNodeData["gender"];
  size: number;
  stroke: string;
  fill: string;
  highlighted: boolean;
}) {
  // Keep SVG dimensions constant so all shape centers align horizontally
  // (couple lines stay perfectly horizontal). Highlight ring is drawn
  // *inside* the SVG bounds rather than expanding it.
  const sw = highlighted ? 2.5 : 1.5;
  const innerInset = highlighted ? 5 : 0;
  const c = size / 2;

  if (gender === "male") {
    const inner = size - innerInset * 2;
    return (
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {highlighted ? (
          <rect
            x={1}
            y={1}
            width={size - 2}
            height={size - 2}
            rx={4}
            fill="none"
            stroke={stroke}
            strokeOpacity={0.3}
            strokeWidth={1}
          />
        ) : null}
        <rect
          x={innerInset + sw / 2}
          y={innerInset + sw / 2}
          width={inner - sw}
          height={inner - sw}
          rx={3}
          fill={fill}
          stroke={stroke}
          strokeWidth={sw}
        />
      </svg>
    );
  }
  if (gender === "female") {
    const r = (size - innerInset * 2 - sw) / 2;
    return (
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {highlighted ? (
          <circle
            cx={c}
            cy={c}
            r={c - 1}
            fill="none"
            stroke={stroke}
            strokeOpacity={0.3}
            strokeWidth={1}
          />
        ) : null}
        <circle
          cx={c}
          cy={c}
          r={r}
          fill={fill}
          stroke={stroke}
          strokeWidth={sw}
        />
      </svg>
    );
  }
  // diamond — unknown / "other"
  const half = (size - innerInset * 2 - sw) / 2;
  const points = [
    [c, c - half],
    [c + half, c],
    [c, c + half],
    [c - half, c],
  ]
    .map((p) => p.join(","))
    .join(" ");
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      {highlighted ? (
        <polygon
          points={[
            [c, 1],
            [size - 1, c],
            [c, size - 1],
            [1, c],
          ]
            .map((p) => p.join(","))
            .join(" ")}
          fill="none"
          stroke={stroke}
          strokeOpacity={0.3}
          strokeWidth={1}
        />
      ) : null}
      <polygon
        points={points}
        fill={fill}
        stroke={stroke}
        strokeWidth={sw}
      />
    </svg>
  );
}
