import React, { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Badge } from '../ui/badge';
import { Alert, AlertDescription } from '../ui/alert';
import { 
  Camera, 
  Clock, 
  CheckCircle, 
  XCircle, 
  Search,
  AlertTriangle,
  LogIn,
  LogOut as LogOutIcon,
  RefreshCw,
  User,
  Calendar as CalendarIcon
} from 'lucide-react';
import { createClient } from '../../utils/supabase/client';
import { projectId } from '../../utils/supabase/info';
import { toast } from 'sonner@2.0.3';

interface Student {
  id: string;
  first_name: string;
  middle_name?: string;
  last_name: string;
  class_name: string;
  photo_url?: string;
}

interface ClockRecord {
  id: string;
  student_id: string;
  student_name: string;
  class_name: string;
  clock_in_time?: string;
  clock_out_time?: string;
  clock_in_photo_url?: string;
  clock_out_photo_url?: string;
  late_arrival: boolean;
  week?: string;
}

export function GateClockIn() {
  const [students, setStudents] = useState<Student[]>([]);
  const [filteredStudents, setFilteredStudents] = useState<Student[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [loading, setLoading] = useState(false);
  const [dutyWeek, setDutyWeek] = useState('');
  const [todayRecords, setTodayRecords] = useState<ClockRecord[]>([]);
  const [stats, setStats] = useState({
    clockedIn: 0,
    clockedOut: 0,
    lateArrivals: 0,
    total: 0
  });
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  
  const supabase = createClient();

  useEffect(() => {
    fetchStudents();
    fetchTodayRecords();
    
    // Cleanup camera on unmount
    return () => {
      stopCamera();
    };
  }, []);

  useEffect(() => {
    // Filter students based on search query
    if (searchQuery.trim() === '') {
      setFilteredStudents([]);
    } else {
      const query = searchQuery.toLowerCase();
      const filtered = students.filter(student => {
        const fullName = `${student.first_name} ${student.middle_name || ''} ${student.last_name}`.toLowerCase();
        return fullName.includes(query) || student.class_name.toLowerCase().includes(query);
      });
      setFilteredStudents(filtered.slice(0, 10)); // Limit to 10 results
    }
  }, [searchQuery, students]);

  const fetchStudents = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-1ddd013a/students`,
        {
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      const data = await response.json();
      if (data.success) {
        setStudents(data.students || []);
        setStats(prev => ({ ...prev, total: data.students?.length || 0 }));
      }
    } catch (error) {
      console.error('[GateClockIn] Error fetching students:', error);
    }
  };

  const fetchTodayRecords = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-1ddd013a/clock-records-today`,
        {
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      const data = await response.json();
      if (data.success) {
        setTodayRecords(data.records || []);
        setStats({
          clockedIn: data.stats?.clockedIn || 0,
          clockedOut: data.stats?.clockedOut || 0,
          lateArrivals: data.stats?.lateArrivals || 0,
          total: students.length || data.stats?.total || 0
        });
      }
    } catch (error) {
      console.error('[GateClockIn] Error fetching today records:', error);
    }
  };

  const startCamera = async () => {
    try {
      console.log('[GateClockIn] Starting camera...');
      
      // Check if mediaDevices is supported
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        toast.error('Camera not supported on this device or browser');
        return;
      }

      // Show loading state
      setCameraActive(true);
      toast.info('Requesting camera access...');

      // For mobile, prefer back camera for gate duty, fallback to front camera
      let stream: MediaStream | null = null;
      
      try {
        // Try back camera first (better for gate duty)
        stream = await navigator.mediaDevices.getUserMedia({ 
          video: { 
            facingMode: { ideal: 'environment' }, // Back camera
            width: { ideal: 1920, max: 1920 },
            height: { ideal: 1080, max: 1080 }
          },
          audio: false
        });
        console.log('[GateClockIn] Back camera access granted');
      } catch (backCameraError) {
        console.log('[GateClockIn] Back camera failed, trying front camera:', backCameraError);
        // Fallback to front camera
        stream = await navigator.mediaDevices.getUserMedia({ 
          video: { 
            facingMode: 'user', // Front camera
            width: { ideal: 1280 },
            height: { ideal: 720 }
          },
          audio: false
        });
        console.log('[GateClockIn] Front camera access granted');
      }
      
      if (stream && videoRef.current) {
        videoRef.current.srcObject = stream;
        streamRef.current = stream;
        
        // IMPORTANT: Mobile devices require explicit play() call
        try {
          await videoRef.current.play();
          console.log('[GateClockIn] Video playback started');
          toast.success('Camera ready!');
        } catch (playError) {
          console.error('[GateClockIn] Video play error:', playError);
          // Try playing again after a short delay
          setTimeout(async () => {
            try {
              if (videoRef.current) {
                await videoRef.current.play();
                console.log('[GateClockIn] Video playback started (retry)');
                toast.success('Camera ready!');
              }
            } catch (retryError) {
              console.error('[GateClockIn] Video play retry error:', retryError);
            }
          }, 100);
        }
      }
    } catch (error: any) {
      console.error('[GateClockIn] Error accessing camera:', error);
      setCameraActive(false);
      
      // Provide specific error messages based on error type
      if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
        toast.error('Camera permission denied. Please allow camera access in your browser settings and try again.');
      } else if (error.name === 'NotFoundError' || error.name === 'DevicesNotFoundError') {
        toast.error('No camera found on this device.');
      } else if (error.name === 'NotReadableError' || error.name === 'TrackStartError') {
        toast.error('Camera is already in use by another application.');
      } else if (error.name === 'OverconstrainedError') {
        toast.error('Camera does not support the requested settings. Trying alternative settings...');
        // Retry with simpler constraints
        try {
          const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
          if (stream && videoRef.current) {
            videoRef.current.srcObject = stream;
            streamRef.current = stream;
            setCameraActive(true);
            await videoRef.current.play();
            toast.success('Camera ready!');
          }
        } catch (retryError) {
          console.error('[GateClockIn] Retry failed:', retryError);
        }
      } else {
        toast.error(`Unable to access camera: ${error.message || 'Unknown error'}`);
      }
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setCameraActive(false);
  };

  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');

    if (!context) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    context.drawImage(video, 0, 0);

    const photoDataUrl = canvas.toDataURL('image/jpeg', 0.8);
    setCapturedPhoto(photoDataUrl);
    stopCamera();
    toast.success('Photo captured successfully!');
  };

  const uploadPhoto = async (dataUrl: string, studentId: string, type: 'clock-in' | 'clock-out'): Promise<string> => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('No session');

      // Convert data URL to blob
      const response = await fetch(dataUrl);
      const blob = await response.blob();

      // Create FormData
      const formData = new FormData();
      const timestamp = Date.now();
      const fileName = `${studentId}_${timestamp}.jpg`;
      formData.append('file', blob, fileName);
      formData.append('studentId', studentId);
      formData.append('type', type);

      // Upload to backend
      const uploadResponse = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-1ddd013a/upload-clock-photo`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`
          },
          body: formData
        }
      );

      const data = await uploadResponse.json();
      if (!data.success) {
        throw new Error(data.error || 'Upload failed');
      }

      return data.photoUrl;
    } catch (error) {
      console.error('[GateClockIn] Error uploading photo:', error);
      throw error;
    }
  };

  const handleClockIn = async () => {
    if (!selectedStudent || !capturedPhoto) {
      toast.error('Please select a student and capture a photo');
      return;
    }

    if (!dutyWeek.trim()) {
      toast.error('Please enter the duty week');
      return;
    }

    try {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error('Session expired. Please log in again.');
        return;
      }

      // Upload photo
      const photoUrl = await uploadPhoto(capturedPhoto, selectedStudent.id, 'clock-in');

      // Record clock-in
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-1ddd013a/clock-in`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            studentId: selectedStudent.id,
            photoUrl: photoUrl,
            week: dutyWeek.trim()
          })
        }
      );

      const data = await response.json();
      if (data.success) {
        toast.success(`${selectedStudent.first_name} ${selectedStudent.last_name} clocked in successfully!`);
        resetForm();
        fetchTodayRecords();
      } else {
        toast.error(data.error || 'Failed to clock in');
      }
    } catch (error) {
      console.error('[GateClockIn] Error clocking in:', error);
      toast.error('Failed to clock in. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleClockOut = async () => {
    if (!selectedStudent || !capturedPhoto) {
      toast.error('Please select a student and capture a photo');
      return;
    }

    try {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error('Session expired. Please log in again.');
        return;
      }

      // Upload photo
      const photoUrl = await uploadPhoto(capturedPhoto, selectedStudent.id, 'clock-out');

      // Record clock-out
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-1ddd013a/clock-out`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            studentId: selectedStudent.id,
            photoUrl: photoUrl
          })
        }
      );

      const data = await response.json();
      if (data.success) {
        toast.success(`${selectedStudent.first_name} ${selectedStudent.last_name} clocked out successfully!`);
        resetForm();
        fetchTodayRecords();
      } else {
        toast.error(data.error || 'Failed to clock out');
      }
    } catch (error) {
      console.error('[GateClockIn] Error clocking out:', error);
      toast.error('Failed to clock out. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setSelectedStudent(null);
    setCapturedPhoto(null);
    setSearchQuery('');
    setFilteredStudents([]);
    stopCamera();
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: true 
    });
  };

  const getCurrentDate = () => {
    return new Date().toLocaleDateString('en-US', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  };

  const isWeekend = () => {
    const day = new Date().getDay();
    return day === 0 || day === 6; // Sunday = 0, Saturday = 6
  };

  return (
    <div className="space-y-4 md:space-y-6">
      {/* Mobile Header with Gradient - App Style */}
      <div className="bg-gradient-to-r from-slate-700 to-gray-800 text-white -mx-4 -mt-4 p-6 rounded-b-3xl md:rounded-2xl md:mx-0 md:mt-0 shadow-lg">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-white/20 backdrop-blur-sm rounded-xl">
            <Clock className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold">Gate Duty</h1>
            <div className="flex items-center gap-2 text-slate-200 text-sm mt-1">
              <CalendarIcon className="h-4 w-4" />
              <span>{getCurrentDate()}</span>
              <span>•</span>
              <Clock className="h-4 w-4" />
              <span>{new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Weekend Warning */}
      {isWeekend() && (
        <Alert className="bg-amber-50 border-amber-200">
          <AlertTriangle className="h-4 w-4 text-amber-600" />
          <AlertDescription className="text-amber-800 text-xs sm:text-sm">
            <strong>Weekend Notice:</strong> Today is {new Date().toLocaleDateString('en-US', { weekday: 'long' })}. 
            Clock-ins are allowed for special events, makeup days, or Saturday classes, but this is outside regular school days (Mon-Fri).
          </AlertDescription>
        </Alert>
      )}

      {/* Statistics Cards - App Style */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 px-4 md:px-0">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
          <div className="flex flex-col items-center text-center">
            <div className="p-2.5 bg-green-50 rounded-xl mb-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
            </div>
            <p className="text-2xl font-bold text-gray-900">{stats.clockedIn}/{stats.total}</p>
            <p className="text-xs text-gray-600 mt-1">Clocked In</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
          <div className="flex flex-col items-center text-center">
            <div className="p-2.5 bg-blue-50 rounded-xl mb-2">
              <LogOutIcon className="h-5 w-5 text-blue-600" />
            </div>
            <p className="text-2xl font-bold text-gray-900">{stats.clockedOut}</p>
            <p className="text-xs text-gray-600 mt-1">Clocked Out</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
          <div className="flex flex-col items-center text-center">
            <div className="p-2.5 bg-amber-50 rounded-xl mb-2">
              <AlertTriangle className="h-5 w-5 text-amber-600" />
            </div>
            <p className="text-2xl font-bold text-gray-900">{stats.lateArrivals}</p>
            <p className="text-xs text-gray-600 mt-1">Late</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
          <div className="flex flex-col items-center text-center">
            <div className="p-2.5 bg-red-50 rounded-xl mb-2">
              <XCircle className="h-5 w-5 text-red-600" />
            </div>
            <p className="text-2xl font-bold text-gray-900">{stats.total - stats.clockedIn}</p>
            <p className="text-xs text-gray-600 mt-1">Absent</p>
          </div>
        </div>
      </div>

      {/* Main Clock-In Interface - App Style */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden mx-4 md:mx-0">
        <div className="p-5 border-b border-gray-100">
          <h2 className="font-semibold text-gray-900">Clock In/Out Student</h2>
        </div>
        <div className="p-5 space-y-6">{/* Camera Section */}
          <div className="space-y-4">
            <Label>Student Photo</Label>
            
            {!cameraActive && !capturedPhoto && (
              <div className="border-2 border-dashed border-slate-300 rounded-lg p-12 text-center bg-slate-50">
                <Camera className="h-16 w-16 mx-auto mb-4 text-slate-400" />
                <p className="text-slate-600 mb-4">Click below to start camera</p>
                <Button onClick={startCamera} size="lg">
                  <Camera className="h-5 w-5 mr-2" />
                  Start Camera
                </Button>
              </div>
            )}

            {cameraActive && (
              <div className="space-y-4">
                <div className="relative rounded-lg overflow-hidden bg-black">
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    className="w-full h-auto"
                  />
                </div>
                <div className="flex gap-4 justify-center">
                  <Button onClick={capturePhoto} size="lg">
                    <Camera className="h-5 w-5 mr-2" />
                    Capture Photo
                  </Button>
                  <Button onClick={stopCamera} variant="outline" size="lg">
                    Cancel
                  </Button>
                </div>
              </div>
            )}

            {capturedPhoto && (
              <div className="space-y-4">
                <div className="relative rounded-lg overflow-hidden border-2 border-slate-300">
                  <img src={capturedPhoto} alt="Captured" className="w-full h-auto" />
                </div>
                <div className="flex gap-4 justify-center">
                  <Button 
                    onClick={() => {
                      setCapturedPhoto(null);
                      startCamera();
                    }} 
                    variant="outline"
                  >
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Retake Photo
                  </Button>
                </div>
              </div>
            )}

            <canvas ref={canvasRef} className="hidden" />
          </div>

          {/* Duty Week Input */}
          <div className="space-y-2">
            <Label htmlFor="duty-week">Duty Week</Label>
            <Input
              id="duty-week"
              type="text"
              placeholder="Enter week (e.g., Week 1, Week 2)"
              value={dutyWeek}
              onChange={(e) => setDutyWeek(e.target.value)}
              className="max-w-md"
            />
            <p className="text-xs text-slate-500">Specify which week you are on gate duty</p>
          </div>

          {/* Student Selection */}
          <div className="space-y-4">
            <Label>Select Student</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                type="text"
                placeholder="Search by student name or class..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Search Results Dropdown */}
            {filteredStudents.length > 0 && (
              <Card className="max-h-64 overflow-y-auto">
                <CardContent className="p-2">
                  {filteredStudents.map((student) => (
                    <Button
                      key={student.id}
                      variant="ghost"
                      className="w-full justify-start p-3 h-auto"
                      onClick={() => {
                        setSelectedStudent(student);
                        setSearchQuery(`${student.first_name} ${student.last_name}`);
                        setFilteredStudents([]);
                      }}
                    >
                      <User className="h-4 w-4 mr-2 flex-shrink-0" />
                      <div className="text-left">
                        <div className="font-medium">
                          {student.first_name} {student.middle_name} {student.last_name}
                        </div>
                        <div className="text-xs text-slate-500">{student.class_name}</div>
                      </div>
                    </Button>
                  ))}
                </CardContent>
              </Card>
            )}

            {/* Selected Student Display */}
            {selectedStudent && (
              <Alert>
                <User className="h-4 w-4" />
                <AlertDescription>
                  <strong>{selectedStudent.first_name} {selectedStudent.last_name}</strong> - {selectedStudent.class_name}
                </AlertDescription>
              </Alert>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex gap-4">
            <Button
              onClick={handleClockIn}
              disabled={!selectedStudent || !capturedPhoto || loading}
              className="flex-1 bg-green-600 hover:bg-green-700"
              size="lg"
            >
              <LogIn className="h-5 w-5 mr-2" />
              Clock In
            </Button>
            <Button
              onClick={handleClockOut}
              disabled={!selectedStudent || !capturedPhoto || loading}
              className="flex-1 bg-blue-600 hover:bg-blue-700"
              size="lg"
            >
              <LogOutIcon className="h-5 w-5 mr-2" />
              Clock Out
            </Button>
          </div>

          {loading && (
            <Alert>
              <RefreshCw className="h-4 w-4 animate-spin" />
              <AlertDescription>Processing... Please wait.</AlertDescription>
            </Alert>
          )}
        </div>
      </div>

      {/* Today's Clock-In Records - App Style */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden mx-4 md:mx-0">
        <div className="p-5 border-b border-gray-100">
          <h2 className="font-semibold text-gray-900">Today's Activity ({todayRecords.length} records)</h2>
        </div>
        <div className="p-5">
          <div className="space-y-3 max-h-96 overflow-y-auto">{todayRecords.length === 0 ? (
              <p className="text-center text-slate-500 py-8 text-sm">No clock-in records yet today</p>
            ) : (
              todayRecords.map((record) => (
                <div
                  key={record.id}
                  className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-4 border rounded-lg hover:bg-slate-50 gap-3"
                >
                  {/* Left side: Icon + Student Info */}
                  <div className="flex items-start gap-3">
                    <div className={`h-10 w-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                      record.clock_out_time ? 'bg-blue-100' : 
                      record.late_arrival ? 'bg-amber-100' : 'bg-green-100'
                    }`}>
                      {record.clock_out_time ? (
                        <LogOutIcon className="h-5 w-5 text-blue-600" />
                      ) : record.late_arrival ? (
                        <AlertTriangle className="h-5 w-5 text-amber-600" />
                      ) : (
                        <CheckCircle className="h-5 w-5 text-green-600" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm sm:text-base">{record.student_name}</div>
                      <div className="text-xs text-slate-500 mt-0.5">{record.class_name}</div>
                      {record.week && (
                        <div className="text-xs text-slate-400 mt-1 flex items-center gap-1">
                          <CalendarIcon className="h-3 w-3" />
                          {record.week}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Right side: Time Info & Badge */}
                  <div className="flex items-center justify-between sm:justify-end gap-4 ml-13 sm:ml-0">
                    <div className="flex flex-col items-start sm:items-end gap-1">
                      {record.clock_in_time && (
                        <div className="flex items-center gap-1.5">
                          <LogIn className="h-3.5 w-3.5 text-green-600" />
                          <span className="text-sm font-medium">{formatTime(record.clock_in_time)}</span>
                        </div>
                      )}
                      {record.clock_out_time && (
                        <div className="flex items-center gap-1.5 text-slate-600">
                          <LogOutIcon className="h-3.5 w-3.5 text-blue-600" />
                          <span className="text-xs">{formatTime(record.clock_out_time)}</span>
                        </div>
                      )}
                    </div>
                    {record.late_arrival && (
                      <Badge variant="secondary" className="bg-amber-100 text-amber-700 text-xs px-2 py-0.5 flex-shrink-0">
                        LATE
                      </Badge>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}