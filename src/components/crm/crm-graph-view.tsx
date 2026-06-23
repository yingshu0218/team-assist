"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { ZoomIn, ZoomOut, Maximize2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useLedger } from "@/hooks/use-ledger";
import { useFetch } from "@/hooks/use-data";
import { useTheme } from "next-themes";

interface GraphNode {
  id: string;
  type: "contact" | "event" | "project";
  label: string;
  sublabel?: string | null;
  color: string;
  borderColor: string;
}

interface GraphLink {
  source: string;
  target: string;
  label: string | null;
  color: string;
}

interface GraphData {
  nodes: GraphNode[];
  links: GraphLink[];
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ForceGraph2DType = any;

export function CrmGraphView() {
  const { activeLedgerId } = useLedger();
  const { resolvedTheme } = useTheme();
  const containerRef = useRef<HTMLDivElement>(null);
  const fgRef = useRef<ForceGraph2DType>(null);
  const [ForceGraphComp, setForceGraphComp] = useState<React.ComponentType<ForceGraph2DType> | null>(null);
  const [hoverNode, setHoverNode] = useState<GraphNode | null>(null);
  const [hoverLinks, setHoverLinks] = useState<GraphLink[]>([]);

  const graphUrl = activeLedgerId ? `/api/crm/graph?ledger_id=${activeLedgerId}` : null;
  const { data: graphData, loading } = useFetch<GraphData>(graphUrl);

  const isDark = resolvedTheme === "dark";

  // 动态加载 react-force-graph-2d 组件
  useEffect(() => {
    let mounted = true;
    import("react-force-graph-2d").then((mod) => {
      if (mounted) {
        setForceGraphComp(() => mod.default);
      }
    });
    return () => { mounted = false; };
  }, []);

  // 颜色映射
  const getNodeColors = useCallback((node: GraphNode) => {
    if (isDark) {
      switch (node.type) {
        case "contact": return { fill: "#2a1f14", border: "#d4a574", text: "#e8d5c0" };
        case "event": return { fill: "#2a2014", border: "#e8c99b", text: "#e8d5c0" };
        case "project": return { fill: "#142a1f", border: "#6abf7b", text: "#c0e8d0" };
      }
    }
    switch (node.type) {
      case "contact": return { fill: "#fef3e2", border: "#b87333", text: "#5a3a1a" };
      case "event": return { fill: "#fef5eb", border: "#d4a574", text: "#6b4c2a" };
      case "project": return { fill: "#e8f5ec", border: "#4a7c59", text: "#2a4a35" };
    }
  }, [isDark]);

  // 自定义 Canvas 绘制
  const nodePaint = useCallback(
    (paintNode: { id: string; x: number; y: number }, ctx: CanvasRenderingContext2D, globalScale: number) => {
      const node = graphData?.nodes.find((n) => n.id === paintNode.id);
      if (!node) return;
      const colors = getNodeColors(node);
      const size = 12;

      ctx.save();

      // 根据类型绘制不同形状
      if (node.type === "contact") {
        ctx.beginPath();
        ctx.arc(paintNode.x, paintNode.y, size, 0, Math.PI * 2);
        ctx.fillStyle = colors.fill;
        ctx.fill();
        ctx.strokeStyle = colors.border;
        ctx.lineWidth = 2 / globalScale;
        ctx.stroke();
      } else if (node.type === "event") {
        const w = size * 1.6;
        const h = size * 1.2;
        const r = 3;
        ctx.beginPath();
        ctx.moveTo(paintNode.x - w / 2 + r, paintNode.y - h / 2);
        ctx.lineTo(paintNode.x + w / 2 - r, paintNode.y - h / 2);
        ctx.quadraticCurveTo(paintNode.x + w / 2, paintNode.y - h / 2, paintNode.x + w / 2, paintNode.y - h / 2 + r);
        ctx.lineTo(paintNode.x + w / 2, paintNode.y + h / 2 - r);
        ctx.quadraticCurveTo(paintNode.x + w / 2, paintNode.y + h / 2, paintNode.x + w / 2 - r, paintNode.y + h / 2);
        ctx.lineTo(paintNode.x - w / 2 + r, paintNode.y + h / 2);
        ctx.quadraticCurveTo(paintNode.x - w / 2, paintNode.y + h / 2, paintNode.x - w / 2, paintNode.y + h / 2 - r);
        ctx.lineTo(paintNode.x - w / 2, paintNode.y - h / 2 + r);
        ctx.quadraticCurveTo(paintNode.x - w / 2, paintNode.y - h / 2, paintNode.x - w / 2 + r, paintNode.y - h / 2);
        ctx.closePath();
        ctx.fillStyle = colors.fill;
        ctx.fill();
        ctx.strokeStyle = colors.border;
        ctx.lineWidth = 2 / globalScale;
        ctx.stroke();
      } else {
        const s = size * 1.1;
        ctx.beginPath();
        for (let i = 0; i < 6; i++) {
          const angle = (Math.PI / 3) * i - Math.PI / 6;
          const px = paintNode.x + s * Math.cos(angle);
          const py = paintNode.y + s * Math.sin(angle);
          if (i === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        }
        ctx.closePath();
        ctx.fillStyle = colors.fill;
        ctx.fill();
        ctx.strokeStyle = colors.border;
        ctx.lineWidth = 2 / globalScale;
        ctx.stroke();
      }

      // 标签
      const fontSize = Math.max(12 / globalScale, 3);
      ctx.font = `${fontSize}px sans-serif`;
      ctx.fillStyle = colors.text;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";

      const displayText = node.type === "contact" ? node.label.charAt(0) : node.label.slice(0, 2);
      ctx.fillText(displayText, paintNode.x, paintNode.y);

      const labelSize = Math.max(10 / globalScale, 2.5);
      ctx.font = `${labelSize}px sans-serif`;
      ctx.fillText(node.label, paintNode.x, paintNode.y + size + labelSize);

      ctx.restore();
    },
    [graphData, getNodeColors]
  );

  const handleNodeHover = useCallback((node: { id: string } | null) => {
    if (node && graphData) {
      const gNode = graphData.nodes.find((n) => n.id === node.id);
      setHoverNode(gNode || null);
      const related = graphData.links.filter(
        (l) => l.source === node.id || l.target === node.id
      );
      setHoverLinks(related);
    } else {
      setHoverNode(null);
      setHoverLinks([]);
    }
  }, [graphData]);

  const handleZoom = (direction: "in" | "out") => {
    if (!fgRef.current) return;
    const fg = fgRef.current as { zoom: (z: number, duration?: number) => void };
    if (direction === "in") {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const currentZoom = (fgRef.current as any).zoom();
      fg.zoom(currentZoom * 1.3, 300);
    } else {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const currentZoom = (fgRef.current as any).zoom();
      fg.zoom(currentZoom / 1.3, 300);
    }
  };

  const handleFit = () => {
    if (!fgRef.current) return;
    const fg = fgRef.current as { zoomToFit: (duration?: number) => void };
    fg.zoomToFit(400);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">加载图谱数据...</p>
      </div>
    );
  }

  if (!graphData || graphData.nodes.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
        <p>暂无关系数据</p>
        <p className="text-sm mt-1">添加联系人和关联关系后可查看图谱</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">关系图谱</h2>
          <p className="text-sm text-muted-foreground">可视化联系人、事件之间的关联网络</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="icon" onClick={() => handleZoom("in")} title="放大">
            <ZoomIn className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="icon" onClick={() => handleZoom("out")} title="缩小">
            <ZoomOut className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="icon" onClick={handleFit} title="适配">
            <Maximize2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="flex-1 relative" ref={containerRef}>
        {ForceGraphComp && graphData && (
          <ForceGraphComp
            ref={fgRef}
            graphData={graphData}
            nodePaint={nodePaint}
            nodeVal={12}
            linkColor={() => isDark ? "#4a5568" : "#94a3b8"}
            linkWidth={1}
            linkDirectionalArrowLength={4}
            linkDirectionalArrowRelPos={1}
            linkCurvature={0.1}
            backgroundColor="transparent"
            onNodeHover={handleNodeHover}
            nodePointerAreaPaint={(paintNode: { id: string; x: number; y: number }, _color: string, ctx: CanvasRenderingContext2D) => {
              const n = graphData.nodes.find((nd) => nd.id === paintNode.id);
              const size = n?.type === "contact" ? 12 : n?.type === "event" ? 12 * 1.6 : 12 * 1.1;
              ctx.beginPath();
              ctx.arc(paintNode.x, paintNode.y, size || 12, 0, Math.PI * 2);
              ctx.fill();
            }}
            d3AlphaDecay={0.02}
            cooldownTicks={100}
          />
        )}

        {/* 悬浮信息 */}
        {hoverNode && (
          <div className="absolute top-4 right-4 bg-popover border rounded-lg shadow-lg p-3 max-w-xs z-10">
            <div className="flex items-center gap-2 mb-1">
              <Badge variant={hoverNode.type === "project" ? "default" : "secondary"} className="text-xs">
                {hoverNode.type === "contact" ? "联系人" : hoverNode.type === "event" ? "事件" : "项目"}
              </Badge>
              <span className="font-medium">{hoverNode.label}</span>
            </div>
            {hoverNode.sublabel && (
              <p className="text-sm text-muted-foreground">{hoverNode.sublabel}</p>
            )}
            {hoverLinks.length > 0 && (
              <div className="mt-2 text-xs text-muted-foreground">
                <p className="font-medium">关联 ({hoverLinks.length}):</p>
                {hoverLinks.slice(0, 5).map((l, i) => (
                  <p key={i}>{l.label || "关联"}</p>
                ))}
              </div>
            )}
          </div>
        )}

        {/* 图例 */}
        <div className="absolute bottom-4 left-4 bg-popover/80 backdrop-blur border rounded-lg p-3 text-xs">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-full border-2" style={{ backgroundColor: isDark ? "#2a1f14" : "#fef3e2", borderColor: isDark ? "#d4a574" : "#b87333" }} />
              <span>联系人</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-4 h-2.5 rounded-sm border" style={{ backgroundColor: isDark ? "#2a2014" : "#fef5eb", borderColor: isDark ? "#e8c99b" : "#d4a574" }} />
              <span>事件</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 border" style={{ backgroundColor: isDark ? "#142a1f" : "#e8f5ec", borderColor: isDark ? "#6abf7b" : "#4a7c59", clipPath: "polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)" }} />
              <span>项目</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
