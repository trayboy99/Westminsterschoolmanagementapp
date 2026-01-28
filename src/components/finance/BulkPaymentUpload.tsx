import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { toast } from 'sonner';
import { Upload, Download, Loader2, AlertCircle } from 'lucide-react';
import { projectId } from '../../utils/supabase/info';
import { Alert, AlertDescription } from '../ui/alert';

export default function BulkPaymentUpload() {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<any[]>([]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    if (!selectedFile.name.endsWith('.csv') && !selectedFile.name.endsWith('.xlsx')) {
      toast.error('Please upload a CSV or Excel file');
      return;
    }

    setFile(selectedFile);
    parseFile(selectedFile);
  };

  const parseFile = async (file: File) => {
    try {
      const text = await file.text();
      const lines = text.split('\n').filter(line => line.trim());
      
      if (lines.length < 2) {
        toast.error('File must contain headers and at least one data row');
        return;
      }

      // Parse CSV (simple parser - could use a library like papaparse)
      const headers = lines[0].split(',').map(h => h.trim());
      const data = lines.slice(1, 6).map(line => {
        const values = line.split(',').map(v => v.trim());
        const row: any = {};
        headers.forEach((header, index) => {
          row[header] = values[index];
        });
        return row;
      });

      setPreview(data);
      toast.success(`Preview: ${data.length} records (showing first 5)`);
    } catch (error) {
      console.error('Error parsing file:', error);
      toast.error('Failed to parse file');
    }
  };

  const handleUpload = async () => {
    if (!file) {
      toast.error('Please select a file first');
      return;
    }

    try {
      setUploading(true);
      const text = await file.text();
      const lines = text.split('\n').filter(line => line.trim());
      
      if (lines.length < 2) {
        toast.error('File must contain data');
        return;
      }

      // Parse all data
      const headers = lines[0].split(',').map(h => h.trim());
      const payments = lines.slice(1).map(line => {
        const values = line.split(',').map(v => v.trim());
        const row: any = {};
        headers.forEach((header, index) => {
          row[header] = values[index];
        });
        return {
          student_id: row.student_id || row.Student_ID,
          academic_year: row.academic_year || row.Academic_Year,
          term: row.term || row.Term,
          amount_paid: row.amount_paid || row.Amount_Paid,
          payment_date: row.payment_date || row.Payment_Date,
          payment_method: row.payment_method || row.Payment_Method || 'bank_transfer',
          receipt_number: row.receipt_number || row.Receipt_Number || null,
          notes: row.notes || row.Notes || null,
        };
      });

      const token = localStorage.getItem('auth_token');
      if (!token) {
        toast.error('Authentication required');
        return;
      }

      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-1ddd013a/finance/payments/bulk`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ payments }),
        }
      );

      const data = await response.json();

      if (data.success) {
        toast.success(`Successfully uploaded ${data.count} payments`);
        setFile(null);
        setPreview([]);
        // Reset file input
        const fileInput = document.getElementById('file-upload') as HTMLInputElement;
        if (fileInput) fileInput.value = '';
      } else {
        toast.error(data.error || 'Failed to upload payments');
      }
    } catch (error) {
      console.error('Error uploading file:', error);
      toast.error('An error occurred while uploading');
    } finally {
      setUploading(false);
    }
  };

  const downloadTemplate = () => {
    const template = `student_id,academic_year,term,amount_paid,payment_date,payment_method,receipt_number,notes
123e4567-e89b-12d3-a456-426614174000,2024/2025,First Term,50000,2024-11-01,bank_transfer,RCP001,Payment for term fees
123e4567-e89b-12d3-a456-426614174001,2024/2025,First Term,45000,2024-11-02,cash,RCP002,Partial payment`;

    const blob = new Blob([template], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'payment_upload_template.csv';
    a.click();
    URL.revokeObjectURL(url);
    
    toast.success('Template downloaded');
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Bulk Payment Upload</CardTitle>
        <CardDescription>
          Upload multiple payment records at once using CSV or Excel file
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <strong>Required columns:</strong> student_id, academic_year, term, amount_paid, payment_date, payment_method
            <br />
            <strong>Optional columns:</strong> receipt_number, notes
          </AlertDescription>
        </Alert>

        <div className="flex flex-col sm:flex-row gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={downloadTemplate}
            className="flex-1"
          >
            <Download className="h-4 w-4 mr-2" />
            Download Template
          </Button>
        </div>

        <div className="border-2 border-dashed rounded-lg p-6 text-center">
          <input
            id="file-upload"
            type="file"
            accept=".csv,.xlsx"
            onChange={handleFileChange}
            className="hidden"
          />
          <label
            htmlFor="file-upload"
            className="cursor-pointer flex flex-col items-center gap-2"
          >
            <Upload className="h-12 w-12 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              {file ? file.name : 'Click to upload CSV or Excel file'}
            </p>
            <p className="text-xs text-muted-foreground">
              Maximum file size: 10MB
            </p>
          </label>
        </div>

        {preview.length > 0 && (
          <div className="space-y-2">
            <h3 className="font-semibold">Preview (First 5 records)</h3>
            <div className="border rounded-lg overflow-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 text-left">Student ID</th>
                    <th className="px-4 py-2 text-left">Year</th>
                    <th className="px-4 py-2 text-left">Term</th>
                    <th className="px-4 py-2 text-left">Amount</th>
                    <th className="px-4 py-2 text-left">Date</th>
                    <th className="px-4 py-2 text-left">Method</th>
                  </tr>
                </thead>
                <tbody>
                  {preview.map((row, index) => (
                    <tr key={index} className="border-t">
                      <td className="px-4 py-2">{row.student_id || row.Student_ID}</td>
                      <td className="px-4 py-2">{row.academic_year || row.Academic_Year}</td>
                      <td className="px-4 py-2">{row.term || row.Term}</td>
                      <td className="px-4 py-2">₦{row.amount_paid || row.Amount_Paid}</td>
                      <td className="px-4 py-2">{row.payment_date || row.Payment_Date}</td>
                      <td className="px-4 py-2">{row.payment_method || row.Payment_Method}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <Button
          onClick={handleUpload}
          disabled={!file || uploading}
          className="w-full"
        >
          {uploading ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Uploading...
            </>
          ) : (
            <>
              <Upload className="h-4 w-4 mr-2" />
              Upload Payments
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
