import React, { useState, useEffect } from 'react';
import { DndContext, DragEndEvent, DragStartEvent, closestCenter, PointerSensor, useSensor, useSensors, DragOverlay } from '@dnd-kit/core';
import { Plus, Trash2, Save, X, Link2, GripVertical, AlertTriangle, CheckCircle, Edit } from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Alert, AlertDescription } from '../ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { toast } from 'sonner@2.0.3';
import { createClient } from '../../utils/supabase/client';

interface SubjectConfig {
  subjectId: string;
  subjectName: string;
  classIds: string[];
  isPairedSubject?: boolean;
  isDepartmental?: boolean;
}

interface Subject {
  id: string;
  name: string;
  code: string;
  level: 'jss' | 'sss' | 'both' | 'junior' | 'senior';
}

interface PairGroup {
  id: string;
  name: string;
  level: 'junior' | 'senior';
  subjectIds: string[];
}

export default function SubjectPairsManager() {
  const [configs, setConfigs] = useState<SubjectConfig[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [pairGroups, setPairGroups] = useState<PairGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectedLevel, setSelectedLevel] = useState<'junior' | 'senior'>('junior');
  const [availableSubjects, setAvailableSubjects] = useState<Subject[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [editingGroupId, setEditingGroupId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');

  const supabase = createClient();

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    updateAvailableSubjects();
  }, [subjects, configs, pairGroups, selectedLevel]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error('Please log in to access settings');
        return;
      }

      // Fetch subjects from database
      const { data: subjectsData, error: subjectsError } = await supabase
        .from('subjects')
        .select('*')
        .order('name');

      if (subjectsError) {
        console.error('Error fetching subjects:', subjectsError);
        toast.error('Failed to load subjects');
      } else {
        setSubjects(subjectsData || []);
      }

      // Load configs from database
      const { data: dbConfigsData, error: configsError } = await supabase
        .from('subject_configs')
        .select('*')
        .order('subject_name');

      if (configsError) {
        console.error('Error loading configs from database:', configsError);
        toast.error('Failed to load subject configurations');
        setConfigs([]);
      } else {
        const validConfigs: SubjectConfig[] = (dbConfigsData || []).map((dbConfig: any) => ({
          subjectId: dbConfig.subject_id,
          subjectName: dbConfig.subject_name,
          classIds: dbConfig.class_ids || [],
          isPairedSubject: dbConfig.is_paired_subject,
          isDepartmental: dbConfig.is_departmental
        }));

        console.log('=== SUBJECT PAIRS MANAGER ===');
        console.log('Paired subjects:', validConfigs.filter(c => c.isPairedSubject).map(c => c.subjectName).join(', '));
        console.log('Departmental subjects:', validConfigs.filter(c => c.isDepartmental).map(c => c.subjectName).join(', '));
        
        setConfigs(validConfigs);
      }

      // Load pair groups from database (not localStorage)
      const { data: pairingsData, error: pairingsError } = await supabase
        .from('subject_pairings')
        .select('*')
        .order('pair_group_name');

      if (pairingsError) {
        console.error('Error loading pairings from database:', pairingsError);
        toast.error('Failed to load subject pairs');
      } else {
        // Transform database rows into PairGroup format
        const groupsMap = new Map<string, PairGroup>();
        
        (pairingsData || []).forEach((row: any) => {
          if (!row.pair_group_id) return;
          
          if (groupsMap.has(row.pair_group_id)) {
            // Add subject to existing group
            const group = groupsMap.get(row.pair_group_id)!;
            if (!group.subjectIds.includes(row.subject_id)) {
              group.subjectIds.push(row.subject_id);
            }
          } else {
            // Create new group
            groupsMap.set(row.pair_group_id, {
              id: row.pair_group_id,
              name: row.pair_group_name || 'Unnamed Pair',
              level: row.level || 'junior',
              subjectIds: [row.subject_id]
            });
          }
        });
        
        const groups = Array.from(groupsMap.values());
        console.log('✅ Loaded pair groups from database:', groups.length);
        setPairGroups(groups);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const updateAvailableSubjects = () => {
    if (!configs || !subjects || !pairGroups) {
      setAvailableSubjects([]);
      return;
    }

    // Get subjects marked for pairing from database
    const relevantConfigs = configs.filter(c => 
      c && c.subjectId && (selectedLevel === 'junior' ? c.isPairedSubject === true : c.isDepartmental === true)
    );
    
    const relevantSubjectIds = relevantConfigs.map(c => c.subjectId).filter(id => id);
    
    // Filter subjects - ignore level field, use database flag as source of truth
    const filtered = subjects.filter(s => {
      if (!s || !s.id) return false;
      
      const isRelevant = relevantSubjectIds.includes(s.id);
      const isAssigned = pairGroups
        .filter(g => g && g.level === selectedLevel)
        .some(g => g.subjectIds && g.subjectIds.includes(s.id));
      
      return isRelevant && !isAssigned;
    });

    console.log('✅ Available subjects:', filtered.map(s => s.name).join(', '));
    setAvailableSubjects(filtered);
  };

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);
    
    if (!over) return;
    
    const draggedSubjectId = active.id as string;
    const targetId = over.id as string;

    console.log('Drag ended:', { draggedSubjectId, targetId });

    // Case 1: Dragging onto another unpaired subject (create new pair)
    if (availableSubjects.find(s => s.id === targetId)) {
      const subject1 = subjects.find(s => s.id === draggedSubjectId);
      const subject2 = subjects.find(s => s.id === targetId);
      
      if (subject1 && subject2) {
        const newPair: PairGroup = {
          id: `pair_${Date.now()}`,
          name: `${subject1.name} / ${subject2.name}`,
          level: selectedLevel,
          subjectIds: [draggedSubjectId, targetId]
        };
        
        setPairGroups([...pairGroups, newPair]);
        toast.success(`Created pair: ${newPair.name}`);
      }
      return;
    }

    // Case 2: Dragging onto an existing pair (add to pair)
    if (targetId.startsWith('pair_')) {
      const targetPair = pairGroups.find(g => g.id === targetId);
      if (targetPair && !targetPair.subjectIds.includes(draggedSubjectId)) {
        const draggedSubject = subjects.find(s => s.id === draggedSubjectId);
        setPairGroups(pairGroups.map(g => {
          if (g.id === targetId) {
            return { 
              ...g, 
              subjectIds: [...g.subjectIds, draggedSubjectId],
              name: `${g.name} / ${draggedSubject?.name}`
            };
          }
          return g;
        }));
        toast.success(`Added ${draggedSubject?.name} to pair`);
      }
    }
  };

  const removeSubjectFromPair = (groupId: string, subjectId: string) => {
    setPairGroups(pairGroups.map(g => {
      if (g.id === groupId) {
        const newSubjectIds = g.subjectIds.filter(id => id !== subjectId);
        
        // If only one subject left, delete the pair
        if (newSubjectIds.length < 2) {
          toast.info('Pair disbanded (less than 2 subjects)');
          return null as any;
        }
        
        // Update pair name
        const subjectNames = newSubjectIds
          .map(id => subjects.find(s => s.id === id)?.name)
          .filter(Boolean)
          .join(' / ');
        
        return { ...g, subjectIds: newSubjectIds, name: subjectNames };
      }
      return g;
    }).filter(Boolean));
  };

  const deletePairGroup = (groupId: string) => {
    if (!confirm('Delete this pair? All subjects will become available again.')) return;
    setPairGroups(pairGroups.filter(g => g.id !== groupId));
    toast.success('Pair deleted');
  };

  const startEditName = (groupId: string, currentName: string) => {
    setEditingGroupId(groupId);
    setEditingName(currentName);
  };

  const saveEditedName = (groupId: string) => {
    if (!editingName.trim()) {
      toast.error('Pair name cannot be empty');
      return;
    }
    
    setPairGroups(pairGroups.map(g => 
      g.id === groupId ? { ...g, name: editingName.trim() } : g
    ));
    
    setEditingGroupId(null);
    setEditingName('');
    toast.success('Pair name updated');
  };

  const saveAllPairs = async () => {
    setSaving(true);
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error('Please log in to save pairs');
        setSaving(false);
        return;
      }

      console.log('=== SAVING PAIRS TO DATABASE ===');
      console.log('Current level:', selectedLevel);
      console.log('Groups to save:', currentLevelGroups.length);
      console.log('Groups data:', JSON.stringify(currentLevelGroups, null, 2));

      // Delete all existing pairings for current level
      console.log('Step 1: Deleting old pairings for level:', selectedLevel);
      const { error: deleteError } = await supabase
        .from('subject_pairings')
        .delete()
        .eq('level', selectedLevel);

      if (deleteError) {
        console.error('❌ Error deleting old pairings:', deleteError);
        toast.error(`Failed to clear old pairs: ${deleteError.message}`);
        setSaving(false);
        return;
      }
      console.log('✅ Old pairings deleted successfully');

      // Insert new pairings
      const pairingsToInsert: any[] = [];
      
      currentLevelGroups.forEach(group => {
        group.subjectIds.forEach(subjectId => {
          pairingsToInsert.push({
            pair_group_id: group.id,
            pair_group_name: group.name,
            subject_id: subjectId,
            level: group.level,
            pairing_type: selectedLevel === 'junior' ? 'paired' : 'departmental',
            paired_subject_id: null  // Explicitly set to null (we don't use this field anymore)
          });
        });
      });

      console.log('Step 2: Inserting new pairings');
      console.log('Records to insert:', pairingsToInsert.length);
      console.log('Insert data:', JSON.stringify(pairingsToInsert, null, 2));

      if (pairingsToInsert.length > 0) {
        const { data: insertData, error: insertError } = await supabase
          .from('subject_pairings')
          .insert(pairingsToInsert)
          .select();

        if (insertError) {
          console.error('❌ Error inserting pairings:', insertError);
          console.error('Error details:', {
            code: insertError.code,
            message: insertError.message,
            details: insertError.details,
            hint: insertError.hint
          });
          toast.error(`Failed to save pairs: ${insertError.message}`);
          setSaving(false);
          return;
        }
        
        console.log('✅ Insert successful! Inserted records:', insertData);
      } else {
        console.log('⚠️ No pairings to insert (currentLevelGroups is empty)');
      }

      toast.success(`✅ Saved ${currentLevelGroups.length} pair group(s) to database!`);
      console.log(`✅ Saved ${pairingsToInsert.length} pairing records for ${currentLevelGroups.length} groups`);
      
      // Verify by fetching
      const { data: verifyData, error: verifyError } = await supabase
        .from('subject_pairings')
        .select('*')
        .eq('level', selectedLevel);
      
      if (!verifyError) {
        console.log('✅ Verification: Found', verifyData?.length, 'records in database');
        console.log('Verification data:', verifyData);
      }
    } catch (error) {
      console.error('❌ Unexpected error saving pairs:', error);
      toast.error('Failed to save pairs');
    } finally {
      setSaving(false);
    }
  };

  const getSubjectById = (id: string): Subject | null => {
    return subjects.find(s => s.id === id) || null;
  };

  const currentLevelGroups = pairGroups.filter(g => g.level === selectedLevel);
  const currentLevelLabel = selectedLevel === 'junior' ? 'Junior Secondary (JSS)' : 'Senior Secondary (SSS)';
  const pairTypeLabel = selectedLevel === 'junior' ? 'Paired Subjects' : 'Departmental/Major Subjects';

  if (loading) {
    return (
      <div className="p-8 text-center">
        <p className="text-slate-600">Loading subject pairs configuration...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Link2 className="h-6 w-6" />
            Subject Pairs Management
          </h2>
          <p className="text-sm text-slate-600 mt-1">
            Drag and drop subjects together to create pairs
          </p>
        </div>
        <Button onClick={saveAllPairs} disabled={saving || currentLevelGroups.length === 0}>
          <Save className="h-4 w-4 mr-2" />
          {saving ? 'Saving...' : 'Save All Pairs'}
        </Button>
      </div>

      {/* Level Tabs */}
      <Tabs value={selectedLevel} onValueChange={(v) => setSelectedLevel(v as 'junior' | 'senior')}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="junior">Junior Secondary (JSS)</TabsTrigger>
          <TabsTrigger value="senior">Senior Secondary (SSS)</TabsTrigger>
        </TabsList>

        <TabsContent value={selectedLevel} className="space-y-6 mt-6">
          {/* Instructions */}
          <Alert className="border-blue-200 bg-blue-50">
            <AlertTriangle className="h-4 w-4 text-blue-600" />
            <AlertDescription className="text-blue-900">
              <p className="font-medium mb-2">✨ How to Create Pairs:</p>
              <ol className="text-sm space-y-1 list-decimal list-inside ml-2">
                <li>Drag one subject card and drop it onto another subject to create a pair</li>
                <li>Drag additional subjects onto existing pairs to add them</li>
                <li>Click the ✕ button on a subject to remove it from a pair</li>
                <li>Click "Save All Pairs" when done</li>
              </ol>
            </AlertDescription>
          </Alert>

          {availableSubjects.length === 0 && currentLevelGroups.length === 0 && (
            <Alert className="border-yellow-200 bg-yellow-50">
              <AlertTriangle className="h-4 w-4 text-yellow-600" />
              <AlertDescription className="text-yellow-900">
                <p className="font-semibold mb-2">No subjects available for pairing</p>
                <p className="text-sm mb-2">To add subjects here:</p>
                <ol className="text-sm list-decimal list-inside space-y-1 ml-2">
                  <li>Go to the "Subjects Config" tab</li>
                  <li>Configure a subject and check "{selectedLevel === 'junior' ? 'This is a paired subject' : 'This is a departmental/major subject'}"</li>
                  <li>Return here - the subject will appear</li>
                </ol>
              </AlertDescription>
            </Alert>
          )}

          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
          >
            {/* Available Subjects - Draggable */}
            {availableSubjects.length > 0 && (
              <Card>
                <CardHeader className="bg-gradient-to-r from-blue-50 to-purple-50">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <GripVertical className="h-5 w-5 text-slate-400" />
                    Available {pairTypeLabel}
                    <Badge variant="secondary" className="ml-2">{availableSubjects.length}</Badge>
                  </CardTitle>
                  <p className="text-sm text-slate-600">
                    Drag one subject onto another to create a pair, or drag onto an existing pair below
                  </p>
                </CardHeader>
                <CardContent className="p-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {availableSubjects.map(subject => (
                      <div
                        key={subject.id}
                        className={`
                          flex items-center gap-3 p-4 rounded-lg border-2 cursor-move transition-all
                          ${activeId === subject.id 
                            ? 'opacity-50 border-blue-400 bg-blue-50' 
                            : 'border-slate-200 bg-white hover:border-blue-400 hover:bg-blue-50 hover:shadow-md'
                          }
                        `}
                        draggable
                        onDragStart={(e) => {
                          e.dataTransfer.effectAllowed = 'move';
                          e.dataTransfer.setData('text/plain', subject.id);
                          setActiveId(subject.id);
                        }}
                        onDragEnd={() => setActiveId(null)}
                        onDragOver={(e) => {
                          e.preventDefault();
                          e.currentTarget.classList.add('ring-2', 'ring-blue-400');
                        }}
                        onDragLeave={(e) => {
                          e.currentTarget.classList.remove('ring-2', 'ring-blue-400');
                        }}
                        onDrop={(e) => {
                          e.preventDefault();
                          e.currentTarget.classList.remove('ring-2', 'ring-blue-400');
                          
                          const draggedId = e.dataTransfer.getData('text/plain');
                          if (draggedId && draggedId !== subject.id) {
                            handleDragEnd({
                              active: { id: draggedId, data: { current: null }, rect: { current: { initial: null, translated: null } } },
                              over: { id: subject.id, rect: null, disabled: false, data: { current: null } },
                              activatorEvent: e as any,
                              collisions: null,
                              delta: { x: 0, y: 0 }
                            });
                          }
                        }}
                      >
                        <GripVertical className="h-5 w-5 text-slate-400 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{subject.name}</p>
                          <p className="text-xs text-slate-600">{subject.code}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Paired Groups */}
            {currentLevelGroups.length > 0 && (
              <Card>
                <CardHeader className="bg-gradient-to-r from-green-50 to-emerald-50">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Link2 className="h-5 w-5 text-green-600" />
                    Created Pairs
                    <Badge variant="secondary" className="ml-2">{currentLevelGroups.length}</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4">
                  <div className="space-y-3">
                    {currentLevelGroups.map(group => (
                      <div
                        key={group.id}
                        className="border-2 border-green-200 rounded-lg p-4 bg-green-50/50 hover:border-green-300 transition-all"
                        onDragOver={(e) => {
                          e.preventDefault();
                          e.currentTarget.classList.add('ring-2', 'ring-green-400', 'bg-green-100');
                        }}
                        onDragLeave={(e) => {
                          e.currentTarget.classList.remove('ring-2', 'ring-green-400', 'bg-green-100');
                        }}
                        onDrop={(e) => {
                          e.preventDefault();
                          e.currentTarget.classList.remove('ring-2', 'ring-green-400', 'bg-green-100');
                          
                          const draggedId = e.dataTransfer.getData('text/plain');
                          if (draggedId) {
                            handleDragEnd({
                              active: { id: draggedId, data: { current: null }, rect: { current: { initial: null, translated: null } } },
                              over: { id: group.id, rect: null, disabled: false, data: { current: null } },
                              activatorEvent: e as any,
                              collisions: null,
                              delta: { x: 0, y: 0 }
                            });
                          }
                        }}
                      >
                        <div className="flex items-start justify-between mb-3">
                          {editingGroupId === group.id ? (
                            <div className="flex-1 flex gap-2">
                              <Input
                                value={editingName}
                                onChange={(e) => setEditingName(e.target.value)}
                                className="flex-1"
                                autoFocus
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') saveEditedName(group.id);
                                  if (e.key === 'Escape') setEditingGroupId(null);
                                }}
                              />
                              <Button size="sm" onClick={() => saveEditedName(group.id)}>
                                <Save className="h-4 w-4" />
                              </Button>
                              <Button size="sm" variant="outline" onClick={() => setEditingGroupId(null)}>
                                <X className="h-4 w-4" />
                              </Button>
                            </div>
                          ) : (
                            <>
                              <div className="flex-1">
                                <h4 className="font-semibold text-slate-900 flex items-center gap-2">
                                  {group.name}
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => startEditName(group.id, group.name)}
                                    className="h-6 w-6 p-0"
                                  >
                                    <Edit className="h-3 w-3" />
                                  </Button>
                                </h4>
                                <p className="text-xs text-slate-600 mt-1">
                                  {group.subjectIds.length} subject{group.subjectIds.length !== 1 ? 's' : ''} in this pair
                                </p>
                              </div>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => deletePairGroup(group.id)}
                                className="text-red-600 hover:bg-red-50"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </>
                          )}
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                          {group.subjectIds.map(subjectId => {
                            const subject = getSubjectById(subjectId);
                            if (!subject) return null;
                            
                            return (
                              <div
                                key={subjectId}
                                className="flex items-center justify-between gap-2 p-3 bg-white rounded border border-green-200"
                              >
                                <div className="flex-1 min-w-0">
                                  <p className="font-medium text-sm truncate">{subject.name}</p>
                                  <p className="text-xs text-slate-600">{subject.code}</p>
                                </div>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => removeSubjectFromPair(group.id, subjectId)}
                                  className="h-7 w-7 p-0 text-red-600 hover:bg-red-50 flex-shrink-0"
                                >
                                  <X className="h-4 w-4" />
                                </Button>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Drag Overlay */}
            <DragOverlay>
              {activeId ? (
                <div className="flex items-center gap-3 p-4 rounded-lg border-2 border-blue-400 bg-blue-50 shadow-lg opacity-90">
                  <GripVertical className="h-5 w-5 text-blue-600" />
                  <div>
                    <p className="font-medium">{getSubjectById(activeId)?.name}</p>
                    <p className="text-xs text-slate-600">{getSubjectById(activeId)?.code}</p>
                  </div>
                </div>
              ) : null}
            </DragOverlay>
          </DndContext>
        </TabsContent>
      </Tabs>
    </div>
  );
}