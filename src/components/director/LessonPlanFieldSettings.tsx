import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Switch } from '../ui/switch';
import { ArrowLeft, Plus, Trash2, GripVertical, Save } from 'lucide-react';
import { createClient } from '../../utils/supabase/client';
import { projectId } from '../../utils/supabase/info';
import { toast } from 'sonner@2.0.3';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';

interface LessonPlanFieldSettingsProps {
  onClose?: () => void;
}

interface Field {
  id: string;
  field_name: string;
  field_label: string;
  field_type: string;
  placeholder: string;
  is_required: boolean;
  field_order: number;
  rows?: number;
  is_active: boolean;
}

export function LessonPlanFieldSettings({ onClose }: LessonPlanFieldSettingsProps) {
  const [fields, setFields] = useState<Field[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const supabase = createClient();

  useEffect(() => {
    fetchFields();
  }, []);

  const fetchFields = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const res = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-1ddd013a/lesson-plan-fields`,
        {
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      const result = await res.json();
      if (result.success) {
        setFields(result.fields.sort((a: Field, b: Field) => a.field_order - b.field_order));
      }
    } catch (error) {
      console.error('[Lesson Plan Fields] Error:', error);
      toast.error('Failed to load fields');
    } finally {
      setLoading(false);
    }
  };

  const handleAddField = () => {
    const newField: Field = {
      id: `field_${Date.now()}`,
      field_name: '',
      field_label: '',
      field_type: 'text',
      placeholder: '',
      is_required: false,
      field_order: fields.length + 1,
      is_active: true
    };
    setFields([...fields, newField]);
  };

  const handleRemoveField = (id: string) => {
    setFields(fields.filter(f => f.id !== id));
  };

  const handleFieldChange = (id: string, key: keyof Field, value: any) => {
    setFields(fields.map(f => f.id === id ? { ...f, [key]: value } : f));
  };

  const handleMoveUp = (index: number) => {
    if (index === 0) return;
    const newFields = [...fields];
    [newFields[index], newFields[index - 1]] = [newFields[index - 1], newFields[index]];
    // Update field_order
    newFields.forEach((f, i) => f.field_order = i + 1);
    setFields(newFields);
  };

  const handleMoveDown = (index: number) => {
    if (index === fields.length - 1) return;
    const newFields = [...fields];
    [newFields[index], newFields[index + 1]] = [newFields[index + 1], newFields[index]];
    // Update field_order
    newFields.forEach((f, i) => f.field_order = i + 1);
    setFields(newFields);
  };

  const handleSave = async () => {
    // Validate
    for (const field of fields) {
      if (!field.field_name.trim()) {
        toast.error('All fields must have a field name');
        return;
      }
      if (!field.field_label.trim()) {
        toast.error('All fields must have a label');
        return;
      }
    }

    setSaving(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const res = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-1ddd013a/lesson-plan-fields`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ fields })
        }
      );

      const result = await res.json();
      if (result.success) {
        toast.success('Lesson plan fields updated successfully!');
        onClose?.();
      } else {
        toast.error(result.error || 'Failed to save fields');
      }
    } catch (error) {
      console.error('[Save Fields] Error:', error);
      toast.error('Failed to save fields');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {onClose && (
            <Button onClick={onClose} variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
          )}
          <div>
            <h2 className="text-2xl font-bold">Lesson Plan Field Settings</h2>
            <p className="text-sm text-gray-600">Configure the fields teachers will fill in lesson plans</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button onClick={handleAddField} variant="outline" size="sm">
            <Plus className="h-4 w-4 mr-2" />
            Add Field
          </Button>
          <Button onClick={handleSave} disabled={saving} size="sm">
            <Save className="h-4 w-4 mr-2" />
            {saving ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </div>

      {/* Fields List */}
      <div className="space-y-4">
        {fields.map((field, index) => (
          <Card key={field.id} className={!field.is_active ? 'opacity-50' : ''}>
            <CardContent className="p-4">
              <div className="flex gap-4">
                {/* Drag Handle */}
                <div className="flex flex-col gap-1 pt-6">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleMoveUp(index)}
                    disabled={index === 0}
                    className="h-6 w-6 p-0"
                  >
                    ▲
                  </Button>
                  <GripVertical className="h-4 w-4 text-gray-400" />
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleMoveDown(index)}
                    disabled={index === fields.length - 1}
                    className="h-6 w-6 p-0"
                  >
                    ▼
                  </Button>
                </div>

                {/* Field Configuration */}
                <div className="flex-1 grid md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor={`field-name-${field.id}`}>Field Name (Key)</Label>
                    <Input
                      id={`field-name-${field.id}`}
                      value={field.field_name}
                      onChange={(e) => handleFieldChange(field.id, 'field_name', e.target.value.toLowerCase().replace(/\s+/g, '_'))}
                      placeholder="e.g., lesson_title"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor={`field-label-${field.id}`}>Display Label</Label>
                    <Input
                      id={`field-label-${field.id}`}
                      value={field.field_label}
                      onChange={(e) => handleFieldChange(field.id, 'field_label', e.target.value)}
                      placeholder="e.g., Lesson Title"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor={`field-type-${field.id}`}>Field Type</Label>
                    <Select
                      value={field.field_type}
                      onValueChange={(value) => handleFieldChange(field.id, 'field_type', value)}
                    >
                      <SelectTrigger id={`field-type-${field.id}`}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="text">Text</SelectItem>
                        <SelectItem value="textarea">Textarea</SelectItem>
                        <SelectItem value="number">Number</SelectItem>
                        <SelectItem value="date">Date</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor={`placeholder-${field.id}`}>Placeholder</Label>
                    <Input
                      id={`placeholder-${field.id}`}
                      value={field.placeholder}
                      onChange={(e) => handleFieldChange(field.id, 'placeholder', e.target.value)}
                      placeholder="e.g., Enter the lesson title..."
                    />
                  </div>

                  {field.field_type === 'textarea' && (
                    <div className="space-y-2">
                      <Label htmlFor={`rows-${field.id}`}>Rows</Label>
                      <Input
                        id={`rows-${field.id}`}
                        type="number"
                        value={field.rows || 4}
                        onChange={(e) => handleFieldChange(field.id, 'rows', parseInt(e.target.value))}
                        min={2}
                        max={30}
                      />
                    </div>
                  )}

                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      <Switch
                        id={`required-${field.id}`}
                        checked={field.is_required}
                        onCheckedChange={(checked) => handleFieldChange(field.id, 'is_required', checked)}
                      />
                      <Label htmlFor={`required-${field.id}`}>Required</Label>
                    </div>

                    <div className="flex items-center gap-2">
                      <Switch
                        id={`active-${field.id}`}
                        checked={field.is_active}
                        onCheckedChange={(checked) => handleFieldChange(field.id, 'is_active', checked)}
                      />
                      <Label htmlFor={`active-${field.id}`}>Active</Label>
                    </div>
                  </div>
                </div>

                {/* Delete Button */}
                <div className="pt-6">
                  <Button
                    onClick={() => handleRemoveField(field.id)}
                    variant="ghost"
                    size="sm"
                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {fields.length === 0 && (
        <Card>
          <CardContent className="py-12">
            <div className="text-center text-gray-500">
              <p>No fields configured yet.</p>
              <Button onClick={handleAddField} variant="outline" className="mt-4">
                <Plus className="h-4 w-4 mr-2" />
                Add First Field
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Preview */}
      <Card className="border-2 border-purple-200">
        <CardHeader className="bg-gradient-to-r from-purple-50 to-pink-50">
          <CardTitle>Preview</CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="space-y-4">
            <p className="text-sm text-gray-600 mb-4">This is how the lesson plan form will look to teachers:</p>
            <div className="grid md:grid-cols-2 gap-4">
              {fields.filter(f => f.is_active).slice(0, 7).map(field => (
                <div key={field.id} className="space-y-2">
                  <Label>
                    {field.field_label}
                    {field.is_required && <span className="text-red-500 ml-1">*</span>}
                  </Label>
                  {field.field_type === 'textarea' ? (
                    <div className="border rounded-md p-2 bg-gray-50 text-sm text-gray-500">
                      {field.placeholder || 'Textarea field'}
                    </div>
                  ) : (
                    <div className="border rounded-md p-2 bg-gray-50 text-sm text-gray-500">
                      {field.placeholder || `${field.field_type} field`}
                    </div>
                  )}
                </div>
              ))}
            </div>
            <div className="space-y-4">
              {fields.filter(f => f.is_active).slice(7).map(field => (
                <div key={field.id} className="space-y-2">
                  <Label>
                    {field.field_label}
                    {field.is_required && <span className="text-red-500 ml-1">*</span>}
                  </Label>
                  <div className="border rounded-md p-2 bg-gray-50 text-sm text-gray-500">
                    {field.placeholder || 'Field content'}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}