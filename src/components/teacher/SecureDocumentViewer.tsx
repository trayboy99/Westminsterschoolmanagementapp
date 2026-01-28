import { useState, useEffect } from 'react';
import { Loader2, Download, FileText } from 'lucide-react';
import { Button } from '../ui/button';

interface SecureDocumentViewerProps {
  blobUrl: string;
  fileName: string;
  fileType: string;
  className?: string;
}

export function SecureDocumentViewer({ blobUrl, fileName, fileType, className = '' }: SecureDocumentViewerProps) {
  const [loading, setLoading] = useState(false);
  
  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = blobUrl;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  useEffect(() => {
    // No loading needed for download-only approach
    setLoading(false);
  }, [blobUrl, fileType]);

  return (
    <div className={`relative ${className} flex items-center justify-center bg-slate-50`}>
      {loading && (
        <div className="flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        </div>
      )}
      
      {!loading && (
        <div className="text-center p-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full mb-4">
            <FileText className="h-8 w-8 text-blue-600" />
          </div>
          <h3 className="text-lg font-medium text-slate-900 mb-2">
            {fileName}
          </h3>
          <p className="text-sm text-slate-600 mb-4">
            Word documents cannot be previewed in the browser.
          </p>
          <Button 
            onClick={handleDownload}
            className="inline-flex items-center gap-2"
          >
            <Download className="h-4 w-4" />
            Download Document
          </Button>
        </div>
      )}
    </div>
  );
}
