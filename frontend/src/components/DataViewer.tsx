import React from 'react';
import { CheckCircle, XCircle, Calendar, Clock, Hash, Type, FileText, Link, Mail, Tag } from 'lucide-react';

interface DataViewerProps {
  schema: string; // JSON schema
  data: any; // Collected data
  compact?: boolean; // Compact view for inline display
}

export const DataViewer: React.FC<DataViewerProps> = ({ schema, data, compact = false }) => {
  let parsedSchema: any = {};

  try {
    parsedSchema = JSON.parse(schema);
  } catch {
    return (
      <div className="text-white/40 text-sm">
        Invalid schema
      </div>
    );
  }

  const renderValue = (value: any, fieldSchema: any) => {
    if (value === null || value === undefined || value === '') {
      return <span className="text-white/30 italic">Not provided</span>;
    }

    // Boolean
    if (fieldSchema.type === 'boolean') {
      return value ? (
        <div className="inline-flex items-center gap-1 text-green-400">
          <CheckCircle className="w-4 h-4" />
          <span>Yes</span>
        </div>
      ) : (
        <div className="inline-flex items-center gap-1 text-red-400">
          <XCircle className="w-4 h-4" />
          <span>No</span>
        </div>
      );
    }

    // Number/Rating
    if (fieldSchema.type === 'number' || fieldSchema.type === 'integer') {
      const isRating = fieldSchema.minimum === 1 && fieldSchema.maximum === 10;
      if (isRating) {
        return (
          <div className="inline-flex items-center gap-2">
            <span className="text-white/90 font-medium">{value}</span>
            <div className="flex gap-0.5">
              {[...Array(10)].map((_, i) => (
                <div
                  key={i}
                  className={`w-2 h-2 rounded-full ${
                    i < value ? 'bg-emerald-400' : 'bg-white/10'
                  }`}
                />
              ))}
            </div>
          </div>
        );
      }
      return <span className="text-white/90 font-mono">{value}</span>;
    }

    // Array
    if (Array.isArray(value)) {
      return (
        <div className="flex flex-wrap gap-1">
          {value.map((item, idx) => (
            <span key={idx} className="px-2 py-0.5 bg-blue-500/20 text-blue-300 rounded text-xs">
              {item}
            </span>
          ))}
        </div>
      );
    }

    // Date/Time
    if (fieldSchema.format === 'date') {
      return (
        <div className="inline-flex items-center gap-1 text-white/80">
          <Calendar className="w-4 h-4 text-white/40" />
          <span>{new Date(value).toLocaleDateString()}</span>
        </div>
      );
    }

    if (fieldSchema.format === 'time') {
      return (
        <div className="inline-flex items-center gap-1 text-white/80">
          <Clock className="w-4 h-4 text-white/40" />
          <span>{value}</span>
        </div>
      );
    }

    // URL
    if (fieldSchema.format === 'uri') {
      return (
        <a href={value} target="_blank" rel="noopener noreferrer"
           className="inline-flex items-center gap-1 text-blue-400 hover:text-blue-300">
          <Link className="w-4 h-4" />
          <span className="underline">{value}</span>
        </a>
      );
    }

    // Email
    if (fieldSchema.format === 'email') {
      return (
        <a href={`mailto:${value}`}
           className="inline-flex items-center gap-1 text-blue-400 hover:text-blue-300">
          <Mail className="w-4 h-4" />
          <span className="underline">{value}</span>
        </a>
      );
    }

    // Long text
    if (fieldSchema.maxLength && fieldSchema.maxLength > 100) {
      return (
        <div className="text-white/80 text-sm whitespace-pre-wrap bg-white/5 p-2 rounded">
          {value}
        </div>
      );
    }

    // Default string
    return <span className="text-white/90">{value}</span>;
  };

  const renderObject = (obj: any, properties: any, required: string[] = []) => {
    if (!obj) {
      return (
        <div className="text-white/30 text-sm italic p-4 text-center">
          No data collected yet
        </div>
      );
    }

    const entries = Object.entries(properties);

    if (compact) {
      // Compact view for inline display
      return (
        <div className="space-y-1">
          {entries.map(([key, fieldSchema]: [string, any]) => {
            const value = obj[key];
            const isRequired = required.includes(key);
            const hasValue = value !== null && value !== undefined && value !== '';

            return (
              <div key={key} className="flex items-start gap-2">
                <span className="text-xs text-white/50 min-w-[100px]">
                  {fieldSchema.title || key}
                  {isRequired && !hasValue && <span className="text-red-400 ml-1">*</span>}
                </span>
                <div className="flex-1 text-sm">
                  {renderValue(value, fieldSchema)}
                </div>
              </div>
            );
          })}
        </div>
      );
    }

    // Full view
    return (
      <div className="space-y-3">
        {entries.map(([key, fieldSchema]: [string, any]) => {
          const value = obj[key];
          const isRequired = required.includes(key);
          const hasValue = value !== null && value !== undefined && value !== '';

          let Icon = Type;
          if (fieldSchema.type === 'boolean') Icon = CheckCircle;
          else if (fieldSchema.type === 'number' || fieldSchema.type === 'integer') Icon = Hash;
          else if (fieldSchema.format === 'date') Icon = Calendar;
          else if (fieldSchema.format === 'time') Icon = Clock;
          else if (fieldSchema.format === 'email') Icon = Mail;
          else if (fieldSchema.format === 'uri') Icon = Link;
          else if (fieldSchema.maxLength && fieldSchema.maxLength > 100) Icon = FileText;

          return (
            <div key={key} className="bg-white/[0.02] border border-white/10 rounded-lg p-3">
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Icon className="w-4 h-4 text-white/40" />
                  <h4 className="text-sm font-medium text-white/80">
                    {fieldSchema.title || key}
                  </h4>
                  {isRequired && (
                    <span className={`text-xs px-1.5 py-0.5 rounded ${
                      hasValue
                        ? 'bg-green-500/20 text-green-300'
                        : 'bg-red-500/20 text-red-300'
                    }`}>
                      {hasValue ? 'Collected' : 'Required'}
                    </span>
                  )}
                </div>
              </div>

              {fieldSchema.description && (
                <p className="text-xs text-white/50 mb-2">{fieldSchema.description}</p>
              )}

              <div className="mt-2">
                {renderValue(value, fieldSchema)}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  const renderData = () => {
    // Array of items
    if (parsedSchema.type === 'array' && parsedSchema.items) {
      const items = data || [];

      if (items.length === 0) {
        return (
          <div className="text-center py-8 text-white/30">
            <p className="text-sm">No items collected yet</p>
          </div>
        );
      }

      return (
        <div className="space-y-4">
          {items.map((item: any, idx: number) => (
            <div key={idx} className="border border-white/10 rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-medium text-white/70">
                  Item {idx + 1}
                </h3>
                <Tag className="w-4 h-4 text-white/30" />
              </div>
              {renderObject(item, parsedSchema.items.properties, parsedSchema.items.required)}
            </div>
          ))}
        </div>
      );
    }

    // Single object
    if (parsedSchema.type === 'object' && parsedSchema.properties) {
      return renderObject(data, parsedSchema.properties, parsedSchema.required);
    }

    return (
      <div className="text-white/40 text-sm">
        Unsupported schema type
      </div>
    );
  };

  return (
    <div className={compact ? '' : 'space-y-4'}>
      {!compact && parsedSchema.title && (
        <div className="mb-4">
          <h3 className="text-lg font-medium text-white/90">{parsedSchema.title}</h3>
          {parsedSchema.description && (
            <p className="text-sm text-white/60 mt-1">{parsedSchema.description}</p>
          )}
        </div>
      )}

      {renderData()}

      {!compact && (
        <div className="mt-4 pt-4 border-t border-white/10">
          <div className="flex items-center justify-between text-xs text-white/40">
            <span>
              {parsedSchema.type === 'array'
                ? `${data?.length || 0} items collected`
                : `${Object.keys(data || {}).length} fields collected`
              }
            </span>
            <span>
              Last updated: {new Date().toLocaleTimeString()}
            </span>
          </div>
        </div>
      )}
    </div>
  );
};