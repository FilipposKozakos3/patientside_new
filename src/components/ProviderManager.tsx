import { useState, useEffect } from 'react';
import { supabase } from '../supabase/supabaseClient'; // Corrected path
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Avatar, AvatarFallback } from './ui/avatar';
import { Plus, UserCircle, Loader2 } from 'lucide-react';
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

// 1. Updated Provider Interface to match database join structure
interface LinkedProvider {
  id: string; 
  full_name: string;
  specialty: string | null; 
  access_granted_at: string; 
}

// 2. Removed the patientId prop from the interface and function signature
//    as we will fetch it inside useEffect.
export function ProviderManager() {
  const [providers, setProviders] = useState<LinkedProvider[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [searchEmail, setSearchEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [dialogError, setDialogError] = useState('');

  // --- Fetching Providers from Supabase ---
  useEffect(() => {
    loadProviders();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Run only on initial mount

  const loadProviders = async () => {
    setLoading(true);
    setDialogError('');

    // 🔑 FIX 1: Safely get the current user ID from the Supabase session
    const { data: { user } } = await supabase.auth.getUser();
    const patientId = user?.id;
    
    if (!patientId) {
        setLoading(false);
        // This should not happen if the component is protected, but serves as a safeguard
        setDialogError("You must be logged in to view providers.");
        return;
    }

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
    loadProviders(); // Refresh the list
  };

  // --- Removing the Link ---
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
      loadProviders(); 
    }
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
  };

  return (
    <Card className="bg-white shadow-sm">
      <CardHeader className="pb-4">
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
    </Card>
  );
}