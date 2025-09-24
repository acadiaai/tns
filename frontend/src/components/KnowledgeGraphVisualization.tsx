import React, { useEffect, useState, useCallback } from 'react';
import ReactFlow, {
  Node,
  Edge,
  useNodesState,
  useEdgesState,
  Background,
  Controls,
  MiniMap,
  addEdge,
  Connection,
  MarkerType,
  NodeTypes,
  Handle,
  Position,
  useReactFlow
} from 'reactflow';
import 'reactflow/dist/style.css';
import { motion, AnimatePresence } from 'framer-motion';
import { GitBranch, Sparkles, Brain, Heart, Target, Shield, Users, Activity } from 'lucide-react';

// Custom node component with glassmorphic design
const CustomNode = ({ data }: { data: any }) => {
  const getIcon = () => {
    switch (data.type) {
      case 'emotion': return <Heart className="w-4 h-4" />;
      case 'symptom': return <Activity className="w-4 h-4" />;
      case 'goal': return <Target className="w-4 h-4" />;
      case 'trauma': return <Shield className="w-4 h-4" />;
      case 'relationship': return <Users className="w-4 h-4" />;
      case 'coping': return <Brain className="w-4 h-4" />;
      default: return <Sparkles className="w-4 h-4" />;
    }
  };

  const getTypeColor = () => {
    switch (data.type) {
      case 'emotion': return 'from-blue-500/20 to-blue-600/20 border-blue-500/30';
      case 'symptom': return 'from-purple-500/20 to-purple-600/20 border-purple-500/30';
      case 'goal': return 'from-green-500/20 to-green-600/20 border-green-500/30';
      case 'trauma': return 'from-red-500/20 to-red-600/20 border-red-500/30';
      case 'relationship': return 'from-amber-500/20 to-amber-600/20 border-amber-500/30';
      case 'coping': return 'from-gray-500/20 to-gray-600/20 border-gray-500/30';
      default: return 'from-white/10 to-white/20 border-white/20';
    }
  };

  const nodeSize = 40 + (data.frequency || 0) * 5;

  return (
    <motion.div
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      whileHover={{ scale: 1.1 }}
      transition={{ type: "spring", stiffness: 300 }}
      className={`relative backdrop-blur-xl bg-gradient-to-br ${getTypeColor()} 
                  border rounded-2xl p-4 shadow-2xl hover:shadow-3xl transition-all
                  cursor-pointer`}
      style={{ width: nodeSize, height: nodeSize }}
    >
      <Handle type="target" position={Position.Top} className="opacity-0" />
      <Handle type="source" position={Position.Bottom} className="opacity-0" />
      
      <div className="flex flex-col items-center justify-center h-full">
        <div className="text-white/80 mb-1">
          {getIcon()}
        </div>
        <div className="text-xs text-white/90 font-medium text-center leading-tight">
          {data.label}
        </div>
      </div>

      {/* Animated glow effect */}
      <motion.div
        className="absolute inset-0 rounded-2xl"
        animate={{
          boxShadow: [
            '0 0 20px rgba(255,255,255,0.1)',
            '0 0 40px rgba(255,255,255,0.2)',
            '0 0 20px rgba(255,255,255,0.1)',
          ],
        }}
        transition={{ duration: 2, repeat: Infinity }}
      />

      {/* Frequency indicator */}
      {data.frequency > 5 && (
        <div className="absolute -top-2 -right-2 w-4 h-4 bg-gradient-to-br from-white/20 to-white/10 
                        backdrop-blur-sm rounded-full flex items-center justify-center">
          <span className="text-[8px] text-white/80 font-bold">{data.frequency}</span>
        </div>
      )}
    </motion.div>
  );
};

const nodeTypes: NodeTypes = {
  custom: CustomNode,
};

interface KnowledgeGraphProps {
  sessionId?: string;
  realtime?: boolean;
}

export const KnowledgeGraphVisualization: React.FC<KnowledgeGraphProps> = ({ sessionId, realtime = false }) => {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const { fitView } = useReactFlow();

  const onConnect = useCallback(
    (params: Connection) => setEdges((eds) => addEdge(params, eds)),
    [setEdges]
  );

  const onNodeClick = useCallback((_event: React.MouseEvent, node: Node) => {
    setSelectedNode(node);
  }, []);

  // Initialize with mock data
  useEffect(() => {
    const initialNodes: Node[] = [
      {
        id: '1',
        type: 'custom',
        position: { x: 250, y: 100 },
        data: { label: 'Anxiety', type: 'symptom', frequency: 8, relationships: 5 },
      },
      {
        id: '2',
        type: 'custom',
        position: { x: 100, y: 200 },
        data: { label: 'Sleep Issues', type: 'symptom', frequency: 6, relationships: 3 },
      },
      {
        id: '3',
        type: 'custom',
        position: { x: 400, y: 200 },
        data: { label: 'Work Stress', type: 'relationship', frequency: 7, relationships: 4 },
      },
      {
        id: '4',
        type: 'custom',
        position: { x: 250, y: 300 },
        data: { label: 'Mindfulness', type: 'coping', frequency: 5, relationships: 2 },
      },
      {
        id: '5',
        type: 'custom',
        position: { x: 100, y: 400 },
        data: { label: 'Family Support', type: 'relationship', frequency: 4, relationships: 3 },
      },
      {
        id: '6',
        type: 'custom',
        position: { x: 400, y: 400 },
        data: { label: 'Better Sleep', type: 'goal', frequency: 6, relationships: 2 },
      },
      {
        id: '7',
        type: 'custom',
        position: { x: 250, y: 500 },
        data: { label: 'Reduce Stress', type: 'goal', frequency: 7, relationships: 4 },
      },
    ];

    const initialEdges: Edge[] = [
      {
        id: 'e1-2',
        source: '1',
        target: '2',
        animated: true,
        style: { stroke: 'rgba(255,255,255,0.3)', strokeWidth: 2 },
        markerEnd: { type: MarkerType.ArrowClosed, color: 'rgba(255,255,255,0.3)' },
      },
      {
        id: 'e1-3',
        source: '1',
        target: '3',
        animated: true,
        style: { stroke: 'rgba(255,255,255,0.4)', strokeWidth: 3 },
        markerEnd: { type: MarkerType.ArrowClosed, color: 'rgba(255,255,255,0.4)' },
      },
      {
        id: 'e3-7',
        source: '3',
        target: '7',
        animated: true,
        style: { stroke: 'rgba(255,255,255,0.3)', strokeWidth: 2 },
        markerEnd: { type: MarkerType.ArrowClosed, color: 'rgba(255,255,255,0.3)' },
      },
      {
        id: 'e4-1',
        source: '4',
        target: '1',
        animated: true,
        style: { stroke: 'rgba(255,255,255,0.25)', strokeWidth: 2 },
        markerEnd: { type: MarkerType.ArrowClosed, color: 'rgba(255,255,255,0.25)' },
      },
      {
        id: 'e5-7',
        source: '5',
        target: '7',
        animated: true,
        style: { stroke: 'rgba(255,255,255,0.2)', strokeWidth: 2 },
        markerEnd: { type: MarkerType.ArrowClosed, color: 'rgba(255,255,255,0.2)' },
      },
      {
        id: 'e2-6',
        source: '2',
        target: '6',
        animated: true,
        style: { stroke: 'rgba(255,255,255,0.4)', strokeWidth: 3 },
        markerEnd: { type: MarkerType.ArrowClosed, color: 'rgba(255,255,255,0.4)' },
      },
    ];

    setNodes(initialNodes);
    setEdges(initialEdges);

    // Fit view after nodes are loaded
    setTimeout(() => fitView({ padding: 0.2 }), 100);
  }, [setNodes, setEdges, fitView]);

  // Real-time updates via WebSocket
  useEffect(() => {
    if (realtime && sessionId) {
      const ws = new WebSocket(`ws://localhost:8083/api/sessions/${sessionId}/knowledge-graph`);
      
      ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        if (data.type === 'node_update') {
          setNodes((nds) => {
            const existingNode = nds.find(n => n.id === data.node.id);
            if (existingNode) {
              return nds.map(n => 
                n.id === data.node.id 
                  ? { ...n, data: { ...n.data, frequency: n.data.frequency + 1 } }
                  : n
              );
            } else {
              const newNode: Node = {
                id: data.node.id,
                type: 'custom',
                position: { 
                  x: Math.random() * 500 + 50, 
                  y: Math.random() * 500 + 50 
                },
                data: data.node,
              };
              return [...nds, newNode];
            }
          });
        } else if (data.type === 'link_update') {
          setEdges((eds) => [...eds, {
            id: `e${data.link.source}-${data.link.target}`,
            source: data.link.source,
            target: data.link.target,
            animated: true,
            style: { 
              stroke: `rgba(255,255,255,${data.link.strength * 0.5})`, 
              strokeWidth: data.link.strength * 4 
            },
            markerEnd: { 
              type: MarkerType.ArrowClosed, 
              color: `rgba(255,255,255,${data.link.strength * 0.5})` 
            },
          }]);
        }
      };

      return () => ws.close();
    }
  }, [sessionId, realtime, setNodes, setEdges]);

  return (
    <div className="relative w-full h-full">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-xl rounded-2xl overflow-hidden">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onNodeClick={onNodeClick}
          nodeTypes={nodeTypes}
          fitView
          className="react-flow-dark-theme"
        >
          <Background color="#ffffff" gap={32} size={1} style={{ opacity: 0.05 }} />
          <Controls 
            className="!bg-white/5 !backdrop-blur-xl !border !border-white/10 !rounded-xl"
            showInteractive={false}
          />
          <MiniMap 
            className="!bg-white/5 !backdrop-blur-xl !border !border-white/10 !rounded-xl"
            nodeColor={(node) => {
              const colors: Record<string, string> = {
                emotion: '#3B82F6',
                symptom: '#8B5CF6',
                goal: '#10B981',
                trauma: '#EF4444',
                relationship: '#F59E0B',
                coping: '#6B7280',
              };
              return colors[node.data.type] || '#ffffff';
            }}
            maskColor="rgba(0,0,0,0.8)"
          />
        </ReactFlow>

        {/* Header */}
        <div className="absolute top-4 left-4 z-10 pointer-events-none">
          <h3 className="text-white/80 font-medium flex items-center gap-2">
            <GitBranch className="w-5 h-5" />
            Knowledge Graph
            {realtime && (
              <motion.div
                animate={{ opacity: [0.5, 1, 0.5] }}
                transition={{ duration: 2, repeat: Infinity }}
                className="w-2 h-2 bg-green-400 rounded-full"
              />
            )}
          </h3>
        </div>

        {/* Selected Node Details */}
        <AnimatePresence>
          {selectedNode && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="absolute bottom-4 left-4 right-4 p-4 bg-white/10 backdrop-blur-xl rounded-xl border border-white/20"
            >
              <h4 className="text-white/80 font-medium mb-2 flex items-center gap-2">
                <Sparkles className="w-4 h-4" />
                {selectedNode.data.label}
              </h4>
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div>
                  <p className="text-white/40">Type</p>
                  <p className="text-white/80 capitalize">{selectedNode.data.type}</p>
                </div>
                <div>
                  <p className="text-white/40">Frequency</p>
                  <p className="text-white/80">{selectedNode.data.frequency}</p>
                </div>
                <div>
                  <p className="text-white/40">Connections</p>
                  <p className="text-white/80">{selectedNode.data.relationships}</p>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

// Wrapper component to provide ReactFlowProvider
export default function KnowledgeGraphWrapper(props: KnowledgeGraphProps) {
  return (
    <ReactFlow>
      <KnowledgeGraphVisualization {...props} />
    </ReactFlow>
  );
}