import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Users, 
  Stethoscope, 
  Plus, 
  Eye, 
  Calendar,
  FileText,
  Activity
} from 'lucide-react';

interface NetworkNode {
  id: string;
  name: string;
  type: 'patient' | 'therapist';
  x?: number;
  y?: number;
  fx?: number | null;
  fy?: number | null;
  status?: 'active' | 'inactive';
}

interface NetworkLink {
  source: string | NetworkNode;
  target: string | NetworkNode;
  sessionId?: string;
  status?: 'active' | 'paused' | 'completed';
  phase?: string;
  progress?: number;
}

interface RadialMenuItem {
  icon: React.ElementType;
  label: string;
  action: () => void;
  color: string;
}

interface SessionNetworkMapProps {
  patients: Array<{ id: string; name: string; intakeComplete: boolean }>;
  therapists: Array<{ id: string; name: string; specialty: string; active: boolean }>;
  sessions: Array<{ 
    id: string; 
    patientId: string; 
    therapistId: string; 
    status: string; 
    phase: string;
    completionPercentage: number;
  }>;
  onCreateSession: (patientId: string, therapistId: string) => void;
  onJoinSession: (sessionId: string) => void;
}

export const SessionNetworkMap: React.FC<SessionNetworkMapProps> = ({
  patients,
  therapists,
  sessions,
  onCreateSession,
  onJoinSession
}) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [selectedLink, setSelectedLink] = useState<NetworkLink | null>(null);
  const [showRadialMenu, setShowRadialMenu] = useState(false);
  const [radialMenuPosition, setRadialMenuPosition] = useState({ x: 0, y: 0 });
  const [debugMode, setDebugMode] = useState(false);

  // Enhanced logging function
  const logEvent = (eventType: string, data: any) => {
    if (debugMode) {
      console.log(`[SessionNetwork] ${eventType}:`, {
        timestamp: new Date().toISOString(),
        ...data
      });
    }
  };

  useEffect(() => {
    if (!svgRef.current || !containerRef.current) return;

    // Clear previous content
    d3.select(svgRef.current).selectAll('*').remove();

    const rect = containerRef.current.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;

    const svg = d3.select(svgRef.current)
      .attr('width', width)
      .attr('height', height);

    // Create a main group for all elements
    const mainGroup = svg.append('g');

    // Add subtle grid pattern
    const defs = svg.append('defs');
    
    const pattern = defs.append('pattern')
      .attr('id', 'grid')
      .attr('width', 40)
      .attr('height', 40)
      .attr('patternUnits', 'userSpaceOnUse');
    
    pattern.append('circle')
      .attr('cx', 1)
      .attr('cy', 1)
      .attr('r', 0.5)
      .attr('fill', 'rgba(255, 255, 255, 0.03)');

    // Background
    mainGroup.append('rect')
      .attr('width', width)
      .attr('height', height)
      .attr('fill', 'url(#grid)');

    // Create nodes data
    const nodes: NetworkNode[] = [
      ...patients.map(p => ({
        id: p.id,
        name: p.name,
        type: 'patient' as const,
        status: (p.intakeComplete ? 'active' : 'inactive') as 'active' | 'inactive'
      })),
      ...therapists.map(t => ({
        id: t.id,
        name: t.name,
        type: 'therapist' as const,
        status: (t.active ? 'active' : 'inactive') as 'active' | 'inactive'
      }))
    ];

    // Create links data
    const nodeIds = new Set(nodes.map(n => n.id));
    const links: NetworkLink[] = sessions
      .filter(s => nodeIds.has(s.patientId) && nodeIds.has(s.therapistId))
      .map(s => ({
        source: s.patientId,
        target: s.therapistId,
        sessionId: s.id,
        status: s.status as any,
        phase: s.phase,
        progress: s.completionPercentage
      }));

    // Simple force simulation with minimal forces
    const simulation = d3.forceSimulation<NetworkNode>(nodes)
      .force('link', d3.forceLink<NetworkNode, NetworkLink>(links)
        .id(d => d.id)
        .distance(200))
      .force('charge', d3.forceManyBody().strength(-800))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('x', d3.forceX(width / 2).strength(0.1))
      .force('y', d3.forceY(height / 2).strength(0.1));

    // Create link elements
    const linkGroup = mainGroup.append('g').attr('class', 'links');
    
    const link = linkGroup.selectAll('g')
      .data(links)
      .enter().append('g')
      .attr('class', 'link-group')
      .style('cursor', 'pointer');

    // Link lines
    link.append('line')
      .attr('stroke', '#ffffff')
      .attr('stroke-width', 2)
      .attr('stroke-opacity', 0.1)
      .attr('class', 'link-line');

    // Active link overlay
    link.append('line')
      .attr('stroke', d => d.status === 'active' ? '#10b981' : 'transparent')
      .attr('stroke-width', 3)
      .attr('stroke-opacity', 0.6)
      .attr('class', 'link-active');

    // Clickable area for links
    link.append('line')
      .attr('stroke', 'transparent')
      .attr('stroke-width', 20)
      .on('click', (event, d) => {
        event.stopPropagation();
        logEvent('link-click', { link: d });
        setSelectedLink(d);
        const coords = d3.pointer(event, containerRef.current);
        setRadialMenuPosition({ x: coords[0], y: coords[1] });
        setShowRadialMenu(true);
      })
      .on('mouseenter', (event, d) => {
        logEvent('link-hover-enter', { link: d });
        d3.select(event.currentTarget.parentNode)
          .select('.link-line')
          .transition()
          .duration(200)
          .attr('stroke-opacity', 0.3)
          .attr('stroke-width', 3);
      })
      .on('mouseleave', (event, d) => {
        logEvent('link-hover-leave', { link: d });
        d3.select(event.currentTarget.parentNode)
          .select('.link-line')
          .transition()
          .duration(200)
          .attr('stroke-opacity', 0.1)
          .attr('stroke-width', 2);
      });

    // Create node elements
    const nodeGroup = mainGroup.append('g').attr('class', 'nodes');
    
    const node = nodeGroup.selectAll('g')
      .data(nodes)
      .enter().append('g')
      .attr('class', 'node-group')
      .style('cursor', 'move');

    // Glass morphism background for nodes
    node.append('circle')
      .attr('r', 40)
      .attr('fill', 'rgba(255, 255, 255, 0.05)')
      .attr('stroke', 'rgba(255, 255, 255, 0.1)')
      .attr('stroke-width', 1)
      .attr('filter', 'blur(0.5px)');

    // Node type indicator
    node.append('circle')
      .attr('r', 35)
      .attr('fill', d => d.type === 'patient' ? 'rgba(59, 130, 246, 0.1)' : 'rgba(139, 92, 246, 0.1)')
      .attr('stroke', d => d.type === 'patient' ? 'rgba(59, 130, 246, 0.3)' : 'rgba(139, 92, 246, 0.3)')
      .attr('stroke-width', 1);

    // Status indicator
    node.append('circle')
      .attr('cx', 25)
      .attr('cy', -25)
      .attr('r', 5)
      .attr('fill', d => d.status === 'active' ? '#10b981' : '#6b7280')
      .attr('stroke', 'rgba(0, 0, 0, 0.2)')
      .attr('stroke-width', 1);

    // Icons
    node.each(function(d) {
      const g = d3.select(this);
      if (d.type === 'patient') {
        g.append('text')
          .attr('text-anchor', 'middle')
          .attr('dominant-baseline', 'middle')
          .attr('fill', '#3b82f6')
          .attr('font-size', '20px')
          .text('👤');
      } else {
        g.append('text')
          .attr('text-anchor', 'middle')
          .attr('dominant-baseline', 'middle')
          .attr('fill', '#8b5cf6')
          .attr('font-size', '20px')
          .text('🩺');
      }
    });

    // Names
    node.append('text')
      .text(d => d.name)
      .attr('text-anchor', 'middle')
      .attr('y', 55)
      .attr('fill', 'rgba(255, 255, 255, 0.9)')
      .attr('font-size', '12px')
      .attr('font-weight', '500');

    // Node interactions
    node
      .on('mouseenter', function(_event, d) {
        logEvent('node-hover-enter', { node: d });
        // Track hover state
        d3.select(this).select('circle:nth-child(2)')
          .transition()
          .duration(200)
          .attr('r', 38)
          .attr('stroke-width', 2);
      })
      .on('mouseleave', function(_event, d) {
        logEvent('node-hover-leave', { node: d });
        // Clear hover state
        d3.select(this).select('circle:nth-child(2)')
          .transition()
          .duration(200)
          .attr('r', 35)
          .attr('stroke-width', 1);
      })
      .call(d3.drag<SVGGElement, NetworkNode>()
        .on('start', (event, d) => {
          logEvent('drag-start', { node: d });
          if (!event.active) simulation.alphaTarget(0.3).restart();
          d.fx = d.x;
          d.fy = d.y;
        })
        .on('drag', (event, d) => {
          logEvent('drag', { node: d, x: event.x, y: event.y });
          d.fx = event.x;
          d.fy = event.y;
        })
        .on('end', (event, d) => {
          logEvent('drag-end', { node: d });
          if (!event.active) simulation.alphaTarget(0);
          // Keep fixed position
          d.fx = event.x;
          d.fy = event.y;
        })
      );

    // Update positions on tick
    simulation.on('tick', () => {
      link.selectAll('line')
        .attr('x1', (d: any) => (d.source as NetworkNode).x!)
        .attr('y1', (d: any) => (d.source as NetworkNode).y!)
        .attr('x2', (d: any) => (d.target as NetworkNode).x!)
        .attr('y2', (d: any) => (d.target as NetworkNode).y!);

      node.attr('transform', d => `translate(${d.x},${d.y})`);
    });

    // Click outside to close radial menu
    svg.on('click', () => {
      setShowRadialMenu(false);
      setSelectedLink(null);
    });

    return () => {
      simulation.stop();
    };
  }, [patients, therapists, sessions, debugMode]);

  // Radial menu items
  const getRadialMenuItems = (): RadialMenuItem[] => {
    if (!selectedLink) return [];

    const items: RadialMenuItem[] = [
      {
        icon: Eye,
        label: 'View Session',
        action: () => {
          if (selectedLink.sessionId) {
            onJoinSession(selectedLink.sessionId);
          }
        },
        color: '#3b82f6'
      },
      {
        icon: FileText,
        label: 'Patient File',
        action: () => {
          console.log('Open patient file');
        },
        color: '#8b5cf6'
      },
      {
        icon: Calendar,
        label: 'Schedule',
        action: () => {
          console.log('View schedule');
        },
        color: '#10b981'
      },
      {
        icon: Activity,
        label: 'Progress',
        action: () => {
          console.log('View progress');
        },
        color: '#f59e0b'
      }
    ];

    if (selectedLink.status !== 'active') {
      items.unshift({
        icon: Plus,
        label: 'New Session',
        action: () => {
          const source = selectedLink.source as NetworkNode;
          const target = selectedLink.target as NetworkNode;
          if (source && target) {
            const patientId = source.type === 'patient' ? source.id : target.id;
            const therapistId = source.type === 'therapist' ? source.id : target.id;
            // For now, use default 10 turns. In production, show a dialog
            onCreateSession(patientId, therapistId);
          }
        },
        color: '#10b981'
      });
    }

    return items;
  };

  return (
    <div ref={containerRef} className="relative w-full h-full bg-black/20 rounded-3xl overflow-hidden">
      {/* Glass background */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 via-purple-500/5 to-pink-500/5" />
      
      {/* Debug toggle */}
      <button
        onClick={() => setDebugMode(!debugMode)}
        className="absolute top-4 left-4 px-3 py-1 text-xs bg-white/10 hover:bg-white/20 rounded-full text-white/60 transition-colors"
      >
        Debug: {debugMode ? 'ON' : 'OFF'}
      </button>

      {/* SVG Canvas */}
      <svg ref={svgRef} className="w-full h-full" />

      {/* Radial Menu */}
      <AnimatePresence>
        {showRadialMenu && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className="absolute pointer-events-none"
            style={{ left: radialMenuPosition.x, top: radialMenuPosition.y }}
          >
            <div className="relative">
              {getRadialMenuItems().map((item, index) => {
                const angle = (index * 72 - 90) * (Math.PI / 180);
                const x = Math.cos(angle) * 80;
                const y = Math.sin(angle) * 80;
                
                return (
                  <motion.button
                    key={index}
                    initial={{ opacity: 0, x: 0, y: 0 }}
                    animate={{ opacity: 1, x, y }}
                    exit={{ opacity: 0, x: 0, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    onClick={(e) => {
                      e.stopPropagation();
                      item.action();
                      setShowRadialMenu(false);
                    }}
                    className="absolute -translate-x-1/2 -translate-y-1/2 w-12 h-12 bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl flex items-center justify-center hover:bg-white/20 transition-colors pointer-events-auto group"
                    style={{ backgroundColor: `${item.color}20` }}
                  >
                    <item.icon className="w-5 h-5 text-white/80" />
                    <span className="absolute -bottom-6 whitespace-nowrap text-xs text-white/60 opacity-0 group-hover:opacity-100 transition-opacity">
                      {item.label}
                    </span>
                  </motion.button>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Legend */}
      <div className="absolute bottom-4 right-4 p-4 bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10">
        <div className="flex items-center gap-4 text-xs text-white/60">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-blue-400" />
            <span>Patient</span>
          </div>
          <div className="flex items-center gap-2">
            <Stethoscope className="w-4 h-4 text-purple-400" />
            <span>Therapist</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-0.5 bg-green-400" />
            <span>Active</span>
          </div>
        </div>
      </div>
    </div>
  );
};