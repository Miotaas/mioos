"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  addEdge,
  useNodesState,
  useEdgesState,
  type Node,
  type Edge,
  type Connection,
  type NodeChange,
  type EdgeChange,
  BackgroundVariant,
  MarkerType,
  Panel,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { useAppStore } from "@/store/appStore";
import { MioNode } from "@/types";
import { NODE_COLORS } from "@/lib/utils";
import { GraphNode } from "./GraphNode";
import { NodeModal } from "@/components/nodes/NodeModal";
import { Plus, Loader2, RefreshCw } from "lucide-react";

const nodeTypes = { mio: GraphNode };

export function GraphCanvas() {
  const { setSelectedNode, setNodes: storeSetNodes, setEdges: storeSetEdges, updateNodePosition, addNode, showToast } = useAppStore();
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const [loading, setLoading] = useState(true);
  const [newNodeOpen, setNewNodeOpen] = useState(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [nodesRes, edgesRes] = await Promise.all([
        fetch("/api/nodes").then((r) => r.json()),
        fetch("/api/edges").then((r) => r.json()),
      ]);

      const mioNodes: MioNode[] = Array.isArray(nodesRes) ? nodesRes : [];
      const mioEdges = Array.isArray(edgesRes) ? edgesRes : [];

      storeSetNodes(mioNodes);
      storeSetEdges(mioEdges);

      const flowNodes: Node[] = mioNodes.map((n) => ({
        id: n.id,
        type: "mio",
        position: { x: n.posX, y: n.posY },
        data: { node: n, onClick: () => setSelectedNode(n) },
      }));

      const flowEdges: Edge[] = mioEdges.map((e) => ({
        id: e.id,
        source: e.sourceId,
        target: e.targetId,
        label: e.label || undefined,
        animated: e.animated,
        style: { stroke: "rgba(99,102,241,0.4)", strokeWidth: 1.5 },
        labelStyle: { fill: "#94a3b8", fontSize: 10, fontFamily: "Inter, sans-serif" },
        labelBgStyle: { fill: "rgba(13,13,20,0.8)", borderRadius: "4px" },
        labelBgPadding: [4, 6] as [number, number],
        markerEnd: { type: MarkerType.ArrowClosed, color: "rgba(99,102,241,0.4)", width: 16, height: 16 },
      }));

      setNodes(flowNodes);
      setEdges(flowEdges);
    } catch (e) {
      console.error("Failed to load graph:", e);
    } finally {
      setLoading(false);
    }
  }, [setNodes, setEdges, setSelectedNode, storeSetNodes, storeSetEdges]);

  useEffect(() => {
    load();
  }, [load]);

  const onNodeClick = useCallback((_: React.MouseEvent, node: Node) => {
    const mioNode = (node.data as { node: MioNode }).node;
    setSelectedNode(mioNode);
  }, [setSelectedNode]);

  const onConnect = useCallback(async (connection: Connection) => {
    const tempId = `e-${Date.now()}`;
    const newEdge: Edge = {
      ...connection,
      id: tempId,
      animated: true,
      style: { stroke: "rgba(99,102,241,0.4)", strokeWidth: 1.5 },
      markerEnd: { type: MarkerType.ArrowClosed, color: "rgba(99,102,241,0.4)", width: 16, height: 16 },
    };
    setEdges((eds) => addEdge(newEdge, eds));

    const res = await fetch("/api/edges", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sourceId: connection.source, targetId: connection.target, animated: true }),
    });
    if (res.ok) {
      const saved = await res.json();
      // Replace temp ID with the DB-assigned cuid so deletion works immediately
      setEdges((eds) => eds.map((e) => e.id === tempId ? { ...e, id: saved.id } : e));
    }
  }, [setEdges]);

  const handleNodesChange = useCallback((changes: NodeChange[]) => {
    onNodesChange(changes);
    changes.forEach((change) => {
      if (change.type === "position" && !change.dragging && change.position) {
        const { id, position } = change;
        updateNodePosition(id, position.x, position.y);
        if (saveTimer.current) clearTimeout(saveTimer.current);
        saveTimer.current = setTimeout(() => {
          fetch(`/api/nodes/${id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ posX: position.x, posY: position.y }),
          });
        }, 500);
      }
    });
  }, [onNodesChange, updateNodePosition]);

  const handleEdgesChange = useCallback((changes: EdgeChange[]) => {
    onEdgesChange(changes);
    changes.forEach((change) => {
      if (change.type === "remove") {
        fetch(`/api/edges/${change.id}`, { method: "DELETE" }).catch(console.error);
        showToast("Connection deleted");
      }
    });
  }, [onEdgesChange, showToast]);

  function handleNodeCreated(node: MioNode) {
    addNode(node);
    setNodes((nds) => [
      ...nds,
      {
        id: node.id,
        type: "mio",
        position: { x: node.posX, y: node.posY },
        data: { node, onClick: () => setSelectedNode(node) },
      },
    ]);
    showToast("Node created");
  }

  return (
    <div className="w-full h-full relative">
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center z-10 bg-void/80 backdrop-blur-sm">
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="w-6 h-6 text-accent-purple animate-spin" />
            <span className="text-sm text-text-secondary">Loading graph...</span>
          </div>
        </div>
      )}

      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={handleNodesChange}
        onEdgesChange={handleEdgesChange}
        onConnect={onConnect}
        onNodeClick={onNodeClick}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        minZoom={0.2}
        maxZoom={2}
        deleteKeyCode={["Delete", "Backspace"]}
        defaultEdgeOptions={{
          animated: true,
          style: { stroke: "rgba(99,102,241,0.4)", strokeWidth: 1.5 },
        }}
        proOptions={{ hideAttribution: true }}
      >
        <Background variant={BackgroundVariant.Dots} gap={24} size={1} color="rgba(99,102,241,0.12)" />
        <Controls className="react-flow__controls" />
        <MiniMap
          nodeColor={(node) => {
            const mioNode = (node.data as { node?: MioNode })?.node;
            return mioNode?.color || NODE_COLORS[mioNode?.type || "project"] || "#6366f1";
          }}
          maskColor="rgba(5,5,8,0.8)"
          style={{ background: "rgba(13,13,20,0.9)" }}
        />

        <Panel position="top-right" className="flex gap-2">
          <button
            onClick={() => setNewNodeOpen(true)}
            className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-accent-purple/90 hover:bg-accent-purple text-white transition-all shadow-glow"
          >
            <Plus className="w-3.5 h-3.5" />
            New Node
          </button>
          <button
            onClick={load}
            className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-surface-2 border border-white/[0.06] text-text-secondary hover:text-text-primary hover:border-white/[0.12] transition-all backdrop-blur-sm"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Refresh
          </button>
        </Panel>
      </ReactFlow>

      <NodeModal open={newNodeOpen} onClose={() => setNewNodeOpen(false)} onSaved={handleNodeCreated} />
    </div>
  );
}
