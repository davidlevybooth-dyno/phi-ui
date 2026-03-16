export interface Position {
  x: number;
  y: number;
}

export function getVerticalLayout(
  nodeCount: number,
  startX: number,
  startY: number,
  spacing = 120
): Position[] {
  return Array.from({ length: nodeCount }, (_, i) => ({
    x: startX,
    y: startY + i * spacing,
  }));
}

/**
 * Topological order of node ids for a DAG (edges: src → dst).
 * Falls back to original order when cycles are detected.
 */
export function getTopologicalOrder(
  nodeIds: string[],
  edges: Array<{ src: string; dst: string }>
): string[] {
  const idSet = new Set(nodeIds);
  const inDegree = new Map<string, number>(nodeIds.map((id) => [id, 0]));
  const outEdges = new Map<string, string[]>();

  edges.forEach(({ src, dst }) => {
    if (!idSet.has(src) || !idSet.has(dst)) return;
    inDegree.set(dst, (inDegree.get(dst) ?? 0) + 1);
    if (!outEdges.has(src)) outEdges.set(src, []);
    outEdges.get(src)!.push(dst);
  });

  const queue = nodeIds.filter((id) => inDegree.get(id) === 0);
  const order: string[] = [];

  while (queue.length > 0) {
    const id = queue.shift()!;
    order.push(id);
    for (const dst of outEdges.get(id) ?? []) {
      const d = (inDegree.get(dst) ?? 1) - 1;
      inDegree.set(dst, d);
      if (d === 0) queue.push(dst);
    }
  }

  return order.length === nodeIds.length ? order : nodeIds;
}
