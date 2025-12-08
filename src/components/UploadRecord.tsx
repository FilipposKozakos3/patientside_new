import { useState, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Textarea } from './ui/textarea';
// import { storageUtils } from '../utils/storage'; // Removed, using direct supabase calls
import { StoredHealthRecord, FHIRResource } from '../types/fhir';
import { Upload, FileJson, Plus, Loader2 } from 'lucide-react'; 
import { Alert, AlertDescription } from './ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';

import { supabase } from '../supabase/supabaseClient';
import { toast } from 'sonner@2.0.3'; 

// Configure pdf.js worker
import * as pdfjsLib from "pdfjs-dist";
import workerSrc from "pdfjs-dist/build/pdf.worker.min.mjs?url";
(pdfjsLib as any).GlobalWorkerOptions.workerSrc = workerSrc;

const STORAGE_BUCKET = 'health-records'; // Consistent bucket name

// Helper functions go HERE 
async function extractTextFromPdf(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

  let fullText = "";

  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
    const page = await pdf.getPage(pageNum);
    const textContent = await page.getTextContent();
    fullText += textContent.items.map(s => (s as any).str).join(' ') + '\n';
  }

  return fullText;
}

interface UploadRecordProps {
  user: any; // User object from App.tsx
  onRecordUpdate: () => void;
}

export function UploadRecord({ user, onRecordUpdate }: UploadRecordProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFileType, setSelectedFileType] = useState<string>('lab_report'); // Corrected default to a valid option
  const [loading, setLoading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // State for Manual Entry (kept for completeness)
  const [manualData, setManualData] = useState({
    date: new Date().toISOString().substring(0, 10),
    type: 'medication',
    name: '',
    provider: '',
    additionalInfo: '',
  });

  // 🔑 Corrected File Upload Logic with direct Supabase user fetch
  const handleFileUpload = async () => {
    const file = fileInputRef.current?.files?.[0];
    
    // 1. Get the authenticated user directly from Supabase Auth
    const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();
    const patientEmail = authUser?.email;

    if (!file) {
      setUploadStatus({ message: 'Please select a file to upload.', type: 'error' });
      return;
    }

    if (authError || !patientEmail) {
        console.error('Auth Error:', authError);
        setUploadStatus({ message: 'User email not found. Cannot securely upload.', type: 'error' });
        return;
    }
    
    setLoading(true);
    setUploadStatus(null);
    
    // 2. Construct a unique file path
    const uniqueFileName = `${Date.now()}-${file.name.replace(/[^a-z0-9.]/gi, '_').toLowerCase()}`;
    const filePath = `${patientEmail}/${uniqueFileName}`;

    // 3. Upload the file to Supabase Storage
    const { error: uploadError } = await supabase.storage
      .from(STORAGE_BUCKET)
      .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false,
      });
      
    if (uploadError) {
        console.error('Storage Upload Error:', uploadError);
        setUploadStatus({ message: `File upload failed: ${uploadError.message}`, type: 'error' });
        setLoading(false);
        return;
    }
    
    // 4. Insert the record metadata into the 'health_records' table
    const { error: dbError } = await supabase
      .from('health_records')
      .insert({
          email: patientEmail,
          file_name: file.name,
          file_path: filePath,
          document_type: selectedFileType,
          provider_name: null, 
          uploaded_at: new Date().toISOString(),
      });
      
    setLoading(false);

    if (dbError) {
        console.error('Database Insert Error:', dbError);
        await supabase.storage.from(STORAGE_BUCKET).remove([filePath]);
        setUploadStatus({ message: `Database insert failed. File deleted from storage.`, type: 'error' });
        return;
    }

    setUploadStatus({ message: 'Document uploaded and record created successfully!', type: 'success' });
    toast.success('New document uploaded!');
    onRecordUpdate(); 
    
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };


  const handleManualAdd = async () => {
    // Manual add logic is separate and not the current focus
    // ...
  };

  return (
    <Card className="bg-white shadow-sm">
      <CardHeader>
        <CardTitle className="text-xl font-semibold text-gray-900">
          Upload New Health Records
        </CardTitle>
        <CardDescription className="mt-1">
          Add files (PDF, images) or manually enter structured data into your library.
        </CardDescription>
      </CardHeader>

      <CardContent>
        <Tabs defaultValue="file" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="file">
              <Upload className="w-4 h-4 mr-2" /> Upload Document
            </TabsTrigger>
            <TabsTrigger value="manual">
              <Plus className="w-4 h-4 mr-2" /> Manual Entry
            </TabsTrigger>
          </TabsList>

          {/* ----------------------------------------------------- */}
          {/* FILE UPLOAD TAB                       */}
          {/* ----------------------------------------------------- */}
          <TabsContent value="file" className="mt-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="document-file">Select File</Label>
                {/* 🔑 FIX: Using native <input> with custom styling to restore UI */}
                <input
                  id="document-file"
                  type="file"
                  ref={fileInputRef}
                  accept=".pdf,.png,.jpg,.jpeg"
                  disabled={loading}
                  // These classes replicate the look of a styled Input component
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="document-type">Document Type</Label>
                <Select
                  value={selectedFileType}
                  onValueChange={setSelectedFileType}
                  disabled={loading}
                >
                  <SelectTrigger id="document-type">
                    <SelectValue placeholder="Select document type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="lab_report">Lab Report</SelectItem>
                    <SelectItem value="clinical_note">Clinical Note</SelectItem>
                    <SelectItem value="imaging_report">Imaging Report</SelectItem>
                    <SelectItem value="vaccination_record">Vaccination Record</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Button 
                onClick={handleFileUpload} 
                className="w-full mt-2"
                disabled={loading}
              >
                {loading ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                    <Upload className="w-4 h-4 mr-2" />
                )}
                {loading ? 'Uploading...' : 'Upload Document'}
              </Button>
            </div>
          </TabsContent>

          {/* ----------------------------------------------------- */}
          {/* MANUAL ENTRY TAB                      */}
          {/* ----------------------------------------------------- */}
          <TabsContent value="manual" className="mt-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="date">Date of Record</Label>
                {/* Assuming this Input is correctly imported and styled */}
                <input // Changed to native input for simplicity and style consistency
                  id="date"
                  type="date"
                  value={manualData.date}
                  onChange={(e) => setManualData({ ...manualData, date: e.target.value })}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="record-type">Record Type</Label>
                <Select
                  value={manualData.type}
                  onValueChange={(value) => setManualData({ ...manualData, type: value })}
                >
                  <SelectTrigger id="record-type">
                    <SelectValue placeholder="Select record type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="medication">Medication</SelectItem>
                    <SelectItem value="procedure">Procedure</SelectItem>
                    <SelectItem value="allergy">Allergy</SelectItem>
                    <SelectItem value="condition">Condition</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="record-name">Record Name/Value</Label>
                <input // Changed to native input for simplicity and style consistency
                  id="record-name"
                  value={manualData.name}
                  onChange={(e) => setManualData({ ...manualData, name: e.target.value })}
                  placeholder="e.g., Penicillin (Medication), Knee Arthroscopy (Procedure)"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="provider">Healthcare Provider (Optional)</Label>
                <input // Changed to native input for simplicity and style consistency
                  id="provider"
                  value={manualData.provider}
                  onChange={(e) => setManualData({ ...manualData, provider: e.target.value })}
                  placeholder="e.g., Dr. Smith, City Hospital"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="additional" className="text-sm font-medium">Additional Notes</Label>
                <Textarea
                  id="additional"
                  value={manualData.additionalInfo}
                  onChange={(e) => setManualData({ ...manualData, additionalInfo: e.target.value })}
                  placeholder="Any additional information..."
                  rows={2}
                />
              </div>

              <Button onClick={handleManualAdd} className="w-full mt-2">
                <Plus className="w-4 h-4 mr-2" />
                Add Record
              </Button>
            </div>
          </TabsContent>
        </Tabs>

        {uploadStatus && (
          <Alert className={`mt-4 ${uploadStatus.type === 'error' ? 'border-red-500 bg-red-50' : 'border-green-500 bg-green-50'}`}>
            <AlertDescription className={uploadStatus.type === 'error' ? 'text-red-800' : 'text-green-800'}>
              {uploadStatus.message}
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}