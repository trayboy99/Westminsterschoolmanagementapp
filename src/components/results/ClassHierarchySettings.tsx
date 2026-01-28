import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { 
  ArrowUp, 
  ArrowDown, 
  Save, 
  Layers, 
  Info,
  GripVertical
} from 'lucide-react';
import { createClient } from '../../utils/supabase/client';
import { projectId } from '../../utils/supabase/info';
import { toast } from 'sonner@2.0.3';

interface ClassWithHierarchy {
  id: string;
  name: string;
  level: string;
  section_id?: string;
  sections?: { name: string } | null;
  student_count?: number;
}

export function ClassHierarchySettings() {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [classes, setClasses] = useState<ClassWithHierarchy[]>([]);
  const supabase = createClient();

  useEffect(() => {
    fetchClasses();
  }, []);

  const fetchClasses = async () => {
    try {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const headers = {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json'
      };

      // Use backend endpoint (same as ClassesManager)
      const classesResponse = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-1ddd013a/classes`,
        { headers }
      );

      const classesResult = await classesResponse.json();

      if (!classesResult.success) {
        console.error('[Hierarchy] Error fetching classes:', classesResult.error);
        toast.error('Failed to load classes');
        return;
      }

      const classesData = classesResult.classes || [];
      console.log('[Hierarchy] Raw classes data:', classesData);
      console.log('[Hierarchy] Number of classes fetched:', classesData.length);

      if (classesData.length === 0) {
        console.log('[Hierarchy] No classes found in database');
        setClasses([]);
        return;
      }

      // Get student counts for each class
      const classesWithCounts = await Promise.all(
        (classesData || []).map(async (cls) => {
          const { count } = await supabase
            .from('profiles')
            .select('id', { count: 'exact', head: true })
            .eq('class_id', cls.id)
            .eq('role', 'student')
            .or('is_graduated.is.null,is_graduated.eq.false');  // ✅ Exclude graduated students

          return {
            ...cls,
            student_count: count || 0
          };
        })
      );

      // Fetch saved hierarchy from KV store (backend)
      let orderedClasses = classesWithCounts;
      
      try {
        const hierarchyRes = await fetch(
          `https://${projectId}.supabase.co/functions/v1/make-server-1ddd013a/class-hierarchy`,
          { headers }
        );

        if (hierarchyRes.ok) {
          const hierarchyResult = await hierarchyRes.json();
          if (hierarchyResult.success && hierarchyResult.hierarchy) {
          // Reorder classes based on saved hierarchy
          const hierarchyOrder = hierarchyResult.hierarchy; // Array of class IDs in order
          orderedClasses = hierarchyOrder
            .map((classId: string) => classesWithCounts.find(c => c.id === classId))
            .filter(Boolean) as typeof classesWithCounts;
          
          // Add any new classes not in the saved hierarchy at the end
          const idsInHierarchy = new Set(hierarchyOrder);
          const newClasses = classesWithCounts.filter(c => !idsInHierarchy.has(c.id));
          orderedClasses = [...orderedClasses, ...newClasses];
          
            console.log('[Hierarchy] Loaded saved hierarchy from KV store');
          }
        } else {
          // No saved hierarchy, use default level-based ordering
          orderedClasses = classesWithCounts.sort((a, b) => {
            const levelOrder: Record<string, number> = {
              'JSS1': 1, 'JSS2': 2, 'JSS3': 3,
              'SS1': 4, 'SS2': 5, 'SS3': 6
            };
            return (levelOrder[a.level] || 99) - (levelOrder[b.level] || 99);
          });
          console.log('[Hierarchy] No saved hierarchy - using default level order');
        }
      } catch (fetchError) {
        console.warn('[Hierarchy] Could not fetch hierarchy from KV, using default order:', fetchError);
        // Use default level-based ordering
        orderedClasses = classesWithCounts.sort((a, b) => {
          const levelOrder: Record<string, number> = {
            'JSS1': 1, 'JSS2': 2, 'JSS3': 3,
            'SS1': 4, 'SS2': 5, 'SS3': 6
          };
          return (levelOrder[a.level] || 99) - (levelOrder[b.level] || 99);
        });
      }

      setClasses(orderedClasses);
      console.log('[Hierarchy] Loaded classes:', orderedClasses.length);
    } catch (error) {
      console.error('[Hierarchy] Error:', error);
      toast.error('Failed to load class hierarchy');
    } finally {
      setLoading(false);
    }
  };

  const moveClass = (index: number, direction: 'up' | 'down') => {
    const newClasses = [...classes];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;

    if (targetIndex < 0 || targetIndex >= newClasses.length) return;

    // Swap classes
    [newClasses[index], newClasses[targetIndex]] = [newClasses[targetIndex], newClasses[index]];

    setClasses(newClasses);
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error('Not authenticated');
        return;
      }

      const headers = {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json'
      };

      // Save hierarchy as array of class IDs in order
      const hierarchyOrder = classes.map(cls => cls.id);

      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-1ddd013a/class-hierarchy`,
        {
          method: 'POST',
          headers,
          body: JSON.stringify({ hierarchy: hierarchyOrder })
        }
      );

      const result = await response.json();

      if (result.success) {
        toast.success('Class hierarchy saved successfully!');
        console.log('[Hierarchy] Saved hierarchy order to KV store');
      } else {
        console.error('[Hierarchy] Error saving:', result.error);
        toast.error(result.error || 'Failed to save hierarchy');
      }
    } catch (error) {
      console.error('[Hierarchy] Error saving:', error);
      toast.error('Failed to save class hierarchy');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Layers className="h-5 w-5" />
              Class Hierarchy
            </CardTitle>
            <CardDescription>
              Define the progression order of classes for student promotion
            </CardDescription>
          </div>
          <Button 
            onClick={handleSave} 
            disabled={saving}
            size="sm"
          >
            <Save className="h-4 w-4 mr-2" />
            {saving ? 'Saving...' : 'Save Hierarchy'}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Info Box */}
        <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-start gap-3">
            <Info className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
            <div className="text-sm text-blue-900">
              <p className="font-medium mb-2">How Class Hierarchy Works:</p>
              <ul className="list-disc list-inside space-y-1 text-blue-800">
                <li>Arrange classes from lowest to highest (e.g., JSS1 → JSS2 → JSS3)</li>
                <li>Classes with sections (e.g., JSS1 A, JSS1 B) should be at the same level</li>
                <li>Students will be promoted to the next class in this order</li>
                <li>The highest class students will become "graduating students"</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Class Hierarchy List */}
        <div className="space-y-2">
          {classes.map((cls, index) => {
            // Note: cls.name already includes the section
            const displayName = cls.name;

            return (
              <div 
                key={cls.id}
                className="flex items-center gap-3 p-4 border rounded-lg bg-white hover:bg-slate-50 transition-colors"
              >
                {/* Drag Handle */}
                <GripVertical className="h-5 w-5 text-slate-400" />

                {/* Order Number */}
                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary font-medium text-sm">
                  {index + 1}
                </div>

                {/* Class Info */}
                <div className="flex-1">
                  <div className="font-medium">{displayName}</div>
                  <div className="text-sm text-slate-600">
                    Level: {cls.level} • {cls.student_count || 0} students
                  </div>
                </div>

                {/* Badges */}
                <div className="flex items-center gap-2">
                  {index === 0 && (
                    <Badge className="bg-green-100 text-green-800 border-0">
                      Lowest Class
                    </Badge>
                  )}
                  {index === classes.length - 1 && (
                    <Badge className="bg-purple-100 text-purple-800 border-0">
                      Graduating Class
                    </Badge>
                  )}
                </div>

                {/* Move Buttons */}
                <div className="flex gap-1">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => moveClass(index, 'up')}
                    disabled={index === 0}
                    className="h-8 w-8 p-0"
                  >
                    <ArrowUp className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => moveClass(index, 'down')}
                    disabled={index === classes.length - 1}
                    className="h-8 w-8 p-0"
                  >
                    <ArrowDown className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>

        {classes.length === 0 && (
          <div className="text-center py-8 text-slate-500">
            No classes found. Please create classes first in the Classes Manager.
          </div>
        )}
      </CardContent>
    </Card>
  );
}