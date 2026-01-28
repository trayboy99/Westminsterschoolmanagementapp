import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';
import { Label } from '../ui/label';
import { Alert, AlertDescription } from '../ui/alert';
import { ArrowLeft, Save, Send, BookOpen, Clock, AlertCircle, Check, Image as ImageIcon, X } from 'lucide-react';
import { createClient } from '../../utils/supabase/client';
import { projectId } from '../../utils/supabase/info';
import { toast } from 'sonner@2.0.3';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';

interface LessonPlanEditorProps {
  weekInfo: any;
  subjectClass: any;
  onClose: () => void;
  existingPlan?: any;
}

interface LessonPlanField {
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

export function LessonPlanEditor({ weekInfo, subjectClass, onClose, existingPlan }: LessonPlanEditorProps) {
  const [fields, setFields] = useState<LessonPlanField[]>([]);
  const [lessonData, setLessonData] = useState<any>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showSaveAsNote, setShowSaveAsNote] = useState(false);
  const [noteTitle, setNoteTitle] = useState('');
  const [lessonPlanId, setLessonPlanId] = useState<string | null>(null);
  const [lastSaved, setLastSaved] = useState<string | null>(null);
  const [existingLessonPlan, setExistingLessonPlan] = useState<any>(null);

  const supabase = createClient();

  useEffect(() => {
    fetchFields();
    fetchExistingPlan();
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
        const sortedFields = result.fields.sort((a: LessonPlanField, b: LessonPlanField) => 
          a.field_order - b.field_order
        );
        setFields(sortedFields.filter((f: LessonPlanField) => f.is_active));
        
        // Initialize lesson data with default values
        const initialData: any = {};
        sortedFields.forEach((field: LessonPlanField) => {
          if (field.field_name === 'date') {
            initialData[field.field_name] = new Date().toISOString().split('T')[0];
          } else if (field.field_name === 'class') {
            initialData[field.field_name] = subjectClass?.class_name || '';
          } else if (field.field_name === 'subject') {
            initialData[field.field_name] = subjectClass?.subject_name || '';
          } else {
            initialData[field.field_name] = '';
          }
        });
        setLessonData(initialData);
      }
    } catch (error) {
      console.error('[Lesson Plan Fields] Error:', error);
      toast.error('Failed to load lesson plan fields');
    } finally {
      setLoading(false);
    }
  };

  const fetchExistingPlan = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session || !weekInfo || !subjectClass) return;

      const res = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-1ddd013a/lesson-plans?session=${weekInfo.session}&term=${weekInfo.term}`,
        {
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      const result = await res.json();
      if (result.success) {
        // Find existing lesson plan for this subject, class, and week
        const existing = result.lesson_plans.find((lp: any) =>
          lp.subject_id === subjectClass.subject_id &&
          lp.class_id === subjectClass.class_id &&
          lp.week_number === weekInfo.weekNumber
        );

        if (existing) {
          setExistingLessonPlan(existing);
          setLessonData(existing.lesson_data || {});
          setLessonPlanId(existing.id);
          setLastSaved(existing.updated_at);
        }
      }
    } catch (error) {
      console.error('[Existing Plan] Error:', error);
    }
  };

  const handleInputChange = (fieldName: string, value: string) => {
    setLessonData((prev: any) => ({
      ...prev,
      [fieldName]: value
    }));
  };

  const validateForm = () => {
    for (const field of fields) {
      if (field.is_required && !lessonData[field.field_name]?.trim()) {
        toast.error(`${field.field_label} is required`);
        return false;
      }
    }
    return true;
  };

  const handleSaveDraft = async () => {
    if (!validateForm()) return;

    setSaving(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const payload = {
        id: lessonPlanId,
        class_id: subjectClass.class_id,
        subject_id: subjectClass.subject_id,
        session: weekInfo.session,
        term: weekInfo.term,
        week_number: weekInfo.weekNumber,
        week_start_date: weekInfo.weekStartDate,
        week_end_date: weekInfo.weekEndDate,
        lesson_data: lessonData,
        status: 'draft'
      };

      const res = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-1ddd013a/lesson-plans`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(payload)
        }
      );

      const result = await res.json();
      if (result.success) {
        setLessonPlanId(result.lesson_plan.id);
        setLastSaved(new Date().toISOString());
        toast.success('Lesson plan saved as draft');
      } else {
        toast.error(result.error || 'Failed to save lesson plan');
      }
    } catch (error) {
      console.error('[Save Draft] Error:', error);
      toast.error('Failed to save lesson plan');
    } finally {
      setSaving(false);
    }
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    setSaving(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const payload = {
        id: lessonPlanId,
        class_id: subjectClass.class_id,
        subject_id: subjectClass.subject_id,
        session: weekInfo.session,
        term: weekInfo.term,
        week_number: weekInfo.weekNumber,
        week_start_date: weekInfo.weekStartDate,
        week_end_date: weekInfo.weekEndDate,
        lesson_data: lessonData,
        status: 'submitted'
      };

      const res = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-1ddd013a/lesson-plans`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(payload)
        }
      );

      const result = await res.json();
      if (result.success) {
        toast.success('Lesson plan submitted for approval!');
        onClose();
      } else {
        toast.error(result.error || 'Failed to submit lesson plan');
      }
    } catch (error) {
      console.error('[Submit] Error:', error);
      toast.error('Failed to submit lesson plan');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveAsNote = async () => {
    if (!noteTitle.trim()) {
      toast.error('Please enter a title for the lesson note');
      return;
    }

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const payload = {
        title: noteTitle,
        content: lessonData,
        subject_id: subjectClass.subject_id,
        tags: [subjectClass.subject_name, weekInfo.term]
      };

      const res = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-1ddd013a/lesson-notes`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(payload)
        }
      );

      const result = await res.json();
      if (result.success) {
        toast.success('Lesson note saved to library!');
        setShowSaveAsNote(false);
        setNoteTitle('');
      } else {
        toast.error(result.error || 'Failed to save lesson note');
      }
    } catch (error) {
      console.error('[Save Note] Error:', error);
      toast.error('Failed to save lesson note');
    }
  };

  const renderField = (field: LessonPlanField) => {
    const value = lessonData[field.field_name] || '';

    if (field.field_type === 'textarea') {
      return (
        <div key={field.id} className="space-y-2">
          <Label htmlFor={field.field_name}>
            {field.field_label}
            {field.is_required && <span className="text-red-500 ml-1">*</span>}
          </Label>
          <Textarea
            id={field.field_name}
            value={value}
            onChange={(e) => handleInputChange(field.field_name, e.target.value)}
            placeholder={field.placeholder}
            rows={field.rows || 4}
            className="resize-none font-sans"
            disabled={existingLessonPlan?.status === 'approved'}
          />
        </div>
      );
    }

    return (
      <div key={field.id} className="space-y-2">
        <Label htmlFor={field.field_name}>
          {field.field_label}
          {field.is_required && <span className="text-red-500 ml-1">*</span>}
        </Label>
        <Input
          id={field.field_name}
          type={field.field_type}
          value={value}
          onChange={(e) => handleInputChange(field.field_name, e.target.value)}
          placeholder={field.placeholder}
          disabled={existingLessonPlan?.status === 'approved'}
        />
      </div>
    );
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
        <Button onClick={onClose} variant="ghost" size="sm">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        {lastSaved && (
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <Clock className="h-4 w-4" />
            Last saved: {new Date(lastSaved).toLocaleTimeString()}
          </div>
        )}
      </div>

      {/* Status Alert */}
      {existingLessonPlan && (
        <>
          {existingLessonPlan.status === 'approved' && (
            <Alert className="bg-green-50 border-green-200">
              <Check className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800">
                This lesson plan has been approved by the principal.
              </AlertDescription>
            </Alert>
          )}
          {existingLessonPlan.status === 'declined' && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <strong>Declined:</strong> {existingLessonPlan.review_notes || 'No reason provided'}
              </AlertDescription>
            </Alert>
          )}
        </>
      )}

      {/* Lesson Plan Form */}
      <Card className="border-2 border-purple-200">
        <CardHeader className="bg-gradient-to-r from-purple-50 to-pink-50 border-b border-purple-200">
          <div className="text-center space-y-2">
            <CardTitle className="text-2xl font-bold text-purple-900 uppercase">LESSON PLAN</CardTitle>
            <div className="h-1 w-32 mx-auto bg-purple-400 rounded"></div>
            <div className="flex gap-3 justify-center mt-4">
              <div className="px-4 py-2 bg-white rounded-lg shadow-sm border border-purple-200">
                <p className="text-xs text-gray-600">Subject</p>
                <p className="font-semibold text-gray-900">{subjectClass?.subject_name}</p>
              </div>
              <div className="px-4 py-2 bg-white rounded-lg shadow-sm border border-purple-200">
                <p className="text-xs text-gray-600">Class</p>
                <p className="font-semibold text-gray-900">{subjectClass?.class_name}</p>
              </div>
              <div className="px-4 py-2 bg-white rounded-lg shadow-sm border border-purple-200">
                <p className="text-xs text-gray-600">Week</p>
                <p className="font-semibold text-gray-900">Week {weekInfo?.weekNumber}</p>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-6 md:p-8 space-y-6">
          {/* Render all fields */}
          <div className="grid md:grid-cols-2 gap-6">
            {fields.slice(0, 7).map(field => (
              <div key={field.id}>
                {renderField(field)}
              </div>
            ))}
          </div>

          {/* Full-width fields */}
          <div className="space-y-6">
            {fields.slice(7).map(field => renderField(field))}
          </div>
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row gap-3 justify-end">
        {existingLessonPlan?.status !== 'approved' && (
          <>
            <Button
              onClick={() => setShowSaveAsNote(true)}
              variant="outline"
              disabled={saving}
            >
              <BookOpen className="h-4 w-4 mr-2" />
              Save as Lesson Note
            </Button>
            <Button
              onClick={handleSaveDraft}
              variant="outline"
              disabled={saving}
              className="border-blue-300 text-blue-700 hover:bg-blue-50"
            >
              <Save className="h-4 w-4 mr-2" />
              {saving ? 'Saving...' : 'Save Draft'}
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={saving || existingLessonPlan?.status === 'submitted'}
              className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
            >
              <Send className="h-4 w-4 mr-2" />
              {existingLessonPlan?.status === 'submitted' ? 'Already Submitted' : 'Submit for Approval'}
            </Button>
          </>
        )}
      </div>

      {/* Save as Note Dialog */}
      <Dialog open={showSaveAsNote} onOpenChange={setShowSaveAsNote}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Save as Lesson Note</DialogTitle>
            <DialogDescription>
              Save this lesson plan content as a reusable lesson note in your library.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="note-title">Lesson Note Title</Label>
              <Input
                id="note-title"
                value={noteTitle}
                onChange={(e) => setNoteTitle(e.target.value)}
                placeholder="e.g., Introduction to Algebra - Week 5"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSaveAsNote(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveAsNote}>
              <BookOpen className="h-4 w-4 mr-2" />
              Save Note
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
