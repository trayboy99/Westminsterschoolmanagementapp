import { useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';

interface SecurePDFViewerProps {
  blobUrl: string;
  className?: string;
}

export function SecurePDFViewer({ blobUrl, className = '' }: SecurePDFViewerProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    // Reset states when blob URL changes
    setLoading(true);
    setError(false);

    const timer = setTimeout(() => {
      setLoading(false);
    }, 1000);

    return () => clearTimeout(timer);
  }, [blobUrl]);

  return (
    <div className={`relative ${className}`}>
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-slate-50 z-10">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        </div>
      )}
      
      {error && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-50 z-10 p-8">
          <div className="text-center">
            <p className="text-red-600 font-medium mb-2">Failed to load PDF</p>
            <p className="text-slate-600 text-sm">Please try downloading the file instead</p>
          </div>
        </div>
      )}
      
      <div 
        className="w-full h-full bg-slate-50"
        style={{ 
          position: 'relative',
          overflow: 'hidden',
          isolation: 'isolate'
        }}
      >
        <iframe
          src={`${blobUrl}#toolbar=0&navpanes=0&scrollbar=0&statusbar=0&view=FitH`}
          className="w-full h-full border-0"
          title="PDF Viewer"
          style={{ 
            display: 'block',
            border: 'none',
            outline: 'none',
            background: '#f8fafc',
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%'
          }}
          onLoad={() => setLoading(false)}
          onError={() => {
            setError(true);
            setLoading(false);
          }}
          sandbox="allow-same-origin"
          scrolling="no"
        />
        
        {/* Transparent overlay to hide any UI elements that might show URLs */}
        <div 
          style={{ 
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: '40px',
            background: 'linear-gradient(to bottom, rgba(248, 250, 252, 0.98), transparent)',
            pointerEvents: 'none',
            zIndex: 2
          }}
        />
        <div 
          style={{ 
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            height: '40px',
            background: 'linear-gradient(to top, rgba(248, 250, 252, 0.98), transparent)',
            pointerEvents: 'none',
            zIndex: 2
          }}
        />
      </div>
    </div>
  );
}
