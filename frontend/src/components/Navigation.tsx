import React from 'react';
import { Zap, Database, MessageSquare, FileText, Brain, Sparkles } from 'lucide-react';

interface NavigationProps {
  currentView: string;
  onViewChange: (view: string) => void;
}

export const Navigation: React.FC<NavigationProps> = ({ currentView, onViewChange }) => {
  const navItems = [
    { id: 'live', icon: Sparkles },
    { id: 'mindflow', icon: Zap },
    { id: 'extraction', icon: Database },
    { id: 'chat', icon: MessageSquare },
    { id: 'intake', icon: FileText },
    { id: 'dashboard', icon: Brain },
  ];

  return (
    <nav className="fixed top-0 left-0 right-0 z-40 bg-background/60 backdrop-blur-xl border-b border-border/20">
      <div className="flex items-center h-10 px-4">
        <div className="flex items-center gap-1">
          {navItems.map(({ id, icon: Icon }) => (
            <button
              key={id}
              onClick={() => onViewChange(id)}
              className={`p-2 rounded-md transition-all ${
                currentView === id 
                  ? 'bg-primary/10 text-primary' 
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
              }`}
            >
              <Icon className="h-4 w-4" />
            </button>
          ))}
        </div>
      </div>
    </nav>
  );
};