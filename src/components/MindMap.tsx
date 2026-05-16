import { useEffect, useMemo, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import {
  applyNodeChanges,
  Background,
  Controls,
  ReactFlow,
  ReactFlowProvider,
  type Edge,
  type Node,
  type NodeChange,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import "./mindmap/styles.css";
import { db } from "@/db";
import { useUI } from "@/store/ui";
import { useMarkDefs } from "@/store/marks";
import { PatientNode } from "./mindmap/PatientNode";
import { SnippetNode } from "./mindmap/SnippetNode";
import { ClusterPivot } from "./mindmap/ClusterPivot";
import { buildMindMap } from "./mindmap/layout";
import { preSettleLayout, useForceLayout } from "./mindmap/useForceLayout";

const NODE_TYPES = {
  "mindmap-patient": PatientNode,
  "mindmap-snippet": SnippetNode,
  "mindmap-pivot": ClusterPivot,
};

export function MindMap() {
  return (
    <ReactFlowProvider>
      <MindMapInner />
    </ReactFlowProvider>
  );
}

function MindMapInner() {
  const activePatientId = useUI((s) => s.activePatientId);
  const markDefs = useMarkDefs();

  const patient = useLiveQuery(
    () =>
      activePatientId ? db.patients.get(activePatientId) : undefined,
    [activePatientId],
  );

  const sessions = useLiveQuery(
    () =>
      activePatientId
        ? db.sessions.where("patientId").equals(activePatientId).toArray()
        : [],
    [activePatientId],
    [],
  );

  const initial = useMemo(() => {
    if (!patient) return { nodes: [] as Node[], edges: [] as Edge[] };
    const built = buildMindMap(patient, sessions ?? [], markDefs);
    // Pre-settle the layout silently so the very first React Flow paint
    // shows the calm balanced layout — no visible "snap" from the radial
    // initial positions to the simulated equilibrium.
    return { ...built, nodes: preSettleLayout(built.nodes, built.edges) };
  }, [patient, sessions, markDefs]);

  // Controlled nodes/edges so the force simulation can mutate positions on
  // each tick via React Flow's setNodes (called inside useForceLayout).
  const [nodes, setNodes] = useState<Node[]>(initial.nodes);
  const [edges, setEdges] = useState<Edge[]>(initial.edges);

  useEffect(() => {
    setNodes(initial.nodes);
    setEdges(initial.edges);
  }, [initial.nodes, initial.edges]);

  const hasContent = nodes.length > 1;

  if (!patient) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-[color:var(--color-muted)]">
        Loading…
      </div>
    );
  }

  if (!hasContent) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-2 text-center text-sm text-[color:var(--color-muted)]">
        <span>Nothing to map yet.</span>
        <span className="text-xs">
          Open a session and mark some text (Mod-Alt-C, Mod-Alt-D, …) — the
          mind map collects every marked snippet here.
        </span>
      </div>
    );
  }

  return <MindMapCanvas nodes={nodes} edges={edges} setNodes={setNodes} />;
}

function MindMapCanvas({
  nodes,
  edges,
  setNodes,
}: {
  nodes: Node[];
  edges: Edge[];
  setNodes: React.Dispatch<React.SetStateAction<Node[]>>;
}) {
  const { onNodeDragStart, onNodeDrag, onNodeDragStop } = useForceLayout(
    nodes,
    edges,
    setNodes,
  );

  // In controlled mode, React Flow emits onNodesChange events including
  // dimension/measurement updates. Without this handler the measurements
  // never propagate back to state and nodes stay at visibility: hidden.
  const onNodesChange = (changes: NodeChange[]) => {
    setNodes((current) => applyNodeChanges(changes, current));
  };

  return (
    <div className="mindmap-canvas h-full w-full">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={NODE_TYPES}
        onNodesChange={onNodesChange}
        fitView
        fitViewOptions={{ padding: 0.25 }}
        proOptions={{ hideAttribution: true }}
        nodesDraggable
        nodesConnectable={false}
        elementsSelectable
        // Trackpad-first: two-finger swipe pans in any direction; pinch
        // (which the OS maps to ctrl+wheel) zooms. Mouse-wheel keeps zooming
        // for desktop users without a trackpad.
        panOnScroll
        panOnScrollMode={"free" as const}
        panOnDrag
        zoomOnPinch
        zoomOnScroll={false}
        zoomOnDoubleClick
        minZoom={0.25}
        maxZoom={2.5}
        onNodeDragStart={onNodeDragStart}
        onNodeDrag={onNodeDrag}
        onNodeDragStop={onNodeDragStop}
      >
        <Background gap={28} size={1} color="var(--color-border)" />
        <Controls
          showInteractive={false}
          className="!border !border-[color:var(--color-border)] !bg-[color:var(--color-bg)]"
        />
      </ReactFlow>
    </div>
  );
}
