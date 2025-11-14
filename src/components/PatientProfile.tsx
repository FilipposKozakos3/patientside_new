import { useEffect, useState } from 'react';
import { storageUtils } from '../utils/storage';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Badge } from './ui/badge';
import { Alert, AlertDescription } from './ui/alert';
import { 
  User, 
  Pill, 
  AlertCircle, 
  Edit2, 
  Save, 
  X,
  Plus,
  Trash2
} from 'lucide-react';
import { Separator } from './ui/separator';

interface PatientProfileProps {
  refreshTrigger?: number;
}

interface PatientInfo {
  name: string;
  dateOfBirth: string;
  gender: string;
  bloodType: string;
  phone: string;
  emergencyContact: string;
  emergencyPhone: string;
}

export function PatientProfile({ refreshTrigger }: PatientProfileProps) {
  const [isEditingInfo, setIsEditingInfo] = useState(false);
  const [patientInfo, setPatientInfo] = useState<PatientInfo>({
    name: '',
    dateOfBirth: '',
    gender: '',
    bloodType: '',
    phone: '',
    emergencyContact: '',
    emergencyPhone: ''
  });
  const [medications, setMedications] = useState<any[]>([]);
  const [allergies, setAllergies] = useState<any[]>([]);
  const [newMedication, setNewMedication] = useState('');
  const [newAllergy, setNewAllergy] = useState('');

  useEffect(() => {
    loadPatientData();
  }, [refreshTrigger]);

  const loadPatientData = () => {
    // Load patient info from localStorage
    const savedInfo = localStorage.getItem('patientInfo');
    if (savedInfo) {
      setPatientInfo(JSON.parse(savedInfo));
    }

    // Load medications and allergies
    const allRecords = storageUtils.getAllRecords();
    const meds = allRecords.filter(r => r.category === 'medication');
    const alls = allRecords.filter(r => r.category === 'allergy');
    
    setMedications(meds);
    setAllergies(alls);
  };

  const savePatientInfo = () => {
    localStorage.setItem('patientInfo', JSON.stringify(patientInfo));
    setIsEditingInfo(false);
  };

  const addMedication = () => {
    if (!newMedication.trim()) return;

    const id = `med-${Date.now()}`;
    const newRecord = {
      id,
      resource: {
        resourceType: 'MedicationStatement',
        id,
        status: 'active',
        medicationCodeableConcept: {
          text: newMedication
        },
        subject: {
          reference: 'Patient/self'
        },
        effectivePeriod: {
          start: new Date().toISOString()
        },
        meta: {
          lastUpdated: new Date().toISOString()
        }
      },
      category: 'medication' as const,
      consent: {
        recordId: id,
        sharedWith: [],
        consentGiven: false
      },
      dateAdded: new Date().toISOString(),
      lastModified: new Date().toISOString()
    };

    storageUtils.saveRecord(newRecord);
    setNewMedication('');
    loadPatientData();
  };

  const addAllergy = () => {
    if (!newAllergy.trim()) return;

    const id = `allergy-${Date.now()}`;
    const newRecord = {
      id,
      resource: {
        resourceType: 'AllergyIntolerance',
        id,
        clinicalStatus: {
          coding: [{
            system: 'http://terminology.hl7.org/CodeSystem/allergyintolerance-clinical',
            code: 'active'
          }]
        },
        code: {
          text: newAllergy
        },
        patient: {
          reference: 'Patient/self'
        },
        meta: {
          lastUpdated: new Date().toISOString()
        }
      },
      category: 'allergy' as const,
      consent: {
        recordId: id,
        sharedWith: [],
        consentGiven: false
      },
      dateAdded: new Date().toISOString(),
      lastModified: new Date().toISOString()
    };

    storageUtils.saveRecord(newRecord);
    setNewAllergy('');
    loadPatientData();
  };

  const removeMedication = (id: string) => {
    storageUtils.deleteRecord(id);
    loadPatientData();
  };

  const removeAllergy = (id: string) => {
    storageUtils.deleteRecord(id);
    loadPatientData();
  };

  const getMedicationName = (record: any): string => {
    return record.resource.medicationCodeableConcept?.text || 'Medication';
  };

  const getAllergyName = (record: any): string => {
    return record.resource.code?.text || 'Allergy';
  };

  return (
    <div className="space-y-6">
      {/* Patient Information */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <User className="w-5 h-5" />
                Patient Information
              </CardTitle>
              <CardDescription>
                Your personal health information
              </CardDescription>
            </div>
            {!isEditingInfo ? (
              <Button
                onClick={() => setIsEditingInfo(true)}
                variant="outline"
                size="sm"
              >
                <Edit2 className="w-4 h-4 mr-2" />
                Edit
              </Button>
            ) : (
              <div className="flex gap-2">
                <Button
                  onClick={savePatientInfo}
                  size="sm"
                >
                  <Save className="w-4 h-4 mr-2" />
                  Save
                </Button>
                <Button
                  onClick={() => {
                    setIsEditingInfo(false);
                    loadPatientData();
                  }}
                  variant="outline"
                  size="sm"
                >
                  <X className="w-4 h-4 mr-2" />
                  Cancel
                </Button>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="name">Full Name</Label>
              <Input
                id="name"
                value={patientInfo.name}
                onChange={(e) => setPatientInfo({ ...patientInfo, name: e.target.value })}
                disabled={!isEditingInfo}
                placeholder="Enter your full name"
              />
            </div>
            <div>
              <Label htmlFor="dob">Date of Birth</Label>
              <Input
                id="dob"
                type="date"
                value={patientInfo.dateOfBirth}
                onChange={(e) => setPatientInfo({ ...patientInfo, dateOfBirth: e.target.value })}
                disabled={!isEditingInfo}
              />
            </div>
            <div>
              <Label htmlFor="gender">Gender</Label>
              <Input
                id="gender"
                value={patientInfo.gender}
                onChange={(e) => setPatientInfo({ ...patientInfo, gender: e.target.value })}
                disabled={!isEditingInfo}
                placeholder="e.g., Male, Female, Other"
              />
            </div>
            <div>
              <Label htmlFor="bloodType">Blood Type</Label>
              <Input
                id="bloodType"
                value={patientInfo.bloodType}
                onChange={(e) => setPatientInfo({ ...patientInfo, bloodType: e.target.value })}
                disabled={!isEditingInfo}
                placeholder="e.g., A+, O-, AB+"
              />
            </div>
            <div>
              <Label htmlFor="phone">Phone Number</Label>
              <Input
                id="phone"
                value={patientInfo.phone}
                onChange={(e) => setPatientInfo({ ...patientInfo, phone: e.target.value })}
                disabled={!isEditingInfo}
                placeholder="Your phone number"
              />
            </div>
            <div>
              <Label htmlFor="emergencyContact">Emergency Contact Name</Label>
              <Input
                id="emergencyContact"
                value={patientInfo.emergencyContact}
                onChange={(e) => setPatientInfo({ ...patientInfo, emergencyContact: e.target.value })}
                disabled={!isEditingInfo}
                placeholder="Emergency contact name"
              />
            </div>
            <div className="md:col-span-2">
              <Label htmlFor="emergencyPhone">Emergency Contact Phone</Label>
              <Input
                id="emergencyPhone"
                value={patientInfo.emergencyPhone}
                onChange={(e) => setPatientInfo({ ...patientInfo, emergencyPhone: e.target.value })}
                disabled={!isEditingInfo}
                placeholder="Emergency contact phone"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Medications */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Pill className="w-5 h-5 text-green-600" />
            Current Medications
          </CardTitle>
          <CardDescription>
            Medications you are currently taking
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {medications.length === 0 ? (
              <Alert>
                <AlertDescription>
                  No medications added. Add your current medications below.
                </AlertDescription>
              </Alert>
            ) : (
              <div className="space-y-2">
                {medications.map((med) => (
                  <div
                    key={med.id}
                    className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <Pill className="w-4 h-4 text-green-600" />
                      <div>
                        <p className="text-sm text-gray-900">
                          {getMedicationName(med)}
                        </p>
                        {med.resource.dosage?.[0]?.text && (
                          <p className="text-xs text-gray-600">
                            {med.resource.dosage[0].text}
                          </p>
                        )}
                      </div>
                    </div>
                    <Button
                      onClick={() => removeMedication(med.id)}
                      variant="ghost"
                      size="sm"
                    >
                      <Trash2 className="w-4 h-4 text-red-600" />
                    </Button>
                  </div>
                ))}
              </div>
            )}

            <Separator />

            <div className="flex gap-2">
              <Input
                value={newMedication}
                onChange={(e) => setNewMedication(e.target.value)}
                placeholder="Add new medication..."
                onKeyPress={(e) => e.key === 'Enter' && addMedication()}
              />
              <Button onClick={addMedication}>
                <Plus className="w-4 h-4 mr-2" />
                Add
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Allergies */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-red-600" />
            Allergies & Intolerances
          </CardTitle>
          <CardDescription>
            Known allergies and adverse reactions
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {allergies.length === 0 ? (
              <Alert>
                <AlertDescription>
                  No allergies recorded. Add any known allergies below.
                </AlertDescription>
              </Alert>
            ) : (
              <div className="space-y-2">
                {allergies.map((allergy) => (
                  <div
                    key={allergy.id}
                    className="flex items-center justify-between p-3 bg-red-50 border border-red-200 rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <AlertCircle className="w-4 h-4 text-red-600" />
                      <div>
                        <p className="text-sm text-gray-900">
                          {getAllergyName(allergy)}
                        </p>
                        {allergy.resource.reaction?.[0]?.manifestation?.[0]?.text && (
                          <p className="text-xs text-gray-600">
                            {allergy.resource.reaction[0].manifestation[0].text}
                          </p>
                        )}
                      </div>
                    </div>
                    <Button
                      onClick={() => removeAllergy(allergy.id)}
                      variant="ghost"
                      size="sm"
                    >
                      <Trash2 className="w-4 h-4 text-red-600" />
                    </Button>
                  </div>
                ))}
              </div>
            )}

            <Separator />

            <div className="flex gap-2">
              <Input
                value={newAllergy}
                onChange={(e) => setNewAllergy(e.target.value)}
                placeholder="Add new allergy..."
                onKeyPress={(e) => e.key === 'Enter' && addAllergy()}
              />
              <Button onClick={addAllergy}>
                <Plus className="w-4 h-4 mr-2" />
                Add
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
