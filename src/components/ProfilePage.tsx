import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Separator } from './ui/separator';
import { 
  User, 
  Mail, 
  LogOut,
  Pill,
  Calendar,
  MapPin,
  Phone,
  ArrowLeft
} from 'lucide-react';
import { storageUtils } from '../utils/storage';
import { StoredHealthRecord } from '../types/fhir';

interface ProfilePageProps {
  userName: string;
  userEmail: string;
  onLogout: () => void;
  onBack?: () => void;
  userRole?: string;
}

export function ProfilePage({ userName, userEmail, onLogout, onBack, userRole }: ProfilePageProps) {
  const [medications, setMedications] = useState<StoredHealthRecord[]>([]);
  const [patientInfo, setPatientInfo] = useState<any>(null);

  useEffect(() => {
    // Only load patient-specific data if user is a patient
    if (userRole !== 'provider') {
      loadData();
    }
  }, [userRole]);

  const loadData = () => {
    const allRecords = storageUtils.getAllRecords();
    
    // Filter medications
    const meds = allRecords.filter(r => r.category === 'medication');
    setMedications(meds);
    
    // Get patient info
    const patientRecord = allRecords.find(r => r.category === 'patient');
    if (patientRecord) {
      const resource = patientRecord.resource as any;
      setPatientInfo({
        name: `${resource.name?.[0]?.given?.join(' ')} ${resource.name?.[0]?.family}`,
        birthDate: resource.birthDate,
        gender: resource.gender,
        phone: resource.telecom?.find((t: any) => t.system === 'phone')?.value,
        address: resource.address?.[0] ? 
          `${resource.address[0].line?.join(', ')}, ${resource.address[0].city}, ${resource.address[0].state} ${resource.address[0].postalCode}` : 
          null
      });
    }
  };

  const getMedicationName = (record: StoredHealthRecord): string => {
    const resource = record.resource as any;
    return resource.medicationCodeableConcept?.text || 'Medication';
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header with Back and Logout */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {onBack && (
            <Button 
              onClick={onBack}
              variant="ghost"
              size="sm"
            >
              <ArrowLeft className="w-4 h-4" />
            </Button>
          )}
          <h1 className="text-2xl text-gray-900">My Profile</h1>
        </div>
        <Button 
          onClick={onLogout}
          variant="outline"
          className="flex items-center gap-2"
        >
          <LogOut className="w-4 h-4" />
          Log Out
        </Button>
      </div>

      {/* Patient/Provider Information */}
      <Card className="bg-white">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="w-5 h-5" />
            {userRole === 'provider' ? 'Provider Information' : 'Patient Information'}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm text-gray-600">Full Name</label>
            <p className="text-base text-gray-900">{patientInfo?.name || userName}</p>
          </div>
          
          <Separator />
          
          <div>
            <label className="text-sm text-gray-600">Email</label>
            <div className="flex items-center gap-2 mt-1">
              <Mail className="w-4 h-4 text-gray-500" />
              <p className="text-base text-gray-900">{userEmail}</p>
            </div>
          </div>
          
          {patientInfo?.birthDate && (
            <>
              <Separator />
              <div>
                <label className="text-sm text-gray-600">Date of Birth</label>
                <div className="flex items-center gap-2 mt-1">
                  <Calendar className="w-4 h-4 text-gray-500" />
                  <p className="text-base text-gray-900">
                    {new Date(patientInfo.birthDate).toLocaleDateString()}
                  </p>
                </div>
              </div>
            </>
          )}
          
          {patientInfo?.gender && (
            <>
              <Separator />
              <div>
                <label className="text-sm text-gray-600">Gender</label>
                <p className="text-base text-gray-900 capitalize">{patientInfo.gender}</p>
              </div>
            </>
          )}
          
          {patientInfo?.phone && (
            <>
              <Separator />
              <div>
                <label className="text-sm text-gray-600">Phone</label>
                <div className="flex items-center gap-2 mt-1">
                  <Phone className="w-4 h-4 text-gray-500" />
                  <p className="text-base text-gray-900">{patientInfo.phone}</p>
                </div>
              </div>
            </>
          )}
          
          {patientInfo?.address && (
            <>
              <Separator />
              <div>
                <label className="text-sm text-gray-600">Address</label>
                <div className="flex items-center gap-2 mt-1">
                  <MapPin className="w-4 h-4 text-gray-500" />
                  <p className="text-base text-gray-900">{patientInfo.address}</p>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Medications - Only for patients */}
      {userRole !== 'provider' && (
        <Card className="bg-white">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Pill className="w-5 h-5 text-blue-600" />
              Current Medications
              <Badge variant="secondary" className="ml-auto">
                {medications.length}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {medications.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-4">No medications recorded</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {medications.map((med) => (
                  <div 
                    key={med.id}
                    className="p-4 bg-blue-50 border border-blue-200 rounded-lg"
                  >
                    <div className="flex items-start gap-2">
                      <Pill className="w-4 h-4 text-blue-600 mt-0.5" />
                      <div className="flex-1">
                        <p className="text-sm text-gray-900">{getMedicationName(med)}</p>
                        {med.provider && (
                          <p className="text-xs text-gray-600 mt-1">
                            Prescribed by Dr. {med.provider}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}