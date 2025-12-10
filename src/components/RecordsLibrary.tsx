import { useState, useEffect } from 'react';
import { StoredHealthRecord } from '../types/fhir';
import { supabase } from "../supabase/supabaseClient";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Input } from './ui/input';
import { Checkbox } from './ui/checkbox';
import { Badge } from './ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Button } from './ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';
import { 
  User,
  FolderOpen,
  Calendar,
  Eye,
  FileText,
  Loader2,
  Trash
} from 'lucide-react';
import { toast } from 'sonner@2.0.3';

// Define the name of your storage bucket
const STORAGE_BUCKET = 'health-records'; 

// Health Record Interface (Matches the health_records table)
interface HealthRecord {
  id: number;
  file_name: string;
  file_path: string; 
  document_type: string;
  provider_name: string | null;
  uploaded_at: string; 
  email: string;
  is_shared?: boolean;
}

interface RecordsLibraryProps {
  onViewRecord: (record: StoredHealthRecord) => void;
  onExportRecord: (record: StoredHealthRecord) => void;
  onShareRecord: (record: StoredHealthRecord) => void;
  refreshTrigger: number;
  onRecordsChanged?: () => void;
}

export function RecordsLibrary({ 
  onViewRecord, 
  onExportRecord, 
  onShareRecord,
  refreshTrigger,
  onRecordsChanged, 
}: RecordsLibraryProps) {
  
  // Original state for FHIR-style records (kept for compatibility)
  const [fhirRecords, setFhirRecords] = useState<StoredHealthRecord[]>([]);
  
  // State for the raw document records from the database
  const [documentRecords, setDocumentRecords] = useState<HealthRecord[]>([]);
  const [recordsLoading, setRecordsLoading] = useState(true);
  
  // Filter state
  const [providerFilter, setProviderFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [accessibleRecords, setAccessibleRecords] = useState<Set<number>>(new Set());
  
  // Function to load raw document records
  const loadPatientRecords = async () => {
    setRecordsLoading(true);

    const { data: user, error: userError } = await supabase.auth.getUser();
    const patientEmail = user?.user?.email;

    if (userError || !patientEmail) {
        setRecordsLoading(false);
        console.error('User not logged in or email unavailable.');
        return;
    }

    const { data: records, error: recordsError } = await supabase
      .from('health_records')
      .select('*')
      .eq('email', patientEmail)
      .order('uploaded_at', { ascending: false });

    setRecordsLoading(false);

    if (recordsError) {
        console.error('Error loading patient documents:', recordsError);
        toast.error('Failed to load patient documents.');
        return;
    }
    
    const typedRecords = (records ?? []) as HealthRecord[];
    setDocumentRecords(typedRecords);

    // Initialize checkboxes from DB:
    const sharedIds = typedRecords
      .filter((r) => r.is_shared)
      .map((r) => r.id);

    setAccessibleRecords(new Set(sharedIds));
  };

  // Function to generate a signed URL and open document for preview
  const handlePreviewDocument = async (record: HealthRecord) => {
    if (!record.file_path) {
        toast.error('Document file path is missing.');
        return;
    }
    
    const { data, error } = await supabase.storage
      .from(STORAGE_BUCKET)
      .createSignedUrl(record.file_path, 60);

    if (error) {
      console.error('Error generating signed URL:', error);
      toast.error('Failed to get document link.');
      return;
    }

    if (data?.signedUrl) {
        window.open(data.signedUrl, '_blank'); 
        toast.success(`Opening ${record.file_name} for secure viewing.`);
    } else {
      toast.error('Document access failed.');
    }
  };

  // Function to handle dual deletion (Storage + Database tables)
  const handleDeleteDocument = async (record: HealthRecord) => {
    console.log("Deleting health record:", record);

    if (!window.confirm(`Are you sure you want to permanently delete the document "${record.file_name}"? This action cannot be undone.`)) {
      return;
    }

    // 1. Delete the file from Supabase Storage
    const { error: storageError } = await supabase.storage
      .from(STORAGE_BUCKET)
      .remove([record.file_path]);

    if (storageError) {
      console.error('Warning: Failed to delete file from storage:', storageError);
    }

    // 2. Delete ALL parsed clinical data tied to this record
    await supabase.from("medications").delete().eq("source_record_id", record.id);
    await supabase.from("allergies").delete().eq("source_record_id", record.id);
    await supabase.from("lab_results").delete().eq("source_record_id", record.id);
    await supabase.from("immunizations").delete().eq("source_record_id", record.id);

    // 3. Delete base record
    const { error: dbError } = await supabase
      .from('health_records')
      .delete()
      .eq('id', record.id);

    if (dbError) {
      console.error('Error deleting record from database:', dbError);
      toast.error('Failed to delete record from database.');
      return;
    }

    // 4. Update UI
    setDocumentRecords(prevRecords => prevRecords.filter(r => r.id !== record.id));
    toast.success(`"${record.file_name}" deleted permanently.`);

    // 5. Tell parent to refresh dashboard/summary
    if (onRecordsChanged) {
      onRecordsChanged();
    }
  };

  // Reload when refresh trigger changes
  useEffect(() => {
    loadPatientRecords();
  }, [refreshTrigger]);

  // Provider filter list
  const uniqueProviders = Array.from(
    new Set(documentRecords.map(r => r.provider_name).filter(Boolean) as string[])
  );

  const filteredRecords = documentRecords.filter((record) => {
    const providerMatch = providerFilter === 'all' || record.provider_name === providerFilter;
    const searchMatch =
      record.file_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      record.document_type.toLowerCase().includes(searchQuery.toLowerCase()) ||
      record.provider_name?.toLowerCase().includes(searchQuery.toLowerCase()) || false;

    return providerMatch && searchMatch;
  });

  const toggleAccessible = async (id: number) => {
    const isCurrentlyShared = accessibleRecords.has(id);
    const nextShared = !isCurrentlyShared;

    // Optimistic UI update
    setAccessibleRecords((prev) => {
      const newSet = new Set(prev);
      if (nextShared) newSet.add(id);
      else newSet.delete(id);
      return newSet;
    });

    // Persist
    const { error } = await supabase
      .from("health_records")
      .update({ is_shared: nextShared })
      .eq("id", id);

    if (error) {
      console.error("Failed to update sharing flag:", error);
      toast.error("Could not update sharing for this record.");

      // Roll back
      setAccessibleRecords((prev) => {
        const newSet = new Set(prev);
        if (isCurrentlyShared) newSet.add(id);
        else newSet.delete(id);
        return newSet;
      });
    } else {
      toast.success(
        nextShared
          ? "Record shared with your linked providers."
          : "Record is no longer shared with providers."
      );
    }
  };



  return (
    <>
      <Card className="bg-white shadow-sm">
        <CardHeader>
          <CardTitle className="text-xl font-semibold text-gray-900">
            Your Health Document Library
          </CardTitle>
          <CardDescription className="mt-1">
            Browse and manage all uploaded documents and structured health records.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Filters and Search */}
          <div className="flex flex-col md:flex-row gap-4">
            <Input
              placeholder="Search documents by name or type..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1"
            />
            {/* FIX: Ensure value is always a string ('all' fallback) to prevent controlled/uncontrolled error */}
            <Select value={providerFilter ?? 'all'} onValueChange={setProviderFilter}>
              <SelectTrigger className="w-[180px] flex-shrink-0">
                <SelectValue placeholder="Filter by Provider" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Providers</SelectItem>
                {uniqueProviders.map(provider => (
                  <SelectItem key={provider} value={provider}>{provider}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Record List */}
          <div className="space-y-3"> {/* Reduced gap here */}
            {recordsLoading ? (
              <div className="text-center py-10">
                <Loader2 className="w-6 h-6 animate-spin mx-auto text-blue-500" />
                <p className="text-sm mt-2 text-gray-500">Loading documents...</p>
              </div>
            ) : filteredRecords.length === 0 ? (
              <div className="text-center py-10 text-gray-500">
                <FolderOpen className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                <p className="text-sm">No documents found matching the filter criteria.</p>
                <p className="text-xs mt-1 text-gray-400">Upload a new record in the 'Upload' tab.</p>
              </div>
            ) : (
              // DOCUMENT RECORD RENDERING (Optimized for size)
              filteredRecords.map((record) => (
                <div
                  key={record.id}
                  // REDUCED: Padding (p-3/py-3 px-4), gap (gap-3) 
                  className="grid grid-cols-[3fr,2fr,1.5fr,1.5fr,min-content] items-center gap-3 py-3 px-4 border rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors"
                >
                  
                  {/* Document Name and Type (More compact) */}
                  <div className="flex flex-col min-w-0">
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4 text-blue-600 flex-shrink-0" />
                      <span className="font-medium text-sm text-gray-900 truncate">
                        {record.file_name}
                      </span>
                    </div>
                    {/* REDUCED: mt-0.5 for tighter vertical space */}
                    <Badge variant="secondary" className="w-fit mt-0.5 text-xs px-2 py-0.5">
                      {record.document_type || 'General Record'}
                    </Badge>
                  </div>

                  {/* Provider (Simplified) */}
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4 text-gray-500 flex-shrink-0" />
                    <span className="text-sm text-gray-700 truncate">
                      {record.provider_name || "Unknown Provider"}
                    </span>
                  </div>

                  {/* Date Added */}
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Calendar className="w-4 h-4 text-gray-400 flex-shrink-0" />
                    {new Date(record.uploaded_at).toLocaleDateString("en-US", {
                      month: "2-digit",
                      day: "2-digit",
                      year: "numeric",
                    })}
                  </div>

                  {/* Action Buttons (More compact) */}
                  <div className="flex justify-end gap-1.5">
                      {/* REDUCED: h-7, px-2.5, w-3.5/h-3.5 icons */}
                      <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handlePreviewDocument(record)}
                          className="flex items-center gap-1 text-sm h-7 px-2.5"
                      >
                          <Eye className="w-3.5 h-3.5" />
                          Preview
                      </Button>
                      
                      <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteDocument(record)}
                          className="text-red-600 hover:bg-red-50 h-7 px-2.5"
                          title="Delete Document"
                      >
                          <Trash className="w-3.5 h-3.5" />
                      </Button>
                  </div>

                  {/* Checkbox */}
                  <div
                    className="flex items-center justify-center"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Checkbox
                      checked={accessibleRecords.has(record.id)}
                      onCheckedChange={() => toggleAccessible(record.id)}
                    />
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
      
      {/* Removed the Document Preview Dialog JSX as it's no longer used for viewing */}
    </>
  );
}