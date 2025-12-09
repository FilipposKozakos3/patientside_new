import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabase/supabaseClient'; 
import { Card, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from './ui/tabs';
import { Button } from './ui/button';
import { Separator } from './ui/separator';
import { Avatar, AvatarFallback } from './ui/avatar';
import {
  Folder,
  X,
  Eye,
  Calendar,
  FileText,
  Loader2,
  Mail,
  Link,
  Shield,
  Upload,
  List,
  Clock,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription, 
} from './ui/dialog';
import { toast } from 'sonner'; 
import { Alert, AlertTitle, AlertDescription } from './ui/alert';
import { Badge } from './ui/badge';

// --- INTERFACES ---

interface ConnectedPatient {
    id: string; // patient UUID
    email: string;
    name: string;
    last_visit: string;
    access_granted_at: string;
    patient_profile: {
      dob: string | null;
      gender: string | null;
      phone: string | null;
    } | null;
}

interface PatientDocument {
    id: string; 
    name: string;
    type: string;
    date: string;
    url: string; 
    fileExtension?: string;
    file_path: string; 
    patientId: string;
    provider: string; 
    notes: string | null;
}

// --- CONSTANTS ---
const STORAGE_BUCKET = 'health-records';
const DOCUMENT_TYPES = [
    'clinical_note',
    'lab_report',
    'imaging_report',
    'medication',
    'immunization',
    'other',
];

// --- HELPER FUNCTIONS ---

const getInitials = (name: string | null | undefined): string => {
    if (typeof name !== 'string' || !name.trim()) {
        return 'UN'; // Unknown
    }
    return name.split(' ').map(n => n[0]).join('');
};

const getDocBadgeColor = (type: string) => {
    switch (type) {
      case 'lab_report': return 'bg-yellow-100 text-yellow-800';
      case 'clinical_note': return 'bg-blue-100 text-blue-800';
      case 'imaging_report': return 'bg-green-100 text-green-800';
      case 'medication': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
};

const PatientDocumentCard = ({ record, onPreview }: { record: PatientDocument, onPreview: (record: PatientDocument) => void }) => (
    <div 
        className="border rounded-lg p-3 hover:bg-gray-50 transition-colors cursor-pointer flex justify-between items-center" 
        onClick={() => onPreview(record)}
    >
      <div className="flex items-center space-x-3 min-w-0 flex-1">
        <FileText className="w-5 h-5 text-blue-500 flex-shrink-0" />
        <div className="min-w-0">
          <p className="font-medium text-sm truncate">{record.name}</p>
          <div className="flex items-center space-x-2 text-xs text-gray-500 mt-0.5">
            <Badge className={getDocBadgeColor(record.type)} variant="secondary">
              {record.type.replace('_', ' ')}
            </Badge>
            <span className="truncate">
              Source: {record.provider}
            </span>
          </div>
        </div>
      </div>
      <div className="flex items-center space-x-3 flex-shrink-0">
        <span className="text-sm text-gray-600 hidden sm:block">{record.date}</span>
        <Button variant="outline" size="sm" className="h-8">
          <Eye className="w-4 h-4 mr-1" /> View
        </Button>
      </div>
    </div>
);

const PatientInfoBlock = ({ patient }: { patient: ConnectedPatient }) => (
    <div className="grid grid-cols-2 gap-4 text-sm">
      <div className="space-y-1">
        <p className="text-gray-500 font-medium flex items-center"><Mail className="w-4 h-4 mr-2" /> Email</p>
        <p className="text-gray-800 font-semibold">{patient.email}</p>
      </div>
      <div className="space-y-1">
        <p className="text-gray-500 font-medium flex items-center"><Calendar className="w-4 h-4 mr-2" /> Date of Birth</p>
        <p className="text-gray-800 font-semibold">{patient.patient_profile?.dob || 'N/A'}</p>
      </div>
      <div className="space-y-1">
        <p className="text-gray-500 font-medium flex items-center"><Shield className="w-4 h-4 mr-2" /> Patient ID</p>
        <p className="text-gray-800 font-semibold truncate">{patient.id}</p>
      </div>
      <div className="space-y-1">
        <p className="text-gray-500 font-medium flex items-center"><Link className="w-4 h-4 mr-2" /> Access Granted</p>
        <p className="text-gray-800 font-semibold">{new Date(patient.access_granted_at).toLocaleDateString()}</p>
      </div>
      <div className="col-span-2 space-y-1">
        <p className="text-gray-500 font-medium flex items-center"><Upload className="w-4 h-4 mr-2" /> Current Permissions</p>
        <Badge variant="default" className="bg-green-500 hover:bg-green-600">Full Record Access</Badge>
      </div>
    </div>
);


// --- MAIN COMPONENT ---

interface PatientRecordViewerProps {
    isOpen: boolean;
    onClose: () => void;
    patient: ConnectedPatient | null;
    onAddData: (patient: ConnectedPatient) => void;
    refreshTrigger: number;
}

export function PatientRecordViewer({ 
    isOpen, 
    onClose, 
    patient, 
    onAddData,
    refreshTrigger
}: PatientRecordViewerProps) {
    const [documents, setDocuments] = useState<PatientDocument[]>([]);
    const [loading, setLoading] = useState(false);
    const [fetchError, setFetchError] = useState<string | null>(null);

    const fetchPatientDocuments = useCallback(async (patient: ConnectedPatient) => {
        setLoading(true); 
        setFetchError(null); 
        setDocuments([]);
        
        try {
            const { data: files, error: listError } = await supabase.storage
                .from(STORAGE_BUCKET)
                .list(patient.email, { 
                    limit: 100, 
                    offset: 0, 
                    sortBy: { column: 'created_at', order: 'desc' } 
                });

            if (listError) {
                throw new Error(listError.message);
            }

            const documents: PatientDocument[] = [];
            
            if (files && files.length > 0) {
                const documentFiles = files.filter(f => 
                    f.name && 
                    f.name !== '.emptyFolderPlaceholder' && 
                    f.name !== '.DS_Store' 
                );

                for (const file of documentFiles) {
                    const fullPath = `${patient.email}/${file.name}`;
                    
                    const { data: urlData, error: urlError } = await supabase.storage
                        .from(STORAGE_BUCKET)
                        .createSignedUrl(fullPath, 60);

                    if (urlError || !urlData?.signedUrl) {
                        console.warn(`Could not get signed URL for ${file.name}: ${urlError?.message || 'URL data missing'}`);
                        continue; 
                    }
                    
                    const fileExtension = file.name.split('.').pop()?.toLowerCase() || 'file';
                    let documentType = DOCUMENT_TYPES.find(type => file.name.toLowerCase().includes(type.replace('_', ''))) || 'other';

                    documents.push({
                        id: file.id || fullPath, 
                        name: file.name,
                        type: documentType,
                        date: new Date(file.created_at).toLocaleDateString(),
                        url: urlData.signedUrl, 
                        fileExtension: `.${fileExtension}`,
                        patientId: patient.id,
                        provider: file.metadata?.uploaded_by_name || 'Unknown', 
                        notes: null,
                        file_path: fullPath, 
                    });
                }
            }
            
            setDocuments(documents);

        } catch (e: any) {
            console.error('Error fetching patient documents from storage:', e);
            setFetchError(`Failed to load patient documents: ${e.message}`);
            setDocuments([]);
        } finally {
            setLoading(false); 
        }
    }, []);

    useEffect(() => {
        if (patient && isOpen) {
            fetchPatientDocuments(patient);
        } else if (!isOpen) {
            setDocuments([]);
        }
    }, [patient, isOpen, fetchPatientDocuments, refreshTrigger]);


    const handlePreviewDocument = (record: PatientDocument) => {
        if (record.url) {
            window.open(record.url, '_blank'); 
        } else {
            toast.error('Could not find a valid link for this document.');
        }
    };
    
    const DocumentList = () => {
        if (loading) {
            return (
                <div className="text-center py-10">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto text-blue-500" />
                    <p className="text-sm mt-2 text-gray-500">Fetching records from storage...</p>
                </div>
            );
        }
        
        if (fetchError) {
            return (
                <Alert variant="destructive" className="mt-4">
                    <X className="h-4 w-4" />
                    <AlertTitle>Error Loading Documents</AlertTitle>
                    <AlertDescription>{fetchError}</AlertDescription>
                </Alert>
            );
        }

        if (documents.length === 0) {
            return (
                <div className="text-center py-10 text-gray-500">
                    <Folder className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                    <p className="text-sm">No records found in the patient's storage folder.</p>
                    <p className="text-xs mt-1">Use the "Add Data" button to upload one.</p>
                </div>
            );
        }

        return (
            <div className="space-y-3"> 
                {documents.map(record => (
                    <PatientDocumentCard key={record.id} record={record} onPreview={handlePreviewDocument} />
                ))}
            </div>
        );
    };


    if (!patient) return null; 

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-4xl p-0">
                {/* 1. Set fixed height for the entire dialog content area, and added h-full */}
                <div className="flex flex-col lg:flex-row h-[90vh] max-h-[900px] h-full"> 
                    {/* Left Panel: Patient Overview (Fixed Size) */}
                    <div className="lg:w-1/3 border-b lg:border-r lg:border-b-0 p-6 flex flex-col justify-between">
                        <div className="space-y-6">
                            <div className="flex items-center space-x-4">
                                <Avatar className="w-16 h-16">
                                    <AvatarFallback className="text-xl bg-blue-600 text-white">{getInitials(patient.name)}</AvatarFallback>
                                </Avatar>
                                <div>
                                    <h2 className="text-2xl font-bold">{patient.name}</h2>
                                    <p className="text-sm text-gray-500">Patient File</p>
                                </div>
                            </div>

                            <Separator />

                            <PatientInfoBlock patient={patient} />
                            
                        </div>
                        
                        <div className="mt-6 space-y-3">
                            <Button onClick={() => {
                                onClose(); 
                                onAddData(patient); 
                            }} className="w-full">
                                <Upload className="w-4 h-4 mr-2" /> Add Data
                            </Button>
                            <Button variant="outline" className="w-full">
                                <Mail className="w-4 h-4 mr-2" /> Contact Patient
                            </Button>
                        </div>
                    </div>

                    {/* 2. Right Panel: Document List (Flex container for scrolling) */}
                    <div className="lg:w-2/3 p-6 flex flex-col min-h-0 overflow-y-hidden">
                        
                        <DialogHeader>
                            <DialogTitle className="text-xl font-semibold">
                                Patient Record Viewer
                            </DialogTitle>
                            <DialogDescription className="text-gray-500 text-sm"> 
                                Viewing connected records for {patient.name}
                            </DialogDescription>
                        </DialogHeader>

                        {/* 3. Tabs wrapper must be flex-col and take remaining height */}
                        <Tabs defaultValue="documents" className="flex flex-col flex-1 min-h-0 mt-4">
                            <TabsList className="grid w-full grid-cols-2">
                                <TabsTrigger value="documents"><List className="w-4 h-4 mr-2" /> Documents</TabsTrigger>
                                <TabsTrigger value="timeline"><Clock className="w-4 h-4 mr-2" /> Timeline (WIP)</TabsTrigger>
                            </TabsList>
                            
                            {/* 4. TabsContent must be flex-col and take remaining height (min-h-0 and flex-1 are essential) */}
                            <TabsContent value="documents" className="flex flex-col flex-1 min-h-0 h-full">
                                {/* FIX: Changed mb-3 to pb-2 to define height clearly */}
                                <h3 className="text-xl font-semibold mt-4 pb-2">Health Records ({documents.length})</h3>
                                
                                <div className="flex justify-end mb-4">
                                    <Button 
                                        variant="outline" 
                                        size="sm"
                                        onClick={() => fetchPatientDocuments(patient)}
                                        disabled={loading}
                                    >
                                        {loading ? (
                                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                        ) : (
                                            <Calendar className="w-4 h-4 mr-2" />
                                        )}
                                        Refresh
                                    </Button>
                                </div>
                                
                                {/* 5. SCROLLING FIX: h-0 prevents the content from dictating height; pt-2 adds back spacing */}
                                <div className="flex-1 overflow-y-auto h-0 pt-2"> 
                                    <DocumentList />
                                </div>
                            </TabsContent>

                            <TabsContent value="timeline" className="flex-1 min-h-0"> 
                                <div className="pt-4 text-center text-gray-500">
                                    <p>Timeline visualization coming soon.</p>
                                    <p className="text-sm mt-2">This will show a chronological view of medications, lab results, and visits.</p>
                                </div>
                            </TabsContent>
                        </Tabs>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}

// Exporting interfaces and constants for use in ProviderPortal
export type { ConnectedPatient, PatientDocument };
export { STORAGE_BUCKET, DOCUMENT_TYPES };