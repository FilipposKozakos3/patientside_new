import { useState } from 'react';
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
  Calendar
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
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

export function ProviderPortal({ providerName, providerEmail, onLogout }: ProviderPortalProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [permissionSearch, setPermissionSearch] = useState('');
  const [requestMethod, setRequestMethod] = useState<'manual' | 'file'>('manual');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [addDataDialogOpen, setAddDataDialogOpen] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState<ConnectedPatient | null>(null);
  const [uploadFile, setUploadFile] = useState<File | null>(null);

  // Handler functions
  const handleAddData = (patient: ConnectedPatient) => {
    setSelectedPatient(patient);
    setAddDataDialogOpen(true);
  };

  const handleViewPatient = (patient: ConnectedPatient) => {
    setSelectedPatient(patient);
    setViewDialogOpen(true);
  };

  const handleUploadData = () => {
    if (!uploadFile) {
      toast.error('Please select a file to upload');
      return;
    }
    toast.success(`Data uploaded successfully for ${selectedPatient?.name}`);
    setUploadFile(null);
    setAddDataDialogOpen(false);
  };

  const handleGrantPermission = (patientName: string, file: string) => {
    toast.success(`Access granted to ${file} for ${patientName}`);
  };

  const handleRevokePermission = (patientName: string, file: string) => {
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
    }
  ]);

  // Mock data for permissions
  const [permissions] = useState<Permission[]>([
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
  const [alerts] = useState<Alert[]>([
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
    }
  ]);

  const filteredPatients = patients.filter(patient =>
    patient.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredPermissions = permissions.filter(permission =>
    permission.patient.toLowerCase().includes(permissionSearch.toLowerCase())
  );

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
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-3">
        <Tabs defaultValue="connected" className="w-full">
          <TabsList className="grid w-full grid-cols-3 mb-6">
            <TabsTrigger value="connected" className="gap-2">
              <Folder className="w-4 h-4" />
              Connected Patients
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
                  <Button variant="outline" className="bg-gray-100">
                    <Filter className="w-4 h-4 mr-2" />
                    Filter
                  </Button>
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
                            {patient.shared === 'Connected' ? (
                              <span className="text-gray-900">{patient.shared}</span>
                            ) : (
                              <span className="text-yellow-600">{patient.shared}</span>
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
                  <Button variant="outline" className="bg-gray-100">
                    <Filter className="w-4 h-4 mr-2" />
                    Filter
                  </Button>
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
                                  onClick={() => handleRevokePermission(permission.patient, permission.file)}
                                >
                                  Revoke
                                </Button>
                              )}
                              {permission.status === 'Revoked' && (
                                <Button 
                                  size="sm" 
                                  variant="outline" 
                                  className="bg-gray-100"
                                  onClick={() => handleGrantPermission(permission.patient, permission.file)}
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
                                    onClick={() => handleGrantPermission(permission.patient, permission.file)}
                                  >
                                    Grant
                                  </Button>
                                  <Button 
                                    size="sm" 
                                    variant="outline" 
                                    className="bg-gray-100"
                                    onClick={() => handleRevokePermission(permission.patient, permission.file)}
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

      {/* Right Sidebar - Alerts */}
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
              <div
                key={alert.id}
                className="bg-gray-100 rounded-lg p-3 space-y-1"
              >
                <div className="flex items-start justify-between">
                  <p className="text-sm">{alert.title}</p>
                  <span className="text-xs text-gray-500">{alert.timestamp}</span>
                </div>
                <p className="text-xs text-gray-600">{alert.description}</p>
              </div>
            ))}
          </CardContent>
        </Card>
        </div>
      </div>

      {/* View Patient Dialog */}
      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Patient Records - {selectedPatient?.name}</DialogTitle>
          <DialogDescription>
            View all shared records for this patient
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
                </tr>
              </thead>
              <tbody>
                <tr className="border-t">
                  <td className="p-3 text-sm">Lab Results - CBC</td>
                  <td className="p-3 text-sm text-gray-600">Lab Test</td>
                  <td className="p-3 text-sm text-gray-600">10/15/2024</td>
                </tr>
                <tr className="border-t">
                  <td className="p-3 text-sm">Prescription - Lisinopril</td>
                  <td className="p-3 text-sm text-gray-600">Medication</td>
                  <td className="p-3 text-sm text-gray-600">10/12/2024</td>
                </tr>
                <tr className="border-t">
                  <td className="p-3 text-sm">Visit Notes</td>
                  <td className="p-3 text-sm text-gray-600">Clinical Note</td>
                  <td className="p-3 text-sm text-gray-600">10/10/2024</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
        </DialogContent>
      </Dialog>

      {/* Add Data Dialog */}
      <Dialog open={addDataDialogOpen} onOpenChange={setAddDataDialogOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Data for {selectedPatient?.name}</DialogTitle>
          <DialogDescription>
            Upload medical records or documents for this patient
          </DialogDescription>
        </DialogHeader>
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
            <Label htmlFor="notes">Notes (Optional)</Label>
            <Textarea
              id="notes"
              placeholder="Add any additional notes..."
              rows={3}
            />
          </div>

          <Button onClick={handleUploadData} className="w-full">
            Upload Data
          </Button>
        </div>
      </DialogContent>
    </Dialog>
    </>
  );
}
