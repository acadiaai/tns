import React, { useState, useEffect } from 'react';
import { Plus, Trash2, ChevronDown, ChevronRight, AlertCircle, CheckCircle } from 'lucide-react';

interface JsonSchemaFormProps {
  schema: string | object;
  initialData?: any;
  onChange?: (data: any) => void;
  onSubmit?: (data: any) => void;
  readOnly?: boolean;
  showValidation?: boolean;
}

export const JsonSchemaForm: React.FC<JsonSchemaFormProps> = ({
  schema,
  initialData = {},
  onChange,
  onSubmit,
  readOnly = false,
  showValidation = true
}) => {
  const [formData, setFormData] = useState<any>(initialData);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [expanded, setExpanded] = useState<Record<string, boolean>>({ root: true });

  const parsedSchema = typeof schema === 'string' ? JSON.parse(schema) : schema;

  useEffect(() => {
    setFormData(initialData);
  }, [initialData]);

  const validateField = (value: any, fieldSchema: any, fieldName: string): string | null => {
    if (fieldSchema.required && (value === undefined || value === null || value === '')) {
      return `${fieldName} is required`;
    }

    if (fieldSchema.type === 'string') {
      if (fieldSchema.minLength && value.length < fieldSchema.minLength) {
        return `Minimum length is ${fieldSchema.minLength}`;
      }
      if (fieldSchema.maxLength && value.length > fieldSchema.maxLength) {
        return `Maximum length is ${fieldSchema.maxLength}`;
      }
      if (fieldSchema.pattern) {
        const regex = new RegExp(fieldSchema.pattern);
        if (!regex.test(value)) {
          return `Invalid format`;
        }
      }
    }

    if (fieldSchema.type === 'number' || fieldSchema.type === 'integer') {
      const num = Number(value);
      if (isNaN(num)) {
        return `Must be a number`;
      }
      if (fieldSchema.minimum !== undefined && num < fieldSchema.minimum) {
        return `Minimum value is ${fieldSchema.minimum}`;
      }
      if (fieldSchema.maximum !== undefined && num > fieldSchema.maximum) {
        return `Maximum value is ${fieldSchema.maximum}`;
      }
    }

    if (fieldSchema.enum && !fieldSchema.enum.includes(value)) {
      return `Must be one of: ${fieldSchema.enum.join(', ')}`;
    }

    return null;
  };

  const updateFormData = (path: string, value: any) => {
    const pathParts = path.split('.');
    const newData = { ...formData };

    let current = newData;
    for (let i = 0; i < pathParts.length - 1; i++) {
      const part = pathParts[i];
      if (part.includes('[') && part.includes(']')) {
        const [arrayName, indexStr] = part.split('[');
        const index = parseInt(indexStr.replace(']', ''));
        if (!current[arrayName]) current[arrayName] = [];
        if (!current[arrayName][index]) current[arrayName][index] = {};
        current = current[arrayName][index];
      } else {
        if (!current[part]) current[part] = {};
        current = current[part];
      }
    }

    const lastPart = pathParts[pathParts.length - 1];
    if (lastPart.includes('[') && lastPart.includes(']')) {
      const [arrayName, indexStr] = lastPart.split('[');
      const index = parseInt(indexStr.replace(']', ''));
      if (!current[arrayName]) current[arrayName] = [];
      current[arrayName][index] = value;
    } else {
      current[lastPart] = value;
    }

    setFormData(newData);
    onChange?.(newData);

    // Validate field
    const fieldSchema = getFieldSchema(path, parsedSchema);
    const error = validateField(value, fieldSchema, lastPart);
    setErrors(prev => ({
      ...prev,
      [path]: error || ''
    }));
  };

  const getFieldSchema = (path: string, schema: any): any => {
    const parts = path.split('.');
    let current = schema;

    for (const part of parts) {
      if (part.includes('[') && part.includes(']')) {
        const [arrayName] = part.split('[');
        if (current.properties?.[arrayName]) {
          current = current.properties[arrayName].items;
        } else if (current.items) {
          current = current.items;
        }
      } else {
        if (current.properties?.[part]) {
          current = current.properties[part];
        } else if (current.items?.properties?.[part]) {
          current = current.items.properties[part];
        }
      }
    }

    return current;
  };

  const getValue = (path: string): any => {
    const parts = path.split('.');
    let current = formData;

    for (const part of parts) {
      if (part.includes('[') && part.includes(']')) {
        const [arrayName, indexStr] = part.split('[');
        const index = parseInt(indexStr.replace(']', ''));
        current = current?.[arrayName]?.[index];
      } else {
        current = current?.[part];
      }
    }

    return current;
  };

  const addArrayItem = (path: string, itemSchema: any) => {
    const currentArray = getValue(path) || [];
    const newItem = generateDefaultValue(itemSchema);
    updateFormData(path, [...currentArray, newItem]);
  };

  const removeArrayItem = (path: string, index: number) => {
    const currentArray = getValue(path) || [];
    const newArray = currentArray.filter((_: any, i: number) => i !== index);
    updateFormData(path, newArray);
  };

  const generateDefaultValue = (schema: any): any => {
    if (schema.default !== undefined) return schema.default;

    switch (schema.type) {
      case 'string':
        return '';
      case 'number':
      case 'integer':
        return 0;
      case 'boolean':
        return false;
      case 'object':
        const obj: any = {};
        if (schema.properties) {
          for (const [key, propSchema] of Object.entries(schema.properties)) {
            obj[key] = generateDefaultValue(propSchema as any);
          }
        }
        return obj;
      case 'array':
        return [];
      default:
        return null;
    }
  };

  const renderField = (
    name: string,
    fieldSchema: any,
    path: string,
    required: boolean = false,
    depth: number = 0
  ): JSX.Element => {
    const value = getValue(path);
    const error = errors[path];
    const isExpanded = expanded[path] !== false;

    const fieldId = `field-${path}`;

    if (fieldSchema.enum) {
      return (
        <div key={path} className={depth > 0 ? 'ml-6' : ''}>
          <label htmlFor={fieldId} className="block mb-1">
            <span className="text-sm text-white/70">
              {name}
              {required && <span className="text-red-400 ml-1">*</span>}
            </span>
            {fieldSchema.description && (
              <span className="block text-xs text-white/50 mt-1">{fieldSchema.description}</span>
            )}
          </label>
          <select
            id={fieldId}
            value={value || ''}
            onChange={(e) => updateFormData(path, e.target.value)}
            disabled={readOnly}
            className={`w-full px-3 py-1.5 bg-white/5 border rounded text-sm text-white/80 focus:outline-none focus:border-emerald-500/50 ${
              error ? 'border-red-500/50' : 'border-white/10'
            }`}
          >
            <option value="">Select...</option>
            {fieldSchema.enum.map((option: string) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
          {error && showValidation && (
            <p className="text-xs text-red-400 mt-1 flex items-center gap-1">
              <AlertCircle className="w-3 h-3" />
              {error}
            </p>
          )}
        </div>
      );
    }

    switch (fieldSchema.type) {
      case 'string':
        return (
          <div key={path} className={depth > 0 ? 'ml-6' : ''}>
            <label htmlFor={fieldId} className="block mb-1">
              <span className="text-sm text-white/70">
                {name}
                {required && <span className="text-red-400 ml-1">*</span>}
              </span>
              {fieldSchema.description && (
                <span className="block text-xs text-white/50 mt-1">{fieldSchema.description}</span>
              )}
            </label>
            {fieldSchema.format === 'textarea' || fieldSchema.maxLength > 100 ? (
              <textarea
                id={fieldId}
                value={value || ''}
                onChange={(e) => updateFormData(path, e.target.value)}
                disabled={readOnly}
                rows={3}
                className={`w-full px-3 py-1.5 bg-white/5 border rounded text-sm text-white/80 focus:outline-none focus:border-emerald-500/50 ${
                  error ? 'border-red-500/50' : 'border-white/10'
                }`}
                placeholder={fieldSchema.placeholder}
              />
            ) : (
              <input
                id={fieldId}
                type={fieldSchema.format === 'email' ? 'email' : 'text'}
                value={value || ''}
                onChange={(e) => updateFormData(path, e.target.value)}
                disabled={readOnly}
                className={`w-full px-3 py-1.5 bg-white/5 border rounded text-sm text-white/80 focus:outline-none focus:border-emerald-500/50 ${
                  error ? 'border-red-500/50' : 'border-white/10'
                }`}
                placeholder={fieldSchema.placeholder}
              />
            )}
            {error && showValidation && (
              <p className="text-xs text-red-400 mt-1 flex items-center gap-1">
                <AlertCircle className="w-3 h-3" />
                {error}
              </p>
            )}
          </div>
        );

      case 'number':
      case 'integer':
        return (
          <div key={path} className={depth > 0 ? 'ml-6' : ''}>
            <label htmlFor={fieldId} className="block mb-1">
              <span className="text-sm text-white/70">
                {name}
                {required && <span className="text-red-400 ml-1">*</span>}
              </span>
              {fieldSchema.description && (
                <span className="block text-xs text-white/50 mt-1">{fieldSchema.description}</span>
              )}
            </label>
            <input
              id={fieldId}
              type="number"
              value={value || ''}
              onChange={(e) => updateFormData(path, e.target.value ? Number(e.target.value) : null)}
              disabled={readOnly}
              min={fieldSchema.minimum}
              max={fieldSchema.maximum}
              step={fieldSchema.type === 'integer' ? 1 : 'any'}
              className={`w-full px-3 py-1.5 bg-white/5 border rounded text-sm text-white/80 focus:outline-none focus:border-emerald-500/50 ${
                error ? 'border-red-500/50' : 'border-white/10'
              }`}
              placeholder={fieldSchema.placeholder}
            />
            {error && showValidation && (
              <p className="text-xs text-red-400 mt-1 flex items-center gap-1">
                <AlertCircle className="w-3 h-3" />
                {error}
              </p>
            )}
          </div>
        );

      case 'boolean':
        return (
          <div key={path} className={`flex items-center gap-2 ${depth > 0 ? 'ml-6' : ''}`}>
            <input
              id={fieldId}
              type="checkbox"
              checked={value || false}
              onChange={(e) => updateFormData(path, e.target.checked)}
              disabled={readOnly}
              className="w-4 h-4 bg-white/5 border border-white/20 rounded text-emerald-500 focus:ring-emerald-500/50"
            />
            <label htmlFor={fieldId} className="text-sm text-white/70">
              {name}
              {required && <span className="text-red-400 ml-1">*</span>}
              {fieldSchema.description && (
                <span className="block text-xs text-white/50 mt-1">{fieldSchema.description}</span>
              )}
            </label>
          </div>
        );

      case 'object':
        return (
          <div key={path} className={depth > 0 ? 'ml-6' : ''}>
            <div
              className="flex items-center gap-2 mb-2 cursor-pointer"
              onClick={() => setExpanded({ ...expanded, [path]: !isExpanded })}
            >
              <button className="p-0.5 text-white/40 hover:text-white/60">
                {isExpanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
              </button>
              <span className="text-sm font-medium text-white/80">
                {name}
                {required && <span className="text-red-400 ml-1">*</span>}
              </span>
            </div>
            {isExpanded && fieldSchema.properties && (
              <div className="space-y-3 ml-2">
                {Object.entries(fieldSchema.properties).map(([propName, propSchema]: [string, any]) => {
                  const isRequired = fieldSchema.required?.includes(propName);
                  return renderField(propName, propSchema, `${path}.${propName}`, isRequired, depth + 1);
                })}
              </div>
            )}
          </div>
        );

      case 'array':
        const arrayValue = value || [];
        return (
          <div key={path} className={depth > 0 ? 'ml-6' : ''}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-white/80">
                {name}
                {required && <span className="text-red-400 ml-1">*</span>}
              </span>
              {!readOnly && (
                <button
                  onClick={() => addArrayItem(path, fieldSchema.items)}
                  className="flex items-center gap-1 px-2 py-1 text-xs bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded hover:bg-emerald-500/30"
                >
                  <Plus className="w-3 h-3" />
                  Add Item
                </button>
              )}
            </div>

            {arrayValue.length > 0 ? (
              <div className="space-y-2">
                {arrayValue.map((_item: any, index: number) => (
                  <div key={index} className="p-3 bg-white/[0.02] border border-white/10 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs text-white/50">Item {index + 1}</span>
                      {!readOnly && (
                        <button
                          onClick={() => removeArrayItem(path, index)}
                          className="p-1 text-white/30 hover:text-red-400"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      )}
                    </div>

                    {fieldSchema.items.type === 'object' && fieldSchema.items.properties ? (
                      <div className="space-y-3">
                        {Object.entries(fieldSchema.items.properties).map(([propName, propSchema]: [string, any]) => {
                          const isRequired = fieldSchema.items.required?.includes(propName);
                          return renderField(
                            propName,
                            propSchema,
                            `${path}[${index}].${propName}`,
                            isRequired,
                            depth + 1
                          );
                        })}
                      </div>
                    ) : (
                      renderField(`Item ${index + 1}`, fieldSchema.items, `${path}[${index}]`, false, depth + 1)
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-4 text-white/30 bg-white/[0.02] border border-white/10 rounded-lg">
                <p className="text-sm">No items yet</p>
              </div>
            )}
          </div>
        );

      default:
        return <div key={path}>Unsupported type: {fieldSchema.type}</div>;
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Validate all fields
    const newErrors: Record<string, string> = {};
    const validateRecursive = (schema: any, data: any, path: string = '') => {
      if (schema.properties) {
        for (const [key, propSchema] of Object.entries(schema.properties)) {
          const fullPath = path ? `${path}.${key}` : key;
          const isRequired = schema.required?.includes(key);
          const value = data?.[key];

          if (isRequired && (value === undefined || value === null || value === '')) {
            newErrors[fullPath] = `${key} is required`;
          } else if (value !== undefined && value !== null) {
            const error = validateField(value, propSchema, key);
            if (error) newErrors[fullPath] = error;
          }

          if ((propSchema as any).type === 'object') {
            validateRecursive(propSchema, value, fullPath);
          }
        }
      }
    };

    validateRecursive(parsedSchema, formData);
    setErrors(newErrors);

    if (Object.keys(newErrors).length === 0) {
      onSubmit?.(formData);
    }
  };

  const isValid = Object.keys(errors).length === 0;

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {parsedSchema.title && (
        <div className="mb-4">
          <h3 className="text-lg font-medium text-white/90">{parsedSchema.title}</h3>
          {parsedSchema.description && (
            <p className="text-sm text-white/60 mt-1">{parsedSchema.description}</p>
          )}
        </div>
      )}

      {parsedSchema.type === 'object' && parsedSchema.properties && (
        <div className="space-y-4">
          {Object.entries(parsedSchema.properties).map(([fieldName, fieldSchema]: [string, any]) => {
            const isRequired = parsedSchema.required?.includes(fieldName);
            return renderField(fieldName, fieldSchema, fieldName, isRequired);
          })}
        </div>
      )}

      {parsedSchema.type === 'array' && (
        <div>
          {renderField(parsedSchema.title || 'Items', parsedSchema, 'root')}
        </div>
      )}

      {onSubmit && !readOnly && (
        <div className="flex items-center justify-between pt-4 border-t border-white/10">
          <div className="flex items-center gap-2">
            {isValid ? (
              <CheckCircle className="w-4 h-4 text-green-400" />
            ) : (
              <AlertCircle className="w-4 h-4 text-yellow-400" />
            )}
            <span className="text-xs text-white/60">
              {isValid ? 'All fields valid' : `${Object.keys(errors).length} validation errors`}
            </span>
          </div>

          <button
            type="submit"
            disabled={!isValid && showValidation}
            className="px-4 py-2 bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded hover:bg-emerald-500/30 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Submit
          </button>
        </div>
      )}
    </form>
  );
};