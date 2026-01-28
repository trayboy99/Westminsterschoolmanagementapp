import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Alert, AlertDescription } from '../ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { 
  ArrowRight, 
  Users, 
  Info,
  AlertTriangle,
  CheckCircle,
  GraduationCap,
  TrendingUp,
  FileText,
  Undo2,
  History,
  Database
} from 'lucide-react';
import { createClient } from '../../utils/supabase/client';
import { projectId } from '../../utils/supabase/info';
import { toast } from 'sonner@2.0.3';

interface ClassForPromotion {
  id: string;
  name: string;
  level: string;
  section_id?: string;
  sections?: { name: string } | null;
  student_count: number;
  next_class?: ClassForPromotion | null;
  is_graduating: boolean;
}

interface PromotionPreview {
  from_class_id: string;
  to_class_id: string | null;
  students_count: number;
  section_matched: boolean;
  is_graduation: boolean;
  warnings: string[];
}

interface StudentGroup {
  class_id: string;
  class_name: string;
  student_count: number;
  students: any[];
}

interface PromotionRecord {
  id: string;
  from_class_id: string;
  to_class_id: string | null;
  from_class_name?: string;
  to_class_name?: string;
  student_count: number;
  current_session: string;
  new_session: string;
  is_graduation: boolean;
  promoted_at: string;
  promoted_by_name?: string;
  is_reverted?: boolean;
}

export function PromotionManagement() {
  const [loading, setLoading] = useState(false);
  const [promoting, setPromoting] = useState<string | null>(null);
  const [reverting, setReverting] = useState<string | null>(null);
  const [classes, setClasses] = useState<ClassForPromotion[]>([]);
  const [recentPromotions, setRecentPromotions] = useState<PromotionRecord[]>([]);
  const [currentSession, setCurrentSession] = useState('');
  const [newSession, setNewSession] = useState('');
  const [promotionPreviews, setPromotionPreviews] = useState<Record<string, PromotionPreview>>({});
  const [selectedNextClasses, setSelectedNextClasses] = useState<Record<string, string>>({});
  const [setupLoading, setSetupLoading] = useState(false);
  
  const supabase = createClient();

  useEffect(() => {
    fetchSessionInfo();
    fetchClassesWithHierarchy();
    fetchRecentPromotions();
  }, []);

  const fetchSessionInfo = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-1ddd013a/session-settings`,
        {
          headers: {
            Authorization: `Bearer ${session.access_token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      const data = await response.json();
      if (data.success) {
        const activeSession = data.sessions?.find((s: any) => s.is_current);
        if (activeSession) {
          setCurrentSession(activeSession.session_name);
          // Suggest next session (e.g., 2024/2025 -> 2025/2026)
          const years = activeSession.session_name.split('/');
          if (years.length === 2) {
            const nextYear = `${parseInt(years[0]) + 1}/${parseInt(years[1]) + 1}`;
            setNewSession(nextYear);
          }
        }
      }
    } catch (error) {
      console.error('[Promotion] Error fetching session:', error);
    }
  };

  const fetchRecentPromotions = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-1ddd013a/recent-promotions`,
        {
          headers: {
            Authorization: `Bearer ${session.access_token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      const data = await response.json();
      if (data.success) {
        setRecentPromotions(data.promotions || []);
        console.log('[Promotion] Loaded recent promotions:', data.promotions?.length || 0);
      }
    } catch (error) {
      console.error('[Promotion] Error fetching recent promotions:', error);
    }
  };

  const fetchClassesWithHierarchy = async () => {
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
        console.error('[Promotion] Error fetching classes:', classesResult.error);
        toast.error('Failed to load classes');
        return;
      }

      const classesData = classesResult.classes || [];

      // Fetch hierarchy from KV store
      const hierarchyRes = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-1ddd013a/class-hierarchy`,
        { headers }
      );

      let orderedClassesData = classesData || [];

      if (hierarchyRes.ok) {
        const hierarchyResult = await hierarchyRes.json();
        if (hierarchyResult.success && hierarchyResult.hierarchy) {
          // Reorder based on saved hierarchy
          const hierarchyOrder = hierarchyResult.hierarchy;
          orderedClassesData = hierarchyOrder
            .map((classId: string) => classesData?.find(c => c.id === classId))
            .filter(Boolean);
          
          // Add any new classes not in hierarchy
          const idsInHierarchy = new Set(hierarchyOrder);
          const newClasses = (classesData || []).filter(c => !idsInHierarchy.has(c.id));
          orderedClassesData = [...orderedClassesData, ...newClasses];
          
          console.log('[Promotion] Using saved hierarchy from KV store');
        }
      } else {
        // Default level-based ordering
        orderedClassesData = (classesData || []).sort((a, b) => {
          const levelOrder: Record<string, number> = {
            'JSS1': 1, 'JSS2': 2, 'JSS3': 3,
            'SS1': 4, 'SS2': 5, 'SS3': 6
          };
          return (levelOrder[a.level] || 99) - (levelOrder[b.level] || 99);
        });
        console.log('[Promotion] No saved hierarchy - using default order');
      }

      // Fetch students from backend (same as StudentsManager)
      const studentsResponse = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-1ddd013a/students`,
        { headers }
      );

      const studentsResult = await studentsResponse.json();
      const studentGroups: StudentGroup[] = studentsResult.success ? (studentsResult.classes || []) : [];

      console.log('[Promotion] Student groups:', studentGroups.length);

      // Get student counts and build progression map
      const classesWithCounts = orderedClassesData.map((cls, index) => {
        // Find student count from backend data
        const studentGroup = studentGroups.find(sg => sg.class_id === cls.id);
        const studentCount = studentGroup?.student_count || 0;

        // Determine default next class
        const nextClass = orderedClassesData[index + 1] || null;
        const isGraduating = !nextClass;

        return {
          ...cls,
          student_count: studentCount,
          next_class: nextClass ? {
            ...nextClass,
            student_count: 0,
            is_graduating: false
          } : null,
          is_graduating: isGraduating
        };
      });

      setClasses(classesWithCounts);
      console.log('[Promotion] Loaded classes for promotion:', classesWithCounts.length);

      // Initialize selected next classes (default to next in hierarchy)
      const initialSelections: Record<string, string> = {};
      classesWithCounts.forEach((cls, index) => {
        const nextClass = classesWithCounts[index + 1];
        if (nextClass) {
          initialSelections[cls.id] = nextClass.id;
        }
      });
      setSelectedNextClasses(initialSelections);

      // Generate promotion previews
      generatePreviews(classesWithCounts, initialSelections);
    } catch (error) {
      console.error('[Promotion] Error:', error);
      toast.error('Failed to load promotion data');
    } finally {
      setLoading(false);
    }
  };

  const generatePreviews = (classesData: ClassForPromotion[], selections: Record<string, string> = selectedNextClasses) => {
    const previews: Record<string, PromotionPreview> = {};

    classesData.forEach((cls) => {
      const selectedNextClassId = selections[cls.id];
      const nextClass = selectedNextClassId ? classesData.find(c => c.id === selectedNextClassId) : null;
      const warnings: string[] = [];

      // Check section matching
      const currentSection = cls.sections?.name;
      const nextSection = nextClass?.sections?.name;
      const sectionMatched = currentSection === nextSection;

      if (currentSection && !nextSection && nextClass) {
        warnings.push(`Students will move from ${cls.name} ${currentSection} to ${nextClass.name} (section removed)`);
      } else if (currentSection && nextSection && !sectionMatched) {
        warnings.push(`Section mismatch: ${currentSection} → ${nextSection}`);
      }

      previews[cls.id] = {
        from_class_id: cls.id,
        to_class_id: nextClass?.id || null,
        students_count: cls.student_count,
        section_matched: sectionMatched || !currentSection,
        is_graduation: !nextClass,
        warnings
      };
    });

    setPromotionPreviews(previews);
  };

  const handleNextClassChange = (fromClassId: string, toClassId: string) => {
    const updated = { ...selectedNextClasses, [fromClassId]: toClassId };
    setSelectedNextClasses(updated);
    generatePreviews(classes, updated);
  };

  const handlePromote = async (fromClassId: string) => {
    const preview = promotionPreviews[fromClassId];
    if (!preview) return;

    const fromClass = classes.find(c => c.id === fromClassId);
    if (!fromClass) return;

    // Get the selected next class (not the default hierarchy one)
    const selectedNextClassId = selectedNextClasses[fromClassId];
    const toClass = selectedNextClassId ? classes.find(c => c.id === selectedNextClassId) : null;

    // Note: fromClass.name and toClass.name already include the section
    const displayName = fromClass.name;

    const toDisplayName = toClass
      ? toClass.name
      : 'Graduated';

    if (!confirm(
      `Promote ${preview.students_count} students from ${displayName} to ${toDisplayName}?\n\n` +
      `This will update all student records for session ${newSession || 'next session'}.\n\n` +
      (preview.warnings.length > 0 ? `Warnings:\n${preview.warnings.join('\n')}\n\n` : '') +
      `This action cannot be undone. Continue?`
    )) {
      return;
    }

    try {
      setPromoting(fromClassId);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error('Not authenticated');
        return;
      }

      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-1ddd013a/promote-students`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${session.access_token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            from_class_id: fromClassId,
            to_class_id: preview.to_class_id,
            current_session: currentSession,
            new_session: newSession || currentSession,
            session: newSession || currentSession, // For backward compatibility
            is_graduation: preview.is_graduation
          })
        }
      );

      const data = await response.json();
      console.log('[Promotion] Server response:', data);

      if (data.success) {
        toast.success(
          preview.is_graduation 
            ? `✅ ${data.promoted_count} students graduated successfully!`
            : `✅ ${data.promoted_count} students promoted to ${toDisplayName}!`
        );
        
        // Refresh data
        await fetchClassesWithHierarchy();
        await fetchRecentPromotions();
      } else {
        console.error('[Promotion] Error from server:', data);
        if (data.details) {
          console.error('[Promotion] Error details:', data.details);
        }
        toast.error(data.error || 'Failed to promote students', { duration: 10000 });
        
        // Show detailed error in alert
        alert(
          '❌ PROMOTION FAILED\n\n' +
          (data.error || 'Failed to promote students') + '\n\n' +
          'Check the browser console for detailed error information.'
        );
      }
    } catch (error) {
      console.error('[Promotion] Error promoting:', error);
      toast.error('Failed to promote students');
    } finally {
      setPromoting(null);
    }
  };

  const handleRevert = async (promotionId: string) => {
    const promotion = recentPromotions.find(p => p.id === promotionId);
    if (!promotion) return;

    const fromDisplay = promotion.from_class_name || 'Unknown';
    const toDisplay = promotion.is_graduation 
      ? 'Graduated' 
      : (promotion.to_class_name || 'Unknown');

    if (!confirm(
      `⚠️ REVERT PROMOTION\n\n` +
      `This will move ${promotion.student_count} students back:\n` +
      `FROM: ${toDisplay}\n` +
      `TO: ${fromDisplay}\n\n` +
      `Session: ${promotion.new_session} → ${promotion.current_session}\n\n` +
      `This action will undo the promotion. Continue?`
    )) {
      return;
    }

    try {
      setReverting(promotionId);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error('Not authenticated');
        return;
      }

      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-1ddd013a/revert-promotion`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${session.access_token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            promotion_id: promotionId
          })
        }
      );

      const data = await response.json();

      if (data.success) {
        toast.success(`✅ ${data.reverted_count} students returned to ${fromDisplay}!`);
        
        // Refresh data
        await fetchClassesWithHierarchy();
        await fetchRecentPromotions();
      } else {
        toast.error(data.error || 'Failed to revert promotion');
      }
    } catch (error) {
      console.error('[Promotion] Error reverting:', error);
      toast.error('Failed to revert promotion');
    } finally {
      setReverting(null);
    }
  };

  const handleSetupDatabase = async () => {
    if (!confirm(
      'Setup Graduated Students Table\n\n' +
      'This will verify that the graduated_students table exists in your database.\n\n' +
      'If the table doesn\'t exist, you\'ll get SQL instructions to create it.\n\n' +
      'Continue?'
    )) {
      return;
    }

    try {
      setSetupLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error('Not authenticated');
        return;
      }

      console.log('[DB Setup] Calling setup endpoint...');
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-1ddd013a/setup-graduated-students-table`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${session.access_token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      const data = await response.json();
      console.log('[DB Setup] Response:', data);

      if (data.success) {
        toast.success('✅ Database table is ready!');
      } else {
        // Show error with instructions
        console.error('[DB Setup] Error:', data.error);
        console.log('[DB Setup] Details:', data.details);
        
        if (data.instructions) {
          // Copy instructions to clipboard
          navigator.clipboard.writeText(data.instructions);
          
          toast.error(
            'Table does not exist. SQL instructions copied to clipboard!',
            { duration: 8000 }
          );
          
          alert(
            '⚠️ DATABASE TABLE MISSING\n\n' +
            data.error + '\n\n' +
            'INSTRUCTIONS:\n' +
            '1. Go to Supabase Dashboard\n' +
            '2. Click on "SQL Editor"\n' +
            '3. Paste the SQL (copied to clipboard)\n' +
            '4. Click "Run"\n\n' +
            'Then refresh this page and try promoting students again.'
          );
        } else {
          toast.error(data.error || 'Failed to setup database');
        }
      }
    } catch (error) {
      console.error('[DB Setup] Error:', error);
      toast.error('Failed to setup database');
    } finally {
      setSetupLoading(false);
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
    <div className="space-y-3 md:space-y-6 p-2 md:p-0">
      {/* Header Card */}
      <Card>
        <CardHeader className="p-4 md:p-6">
          <CardTitle className="flex items-center gap-2 text-lg md:text-xl">
            <TrendingUp className="h-5 w-5 md:h-6 md:w-6" />
            Student Promotion Management
          </CardTitle>
          <CardDescription className="text-xs md:text-sm">
            Promote students to the next class based on class hierarchy
          </CardDescription>
        </CardHeader>
        <CardContent className="p-4 md:p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
            <div>
              <label className="text-xs md:text-sm font-medium mb-2 block">Current Session</label>
              <div className="p-2 md:p-3 bg-slate-50 border rounded-lg text-sm md:text-base">
                {currentSession || 'Not set'}
              </div>
            </div>
            <div>
              <label className="text-xs md:text-sm font-medium mb-2 block">New Session (After Promotion)</label>
              <input
                type="text"
                value={newSession}
                onChange={(e) => setNewSession(e.target.value)}
                placeholder="e.g., 2025/2026"
                className="w-full p-2 md:p-3 border rounded-lg text-sm md:text-base"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Instructions */}
      <Alert className="border-blue-200 bg-blue-50 mx-2 md:mx-0">
        <Info className="h-4 w-4 text-blue-600 flex-shrink-0 mt-0.5" />
        <AlertDescription className="text-blue-900 text-xs md:text-sm leading-relaxed">
          <strong className="block mb-1 md:mb-2">How Promotion Works:</strong>
          <ul className="list-disc list-inside space-y-1 md:space-y-1.5 text-xs md:text-sm">
            <li className="leading-relaxed"><strong className="text-red-600">⚠️ CRITICAL:</strong> Always start promotion from the <strong>HIGHEST class first</strong> (SS3 → SS2 → SS1 → JSS3 → JSS2 → JSS1)</li>
            <li className="leading-relaxed"><strong className="text-red-600">Why?</strong> Starting from lower classes causes students to be promoted twice in the same session!</li>
            <li className="leading-relaxed">Scroll down to find SS3 and promote it first, then work your way up</li>
            <li className="leading-relaxed">Select destination class from the dropdown (defaults to next in hierarchy)</li>
            <li className="leading-relaxed">Section matching is preserved when possible (JSS1 A → JSS2 A)</li>
            <li className="leading-relaxed">The highest class (e.g., SS3) becomes "graduating students"</li>
            <li className="leading-relaxed">Graduated students can access transcripts</li>
          </ul>
        </AlertDescription>
      </Alert>

      {/* Database Setup Alert - Only show if graduations may be needed */}
      <Alert className="border-purple-200 bg-purple-50 mx-2 md:mx-0">
        <Database className="h-4 w-4 text-purple-600 flex-shrink-0 mt-0.5" />
        <AlertDescription className="text-purple-900 text-xs md:text-sm">
          <div className="space-y-2">
            <div>
              <strong className="block mb-1">Database Setup Required for Graduations:</strong>
              <p className="text-xs md:text-sm leading-relaxed">
                Before promoting students to graduation, ensure the <code className="bg-purple-100 px-1 py-0.5 rounded text-xs">graduated_students</code> table exists in your database.
              </p>
            </div>
            <Button
              onClick={handleSetupDatabase}
              disabled={setupLoading}
              variant="outline"
              className="h-8 text-xs border-purple-300 text-purple-700 hover:bg-purple-100 disabled:opacity-50"
              size="sm"
            >
              {setupLoading ? (
                <>
                  <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-purple-600 mr-1.5"></div>
                  Checking...
                </>
              ) : (
                <>
                  <Database className="h-3 w-3 mr-1" />
                  Verify Database Setup
                </>
              )}
            </Button>
          </div>
        </AlertDescription>
      </Alert>

      {/* Promotion Order Warning */}
      {classes.length > 0 && (
        <Alert className="border-red-300 bg-red-50 mx-2 md:mx-0">
          <AlertTriangle className="h-4 w-4 md:h-5 md:w-5 text-red-600 flex-shrink-0 mt-0.5" />
          <AlertDescription className="text-red-900">
            <div className="flex flex-col gap-2 md:gap-3">
              <div className="flex items-center gap-2">
                <strong className="text-sm md:text-lg">⚠️ PROMOTION ORDER MATTERS!</strong>
              </div>
              <div className="text-xs md:text-sm space-y-1 md:space-y-1.5 leading-relaxed">
                <div className="font-medium"><strong>Start from the BOTTOM of this list (highest class first):</strong></div>
                <div>1️⃣ Find and promote <strong>SS3</strong> first (scroll down if needed)</div>
                <div>2️⃣ Then promote <strong>SS2</strong></div>
                <div>3️⃣ Then promote <strong>SS1</strong></div>
                <div>4️⃣ Continue: <strong>JSS3 → JSS2 → JSS1</strong></div>
                <div className="pt-1 md:pt-2 border-t border-red-200 mt-1 md:mt-2">
                  <span className="text-red-700 font-medium text-xs md:text-sm">
                    ❌ DO NOT promote JSS1 first - this will cause students to be promoted twice!
                  </span>
                </div>
              </div>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Promotion List */}
      <div className="space-y-2 md:space-y-3 px-2 md:px-0">
        {classes.map((cls, index) => {
          const preview = promotionPreviews[cls.id];
          // Note: cls.name already includes the section
          const displayName = cls.name;

          const nextDisplayName = cls.next_class
            ? cls.next_class.name
            : null;

          return (
            <Card key={cls.id} className={cls.is_graduating ? 'border-purple-200 bg-purple-50/50' : ''}>
              <CardContent className="p-3 md:p-5">
                {/* Mobile Layout (< md) */}
                <div className="md:hidden space-y-2.5">
                  {/* From Class */}
                  <div>
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className="font-medium text-sm">{displayName}</span>
                      <Badge variant="outline" className="text-xs py-0.5">
                        <Users className="h-3 w-3 mr-1" />
                        {cls.student_count} students
                      </Badge>
                    </div>
                    <div className="text-xs text-slate-600 leading-relaxed">
                      Level: {cls.level} • Hierarchy: #{cls.hierarchy_order}
                    </div>
                  </div>

                  {/* Arrow */}
                  <div className="flex items-center justify-center">
                    {cls.is_graduating ? (
                      <GraduationCap className="h-5 w-5 text-purple-600" />
                    ) : (
                      <ArrowRight className="h-5 w-5 text-slate-400" />
                    )}
                  </div>

                  {/* To Class */}
                  <div>
                    {cls.is_graduating ? (
                      <div>
                        <div className="font-medium text-purple-600 mb-1 text-sm">
                          Graduating Students
                        </div>
                        <div className="text-xs text-purple-700 mb-1 leading-relaxed">
                          Session: {currentSession}
                        </div>
                        <div className="flex items-center gap-1 text-xs text-purple-600">
                          <FileText className="h-3 w-3 flex-shrink-0" />
                          <span className="leading-relaxed">Transcript access enabled</span>
                        </div>
                      </div>
                    ) : (
                      <div>
                        <div className="text-xs text-slate-600 mb-2">Promote to:</div>
                        <Select
                          value={selectedNextClasses[cls.id] || ''}
                          onValueChange={(value) => handleNextClassChange(cls.id, value)}
                        >
                          <SelectTrigger className="w-full h-9 text-sm">
                            <SelectValue placeholder="Select next class" />
                          </SelectTrigger>
                          <SelectContent>
                            {/* Available classes = all classes after current (no backwards promotion) */}
                            {classes
                              .slice(index + 1) // Only classes after current
                              .map((nextClass) => {
                                // Note: nextClass.name already includes the section
                                const nextDisplayName = nextClass.name;
                                return (
                                  <SelectItem key={nextClass.id} value={nextClass.id} className="text-sm">
                                    {nextDisplayName}
                                  </SelectItem>
                                );
                              })}
                          </SelectContent>
                        </Select>
                        {preview?.warnings && preview.warnings.length > 0 && (
                          <div className="flex items-start gap-1 mt-1.5 text-xs text-amber-600">
                            <AlertTriangle className="h-3 w-3 flex-shrink-0 mt-0.5" />
                            <span className="break-words leading-relaxed">{preview.warnings[0]}</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Promote Button */}
                  <Button
                    onClick={() => handlePromote(cls.id)}
                    disabled={promoting !== null || cls.student_count === 0}
                    className={`w-full h-9 text-sm ${cls.is_graduating ? 'bg-purple-600 hover:bg-purple-700' : ''}`}
                  >
                    {promoting === cls.id ? (
                      <>
                        <div className="animate-spin rounded-full h-3.5 w-3.5 border-b-2 border-white mr-2"></div>
                        <span className="text-xs">Promoting...</span>
                      </>
                    ) : cls.is_graduating ? (
                      <>
                        <GraduationCap className="h-3.5 w-3.5 mr-1.5" />
                        <span className="text-xs">Graduate</span>
                      </>
                    ) : (
                      <>
                        <TrendingUp className="h-3.5 w-3.5 mr-1.5" />
                        <span className="text-xs">Promote</span>
                      </>
                    )}
                  </Button>

                  {/* Section Matching Indicator */}
                  {preview && !preview.is_graduation && (
                    <div className="pt-2.5 border-t">
                      <div className="flex items-center gap-1.5 text-xs">
                        {preview.section_matched ? (
                          <>
                            <CheckCircle className="h-3 w-3 text-green-600 flex-shrink-0" />
                            <span className="text-green-700 leading-relaxed">Section matching preserved</span>
                          </>
                        ) : preview.warnings.length > 0 ? (
                          <>
                            <AlertTriangle className="h-3 w-3 text-amber-600 flex-shrink-0" />
                            <span className="text-amber-700 leading-relaxed">Section changes detected</span>
                          </>
                        ) : (
                          <>
                            <Info className="h-3 w-3 text-blue-600 flex-shrink-0" />
                            <span className="text-blue-700 leading-relaxed">No sections configured</span>
                          </>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Desktop Layout (>= md) */}
                <div className="hidden md:flex items-center gap-4">
                  {/* From Class */}
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-lg">{displayName}</span>
                      <Badge variant="outline" className="text-xs">
                        <Users className="h-3 w-3 mr-1" />
                        {cls.student_count} students
                      </Badge>
                    </div>
                    <div className="text-sm text-slate-600">
                      Level: {cls.level} • Hierarchy: #{cls.hierarchy_order}
                    </div>
                  </div>

                  {/* Arrow */}
                  <div className="flex items-center gap-2">
                    {cls.is_graduating ? (
                      <GraduationCap className="h-6 w-6 text-purple-600" />
                    ) : (
                      <ArrowRight className="h-6 w-6 text-slate-400" />
                    )}
                  </div>

                  {/* To Class */}
                  <div className="flex-1">
                    {cls.is_graduating ? (
                      <div>
                        <div className="font-medium text-lg text-purple-600">
                          Graduating Students
                        </div>
                        <div className="text-sm text-purple-700">
                          Session: {currentSession}
                        </div>
                        <div className="flex items-center gap-1 mt-1 text-sm text-purple-600">
                          <FileText className="h-3 w-3" />
                          <span>Transcript access enabled</span>
                        </div>
                      </div>
                    ) : (
                      <div>
                        <div className="text-sm text-slate-600 mb-2">Promote to:</div>
                        <Select
                          value={selectedNextClasses[cls.id] || ''}
                          onValueChange={(value) => handleNextClassChange(cls.id, value)}
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Select next class" />
                          </SelectTrigger>
                          <SelectContent>
                            {/* Available classes = all classes after current (no backwards promotion) */}
                            {classes
                              .slice(index + 1) // Only classes after current
                              .map((nextClass) => {
                                // Note: nextClass.name already includes the section
                                const nextDisplayName = nextClass.name;
                                return (
                                  <SelectItem key={nextClass.id} value={nextClass.id}>
                                    {nextDisplayName}
                                  </SelectItem>
                                );
                              })}
                          </SelectContent>
                        </Select>
                        {preview?.warnings && preview.warnings.length > 0 && (
                          <div className="flex items-center gap-1 mt-1 text-sm text-amber-600">
                            <AlertTriangle className="h-3 w-3" />
                            <span>{preview.warnings[0]}</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Promote Button */}
                  <Button
                    onClick={() => handlePromote(cls.id)}
                    disabled={promoting !== null || cls.student_count === 0}
                    className={cls.is_graduating ? 'bg-purple-600 hover:bg-purple-700' : ''}
                    size="lg"
                  >
                    {promoting === cls.id ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Promoting...
                      </>
                    ) : cls.is_graduating ? (
                      <>
                        <GraduationCap className="h-4 w-4 mr-2" />
                        Graduate
                      </>
                    ) : (
                      <>
                        <TrendingUp className="h-4 w-4 mr-2" />
                        Promote
                      </>
                    )}
                  </Button>
                </div>

                {/* Section Matching Indicator - Desktop Only */}
                <div className="hidden md:block">
                  {preview && !preview.is_graduation && (
                    <div className="mt-3 pt-3 border-t">
                      <div className="flex items-center gap-2 text-sm">
                        {preview.section_matched ? (
                          <>
                            <CheckCircle className="h-4 w-4 text-green-600" />
                            <span className="text-green-700">Section matching preserved</span>
                          </>
                        ) : preview.warnings.length > 0 ? (
                          <>
                            <AlertTriangle className="h-4 w-4 text-amber-600" />
                            <span className="text-amber-700">Section changes detected</span>
                          </>
                        ) : (
                          <>
                            <Info className="h-4 w-4 text-blue-600" />
                            <span className="text-blue-700">No sections configured</span>
                          </>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {classes.length === 0 && (
        <Card className="mx-2 md:mx-0">
          <CardContent className="p-6 md:p-8 text-center text-slate-500">
            <Info className="h-10 w-10 md:h-12 md:w-12 mx-auto mb-3 md:mb-4 text-slate-400" />
            <p className="font-medium mb-2 text-sm md:text-base">No Classes Found</p>
            <p className="text-xs md:text-sm">
              Please create classes and configure class hierarchy in Settings Management first.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Recent Promotions - Revert Section */}
      {recentPromotions.length > 0 && (
        <Card className="border-blue-200 bg-blue-50/30 mx-2 md:mx-0">
          <CardHeader className="p-4 md:p-6">
            <CardTitle className="flex items-center gap-2 text-blue-900 text-sm md:text-lg">
              <History className="h-4 w-4 md:h-5 md:w-5 flex-shrink-0" />
              <span>Recent Promotions</span>
            </CardTitle>
            <CardDescription className="text-blue-700 text-xs md:text-sm leading-relaxed">
              You can revert any promotion at any time • All revert buttons always clickable for testing • Click multiple times to test revert flow
            </CardDescription>
          </CardHeader>
          <CardContent className="p-4 md:p-6">
            <div className="space-y-2 md:space-y-3">
              {recentPromotions.map((promotion) => (
                <Card key={promotion.id} className={promotion.is_reverted ? 'opacity-50 bg-gray-100' : 'bg-white'}>
                  <CardContent className="p-3 md:p-4">
                    {/* Mobile Layout */}
                    <div className="md:hidden space-y-2.5">
                      <div>
                        <div className="flex items-center gap-1.5 mb-2 flex-wrap">
                          <span className="font-medium text-xs">
                            {promotion.from_class_name || 'Unknown Class'}
                          </span>
                          <ArrowRight className="h-3 w-3 text-slate-400 flex-shrink-0" />
                          <span className="font-medium text-green-600 text-xs">
                            {promotion.is_graduation 
                              ? 'Graduated' 
                              : (promotion.to_class_name || 'Unknown Class')}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <Badge variant="outline" className="text-xs py-0.5">
                            {promotion.student_count} students
                          </Badge>
                          {promotion.is_reverted && (
                            <Badge variant="secondary" className="text-xs py-0.5 bg-gray-200">
                              Reverted
                            </Badge>
                          )}
                        </div>
                      </div>
                      <div className="text-xs text-slate-600 space-y-0.5 leading-relaxed">
                        <div>
                          Session: {promotion.is_graduation 
                            ? promotion.current_session 
                            : `${promotion.current_session} → ${promotion.new_session}`}
                        </div>
                        <div>
                          {new Date(promotion.promoted_at).toLocaleDateString()} at{' '}
                          {new Date(promotion.promoted_at).toLocaleTimeString([], { 
                            hour: '2-digit', 
                            minute: '2-digit' 
                          })}
                        </div>
                        {promotion.promoted_by_name && (
                          <div>By: {promotion.promoted_by_name}</div>
                        )}
                      </div>
                      <Button
                        onClick={() => handleRevert(promotion.id)}
                        disabled={reverting !== null}
                        variant="outline"
                        className="w-full h-8 border-red-300 text-red-600 hover:bg-red-50 hover:text-red-700 disabled:opacity-50"
                        size="sm"
                      >
                        {reverting === promotion.id ? (
                          <>
                            <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-red-600 mr-1.5"></div>
                            <span className="text-xs">Reverting...</span>
                          </>
                        ) : (
                          <>
                            <Undo2 className="h-3 w-3 mr-1" />
                            <span className="text-xs">{promotion.is_reverted ? 'Revert Again' : 'Revert'}</span>
                          </>
                        )}
                      </Button>
                    </div>

                    {/* Desktop Layout */}
                    <div className="hidden md:flex items-center justify-between gap-4">
                      {/* Promotion Details */}
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2 flex-wrap">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">
                              {promotion.from_class_name || 'Unknown Class'}
                            </span>
                            <ArrowRight className="h-4 w-4 text-slate-400" />
                            <span className="font-medium text-green-600">
                              {promotion.is_graduation 
                                ? 'Graduated' 
                                : (promotion.to_class_name || 'Unknown Class')}
                            </span>
                          </div>
                          <Badge variant="outline" className="text-xs">
                            {promotion.student_count} students
                          </Badge>
                          {promotion.is_reverted && (
                            <Badge variant="secondary" className="text-xs bg-gray-200">
                              Reverted
                            </Badge>
                          )}
                        </div>
                        <div className="text-sm text-slate-600">
                          <span>
                            Session: {promotion.is_graduation 
                              ? promotion.current_session 
                              : `${promotion.current_session} → ${promotion.new_session}`}
                          </span>
                          <span className="mx-2">•</span>
                          <span>
                            {new Date(promotion.promoted_at).toLocaleDateString()} at{' '}
                            {new Date(promotion.promoted_at).toLocaleTimeString([], { 
                              hour: '2-digit', 
                              minute: '2-digit' 
                            })}
                          </span>
                          {promotion.promoted_by_name && (
                            <>
                              <span className="mx-2">•</span>
                              <span>By: {promotion.promoted_by_name}</span>
                            </>
                          )}
                        </div>
                      </div>

                      {/* Revert Button - Always clickable for testing */}
                      <Button
                        onClick={() => handleRevert(promotion.id)}
                        disabled={reverting !== null}
                        variant="outline"
                        className="border-red-300 text-red-600 hover:bg-red-50 hover:text-red-700 disabled:opacity-50"
                        size="sm"
                      >
                        {reverting === promotion.id ? (
                          <>
                            <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-red-600 mr-2"></div>
                            Reverting...
                          </>
                        ) : (
                          <>
                            <Undo2 className="h-3 w-3 mr-1" />
                            {promotion.is_reverted ? 'Revert Again' : 'Revert'}
                          </>
                        )}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}