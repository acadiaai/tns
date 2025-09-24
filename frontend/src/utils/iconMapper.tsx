import React from 'react';
import {
  MessageCircle,
  Target,
  Search,
  Settings,
  Brain,
  BarChart2,
  Zap,
  Citrus,
  Sprout,
  CheckCircle2,
  Circle,
  Hand,
  User,
  Eye,
  TrendingUp,
  Heart,
  Sparkles
} from 'lucide-react';

const iconMap: Record<string, any> = {
  MessageCircle,
  Target,
  Search,
  Settings,
  Brain,
  BarChart2,
  Zap,
  Citrus,
  Sprout,
  CheckCircle2,
  Circle,
  Hand,
  User,
  Eye,
  TrendingUp,
  Heart,
  Sparkles
};

export const getIcon = (iconName: string, className?: string, size: number = 16) => {
  const IconComponent = iconMap[iconName] || Circle;
  return <IconComponent className={className} size={size} />;
};

export const PhaseIcon: React.FC<{ icon: string; className?: string; size?: number }> = ({
  icon,
  className = "",
  size = 16
}) => {
  // If it's still an emoji (for backwards compatibility)
  if (!iconMap[icon] && icon.length <= 2) {
    return <span className={className}>{icon}</span>;
  }

  return getIcon(icon, className, size);
};