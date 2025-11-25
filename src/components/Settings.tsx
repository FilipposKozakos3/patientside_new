// added this
//const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;
const FUNCTIONS_BASE_URL = 'https://tdqqldpijfutzdspszil.functions.supabase.co';


import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Alert, AlertDescription } from './ui/alert';
import { Separator } from './ui/separator';
import { Switch } from './ui/switch';
import { 
  Mail, 
  Lock, 
  CheckCircle,
  AlertCircle,
  User,
  Trash2,
  Shield,
  Eye,
  EyeOff
} from 'lucide-react';
import { toast } from 'sonner@2.0.3';

// added import statement
import { supabase } from '../supabase/supabaseClient';

// const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string;
//const FUNCTIONS_BASE_URL = 'https://tdqqldpijfutzdspszil.functions.supabase.co';

interface SettingsProps {
  currentEmail: string;
  currentName: string;
  userRole: string;
  onEmailChange: (email: string) => void;
  onPasswordChange: () => void;
  onLogout: () => void;
}

export function Settings({ currentEmail, currentName, userRole, onEmailChange, onPasswordChange, onLogout }: SettingsProps) {
  const [newEmail, setNewEmail] = useState('');
  const [emailPassword, setEmailPassword] = useState('');
  const [showEmailChange, setShowEmailChange] = useState(false);

  const [currentPassword, setCurrentPassword] = useState('');
  
  // Privacy settings state (patient only)
  const [dataSharing, setDataSharing] = useState(true);
  const [researchParticipation, setResearchParticipation] = useState(false);
  const [marketingEmails, setMarketingEmails] = useState(false);
  const [activityTracking, setActivityTracking] = useState(true);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPasswordChange, setShowPasswordChange] = useState(false);

  const handleEmailUpdate = () => {
    if (!newEmail || !emailPassword) {
      toast.error('Please fill in all fields');
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newEmail)) {
      toast.error('Please enter a valid email address');
      return;
    }

    // In a real app, this would verify the password with the backend
    onEmailChange(newEmail);
    toast.success('Email updated successfully');
    setNewEmail('');
    setEmailPassword('');
    setShowEmailChange(false);
  };

  const handlePasswordUpdate = () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      toast.error('Please fill in all fields');
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error('New passwords do not match');
      return;
    }

    if (newPassword.length < 8) {
      toast.error('Password must be at least 8 characters long');
      return;
    }

    // In a real app, this would verify current password and update with backend
    onPasswordChange();
    toast.success('Password updated successfully');
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setShowPasswordChange(false);
  };

  // delete account functionality

  const handleDeleteAccount = async () => {
  const firstConfirm = window.confirm(
    'Are you sure you want to delete your account? This action cannot be undone and all your health records will be permanently deleted.'
  );
  if (!firstConfirm) return;

  const finalConfirm = window.confirm(
    'This is your final warning. Are you absolutely sure?'
  );
  if (!finalConfirm) return;

  try {
    // 1) Get current logged-in user
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error || !user) {
      console.error('getUser error:', error);
      toast.error('Could not find current user. Please try logging in again.');
      return;
    }

    // 2) Call backend delete-account route
    const res = await fetch(
      `${FUNCTIONS_BASE_URL}/make-server-81652b55/delete-account`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          // These headers are just for simple protection; backend still uses env keys
          Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
          apikey: SUPABASE_ANON_KEY,
        },
        body: JSON.stringify({ userId: user.id }),
      }
    );

    const text = await res.text();
    let body: any = {};
    try {
      body = text ? JSON.parse(text) : {};
    } catch {
      // non-JSON response, leave body = {}
    }

    if (!res.ok || body?.error) {
      console.error('delete-account error:', res.status, body);
      const message =
        (body && typeof body.error === 'string' && body.error) ||
        `Failed to delete account (status ${res.status}).`;
      toast.error(message);
      return;
    }

    // 3) Sign out & forget remembered email
    await supabase.auth.signOut();
    localStorage.removeItem('lastEmail');

    toast.success('Account deleted successfully');

    // 4) Go back to login screen
    setTimeout(() => {
      onLogout();
    }, 1000);
  } catch (err) {
    console.error('delete-account unexpected error:', err);
    toast.error('Unexpected error while deleting your account. Please try again.');
  }
};




  // ---- commented out : delete account functionality 11/24/2025 ---
  // const handleDeleteAccount = () => {
  //   if (confirm('Are you sure you want to delete your account? This action cannot be undone and all your health records will be permanently deleted.')) {
  //     if (confirm('This is your final warning. Are you absolutely sure?')) {
  //       // Clear all local storage
  //       localStorage.clear();
  //       toast.success('Account deleted successfully');
  //       // Logout
  //       setTimeout(() => {
  //         onLogout();
  //       }, 1000);
  //     }
  //   }
  // };

  return (
    <div className="space-y-6 max-w-4xl">
      <Card className="bg-white">
        <CardHeader>
          <CardTitle>Account Settings</CardTitle>
          <CardDescription>
            Manage your account information and security
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Current Account Info */}
          <div className="space-y-4">
            <div>
              <Label>Current Name</Label>
              <div className="flex items-center gap-2 mt-2 p-3 bg-gray-50 rounded-lg">
                <User className="w-4 h-4 text-gray-500" />
                <span className="text-sm text-gray-900">{currentName}</span>
              </div>
            </div>

            <div>
              <Label>Current Email</Label>
              <div className="flex items-center gap-2 mt-2 p-3 bg-gray-50 rounded-lg">
                <Mail className="w-4 h-4 text-gray-500" />
                <span className="text-sm text-gray-900">{currentEmail}</span>
              </div>
            </div>
          </div>

          <Separator />

          {/* Change Email Section */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base text-gray-900">Change Email Address</h3>
                <p className="text-sm text-gray-600">Update your email address for account access</p>
              </div>
              <Button
                onClick={() => setShowEmailChange(!showEmailChange)}
                variant="outline"
              >
                {showEmailChange ? 'Cancel' : 'Change Email'}
              </Button>
            </div>

            {showEmailChange && (
              <Card className="border-2 border-blue-200 bg-blue-50">
                <CardContent className="pt-6 space-y-4">
                  <div>
                    <Label htmlFor="new-email">New Email Address</Label>
                    <Input
                      id="new-email"
                      type="email"
                      value={newEmail}
                      onChange={(e) => setNewEmail(e.target.value)}
                      placeholder="newemail@example.com"
                      className="bg-white"
                    />
                  </div>
                  <div>
                    <Label htmlFor="email-password">Current Password (for verification)</Label>
                    <Input
                      id="email-password"
                      type="password"
                      value={emailPassword}
                      onChange={(e) => setEmailPassword(e.target.value)}
                      placeholder="Enter your current password"
                      className="bg-white"
                    />
                  </div>
                  <Button onClick={handleEmailUpdate} className="w-full">
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Update Email
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>

          <Separator />

          {/* Change Password Section */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base text-gray-900">Change Password</h3>
                <p className="text-sm text-gray-600">Update your password to keep your account secure</p>
              </div>
              <Button
                onClick={() => setShowPasswordChange(!showPasswordChange)}
                variant="outline"
              >
                {showPasswordChange ? 'Cancel' : 'Change Password'}
              </Button>
            </div>

            {showPasswordChange && (
              <Card className="border-2 border-green-200 bg-green-50">
                <CardContent className="pt-6 space-y-4">
                  <div>
                    <Label htmlFor="current-password">Current Password</Label>
                    <Input
                      id="current-password"
                      type="password"
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      placeholder="Enter current password"
                      className="bg-white"
                    />
                  </div>
                  <div>
                    <Label htmlFor="new-password">New Password</Label>
                    <Input
                      id="new-password"
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Enter new password (min 8 characters)"
                      className="bg-white"
                    />
                  </div>
                  <div>
                    <Label htmlFor="confirm-password">Confirm New Password</Label>
                    <Input
                      id="confirm-password"
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Confirm new password"
                      className="bg-white"
                    />
                  </div>
                  <Alert className="bg-blue-50 border-blue-200">
                    <AlertCircle className="w-4 h-4" />
                    <AlertDescription className="text-xs">
                      Password must be at least 8 characters long and contain a mix of letters and numbers for security.
                    </AlertDescription>
                  </Alert>
                  <Button onClick={handlePasswordUpdate} className="w-full">
                    <Lock className="w-4 h-4 mr-2" />
                    Update Password
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Privacy Settings - Patient Only */}
          {userRole === 'patient' && (
            <>
              <Separator />
              <div className="space-y-4">
                <div>
                  <h3 className="text-base text-gray-900">Privacy Settings</h3>
                  <p className="text-sm text-gray-600">Manage how your health data is used and shared</p>
                </div>
                <Card className="border-2 border-purple-200 bg-purple-50">
                  <CardContent className="pt-6 space-y-6">
                    <div className="flex items-center justify-between">
                      <div className="space-y-1 flex-1">
                        <div className="flex items-center gap-2">
                          <Shield className="w-4 h-4 text-purple-600" />
                          <Label htmlFor="data-sharing" className="cursor-pointer">Data Sharing with Providers</Label>
                        </div>
                        <p className="text-xs text-gray-600">Allow approved healthcare providers to access your health records</p>
                      </div>
                      <Switch 
                        id="data-sharing" 
                        checked={dataSharing}
                        onCheckedChange={(checked) => {
                          setDataSharing(checked);
                          toast.success(checked ? 'Data sharing enabled' : 'Data sharing disabled');
                        }}
                      />
                    </div>
                    
                    <Separator className="bg-purple-200" />
                    
                    <div className="flex items-center justify-between">
                      <div className="space-y-1 flex-1">
                        <div className="flex items-center gap-2">
                          <Eye className="w-4 h-4 text-purple-600" />
                          <Label htmlFor="activity-tracking" className="cursor-pointer">Activity Tracking</Label>
                        </div>
                        <p className="text-xs text-gray-600">Track when you view and export your health records</p>
                      </div>
                      <Switch 
                        id="activity-tracking" 
                        checked={activityTracking}
                        onCheckedChange={(checked) => {
                          setActivityTracking(checked);
                          toast.success(checked ? 'Activity tracking enabled' : 'Activity tracking disabled');
                        }}
                      />
                    </div>
                    
                    <Separator className="bg-purple-200" />
                    
                    <div className="flex items-center justify-between">
                      <div className="space-y-1 flex-1">
                        <div className="flex items-center gap-2">
                          <Shield className="w-4 h-4 text-purple-600" />
                          <Label htmlFor="research" className="cursor-pointer">Research Participation (Optional)</Label>
                        </div>
                        <p className="text-xs text-gray-600">Allow anonymized data to be used for medical research</p>
                      </div>
                      <Switch 
                        id="research" 
                        checked={researchParticipation}
                        onCheckedChange={(checked) => {
                          setResearchParticipation(checked);
                          toast.success(checked ? 'Research participation enabled' : 'Research participation disabled');
                        }}
                      />
                    </div>
                    
                    <Separator className="bg-purple-200" />
                    
                    <div className="flex items-center justify-between">
                      <div className="space-y-1 flex-1">
                        <div className="flex items-center gap-2">
                          <Mail className="w-4 h-4 text-purple-600" />
                          <Label htmlFor="marketing" className="cursor-pointer">Marketing Communications</Label>
                        </div>
                        <p className="text-xs text-gray-600">Receive updates about new features and health tips</p>
                      </div>
                      <Switch 
                        id="marketing" 
                        checked={marketingEmails}
                        onCheckedChange={(checked) => {
                          setMarketingEmails(checked);
                          toast.success(checked ? 'Marketing emails enabled' : 'Marketing emails disabled');
                        }}
                      />
                    </div>
                  </CardContent>
                </Card>
              </div>
            </>
          )}

          <Separator />

          {/* Danger Zone */}
          <div className="space-y-4">
            <div>
              <h3 className="text-base text-red-600">Danger Zone</h3>
              <p className="text-sm text-gray-600">Permanently delete your account and all data</p>
            </div>
            <Alert className="border-red-200 bg-red-50">
              <AlertCircle className="w-4 h-4 text-red-600" />
              <AlertDescription className="text-sm">
                <strong>Warning:</strong> Deleting your account will permanently remove all your health records, 
                settings, and personal information. This action cannot be undone.
              </AlertDescription>
            </Alert>
            <Button
              onClick={handleDeleteAccount}
              variant="destructive"
              className="w-full"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Delete Account
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
