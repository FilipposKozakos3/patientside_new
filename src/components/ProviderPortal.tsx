import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Badge } from './ui/badge';
import { Separator } from './ui/separator';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { 
  Folder, 
  Shield, 
  Hand, 
  Search, 
  Filter, 
  Bell,
  Clock,
  FileText,
  Upload,
  Calendar,
  X,
  Eye,
  ChevronRight,
  Download,
  BarChart3,
  TrendingUp,
  Users,
  Activity
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuCheckboxItem,
} from './ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';
import { Textarea } from './ui/textarea';
import { toast } from 'sonner@2.0.3';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';

interface ProviderPortalProps {
  providerName: string;
  providerEmail: string;
  onLogout: () => void;
  onAlertsChange: (alerts: Alert[]) => void;
}


interface ConnectedPatient {
  id: string;
  name: string;
  patientId: string;
  status: 'Active' | 'Inactive';
  lastSeen: string;
  shared: string;
}

interface Permission {
  id: string;
  patient: string;
  file: string;
  date: string;
  status: 'Granted' | 'Revoked' | 'Requested';
}

interface Alert {
  id: string;
  type: 'data' | 'access' | 'permission';
  title: string;
  description: string;
  timestamp: string;
}

interface PatientDocument {
  id: string;
  name: string;
  type: string;
  date: string;
  url?: string;
}

export function ProviderPortal({ providerName, providerEmail, onLogout, onAlertsChange }: ProviderPortalProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [permissionSearch, setPermissionSearch] = useState('');
  const [requestMethod, setRequestMethod] = useState<'manual' | 'file'>('manual');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [addDataDialogOpen, setAddDataDialogOpen] = useState(false);
  const [addDataMethod, setAddDataMethod] = useState<'upload' | 'manual'>('upload');
  const [pdfViewerOpen, setPdfViewerOpen] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState<PatientDocument | null>(null);
  const [notificationDetailOpen, setNotificationDetailOpen] = useState(false);
  const [selectedNotification, setSelectedNotification] = useState<Alert | null>(null);
  const [selectedPatient, setSelectedPatient] = useState<ConnectedPatient | null>(null);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  
  // Filter states
  const [statusFilter, setStatusFilter] = useState<string[]>(['Active', 'Inactive']);
  const [showFilterMenu, setShowFilterMenu] = useState(false);
  const [permissionStatusFilter, setPermissionStatusFilter] = useState<string[]>(['Granted', 'Revoked', 'Requested']);

  // Form states for manual entry
  const [manualRecordType, setManualRecordType] = useState('');
  const [manualTitle, setManualTitle] = useState('');
  const [manualDescription, setManualDescription] = useState('');
  const [manualRecordDate, setManualRecordDate] = useState('');
  const [manualVisitDate, setManualVisitDate] = useState('');
  const [manualProviderName, setManualProviderName] = useState('');
  const [manualNotes, setManualNotes] = useState('');

  // Handler functions
  const handleAddData = (patient: ConnectedPatient) => {
    setSelectedPatient(patient);
    setAddDataDialogOpen(true);
    setAddDataMethod('upload');
  };

  const handleViewPatient = (patient: ConnectedPatient) => {
    setSelectedPatient(patient);
    setViewDialogOpen(true);
  };

  const handleViewDocument = (doc: PatientDocument) => {
    setSelectedDocument(doc);
    setPdfViewerOpen(true);
  };

  const handleUploadData = () => {
    if (addDataMethod === 'upload') {
      if (!uploadFile) {
        toast.error('Please select a file to upload');
        return;
      }
      toast.success(`Data uploaded successfully for ${selectedPatient?.name}`);
    } else {
      // Manual entry validation
      if (!manualRecordType || !manualTitle) {
        toast.error('Please fill in required fields');
        return;
      }
      toast.success(`Manual record added successfully for ${selectedPatient?.name}`);
    }
    
    // Reset form
    setUploadFile(null);
    setManualRecordType('');
    setManualTitle('');
    setManualDescription('');
    setManualRecordDate('');
    setManualVisitDate('');
    setManualProviderName('');
    setManualNotes('');
    setAddDataDialogOpen(false);
  };

  const handleGrantPermission = (permissionId: string, patientName: string, file: string) => {
    setPermissions(prev => 
      prev.map(p => 
        p.id === permissionId 
          ? { ...p, status: 'Granted' as const }
          : p
      )
    );
    toast.success(`Access granted to ${file} for ${patientName}`);
  };

  const handleRevokePermission = (permissionId: string, patientName: string, file: string) => {
    setPermissions(prev => 
      prev.map(p => 
        p.id === permissionId 
          ? { ...p, status: 'Revoked' as const }
          : p
      )
    );
    toast.warning(`Access revoked to ${file} for ${patientName}`);
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      toast.success(`File uploaded: ${file.name}`);
    }
  };

  const handleSubmitRequest = () => {
    if (requestMethod === 'manual') {
      toast.success('Access request submitted successfully');
    } else {
      if (selectedFile) {
        toast.success('Authorization form submitted successfully');
      } else {
        toast.error('Please upload an authorization form');
      }
    }
  };

  const handleNotificationClick = (alert: Alert) => {
    setSelectedNotification(alert);
    setNotificationDetailOpen(true);
  };

  const handleDeleteNotification = (alertId: string) => {
    const updatedAlerts = alerts.filter(a => a.id !== alertId);
    setAlerts(updatedAlerts);
    toast.success('Notification deleted');
    setNotificationDetailOpen(false);
  };

  const handleDownloadDocument = (doc: PatientDocument) => {
    if (doc.url) {
      // Create a temporary link element and trigger download
      const link = document.createElement('a');
      link.href = doc.url;
      link.download = doc.name + '.pdf';
      link.target = '_blank';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success(`Downloading ${doc.name}`);
    }
  };

  // Mock data for connected patients
  const [patients] = useState<ConnectedPatient[]>([
    {
      id: '1',
      name: 'John Doe',
      patientId: 'xxx-xxx',
      status: 'Active',
      lastSeen: '2025-10-15',
      shared: 'Connected'
    },
    {
      id: '2',
      name: 'Liam Chen',
      patientId: 'xxx-xxx',
      status: 'Inactive',
      lastSeen: '2025-10-21',
      shared: 'Connected'
    },
    {
      id: '3',
      name: 'Noah Johnson',
      patientId: 'xxx-xxx',
      status: 'Active',
      lastSeen: '2025-10-18',
      shared: 'Request Needed'
    },
    {
      id: '1',
      name: 'Sam Smith',
      patientId: 'xxx-xxx',
      status: 'Active',
      lastSeen: '2025-10-15',
      shared: 'Request Sent'
    }
  ]);

  // Mock documents for patients
  const patientDocuments: PatientDocument[] = [
    {
      id: '1',
      name: 'Lab Results - CBC',
      type: 'Lab Test',
      date: '10/15/2024',
      url: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf'
    },
    {
      id: '2',
      name: 'Prescription - Lisinopril',
      type: 'Medication',
      date: '10/12/2024',
      url: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf'
    },
    {
      id: '3',
      name: 'Visit Notes',
      type: 'Clinical Note',
      date: '10/10/2024',
      url: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf'
    }
  ];

  // Mock data for permissions
  const [permissions, setPermissions] = useState<Permission[]>([
    {
      id: '1',
      patient: 'John Doe',
      file: 'Imaging',
      date: '2025-10-15',
      status: 'Granted'
    },
    {
      id: '2',
      patient: 'Liam Chen',
      file: 'Labs',
      date: '2025-10-21',
      status: 'Revoked'
    },
    {
      id: '3',
      patient: 'Noah Johnson',
      file: 'Allergies',
      date: '2025-10-18',
      status: 'Requested'
    }
  ]);

  // Mock data for alerts
  const [alerts, setAlerts] = useState<Alert[]>([
    {
      id: '1',
      type: 'data',
      title: 'New Data',
      description: 'CBC panel shared by Ava Patel',
      timestamp: '2h ago'
    },
    {
      id: '2',
      type: 'access',
      title: 'Access Request',
      description: 'Dr. Miller requested access to Liam Chen\'s records',
      timestamp: 'X days ago'
    },
    {
      id: '3',
      type: 'permission',
      title: 'Permission',
      description: 'Emma Garcia revoked access to imaging folder',
      timestamp: 'X days ago'
    },
    

  ]);

    useEffect(() => {
    // Push current ProviderPortal alerts up to App
    onAlertsChange(alerts);
  }, [alerts, onAlertsChange]);


  // Apply filters
  const filteredPatients = patients.filter(patient => {
    const matchesSearch = patient.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter.includes(patient.status);
    return matchesSearch && matchesStatus;
  });

  const filteredPermissions = permissions.filter(permission => {
    const matchesSearch = permission.patient.toLowerCase().includes(permissionSearch.toLowerCase());
    const matchesStatus = permissionStatusFilter.includes(permission.status);
    return matchesSearch && matchesStatus;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Active':
        return <Badge className="bg-green-100 text-green-800 border-green-200">Active</Badge>;
      case 'Inactive':
        return <Badge className="bg-gray-100 text-gray-800 border-gray-200">Inactive</Badge>;
      case 'Granted':
        return <Badge className="bg-green-100 text-green-800 border-green-200">Granted</Badge>;
      case 'Revoked':
        return <Badge className="bg-red-100 text-red-800 border-red-200">Revoked</Badge>;
      case 'Requested':
        return <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200">Requested</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  return (
    <>
      <div className="w-full flex justify-center">
        {/* Main Content */}
        <div className="w-full max-w-6xl px-6">
        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="grid w-full grid-cols-4 mb-6">
            <TabsTrigger value="overview" className="gap-2">
              <BarChart3 className="w-4 h-4" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="connected" className="gap-2">
              <Folder className="w-4 h-4" />
              Patients
            </TabsTrigger>
            <TabsTrigger value="permissions" className="gap-2">
              <Shield className="w-4 h-4" />
              Permissions
            </TabsTrigger>
            <TabsTrigger value="request" className="gap-2">
              <Hand className="w-4 h-4" />
              Request Access
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="mt-0 space-y-4">
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card className="bg-white border-l-4 border-l-blue-500">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">Total Patients</p>
                      <h3 className="text-3xl mt-1">{patients.length}</h3>
                      <p className="text-xs text-green-600 mt-2 flex items-center gap-1">
                        <TrendingUp className="w-3 h-3" />
                        <span>2 new this week</span>
                      </p>
                    </div>
                    <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                      <Users className="w-6 h-6 text-blue-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-white border-l-4 border-l-green-500">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">Active Patients</p>
                      <h3 className="text-3xl mt-1">{patients.filter(p => p.status === 'Active').length}</h3>
                      <p className="text-xs text-gray-600 mt-2">
                        {Math.round((patients.filter(p => p.status === 'Active').length / patients.length) * 100)}% of total
                      </p>
                    </div>
                    <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                      <Activity className="w-6 h-6 text-green-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-white border-l-4 border-l-yellow-500">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">Pending Requests</p>
                      <h3 className="text-3xl mt-1">{permissions.filter(p => p.status === 'Requested').length}</h3>
                      <p className="text-xs text-yellow-600 mt-2">
                        Requires attention
                      </p>
                    </div>
                    <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
                      <Bell className="w-6 h-6 text-yellow-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Recent Activity */}
            <Card className="bg-white">
              <CardHeader>
                <CardTitle>Recent Activity</CardTitle>
                <CardDescription>Latest updates from your patients</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-start gap-3 pb-3 border-b">
                    <div className="w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
                    <div className="flex-1">
                      <p className="text-sm">New lab results shared by <span className="font-medium">John Doe</span></p>
                      <p className="text-xs text-gray-500 mt-1">2 hours ago</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 pb-3 border-b">
                    <div className="w-2 h-2 bg-green-500 rounded-full mt-2"></div>
                    <div className="flex-1">
                      <p className="text-sm">Access granted to imaging records for <span className="font-medium">Liam Chen</span></p>
                      <p className="text-xs text-gray-500 mt-1">5 hours ago</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 pb-3 border-b">
                    <div className="w-2 h-2 bg-yellow-500 rounded-full mt-2"></div>
                    <div className="flex-1">
                      <p className="text-sm">New access request from <span className="font-medium">Noah Johnson</span></p>
                      <p className="text-xs text-gray-500 mt-1">1 day ago</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-2 h-2 bg-gray-400 rounded-full mt-2"></div>
                    <div className="flex-1">
                      <p className="text-sm">Patient profile updated for <span className="font-medium">John Doe</span></p>
                      <p className="text-xs text-gray-500 mt-1">2 days ago</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Connected Patients Tab */}
          <TabsContent value="connected" className="mt-0">
            <Card className="bg-white">
              <CardHeader>
                <CardTitle>Connected Patients</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Search and Filter */}
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <Input
                      placeholder="Search patients..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-9 bg-gray-100"
                    />
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" className="bg-gray-100">
                        <Filter className="w-4 h-4 mr-2" />
                        Filter
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48">
                      <DropdownMenuLabel>Status</DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      <DropdownMenuCheckboxItem
                        checked={statusFilter.includes('Active')}
                        onCheckedChange={(checked) => {
                          setStatusFilter(prev => 
                            checked 
                              ? [...prev, 'Active'] 
                              : prev.filter(s => s !== 'Active')
                          );
                        }}
                      >
                        Active
                      </DropdownMenuCheckboxItem>
                      <DropdownMenuCheckboxItem
                        checked={statusFilter.includes('Inactive')}
                        onCheckedChange={(checked) => {
                          setStatusFilter(prev => 
                            checked 
                              ? [...prev, 'Inactive'] 
                              : prev.filter(s => s !== 'Inactive')
                          );
                        }}
                      >
                        Inactive
                      </DropdownMenuCheckboxItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                {/* Table */}
                <div className="border rounded-lg overflow-hidden">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="text-left p-3 text-sm">Patient</th>
                        <th className="text-left p-3 text-sm">ID</th>
                        <th className="text-left p-3 text-sm">Status</th>
                        <th className="text-left p-3 text-sm">Last Seen</th>
                        <th className="text-left p-3 text-sm">Shared</th>
                        <th className="text-left p-3 text-sm">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredPatients.map((patient) => (
                        <tr key={patient.id} className="border-t">
                          <td className="p-3 text-sm">{patient.name}</td>
                          <td className="p-3 text-sm text-gray-600">{patient.patientId}</td>
                          <td className="p-3 text-sm">{getStatusBadge(patient.status)}</td>
                          <td className="p-3 text-sm text-gray-600">{patient.lastSeen}</td>
                          <td className="p-3 text-sm">
                            {patient.shared === "Connected" ? (
                              <span className="text-gray-900">{patient.shared}</span>
                            ) : patient.shared === "Request Sent" ? (
                              <span className="text-yellow-600">{patient.shared}</span>
                            ) : (
                              <span className="text-red-600">{patient.shared}</span>
                            )}
                          </td>
                          <td className="p-3 text-sm">
                            <div className="flex gap-2">
                              <Button 
                                size="sm" 
                                variant="outline" 
                                className="bg-gray-100"
                                onClick={() => handleAddData(patient)}
                              >
                                Add Data
                              </Button>
                              <Button 
                                size="sm" 
                                variant="outline" 
                                className="bg-gray-100"
                                onClick={() => handleViewPatient(patient)}
                              >
                                View
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Permissions Tab */}
          <TabsContent value="permissions" className="mt-0">
            <Card className="bg-white">
              <CardHeader>
                <CardTitle>Manage Permissions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Search and Filter */}
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <Input
                      placeholder="Search patients..."
                      value={permissionSearch}
                      onChange={(e) => setPermissionSearch(e.target.value)}
                      className="pl-9 bg-gray-100"
                    />
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" className="bg-gray-100">
                        <Filter className="w-4 h-4 mr-2" />
                        Filter
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48">
                      <DropdownMenuLabel>Status</DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      <DropdownMenuCheckboxItem
                        checked={permissionStatusFilter.includes('Granted')}
                        onCheckedChange={(checked) => {
                          setPermissionStatusFilter(prev => 
                            checked 
                              ? [...prev, 'Granted'] 
                              : prev.filter(s => s !== 'Granted')
                          );
                        }}
                      >
                        Granted
                      </DropdownMenuCheckboxItem>
                      <DropdownMenuCheckboxItem
                        checked={permissionStatusFilter.includes('Revoked')}
                        onCheckedChange={(checked) => {
                          setPermissionStatusFilter(prev => 
                            checked 
                              ? [...prev, 'Revoked'] 
                              : prev.filter(s => s !== 'Revoked')
                          );
                        }}
                      >
                        Revoked
                      </DropdownMenuCheckboxItem>
                      <DropdownMenuCheckboxItem
                        checked={permissionStatusFilter.includes('Requested')}
                        onCheckedChange={(checked) => {
                          setPermissionStatusFilter(prev => 
                            checked 
                              ? [...prev, 'Requested'] 
                              : prev.filter(s => s !== 'Requested')
                          );
                        }}
                      >
                        Requested
                      </DropdownMenuCheckboxItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                {/* Table */}
                <div className="border rounded-lg overflow-hidden">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="text-left p-3 text-sm">Patient</th>
                        <th className="text-left p-3 text-sm">File</th>
                        <th className="text-left p-3 text-sm">Date</th>
                        <th className="text-left p-3 text-sm">Status</th>
                        <th className="text-left p-3 text-sm">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredPermissions.map((permission) => (
                        <tr key={permission.id} className="border-t">
                          <td className="p-3 text-sm">{permission.patient}</td>
                          <td className="p-3 text-sm text-gray-600">{permission.file}</td>
                          <td className="p-3 text-sm text-gray-600">{permission.date}</td>
                          <td className="p-3 text-sm">{getStatusBadge(permission.status)}</td>
                          <td className="p-3 text-sm">
                            <div className="flex gap-2">
                              {permission.status === 'Granted' && (
                                <Button 
                                  size="sm" 
                                  variant="outline" 
                                  className="bg-gray-100"
                                  onClick={() => handleRevokePermission(permission.id, permission.patient, permission.file)}
                                >
                                  Revoke
                                </Button>
                              )}
                              {permission.status === 'Revoked' && (
                                <Button 
                                  size="sm" 
                                  variant="outline" 
                                  className="bg-gray-100"
                                  onClick={() => handleGrantPermission(permission.id, permission.patient, permission.file)}
                                >
                                  Grant
                                </Button>
                              )}
                              {permission.status === 'Requested' && (
                                <>
                                  <Button 
                                    size="sm" 
                                    variant="outline" 
                                    className="bg-gray-100"
                                    onClick={() => handleGrantPermission(permission.id, permission.patient, permission.file)}
                                  >
                                    Grant
                                  </Button>
                                  <Button 
                                    size="sm" 
                                    variant="outline" 
                                    className="bg-gray-100"
                                    onClick={() => handleRevokePermission(permission.id, permission.patient, permission.file)}
                                  >
                                    Deny
                                  </Button>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Request Access Tab */}
          <TabsContent value="request" className="mt-0">
            <Card className="bg-white">
              <CardHeader>
                <CardTitle>Request Patient Access</CardTitle>
                <CardDescription>
                  Request access to a patient's health records
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Request Method Selection */}
                <div className="space-y-2">
                  <Label>Request Method</Label>
                  <div className="flex gap-4">
                    <Button
                      type="button"
                      variant={requestMethod === 'manual' ? 'default' : 'outline'}
                      onClick={() => setRequestMethod('manual')}
                      className="flex-1"
                    >
                      Manual Entry
                    </Button>
                    <Button
                      type="button"
                      variant={requestMethod === 'file' ? 'default' : 'outline'}
                      onClick={() => setRequestMethod('file')}
                      className="flex-1"
                    >
                      Upload File
                    </Button>
                  </div>
                </div>

                <Separator />

                {requestMethod === 'manual' ? (
                  // Manual Entry Form
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="patientName">Patient Name</Label>
                        <Input
                          id="patientName"
                          placeholder="Enter patient name"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="patientId">Patient ID</Label>
                        <Input
                          id="patientId"
                          placeholder="Enter patient ID"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="dob">Date of Birth</Label>
                        <div className="relative">
                          <Input
                            id="dob"
                            type="date"
                            placeholder="MM/DD/YYYY"
                          />
                          <Calendar className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="recordType">Record Type</Label>
                        <Select>
                          <SelectTrigger id="recordType">
                            <SelectValue placeholder="Select record type" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All Records</SelectItem>
                            <SelectItem value="lab">Lab Results</SelectItem>
                            <SelectItem value="imaging">Imaging</SelectItem>
                            <SelectItem value="prescription">Prescriptions</SelectItem>
                            <SelectItem value="visit">Visit Notes</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="reason">Reason for Access</Label>
                      <Textarea
                        id="reason"
                        placeholder="Provide a reason for requesting access to this patient's records"
                        rows={4}
                      />
                    </div>

                    <Button className="w-full" onClick={handleSubmitRequest}>
                      Submit Request
                    </Button>
                  </div>
                ) : (
                  // File Upload Form
                  <div className="space-y-4">
                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 hover:border-gray-400 transition-colors">
                      <div className="flex flex-col items-center gap-3">
                        <Upload className="w-12 h-12 text-gray-400" />
                        <div className="text-center">
                          <p className="text-sm text-gray-900">
                            Upload patient authorization form
                          </p>
                          <p className="text-xs text-gray-500 mt-1">
                            PDF, PNG, or JPG (max. 10MB)
                            {selectedFile && <span className="block text-blue-600 mt-1">Selected: {selectedFile.name}</span>}
                          </p>
                        </div>
                        <Input
                          type="file"
                          accept=".pdf,.png,.jpg,.jpeg"
                          className="hidden"
                          id="authFile"
                          onChange={handleFileUpload}
                        />
                        <label htmlFor="authFile">
                          <Button variant="outline" type="button" asChild>
                            <span>Choose File</span>
                          </Button>
                        </label>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="notes">Additional Notes</Label>
                      <Textarea
                        id="notes"
                        placeholder="Add any additional notes about this request"
                        rows={4}
                      />
                    </div>

                    <Button className="w-full" onClick={handleSubmitRequest}>
                      Submit Request
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Right Sidebar - Alerts
      <div className="space-y-6">
        <Card className="bg-white">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="w-5 h-5" />
              Alerts
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {alerts.map((alert) => (
              <button
                key={alert.id}
                onClick={() => handleNotificationClick(alert)}
                className="w-full bg-gray-100 rounded-lg p-3 space-y-1 hover:bg-gray-200 transition-colors text-left"
              >
                <div className="flex items-start justify-between">
                  <p className="text-sm">{alert.title}</p>
                  <span className="text-xs text-gray-500">{alert.timestamp}</span>
                </div>
                <p className="text-xs text-gray-600">{alert.description}</p>
              </button>
            ))}
          </CardContent>
        </Card>
        </div>
      </div> */}
      </div>

      {/* View Patient Dialog */}
      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Patient Records - {selectedPatient?.name}</DialogTitle>
          <DialogDescription>
            Click on any document to view it
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="border rounded-lg overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left p-3 text-sm">Document</th>
                  <th className="text-left p-3 text-sm">Type</th>
                  <th className="text-left p-3 text-sm">Date</th>
                  <th className="text-left p-3 text-sm">Action</th>
                </tr>
              </thead>
              <tbody>
                {patientDocuments.map((doc) => (
                  <tr key={doc.id} className="border-t hover:bg-gray-50 cursor-pointer">
                    <td className="p-3 text-sm">{doc.name}</td>
                    <td className="p-3 text-sm text-gray-600">{doc.type}</td>
                    <td className="p-3 text-sm text-gray-600">{doc.date}</td>
                    <td className="p-3 text-sm">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleViewDocument(doc)}
                        className="gap-2"
                      >
                        <Eye className="w-4 h-4" />
                        View
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleDownloadDocument(doc)}
                        className="gap-2"
                      >
                        <Download className="w-4 h-4" />
                        Download
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        </DialogContent>
      </Dialog>

      {/* PDF Viewer Dialog */}
      <Dialog open={pdfViewerOpen} onOpenChange={setPdfViewerOpen}>
        <DialogContent className="max-w-[90vw] h-[90vh] flex flex-col">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <div>
                <DialogTitle>{selectedDocument?.name}</DialogTitle>
                <DialogDescription>
                  Document from {selectedDocument?.date}
                </DialogDescription>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => selectedDocument && handleDownloadDocument(selectedDocument)}
                className="gap-2"
              >
                <Download className="w-4 h-4" />
                Download
              </Button>
            </div>
          </DialogHeader>
          <div className="flex-1 overflow-hidden">
            <iframe
              src={selectedDocument?.url}
              className="w-full h-full border-0 rounded-lg"
              title="Document Viewer"
            />
          </div>
        </DialogContent>
      </Dialog>

      {/* Notification Detail Dialog */}
      <Dialog open={notificationDetailOpen} onOpenChange={setNotificationDetailOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{selectedNotification?.title}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <p className="text-sm text-gray-600">
                <span className="text-gray-900">Type:</span> {selectedNotification?.type}
              </p>
              <p className="text-sm text-gray-600">
                <span className="text-gray-900">Time:</span> {selectedNotification?.timestamp}
              </p>
              <p className="text-sm text-gray-600">
                <span className="text-gray-900">Details:</span> {selectedNotification?.description}
              </p>
            </div>
            <div className="flex gap-2 pt-4">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setNotificationDetailOpen(false)}
              >
                Close
              </Button>
              <Button
                variant="destructive"
                className="flex-1"
                onClick={() => selectedNotification && handleDeleteNotification(selectedNotification.id)}
              >
                <X className="w-4 h-4 mr-2" />
                Delete
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add Data Dialog with Upload/Manual Entry Toggle */}
      <Dialog open={addDataDialogOpen} onOpenChange={setAddDataDialogOpen}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Add Health Records</DialogTitle>
          <DialogDescription>
            Import FHIR-compliant records or manually add new health information
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          {/* Toggle between Upload and Manual Entry */}
          <div className="flex gap-1 bg-gray-200 rounded-lg p-1">
            <button
              onClick={() => setAddDataMethod('upload')}
              className={`flex-1 py-2 px-4 rounded-md transition-colors text-sm ${
                addDataMethod === 'upload'
                  ? 'bg-white shadow-sm'
                  : 'bg-transparent text-gray-600'
              }`}
            >
              ✓ Upload
            </button>
            <button
              onClick={() => setAddDataMethod('manual')}
              className={`flex-1 py-2 px-4 rounded-md transition-colors text-sm ${
                addDataMethod === 'manual'
                  ? 'bg-white shadow-sm'
                  : 'bg-transparent text-gray-600'
              }`}
            >
              Manual Entry
            </button>
          </div>

          {addDataMethod === 'upload' ? (
            // Upload Method
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="document-type">Document Type</Label>
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="Select document type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="lab">Lab Results</SelectItem>
                    <SelectItem value="imaging">Imaging</SelectItem>
                    <SelectItem value="prescription">Prescription</SelectItem>
                    <SelectItem value="visit">Visit Notes</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="file-upload">Upload File</Label>
                <Input
                  id="file-upload"
                  type="file"
                  accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                  onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
                />
                {uploadFile && (
                  <p className="text-sm text-gray-600">Selected: {uploadFile.name}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="upload-notes">Notes (Optional)</Label>
                <Textarea
                  id="upload-notes"
                  placeholder="Add any additional notes..."
                  rows={3}
                />
              </div>

              <Button onClick={handleUploadData} className="w-full">
                Upload
              </Button>
            </div>
          ) : (
            // Manual Entry Method
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="record-type">Record Type</Label>
                <Select value={manualRecordType} onValueChange={setManualRecordType}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="lab">Lab Results</SelectItem>
                    <SelectItem value="imaging">Imaging</SelectItem>
                    <SelectItem value="prescription">Prescription</SelectItem>
                    <SelectItem value="visit">Visit Notes</SelectItem>
                    <SelectItem value="immunization">Immunization</SelectItem>
                    <SelectItem value="allergy">Allergy</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="title">Name / Title</Label>
                <Input
                  id="title"
                  placeholder="e.g., Annual Checkup, CBC Test"
                  value={manualTitle}
                  onChange={(e) => setManualTitle(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description / Dosage</Label>
                <Textarea
                  id="description"
                  placeholder="Enter description or dosage information"
                  rows={3}
                  value={manualDescription}
                  onChange={(e) => setManualDescription(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="record-date">Record Date</Label>
                  <Input
                    id="record-date"
                    type="date"
                    value={manualRecordDate}
                    onChange={(e) => setManualRecordDate(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="visit-date">Date of Visit</Label>
                  <Input
                    id="visit-date"
                    type="date"
                    value={manualVisitDate}
                    onChange={(e) => setManualVisitDate(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="provider-name">Provider Name</Label>
                <Input
                  id="provider-name"
                  placeholder="Enter provider name"
                  value={manualProviderName}
                  onChange={(e) => setManualProviderName(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="additional-notes">Additional Notes</Label>
                <Textarea
                  id="additional-notes"
                  placeholder="Any additional information..."
                  rows={3}
                  value={manualNotes}
                  onChange={(e) => setManualNotes(e.target.value)}
                />
              </div>

              <Button onClick={handleUploadData} className="w-full">
                Upload
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
    </>
  );
}