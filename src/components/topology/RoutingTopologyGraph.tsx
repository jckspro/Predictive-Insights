import React, { useMemo } from 'react';
import ReactFlow, {
  Background,
  Controls,
  Node,
  Edge,
  MarkerType,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { TopologyLinkItem } from '../../types';
import { useDeviceDrawer } from '../../context/DeviceDrawerContext';
import { Server, Shield, Radio, Router as RouterIcon, Cpu } from 'lucide-react';

interface RoutingTopologyGraphProps {
  data: TopologyLinkItem[];
}

const TYPE_COLORS: Record<string, string> = {
  Router: '#c5a059',
  Firewall: '#ef4444',
  Switch: '#10b981',
  Controller: '#d4b574',
  AccessPoint: '#3b82f6',
  AuthenticationServer: '#f59e0b',
  Server: '#e5e5e5',
  Client: 'rgba(255,255,255,0.4)',
};

// Custom Node Renderer
const CustomNode = ({ data }: { data: any }) => {
  const color = TYPE_COLORS[data.deviceType] || '#c5a059';

  return (
    <div
      onClick={() => data.onClick(data.label)}
      className="px-3 py-2 rounded-lg bg-[#151821] border border-white/10 text-[#e5e5e5] font-sans text-xs flex items-center gap-2 shadow-[0_0_15px_rgba(197,160,89,0.15)] hover:border-[#c5a059] hover:scale-105 transition-all cursor-pointer"
      style={{ borderColor: color }}
    >
      <div
        className="w-2.5 h-2.5 rounded-full animate-ping"
        style={{ backgroundColor: color }}
      />
      <div>
        <div className="font-medium text-xs" style={{ color }}>
          {data.label}
        </div>
        <div className="text-[9px] text-white/40 uppercase tracking-wider">{data.deviceType}</div>
      </div>
    </div>
  );
};

const nodeTypes = {
  custom: CustomNode,
};

export const RoutingTopologyGraph: React.FC<RoutingTopologyGraphProps> = ({ data }) => {
  const { openDeviceDrawer } = useDeviceDrawer();

  const { nodes, edges } = useMemo(() => {
    if (!data || data.length === 0) {
      return { nodes: [], edges: [] };
    }

    const nodeMap = new Map<string, { type: string; degree: number }>();

    data.forEach((link) => {
      if (!nodeMap.has(link.source)) {
        nodeMap.set(link.source, { type: link.sourceType, degree: 1 });
      } else {
        nodeMap.get(link.source)!.degree += 1;
      }

      if (!nodeMap.has(link.target)) {
        nodeMap.set(link.target, { type: link.targetType, degree: 1 });
      } else {
        nodeMap.get(link.target)!.degree += 1;
      }
    });

    const uniqueNodes = Array.from(nodeMap.entries());
    const total = uniqueNodes.length;
    const centerX = 400;
    const centerY = 200;
    const radius = Math.min(280, 60 + total * 15);

    const generatedNodes: Node[] = uniqueNodes.map(([id, info], idx) => {
      const angle = (idx / total) * 2 * Math.PI;
      const x = centerX + radius * Math.cos(angle);
      const y = centerY + radius * Math.sin(angle);

      return {
        id,
        type: 'custom',
        position: { x, y },
        data: {
          label: id,
          deviceType: info.type,
          degree: info.degree,
          onClick: (dev: string) => openDeviceDrawer(dev),
        },
      };
    });

    const generatedEdges: Edge[] = data.map((link, idx) => ({
      id: `e-${link.source}-${link.target}-${idx}`,
      source: link.source,
      target: link.target,
      animated: true,
      style: {
        stroke: '#c5a059',
        strokeWidth: Math.min(6, Math.max(1.5, link.weight / 4)),
        opacity: 0.8,
      },
      markerEnd: {
        type: MarkerType.ArrowClosed,
        color: '#c5a059',
      },
      label: `${link.weight} failures`,
      labelStyle: { fill: '#c5a059', fontSize: 10, fontFamily: 'sans-serif' },
      labelBgStyle: { fill: '#0E1017', rx: 4, ry: 4 },
    }));

    return { nodes: generatedNodes, edges: generatedEdges };
  }, [data, openDeviceDrawer]);

  if (!nodes.length) {
    return (
      <div className="h-[400px] flex items-center justify-center text-white/40 font-sans text-xs">
        NO TOPOLOGY FAILURE EDGES DETECTED
      </div>
    );
  }

  return (
    <div className="h-[420px] w-full bg-[#0E1017] border border-white/10 rounded-lg overflow-hidden relative">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        fitView
        attributionPosition="bottom-right"
      >
        <Background color="#1f1f1f" gap={20} size={1} />
        <Controls className="fill-[#c5a059] bg-[#151821] border-white/10" />
      </ReactFlow>
      <div className="absolute bottom-2 left-2 bg-[#151821]/90 border border-white/10 px-3 py-1.5 rounded flex items-center gap-3 text-[10px] text-white/40 font-sans">
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-[#c5a059]" /> Router
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-[#ef4444]" /> Firewall
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-[#10b981]" /> Switch
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-[#d4b574]" /> Controller
        </span>
      </div>
    </div>
  );
};
