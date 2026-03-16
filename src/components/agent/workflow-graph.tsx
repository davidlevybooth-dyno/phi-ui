"use client";

import React, { useMemo, useState, createContext, useContext } from "react";
import {
  ReactFlow,
  useNodesState,
  useEdgesState,
  Handle,
  type Node,
  type Edge,
  type NodeProps,
  Background,
  Controls,
  Panel,
  NodeToolbar,
  Position,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { Circle, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { getTopologicalOrder, getVerticalLayout } from "@/lib/utils/workflow-layout";

export interface WorkflowSpec {
  name: string;
  nodes: Array<{
    id: string;
    op: string;
    params?: Record<string, unknown>;
    map_config?: {
      op?: string;
      over?: string;
      collect_as?: string;
      [key: string]: unknown;
    };
  }>;
  edges: Array<{ src: string; dst: string }>;
}

type NodeData = {
  op: string;
  mapOp?: string;
  mapOver?: string;
  mapCollectAs?: string;
  params?: Record<string, unknown>;
  nodeId?: string;
};

const HoveredNodeCtx = createContext<{
  hoveredId: string | null;
  setHoveredId: (id: string | null) => void;
}>({ hoveredId: null, setHoveredId: () => {} });

function WorkflowNode({ id, data, selected }: NodeProps<Node<NodeData>>) {
  const { hoveredId, setHoveredId } = useContext(HoveredNodeCtx);
  const op = data.op ?? "";
  const mapOp = data.mapOp;
  const displayLabel = mapOp ? `Map (${mapOp})` : op === "map" ? "Map step" : op;
  const hasParams = data.params && Object.keys(data.params).length > 0;

  const tooltipContent =
    hasParams && op !== "map" ? (
      <div className="space-y-1">
        <div className="font-semibold text-foreground">Inputs</div>
        <pre className="whitespace-pre-wrap break-all text-muted-foreground text-xs max-h-[200px] overflow-auto">
          {JSON.stringify(data.params, null, 2)}
        </pre>
      </div>
    ) : op === "map" ? (
      <div className="space-y-1">
        <div className="font-semibold text-foreground">{displayLabel}</div>
        {data.mapOver && (
          <p className="text-muted-foreground text-xs">
            Over: <span className="font-mono">{data.mapOver}</span>
          </p>
        )}
        {data.mapCollectAs && (
          <p className="text-muted-foreground text-xs">
            Collect as: <span className="font-mono">{data.mapCollectAs}</span>
          </p>
        )}
      </div>
    ) : (
      <div className="text-xs text-muted-foreground">{op}</div>
    );

  return (
    <>
      <NodeToolbar
        nodeId={id}
        isVisible={hoveredId === id}
        position={Position.Right}
        offset={12}
        className="!rounded-md !border !border-border !bg-popover !px-3 !py-2 !shadow-md !text-popover-foreground font-mono text-xs max-w-sm"
      >
        {tooltipContent}
      </NodeToolbar>
      <Handle
        type="target"
        position={Position.Top}
        className="!w-2 !h-2 !border-2 !border-muted-foreground !bg-background"
      />
      <div
        className={cn(
          "flex items-center gap-2.5 px-4 py-3 rounded-lg border bg-card text-card-foreground shadow-sm min-w-[200px] max-w-[260px]",
          selected && "ring-2 ring-primary"
        )}
        onMouseEnter={() => setHoveredId(id)}
        onMouseLeave={() => setHoveredId(null)}
      >
        <Circle className="h-4 w-4 text-muted-foreground shrink-0" />
        <span className="font-mono text-sm truncate" title={displayLabel}>
          {displayLabel}
        </span>
        {hasParams && <ChevronRight className="h-3.5 w-3.5 text-muted-foreground shrink-0 ml-auto" />}
      </div>
      <Handle
        type="source"
        position={Position.Bottom}
        className="!w-2 !h-2 !border-2 !border-muted-foreground !bg-background"
      />
    </>
  );
}

const nodeTypes = { workflow: WorkflowNode };

const SENTINELS = new Set(["START", "END"]);
const START_X = 100;
const START_Y = 50;
const SPACING = 100;

function specToFlow(spec: WorkflowSpec): { nodes: Node[]; edges: Edge[] } {
  const nodeIds = spec.nodes.map((n) => n.id);
  const order = getTopologicalOrder(nodeIds, spec.edges);
  const positions = getVerticalLayout(order.length, START_X, START_Y, SPACING);
  const idToIndex = new Map(order.map((id, i) => [id, i]));

  const nodes: Node[] = spec.nodes.map((n) => {
    const index = idToIndex.get(n.id) ?? 0;
    const position = positions[index] ?? { x: START_X, y: START_Y + index * SPACING };
    return {
      id: n.id,
      type: "workflow",
      position,
      data: {
        op: n.op,
        mapOp: n.op === "map" && n.map_config?.op ? String(n.map_config.op) : undefined,
        mapOver: n.op === "map" && n.map_config?.over != null ? String(n.map_config.over) : undefined,
        mapCollectAs:
          n.op === "map" && n.map_config?.collect_as != null
            ? String(n.map_config.collect_as)
            : undefined,
        params: n.params,
        nodeId: n.id,
      },
    };
  });

  const rawEdges = (spec.edges ?? []) as Array<Record<string, unknown>>;
  const pairs = rawEdges
    .map((e) => ({
      src: String(e.src ?? e.source ?? e.from ?? "").trim(),
      dst: String(e.dst ?? e.target ?? e.to ?? "").trim(),
    }))
    .filter((e) => e.src && e.dst && !SENTINELS.has(e.src) && !SENTINELS.has(e.dst) && idToIndex.has(e.src) && idToIndex.has(e.dst));

  const effectivePairs =
    pairs.length > 0
      ? pairs
      : order.slice(0, -1).map((id, i) => ({ src: id, dst: order[i + 1]! }));

  const edges: Edge[] = effectivePairs.map((e) => ({
    id: `e-${e.src}-${e.dst}`,
    source: e.src,
    target: e.dst,
    type: "smoothstep",
    style: { stroke: "#475569", strokeWidth: 2.5 },
    zIndex: 0,
  }));

  return { nodes, edges };
}

interface WorkflowGraphProps {
  spec: WorkflowSpec;
  className?: string;
  height?: number;
}

export function WorkflowGraph({ spec, className, height = 480 }: WorkflowGraphProps) {
  const { nodes: initialNodes, edges: initialEdges } = useMemo(() => specToFlow(spec), [spec]);
  const [nodes, , onNodesChange] = useNodesState(initialNodes);
  const [edges, , onEdgesChange] = useEdgesState(initialEdges);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const hasParams = spec.nodes.some((n) => n.params && Object.keys(n.params).length > 0);

  return (
    <HoveredNodeCtx.Provider value={{ hoveredId, setHoveredId }}>
      <div
        className={cn("rounded-md border bg-muted/20 overflow-hidden", className)}
        style={{ height }}
      >
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          nodeTypes={nodeTypes}
          defaultEdgeOptions={{ type: "smoothstep", style: { stroke: "#64748b", strokeWidth: 3 } }}
          fitView
          fitViewOptions={{ padding: 0.2 }}
          minZoom={0.3}
          maxZoom={1.5}
          nodesDraggable={false}
          nodesConnectable={false}
          elementsSelectable
          panOnDrag
          zoomOnScroll
          zoomOnPinch
          proOptions={{ hideAttribution: true }}
        >
          <Background gap={12} size={1} />
          <Controls showInteractive={false} />
          <Panel position="top-left" className="m-2 space-y-0.5">
            <div className="text-sm font-medium text-foreground">{spec.name}</div>
            {hasParams && (
              <div className="text-xs text-muted-foreground">Hover a step to see inputs</div>
            )}
          </Panel>
        </ReactFlow>
      </div>
    </HoveredNodeCtx.Provider>
  );
}
