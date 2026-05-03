import { useCallback, useMemo } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import {
  Background,
  Controls,
  ReactFlow,
  ReactFlowProvider,
  type Node,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { db } from "@/db";
import { useUI } from "@/store/ui";
import { PersonNode } from "./genogram/PersonNode";
import { CoupleAnchor } from "./genogram/CoupleAnchor";
import { buildGenogram } from "./genogram/layout";

const NODE_TYPES = { person: PersonNode, "couple-anchor": CoupleAnchor };

export function Genogram() {
  return (
    <ReactFlowProvider>
      <GenogramInner />
    </ReactFlowProvider>
  );
}

function GenogramInner() {
  const activePatientId = useUI((s) => s.activePatientId);
  const toggleFamilyPanel = useUI((s) => s.toggleFamilyPanel);
  const openFamilyDetail = useUI((s) => s.openFamilyDetail);

  const patient = useLiveQuery(
    () =>
      activePatientId ? db.patients.get(activePatientId) : undefined,
    [activePatientId],
  );

  const handleNodeClick = useCallback(
    (_e: React.MouseEvent, node: Node) => {
      if (node.type !== "person") return;
      if (node.id === patient?.id) return;
      if (!useUI.getState().familyPanelOpen) toggleFamilyPanel();
      openFamilyDetail(node.id);
    },
    [patient?.id, toggleFamilyPanel, openFamilyDetail],
  );

  const members = useLiveQuery(
    () =>
      activePatientId
        ? db.family_members
            .where("patientId")
            .equals(activePatientId)
            .sortBy("name")
        : [],
    [activePatientId],
    [],
  );

  const { nodes, edges } = useMemo(() => {
    if (!patient) return { nodes: [], edges: [] };
    return buildGenogram(patient, members ?? []);
  }, [patient, members]);

  if (!patient) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-[color:var(--color-muted)]">
        Loading…
      </div>
    );
  }

  if ((members?.length ?? 0) === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-2 text-center text-sm text-[color:var(--color-muted)]">
        <span>No family members yet.</span>
        <span className="text-xs">
          Open the family panel (Cmd-Shift-F) and press <kbd>n</kbd> to add
          someone — they&apos;ll show up here.
        </span>
      </div>
    );
  }

  return (
    <div className="h-full w-full">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={NODE_TYPES}
        fitView
        fitViewOptions={{ padding: 0.25 }}
        proOptions={{ hideAttribution: true }}
        nodesDraggable={false}
        nodesConnectable={false}
        elementsSelectable
        panOnDrag
        zoomOnScroll
        onNodeClick={handleNodeClick}
      >
        <Background gap={20} size={1} color="var(--color-border)" />
        <Controls
          showInteractive={false}
          className="!border !border-[color:var(--color-border)] !bg-[color:var(--color-bg)]"
        />
      </ReactFlow>
    </div>
  );
}
