// 🔥 BATCH UPLOAD v2.0 - Fixed: status='published' + onSuccess callback
import { useState, useEffect } from 'react';
import { X, Plus, Trash2, AlertCircle, Upload, Image as ImageIcon, Wand2, FileText } from 'lucide-react';
import { projectId, publicAnonKey } from '../../utils/supabase/info';
import { createClient } from '../../utils/supabase/client';
import { createWorker } from 'tesseract.js';
import mammoth from 'mammoth';

interface CreateQuestionModalProps {
  question?: any; // Optional question prop for editing
  onClose: () => void;
  onSuccess: () => void;
}

interface Option {
  label: string;
  text: string;
  isCorrect: boolean;
}

export function CreateQuestionModal({ question, onClose, onSuccess }: CreateQuestionModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [assignedSubjects, setAssignedSubjects] = useState<any[]>([]);
  const [allSubjects, setAllSubjects] = useState<any[]>([]); // Store all subjects
  const [classes, setClasses] = useState<any[]>([]);
  const [allClasses, setAllClasses] = useState<any[]>([]); // Store all classes
  const [assignments, setAssignments] = useState<Array<{subject_id: string, class_id: string}>>([]); // Subject-class pairs
  const [questionsSaved, setQuestionsSaved] = useState(0);
  const [successMessage, setSuccessMessage] = useState('');

  const supabase = createClient();

  // Editing mode flag
  const isEditMode = !!question;

  // 🔥 Helper function to extract base class name
  // Removes section suffix (e.g., "SS1 - Diamond" → "SS1", "jss2" → "JSS2")
  const extractBaseClassName = (fullClassName: string): string => {
    if (!fullClassName) return '';
    
    // Remove section suffix (everything after " - ")
    const baseName = fullClassName.split(' - ')[0].trim();
    
    // Normalize: Convert to uppercase and ensure proper format
    // JSS1, JSS2, JSS3, SS1, SS2, SS3
    const normalized = baseName.toUpperCase();
    
    return normalized;
  };

  // Form state
  const [subject, setSubject] = useState('');
  const [subjectId, setSubjectId] = useState(''); // Store subject ID
  const [classLevel, setClassLevel] = useState(''); // Store BASE class name (e.g., "SS3" not "SS3 Silver")
  const [classId, setClassId] = useState(''); // Store class ID
  const [classDisplayName, setClassDisplayName] = useState(''); // For showing in UI (e.g., "SS3 Silver")
  const [session, setSession] = useState('');
  const [availableSessions, setAvailableSessions] = useState<string[]>([]); // Store available sessions
  const [term, setTerm] = useState('');
  const [questionType, setQuestionType] = useState('mcq_single');
  const [questionText, setQuestionText] = useState('');
  const [questionImageUrl, setQuestionImageUrl] = useState('');
  const [uploadingImage, setUploadingImage] = useState(false);
  const [extractingText, setExtractingText] = useState(false);
  const [marks, setMarks] = useState('1');
  const [status, setStatus] = useState<'draft' | 'published'>('published'); // Default to published

  // MCQ Options
  const [options, setOptions] = useState<Option[]>([
    { label: 'A', text: '', isCorrect: false },
    { label: 'B', text: '', isCorrect: false },
    { label: 'C', text: '', isCorrect: false },
    { label: 'D', text: '', isCorrect: false },
  ]);

  // Fill in the blank answers
  const [fillBlankAnswers, setFillBlankAnswers] = useState<string[]>(['']);

  // True/False answer
  const [trueFalseAnswer, setTrueFalseAnswer] = useState('True');

  // Fetch user's assigned subjects and classes
  useEffect(() => {
    const fetchAssignedSubjectsAndClasses = async () => {
      try {
        // Get session
        const { data: { session } } = await supabase.auth.getSession()
        if (!session) return;

        const headers = {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        };

        // 🔥 Fetch active session and term from admin settings
        const sessionTermsRes = await fetch(
          `https://${projectId}.supabase.co/functions/v1/make-server-1ddd013a/uploads/sessions-terms`,
          { headers }
        );
        const sessionTermsData = await sessionTermsRes.json();
        
        console.log('[CBT Question Form] Sessions API Response:', sessionTermsData);
        
        if (sessionTermsData.success) {
          // 🔥 FIXED: The endpoint returns sessions as an array of strings, not objects
          const allSessions = sessionTermsData.sessions || [];
          setAvailableSessions(allSessions);
          console.log('[CBT Question Form] Available sessions:', allSessions);
          
          // Set the first session as default or the current year
          if (allSessions.length > 0) {
            setSession(allSessions[0]);
            console.log('[CBT Question Form] Default session:', allSessions[0]);
          } else {
            // Fallback to current year
            const currentYear = new Date().getFullYear();
            const nextYear = currentYear + 1;
            setSession(`${currentYear}/${nextYear}`);
          }
          
          // Set default term
          setTerm('First Term');
        } else {
          console.error('[CBT Question Form] Sessions API error:', sessionTermsData.error);
        }

        // 🔥 USE THE SAME ENDPOINT AS MARKS ENTRY FORM
        // Fetch teacher assignments (subjects and classes based on role)
        const assignmentsRes = await fetch(
          `https://${projectId}.supabase.co/functions/v1/make-server-1ddd013a/teacher-assignments`,
          { headers }
        );
        const assignmentsData = await assignmentsRes.json();
        
        if (assignmentsData.success) {
          console.log('[CBT Question Form] Fetched subjects:', assignmentsData.subjects);
          console.log('[CBT Question Form] Fetched classes:', assignmentsData.classes);
          console.log('[CBT Question Form] Fetched assignments:', assignmentsData.assignments);
          console.log('[CBT Question Form] 🔍 DEBUG - Full assignments data:', JSON.stringify(assignmentsData, null, 2));
          
          // Store all subjects and classes
          setAllSubjects(assignmentsData.subjects);
          setAllClasses(assignmentsData.classes);
          setAssignments(assignmentsData.assignments || []);
          
          // 🔥 For CBT: Group classes by base name (name column, not display_name)
          // This ensures "SS3" appears once instead of "SS3 Silver", "SS3 Gold", etc.
          const uniqueBaseClasses: any[] = [];
          const baseClassMap = new Map();
          
          assignmentsData.classes.forEach((cls: any) => {
            const baseName = extractBaseClassName(cls.name); // Use level field for base class (e.g., "SS3")
            if (!baseClassMap.has(baseName)) {
              baseClassMap.set(baseName, {
                id: cls.id, // Use first class ID found
                name: baseName, // Store base name (SS1, SS2, etc.)
                level: baseName,
                display_name: baseName, // Show just base name in dropdown
                originalClasses: [cls] // Keep track of all sections
              });
              uniqueBaseClasses.push(baseClassMap.get(baseName));
            } else {
              // Add this section to the existing base class
              baseClassMap.get(baseName).originalClasses.push(cls);
            }
          });
          
          console.log('[CBT Question Form] 🎯 Unique base classes:', uniqueBaseClasses);
          
          // Initially show all subjects and classes assigned to teacher
          setAssignedSubjects(assignmentsData.subjects);
          setClasses(uniqueBaseClasses); // Use deduplicated base classes
          
          // Auto-select first subject and class
          if (assignmentsData.subjects.length > 0) {
            const firstSubject = assignmentsData.subjects[0];
            setSubject(firstSubject.name);
            setSubjectId(firstSubject.id);
            
            // For CBT: Filter unique base classes for this subject
            const classesForSubject = assignmentsData.assignments
              .filter((a: any) => a.subject_id === firstSubject.id)
              .map((a: any) => a.class_id);
            
            const filteredFullClasses = assignmentsData.classes.filter((c: any) => 
              classesForSubject.includes(c.id)
            );
            
            // Deduplicate by base name
            const uniqueFiltered: any[] = [];
            const seenBaseNames = new Set();
            filteredFullClasses.forEach((cls: any) => {
              const baseName = extractBaseClassName(cls.name); // Use level field for base class
              if (!seenBaseNames.has(baseName)) {
                seenBaseNames.add(baseName);
                uniqueFiltered.push({
                  id: cls.id,
                  name: baseName, // Store base name (SS1, SS2, etc.)
                  level: baseName,
                  display_name: baseName // Show base name only
                });
              }
            });
            
            setClasses(uniqueFiltered);
            
            if (uniqueFiltered.length > 0) {
              const firstClass = uniqueFiltered[0];
              setClassLevel(firstClass.name); // Use base name
              setClassId(firstClass.id);
              setClassDisplayName(firstClass.name);
            }
          }
        } else {
          console.error('[CBT Question Form] Error fetching assignments:', assignmentsData.error);
        }
      } catch (err) {
        console.error('Error fetching assigned subjects and classes:', err);
      }
    };

    fetchAssignedSubjectsAndClasses();
  }, []);

  // Pre-fill form when editing an existing question
  useEffect(() => {
    if (question) {
      console.log('[CBT Edit] Loading question data:', question);
      setSubject(question.subject || '');
      setClassLevel(question.class || '');
      setSession(question.session || '');
      setTerm(question.term || '');
      setQuestionType(question.question_type || 'mcq_single');
      setQuestionText(question.question_text || '');
      setQuestionImageUrl(question.question_image_url || '');
      setMarks(String(question.marks || 1));
      setStatus(question.status || 'published');

      // Set options for MCQ
      if (question.options && Array.isArray(question.options)) {
        setOptions(question.options);
      }

      // Set correct answer based on question type
      if (question.question_type === 'true_false' && question.correct_answer) {
        const answer = Array.isArray(question.correct_answer) 
          ? question.correct_answer[0] 
          : question.correct_answer;
        setTrueFalseAnswer(answer);
      } else if (question.question_type === 'fill_blank' && question.correct_answer) {
        const answers = Array.isArray(question.correct_answer) 
          ? question.correct_answer 
          : [question.correct_answer];
        setFillBlankAnswers(answers);
      }

      console.log('[CBT Edit] ✅ Form pre-filled successfully');
    }
  }, [question]);

  // Add option
  const addOption = () => {
    const nextLabel = String.fromCharCode(65 + options.length); // A, B, C, D, E...
    setOptions([...options, { label: nextLabel, text: '', isCorrect: false }]);
  };

  // Remove option
  const removeOption = (index: number) => {
    if (options.length <= 2) {
      alert('You must have at least 2 options');
      return;
    }
    setOptions(options.filter((_, i) => i !== index));
  };

  // Update option
  const updateOption = (index: number, field: keyof Option, value: any) => {
    const newOptions = [...options];
    newOptions[index] = { ...newOptions[index], [field]: value };
    
    // For single choice, uncheck other options when one is checked
    if (questionType === 'mcq_single' && field === 'isCorrect' && value === true) {
      newOptions.forEach((opt, i) => {
        if (i !== index) opt.isCorrect = false;
      });
    }
    
    setOptions(newOptions);
  };

  // Add fill blank answer variant
  const addFillBlankAnswer = () => {
    setFillBlankAnswers([...fillBlankAnswers, '']);
  };

  // Remove fill blank answer
  const removeFillBlankAnswer = (index: number) => {
    if (fillBlankAnswers.length <= 1) return;
    setFillBlankAnswers(fillBlankAnswers.filter((_, i) => i !== index));
  };

  // Handle subject change - filter classes based on assignments
  const handleSubjectChange = (subjectName: string) => {
    const selectedSubject = allSubjects.find(s => s.name === subjectName);
    if (selectedSubject) {
      setSubject(subjectName);
      setSubjectId(selectedSubject.id);
      
      // Filter classes to only those where this subject is taught
      const classesForSubject = assignments
        .filter(a => a.subject_id === selectedSubject.id)
        .map(a => a.class_id);
      
      const filteredClasses = allClasses.filter(c => 
        classesForSubject.includes(c.id)
      );
      
      // 🔥 CBT FIX: Deduplicate by base class name using level field
      const uniqueFiltered: any[] = [];
      const seenBaseNames = new Set();
      filteredClasses.forEach((cls: any) => {
        const baseName = extractBaseClassName(cls.name); // Use level field for base class
        if (!seenBaseNames.has(baseName)) {
          seenBaseNames.add(baseName);
          uniqueFiltered.push({
            id: cls.id,
            name: baseName, // Store base name (SS1, SS2, etc.)
            level: baseName,
            display_name: baseName // Show base name only (e.g., "SS1" not "SS1 - Silver")
          });
        }
      });
      
      setClasses(uniqueFiltered);
      
      // Reset class if current selection is not available for this subject
      if (classLevel && !seenBaseNames.has(classLevel)) {
        setClassLevel('');
        setClassId('');
        setClassDisplayName('');
      }
    }
  };

  // Handle class change - filter subjects based on assignments
  const handleClassChange = (className: string) => {
    console.log('[CBT] handleClassChange called with:', className);
    console.log('[CBT] Available classes:', classes);
    
    // Find from the deduplicated classes array (not allClasses)
    const selectedClass = classes.find(c => c.name === className);
    console.log('[CBT] Selected class found:', selectedClass);
    
    if (selectedClass) {
      setClassLevel(className); // This is the base class name like "SS1"
      setClassId(selectedClass.id);
      setClassDisplayName(className); // Display the base class name
      
      console.log('[CBT] ✅ Class set to:', {
        classLevel: className,
        classId: selectedClass.id,
        displayName: className
      });
      
      // ✅ REMOVED: Don't filter subjects when class changes
      // Teachers should see ALL subjects they teach, not just subjects for that class
      // This allows flexibility in creating questions
      
      // Note: Validation will happen on submit to ensure the subject-class combination is valid
    } else {
      console.log('[CBT] ❌ Class not found in classes array');
    }
  };

  // Validate and submit
  const handleSubmit = async (e: React.FormEvent, continueAdding = false) => {
    e.preventDefault();
    setError('');
    setSuccessMessage('');

    // Validation
    if (!subject || !classLevel || !questionText) {
      setError('Please fill in all required fields');
      return;
    }

    // Validate correct answers based on question type
    let correctAnswer: any = null;
    let optionsData: any = null;

    switch (questionType) {
      case 'mcq_single':
      case 'mcq_multiple':
        if (!options.some(opt => opt.isCorrect)) {
          setError('Please mark at least one correct answer');
          return;
        }
        if (options.some(opt => opt.text.trim() === '')) {
          setError('Please fill in all option texts');
          return;
        }
        optionsData = options;
        correctAnswer = options.filter(opt => opt.isCorrect).map(opt => opt.label);
        break;

      case 'true_false':
        optionsData = [
          { label: 'True', isCorrect: trueFalseAnswer === 'True' },
          { label: 'False', isCorrect: trueFalseAnswer === 'False' },
        ];
        correctAnswer = [trueFalseAnswer];
        break;

      case 'fill_blank':
        if (fillBlankAnswers.every(ans => ans.trim() === '')) {
          setError('Please provide at least one correct answer');
          return;
        }
        correctAnswer = fillBlankAnswers.filter(ans => ans.trim() !== '');
        break;

      case 'essay':
        // Essay questions don't need predefined answers
        correctAnswer = null;
        break;

      case 'matching':
        setError('Matching questions are not yet implemented in this version');
        return;
    }

    try {
      setLoading(true);

      // Get session using Supabase (same as MarksModule)
      const { data: { session: authSession } } = await supabase.auth.getSession();
      if (!authSession) {
        setError('Not authenticated. Please log in again.');
        return;
      }

      const questionData = {
        subject,
        class: classLevel,
        session,
        term,
        question_type: questionType,
        question_text: questionText,
        question_image_url: questionImageUrl || null,
        options: optionsData,
        correct_answer: correctAnswer,
        marks: parseFloat(marks),
        status,
      };

      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-1ddd013a/cbt/questions${isEditMode ? `/${question.id}` : ''}`,
        {
          method: isEditMode ? 'PUT' : 'POST',
          headers: {
            'Authorization': `Bearer ${authSession.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(questionData),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Failed to ${isEditMode ? 'update' : 'create'} question`);
      }

      // Success!
      if (isEditMode) {
        setSuccessMessage('Question updated successfully!');
        // Close modal after a short delay
        setTimeout(() => onSuccess(), 500);
      } else {
        setQuestionsSaved(prev => prev + 1);
        setSuccessMessage(`Question ${questionsSaved + 1} created successfully!`);
        
        if (continueAdding) {
          // Reset form but keep subject and class
          resetFormKeepingContext();
          // Scroll to top
          setTimeout(() => {
            const modal = document.querySelector('.overflow-y-auto');
            if (modal) modal.scrollTop = 0;
          }, 100);
        } else {
          // Close modal and refresh
          onSuccess();
        }
      }
    } catch (err: any) {
      console.error('Error creating question:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Reset form but keep subject and class for quick question entry
  const resetFormKeepingContext = () => {
    setQuestionType('mcq_single');
    setQuestionText('');
    setQuestionImageUrl('');
    setUploadingImage(false);
    setExtractingText(false);
    setMarks('1');
    setStatus('published');
    setOptions([
      { label: 'A', text: '', isCorrect: false },
      { label: 'B', text: '', isCorrect: false },
      { label: 'C', text: '', isCorrect: false },
      { label: 'D', text: '', isCorrect: false },
    ]);
    setFillBlankAnswers(['']);
    setTrueFalseAnswer('True');
  };

  // Handle image upload to Supabase Storage
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setError('Please select an image file');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setError('Image size must be less than 5MB');
      return;
    }

    try {
      setUploadingImage(true);
      setError('');

      // Get authenticated session
      const { data: { session: authSession } } = await supabase.auth.getSession();
      if (!authSession) {
        setError('Please login to upload images');
        return;
      }

      // Create FormData for file upload
      const formData = new FormData();
      formData.append('file', file);

      // Upload via server endpoint (bypasses RLS issues)
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-1ddd013a/cbt/upload-question-image`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${authSession.access_token}`,
          },
          body: formData,
        }
      );

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Upload failed');
      }

      setQuestionImageUrl(data.url);
      console.log('[Image Upload] Success:', data.url);
      
      // 🤖 Auto-extract text from image using AI
      await extractTextFromImage(data.url, authSession.access_token);
    } catch (err: any) {
      console.error('[Image Upload] Error:', err);
      setError(`Image upload failed: ${err.message}`);
    } finally {
      setUploadingImage(false);
    }
  };

  // Remove uploaded image
  const removeImage = () => {
    setQuestionImageUrl('');
  };

  // 🔥 NEW: Parse and create multiple questions in batch
  const parseAndCreateMultipleQuestions = async (lines: string[], totalQuestions: number) => {
    try {
      console.log(`[Batch Parser] 📦 Parsing ${totalQuestions} questions...`);
      
      const allQuestions: any[] = [];
      let currentQuestionLines: string[] = [];
      let currentQuestionNumber = 0;
      
      for (const line of lines) {
        // Check if this is a new question number
        const questionNumMatch = line.match(/^(\d+)[\.\)]/);
        
        if (questionNumMatch) {
          const questionNum = parseInt(questionNumMatch[1]);
          
          // If we have accumulated lines for a previous question, parse it
          if (currentQuestionLines.length > 0 && questionNum !== currentQuestionNumber) {
            const parsedQuestion = parseSingleQuestion(currentQuestionLines);
            if (parsedQuestion) {
              allQuestions.push(parsedQuestion);
            }
            currentQuestionLines = [];
          }
          
          currentQuestionNumber = questionNum;
        }
        
        currentQuestionLines.push(line);
      }
      
      // Parse the last question
      if (currentQuestionLines.length > 0) {
        const parsedQuestion = parseSingleQuestion(currentQuestionLines);
        if (parsedQuestion) {
          allQuestions.push(parsedQuestion);
        }
      }
      
      console.log(`[Batch Parser] ✅ Successfully parsed ${allQuestions.length} questions`);
      console.log('[Batch Parser] Questions:', allQuestions);
      
      // Validate session/term/subject/class
      if (!subject || !classLevel || !session || !term) {
        setError('Please select Subject, Class, Session, and Term before uploading questions');
        setExtractingText(false);
        return;
      }
      
      // Confirm with user
      const confirmed = confirm(
        `Found ${allQuestions.length} questions!\n\n` +
        `Subject: ${subject}\n` +
        `Class: ${classLevel}\n` +
        `Session: ${session}\n` +
        `Term: ${term}\n\n` +
        `Create all ${allQuestions.length} questions?`
      );
      
      if (!confirmed) {
        setExtractingText(false);
        return;
      }
      
      // Get session
      const { data: { session: authSession } } = await supabase.auth.getSession();
      if (!authSession) {
        setError('Not authenticated. Please log in again.');
        setExtractingText(false);
        return;
      }
      
      // Create all questions in batch
      let successCount = 0;
      let failCount = 0;
      
      setSuccessMessage(`⏳ Creating questions: 0/${allQuestions.length}...`);
      
      for (let i = 0; i < allQuestions.length; i++) {
        const q = allQuestions[i];
        
        // Update progress
        setSuccessMessage(`⏳ Creating questions: ${i + 1}/${allQuestions.length}...`);
        
        try {
          const questionData = {
            subject,
            class: classLevel,
            session,
            term,
            question_type: 'mcq_single', // Default to single choice
            question_text: q.questionText,
            question_image_url: null,
            options: q.options,
            correct_answer: q.options.filter((o: any) => o.isCorrect).map((o: any) => o.label),
            marks: parseFloat(marks) || 1,
            status: 'published',
          };
          
          const response = await fetch(
            `https://${projectId}.supabase.co/functions/v1/make-server-1ddd013a/cbt/questions`,
            {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${authSession.access_token}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify(questionData),
            }
          );
          
          if (response.ok) {
            successCount++;
            console.log(`[Batch Parser] ✅ Created question ${i + 1}/${allQuestions.length}`);
          } else {
            failCount++;
            const errorData = await response.json().catch(() => ({}));
            console.error(`[Batch Parser] ❌ Failed to create question ${i + 1}:`, errorData);
          }
        } catch (err) {
          failCount++;
          console.error(`[Batch Parser] ❌ Error creating question ${i + 1}:`, err);
        }
        
        // Small delay to avoid overwhelming the server
        if (i < allQuestions.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }
      
      setSuccessMessage(
        `🎉 Batch Upload Complete!\n✅ Created: ${successCount} questions\n${failCount > 0 ? `❌ Failed: ${failCount} questions` : ''}`
      );
      setExtractingText(false);
      
      // Refresh question list
      if (successCount > 0) {
        onSuccess(); // Trigger parent component to refresh question list
      }
      
      // Close modal after delay
      setTimeout(() => {
        onClose();
      }, 2000);
      
    } catch (err) {
      console.error('[Batch Parser] ❌ Error:', err);
      setError(`Batch parsing error: ${err instanceof Error ? err.message : 'Unknown error'}`);
      setExtractingText(false);
    }
  };
  
  // Helper: Parse a single question from its lines
  const parseSingleQuestion = (lines: string[]) => {
    let questionText = '';
    const options: { label: string; text: string; isCorrect: boolean }[] = [];
    let inOptionsSection = false;
    
    for (const line of lines) {
      // Check if line is an option
      const optionMatch = line.match(/^([A-H])[.\)\s]+(.+?)(\*)?$/i);
      
      if (optionMatch) {
        inOptionsSection = true;
        const label = optionMatch[1].toUpperCase();
        let text = optionMatch[2].trim();
        
        // Check for asterisk (both in text and as separate group)
        const isCorrect = text.includes('*') || optionMatch[3] === '*';
        text = text.replace(/\s*\*\s*/g, '').trim(); // Remove asterisks from text
        
        options.push({ label, text, isCorrect });
        continue;
      }
      
      // If not an option, add to question text
      if (!inOptionsSection) {
        const cleanLine = line.replace(/^(Q|Question)?\.?\s*\d+[.\)]?\s*/i, '').trim();
        if (cleanLine.length > 0) {
          questionText += (questionText ? ' ' : '') + cleanLine;
        }
      }
    }
    
    // Validate
    if (!questionText || options.length < 2) {
      console.warn('[Parser] Invalid question - skipping:', { questionText, optionsCount: options.length });
      return null;
    }
    
    return { questionText, options };
  };

  // 📄 IMPROVED Function to extract text from Word document (.docx)
  const extractTextFromWord = async (file: File) => {
    setExtractingText(true);
    try {
      console.log('[Word Parser] Starting text extraction from:', file.name);
      
      // Read file as ArrayBuffer
      const arrayBuffer = await file.arrayBuffer();
      
      // Extract text using mammoth
      const result = await mammoth.extractRawText({ arrayBuffer });
      let text = result.value;
      
      console.log('[Word Parser] ========== EXTRACTED TEXT ==========');
      console.log(text);
      console.log('[Word Parser] ====================================');
      
      // 🔥 ULTRA FIX: Split concatenated options intelligently
      // mammoth.extractRawText() removes line breaks, so "A. text\nB. text" becomes "A. textB. text"
      
      // CRITICAL: Handle ALL patterns like "name A. ?B. ,C. .D. !"
      // We need to split BEFORE the option label (A, B, C, D), not after
      
      // Step 1: Add newline before EVERY option label (A-H followed by period)
      // Match any non-whitespace character before the label, then insert newline BEFORE the label
      // This keeps the previous character intact (doesn't split "table" into "tabl e")
      text = text.replace(/(\S)([A-H]\.)/g, '$1\n$2');
      
      // Step 2: Clean up - if there's already whitespace, replace with newline
      text = text.replace(/\s+([A-H]\.)/g, '\n$1');
      
      // Step 3: Handle asterisk marking correct answer
      text = text.replace(/\*\s*([A-H])\./g, '*\n$1.');
      
      // Step 4: Clean up answer markers
      text = text.replace(/Answer:\s*/gi, '\n');
      
      // Step 5: Remove multiple consecutive newlines
      text = text.replace(/\n\n+/g, '\n');
      
      console.log('[Word Parser] ========== PROCESSED TEXT ==========');
      console.log(text);
      console.log('[Word Parser] ====================================');
      
      // Parse into lines
      const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);
      
      console.log('[Word Parser] Total lines:', lines.length);
      console.log('[Word Parser] Lines:', JSON.stringify(lines, null, 2));
      
      // Detect multiple questions
      const questionNumbers = lines.filter(line => /^\d+[\.\)]/.test(line));
      const hasMultipleQuestions = questionNumbers.length > 1;
      
      if (hasMultipleQuestions) {
        console.log(`[Word Parser] 🎉 Found ${questionNumbers.length} questions! Starting batch upload...`);
        await parseAndCreateMultipleQuestions(lines, questionNumbers.length);
        return; // Exit - batch parser handles everything
      }
      
      // Extract first question only
      let firstQuestionLines: string[] = [];
      let foundFirstQuestion = false;
      
      for (const line of lines) {
        // Stop at question 2
        if (foundFirstQuestion && /^[2-9]\d*[\.\)]/.test(line)) {
          console.log('[Word Parser] Found question 2, stopping at:', line);
          break;
        }
        
        // Start at question 1
        if (!foundFirstQuestion && /^1[\.\)]/.test(line)) {
          foundFirstQuestion = true;
          console.log('[Word Parser] Found question 1 at:', line);
        }
        
        if (foundFirstQuestion) {
          firstQuestionLines.push(line);
        } else if (!hasMultipleQuestions) {
          // If no numbering, take all lines
          firstQuestionLines.push(line);
        }
      }
      
      const linesToParse = hasMultipleQuestions ? firstQuestionLines : lines;
      console.log('[Word Parser] Lines to parse:', JSON.stringify(linesToParse, null, 2));
      
      // Parse question and options
      let questionPart = '';
      let optionsPart: { label: string; text: string; isCorrect: boolean }[] = [];
      let inOptionsSection = false;
      
      for (const line of linesToParse) {
        // Check if line is an option (A., B., C., D. or A, B, C, D or A) B) C) D))
        const optionMatch = line.match(/^([A-H])[\.\)\s]+(.+?)(\*)?$/i);
        
        if (optionMatch) {
          inOptionsSection = true;
          const label = optionMatch[1].toUpperCase();
          let text = optionMatch[2].trim();
          
          console.log(`[Word Parser] 🐛 DEBUG - Raw captured text:`, text, `| Has *:`, text.includes('*'), `| Group 3:`, optionMatch[3]);
          
          // Check for asterisk marking correct answer (check both group 2 and group 3)
          const isCorrect = text.includes('*') || optionMatch[3] === '*';
          text = text.replace(/\s*\*\s*/g, '').trim(); // Remove asterisks
          
          optionsPart.push({ label, text, isCorrect });
          console.log(`[Word Parser] ✅ Option ${label}: "${text}" ${isCorrect ? '(CORRECT)' : ''}`);
          continue;
        }
        
        // Check if option text ends with * (correct answer marker)
        const correctMarkerMatch = line.match(/^([A-H])[\.\)\s]+(.+?)\s*\*$/i);
        if (correctMarkerMatch) {
          inOptionsSection = true;
          const label = correctMarkerMatch[1].toUpperCase();
          const text = correctMarkerMatch[2].trim();
          
          optionsPart.push({ label, text, isCorrect: true });
          console.log(`[Word Parser] ✅ Option ${label}: "${text}" (CORRECT)`);
          continue;
        }
        
        // If not in options section, add to question
        if (!inOptionsSection) {
          // Clean question number
          let cleanLine = line.replace(/^(Q|Question)?\.?\s*\d+[\.\)]?\s*/i, '').trim();
          
          if (cleanLine.length > 0) {
            questionPart += (questionPart ? ' ' : '') + cleanLine;
            console.log('[Word Parser] Added to question:', cleanLine);
          }
        }
      }
      
      // 🎯 STRATEGY 2: If no options found, parse concatenated text
      if (optionsPart.length === 0) {
        console.log('[Word Parser] ⚠️ No options found. Trying concatenated parsing...');
        
        const fullText = linesToParse.join(' ');
        
        // Extract question (everything before first option marker)
        const questionMatch = fullText.match(/^(.+?)(?=[A-H]\\.)/);
        if (questionMatch) {
          questionPart = questionMatch[1].replace(/^(Q|Question)?\\.?\\s*\\d+[\\.\\)]?\\s*/i, '').trim();
          console.log('[Word Parser] Question extracted:', questionPart);
        }
        
        // Extract options: A. text B. text C. text D. text
        const optionRegex = /([A-H])\\.\\s*([^A-H\\.]+?)(?=\\s*[A-H]\\.|Answer:|$)/gi;
        let match;
        
        while ((match = optionRegex.exec(fullText)) !== null) {
          const label = match[1].toUpperCase();
          let text = match[2].trim().replace(/\\*\\s*$/, '');
          
          if (text.length > 0 && text.length < 100) {
            optionsPart.push({ label, text, isCorrect: false });
            console.log(`[Word Parser] ✅ Option ${label}: \"${text}\"`);
          }
        }
        
        // Check for "Answer: C. Book" format
        const answerMatch = fullText.match(/Answer:\\s*([A-H])/i);
        if (answerMatch) {
          const correctAnswer = answerMatch[1].toUpperCase();
          const correctOption = optionsPart.find(opt => opt.label === correctAnswer);
          if (correctOption) {
            correctOption.isCorrect = true;
            console.log('[Word Parser] ✅ Marked', correctAnswer, 'as correct');
          }
        }
      }
      
      console.log('[Word Parser] 🎯 FINAL PARSED DATA:');
      console.log('[Word Parser] Question:', questionPart);
      console.log('[Word Parser] Options:', JSON.stringify(optionsPart, null, 2));
      
      // Auto-fill the form
      if (questionPart) {
        setQuestionText(questionPart);
        console.log('[Word Parser] ✅ Question set successfully');
      }
      
      if (optionsPart.length >= 2) {
        const newOptions: Option[] = optionsPart.map(opt => ({
          label: opt.label,
          text: opt.text,
          isCorrect: opt.isCorrect
        }));
        
        setOptions(newOptions);
        console.log('[Word Parser] ✅✅✅ Options set successfully:', newOptions.length, 'options');
        
        const correctCount = newOptions.filter(o => o.isCorrect).length;
        if (correctCount > 0) {
          setSuccessMessage(`✅ Extracted question with ${newOptions.length} options (${correctCount} marked correct)!`);
        } else {
          setSuccessMessage(`✅ Extracted question with ${newOptions.length} options. Please mark the correct answer.`);
        }
        
        setTimeout(() => setSuccessMessage(''), 8000);
      } else {
        console.log('[Word Parser] ⚠️ No options found');
        setError('Could not detect answer options in Word document. Please format as: A. Option text');
      }
      
    } catch (err: any) {
      console.error('[Word Parser] Error:', err);
      setError(`Word parsing failed: ${err.message}. Please check document format.`);
      setTimeout(() => setError(''), 5000);
    } finally {
      setExtractingText(false);
    }
  };

  // Handle Word document upload
  const handleWordUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.name.endsWith('.docx')) {
      setError('Please select a Word document (.docx file)');
      return;
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      setError('Document size must be less than 10MB');
      return;
    }

    try {
      setError('');
      await extractTextFromWord(file);
    } catch (err: any) {
      console.error('[Word Upload] Error:', err);
      setError(`Word upload failed: ${err.message}`);
    }
  };

  // 🤖 Function to extract text from image using Tesseract.js OCR
  const extractTextFromImage = async (imageUrl: string, accessToken?: string) => {
    setExtractingText(true);
    try {
      console.log('[OCR] Starting text extraction from:', imageUrl);
      
      // Create Tesseract worker
      const worker = await createWorker('eng');
      
      // Perform OCR
      const { data: { text } } = await worker.recognize(imageUrl);
      await worker.terminate();
      
      console.log('[OCR] ========== RAW EXTRACTED TEXT ==========');
      console.log(text);
      console.log('[OCR] ========================================');
      
      // 🧠 IMPROVED PARSING: Detect multiple questions and extract ONLY the first one
      const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);
      
      console.log('[OCR] Total lines extracted:', lines.length);
      console.log('[OCR] Lines:', JSON.stringify(lines, null, 2));
      
      // Detect if there are multiple questions (numbered 1., 2., 3., etc.)
      const questionNumbers = lines.filter(line => /^\d+\.\s*/.test(line));
      const hasMultipleQuestions = questionNumbers.length > 1;
      
      if (hasMultipleQuestions) {
        setSuccessMessage(`⚠️ ${questionNumbers.length} questions detected! Extracting question #1 only.`);
        console.log(`[OCR] Multiple questions detected (${questionNumbers.length}). Extracting first question only.`);
      }
      
      // Find where question 1 ends and question 2 begins
      let firstQuestionLines: string[] = [];
      let foundFirstQuestion = false;
      let foundSecondQuestion = false;
      
      for (const line of lines) {
        if (foundFirstQuestion && /^[2-9]\d*\.\s*/.test(line)) {
          foundSecondQuestion = true;
          console.log('[OCR] Found question 2, stopping extraction at:', line);
          break;
        }
        
        if (!foundFirstQuestion && /^1\.\s*/.test(line)) {
          foundFirstQuestion = true;
          console.log('[OCR] Found question 1 at:', line);
        }
        
        if (foundFirstQuestion && !foundSecondQuestion) {
          firstQuestionLines.push(line);
        } else if (!foundFirstQuestion) {
          firstQuestionLines.push(line);
        }
      }
      
      const linesToParse = hasMultipleQuestions ? firstQuestionLines : lines;
      console.log('[OCR] 🔍 Lines to parse for question 1:', JSON.stringify(linesToParse, null, 2));
      
      // 🚀 STRATEGY 1: Try to parse structured format (question then options)
      let questionPart = '';
      let optionsPart: { label: string; text: string }[] = [];
      let currentSection = 'question';
      let questionStarted = false;
      
      for (let i = 0; i < linesToParse.length; i++) {
        const line = linesToParse[i];
        
        // Skip header lines
        if (!questionStarted && !line.match(/^\d+\./) && (
          line.toLowerCase().includes('language') || 
          line.toLowerCase().includes('objective') ||
          line.toLowerCase().includes('instruction')
        )) {
          console.log('[OCR] Skipping header line:', line);
          continue;
        }
        
        // 🎯 ULTRA-FLEXIBLE OPTION DETECTION
        // Matches: "A.", "A)", "A )", "A:", "A ", "a.", "a)", "A.Run", "A) Run", "A Run", etc.
        const optionPatterns = [
          /^([A-Ha-h])[\.\)]\s*(.*)$/,           // A. text or A) text
          /^([A-Ha-h])\s*[\:\-]\s*(.*)$/,        // A: text or A - text
          /^([A-Ha-h])\s+([A-Z][a-z].*)$/,       // A Run (capital letter after space)
          /^([A-Ha-h])\s+(.{3,})$/,              // A followed by space and 3+ chars
          /^([A-Ha-h])([A-Z][a-z]+.*)$/,         // ARun (no space, capital letter)
        ];
        
        let optionMatch = null;
        let matchedPattern = -1;
        
        for (let p = 0; p < optionPatterns.length; p++) {
          const match = line.match(optionPatterns[p]);
          if (match) {
            optionMatch = match;
            matchedPattern = p;
            break;
          }
        }
        
        if (optionMatch) {
          const label = optionMatch[1].toUpperCase();
          const optionText = optionMatch[2]?.trim() || '';
          
          console.log(`[OCR] ✅ Found option ${label} (pattern ${matchedPattern}): "${optionText}"`);
          
          if (currentSection === 'question') {
            currentSection = 'options';
            console.log('[OCR] 📍 Switching from question to options section');
          }
          
          // Add option even if text is empty - we'll try to get it from next line
          if (optionText.length > 0) {
            optionsPart.push({ label, text: optionText });
          } else {
            // Check next line for option text
            const nextLine = linesToParse[i + 1];
            if (nextLine && !nextLine.match(/^[A-Ha-h][\.\)\s:\-]/)) {
              console.log(`[OCR] Option ${label} text on next line: "${nextLine}"`);
              optionsPart.push({ label, text: nextLine.trim() });
              i++; // Skip next line
            } else {
              optionsPart.push({ label, text: '' }); // Add empty, user can fill
            }
          }
          continue;
        }
        
        if (currentSection === 'question') {
          let cleanLine = line.replace(/^(Q|Question)?\s*\d+[\.\:\)]?\s*/i, '').trim();
          
          if (cleanLine.length > 0) {
            questionStarted = true;
            questionPart += (questionPart ? ' ' : '') + cleanLine;
            console.log('[OCR] Added to question:', cleanLine);
          }
        } else if (currentSection === 'options') {
          // Continuation of previous option
          const lastOption = optionsPart[optionsPart.length - 1];
          if (lastOption && line.length > 0 && !line.match(/^[A-Ha-h][\.\)\s:\-]/)) {
            lastOption.text += ' ' + line;
            console.log(`[OCR] Appending to option ${lastOption.label}: "${line}"`);
          }
        }
      }
      
      console.log('[OCR] 📊 Strategy 1 Results:');
      console.log('[OCR] Question:', questionPart);
      console.log('[OCR] Options:', JSON.stringify(optionsPart, null, 2));
      
      // 🚀 STRATEGY 2: If no options found, try to find them in a single line
      if (optionsPart.length === 0) {
        console.log('[OCR] ⚠️ No options found with Strategy 1. Trying Strategy 2: Single-line parsing...');
        
        const fullText = linesToParse.join(' ');
        // Try to find "A something B something C something D something"
        const singleLinePattern = /([A-Da-d])[\.\):\s]+([^A-Da-d]{2,}?)(?=\s*[A-Da-d][\.\):\s]|$)/g;
        const matches = [...fullText.matchAll(singleLinePattern)];
        
        matches.forEach(match => {
          const label = match[1].toUpperCase();
          const text = match[2].trim();
          if (text.length > 1) {
            optionsPart.push({ label, text });
            console.log(`[OCR] ✅ Found option ${label} in single line: "${text}"`);
          }
        });
      }
      
      // 🚀 STRATEGY 3: If still no options, look for ANY line starting with A, B, C, D
      if (optionsPart.length === 0) {
        console.log('[OCR] ⚠️ No options found with Strategy 2. Trying Strategy 3: Aggressive letter detection...');
        
        for (const line of linesToParse) {
          // Just check if line starts with A, B, C, or D (case insensitive)
          const firstChar = line.charAt(0).toUpperCase();
          if (['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'].includes(firstChar)) {
            // Remove the first character and any punctuation
            const text = line.substring(1).replace(/^[\.\)\s:\-]+/, '').trim();
            if (text.length > 0) {
              optionsPart.push({ label: firstChar, text });
              console.log(`[OCR] ✅ Found option ${firstChar} (aggressive): "${text}"`);
            }
          }
        }
      }
      
      // 🚀 STRATEGY 4: If only 1 option found, it's probably all options on one line
      // Example: "A.Run B. Happy C. Book D. Quickly"
      if (optionsPart.length === 1 && optionsPart[0].text.includes('B')) {
        console.log('[OCR] ⚠️ Detected all options on one line. Trying Strategy 4: Split single line...');
        const singleLineText = optionsPart[0].text;
        optionsPart = []; // Clear the single incorrect option
        
        // 🔥 IMPROVED: Split by detecting " B", " C", " D" with optional punctuation
        // This handles: "Run B. Happy C. Book D. Quickly"
        // Split on space followed by capital letter A-H and punctuation
        const parts = singleLineText.split(/\s+(?=[A-H][\.\)\s])/);
        
        console.log('[OCR] Strategy 4: Split parts:', parts);
        
        parts.forEach((part, idx) => {
          // Match pattern: optional letter at start, optional punctuation, then text
          const match = part.match(/^([A-H])[\.\)\s]*(.+)$/i);
          if (match) {
            const label = match[1].toUpperCase();
            const text = match[2].trim();
            if (text.length > 0) {
              optionsPart.push({ label, text });
              console.log(`[OCR] ✅ Split option ${label}: "${text}"`);
            }
          } else if (idx === 0 && part.trim().length > 0) {
            // First part might not have a letter prefix if we already captured "A"
            optionsPart.push({ label: 'A', text: part.trim() });
            console.log(`[OCR] ✅ Split option A (first): "${part.trim()}"`);
          }
        });
        
        // If simple split didn't work, try more aggressive regex
        if (optionsPart.length < 2) {
          console.log('[OCR] Strategy 4a: Trying regex-based split...');
          optionsPart = [];
          
          // Match: Letter + optional punctuation + text (everything until next letter+punctuation pattern or end)
          // Use lookahead to split before next option
          const regex = /([A-H])[\.\)\s]*([^\n]+?)(?=\s+[A-H][\.\)\s]|\s*$)/gi;
          let match;
          
          while ((match = regex.exec(singleLineText)) !== null) {
            const label = match[1].toUpperCase();
            const text = match[2].trim();
            if (text.length > 0) {
              optionsPart.push({ label, text });
              console.log(`[OCR] ✅ Regex option ${label}: "${text}"`);
            }
          }
        }
      }
      
      console.log('[OCR] 🎯 FINAL EXTRACTED DATA:');
      console.log('[OCR] Question text:', questionPart);
      console.log('[OCR] Options found:', optionsPart.length);
      console.log('[OCR] Options:', JSON.stringify(optionsPart, null, 2));
      
      // Auto-fill the form
      if (questionPart) {
        setQuestionText(questionPart);
        console.log('[OCR] ✅ Question set successfully');
      } else {
        const fallbackText = linesToParse.filter(l => !l.match(/^[A-Ha-h][\.\)]/)).join(' ').trim();
        setQuestionText(fallbackText);
        console.log('[OCR] ⚠️ Using fallback text as question');
      }
      
      // Populate options
      if (optionsPart.length >= 2) {
        const newOptions: Option[] = [];
        
        ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'].forEach((label, idx) => {
          const found = optionsPart.find(opt => opt.label === label);
          if (found) {
            newOptions.push({
              label,
              text: found.text,
              isCorrect: false
            });
          } else if (idx < optionsPart.length && optionsPart[idx]) {
            newOptions.push({
              label,
              text: optionsPart[idx].text,
              isCorrect: false
            });
          }
        });
        
        if (newOptions.length >= 2) {
          setOptions(newOptions);
          console.log('[OCR] ✅✅✅ Options set successfully:', newOptions.length, 'options');
          setSuccessMessage('✅ Text extracted! Please review and mark the correct answer.');
          setTimeout(() => setSuccessMessage(''), 8000);
        } else {
          console.log('[OCR] ❌ Not enough valid options after processing');
          setError('Could not detect answer options. Please enter them manually or try re-uploading with better image quality.');
        }
      } else {
        console.log('[OCR] ❌ No options detected in any strategy. Found only:', optionsPart.length);
        setError('Could not detect answer options. Please enter them manually. Check console for OCR debug info.');
      }
      
    } catch (err: any) {
      console.error('[OCR] Error:', err);
      setError(`OCR failed: ${err.message}. You can still manually enter the question.`);
      setTimeout(() => setError(''), 5000);
    } finally {
      setExtractingText(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <h2 className="text-gray-900">{isEditMode ? 'Edit Question' : 'Create New Question'}</h2>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Error Message */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <p className="text-red-800">{error}</p>
            </div>
          )}

          {/* Success Message */}
          {successMessage && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
              <p className="text-green-800">{successMessage}</p>
            </div>
          )}

          {/* Basic Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-gray-700 mb-2">
                Subject <span className="text-red-500">*</span>
              </label>
              <select
                value={subject}
                onChange={(e) => handleSubjectChange(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              >
                <option value="">Select Subject</option>
                {assignedSubjects.map(subj => (
                  <option key={subj.id} value={subj.name}>{subj.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-gray-700 mb-2">
                Class <span className="text-red-500">*</span>
              </label>
              <select
                value={classLevel}
                onChange={(e) => handleClassChange(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              >
                <option value="">Select Class</option>
                {classes.map(cls => (
                  <option key={cls.id} value={cls.name}>{cls.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-gray-700 mb-2">
                Session <span className="text-red-500">*</span>
              </label>
              <select
                value={session}
                onChange={(e) => setSession(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              >
                <option value="">Select Session</option>
                {availableSessions.map((sess, index) => (
                  <option key={`session-${index}-${sess}`} value={sess}>{sess}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-gray-700 mb-2">
                Term <span className="text-red-500">*</span>
              </label>
              <select
                value={term}
                onChange={(e) => setTerm(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              >
                <option value="">Select Term</option>
                <option value="First Term">First Term</option>
                <option value="Second Term">Second Term</option>
                <option value="Third Term">Third Term</option>
              </select>
            </div>
          </div>

          {/* Question Type */}
          <div>
            <label className="block text-gray-700 mb-2">
              Question Type <span className="text-red-500">*</span>
            </label>
            <select
              value={questionType}
              onChange={(e) => setQuestionType(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="mcq_single">Multiple Choice (Single Answer)</option>
              <option value="mcq_multiple">Multiple Choice (Multiple Answers)</option>
              <option value="true_false">True/False</option>
              <option value="fill_blank">Fill in the Blank</option>
              <option value="essay">Essay</option>
            </select>
          </div>

          {/* Question Text */}
          <div>
            <label className="block text-gray-700 mb-2">
              Question Text <span className="text-red-500">*</span>
            </label>
            <textarea
              value={questionText}
              onChange={(e) => setQuestionText(e.target.value)}
              rows={4}
              placeholder="Enter your question here..."
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            />
          </div>

          {/* 📄 Word Document Upload - AUTO-EXTRACT QUESTIONS */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-gray-700">
                📄 Upload from Word Document (Recommended)
                <span className="text-green-600 text-sm ml-2">- Fast & accurate extraction!</span>
              </label>
              <button
                type="button"
                onClick={() => {
                  // Download sample template
                  const sampleText = `CBT Question Template

1. Which of the following is a noun?
A. Run
B. Happy
C. Book *
D. Quickly

2. Choose the correct plural of child.
A. Childs
B. Childes
C. Children *
D. Childrens

3. What is the capital of Nigeria?
A. Lagos
B. Abuja *
C. Kano
D. Port Harcourt

Instructions:
- Number your questions (1., 2., 3., etc.)
- Format options as A., B., C., D.
- Mark correct answers with * at the end
- Save as .docx format
- Upload one document at a time`;
                  
                  const blob = new Blob([sampleText], { type: 'text/plain' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = 'CBT_Question_Template.txt';
                  a.click();
                  URL.revokeObjectURL(url);
                }}
                className="text-blue-600 hover:text-blue-700 text-sm underline"
              >
                Download Template
              </button>
            </div>
            
            <div className="border-2 border-dashed border-green-300 rounded-lg p-6 text-center hover:border-green-500 transition-colors bg-green-50">
              <input
                type="file"
                id="question-word-upload"
                accept=".docx"
                onChange={handleWordUpload}
                className="hidden"
                disabled={extractingText}
              />
              <label
                htmlFor="question-word-upload"
                className="cursor-pointer flex flex-col items-center"
              >
                {extractingText ? (
                  <>
                    <Wand2 className="w-12 h-12 text-green-500 animate-pulse mb-3" />
                    <p className="text-green-600 font-medium">Extracting from Word document...</p>
                    <p className="text-green-500 text-xs mt-1">Parsing questions & options...</p>
                  </>
                ) : (
                  <>
                    <FileText className="w-12 h-12 text-green-600 mb-3" />
                    <p className="text-gray-700 font-medium mb-1">📄 Click to upload Word document (.docx)</p>
                    <p className="text-gray-600 text-sm">Format: <code className="bg-white px-2 py-1 rounded">1. Question text?</code></p>
                    <p className="text-gray-600 text-sm"><code className="bg-white px-2 py-1 rounded">A. Option 1</code> <code className="bg-white px-2 py-1 rounded">B. Option 2 *</code></p>
                    <p className="text-green-600 text-sm mt-2 font-medium">✨ Use * to mark correct answers!</p>
                    <p className="text-blue-600 text-sm mt-1 font-bold">🎉 NEW: Upload multiple questions at once!</p>
                    <p className="text-gray-500 text-xs mt-1">Up to 10MB</p>
                  </>
                )}
              </label>
            </div>
          </div>

          {/* Question Image Upload (Optional) */}
          <div>
            <label className="block text-gray-700 mb-2">
              Alternative: Upload Question Image (OCR)
              <span className="text-gray-500 text-sm ml-2">- For diagrams, graphs, equations, etc.</span>
            </label>
            
            {!questionImageUrl ? (
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-blue-500 transition-colors">
                <input
                  type="file"
                  id="question-image-upload"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                  disabled={uploadingImage || extractingText}
                />
                <label
                  htmlFor="question-image-upload"
                  className="cursor-pointer flex flex-col items-center"
                >
                  {uploadingImage ? (
                    <>
                      <Upload className="w-12 h-12 text-blue-500 animate-pulse mb-3" />
                      <p className="text-blue-600">Uploading image...</p>
                    </>
                  ) : extractingText ? (
                    <>
                      <Wand2 className="w-12 h-12 text-purple-500 animate-pulse mb-3" />
                      <p className="text-purple-600">Extracting text from image...</p>
                      <p className="text-purple-500 text-xs mt-1">This may take a few seconds</p>
                    </>
                  ) : (
                    <>
                      <ImageIcon className="w-12 h-12 text-gray-400 mb-3" />
                      <p className="text-gray-700 mb-1">📸 Click to upload question image</p>
                      <p className="text-gray-500 text-sm">PNG, JPG, GIF up to 5MB</p>
                      <p className="text-blue-600 text-sm mt-2">✨ AI will auto-extract text & options!</p>
                    </>
                  )}
                </label>
              </div>
            ) : (
              <div className="border border-gray-300 rounded-lg p-4">
                <div className="flex items-start gap-4">
                  <img
                    src={questionImageUrl}
                    alt="Question preview"
                    className="w-32 h-32 object-cover rounded border border-gray-200"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-gray-700 mb-2">Image uploaded successfully</p>
                    <p className="text-gray-500 text-sm mb-3 break-all overflow-hidden">{questionImageUrl}</p>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={async () => {
                          const { data: { session: authSession } } = await supabase.auth.getSession();
                          if (authSession) {
                            await extractTextFromImage(questionImageUrl, authSession.access_token);
                          }
                        }}
                        disabled={extractingText}
                        className="flex items-center gap-2 px-3 py-1 text-purple-600 hover:bg-purple-50 rounded-lg transition-colors disabled:opacity-50"
                      >
                        <Wand2 className="w-4 h-4" />
                        {extractingText ? 'Extracting...' : 'Re-extract Text'}
                      </button>
                      <button
                        type="button"
                        onClick={removeImage}
                        className="flex items-center gap-2 px-3 py-1 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                        Remove Image
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Answer Options - MCQ */}
          {(questionType === 'mcq_single' || questionType === 'mcq_multiple') && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <label className="block text-gray-700">
                  Answer Options <span className="text-red-500">*</span>
                </label>
                <button
                  type="button"
                  onClick={addOption}
                  className="flex items-center gap-2 px-3 py-1 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  Add Option
                </button>
              </div>
              <div className="space-y-3">
                {options.map((option, index) => (
                  <div key={index} className="flex items-center gap-3">
                    <input
                      type={questionType === 'mcq_single' ? 'radio' : 'checkbox'}
                      name={questionType === 'mcq_single' ? 'correct-answer' : undefined}
                      checked={option.isCorrect}
                      onChange={(e) => updateOption(index, 'isCorrect', e.target.checked)}
                      className="w-5 h-5"
                      title="Mark as correct"
                    />
                    <div className="flex items-center gap-2 flex-1">
                      <span className="w-8 text-gray-700">{option.label}.</span>
                      <input
                        type="text"
                        value={option.text}
                        onChange={(e) => updateOption(index, 'text', e.target.value)}
                        placeholder="Enter option text"
                        className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                    {options.length > 2 && (
                      <button
                        type="button"
                        onClick={() => removeOption(index)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
              <p className="text-gray-500 text-sm mt-2">
                {questionType === 'mcq_single' 
                  ? 'Select one correct answer' 
                  : 'Select all correct answers'
                }
              </p>
            </div>
          )}

          {/* True/False Answer */}
          {questionType === 'true_false' && (
            <div>
              <label className="block text-gray-700 mb-2">
                Correct Answer <span className="text-red-500">*</span>
              </label>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    value="True"
                    checked={trueFalseAnswer === 'True'}
                    onChange={(e) => setTrueFalseAnswer(e.target.value)}
                    className="w-5 h-5"
                  />
                  <span className="text-gray-700">True</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    value="False"
                    checked={trueFalseAnswer === 'False'}
                    onChange={(e) => setTrueFalseAnswer(e.target.value)}
                    className="w-5 h-5"
                  />
                  <span className="text-gray-700">False</span>
                </label>
              </div>
            </div>
          )}

          {/* Fill in the Blank Answers */}
          {questionType === 'fill_blank' && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <label className="block text-gray-700">
                  Accepted Answers <span className="text-red-500">*</span>
                </label>
                <button
                  type="button"
                  onClick={addFillBlankAnswer}
                  className="flex items-center gap-2 px-3 py-1 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  Add Variant
                </button>
              </div>
              <div className="space-y-2">
                {fillBlankAnswers.map((answer, index) => (
                  <div key={index} className="flex items-center gap-3">
                    <input
                      type="text"
                      value={answer}
                      onChange={(e) => {
                        const newAnswers = [...fillBlankAnswers];
                        newAnswers[index] = e.target.value;
                        setFillBlankAnswers(newAnswers);
                      }}
                      placeholder="e.g., Abuja, ABUJA, abuja"
                      className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                    {fillBlankAnswers.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeFillBlankAnswer(index)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
              <p className="text-gray-500 text-sm mt-2">
                Add different acceptable spellings or formats of the answer
              </p>
            </div>
          )}

          {/* Essay - No predefined answer */}
          {questionType === 'essay' && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-blue-800">
                Essay questions will require manual grading by you after students submit their answers.
              </p>
            </div>
          )}

          {/* Marks and Status */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-gray-700 mb-2">Marks</label>
              <input
                type="number"
                value={marks}
                onChange={(e) => setMarks(e.target.value)}
                min="0.5"
                step="0.5"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-gray-700 mb-2">Status</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as 'draft' | 'published')}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="draft">Draft</option>
                <option value="published">Published</option>
              </select>
            </div>
          </div>

          {/* Word Document Format Guide */}
          <div className="bg-gradient-to-r from-green-50 to-blue-50 border border-green-200 rounded-lg p-4">
            <h4 className="text-green-800 font-semibold mb-2">📝 Word Document Format Guide:</h4>
            <div className="text-gray-700 text-sm space-y-1 font-mono bg-white p-3 rounded">
              <p>1. Which of the following is a noun?</p>
              <p>A. Run</p>
              <p>B. Happy</p>
              <p>C. Book *</p>
              <p>D. Quickly</p>
              <p className="mt-2 opacity-50">---</p>
              <p className="mt-2">2. Choose the correct plural of child.</p>
              <p>A. Childs</p>
              <p>B. Childes</p>
              <p>C. Children *</p>
              <p>D. Childrens</p>
            </div>
            <p className="text-green-700 text-sm mt-2">
              ✅ <strong>Tip:</strong> Mark correct answers with <code className="bg-green-100 px-1">*</code> at the end. Upload one document with multiple questions - we'll extract question #1 first, then you can re-upload for the next!
            </p>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-blue-800 text-sm">
              ℹ️ <strong>Note:</strong> Overall exam duration (e.g., 1hr 45mins) will be set when creating the exam, not per question. Students can navigate back and forth between questions within the exam time limit.
            </p>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between gap-3 pt-4 border-t border-gray-200">
            {questionsSaved > 0 && (
              <p className="text-green-600 text-sm">
                ✓ {questionsSaved} question{questionsSaved > 1 ? 's' : ''} created in this session
              </p>
            )}
            <div className="flex items-center gap-3 ml-auto">
              <button
                type="button"
                onClick={onClose}
                className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={(e: any) => handleSubmit(e, true)}
                disabled={loading}
                className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Saving...' : 'Save & Add Another'}
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Saving...' : 'Save & Close'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}