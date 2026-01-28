import { useEffect, useState } from 'react';
import { Card } from './ui/card';
import { X, PartyPopper, Sparkles, Trophy, GraduationCap } from 'lucide-react';
import { createClient } from '../utils/supabase/client';
import { projectId } from '../utils/supabase/info';
import { motion } from 'motion/react';

interface PromotionBannerProps {
  userId: string;
  userRole: 'student' | 'teacher';
}

interface PromotionInfo {
  isPromoted: boolean;
  fromClass: string;
  toClass: string;
  newSession: string;
  promotedAt: string;
  isGraduation?: boolean;
}

interface SessionWelcome {
  isNewSession: boolean;
  currentSession: string;
  isClassTeacher: boolean;
  className?: string;
  newStudentCount?: number;
}

export function PromotionBanner({ userId, userRole }: PromotionBannerProps) {
  const [promotionInfo, setPromotionInfo] = useState<PromotionInfo | null>(null);
  const [sessionWelcome, setSessionWelcome] = useState<SessionWelcome | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const [loading, setLoading] = useState(true);

  const supabase = createClient();

  useEffect(() => {
    fetchPromotionStatus();
    
    // Check if user dismissed the banner in this session
    const dismissedKey = `banner_dismissed_${userId}_${userRole}`;
    const wasDismissed = sessionStorage.getItem(dismissedKey);
    if (wasDismissed) {
      setDismissed(true);
    }
  }, [userId, userRole]);

  const fetchPromotionStatus = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        console.log('[PromotionBanner] No session found');
        return;
      }

      console.log('[PromotionBanner] ===== STARTING PROMOTION CHECK =====');
      console.log('[PromotionBanner] User ID:', userId);
      console.log('[PromotionBanner] User Role:', userRole);
      console.log('[PromotionBanner] Current Time:', new Date().toISOString());

      // Check for recent promotion (within last 4 weeks = 28 days)
      const fourWeeksAgo = new Date();
      fourWeeksAgo.setDate(fourWeeksAgo.getDate() - 28);
      console.log('[PromotionBanner] Checking promotions since:', fourWeeksAgo.toISOString());
      console.log('[PromotionBanner] That is', Math.floor((new Date().getTime() - fourWeeksAgo.getTime()) / (1000 * 60 * 60 * 24)), 'days ago');

      if (userRole === 'student') {
        // Get student's current class to verify promotion is active
        // Use maybeSingle() to avoid 406 error if RLS blocks it
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('class_id')
          .eq('id', userId)
          .maybeSingle();

        console.log('[PromotionBanner] Student profile:', profileData);
        if (profileError) {
          console.error('[PromotionBanner] Profile fetch error:', profileError);
        }

        // If RLS blocks profile fetch, try getting from server
        let profile = profileData;
        if (!profile && session) {
          try {
            console.log('[PromotionBanner] Profile blocked by RLS, fetching via server...');
            const response = await fetch(
              `https://${projectId}.supabase.co/functions/v1/make-server-1ddd013a/user-profile/${userId}`,
              {
                headers: {
                  Authorization: `Bearer ${session.access_token}`,
                  'Content-Type': 'application/json'
                }
              }
            );
            if (response.ok) {
              const data = await response.json();
              profile = { class_id: data.class_id };
              console.log('[PromotionBanner] ✅ Got profile from server:', profile);
            }
          } catch (err) {
            console.error('[PromotionBanner] Server profile fetch failed:', err);
          }
        }

        // Fetch student's recent promotion (must be active, not reverted)
        console.log('[PromotionBanner] 🔍 Querying promotions table with:');
        console.log('  - student_id:', userId);
        console.log('  - is_reverted: false');
        console.log('  - promoted_at >=', fourWeeksAgo.toISOString());
        
        const { data: promotion, error: promotionError } = await supabase
          .from('promotions')
          .select('*')
          .eq('student_id', userId)
          .eq('is_reverted', false)  // Only active promotions
          .gte('promoted_at', fourWeeksAgo.toISOString())
          .order('promoted_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        console.log('[PromotionBanner] 📊 Query completed!');
        console.log('[PromotionBanner] Promotion data:', JSON.stringify(promotion, null, 2));
        console.log('[PromotionBanner] Promotion error:', promotionError);
        
        if (promotionError) {
          console.log('[PromotionBanner] ❌ Error details:', {
            message: promotionError.message,
            code: promotionError.code,
            details: promotionError.details,
            hint: promotionError.hint
          });
        }

        // If we have a promotion, fetch the class names via server (bypasses RLS)
        if (promotion) {
          console.log('[PromotionBanner] 📋 Promotion record found:', {
            from_class_id: promotion.from_class_id,
            to_class_id: promotion.to_class_id,
            is_graduation: promotion.is_graduation
          });

          try {
            // Fetch class names from server
            const response = await fetch(
              `https://${projectId}.supabase.co/functions/v1/make-server-1ddd013a/promotion-classes`,
              {
                method: 'POST',
                headers: {
                  Authorization: `Bearer ${session.access_token}`,
                  'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                  from_class_id: promotion.from_class_id,
                  to_class_id: promotion.to_class_id
                })
              }
            );

            if (response.ok) {
              const classData = await response.json();
              console.log('[PromotionBanner] ✅ Class names from server:', classData);
              
              promotion.from_class = { name: classData.from_class || 'Previous Class' };
              promotion.to_class = { name: classData.to_class || 'Graduated' };
            } else {
              console.error('[PromotionBanner] ❌ Server class fetch failed:', response.status);
              // Fallback to defaults
              promotion.from_class = { name: 'Previous Class' };
              promotion.to_class = { name: promotion.to_class_id ? 'Next Class' : 'Graduated' };
            }
          } catch (error) {
            console.error('[PromotionBanner] ❌ Error fetching class names:', error);
            // Fallback to defaults
            promotion.from_class = { name: 'Previous Class' };
            promotion.to_class = { name: promotion.to_class_id ? 'Next Class' : 'Graduated' };
          }

          console.log('[PromotionBanner] 🎯 Final class names:', {
            from: promotion.from_class?.name,
            to: promotion.to_class?.name
          });
        }

        // Show banner only if promotion is active AND student is in the promoted class
        if (promotion && !promotion.is_reverted) {
          console.log('[PromotionBanner] Found active promotion:', {
            from_class_id: promotion.from_class_id,
            to_class_id: promotion.to_class_id,
            current_class_id: profile?.class_id,
            is_reverted: promotion.is_reverted,
            promoted_at: promotion.promoted_at
          });

          // Verify student is actually in the new class (not reverted)
          const isInPromotedClass = promotion.to_class_id 
            ? promotion.to_class_id === profile?.class_id
            : !profile?.class_id; // Graduated students have null class_id

          console.log('[PromotionBanner] Class match check:', {
            promotion_target: promotion.to_class_id,
            student_current: profile?.class_id,
            matches: isInPromotedClass
          });

          if (isInPromotedClass) {
            console.log('[PromotionBanner] ✅ Student promoted - SHOWING BANNER:', {
              from: promotion.from_class?.name,
              to: promotion.to_class?.name || 'Graduated',
              date: promotion.promoted_at
            });

            setPromotionInfo({
              isPromoted: true,
              fromClass: promotion.from_class?.name || 'Previous Class',
              toClass: promotion.to_class?.name || 'Graduated',
              newSession: promotion.new_session,
              promotedAt: promotion.promoted_at,
              isGraduation: promotion.is_graduation
            });
          } else {
            console.log('[PromotionBanner] ❌ Promotion exists but student not in promoted class (likely reverted)');
          }
        } else {
          console.log('[PromotionBanner] No active promotion found within 28 days');
        }
      } else if (userRole === 'teacher') {
        // Fetch teacher's class assignment and session info
        const { data: profile } = await supabase
          .from('profiles')
          .select('class_id')
          .eq('id', userId)
          .single();

        if (profile?.class_id) {
          // Teacher is a class teacher
          const { data: classInfo } = await supabase
            .from('classes')
            .select('name')
            .eq('id', profile.class_id)
            .single();

          // Count new students promoted into this class recently
          const { count: newStudents } = await supabase
            .from('promotions')
            .select('*', { count: 'exact', head: true })
            .eq('to_class_id', profile.class_id)
            .gte('promoted_at', fourWeeksAgo.toISOString())
            .eq('is_reverted', false);

          // Get current session
          const { data: { session: authSession } } = await supabase.auth.getSession();
          if (authSession) {
            const response = await fetch(
              `https://${projectId}.supabase.co/functions/v1/make-server-1ddd013a/session-settings`,
              {
                headers: {
                  Authorization: `Bearer ${authSession.access_token}`,
                  'Content-Type': 'application/json'
                }
              }
            );
            const data = await response.json();
            const activeSession = data.sessions?.find((s: any) => s.is_current);

            setSessionWelcome({
              isNewSession: true,
              currentSession: activeSession?.session_name || '',
              isClassTeacher: true,
              className: classInfo?.name,
              newStudentCount: newStudents || 0
            });
          }
        } else {
          // Regular teacher (not class teacher)
          const { data: { session: authSession } } = await supabase.auth.getSession();
          if (authSession) {
            const response = await fetch(
              `https://${projectId}.supabase.co/functions/v1/make-server-1ddd013a/session-settings`,
              {
                headers: {
                  Authorization: `Bearer ${authSession.access_token}`,
                  'Content-Type': 'application/json'
                }
              }
            );
            const data = await response.json();
            const activeSession = data.sessions?.find((s: any) => s.is_current);

            setSessionWelcome({
              isNewSession: true,
              currentSession: activeSession?.session_name || '',
              isClassTeacher: false
            });
          }
        }
      }
    } catch (error) {
      console.error('[PromotionBanner] Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDismiss = () => {
    setDismissed(true);
    const dismissedKey = `banner_dismissed_${userId}_${userRole}`;
    sessionStorage.setItem(dismissedKey, 'true');
  };

  if (loading || dismissed) return null;

  // Student Promotion Banner
  if (userRole === 'student' && promotionInfo?.isPromoted) {
    return (
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <Card className="relative overflow-hidden bg-gradient-to-r from-green-50 via-emerald-50 to-teal-50 border-green-300 shadow-lg">
          <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-green-200/30 to-transparent rounded-full -translate-y-32 translate-x-32"></div>
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-gradient-to-tr from-emerald-200/30 to-transparent rounded-full translate-y-24 -translate-x-24"></div>
          
          <div className="relative p-6 md:p-8">
            <button
              onClick={handleDismiss}
              className="absolute top-4 right-4 p-1 rounded-full hover:bg-white/50 transition-colors"
              aria-label="Dismiss banner"
            >
              <X className="h-5 w-5 text-slate-600" />
            </button>

            <div className="flex flex-col md:flex-row items-start md:items-center gap-4">
              {/* Animated Icon */}
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
                className="flex-shrink-0"
              >
                <div className="relative">
                  <div className="absolute inset-0 bg-gradient-to-br from-yellow-400 to-orange-400 rounded-full blur-xl opacity-50"></div>
                  <div className="relative p-4 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full">
                    {promotionInfo.isGraduation ? (
                      <GraduationCap className="h-10 w-10 md:h-12 md:w-12 text-white" />
                    ) : (
                      <Trophy className="h-10 w-10 md:h-12 md:w-12 text-white" />
                    )}
                  </div>
                  {/* Sparkles */}
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
                    className="absolute -top-1 -right-1"
                  >
                    <Sparkles className="h-6 w-6 text-yellow-400" />
                  </motion.div>
                </div>
              </motion.div>

              {/* Content */}
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <h3 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
                    🎉 Congratulations!
                  </h3>
                </div>
                
                <p className="text-lg md:text-xl text-slate-800 mb-1">
                  {promotionInfo.isGraduation ? (
                    <>You have <span className="font-bold text-purple-600">Graduated</span>!</>
                  ) : (
                    <>You have been <span className="font-bold text-green-600">Promoted</span> to </>
                  )}
                </p>
                
                {!promotionInfo.isGraduation && (
                  <div className="flex items-center gap-2 mt-2">
                    <span className="px-3 py-1.5 bg-white/70 rounded-full text-sm font-medium text-slate-600">
                      From: {promotionInfo.fromClass}
                    </span>
                    <span className="text-green-600">→</span>
                    <span className="px-3 py-1.5 bg-gradient-to-r from-green-500 to-emerald-500 rounded-full text-sm font-bold text-white shadow-md">
                      To: {promotionInfo.toClass}
                    </span>
                  </div>
                )}

                <p className="text-sm text-slate-600 mt-3">
                  <span className="inline-flex items-center gap-1">
                    <Sparkles className="h-4 w-4 text-yellow-500" />
                    Welcome to the {promotionInfo.newSession} Academic Session!
                  </span>
                </p>
              </div>

              {/* Sticker/Emoji */}
              <div className="hidden lg:block flex-shrink-0">
                <motion.div
                  animate={{ 
                    y: [0, -10, 0],
                    rotate: [0, 5, -5, 0]
                  }}
                  transition={{ 
                    duration: 2,
                    repeat: Infinity,
                    ease: 'easeInOut'
                  }}
                  className="text-6xl"
                >
                  {promotionInfo.isGraduation ? '🎓' : '🌟'}
                </motion.div>
              </div>
            </div>
          </div>
        </Card>
      </motion.div>
    );
  }

  // Teacher Welcome Banner
  if (userRole === 'teacher' && sessionWelcome?.isNewSession) {
    return (
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <Card className="relative overflow-hidden bg-gradient-to-r from-blue-50 via-indigo-50 to-purple-50 border-blue-300 shadow-lg">
          <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-blue-200/30 to-transparent rounded-full -translate-y-32 translate-x-32"></div>
          
          <div className="relative p-6 md:p-8">
            <button
              onClick={handleDismiss}
              className="absolute top-4 right-4 p-1 rounded-full hover:bg-white/50 transition-colors"
              aria-label="Dismiss banner"
            >
              <X className="h-5 w-5 text-slate-600" />
            </button>

            <div className="flex flex-col md:flex-row items-start md:items-center gap-4">
              {/* Icon */}
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
                className="flex-shrink-0"
              >
                <div className="p-4 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full">
                  <PartyPopper className="h-10 w-10 md:h-12 md:w-12 text-white" />
                </div>
              </motion.div>

              {/* Content */}
              <div className="flex-1">
                <h3 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent mb-2">
                  Welcome to {sessionWelcome.currentSession}!
                </h3>
                
                {sessionWelcome.isClassTeacher ? (
                  <>
                    <p className="text-lg text-slate-800 mb-2">
                      You are the <span className="font-bold text-blue-600">Class Teacher</span> for{' '}
                      <span className="font-bold">{sessionWelcome.className}</span>
                    </p>
                    
                    {sessionWelcome.newStudentCount && sessionWelcome.newStudentCount > 0 ? (
                      <div className="mt-3 p-3 bg-white/70 rounded-lg border border-blue-200">
                        <p className="text-sm text-slate-700">
                          <span className="inline-flex items-center gap-1">
                            <Sparkles className="h-4 w-4 text-blue-500" />
                            <span className="font-medium text-blue-600">
                              {sessionWelcome.newStudentCount} new student{sessionWelcome.newStudentCount > 1 ? 's have' : ' has'}
                            </span>
                            {' '}been promoted into your class!
                          </span>
                        </p>
                      </div>
                    ) : (
                      <p className="text-sm text-slate-600 mt-2">
                        Ready to guide your students through another successful year!
                      </p>
                    )}
                  </>
                ) : (
                  <p className="text-lg text-slate-700">
                    Wishing you a productive and successful academic session!
                  </p>
                )}
              </div>

              {/* Emoji */}
              <div className="hidden lg:block flex-shrink-0">
                <motion.div
                  animate={{ 
                    y: [0, -8, 0],
                    rotate: [0, 10, -10, 0]
                  }}
                  transition={{ 
                    duration: 2.5,
                    repeat: Infinity,
                    ease: 'easeInOut'
                  }}
                  className="text-6xl"
                >
                  {sessionWelcome.isClassTeacher ? '👨‍🏫' : '📚'}
                </motion.div>
              </div>
            </div>
          </div>
        </Card>
      </motion.div>
    );
  }

  return null;
}
