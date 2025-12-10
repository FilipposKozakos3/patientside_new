import { useState, useEffect } from 'react';
import { supabase } from '../supabase/supabaseClient'; // Corrected path
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Avatar, AvatarFallback } from './ui/avatar';
import { Plus, UserCircle, Loader2, Eye, FileText } from 'lucide-react'; // 🔑 ADDED: Eye and FileText icons
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from './ui/dialog';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { toast } from 'sonner@2.0.3';
import { Alert, AlertDescription, AlertTitle } from './ui/alert';
import { Separator } from './ui/separator'; // 🔑 ADDED: Separator for sectioning

// Define the name of your storage bucket
const STORAGE_BUCKET = 'health-records'; // 🔑 Assuming this is the bucket name

// 1. Updated Provider Interface to match database join structure
interface LinkedProvider {
  id: string; 
  full_name: string;
  specialty: string | null; 
  access_granted_at: string; 
}

// 🔑 NEW: Health Record Interface
interface HealthRecord {
  id: number;
  file_name: string;
  file_path: string; // Path in storage (e.g., 'patient_id/timestamp-file.pdf')
  document_type: string;
  provider_name: string | null;
  uploaded_at: string;
  // Assuming the health_records table uses 'email' for linking as per previous context
  email: string;
}

// 2. Removed the patientId prop from the interface and function signature
export function ProviderManager() {
  const [providers, setProviders] = useState<LinkedProvider[]>([]);
  // 🔑 NEW: State for Records
  const [patientRecords, setPatientRecords] = useState<HealthRecord[]>([]);
  const [recordsLoading, setRecordsLoading] = useState(false);
  const [documentToView, setDocumentToView] = useState<{ url: string, name: string } | null>(null);

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [searchEmail, setSearchEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [dialogError, setDialogError] = useState('');

  // --- Utility Functions ---
  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
  };

  //console.log('ProviderManager Component Loaded');

  // 🔑 NEW: Function to generate a signed URL for document preview
  const handlePreviewDocument = async (record: HealthRecord) => {
    // Generate a temporary, time-limited URL for the document (e.g., 60 seconds)
    const { data, error } = await supabase.storage
      .from(STORAGE_BUCKET)
      .createSignedUrl(record.file_path, 60); 

    if (error) {
      console.error('Error generating signed URL:', error);
      toast.error('Failed to get document link. Check storage permissions.');
      return;
    }

    if (data?.signedUrl) {
      // Set the state to open the dialog and display the document
      setDocumentToView({ url: data.signedUrl, name: record.file_name });
    } else {
      toast.error('Document access failed.');
    }
  };


  // 🔑 NEW: Function to load patient records
  const loadPatientRecords = async (patientEmail: string) => {
    setRecordsLoading(true);
    //console.log('Querying health_records for email:', patientEmail);

    const { data: records, error: recordsError } = await supabase
      .from('health_records')
      .select('*')
      .eq('email', patientEmail) // Filter records by the patient's email
      .eq("is_shared", true)   
      .order('uploaded_at', { ascending: false });

    setRecordsLoading(false);

    if (recordsError) {
        console.error('Error loading patient records:', recordsError);
        toast.error('Failed to load patient health records.');
        return;
    }
    //console.log('Records returned:', records);
    setPatientRecords(records as HealthRecord[]);
  };


  // --- Fetching Providers from Supabase ---
  useEffect(() => {
    const init = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        const patientId = user?.id;
        const patientEmail = user?.email; // 🔑 Get email for record fetching
        
        if (!patientId || !patientEmail) {
            setDialogError("You must be logged in to view your data.");
            return;
        }

        // Load Providers
        setLoading(true);
        loadProviders(patientId); // Existing provider loading function

        // Load Records
        loadPatientRecords(patientEmail); // 🔑 NEW: Load patient records
    };
    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Run only on initial mount

  const loadProviders = async (patientId: string) => {
    // ... (Your existing loadProviders logic remains unchanged)
    setDialogError('');

    // 🔑 FIX 2: Correct the query syntax and select only existing columns
    // The role is case-sensitive, assuming 'provider' (lowercase) is correct.
    const { data, error } = await supabase
      .from('patient_provider')
      .select(`
        access_granted_at,
        provider_id,
        provider_profile:provider_id (id, full_name, specialty)
      `)
      .eq('patient_id', patientId);

    setLoading(false);

    if (error) {
      console.error('Error loading linked providers:', error);
      toast.error('Failed to load providers.');
      return;
    }

    if (data) {
        // Flatten the data structure
        const linkedProviders = data
            .map(item => {
                const profile = item.provider_profile;
                if (!profile) return null; // Skip if profile data is missing

                return {
                    id: profile.id as string,
                    full_name: profile.full_name as string,
                    specialty: profile.specialty as string | null, // Safe access to the new column
                    access_granted_at: item.access_granted_at,
                };
            })
            .filter((p): p is LinkedProvider => p !== null); // Filter out any null entries
        
        setProviders(linkedProviders);
    }
  };
  
  // --- Adding/Linking a Provider by Email ---
  // ... (handleAddProvider remains unchanged)
  const handleAddProvider = async () => {
    setDialogError('');
    const currentPatientId = (await supabase.auth.getUser()).data.user?.id;

    if (!searchEmail.trim()) {
      setDialogError('Please enter a provider email address.');
      return;
    }
    
    if (!currentPatientId) {
        setDialogError('You must be logged in to perform this action.');
        return;
    }
    
    setLoading(true);

    // 1. Search for the provider's profile using the entered email and role filter
    const { data: providerProfile, error: searchError } = await supabase
      .from('profiles')
      .select('id, full_name')
      .eq('email', searchEmail.toLowerCase())
      .eq('role', 'provider') // 🔑 Use the confirmed lowercase role
      .single();
    
    if (searchError || !providerProfile) {
        setLoading(false);
        setDialogError('Provider not found with that email, or the account is not registered as a Provider.');
        return;
    }

    // 2. Create the link in the patient_provider table
    const providerIdToLink = providerProfile.id;
    
    const { error: linkError } = await supabase
        .from('patient_provider')
        .insert({ 
            patient_id: currentPatientId, 
            provider_id: providerIdToLink,
        })
        .select()
        .single(); 

    setLoading(false);

    if (linkError) {
        if (linkError.code === '23505') { 
            setDialogError(`${providerProfile.full_name} is already linked to your account.`);
        } else {
            console.error('Link creation failed:', linkError);
            setDialogError('Failed to establish the link. Please try again.');
        }
        return;
    }
    
    // 3. Success
    toast.success(`${providerProfile.full_name} successfully linked!`);
    setIsDialogOpen(false);
    setSearchEmail('');
    loadProviders(currentPatientId); // Refresh the list
  };

  // --- Removing the Link ---
  // ... (handleRemoveProvider remains unchanged)
  const handleRemoveProvider = async (providerId: string) => {
    const currentPatientId = (await supabase.auth.getUser()).data.user?.id;
    if (!currentPatientId) return;

    if (!window.confirm("Are you sure you want to remove this provider's access? This will prevent them from viewing your records.")) {
        return;
    }
    
    const { error } = await supabase
      .from('patient_provider')
      .delete()
      .eq('patient_id', currentPatientId)
      .eq('provider_id', providerId);

    if (error) {
      console.error('Error removing link:', error);
      toast.error('Failed to remove provider.');
    } else {
      toast.success('Provider access revoked successfully.');
      loadProviders(currentPatientId); 
    }
  };


  return (
    <Card className="bg-white shadow-sm">
      <CardHeader className="pb-4">
        {/* ... (Existing CardHeader and Add Provider Dialog remain here) */}
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-xl font-semibold text-gray-900">
              Manage Healthcare Providers
            </CardTitle>
            <CardDescription className="mt-1">
              Add and manage your healthcare provider network for easy record sharing.
            </CardDescription>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={(open) => {
            setIsDialogOpen(open);
            setSearchEmail('');
            setDialogError('');
          }}>
            <DialogTrigger asChild>
              <Button
                size="sm"
                variant="outline"
                className="gap-2 justify-center"
              >
                <Plus className="w-4 h-4" />
                Add Provider
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Link Healthcare Provider</DialogTitle>
                <DialogDescription>
                  Enter the email address of the provider you wish to grant access to.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                {dialogError && (
                    <Alert variant="destructive">
                        <AlertTitle>Linking Failed</AlertTitle>
                        <AlertDescription>{dialogError}</AlertDescription>
                    </Alert>
                )}
                <div className="space-y-2">
                  <Label htmlFor="provider-email" className="text-sm font-medium">
                    Provider Email <span className="text-red-600">*</span>
                  </Label>
                  <Input
                    id="provider-email"
                    type="email"
                    placeholder="dr.smith@example.com"
                    value={searchEmail}
                    onChange={(e) => setSearchEmail(e.target.value)}
                    disabled={loading}
                  />
                  <p className="text-xs text-gray-500 pt-1">
                    The provider must have an existing PatientSide account.
                  </p>
                </div>
                <Button
                  onClick={handleAddProvider}
                  disabled={loading}
                  className="w-full gap-2 justify-center"
                >
                  {loading ? (
                    <span className="flex items-center">
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Searching...
                    </span>
                  ) : (
                    <>
                        <Plus className="w-4 h-4" />
                        Grant Access
                    </>
                  )}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      
      <CardContent className="pt-0">
        {loading && providers.length === 0 ? (
             <div className="text-center py-12 text-gray-500">
                <Loader2 className="w-8 h-8 mx-auto mb-4 text-blue-500 animate-spin" />
                <p className="text-sm">Loading your linked providers...</p>
            </div>
        ) : providers.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <UserCircle className="w-16 h-16 mx-auto mb-4 text-gray-300" />
            <p className="text-sm">No providers added yet</p>
            <p className="text-xs mt-2 text-gray-400">
              Click "Add Provider" to securely grant them access to your records.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {providers.map((provider) => (
              <div
                key={provider.id}
                className="bg-gray-50 rounded-lg p-4 border border-gray-200 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start gap-3">
                  <Avatar className="w-12 h-12 bg-blue-500">
                    <AvatarFallback className="bg-blue-500 text-white font-medium">
                      {getInitials(provider.full_name)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-medium text-gray-900 truncate">
                      {provider.full_name}
                    </h3>
                    <p className="text-xs text-gray-500 truncate mt-0.5">
                      {provider.specialty || 'General Practice'}
                    </p>
                    <p className="text-xs text-gray-400 mt-1">
                        Access granted on: {new Date(provider.access_granted_at).toLocaleDateString()}
                    </p>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveProvider(provider.id)}
                      className="mt-2 h-auto py-1 px-2 text-xs text-red-600 hover:text-red-700 hover:bg-red-50"
                      disabled={loading}
                    >
                      Revoke Access
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>

      <Separator className="my-6" />

      {/* 🔑 NEW: Section for Health Records */}
      <CardHeader className="pb-4">
        <CardTitle className="text-xl font-semibold text-gray-900">
          Your Shared Health Records
        </CardTitle>
        <CardDescription className="mt-1">
          These are the records your linked providers can view.
        </CardDescription>
      </CardHeader>

      <CardContent className="pt-0">
        {recordsLoading ? (
            <div className="text-center py-6 text-gray-500">
                <Loader2 className="w-6 h-6 mx-auto mb-2 text-blue-500 animate-spin" />
                <p className="text-sm">Loading records...</p>
            </div>
        ) : patientRecords.length === 0 ? (
            <div className="text-center py-6 text-gray-500">
                <FileText className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                <p className="text-sm">No health records found.</p>
            </div>
        ) : (
            <div className="space-y-3">
                {patientRecords.map((record) => (
                    <div
                        key={record.id}
                        className="flex items-center justify-between p-3 border rounded-lg bg-white"
                    >
                        <div className="flex items-center space-x-3 min-w-0">
                            <FileText className="w-5 h-5 text-gray-500 flex-shrink-0" />
                            <div className="min-w-0">
                                <p className="text-sm font-medium truncate text-gray-800">
                                    {record.file_name}
                                </p>
                                <p className="text-xs text-gray-500">
                                    {record.document_type} from {record.provider_name || 'Unknown'}
                                </p>
                            </div>
                        </div>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handlePreviewDocument(record)}
                            className="flex items-center gap-1 text-sm h-8 px-3"
                        >
                            <Eye className="w-4 h-4" />
                            Preview
                        </Button>
                    </div>
                ))}
            </div>
        )}
      </CardContent>

      {/* 🔑 NEW: Document Preview Dialog */}
      <Dialog 
          open={!!documentToView} 
          onOpenChange={(open) => !open && setDocumentToView(null)}
      >
        <DialogContent className="max-w-4xl h-[90vh]">
          <DialogHeader>
            <DialogTitle>Document Preview: {documentToView?.name}</DialogTitle>
            <DialogDescription>
                This is a secure, temporary view of your uploaded document.
            </DialogDescription>
          </DialogHeader>
          <div className="flex-grow w-full h-[calc(100%-60px)]">
            {documentToView?.url ? (
                // Use an iframe to embed the PDF/document content
                <iframe
                    src={documentToView.url}
                    className="w-full h-full border rounded-md"
                    title={documentToView.name}
                />
            ) : (
                <div className="text-center py-10">
                    <p>Loading document...</p>
                </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
}