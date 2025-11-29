import { useState, useEffect } from 'react';
import { StoredHealthRecord } from './types/fhir';
import { Auth } from './components/Auth';
import { Dashboard } from './components/Dashboard';
import { RecordsLibrary } from './components/RecordsLibrary';
import { UploadRecord } from './components/UploadRecord';
import { ExportOptions } from './components/ExportOptions';
import { RecordViewer } from './components/RecordViewer';
import { ConsentManager } from './components/ConsentManager';
import { StorageStats } from './components/StorageStats';
import { SampleDataGenerator } from './components/SampleDataGenerator';
import { PatientExportSummary } from './components/PatientExportSummary';
import { ProviderManager } from './components/ProviderManager';
import { PatientProfile } from './components/PatientProfile';
import { Settings as SettingsComponent } from './components/Settings';
import { ProfilePage } from './components/ProfilePage';
import { NotificationsPage } from './components/NotificationsPage';
import { ProviderPortal } from './components/ProviderPortal';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './components/ui/tabs';
import { Button } from './components/ui/button';
import { Input } from './components/ui/input';
import { Label } from './components/ui/label';
import { Toaster } from './components/ui/sonner';
import { Avatar, AvatarFallback, AvatarImage } from './components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from './components/ui/dropdown-menu';
import { 
  Heart, 
  FolderOpen, 
  Upload, 
  Settings, 
  Info, 
  Share2, 
  Sparkles,
  LayoutDashboard,
  Building2,
  LogOut,
  UserCircle,
  Bell
} from 'lucide-react';
import { Alert, AlertDescription } from './components/ui/alert';
import backgroundImage from "./assets/background_image.png";
import patientLogo from './assets/patient_logo.png';


interface Alert {
  id: string;
  type: 'data' | 'access' | 'permission';
  title: string;
  description: string;
  timestamp: string;
}


interface UserData {
  email: string;
  role: string;
  name: string;
}

export default function App() {
  const [user, setUser] = useState<UserData | null>(null);
  const [currentView, setCurrentView] = useState<string>('dashboard');
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [selectedRecord, setSelectedRecord] = useState<StoredHealthRecord | null>(null);
  const [viewerOpen, setViewerOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [consentOpen, setConsentOpen] = useState(false);
  const [summaryOpen, setSummaryOpen] = useState(false);
  const [selectedRole, setSelectedRole] = useState<string | null>(null);
  const [providerAlerts, setProviderAlerts] = useState<Alert[]>([]);
  const [hasUnreadNotifications, setHasUnreadNotifications] = useState(false);
  const [lastSeenAlertCount, setLastSeenAlertCount] = useState(0);


  const handleRefresh = () => {
    setRefreshTrigger(prev => prev + 1);
  };

  const handleViewRecord = (record: StoredHealthRecord) => {
    setSelectedRecord(record);
    setViewerOpen(true);
  };

  const handleExportRecord = (record: StoredHealthRecord) => {
    setSelectedRecord(record);
    setExportOpen(true);
  };

  const handleShareRecord = (record: StoredHealthRecord) => {
    setSelectedRecord(record);
    setConsentOpen(true);
  };

  const handleLogout = () => {
    setUser(null);
    setSelectedRole(null);
    setCurrentView('dashboard');
  };

  const handleNavigate = (view: string) => {
    setCurrentView(view);
  };

  const handleProviderAlertsChange = (alerts: Alert[]) => {
    setProviderAlerts(alerts);
    // red dot if there are more alerts than the user has seen
    setHasUnreadNotifications(alerts.length > lastSeenAlertCount);
  };


  useEffect(() => {
    // Red dot if there are more alerts than the user has seen
    setHasUnreadNotifications(providerAlerts.length > lastSeenAlertCount);
  }, [providerAlerts.length, lastSeenAlertCount]);


  useEffect(() => {
    if (typeof window === 'undefined') return;
    const stored = window.localStorage.getItem('lastSeenAlertCount');
    if (stored) {
      const parsed = parseInt(stored, 10);
      if (!isNaN(parsed)) {
        setLastSeenAlertCount(parsed);
      }
    }
  }, []);




  // Entry flow:
  // 1) No user & no role → show role selection
  // 2) No user & role chosen → show auth for that role
  // 3) User present → show main app
  if (!user && !selectedRole) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4" style={{ backgroundColor: '#F3F7FF' }}>
        <Card className="w-full max-w-5xl h-[80vh] shadow-md border-0 overflow-hidden">
          <div className="grid grid-cols-1 md:grid-cols-2 h-full">
            {/* Left side: logo, heading, buttons */}
            <div className="p-8 md:p-10 flex flex-col justify-center gap-6">
              <div className="space-y-1">
                <img 
                  src={patientLogo} 
                  alt="PatientSide logo" 
                  className="h-12 w-auto mb-auto" 
                />
                <h1 className="text-2xl md:text-3xl font-semibold text-gray-900">
                  Choose your role
                </h1>
                <p className="text-sm text-gray-600">
                  Select how you&apos;ll be using PatientSide to continue.
                </p>
              </div>

              <div className="space-y-3">
                <Button
                  variant="outline"
                  className="w-full justify-start py-4 px-4 rounded-s border border-gray-300"
                  onClick={() => setSelectedRole('patient')}
                >
                  I&apos;m a patient
                </Button>

                <Button
                  variant="outline"
                  className="w-full justify-start py-4 px-4 rounded-s border border-gray-300"
                  onClick={() => setSelectedRole('provider')}
                >
                  I&apos;m a healthcare provider
                </Button>
              </div>
            </div>

            {/* Right side: image area */}
            <div className="hidden md:block bg-gray-200 h-full">
              <div
                className="h-full w-full bg-cover bg-center"
                style={{ backgroundImage: `url(${backgroundImage})` }}
              />
            </div>
          </div>
        </Card>
      </div>
    );
  }

  if (!user && selectedRole) {
    return (
      <Auth
        role={selectedRole}
        onAuthenticated={(userData: UserData) => {
          setUser({ ...userData, role: selectedRole });
        }}
      />
    );
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#F3F7FF' }}>
      {/* Header */}
      <header className="bg-white border-b sticky top-0 z-10">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            {/* Logo */}
            <img
              src={patientLogo}
              alt="PatientSide logo"
              className="h-12 w-auto mb-auto"
            />

            <div className="flex items-center gap-4">
              {/* Export only for patients */}
              {user.role === 'patient' && (
                <Button
                  onClick={() => setSummaryOpen(true)}
                  variant="outline"
                  size="sm"
                >
                  Export Health Summary
                </Button>
              )}

              {/* Notifications for BOTH */}
              <Button
                variant="ghost"
                size="sm"
                className="relative"
                onClick={() => {
                  setCurrentView('notifications');

                  // mark all current alerts as seen
                  const seenCount = providerAlerts.length;
                  setLastSeenAlertCount(seenCount);
                  setHasUnreadNotifications(false);

                  if (typeof window !== 'undefined') {
                    window.localStorage.setItem('lastSeenAlertCount', String(seenCount));
                  }
                }}
              >
                <Bell className="w-5 h-5" />
                {hasUnreadNotifications && (
                  <span className="absolute top-0 right-0 w-2 h-2 bg-red-500 rounded-full" />
                )}
              </Button>


              {/* Username */}
              <span className="text-sm font-semibold" style={{ color: '#3374caff' }}>
                {user.name}
              </span>

              {/* Profile dropdown (patients + providers, same icon) */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    className="
                      rounded-full w-10 h-10 flex items-center justify-center
                       text-[#3374caff]
                      hover:bg-blue-100
                      focus:outline-none focus:ring-2 focus:ring-blue-500
                    "
                  >
                    <UserCircle className="w-5 h-5" />
                  </button>
                </DropdownMenuTrigger>

                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel>
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm">{user.name}</p>
                      <p className="text-xs text-gray-500">{user.email}</p>
                      <p className="text-xs text-gray-900">
                        {user.role === 'patient' ? 'Patient' : 'Healthcare Provider'}
                      </p>
                    </div>
                  </DropdownMenuLabel>

                  <DropdownMenuSeparator />

                  <DropdownMenuItem onClick={() => setCurrentView('profile')}>
                    <UserCircle className="mr-2 h-4 w-4" />
                    <span>Profile</span>
                  </DropdownMenuItem>

                  <DropdownMenuItem onClick={() => setCurrentView('settings')}>
                    <Settings className="mr-2 h-4 w-4" />
                    <span>Settings</span>
                  </DropdownMenuItem>

                  <DropdownMenuSeparator />

                  <DropdownMenuItem onClick={handleLogout}>
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>Logout</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
      </header>


      {/* Main Content */}
      <main className="container mx-auto px-6 py-6">
        {user.role === 'provider' && currentView !== 'profile' && currentView !== 'notifications' && currentView !== 'settings' ? (
          // Provider Portal Layout
          <ProviderPortal
            providerName={user.name}
            providerEmail={user.email}
            onLogout={handleLogout}
            onAlertsChange={handleProviderAlertsChange}
          />
        ) : (
          <div className={`grid grid-cols-1 ${currentView !== 'profile' && currentView !== 'notifications' ? 'lg:grid-cols-4' : ''} gap-6`}>
            {/* Left Column - Main Content */}
            <div className={`${currentView !== 'profile' && currentView !== 'notifications' ? 'lg:col-span-3' : ''} space-y-6`}>
              {/* Navigation Tabs - Patient Only */}
              {currentView !== 'profile' && currentView !== 'notifications' && user.role === 'patient' && (
                <Tabs value={currentView} onValueChange={setCurrentView} className="w-full">
                  <TabsList className="grid w-full grid-cols-5 mb-6">
                    <TabsTrigger value="dashboard" className="gap-2">
                      <LayoutDashboard className="w-4 h-4" />
                      Dashboard
                    </TabsTrigger>
                    <TabsTrigger value="records" className="gap-2">
                      <FolderOpen className="w-4 h-4" />
                      Records
                    </TabsTrigger>
                    <TabsTrigger value="upload" className="gap-2">
                      <Upload className="w-4 h-4" />
                      Upload
                    </TabsTrigger>
                    <TabsTrigger value="providers" className="gap-2">
                      <Building2 className="w-4 h-4" />
                      Providers
                    </TabsTrigger>
                    <TabsTrigger value="settings" className="gap-2">
                      <Settings className="w-4 h-4" />
                      Settings
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="dashboard" className="mt-0">
                    <Dashboard
                      userName={user.name}
                      userRole={user.role}
                      onNavigate={handleNavigate}
                      onExportSummary={() => setSummaryOpen(true)}
                      refreshTrigger={refreshTrigger}
                    />
                  </TabsContent>

                  <TabsContent value="records" className="mt-0">
                    <RecordsLibrary
                      onViewRecord={handleViewRecord}
                      onExportRecord={handleExportRecord}
                      onShareRecord={handleShareRecord}
                      refreshTrigger={refreshTrigger}
                    />
                  </TabsContent>

                  <TabsContent value="upload" className="mt-0">
                    <UploadRecord onRecordAdded={handleRefresh} />
                  </TabsContent>

                  <TabsContent value="providers" className="mt-0">
                    <ProviderManager />
                  </TabsContent>

                  <TabsContent value="settings" className="mt-0">
                    <SettingsComponent
                      currentEmail={user.email}
                      currentName={user.name}
                      userRole={user.role}
                      onEmailChange={(email) => setUser({ ...user, email })}
                      onPasswordChange={() => {
                        // Password change logic (in real app would be handled by backend)
                      }}
                      onLogout={handleLogout}
                    />
                  </TabsContent>
                </Tabs>
              )}

              {/* Profile Page */}
              {currentView === 'profile' && (
                <ProfilePage
                  userName={user.name}
                  userEmail={user.email}
                  userRole={user.role}
                  onLogout={handleLogout}
                  onBack={() => setCurrentView('dashboard')}
                />
              )}

              {/* Settings Page - Provider Only (Patient has it in tabs) */}
              {currentView === 'settings' && user.role === 'provider' && (
                <div className="space-y-6 max-w-4xl">
                  <div className="flex items-center gap-3">
                    <Button 
                      onClick={() => setCurrentView('dashboard')}
                      variant="ghost"
                      size="sm"
                    >
                      <LayoutDashboard className="w-4 h-4 mr-2" />
                      Back to Portal
                    </Button>
                    <h1 className="text-2xl text-gray-900">Settings</h1>
                  </div>
                  <SettingsComponent
                    currentEmail={user.email}
                    currentName={user.name}
                    userRole={user.role}
                    onEmailChange={(email) => setUser({ ...user, email })}
                    onPasswordChange={() => {
                      // Password change logic (in real app would be handled by backend)
                    }}
                    onLogout={handleLogout}
                  />
                </div>
              )}

              {/* Notifications Page */}
              {currentView === 'notifications' && (
                <NotificationsPage
                  onBack={() => setCurrentView('dashboard')}
                  alerts={providerAlerts}
                />
              )}
            </div>

            {/* Right Column - Data Summary Sidebar */}
            {currentView !== 'profile' && currentView !== 'notifications' && (
              <div className="space-y-6">
                <StorageStats refreshTrigger={refreshTrigger} userRole={user.role} />
              </div>
            )}
          </div>
        )}
      </main>

      {/* Dialogs */}
      <RecordViewer
        record={selectedRecord}
        isOpen={viewerOpen}
        onClose={() => {
          setViewerOpen(false);
          setSelectedRecord(null);
        }}
      />

      <ExportOptions
        record={selectedRecord}
        isOpen={exportOpen}
        onClose={() => {
          setExportOpen(false);
          setSelectedRecord(null);
        }}
      />

      <ConsentManager
        record={selectedRecord}
        isOpen={consentOpen}
        onClose={() => {
          setConsentOpen(false);
          setSelectedRecord(null);
        }}
        onUpdate={handleRefresh}
      />

      <PatientExportSummary
        isOpen={summaryOpen}
        onClose={() => setSummaryOpen(false)}
      />

      {/* Footer */}
      <footer className="border-t bg-white mt-12">
        <div className="container mx-auto px-6 py-6">
          <div className="text-center text-sm text-gray-600">
            <p>
              PatientSide Storage System • FHIR R4 Compatible • Privacy-First Design
            </p>
          </div>
        </div>
      </footer>

      {/* Toast Notifications */}
      <Toaster />
    </div>
  );
}