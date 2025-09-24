import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Plus, Trash2, ChevronDown, ChevronRight, Copy, Code, List, Hash, ToggleLeft, Type, Calendar, FileJson } from 'lucide-react';

interface SchemaProperty {
  name: string;
  type: string;
  description?: string;
  required?: boolean;
  default?: any;
  enum?: string[];
  properties?: Record<string, SchemaProperty>;
  items?: SchemaProperty;
}

interface JsonSchemaEditorProps {
  initialSchema: string;
  onChange: (schema: string) => void;
  readOnly?: boolean;
}

const TYPE_ICONS = {
  string: Type,
  number: Hash,
  boolean: ToggleLeft,
  object: Code,
  array: List,
  date: Calendar,
};

const ALL_TYPES = ['string', 'number', 'boolean', 'integer', 'object', 'array'];

export const JsonSchemaEditor: React.FC<JsonSchemaEditorProps> = ({
  initialSchema,
  onChange,
  readOnly = false
}) => {
  const [rootType, setRootType] = useState<'object' | 'array'>('object');
  const [arrayItemType, setArrayItemType] = useState<string>('object');
  const [properties, setProperties] = useState<Record<string, SchemaProperty>>({});
  const [requiredFields, setRequiredFields] = useState<string[]>([]);
  const [description, setDescription] = useState('');
  const [title, setTitle] = useState('');
  const [expanded, setExpanded] = useState<Record<string, boolean>>({ root: true });
  const [rawMode, setRawMode] = useState(false);
  const [rawSchema, setRawSchema] = useState('');

  // Parse initial schema
  useEffect(() => {
    try {
      const parsed = JSON.parse(initialSchema);
      setRootType(parsed.type === 'array' ? 'array' : 'object');
      setTitle(parsed.title || '');
      setDescription(parsed.description || '');

      if (parsed.type === 'array' && parsed.items) {
        setArrayItemType(parsed.items.type || 'object');
        if (parsed.items.type === 'object' && parsed.items.properties) {
          setProperties(convertToProperties(parsed.items.properties));
          setRequiredFields(parsed.items.required || []);
        }
      } else if (parsed.properties) {
        setProperties(convertToProperties(parsed.properties));
        setRequiredFields(parsed.required || []);
      }

      setRawSchema(JSON.stringify(parsed, null, 2));
    } catch (e) {
      console.error('Failed to parse schema:', e);
      setRawSchema(initialSchema);
    }
  }, [initialSchema]);

  const convertToProperties = (schemaProps: any): Record<string, SchemaProperty> => {
    const result: Record<string, SchemaProperty> = {};
    for (const [key, value] of Object.entries(schemaProps)) {
      const prop = value as any;
      result[key] = {
        name: key,
        type: prop.type || 'string',
        description: prop.description,
        default: prop.default,
        enum: prop.enum,
        properties: prop.properties ? convertToProperties(prop.properties) : undefined,
        items: prop.items,
      };
    }
    return result;
  };

  const generateSchema = useCallback((): string => {
    const schema: any = {
      $schema: "http://json-schema.org/draft-07/schema#",
      title: title || undefined,
      description: description || undefined,
      type: rootType,
    };

    const buildProperties = (props: Record<string, SchemaProperty>) => {
      const result: any = {};
      for (const [key, prop] of Object.entries(props)) {
        result[key] = {
          type: prop.type,
          description: prop.description || undefined,
          default: prop.default || undefined,
          enum: prop.enum?.length ? prop.enum : undefined,
        };

        if (prop.type === 'object' && prop.properties) {
          result[key].properties = buildProperties(prop.properties);
          const subRequired = Object.entries(prop.properties)
            .filter(([_, p]) => p.required)
            .map(([k, _]) => k);
          if (subRequired.length > 0) {
            result[key].required = subRequired;
          }
        } else if (prop.type === 'array' && prop.items) {
          result[key].items = {
            type: prop.items.type,
            properties: prop.items.properties ? buildProperties(prop.items.properties) : undefined,
          };
        }
      }
      return result;
    };

    if (rootType === 'array') {
      schema.items = {
        type: arrayItemType,
      };

      if (arrayItemType === 'object') {
        schema.items.properties = buildProperties(properties);
        if (requiredFields.length > 0) {
          schema.items.required = requiredFields;
        }
      }
    } else {
      schema.properties = buildProperties(properties);
      if (requiredFields.length > 0) {
        schema.required = requiredFields;
      }
    }

    return JSON.stringify(schema, null, 2);
  }, [properties, requiredFields, rootType, arrayItemType, title, description]);

  const addProperty = (parentPath?: string) => {
    const newPropName = `field_${Date.now()}`;
    const newProp: SchemaProperty = {
      name: newPropName,
      type: 'string',
      description: '',
    };

    if (parentPath) {
      // Add nested property
      const updateNestedProps = (props: Record<string, SchemaProperty>, path: string[]): Record<string, SchemaProperty> => {
        if (path.length === 1) {
          const parent = props[path[0]];
          if (parent.type === 'object') {
            parent.properties = {
              ...parent.properties,
              [newPropName]: newProp,
            };
          }
        } else {
          const [head, ...tail] = path;
          if (props[head]?.properties) {
            props[head].properties = updateNestedProps(props[head].properties!, tail);
          }
        }
        return { ...props };
      };
      setProperties(updateNestedProps(properties, parentPath.split('.')));
    } else {
      setProperties({ ...properties, [newPropName]: newProp });
    }
  };

  const updateProperty = (path: string, updates: Partial<SchemaProperty>) => {
    const pathParts = path.split('.');

    const updateNestedProps = (props: Record<string, SchemaProperty>, parts: string[]): Record<string, SchemaProperty> => {
      if (parts.length === 1) {
        const [key] = parts;
        const existing = props[key];

        // Handle renaming
        if (updates.name && updates.name !== key) {
          const newProps = { ...props };
          delete newProps[key];
          newProps[updates.name] = { ...existing, ...updates };

          // Update required fields if renamed
          if (requiredFields.includes(key)) {
            setRequiredFields(prev => prev.map(f => f === key ? updates.name! : f));
          }

          return newProps;
        }

        // Handle type change
        if (updates.type && updates.type !== existing.type) {
          if (updates.type === 'object') {
            updates.properties = {};
          } else if (updates.type === 'array') {
            updates.items = { type: 'string', name: 'item' };
          }
        }

        return {
          ...props,
          [key]: { ...existing, ...updates },
        };
      } else {
        const [head, ...tail] = parts;
        if (props[head]?.properties) {
          return {
            ...props,
            [head]: {
              ...props[head],
              properties: updateNestedProps(props[head].properties!, tail),
            },
          };
        }
        return props;
      }
    };

    setProperties(updateNestedProps(properties, pathParts));
  };

  const deleteProperty = (path: string) => {
    const pathParts = path.split('.');

    const deleteFromProps = (props: Record<string, SchemaProperty>, parts: string[]): Record<string, SchemaProperty> => {
      if (parts.length === 1) {
        const newProps = { ...props };
        delete newProps[parts[0]];

        // Remove from required if needed
        setRequiredFields(prev => prev.filter(f => f !== parts[0]));

        return newProps;
      } else {
        const [head, ...tail] = parts;
        if (props[head]?.properties) {
          return {
            ...props,
            [head]: {
              ...props[head],
              properties: deleteFromProps(props[head].properties!, tail),
            },
          };
        }
        return props;
      }
    };

    setProperties(deleteFromProps(properties, pathParts));
  };

  const toggleRequired = (fieldName: string) => {
    setRequiredFields(prev =>
      prev.includes(fieldName)
        ? prev.filter(f => f !== fieldName)
        : [...prev, fieldName]
    );
  };

  const renderProperty = (prop: SchemaProperty, path: string, depth = 0) => {
    const Icon = TYPE_ICONS[prop.type as keyof typeof TYPE_ICONS] || FileJson;
    const isExpanded = expanded[path] !== false;
    const canHaveChildren = prop.type === 'object' || prop.type === 'array';

    return (
      <div key={path} className={`${depth > 0 ? 'ml-6' : ''}`}>
        <div className="flex items-center gap-2 p-2 rounded hover:bg-white/[0.03] group">
          {canHaveChildren && (
            <button
              onClick={() => setExpanded({ ...expanded, [path]: !isExpanded })}
              className="p-0.5 text-white/40 hover:text-white/60"
            >
              {isExpanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
            </button>
          )}

          <Icon className="w-4 h-4 text-white/40" />

          <input
            type="text"
            value={prop.name}
            onChange={(e) => updateProperty(path, { name: e.target.value })}
            disabled={readOnly}
            className="px-2 py-1 bg-white/5 border border-white/10 rounded text-sm text-white/80 focus:outline-none focus:border-emerald-500/50"
            placeholder="Field name"
          />

          <select
            value={prop.type}
            onChange={(e) => updateProperty(path, { type: e.target.value })}
            disabled={readOnly}
            className="px-2 py-1 bg-white/5 border border-white/10 rounded text-sm text-white/80 focus:outline-none focus:border-emerald-500/50"
          >
            {ALL_TYPES.map(t => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>

          <input
            type="text"
            value={prop.description || ''}
            onChange={(e) => updateProperty(path, { description: e.target.value })}
            disabled={readOnly}
            className="flex-1 px-2 py-1 bg-white/5 border border-white/10 rounded text-sm text-white/60 focus:outline-none focus:border-emerald-500/50"
            placeholder="Description"
          />

          <button
            onClick={() => toggleRequired(prop.name)}
            disabled={readOnly}
            className={`px-2 py-1 text-xs rounded ${
              requiredFields.includes(prop.name)
                ? 'bg-red-500/20 text-red-300 border border-red-500/30'
                : 'bg-white/5 text-white/40 border border-white/10'
            } hover:bg-opacity-30`}
          >
            {requiredFields.includes(prop.name) ? 'Required' : 'Optional'}
          </button>

          {!readOnly && (
            <button
              onClick={() => deleteProperty(path)}
              className="p-1 text-white/30 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <Trash2 className="w-3 h-3" />
            </button>
          )}
        </div>

        {canHaveChildren && isExpanded && (
          <div className="ml-4">
            {prop.type === 'object' && (
              <>
                {prop.properties && Object.values(prop.properties).map(childProp =>
                  renderProperty(childProp, `${path}.${childProp.name}`, depth + 1)
                )}
                {!readOnly && (
                  <button
                    onClick={() => addProperty(path)}
                    className="flex items-center gap-2 px-3 py-1.5 ml-6 mt-2 text-xs text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10 rounded"
                  >
                    <Plus className="w-3 h-3" />
                    Add nested property
                  </button>
                )}
              </>
            )}
          </div>
        )}
      </div>
    );
  };

  // Memoize the generated schema string to prevent unnecessary rerenders
  const generatedSchemaString = useMemo(() => {
    return generateSchema();
  }, [generateSchema]);

  // Only call onChange when schema actually changes
  useEffect(() => {
    onChange(generatedSchemaString);
  }, [generatedSchemaString]); // Removed onChange from dependencies to prevent infinite loop

  return (
    <div className="space-y-4">
      {/* Header Controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div>
            <label className="text-xs text-white/60 block mb-1">Root Type</label>
            <select
              value={rootType}
              onChange={(e) => setRootType(e.target.value as 'object' | 'array')}
              disabled={readOnly}
              className="px-3 py-1.5 bg-white/5 border border-white/10 rounded text-sm text-white/80 focus:outline-none focus:border-emerald-500/50"
            >
              <option value="object">Object</option>
              <option value="array">Array of Objects</option>
            </select>
          </div>

          {rootType === 'array' && (
            <div>
              <label className="text-xs text-white/60 block mb-1">Item Type</label>
              <select
                value={arrayItemType}
                onChange={(e) => setArrayItemType(e.target.value)}
                disabled={readOnly}
                className="px-3 py-1.5 bg-white/5 border border-white/10 rounded text-sm text-white/80 focus:outline-none focus:border-emerald-500/50"
              >
                {ALL_TYPES.map(t => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>
          )}
        </div>

        <button
          onClick={() => setRawMode(!rawMode)}
          className="flex items-center gap-2 px-3 py-1.5 text-sm text-white/60 hover:text-white/80 hover:bg-white/10 rounded"
        >
          <Code className="w-4 h-4" />
          {rawMode ? 'Visual Editor' : 'Raw JSON'}
        </button>
      </div>

      {/* Title and Description */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-xs text-white/60 block mb-1">Title</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            disabled={readOnly}
            className="w-full px-3 py-1.5 bg-white/5 border border-white/10 rounded text-sm text-white/80 focus:outline-none focus:border-emerald-500/50"
            placeholder="Schema title"
          />
        </div>
        <div>
          <label className="text-xs text-white/60 block mb-1">Description</label>
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            disabled={readOnly}
            className="w-full px-3 py-1.5 bg-white/5 border border-white/10 rounded text-sm text-white/80 focus:outline-none focus:border-emerald-500/50"
            placeholder="Schema description"
          />
        </div>
      </div>

      {/* Editor Area */}
      <div className="border border-white/10 rounded-lg overflow-hidden">
        {rawMode ? (
          <textarea
            value={rawSchema}
            onChange={(e) => {
              setRawSchema(e.target.value);
              try {
                JSON.parse(e.target.value);
                onChange(e.target.value);
              } catch {}
            }}
            disabled={readOnly}
            className="w-full h-96 p-4 bg-white/[0.02] text-white/80 text-sm font-mono focus:outline-none"
            placeholder="Enter JSON Schema..."
          />
        ) : (
          <div className="p-4 bg-white/[0.02]">
            <div className="space-y-1">
              {Object.values(properties).map(prop =>
                renderProperty(prop, prop.name)
              )}

              {Object.keys(properties).length === 0 && (
                <div className="text-center py-8 text-white/30">
                  <FileJson className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p className="text-sm mb-3">No properties defined</p>
                </div>
              )}
            </div>

            {!readOnly && (
              <button
                onClick={() => addProperty()}
                className="flex items-center gap-2 px-4 py-2 mt-4 bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded hover:bg-emerald-500/30"
              >
                <Plus className="w-4 h-4" />
                Add Property
              </button>
            )}
          </div>
        )}
      </div>

      {/* Preview */}
      <div className="border border-white/10 rounded-lg p-4 bg-white/[0.02]">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-medium text-white/60">Generated Schema</span>
          <button
            onClick={() => {
              navigator.clipboard.writeText(generatedSchemaString);
            }}
            className="flex items-center gap-1 px-2 py-1 text-xs text-white/40 hover:text-white/60 hover:bg-white/10 rounded"
          >
            <Copy className="w-3 h-3" />
            Copy
          </button>
        </div>
        <pre className="text-xs text-white/60 font-mono overflow-auto max-h-40">
          {generatedSchemaString}
        </pre>
      </div>
    </div>
  );
};