import React, { useState, useEffect } from 'react';
import { Plus, Trash2, List, Type, Hash, ToggleLeft, FileText, ChevronDown, ChevronUp, GripVertical } from 'lucide-react';

interface Field {
  id: string;
  name: string;
  label: string;
  type: 'text' | 'longtext' | 'number' | 'rating' | 'yes/no' | 'choice' | 'multiple' | 'date' | 'time' | 'email' | 'url';
  required: boolean;
  placeholder?: string;
  helpText?: string;
  options?: string[]; // For choice/multiple
  min?: number; // For number/rating
  max?: number; // For number/rating
}

interface FieldGroup {
  id: string;
  name: string;
  label: string;
  type: 'single' | 'list'; // single object or list of objects
  fields: Field[];
}

interface SimpleSchemaBuilderProps {
  initialValue?: string; // JSON schema string
  onChange: (jsonSchema: string) => void;
  readOnly?: boolean;
}

const FIELD_TYPES = [
  { value: 'text', label: 'Text', icon: Type, schema: 'string' },
  { value: 'longtext', label: 'Notes', icon: FileText, schema: 'string' },
  { value: 'rating', label: 'Scale (1-10)', icon: Hash, schema: 'integer' },
  { value: 'yes/no', label: 'Yes/No', icon: ToggleLeft, schema: 'boolean' },
  { value: 'choice', label: 'Choice', icon: List, schema: 'string' },
];

export const SimpleSchemaBuilder: React.FC<SimpleSchemaBuilderProps> = ({
  initialValue = '',
  onChange,
  readOnly = false
}) => {
  const [groups, setGroups] = useState<FieldGroup[]>([]);
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());

  // Parse initial JSON schema into simple format
  useEffect(() => {
    if (initialValue) {
      try {
        const schema = JSON.parse(initialValue);
        const parsedGroups: FieldGroup[] = [];

        // Handle simple types (string, number, boolean) - wrap in object
        if (['string', 'number', 'integer', 'boolean'].includes(schema.type)) {
          const field: Field = {
            id: `field_${Date.now()}`,
            name: 'value',
            label: schema.title || 'Value',
            type: schema.enum ? 'choice' :
                  schema.type === 'boolean' ? 'yes/no' :
                  schema.type === 'integer' && schema.minimum === 0 && schema.maximum === 10 ? 'rating' :
                  schema.type === 'integer' && schema.minimum === 1 && schema.maximum === 10 ? 'rating' :
                  schema.type === 'number' || schema.type === 'integer' ? 'number' : 'text',
            required: true,
            helpText: schema.description,
            min: schema.minimum,
            max: schema.maximum,
            options: schema.enum || undefined
          };

          parsedGroups.push({
            id: 'main',
            name: 'data',
            label: 'Information',
            type: 'single',
            fields: [field]
          });
        }
        // Handle array type (list of items)
        else if (schema.type === 'array') {
          if (schema.items?.properties) {
            // Array of objects
            const group: FieldGroup = {
              id: 'main',
              name: 'items',
              label: schema.title || 'Items',
              type: 'list',
              fields: parseFields(schema.items.properties, schema.items.required || [])
            };
            parsedGroups.push(group);
          } else if (schema.items) {
            // Array of simple types - treat as single multi-value field
            const field: Field = {
              id: `field_${Date.now()}`,
              name: 'items',
              label: schema.title || 'Items',
              type: 'longtext', // For now, use longtext for arrays of simple values
              required: schema.minItems > 0,
              helpText: 'Enter multiple values, one per line'
            };
            parsedGroups.push({
              id: 'main',
              name: 'data',
              label: 'Information',
              type: 'single',
              fields: [field]
            });
          }
        }
        // Handle object type (single item)
        else if (schema.type === 'object' && schema.properties) {
          const group: FieldGroup = {
            id: 'main',
            name: 'data',
            label: schema.title || 'Information',
            type: 'single',
            fields: parseFields(schema.properties, schema.required || [])
          };
          parsedGroups.push(group);
        }

        if (parsedGroups.length > 0) {
          setGroups(parsedGroups);
        } else {
          // Default empty group
          setGroups([{
            id: `group_${Date.now()}`,
            name: 'information',
            label: 'Information',
            type: 'single',
            fields: []
          }]);
        }
      } catch (e) {
        // Start with default
        setGroups([{
          id: `group_${Date.now()}`,
          name: 'information',
          label: 'Information',
          type: 'single',
          fields: []
        }]);
      }
    } else {
      // Default starting point
      setGroups([{
        id: `group_${Date.now()}`,
        name: 'information',
        label: 'Information',
        type: 'single',
        fields: []
      }]);
    }
  }, [initialValue]);

  const parseFields = (properties: any, required: string[]): Field[] => {
    const fields: Field[] = [];
    for (const [key, prop] of Object.entries(properties)) {
      const p = prop as any;
      let type: Field['type'] = 'text';

      // Infer type from schema
      if (p.type === 'boolean') type = 'yes/no';
      else if (p.type === 'integer' && p.minimum === 1 && p.maximum === 10) type = 'rating';
      else if (p.type === 'number' || p.type === 'integer') type = 'number';
      else if (p.enum) type = 'choice';
      else if (p.type === 'array' && p.items?.enum) type = 'multiple';
      else if (p.format === 'date') type = 'date';
      else if (p.format === 'time') type = 'time';
      else if (p.format === 'email') type = 'email';
      else if (p.format === 'uri') type = 'url';
      else if (p.maxLength && p.maxLength > 100) type = 'longtext';

      fields.push({
        id: `field_${Date.now()}_${Math.random()}`,
        name: key,
        label: p.title || key,
        type,
        required: required.includes(key),
        placeholder: p.placeholder,
        helpText: p.description,
        options: p.enum || p.items?.enum,
        min: p.minimum,
        max: p.maximum
      });
    }
    return fields;
  };

  // Generate JSON schema from simple format
  const generateJsonSchema = () => {
    if (groups.length === 0) return '{}';

    const mainGroup = groups[0]; // For now, single group support
    const properties: any = {};
    const required: string[] = [];

    mainGroup.fields.forEach(field => {
      const fieldSchema: any = {
        title: field.label,
        description: field.helpText
      };

      // Map field type to JSON schema
      switch (field.type) {
        case 'text':
          fieldSchema.type = 'string';
          fieldSchema.maxLength = 100;
          break;
        case 'longtext':
          fieldSchema.type = 'string';
          fieldSchema.maxLength = 1000;
          break;
        case 'number':
          fieldSchema.type = 'number';
          if (field.min !== undefined) fieldSchema.minimum = field.min;
          if (field.max !== undefined) fieldSchema.maximum = field.max;
          break;
        case 'rating':
          fieldSchema.type = 'integer';
          fieldSchema.minimum = field.min || 1;
          fieldSchema.maximum = field.max || 10;
          break;
        case 'yes/no':
          fieldSchema.type = 'boolean';
          break;
        case 'choice':
          fieldSchema.type = 'string';
          if (field.options?.length) fieldSchema.enum = field.options;
          break;
        case 'multiple':
          fieldSchema.type = 'array';
          fieldSchema.items = {
            type: 'string',
            enum: field.options || []
          };
          break;
        case 'date':
          fieldSchema.type = 'string';
          fieldSchema.format = 'date';
          break;
        case 'time':
          fieldSchema.type = 'string';
          fieldSchema.format = 'time';
          break;
        case 'email':
          fieldSchema.type = 'string';
          fieldSchema.format = 'email';
          break;
        case 'url':
          fieldSchema.type = 'string';
          fieldSchema.format = 'uri';
          break;
      }

      properties[field.name] = fieldSchema;
      if (field.required) required.push(field.name);
    });

    const schema: any = {
      $schema: "http://json-schema.org/draft-07/schema#",
      title: mainGroup.label,
    };

    if (mainGroup.type === 'list') {
      schema.type = 'array';
      schema.items = {
        type: 'object',
        properties,
        required: required.length > 0 ? required : undefined
      };
    } else {
      schema.type = 'object';
      schema.properties = properties;
      if (required.length > 0) schema.required = required;
    }

    return JSON.stringify(schema, null, 2);
  };

  // Update parent whenever groups change
  useEffect(() => {
    const schema = generateJsonSchema();
    onChange(schema);
  }, [groups]);

  const addField = (groupId: string) => {
    setGroups(prev => prev.map(group => {
      if (group.id === groupId) {
        const newField: Field = {
          id: `field_${Date.now()}`,
          name: `field_${group.fields.length + 1}`,
          label: `Field ${group.fields.length + 1}`,
          type: 'text',
          required: false,
        };
        return { ...group, fields: [...group.fields, newField] };
      }
      return group;
    }));
  };

  const updateField = (groupId: string, fieldId: string, updates: Partial<Field>) => {
    setGroups(prev => prev.map(group => {
      if (group.id === groupId) {
        return {
          ...group,
          fields: group.fields.map(field =>
            field.id === fieldId ? { ...field, ...updates } : field
          )
        };
      }
      return group;
    }));
  };

  const deleteField = (groupId: string, fieldId: string) => {
    setGroups(prev => prev.map(group => {
      if (group.id === groupId) {
        return {
          ...group,
          fields: group.fields.filter(field => field.id !== fieldId)
        };
      }
      return group;
    }));
  };

  const toggleGroupCollapse = (groupId: string) => {
    setCollapsedGroups(prev => {
      const next = new Set(prev);
      if (next.has(groupId)) {
        next.delete(groupId);
      } else {
        next.add(groupId);
      }
      return next;
    });
  };

  return (
    <div className="space-y-6">

      {groups.map(group => {
        const isCollapsed = collapsedGroups.has(group.id);
        const FieldIcon = group.type === 'list' ? List : FileText;

        return (
          <div key={group.id} className="border border-white/10 rounded-lg overflow-hidden">
            {/* Group Header */}
            <div className="bg-white/[0.02] p-4 border-b border-white/10">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => toggleGroupCollapse(group.id)}
                    className="p-1 hover:bg-white/10 rounded"
                  >
                    {isCollapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
                  </button>
                  <FieldIcon className="w-4 h-4 text-white/40" />
                  <input
                    type="text"
                    value={group.label}
                    onChange={(e) => setGroups(prev => prev.map(g =>
                      g.id === group.id ? { ...g, label: e.target.value } : g
                    ))}
                    disabled={readOnly}
                    className="bg-transparent text-white/90 font-medium outline-none focus:bg-white/5 px-2 py-1 rounded"
                    placeholder="Group name"
                  />
                </div>

                <select
                  value={group.type}
                  onChange={(e) => setGroups(prev => prev.map(g =>
                    g.id === group.id ? { ...g, type: e.target.value as 'single' | 'list' } : g
                  ))}
                  disabled={readOnly}
                  className="px-3 py-1 bg-white/5 border border-white/10 rounded text-sm text-white/80"
                >
                  <option value="single">Single Record</option>
                  <option value="list">List of Records</option>
                </select>
              </div>

              {group.type === 'list' && (
                <p className="text-xs text-white/50 mt-2">
                  Users will be able to add multiple items, each with these fields
                </p>
              )}
            </div>

            {/* Fields */}
            {!isCollapsed && (
              <div className="p-4 space-y-3">
                {group.fields.length === 0 ? (
                  <div className="text-center py-8 text-white/30">
                    <p className="text-sm mb-2">No fields yet</p>
                    <p className="text-xs">Add fields to define what data to collect</p>
                  </div>
                ) : (
                  group.fields.map(field => {
                    const fieldType = FIELD_TYPES.find(t => t.value === field.type);
                    const Icon = fieldType?.icon || Type;

                    return (
                      <div key={field.id} className="flex items-start gap-3 p-3 bg-white/[0.02] rounded-lg">
                        <GripVertical className="w-4 h-4 text-white/20 mt-2 cursor-move" />
                        <Icon className="w-4 h-4 text-white/40 mt-2" />

                        <div className="flex-1 space-y-2">
                          <div className="flex gap-2">
                            <input
                              type="text"
                              value={field.label}
                              onChange={(e) => updateField(group.id, field.id, { label: e.target.value })}
                              disabled={readOnly}
                              className="flex-1 px-2 py-1 bg-white/5 border border-white/10 rounded text-sm text-white/80 focus:outline-none focus:border-emerald-500/50"
                              placeholder="Field label"
                            />

                            <select
                              value={field.type}
                              onChange={(e) => updateField(group.id, field.id, { type: e.target.value as Field['type'] })}
                              disabled={readOnly}
                              className="px-2 py-1 bg-white/5 border border-white/10 rounded text-sm text-white/80"
                            >
                              {FIELD_TYPES.map(type => (
                                <option key={type.value} value={type.value}>{type.label}</option>
                              ))}
                            </select>

                            <button
                              onClick={() => updateField(group.id, field.id, { required: !field.required })}
                              disabled={readOnly}
                              className={`px-2 py-1 text-xs rounded ${
                                field.required
                                  ? 'bg-red-500/20 text-red-300 border border-red-500/30'
                                  : 'bg-white/5 text-white/40 border border-white/10'
                              }`}
                            >
                              {field.required ? 'Required' : 'Optional'}
                            </button>

                            {!readOnly && (
                              <button
                                onClick={() => deleteField(group.id, field.id)}
                                className="p-1 text-white/30 hover:text-red-400"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            )}
                          </div>

                          {/* Field-specific options */}
                          {(field.type === 'choice' || field.type === 'multiple') && (
                            <div>
                              <label className="text-xs text-white/50 block mb-1">Options (one per line)</label>
                              <textarea
                                value={field.options?.join('\n') || ''}
                                onChange={(e) => updateField(group.id, field.id, {
                                  options: e.target.value.split('\n').filter(o => o.trim())
                                })}
                                disabled={readOnly}
                                rows={3}
                                className="w-full px-2 py-1 bg-white/5 border border-white/10 rounded text-sm text-white/60 font-mono"
                                placeholder="Option 1&#10;Option 2&#10;Option 3"
                              />
                            </div>
                          )}

                          {(field.type === 'number' || field.type === 'rating') && (
                            <div className="flex gap-2">
                              <div className="flex-1">
                                <label className="text-xs text-white/50 block mb-1">Min</label>
                                <input
                                  type="number"
                                  value={field.min || ''}
                                  onChange={(e) => updateField(group.id, field.id, {
                                    min: e.target.value ? Number(e.target.value) : undefined
                                  })}
                                  disabled={readOnly}
                                  className="w-full px-2 py-1 bg-white/5 border border-white/10 rounded text-sm text-white/60"
                                  placeholder={field.type === 'rating' ? '1' : '0'}
                                />
                              </div>
                              <div className="flex-1">
                                <label className="text-xs text-white/50 block mb-1">Max</label>
                                <input
                                  type="number"
                                  value={field.max || ''}
                                  onChange={(e) => updateField(group.id, field.id, {
                                    max: e.target.value ? Number(e.target.value) : undefined
                                  })}
                                  disabled={readOnly}
                                  className="w-full px-2 py-1 bg-white/5 border border-white/10 rounded text-sm text-white/60"
                                  placeholder={field.type === 'rating' ? '10' : '100'}
                                />
                              </div>
                            </div>
                          )}

                          <input
                            type="text"
                            value={field.helpText || ''}
                            onChange={(e) => updateField(group.id, field.id, { helpText: e.target.value })}
                            disabled={readOnly}
                            className="w-full px-2 py-1 bg-white/5 border border-white/10 rounded text-xs text-white/50"
                            placeholder="Help text (optional)"
                          />
                        </div>
                      </div>
                    );
                  })
                )}

                {!readOnly && (
                  <button
                    onClick={() => addField(group.id)}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 rounded hover:bg-emerald-500/20"
                  >
                    <Plus className="w-4 h-4" />
                    Add Field
                  </button>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};