import type { Edge, Node } from "@xyflow/react";
import type { FamilyMember, Patient } from "@/db/schema";
import type { Relationship } from "@/lib/relationships";

export type PersonNodeData = {
  name: string;
  age?: number;
  gender?: "male" | "female" | "other";
  isPatient: boolean;
};

export type CoupleAnchorData = Record<string, never>;

const NODE_W = 120;
const NODE_H = 100;
const H_GAP = 30;
const V_GAP = 110;
const COUPLE_GAP = 0;

const LEVEL_DY = NODE_H + V_GAP;

// Person container top = levelTop. Shape (56px) sits at the top of the
// container; its vertical center is 28px down. Side handles & couple
// anchors must align to this y so couple lines stay horizontal.
const SHAPE_CENTER_OFFSET = 28;

const levelTop = (level: number) => -level * LEVEL_DY;
const levelCenterY = (level: number) => levelTop(level) + NODE_H / 2;
const shapeCenterY = (level: number) => levelTop(level) + SHAPE_CENTER_OFFSET;

function ageOrder<T extends { age?: number }>(a: T, b: T): number {
  const aa = a.age;
  const bb = b.age;
  if (aa == null && bb == null) return 0;
  if (aa == null) return 1;
  if (bb == null) return -1;
  return bb - aa;
}

function byAgeDesc<T extends { age?: number }>(arr: T[]): T[] {
  return [...arr].sort(ageOrder);
}

const lineageStyle = {
  stroke: "var(--color-fg)",
  strokeWidth: 1.25,
  opacity: 0.7,
};

const coupleStyle = {
  stroke: "var(--color-fg)",
  strokeWidth: 1.5,
  opacity: 0.8,
};

const fadedStyle = {
  stroke: "var(--color-border)",
  strokeWidth: 1,
  opacity: 0.5,
};

export function buildGenogram(
  patient: Patient,
  members: FamilyMember[],
): { nodes: Node[]; edges: Edge[] } {
  const byRel = new Map<Relationship, FamilyMember[]>();
  for (const m of members) {
    const list = byRel.get(m.relationship) ?? [];
    list.push(m);
    byRel.set(m.relationship, list);
  }
  const get = (r: Relationship) => byRel.get(r) ?? [];

  const grandparents = get("grandparent");
  const parents = get("parent");
  const auntsUncles = get("parent-sibling");
  const siblings = get("sibling");
  const partners = get("partner");
  const cousins = get("cousin");
  const children = byAgeDesc(get("child"));
  const niblings = byAgeDesc(get("sibling-child"));
  const grandchildren = byAgeDesc(get("grandchild"));
  const others = get("other");

  // Maps node id → top-left position
  const placements = new Map<string, { x: number; y: number }>();
  const anchors: { id: string; x: number; y: number }[] = [];
  const edges: Edge[] = [];

  // Person data lookup (for converting placements to nodes at the end)
  const personData = new Map<string, PersonNodeData>();
  personData.set(patient.id, {
    name: patient.name,
    age: patient.age,
    gender: patient.gender,
    isPatient: true,
  });
  for (const m of members) {
    personData.set(m.id, {
      name: m.name,
      age: m.age,
      gender: m.gender,
      isPatient: false,
    });
  }

  // ---------- helpers ----------
  const placeCenter = (id: string, cx: number, cy: number) =>
    placements.set(id, { x: cx - NODE_W / 2, y: cy - NODE_H / 2 });

  const personCenter = (id: string) => {
    const p = placements.get(id)!;
    return { x: p.x + NODE_W / 2, y: p.y + NODE_H / 2 };
  };

  const stride = NODE_W + H_GAP;

  function pushDescent(sourceId: string, sourceHandle: string, targetId: string) {
    edges.push({
      id: `${sourceId}>${targetId}`,
      source: sourceId,
      sourceHandle,
      target: targetId,
      targetHandle: "top",
      type: "smoothstep",
      style: lineageStyle,
    });
  }
  function pushFaded(sourceId: string, targetId: string) {
    edges.push({
      id: `${sourceId}~>${targetId}`,
      source: sourceId,
      sourceHandle: "bottom",
      target: targetId,
      targetHandle: "top",
      type: "smoothstep",
      style: fadedStyle,
    });
  }
  // Direct couple line — drawn as a single edge p1 → p2 so the line stays
  // unbroken across the descent anchor that sits at its midpoint. With a
  // split (p1→anchor, anchor→p2) the path bends at the anchor's handles and
  // leaves a tiny gap exactly where the children line drops down.
  function pushCoupleLine(leftId: string, rightId: string) {
    edges.push({
      id: `couple-line-${leftId}-${rightId}`,
      source: leftId,
      sourceHandle: "right",
      target: rightId,
      targetHandle: "left",
      type: "straight",
      style: coupleStyle,
    });
  }

  // ---------- Level 0: siblings + patient (age-sorted) =====
  // Combine siblings + patient and sort by age descending (oldest left).
  // Reserve an extra slot to the right of the patient for the partner.
  const childGroupAll: { id: string; age?: number }[] = [
    ...siblings.map((s) => ({ id: s.id, age: s.age })),
    { id: patient.id, age: patient.age },
  ].sort(ageOrder);
  const childGroupIds = childGroupAll.map((c) => c.id);

  let xCursor = 0;
  for (const item of childGroupAll) {
    placeCenter(item.id, xCursor + NODE_W / 2, levelCenterY(0));
    xCursor += stride;
    if (item.id === patient.id && partners.length > 0) {
      // Reserve a slot for the partner so they sit immediately to the right
      // of the patient regardless of where the patient lands in age order.
      xCursor += stride;
    }
  }

  // Bounds & center exclude the partner slot — the parents only descend to
  // their own children (siblings + patient).
  const childContainerLefts = childGroupIds.map(
    (id) => placements.get(id)!.x,
  );
  const childGroupLeft = Math.min(...childContainerLefts);
  const childGroupRight = Math.max(...childContainerLefts) + NODE_W;
  const childGroupCx = (childGroupLeft + childGroupRight) / 2;

  // ---------- Partner + children of patient =====
  const patientCx = personCenter(patient.id).x;
  let partnerId: string | null = null;
  if (partners.length > 0) {
    const p = partners[0];
    partnerId = p.id;
    // Sits in the reserved slot immediately to the right of the patient.
    placeCenter(p.id, patientCx + stride, levelCenterY(0));
  }

  // anchor for patient+partner couple (or patient alone, used as descent origin
  // if there are children)
  let descentSourceId: string;
  let descentSourceHandle: string;
  let descentSourceX: number;

  if (partnerId) {
    const partnerCx = personCenter(partnerId).x;
    const ppAnchorX = (patientCx + partnerCx) / 2;
    const ppAnchorY = shapeCenterY(0);
    const ppAnchorId = `couple:${patient.id}:${partnerId}`;
    anchors.push({ id: ppAnchorId, x: ppAnchorX, y: ppAnchorY });
    pushCoupleLine(patient.id, partnerId);
    descentSourceId = ppAnchorId;
    descentSourceHandle = "bottom";
    descentSourceX = ppAnchorX;
  } else {
    descentSourceId = patient.id;
    descentSourceHandle = "bottom";
    descentSourceX = patientCx;
  }

  // place children (if any) below descent source
  const childCenterY = levelCenterY(-1);
  if (children.length > 0) {
    const totalW = children.length * NODE_W + (children.length - 1) * H_GAP;
    let cx = descentSourceX - totalW / 2 + NODE_W / 2;
    for (const ch of children) {
      placeCenter(ch.id, cx, childCenterY);
      pushDescent(descentSourceId, descentSourceHandle, ch.id);
      cx += stride;
    }
  }

  // grandchildren below children — anchor below first child
  if (grandchildren.length > 0) {
    let originId: string;
    let originHandle: string;
    let originX: number;
    if (children.length > 0) {
      const firstChild = children[0];
      originId = firstChild.id;
      originHandle = "bottom";
      originX = personCenter(firstChild.id).x;
    } else {
      originId = descentSourceId;
      originHandle = descentSourceHandle;
      originX = descentSourceX;
    }
    const totalW =
      grandchildren.length * NODE_W + (grandchildren.length - 1) * H_GAP;
    let cx = originX - totalW / 2 + NODE_W / 2;
    for (const gc of grandchildren) {
      placeCenter(gc.id, cx, levelCenterY(-2));
      pushDescent(originId, originHandle, gc.id);
      cx += stride;
    }
  }

  // niblings (sibling-child) below first sibling, if any
  if (niblings.length > 0) {
    if (siblings.length > 0) {
      const sib = siblings[0];
      const sibCx = personCenter(sib.id).x;
      const totalW = niblings.length * NODE_W + (niblings.length - 1) * H_GAP;
      let cx = sibCx - totalW / 2 + NODE_W / 2;
      for (const n of niblings) {
        placeCenter(n.id, cx, childCenterY);
        pushDescent(sib.id, "bottom", n.id);
        cx += stride;
      }
    } else {
      // no siblings; place niblings to the left of children, faded
      const startX = childGroupLeft - stride;
      let cx = startX;
      for (const n of niblings) {
        placeCenter(n.id, cx, childCenterY);
        pushFaded(patient.id, n.id);
        cx -= stride;
      }
    }
  }

  // ---------- Level 1: parents + aunts/uncles =====
  const parentY = levelCenterY(1);

  let parentDescentSourceId: string | null = null;
  let parentDescentSourceHandle: string | null = null;

  if (parents.length === 1) {
    placeCenter(parents[0].id, childGroupCx, parentY);
    parentDescentSourceId = parents[0].id;
    parentDescentSourceHandle = "bottom";
  } else if (parents.length >= 2) {
    const [p1, p2, ...rest] = parents;
    const p1Cx = childGroupCx - (NODE_W + COUPLE_GAP) / 2;
    const p2Cx = childGroupCx + (NODE_W + COUPLE_GAP) / 2;
    placeCenter(p1.id, p1Cx, parentY);
    placeCenter(p2.id, p2Cx, parentY);
    const anchorId = `couple:${p1.id}:${p2.id}`;
    anchors.push({ id: anchorId, x: childGroupCx, y: shapeCenterY(1) });
    pushCoupleLine(p1.id, p2.id);
    parentDescentSourceId = anchorId;
    parentDescentSourceHandle = "bottom";
    // Extra parents (3+): place to the right of the couple, no anchor
    let extraX = p2Cx + stride;
    for (const ex of rest) {
      placeCenter(ex.id, extraX, parentY);
      pushFaded(ex.id, patient.id);
      extraX += stride;
    }
  }

  // Connect parent descent to each child in childGroup
  if (parentDescentSourceId && parentDescentSourceHandle) {
    for (const cid of childGroupIds) {
      pushDescent(parentDescentSourceId, parentDescentSourceHandle, cid);
    }
  }

  // Aunts/uncles: stack to the LEFT of parents at level 1
  if (auntsUncles.length > 0) {
    const parentLeftEdge = parents.length > 0
      ? Math.min(...parents.map((p) => personCenter(p.id).x)) - NODE_W / 2
      : childGroupCx;
    let auX = parentLeftEdge - stride - NODE_W / 2;
    for (const au of auntsUncles) {
      placeCenter(au.id, auX, parentY);
      auX -= stride;
    }
  }

  // ---------- Level 2: grandparents =====
  const gpY = levelCenterY(2);
  if (parents.length > 0 && grandparents.length > 0) {
    // Center grandparents above the parent couple anchor (or single parent)
    const gpCenterX = childGroupCx;
    if (grandparents.length === 1) {
      placeCenter(grandparents[0].id, gpCenterX, gpY);
      // Connect to first parent
      pushDescent(grandparents[0].id, "bottom", parents[0].id);
    } else {
      const [g1, g2, ...rest] = grandparents;
      const g1Cx = gpCenterX - (NODE_W + COUPLE_GAP) / 2;
      const g2Cx = gpCenterX + (NODE_W + COUPLE_GAP) / 2;
      placeCenter(g1.id, g1Cx, gpY);
      placeCenter(g2.id, g2Cx, gpY);
      const gpAnchorId = `couple:${g1.id}:${g2.id}`;
      anchors.push({ id: gpAnchorId, x: gpCenterX, y: shapeCenterY(2) });
      pushCoupleLine(g1.id, g2.id);
      // Descend to first parent (we don't track maternal vs paternal yet)
      pushDescent(gpAnchorId, "bottom", parents[0].id);
      // Extras: faded line to first parent
      let extraX = g2Cx + stride;
      for (const ex of rest) {
        placeCenter(ex.id, extraX, gpY);
        pushFaded(ex.id, parents[0].id);
        extraX += stride;
      }
    }
  } else if (grandparents.length > 0) {
    // No parents: lay grandparents in a row, fade to patient
    let gpX = -((grandparents.length - 1) * stride) / 2;
    for (const gp of grandparents) {
      placeCenter(gp.id, gpX, gpY);
      pushFaded(gp.id, patient.id);
      gpX += stride;
    }
  }

  // ---------- Cousins: place at level 0 to the LEFT of siblings, descent from
  // first aunt/uncle (or first grandparent, or float)
  if (cousins.length > 0) {
    const minPlacedX = Math.min(
      ...Array.from(placements.values()).map((p) => p.x),
    );
    let cxStart = minPlacedX - stride - NODE_W / 2;
    let originId: string | null = null;
    let originHandle: string = "bottom";
    if (auntsUncles.length > 0) {
      originId = auntsUncles[0].id;
    } else if (grandparents.length > 0) {
      originId = grandparents[0].id;
    }
    let cx = cxStart;
    for (const c of cousins) {
      placeCenter(c.id, cx, levelCenterY(0));
      if (originId) {
        pushDescent(originId, originHandle, c.id);
      } else {
        pushFaded(patient.id, c.id);
      }
      cx -= stride;
    }
  }

  // ---------- Others: float to the right of partner (or patient), faded
  if (others.length > 0) {
    const baseX = partnerId
      ? personCenter(partnerId).x + stride
      : patientCx + stride;
    let cx = baseX;
    for (const o of others) {
      placeCenter(o.id, cx, levelCenterY(0));
      pushFaded(patient.id, o.id);
      cx += stride;
    }
  }

  // ---------- Build node list ----------
  const nodes: Node[] = [];
  for (const [id, pos] of placements) {
    nodes.push({
      id,
      type: "person",
      position: pos,
      data: personData.get(id) as unknown as Record<string, unknown>,
    });
  }
  for (const a of anchors) {
    nodes.push({
      id: a.id,
      type: "couple-anchor",
      position: { x: a.x - 0.5, y: a.y - 0.5 },
      data: {},
    });
  }

  return { nodes, edges };
}
