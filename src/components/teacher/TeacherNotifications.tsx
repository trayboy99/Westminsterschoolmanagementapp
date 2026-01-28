import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Bell, BellOff, Check, Upload, AlertCircle, X } from 'lucide-react';
import { createClient } from '../../utils/supabase/client';
import { projectId, publicAnonKey } from '../../utils/supabase/info';
import { formatDistanceToNow } from 'date-fns';

interface Notification {
  id: string;
  teacherId: string;
  teacherName: string;
  type: 'specific_upload' | 'general_compliance';
  uploadId: string | null;
  message: string;
  sentBy: string;
  sentAt: string;
  read: boolean;
}

interface TeacherNotificationsProps {
  userId: string;
  compact?: boolean;
}

export function TeacherNotifications({ userId, compact = false }: TeacherNotificationsProps) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showAll, setShowAll] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [errorCount, setErrorCount] = useState(0);
  const [isReady, setIsReady] = useState(false);
  const supabase = createClient();

  // First check if session is ready
  useEffect(() => {
    const checkSession = async () => {
      try {
        // Wait 1 second to ensure everything is fully loaded
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.access_token && session.user?.id) {
          // Double check by verifying the session is actually valid
          try {
            const { data: { user }, error } = await supabase.auth.getUser();
            if (!error && user) {
              console.log('[TeacherNotifications] Session verified, ready to fetch');
              setIsReady(true);
            } else {
              console.log('[TeacherNotifications] Session verification failed, not loading notifications');
              setLoading(false);
            }
          } catch (verifyError) {
            console.log('[TeacherNotifications] Session verification error, not loading notifications');
            setLoading(false);
          }
        } else {
          console.log('[TeacherNotifications] No valid session found, not loading notifications');
          setLoading(false);
        }
      } catch (error) {
        console.error('[TeacherNotifications] Error checking session:', error);
        setLoading(false);
      }
    };
    
    checkSession();
  }, []);

  useEffect(() => {
    if (!isReady) return;
    
    fetchNotifications();
    
    // Only refresh if we haven't had too many errors
    const interval = setInterval(() => {
      if (errorCount < 3) {
        fetchNotifications();
      }
    }, 60000); // Increased to 60 seconds
    return () => clearInterval(interval);
  }, [isReady, userId, errorCount]);

  const fetchNotifications = async () => {
    try {
      setHasError(false);
      
      // Get fresh session with refresh
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError) {
        console.error('[TeacherNotifications] Session error:', sessionError);
        setLoading(false);
        return;
      }
      
      if (!session) {
        console.log('[TeacherNotifications] No active session');
        setLoading(false);
        return;
      }

      // Validate projectId before making request
      if (!projectId) {
        console.error('[TeacherNotifications] projectId is undefined');
        setHasError(true);
        setLoading(false);
        return;
      }

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

      const res = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-1ddd013a/teacher-notifications`,
        {
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json'
          },
          signal: controller.signal
        }
      );

      clearTimeout(timeoutId);

      if (!res.ok) {
        const errorText = await res.text();
        console.error('[TeacherNotifications] Error response:', res.status, errorText);
        
        // If we get a 401, try to refresh the session once
        if (res.status === 401 && errorCount === 0) {
          console.log('[TeacherNotifications] Auth error, attempting to refresh session...');
          const { data: { session: newSession }, error: refreshError } = await supabase.auth.refreshSession();
          
          if (!refreshError && newSession) {
            console.log('[TeacherNotifications] Session refreshed, retrying...');
            setErrorCount(1); // Prevent infinite loop
            fetchNotifications();
            return;
          }
        }
        
        setHasError(true);
        setLoading(false);
        setErrorCount(prev => prev + 1);
        return;
      }

      const data = await res.json();
      
      if (data.success) {
        setNotifications(data.notifications || []);
        setUnreadCount(data.unreadCount || 0);
        setErrorCount(0); // Reset error count on success
      } else {
        console.error('[TeacherNotifications] API returned error:', data.error);
        setHasError(true);
      }
    } catch (error) {
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          console.error('[TeacherNotifications] Request timeout after 10 seconds');
        } else {
          console.error('[TeacherNotifications] Error fetching notifications:', error.message);
        }
      } else {
        console.error('[TeacherNotifications] Unknown error:', error);
      }
      setHasError(true);
      setErrorCount(prev => prev + 1);
      // Silently fail - notifications are not critical for app functionality
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (notificationId: string) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const res = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-1ddd013a/mark-notification-read`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ notificationId })
        }
      );
      
      if (res.ok) {
        // Update local state
        setNotifications(prev =>
          prev.map(n =>
            n.id === notificationId ? { ...n, read: true } : n
          )
        );
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const displayedNotifications = compact && !showAll 
    ? notifications.slice(0, 3) 
    : notifications;

  // Don't render anything if we're not ready yet (no valid session)
  if (!isReady && loading) {
    return null;
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // If we never got a valid session, don't show error, just don't render
  if (!isReady) {
    return null;
  }

  if (hasError) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BellOff className="h-5 w-5 text-slate-400" />
            Notifications
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-slate-500">
            <BellOff className="h-12 w-12 mx-auto mb-3 text-slate-300" />
            <p>Error loading notifications</p>
            <p className="text-sm mt-1">Please try again later.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (notifications.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BellOff className="h-5 w-5 text-slate-400" />
            Notifications
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-slate-500">
            <BellOff className="h-12 w-12 mx-auto mb-3 text-slate-300" />
            <p>No notifications yet</p>
            <p className="text-sm mt-1">You're all caught up!</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={unreadCount > 0 ? 'border-orange-200 bg-orange-50/30' : ''}>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bell className={`h-5 w-5 ${unreadCount > 0 ? 'text-orange-600 animate-pulse' : ''}`} />
            Notifications
            {unreadCount > 0 && (
              <Badge variant="destructive" className="ml-2 bg-orange-600">
                {unreadCount} New
              </Badge>
            )}
          </div>
          {notifications.length > 3 && compact && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowAll(!showAll)}
            >
              {showAll ? 'Show Less' : `View All (${notifications.length})`}
            </Button>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {displayedNotifications.map((notification) => (
            <div
              key={notification.id}
              className={`p-4 rounded-lg border-l-4 transition-all ${
                notification.read
                  ? 'bg-slate-50 border-slate-300'
                  : 'bg-orange-50 border-orange-500 shadow-sm'
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    {notification.type === 'specific_upload' ? (
                      <Upload className="h-4 w-4 text-orange-600" />
                    ) : (
                      <AlertCircle className="h-4 w-4 text-orange-600" />
                    )}
                    <span className="font-medium text-sm">
                      {notification.type === 'specific_upload'
                        ? 'Upload Reminder'
                        : 'Compliance Reminder'}
                    </span>
                    {!notification.read && (
                      <Badge variant="secondary" className="text-xs bg-orange-100 text-orange-800">
                        New
                      </Badge>
                    )}
                  </div>
                  
                  <p className="text-sm text-slate-700 mb-2">
                    {notification.message}
                  </p>
                  
                  <div className="flex items-center gap-3 text-xs text-slate-500">
                    <span>From: {notification.sentBy}</span>
                    <span>•</span>
                    <span>{formatDistanceToNow(new Date(notification.sentAt), { addSuffix: true })}</span>
                  </div>
                </div>

                {!notification.read && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0 hover:bg-green-100"
                    onClick={() => markAsRead(notification.id)}
                    title="Mark as read"
                  >
                    <Check className="h-4 w-4 text-green-600" />
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}