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
import jsPDF from 'jspdf'; 

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

function parseHealthRecordFromText(text: string) {
  const providerMatch = text.match(/Provider:\s*(.+?)\s+Medications:/);
  const provider = providerMatch ? providerMatch[1].trim() : "";

  const getSection = (name: string, nextName?: string) => {
    const startIdx = text.indexOf(name + ":");
    if (startIdx === -1) return "";

    let start = startIdx + name.length + 1;
    let end = nextName ? text.indexOf(nextName + ":", start) : text.length;
    if (end === -1) end = text.length;

    return text.slice(start, end).trim();
  };

  const toList = (section: string) =>
    section
      .split("- ")
      .map((s) => s.trim())
      .filter(Boolean);

  const medsStr = getSection("Medications", "Allergies");
  const allergiesStr = getSection("Allergies", "Immunizations");
  const immsStr = getSection("Immunizations", "Lab Results");
  const labsStr = getSection("Lab Results");

  return {
    provider,
    medications: toList(medsStr),
    allergies: toList(allergiesStr),
    immunizations: toList(immsStr),
    lab_results: toList(labsStr),
  };
}

// Extract provider name from PDF text using various patterns
function extractProviderName(text: string): string | null {
  if (!text) return null;

  // Try various patterns to find provider name - be very specific and limit capture
  const patterns = [
    // Pattern 1: "Provider: Name" followed by newline or common keywords
    /Provider:\s*([A-Z][a-z]+(?:\s+[A-Z][a-z]+){0,2})(?:\s*[,\s]*(?:MD|DO|RN|NP|PA))?(?:\s|$|\n|Medications?|Allergies?|Date|Patient)/i,
    // Pattern 2: "Physician: Name"
    /Physician:\s*([A-Z][a-z]+(?:\s+[A-Z][a-z]+){0,2})(?:\s*[,\s]*(?:MD|DO|RN|NP|PA))?(?:\s|$|\n|Medications?|Allergies?|Date|Patient)/i,
    // Pattern 3: "Doctor: Name"
    /Doctor:\s*([A-Z][a-z]+(?:\s+[A-Z][a-z]+){0,2})(?:\s*[,\s]*(?:MD|DO|RN|NP|PA))?(?:\s|$|\n|Medications?|Allergies?|Date|Patient)/i,
    // Pattern 4: "Dr. Name" (most common)
    /Dr\.\s*([A-Z][a-z]+(?:\s+[A-Z][a-z]+){0,2})(?:\s*[,\s]*(?:MD|DO|RN|NP|PA))?(?:\s|$|\n|Medications?|Allergies?|Date|Patient)/i,
    // Pattern 5: "Provider Name: Name"
    /Provider Name:\s*([A-Z][a-z]+(?:\s+[A-Z][a-z]+){0,2})(?:\s*[,\s]*(?:MD|DO|RN|NP|PA))?(?:\s|$|\n|Medications?|Allergies?|Date|Patient)/i,
    // Pattern 6: "Attending Physician: Name"
    /Attending Physician:\s*([A-Z][a-z]+(?:\s+[A-Z][a-z]+){0,2})(?:\s*[,\s]*(?:MD|DO|RN|NP|PA))?(?:\s|$|\n|Medications?|Allergies?|Date|Patient)/i,
    // Pattern 7: "Ordering Physician: Name"
    /Ordering Physician:\s*([A-Z][a-z]+(?:\s+[A-Z][a-z]+){0,2})(?:\s*[,\s]*(?:MD|DO|RN|NP|PA))?(?:\s|$|\n|Medications?|Allergies?|Date|Patient)/i,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match && match[1]) {
      let provider = match[1].trim();
      
      // Remove common medical suffixes and clean up
      provider = provider
        .replace(/^Dr\.?\s*/i, '')
        .replace(/\s*MD\s*$/i, '')
        .replace(/\s*DO\s*$/i, '')
        .replace(/\s*,\s*MD\s*$/i, '')
        .replace(/\s*,\s*DO\s*$/i, '')
        .replace(/\s*RN\s*$/i, '')
        .replace(/\s*NP\s*$/i, '')
        .replace(/\s*PA\s*$/i, '')
        .trim();
      
      // Validate: should be 2-4 words (first and last name, possibly middle initial)
      const words = provider.split(/\s+/).filter(w => w.length > 0);
      if (words.length < 2 || words.length > 4) {
        continue; // Skip if doesn't look like a name
      }
      
      // Validate: each word should start with capital letter and be reasonable length (2-20 chars)
      const isValidName = words.every(word => {
        const isCapitalized = /^[A-Z]/.test(word);
        const isValidLength = word.length >= 2 && word.length <= 20;
        const isProperFormat = /^[A-Z][a-z]+$/.test(word) || /^[A-Z]\.$/.test(word); // Allow middle initials like "J."
        return isCapitalized && isValidLength && isProperFormat;
      });
      
      if (!isValidName) {
        continue; // Skip if doesn't match name pattern
      }
      
      // Validate: shouldn't contain common non-name words
      const invalidWords = ['date', 'time', 'patient', 'record', 'report', 'test', 'result', 'lab', 'medication', 'allergy', 'provider', 'physician', 'doctor'];
      if (words.some(word => invalidWords.includes(word.toLowerCase()))) {
        continue; // Skip if contains invalid words
      }
      
      // Limit to reasonable length (max 50 characters)
      if (provider.length > 50) {
        continue; // Skip if too long (likely not a name)
      }
      
      return provider;
    }
  }

  return null;
}

interface UploadRecordProps {
  user: any; // User object from App.tsx
  onRecordUpdate: () => void;
}

export function UploadRecord({ user, onRecordUpdate }: UploadRecordProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFileName, setSelectedFileName] = useState<string>('');
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
    if (!file) {
      setUploadStatus({
        type: "error",
        message: "Please select a file first",
      });
      return;
    }

    setLoading(true);
    setUploadStatus(null);

    try {
      const fileExtension = file.name.split(".").pop()?.toLowerCase();

      // 1️⃣ Get authenticated user (patient)
      const {
        data: { user: authUser },
        error: authError,
      } = await supabase.auth.getUser();
      const patientEmail = authUser?.email;

      if (authError || !patientEmail) {
        console.error("Auth Error:", authError);
        setUploadStatus({
          type: "error",
          message:
            "Unable to find your account information. Please log in again.",
        });
        setLoading(false);
        return;
      }

      // 2️⃣ Only support real documents/images here
      if (
        !["pdf", "doc", "docx", "jpg", "jpeg", "png", "heic"].includes(
          fileExtension || ""
        )
      ) {
        setUploadStatus({
          type: "error",
          message:
            "Unsupported file type. Please upload PDF, DOC, DOCX, JPG, PNG, or HEIC files.",
        });
        setLoading(false);
        return;
      }

      // 3️⃣ For PDFs, try to parse structured data
      let parsedFromPdf:
        | {
            provider: string;
            medications: string[];
            allergies: string[];
            immunizations: string[];
            lab_results: string[];
          }
        | null = null;

      if (fileExtension === "pdf") {
        const rawText = await extractTextFromPdf(file);
        parsedFromPdf = parseHealthRecordFromText(rawText);
        console.log("Parsed from PDF:", parsedFromPdf);
      }

      // 4️⃣ Upload the file to Supabase Storage
      const safeName = file.name
        .replace(/[^a-z0-9.]/gi, "_")
        .toLowerCase();
      const filePath = `${patientEmail}/${Date.now()}-${safeName}`;

      const { error: uploadError } = await supabase.storage
        .from(STORAGE_BUCKET)
        .upload(filePath, file, {
          cacheControl: "3600",
          upsert: false,
        });

      if (uploadError) {
        console.error("Storage Upload Error:", uploadError);
        setUploadStatus({
          type: "error",
          message: `File upload failed: ${uploadError.message}`,
        });
        setLoading(false);
        return;
      }

      // 5️⃣ Save metadata / parsed info to Supabase
      // PDFs with parsed data -> use parse-record function (it will insert into health_records + meds/allergies/etc)
      if (fileExtension === "pdf" && parsedFromPdf) {
        try {
          const { data, error } = await supabase.functions.invoke(
            "parse-record",
            {
              body: {
                targetPatientEmail: patientEmail,
                userEmail: null, // optional for this flow
                parsed: parsedFromPdf,
                fileName: file.name,
                filePath,
              },
            }
          );

          console.log("parse-record from upload:", { data, error });
          if (error) {
            console.error("parse-record error:", error);
            toast.error(
              "File was saved, but we could not automatically extract medications/allergies."
            );
          }
        } catch (err) {
          console.error("parse-record invoke failed:", err);
          toast.error(
            "File was saved, but we could not automatically extract medications/allergies."
          );
        }
      } else {
        // Non-PDFs or PDFs we couldn't parse -> just insert a basic row in health_records
        const { error: dbError } = await supabase
          .from("health_records")
          .insert({
            email: patientEmail,
            file_name: file.name,
            file_path: filePath,
            document_type: selectedFileType, // e.g., lab_report, imaging_report, etc.
            provider_name: parsedFromPdf?.provider || null,
            uploaded_at: new Date().toISOString(),
          });

        if (dbError) {
          console.error("Database Insert Error:", dbError);
          // roll back the file upload so we don't leave orphaned files
          await supabase.storage.from(STORAGE_BUCKET).remove([filePath]);
          setUploadStatus({
            type: "error",
            message:
              "We could not save this record in your library. The file has been removed from storage.",
          });
          setLoading(false);
          return;
        }
      }

      // 6️⃣ Success UI updates
      setUploadStatus({
        type: "success",
        message: `Successfully uploaded ${file.name}`,
      });
      toast.success("New record uploaded!");
      onRecordUpdate();

      // Clear input
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
      setSelectedFileName("");
    } catch (error) {
      console.error("Error in handleFileUpload:", error);
      setUploadStatus({
        type: "error",
        message: "Error processing file. Please try again.",
      });
    } finally {
      setLoading(false);
      setTimeout(() => setUploadStatus(null), 5000);
    }
  };



  const handleManualAdd = async () => {
    // Validation
    if (!manualData.name || !manualData.type) {
      setUploadStatus({ message: 'Please fill in required fields (Record Name and Record Type).', type: 'error' });
      return;
    }

    // Get the authenticated user
    const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();
    const patientEmail = authUser?.email;

    if (authError || !patientEmail) {
      console.error('Auth Error:', authError);
      setUploadStatus({ message: 'User email not found. Cannot securely add record.', type: 'error' });
      return;
    }

    setLoading(true);
    setUploadStatus(null);

    try {
      // 1) Generate PDF from manual entry
      const doc = new jsPDF();
      let yPos = 20;

      // Title
      doc.setFontSize(18);
      doc.text(manualData.name || 'Health Record', 20, yPos);
      yPos += 15;

      // Record Type
      doc.setFontSize(12);
      doc.setFont(undefined, 'bold');
      doc.text('Record Type:', 20, yPos);
      doc.setFont(undefined, 'normal');
      const typeMap: Record<string, string> = {
        'medication': 'Medication',
        'procedure': 'Procedure',
        'allergy': 'Allergy',
        'condition': 'Condition',
      };
      doc.text(typeMap[manualData.type] || manualData.type, 70, yPos);
      yPos += 10;

      // Date
      doc.setFont(undefined, 'bold');
      doc.text('Date:', 20, yPos);
      doc.setFont(undefined, 'normal');
      const recordDate = manualData.date 
        ? new Date(manualData.date).toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' })
        : new Date().toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' });
      doc.text(recordDate, 70, yPos);
      yPos += 10;

      // Provider (if provided)
      if (manualData.provider) {
        doc.setFont(undefined, 'bold');
        doc.text('Provider:', 20, yPos);
        doc.setFont(undefined, 'normal');
        doc.text(manualData.provider, 70, yPos);
        yPos += 10;
      }

      // Additional Notes (if provided)
      if (manualData.additionalInfo) {
        yPos += 5;
        doc.setFontSize(12);
        doc.setFont(undefined, 'bold');
        doc.text('Additional Notes:', 20, yPos);
        yPos += 8;
        doc.setFont(undefined, 'normal');
        doc.setFontSize(10);
        const splitNotes = doc.splitTextToSize(manualData.additionalInfo, 170);
        doc.text(splitNotes, 20, yPos);
      }

      // Generate PDF blob
      const pdfBlob = doc.output('blob');
      const fileName = `${manualData.name.replace(/[^a-z0-9]/gi, '_')}.pdf`;
      const pdfFile = new File([pdfBlob], fileName, { type: 'application/pdf' });

      // 2) Upload PDF to Supabase Storage
      // 2) Upload PDF to Supabase Storage
      const uniqueFileName = `${Date.now()}-${fileName.replace(/[^a-z0-9.]/gi, '_').toLowerCase()}`;
      const filePath = `${patientEmail}/${uniqueFileName}`;
      
      const { error: uploadError } = await supabase.storage
        .from(STORAGE_BUCKET)
        .upload(filePath, pdfFile, {
          cacheControl: '3600',
          upsert: false,
        });

      if (uploadError) {
        console.error('Storage Upload Error:', uploadError);
        setUploadStatus({ message: `File upload failed: ${uploadError.message}`, type: 'error' });
        setLoading(false);
        return;
      }

      // 3) Insert record into health_records table
      const { error: dbError } = await supabase
        .from('health_records')
        .insert({
          email: patientEmail,
          file_name: fileName,
          file_path: filePath,
          document_type: manualData.type, // changed this line from application/pdf
          provider_name: manualData.provider || null,
          uploaded_at: new Date().toISOString(),
        });

      if (dbError) {
        console.error('Database Insert Error:', dbError);
        await supabase.storage.from(STORAGE_BUCKET).remove([filePath]);
        setUploadStatus({ message: `Database insert failed. File deleted from storage.`, type: 'error' });
        setLoading(false);
        return;
      }

      // Success
      setUploadStatus({ message: 'Record added successfully!', type: 'success' });
      toast.success('New record added!');
      onRecordUpdate();

      // Reset form
      setManualData({
        date: new Date().toISOString().substring(0, 10),
        type: 'medication',
        name: '',
        provider: '',
        additionalInfo: '',
      });
    } catch (err) {
      console.error('Error in handleManualAdd:', err);
      setUploadStatus({ message: 'Unexpected error while adding record.', type: 'error' });
    } finally {
      setLoading(false);
    }
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

              <Button 
                onClick={handleManualAdd} 
                className="w-full mt-2"
                disabled={loading}
              >
                {loading ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Plus className="w-4 h-4 mr-2" />
                )}
                {loading ? 'Adding Record...' : 'Add Record'}
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