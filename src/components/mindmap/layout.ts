import type { Edge, Node } from "@xyflow/react";
import type { Patient, Session } from "@/db/schema";
import type { MarkDefinition } from "@/marks/types";
import { extractSnippets } from "./extract";

const PATIENT_W = 160;
const PATIENT_H = 80;
const PIVOT_RADIUS = 260;
const SNIPPET_RADIUS = 560;
const SNIPPET_SPACING = 170;

export type PatientNodeData = { name: string };
export type ClusterPivotData = Record<string, never>;
export type SnippetNodeData = { markId: string; text: string };

export function buildMindMap(
  patient: Patient,
  sessions: Session[],
  markDefs: MarkDefinition[],
): { nodes: Node[]; edges: Edge[] } {
  const byMark = new Map<string, string[]>();
  for (const session of sessions) {
    const snippets = extractSnippets(session.doc, session.id);
    for (const s of snippets) {
      const list = byMark.get(s.markId);
      if (list) list.push(s.text);
      else byMark.set(s.markId, [s.text]);
    }
  }

  const activeDefs = markDefs.filter(
    (d) => (byMark.get(d.id)?.length ?? 0) > 0,
  );

  const nodes: Node[] = [];
  const edges: Edge[] = [];

  nodes.push({
    id: "patient",
    type: "mindmap-patient",
    position: { x: -PATIENT_W / 2, y: -PATIENT_H / 2 },
    data: { name: patient.name || "—" },
  });

  const total = activeDefs.length;
  if (total === 0) return { nodes, edges };

  for (let i = 0; i < total; i++) {
    const def = activeDefs[i];
    const snippets = byMark.get(def.id) ?? [];
    const angle = (i / total) * 2 * Math.PI - Math.PI / 2;
    const cosA = Math.cos(angle);
    const sinA = Math.sin(angle);
    const perpX = -sinA;
    const perpY = cosA;

    // Invisible pivot node — acts as the cluster's anchor on the canvas.
    // Patient -> pivot is the "one main line per cluster".
    const pivotId = `pivot:${def.id}`;
    const pivotX = cosA * PIVOT_RADIUS;
    const pivotY = sinA * PIVOT_RADIUS;
    nodes.push({
      id: pivotId,
      type: "mindmap-pivot",
      position: { x: pivotX - 0.5, y: pivotY - 0.5 },
      data: {},
    });

    edges.push({
      id: `patient->${pivotId}`,
      source: "patient",
      sourceHandle: pickPatientHandle(angle),
      target: pivotId,
      type: "straight",
      className: `mm-tendril mm-tendril-${def.id}`,
      // Width / opacity governed by CSS so trunk + branch share the exact
      // same look. Stroke color is the only inline style.
      style: { stroke: `var(--mark-${def.id}-color)` },
    });

    // Snippet nodes spread perpendicular to the cluster direction at SNIPPET_RADIUS.
    const n = snippets.length;
    for (let j = 0; j < n; j++) {
      const spread = (j - (n - 1) / 2) * SNIPPET_SPACING;
      const sx = cosA * SNIPPET_RADIUS + perpX * spread;
      const sy = sinA * SNIPPET_RADIUS + perpY * spread;

      const sid = `snippet:${def.id}:${j}`;
      nodes.push({
        id: sid,
        type: "mindmap-snippet",
        // Placement is the center; node component sets its own size.
        position: { x: sx, y: sy },
        data: { markId: def.id, text: snippets[j] },
      });

      edges.push({
        id: `${pivotId}->${sid}`,
        source: pivotId,
        target: sid,
        type: "straight",
        className: `mm-tendril mm-tendril-${def.id}`,
        style: { stroke: `var(--mark-${def.id}-color)` },
      });
    }
  }

  return { nodes, edges };
}

function pickPatientHandle(angle: number): string {
  const deg = ((angle * 180) / Math.PI + 360) % 360;
  if (deg >= 315 || deg < 45) return "right";
  if (deg < 135) return "bottom";
  if (deg < 225) return "left";
  return "top";
}
