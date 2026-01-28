import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '../ui/pagination';
import { Key, Eye, EyeOff, Copy, CheckCircle, AlertCircle, Clock } from 'lucide-react';
import { createClient } from '../../utils/supabase/client';
import { projectId } from '../../utils/supabase/info';
import { toast } from 'sonner@2.0.3';

interface ResultPin {
  id: string;
  pin_code: string;
  term: string;
  session: string;
  active: boolean;
  expires_at: string;
  created_at: string;
  usage_count?: number;
  last_used_at?: string;
}

export function ResultPinViewer() {
  const [pins, setPins] = useState<ResultPin[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [visiblePins, setVisiblePins] = useState<Set<string>>(new Set());
  const [currentPage, setCurrentPage] = useState(1);
  const pinsPerPage = 5;

  const supabase = createClient();

  useEffect(() => {
    fetchPins();
  }, []);

  const fetchPins = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        console.log('[ResultPinViewer] No session found');
        return;
      }

      const headers = {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json'
      };

      const res = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-1ddd013a/student-result-pins`,
        { headers }
      );
      const result = await res.json();
      
      if (result.success) {
        setPins(result.pins || []);
      } else {
        toast.error(result.error || 'Failed to load result PINs');
      }
    } catch (error) {
      console.error('[ResultPinViewer] Error:', error);
      toast.error('Failed to load result PINs');
    } finally {
      setLoading(false);
    }
  };

  const generatePin = async () => {
    try {
      setGenerating(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error('Session expired. Please log in again.');
        return;
      }

      const headers = {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json'
      };

      const res = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-1ddd013a/generate-result-pin`,
        {
          method: 'POST',
          headers
        }
      );
      const result = await res.json();
      
      if (result.success) {
        toast.success('Result PIN generated successfully!');
        await fetchPins();
      } else {
        // Handle active PIN error with detailed message
        if (result.hasActivePin) {
          const { usage_count, remaining_uses, expires_at } = result.activePin || {};
          const expiryDate = new Date(expires_at).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
          });
          
          toast.error(
            `You already have an active PIN!\n\n` +
            `• Used: ${usage_count}/3 times\n` +
            `• Remaining uses: ${remaining_uses}\n` +
            `• Expires: ${expiryDate}\n\n` +
            `You can only generate a new PIN when your current one expires or is fully used.`,
            { duration: 8000 }
          );
        } else {
          toast.error(result.error || 'Failed to generate result PIN');
        }
      }
    } catch (error) {
      console.error('[ResultPinViewer] Generate error:', error);
      toast.error('Failed to generate result PIN');
    } finally {
      setGenerating(false);
    }
  };

  const togglePinVisibility = (pinId: string) => {
    setVisiblePins(prev => {
      const newSet = new Set(prev);
      if (newSet.has(pinId)) {
        newSet.delete(pinId);
      } else {
        newSet.add(pinId);
      }
      return newSet;
    });
  };

  const copyToClipboard = async (pin: string) => {
    try {
      // Try modern Clipboard API first
      await navigator.clipboard.writeText(pin);
      toast.success('PIN copied to clipboard!');
    } catch (error) {
      // Fallback to older method if Clipboard API is blocked
      try {
        const textArea = document.createElement('textarea');
        textArea.value = pin;
        textArea.style.position = 'fixed';
        textArea.style.left = '-999999px';
        textArea.style.top = '-999999px';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        
        const successful = document.execCommand('copy');
        document.body.removeChild(textArea);
        
        if (successful) {
          toast.success('PIN copied to clipboard!');
        } else {
          toast.error('Failed to copy PIN. Please copy manually.');
        }
      } catch (fallbackError) {
        console.error('Copy failed:', fallbackError);
        toast.error('Failed to copy PIN. Please copy manually.');
      }
    }
  };

  const maskPin = (pin: string) => {
    return '•'.repeat(pin.length);
  };

  const isPinExpired = (expiresAt: string) => {
    return new Date(expiresAt) <= new Date();
  };

  const getPinStatus = (pin: ResultPin) => {
    if (!pin.active) return { label: 'Inactive', variant: 'secondary' as const };
    if (isPinExpired(pin.expires_at)) return { label: 'Expired', variant: 'destructive' as const };
    return { label: 'Active', variant: 'default' as const };
  };

  // Check if student has any valid active PIN
  const hasValidActivePin = () => {
    return pins.some(pin => {
      const notExpired = !isPinExpired(pin.expires_at);
      const hasUsesRemaining = (pin.usage_count || 0) < 3;
      return pin.active && notExpired && hasUsesRemaining;
    });
  };

  // Get the active PIN details for display
  const getActivePinInfo = () => {
    const activePin = pins.find(pin => {
      const notExpired = !isPinExpired(pin.expires_at);
      const hasUsesRemaining = (pin.usage_count || 0) < 3;
      return pin.active && notExpired && hasUsesRemaining;
    });
    if (activePin) {
      const remainingUses = 3 - (activePin.usage_count || 0);
      const expiryDate = new Date(activePin.expires_at).toLocaleDateString();
      return { remainingUses, expiryDate };
    }
    return null;
  };

  // Pagination calculations
  const totalPages = Math.ceil(pins.length / pinsPerPage);
  const startIndex = (currentPage - 1) * pinsPerPage;
  const endIndex = startIndex + pinsPerPage;
  const currentPins = pins.slice(startIndex, endIndex);

  // Reset to page 1 if current page is out of bounds after pins update
  useEffect(() => {
    if (currentPage > totalPages && totalPages > 0) {
      setCurrentPage(1);
    }
  }, [pins.length, currentPage, totalPages]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl flex items-center gap-2">
            <Key className="h-6 w-6 md:h-8 md:w-8" />
            Result PIN Viewer
          </h1>
          <p className="text-slate-600 mt-2 text-sm md:text-base">Generate and manage your result access PINs</p>
        </div>
        <div className="flex flex-col items-start md:items-end gap-2">
          <Button 
            onClick={generatePin} 
            disabled={generating || hasValidActivePin()}
            className="gap-2 w-full md:w-auto"
          >
            <Key className="h-4 w-4" />
            {generating ? 'Generating...' : 'Generate New PIN'}
          </Button>
          {hasValidActivePin() && !generating && (
            <p className="text-xs text-slate-500 md:text-right md:max-w-xs">
              You have an active PIN with {getActivePinInfo()?.remainingUses} use(s) left (expires {getActivePinInfo()?.expiryDate})
            </p>
          )}
        </div>
      </div>

      {/* Active PIN Warning */}
      {hasValidActivePin() && (
        <Card className="bg-green-50 border-green-200">
          <CardContent className="p-3 md:p-4">
            <div className="flex items-start gap-2 md:gap-3">
              <CheckCircle className="h-4 w-4 md:h-5 md:w-5 text-green-600 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <p className="text-xs md:text-sm text-green-900">
                  <strong>You have an active PIN!</strong> Your current PIN has <strong>{getActivePinInfo()?.remainingUses} use(s)</strong> remaining 
                  and expires on <strong>{getActivePinInfo()?.expiryDate}</strong>. 
                  You can only generate a new PIN when your current one expires or is fully used.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Info Card */}
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="p-3 md:p-4">
          <div className="flex items-start gap-2 md:gap-3">
            <AlertCircle className="h-4 w-4 md:h-5 md:w-5 text-blue-600 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-xs md:text-sm text-blue-900">
                <strong>About Result PINs:</strong> Each PIN can be used <strong>3 times</strong> and is valid for 30 days. 
                After 3 uses or expiry, it becomes inactive and you'll need to generate a new PIN. 
                Keep your PINs safe and don't share them with others.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs md:text-sm text-slate-600">Total PINs</p>
                <p className="text-2xl md:text-3xl mt-1 md:mt-2">{pins.length}</p>
              </div>
              <div className="p-2 md:p-3 bg-blue-100 rounded-lg">
                <Key className="h-5 w-5 md:h-6 md:w-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs md:text-sm text-slate-600">Active PINs</p>
                <p className="text-2xl md:text-3xl mt-1 md:mt-2">
                  {pins.filter(p => p.active && !isPinExpired(p.expires_at)).length}
                </p>
              </div>
              <div className="p-2 md:p-3 bg-green-100 rounded-lg">
                <CheckCircle className="h-5 w-5 md:h-6 md:w-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs md:text-sm text-slate-600">Inactive/Expired</p>
                <p className="text-2xl md:text-3xl mt-1 md:mt-2">
                  {pins.filter(p => !p.active || isPinExpired(p.expires_at)).length}
                </p>
              </div>
              <div className="p-2 md:p-3 bg-slate-100 rounded-lg">
                <Clock className="h-5 w-5 md:h-6 md:w-6 text-slate-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* PINs List */}
      <Card>
        <CardHeader className="p-4">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
            <CardTitle className="text-lg md:text-xl">Your Result PINs</CardTitle>
            {pins.length > 0 && (
              <p className="text-xs md:text-sm text-slate-500">
                Showing {startIndex + 1}-{Math.min(endIndex, pins.length)} of {pins.length} PINs
              </p>
            )}
          </div>
        </CardHeader>
        <CardContent className="p-4">
          {pins.length > 0 ? (
            <div className="space-y-3">
              {currentPins.map((pin) => {
                const status = getPinStatus(pin);
                const isExpired = isPinExpired(pin.expires_at);
                
                return (
                  <div 
                    key={pin.id} 
                    className={`p-3 md:p-4 border rounded-lg ${
                      !pin.active || isExpired ? 'bg-slate-50' : 'bg-white'
                    }`}
                  >
                    {/* Mobile-First Layout */}
                    <div className="space-y-3">
                      {/* PIN Input with Eye/Copy Buttons - Full Width on Mobile */}
                      <div className="flex items-center gap-2">
                        <Input
                          type="text"
                          value={visiblePins.has(pin.id) ? pin.pin_code : maskPin(pin.pin_code)}
                          readOnly
                          className="flex-1 font-mono text-sm md:text-base"
                        />
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => togglePinVisibility(pin.id)}
                          className="flex-shrink-0"
                        >
                          {visiblePins.has(pin.id) ? (
                            <EyeOff className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => copyToClipboard(pin.pin_code)}
                          className="flex-shrink-0"
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                      </div>

                      {/* Badges Row */}
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant={status.variant} className="text-xs">
                          {status.label}
                        </Badge>
                        <Badge 
                          variant={
                            (pin.usage_count || 0) >= 3 ? "destructive" : 
                            (pin.usage_count || 0) >= 2 ? "default" : 
                            "secondary"
                          }
                          className="text-xs"
                        >
                          {pin.usage_count || 0} / 3 uses
                        </Badge>
                      </div>

                      {/* Term and Session */}
                      <div className="text-sm md:text-base text-slate-700">
                        {pin.term} - {pin.session}
                      </div>

                      {/* Dates Grid - Stacked on Mobile, Side by Side on Desktop */}
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 text-xs md:text-sm text-slate-600">
                        <div className="flex flex-col">
                          <span className="text-slate-500">Created:</span>
                          <span className="font-medium">{new Date(pin.created_at).toLocaleDateString()}</span>
                        </div>
                        
                        <div className="flex flex-col">
                          <span className="text-slate-500">{isExpired ? 'Expired:' : 'Expires:'}</span>
                          <span className={`font-medium ${isExpired ? 'text-red-600' : ''}`}>
                            {new Date(pin.expires_at).toLocaleDateString()}
                          </span>
                        </div>

                        {pin.last_used_at && (
                          <div className="flex flex-col">
                            <span className="text-slate-500">Last used:</span>
                            <span className="font-medium text-blue-600">
                              {new Date(pin.last_used_at).toLocaleDateString()}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-12">
              <Key className="h-12 w-12 text-slate-300 mx-auto mb-4" />
              <p className="text-slate-500">No result PINs generated yet</p>
              <p className="text-sm text-slate-400 mt-2">
                Click "Generate New PIN" to create your first result access PIN
              </p>
            </div>
          )}

          {/* Pagination */}
          {pins.length > pinsPerPage && (
            <div className="mt-4 flex justify-center">
              <Pagination>
                <PaginationContent className="gap-1">
                  <PaginationItem>
                    <PaginationPrevious 
                      onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                      className={currentPage === 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                    />
                  </PaginationItem>
                  
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => {
                    // Show first page, last page, current page, and pages around current
                    if (
                      page === 1 ||
                      page === totalPages ||
                      (page >= currentPage - 1 && page <= currentPage + 1)
                    ) {
                      return (
                        <PaginationItem key={page}>
                          <PaginationLink
                            onClick={() => setCurrentPage(page)}
                            isActive={currentPage === page}
                            className="cursor-pointer"
                          >
                            {page}
                          </PaginationLink>
                        </PaginationItem>
                      );
                    } else if (
                      page === currentPage - 2 ||
                      page === currentPage + 2
                    ) {
                      return (
                        <PaginationItem key={page}>
                          <PaginationEllipsis />
                        </PaginationItem>
                      );
                    }
                    return null;
                  })}
                  
                  <PaginationItem>
                    <PaginationNext 
                      onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                      className={currentPage === totalPages ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                    />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
