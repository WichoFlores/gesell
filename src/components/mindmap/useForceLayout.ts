import { useEffect, useRef, type Dispatch, type SetStateAction } from "react";
import {
  forceCenter,
  forceCollide,
  forceLink,
  forceManyBody,
  forceSimulation,
  forceX,
  forceY,
  type Simulation,
  type SimulationNodeDatum,
} from "d3-force";
import { applyNodeChanges, type Edge, type Node, type NodePositionChange } from "@xyflow/react";

const PATIENT_ID = "patient";

type SimNode = SimulationNodeDatum & {
  id: string;
  type: "patient" | "pivot" | "snippet";
  targetX?: number;
  targetY?: number;
};

type SimLink = { source: string; target: string };

function buildSim(simNodes: SimNode[], simLinks: SimLink[]) {
  return forceSimulation<SimNode, SimLink>(simNodes)
    .force(
      "link",
      forceLink<SimNode, SimLink>(simLinks)
        .id((d) => d.id)
        .distance((d) => {
          const src = d.source as SimNode;
          const tgt = d.target as SimNode;
          if (src.type === "patient" || tgt.type === "patient") return 260;
          return 150;
        })
        .strength(0.45),
    )
    .force(
      "charge",
      forceManyBody<SimNode>().strength((d) =>
        d.type === "snippet" ? -420 : -700,
      ),
    )
    .force(
      "collide",
      forceCollide<SimNode>().radius((d) =>
        d.type === "snippet" ? 130 : 40,
      ).strength(0.95),
    )
    .force("center", forceCenter(0, 0).strength(0.015))
    .force(
      "pivotX",
      forceX<SimNode>((d) => d.targetX ?? 0).strength((d) =>
        d.type === "pivot" ? 0.06 : 0,
      ),
    )
    .force(
      "pivotY",
      forceY<SimNode>((d) => d.targetY ?? 0).strength((d) =>
        d.type === "pivot" ? 0.06 : 0,
      ),
    )
    .alphaDecay(0.01)
    .alphaMin(0.0005)
    .alphaTarget(0.02)
    .velocityDecay(0.35);
}

function buildSimInputs(nodes: Node[], edges: Edge[]) {
  const simNodes: SimNode[] = nodes.map((n) => {
    const role = nodeRole(n);
    const base: SimNode = {
      id: n.id,
      type: role,
      x: n.position.x,
      y: n.position.y,
    };
    if (n.id === PATIENT_ID) {
      base.fx = 0;
      base.fy = 0;
    }
    if (role === "pivot") {
      base.targetX = n.position.x;
      base.targetY = n.position.y;
    }
    return base;
  });
  const simLinks: SimLink[] = edges.map((e) => ({
    source: e.source,
    target: e.target,
  }));
  return { simNodes, simLinks };
}

function nodeRole(node: Node): "patient" | "pivot" | "snippet" {
  if (node.id === PATIENT_ID) return "patient";
  if (node.type === "mindmap-pivot") return "pivot";
  return "snippet";
}

/**
 * Run the same simulation silently for a chunk of ticks and return nodes
 * with their settled positions. Used to pre-settle the layout BEFORE the
 * first React Flow paint, so users never see the radial-to-balanced jump.
 */
export function preSettleLayout(nodes: Node[], edges: Edge[]): Node[] {
  if (nodes.length === 0) return nodes;
  const { simNodes, simLinks } = buildSimInputs(nodes, edges);
  const sim = buildSim(simNodes, simLinks);
  sim.alpha(1).tick(600);
  sim.stop();
  return nodes.map((n) => {
    const sn = simNodes.find((s) => s.id === n.id);
    if (!sn || sn.x == null || sn.y == null) return n;
    return { ...n, position: { x: sn.x, y: sn.y } };
  });
}

/**
 * Continuously runs a d3-force simulation against the React Flow graph,
 * pushing position updates back into React Flow on every tick. The patient
 * is pinned at the origin; pivots are gently pulled toward their initial
 * cardinal position so clusters stay in their assigned direction; snippets
 * float around their pivot via a link force.
 */
export function useForceLayout(
  nodes: Node[],
  edges: Edge[],
  setNodes: Dispatch<SetStateAction<Node[]>>,
) {
  const simRef = useRef<Simulation<SimNode, SimLink> | null>(null);
  const simNodesRef = useRef<SimNode[]>([]);

  // Identity key — re-init the simulation only when the graph topology
  // changes (different nodes/edges), not on every parent re-render.
  const topologyKey = `${nodes.map((n) => n.id).join("|")}__${edges
    .map((e) => `${e.source}>${e.target}`)
    .join("|")}`;

  useEffect(() => {
    if (nodes.length === 0) return;

    const { simNodes, simLinks } = buildSimInputs(nodes, edges);

    // A tiny per-tick random nudge — at equilibrium all the standard forces
    // sum to zero, so without this the "softly alive" alphaTarget produces no
    // visible motion. Strength is intentionally small (≈ a few pixels per
    // second after damping) so the graph breathes rather than wanders.
    const noiseForce = (alpha: number) => {
      const energy = alpha * 6;
      for (const n of simNodes) {
        if (n.fx != null) continue; // pinned (patient, drag)
        n.vx = (n.vx ?? 0) + (Math.random() - 0.5) * energy;
        n.vy = (n.vy ?? 0) + (Math.random() - 0.5) * energy;
      }
    };

    const sim = buildSim(simNodes, simLinks)
      .force("noise", noiseForce)
      .on("tick", () => {
        // Use applyNodeChanges with position changes — this is React Flow's
        // optimized path for position updates and preserves node identity
        // (so internal measurement state doesn't reset every tick, which
        // otherwise leaves nodes stuck at visibility: hidden).
        const changes: NodePositionChange[] = simNodes
          .filter((s) => s.x != null && s.y != null)
          .map((s) => ({
            id: s.id,
            type: "position",
            position: { x: s.x as number, y: s.y as number },
            dragging: false,
          }));
        setNodes((current) => applyNodeChanges(changes, current));
      });

    // Initial positions arrive already pre-settled (see preSettleLayout),
    // so we can start the live phase immediately at the calm rest energy.
    // No big alpha = no shake.
    sim.stop();
    const startTimer = window.setTimeout(() => {
      sim.alpha(0.02).restart();
    }, 200);

    simRef.current = sim;
    simNodesRef.current = simNodes;
    return () => {
      window.clearTimeout(startTimer);
      sim.stop();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [topologyKey, setNodes]);

  // Drag handlers — fix the dragged node's position in the simulation while
  // it's being moved, then release.
  const onNodeDragStart = (_e: unknown, node: { id: string }) => {
    const sim = simRef.current;
    const sn = simNodesRef.current.find((s) => s.id === node.id);
    if (!sim || !sn || node.id === PATIENT_ID) return;
    sn.fx = sn.x;
    sn.fy = sn.y;
    sim.alphaTarget(0.3).restart();
  };

  const onNodeDrag = (
    _e: unknown,
    node: { id: string; position: { x: number; y: number } },
  ) => {
    const sn = simNodesRef.current.find((s) => s.id === node.id);
    if (!sn || node.id === PATIENT_ID) return;
    sn.fx = node.position.x;
    sn.fy = node.position.y;
  };

  const onNodeDragStop = (_e: unknown, node: { id: string }) => {
    const sim = simRef.current;
    const sn = simNodesRef.current.find((s) => s.id === node.id);
    if (!sim || !sn || node.id === PATIENT_ID) return;
    sn.fx = null;
    sn.fy = null;
    // Return to the resting "softly-alive" alpha target rather than 0 — we
    // want the graph to keep breathing after a drag.
    sim.alphaTarget(0.02);
  };

  return { onNodeDragStart, onNodeDrag, onNodeDragStop };
}
