import React, { useState, useEffect } from 'react';
import { repository_PhaseData } from '../api/generated';
import { Check, X, Circle, Hash, List, ToggleLeft, Type, Package } from 'lucide-react';

// Expandable text component for medium-length text
const ExpandableText: React.FC<{ text: string }> = ({ text }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const truncateLength = 120;
  const truncated = text.length > truncateLength ? text.substring(0, truncateLength) + '...' : text;

  return (
    <div className="w-full">
      <div className="px-3 py-2 rounded-lg bg-gray-500/10 border border-gray-500/20">
        <p className="text-sm text-gray-200 leading-relaxed">
          {isExpanded ? text : truncated}
        </p>
      </div>
      {text.length > truncateLength && (
        <div className="flex items-center gap-3 mt-1.5 px-3">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-[11px] text-blue-400 hover:text-blue-300 transition-colors"
          >
            {isExpanded ? 'Show less' : 'Show more'}
          </button>
          <span className="text-[11px] text-gray-500">
            {text.length} chars
          </span>
        </div>
      )}
    </div>
  );
};

interface SchemaPhaseDataFormProps {
  phaseData: repository_PhaseData[];
  data?: Record<string, any>;
  recentlyUpdatedFields?: Set<string>;
  className?: string;
}

interface ParsedField {
  id: string;
  name: string;
  description?: string;
  type: string;
  required: boolean;
  properties?: any;
  enum?: string[];
  minimum?: number;
  maximum?: number;
  default?: any;
}

export const SchemaPhaseDataForm: React.FC<SchemaPhaseDataFormProps> = ({
  phaseData,
  data = {},
  recentlyUpdatedFields = new Set(),
  className = ''
}) => {
  const [parsedFields, setParsedFields] = useState<ParsedField[]>([]);

  useEffect(() => {
    const fields: ParsedField[] = phaseData.map(item => {
      let parsedSchema: any = {};

      try {
        // Try to parse as JSON schema first
        if (item.schema && item.schema.startsWith('{')) {
          parsedSchema = JSON.parse(item.schema);
        } else {
          // Simple type string
          parsedSchema = { type: item.schema || 'string' };
        }
      } catch (e) {
        // Fallback to simple type
        parsedSchema = { type: item.schema || 'string' };
      }

      return {
        id: item.id || '',
        name: item.name || '',
        description: item.description,
        type: parsedSchema.type || 'string',
        required: item.required || false,
        properties: parsedSchema.properties,
        enum: parsedSchema.enum,
        minimum: parsedSchema.minimum,
        maximum: parsedSchema.maximum,
        default: parsedSchema.default
      };
    });

    setParsedFields(fields);
  }, [phaseData]);

  if (!parsedFields.length) {
    return (
      <div className={`text-center py-4 ${className}`}>
        <p className="text-xs text-white/60">No data fields defined for this phase</p>
      </div>
    );
  }

  return (
    <div className={`space-y-2 ${className}`}>
      {parsedFields.map((field) => (
        <SchemaFieldCard
          key={field.id}
          field={field}
          value={data[field.name]}
          hasValue={data[field.name] !== undefined && data[field.name] !== null && data[field.name] !== ''}
          isRecentlyUpdated={recentlyUpdatedFields.has(field.name)}
          phaseData={phaseData}
        />
      ))}
    </div>
  );
};

interface SchemaFieldCardProps {
  field: ParsedField;
  value: any;
  hasValue: boolean;
  isRecentlyUpdated?: boolean;
  phaseData: repository_PhaseData[];
}

const SchemaFieldCard: React.FC<SchemaFieldCardProps> = ({
  field,
  value,
  hasValue,
  isRecentlyUpdated = false,
  phaseData
}) => {
  // Format field name to be user-friendly
  const formatFieldName = (name: string): string => {
    return name
      .replace(/_/g, ' ')
      .split(' ')
      .map(word => {
        // Special cases
        if (word.toLowerCase() === 'suds') return 'SUDS';
        if (word.toLowerCase() === 'id') return 'ID';
        // Capitalize first letter
        return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
      })
      .join(' ');
  };

  // Parse schema from phaseData
  const getSchemaInfo = () => {
    // Try to find original phaseData item to get schema
    const originalItem = phaseData.find(pd => pd.id === field.id);
    if (!originalItem?.schema) return {};

    try {
      return JSON.parse(originalItem.schema);
    } catch {
      return {};
    }
  };

  const schema = getSchemaInfo();

  // Enhanced value display for all primitive types
  const formatValue = (val: any): JSX.Element | null => {
    // Boolean - clean badge display
    if (field.type === 'boolean') {
      if (val === true) {
        return (
          <span className="inline-flex items-center px-2.5 py-1 rounded-md bg-emerald-500/15 border border-emerald-500/25 text-xs text-emerald-400 font-medium">
            <Check className="w-3 h-3 mr-1" />
            Yes
          </span>
        );
      } else if (val === false) {
        return (
          <span className="inline-flex items-center px-2.5 py-1 rounded-md bg-red-500/15 border border-red-500/25 text-xs text-red-400 font-medium">
            <X className="w-3 h-3 mr-1" />
            No
          </span>
        );
      }
      return null;
    }

    // Integer - clean display with subtle badge
    if (field.type === 'integer') {
      const min = schema?.min || field.minimum || 0;
      const max = schema?.max || field.maximum || 10;
      const percentage = ((val - min) / (max - min)) * 100;

      return (
        <div className="flex items-center gap-2">
          <div className="px-3 py-1.5 rounded-lg bg-slate-500/10 border border-slate-500/20">
            <span className="text-sm font-semibold text-slate-300">{val}</span>
            {(min !== 0 || max !== 10) && (
              <span className="text-[10px] text-slate-400/60 ml-2">
                {min}-{max}
              </span>
            )}
          </div>
          {/* Optional mini progress bar for visual context */}
          <div className="w-12 h-1 bg-gray-700/30 rounded-full overflow-hidden">
            <div
              className="h-full bg-slate-400/40 transition-all duration-300"
              style={{ width: `${Math.max(0, Math.min(100, percentage))}%` }}
            />
          </div>
        </div>
      );
    }

    // Number (float) - clean badge display
    if (field.type === 'number') {
      const displayVal = typeof val === 'number' ? val.toFixed(2) : val;
      const min = schema?.min || field.minimum;
      const max = schema?.max || field.maximum;

      return (
        <div className="flex items-center gap-2">
          <div className="px-3 py-1.5 rounded-lg bg-purple-500/10 border border-purple-500/20">
            <span className="text-sm font-semibold text-purple-300">{displayVal}</span>
            {min !== undefined && max !== undefined && (
              <span className="text-[10px] text-purple-400/60 ml-2">
                {min}-{max}
              </span>
            )}
          </div>
          {min !== undefined && max !== undefined && (
            <div className="w-12 h-1 bg-gray-700/30 rounded-full overflow-hidden">
              <div
                className="h-full bg-purple-400/40 transition-all duration-300"
                style={{ width: `${Math.max(0, Math.min(100, ((val - min) / (max - min)) * 100))}%` }}
              />
            </div>
          )}
        </div>
      );
    }

    // String - enhanced display for paragraph text
    if (field.type === 'string') {
      const isLongText = val && val.length > 150;
      const isMediumText = val && val.length > 80 && val.length <= 150;
      const isParagraphText = isLongText && (val.includes('\n') || val.length > 200);

      if (isParagraphText) {
        // Full paragraph display for long text
        return (
          <div className="w-full space-y-2">
            <div className="px-4 py-3 rounded-xl bg-gray-500/8 border border-gray-500/15 max-w-full">
              <div className="text-sm text-gray-200 leading-relaxed whitespace-pre-wrap max-h-32 overflow-y-auto">
                {val}
              </div>
            </div>
            <div className="flex items-center gap-2 text-[10px] text-gray-400">
              <span>{val.length} characters</span>
              {val.includes('\n') && <span>• Multi-line</span>}
            </div>
          </div>
        );
      } else if (isLongText || isMediumText) {
        // Expandable display for medium-long text
        return <ExpandableText text={val} />;
      } else {
        // Regular short text display - show full text up to 80 chars
        return (
          <div className="flex-1">
            <div className="px-3 py-1.5 rounded-lg bg-gray-500/10 border border-gray-500/20">
              <span className="text-sm text-gray-200 break-words">
                {val}
              </span>
            </div>
          </div>
        );
      }
    }

    // Enum options - highlight selected
    if (field.enum && field.enum.includes(val)) {
      return (
        <span className="px-2.5 py-1 rounded-md bg-violet-500/15 border border-violet-500/25 text-xs text-violet-300 font-medium">
          {String(val)}
        </span>
      );
    }

    // Arrays - show items as badges
    if (field.type === 'array' && Array.isArray(val)) {
      return (
        <div className="flex items-center gap-2">
          <div className="flex flex-wrap gap-1.5">
            {val.slice(0, 3).map((item, idx) => (
              <div key={idx} className="px-2.5 py-1 text-xs bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 rounded-md">
                {String(item)}
              </div>
            ))}
            {val.length > 3 && (
              <span className="text-xs text-gray-400">
                +{val.length - 3} more
              </span>
            )}
          </div>
        </div>
      );
    }

    // Objects - show key count in badge
    if (field.type === 'object' && val && typeof val === 'object') {
      const keys = Object.keys(val);
      return (
        <div className="px-3 py-1.5 rounded-lg bg-cyan-500/10 border border-cyan-500/20">
          <span className="text-sm font-medium text-cyan-300">
            {keys.length} {keys.length === 1 ? 'field' : 'fields'}
          </span>
        </div>
      );
    }

    // Default text
    if (val !== undefined && val !== null && val !== '') {
      return <span className="text-white/80 text-sm">{String(val)}</span>;
    }

    return null;
  };

  // Minimal icon for field type with color coding
  const getFieldIcon = () => {
    if (field.type === 'boolean') return <ToggleLeft className="w-3.5 h-3.5 text-emerald-400/40" />;
    if (field.enum) return <List className="w-3.5 h-3.5 text-violet-400/40" />;
    if (field.type === 'integer') return <Hash className="w-3.5 h-3.5 text-blue-400/40" />;
    if (field.type === 'number') return <Hash className="w-3.5 h-3.5 text-purple-400/40" />;
    if (field.type === 'string') return <Type className="w-3.5 h-3.5 text-gray-400/40" />;
    if (field.type === 'array') return <List className="w-3.5 h-3.5 text-indigo-400/40" />;
    if (field.type === 'object') return <Package className="w-3.5 h-3.5 text-cyan-400/40" />;
    return <Circle className="w-3.5 h-3.5 text-white/20" />;
  };

  // For text values, use vertical layout; for simple values, use horizontal
  const useVerticalLayout = hasValue && field.type === 'string' && value && value.length > 40;

  return (
    <div className={`
      relative rounded-lg px-4 py-3 transition-all duration-200
      ${hasValue ? 'bg-white/[0.03] border border-white/15' : 'bg-white/[0.01] border border-white/5'}
      ${isRecentlyUpdated ? 'ring-1 ring-emerald-400/40' : ''}
      backdrop-blur-sm hover:bg-white/[0.04]
    `}>
      {useVerticalLayout ? (
        // Vertical layout for longer text values
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            {getFieldIcon()}
            <span className="text-white/80 text-sm font-medium">
              {formatFieldName(field.name)}
            </span>
          </div>
          <div className="pl-5">
            {formatValue(value)}
          </div>
        </div>
      ) : (
        // Horizontal layout for short values
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            {getFieldIcon()}
            <span className="text-white/80 text-sm font-medium">
              {formatFieldName(field.name)}
            </span>
            {field.required && !hasValue && (
              <span className="text-amber-400/60 text-xs">Required</span>
            )}
          </div>
          <div className="flex-shrink-0">
            {hasValue ? (
              formatValue(value)
            ) : (
              <Circle className="w-4 h-4 text-white/20" />
            )}
          </div>
        </div>
      )}
      {!hasValue && field.description && (
        <p className="text-xs text-white/40 mt-1 pl-5">{field.description}</p>
      )}
    </div>
  );
};