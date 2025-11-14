import { useState, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Textarea } from './ui/textarea';
import { storageUtils } from '../utils/storage';
import { StoredHealthRecord, FHIRResource } from '../types/fhir';
import { Upload, FileJson, Plus } from 'lucide-react';
import { Alert, AlertDescription } from './ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';

interface UploadRecordProps {
  onRecordAdded: () => void;
}

export function UploadRecord({ onRecordAdded }: UploadRecordProps) {
  const [uploadStatus, setUploadStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Manual entry state
  const [category, setCategory] = useState<StoredHealthRecord['category']>('medication');
  const [manualData, setManualData] = useState({
    name: '',
    description: '',
    date: new Date().toISOString().split('T')[0],
    visitDate: new Date().toISOString().split('T')[0],
    provider: '',
    additionalInfo: ''
  });

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const fileExtension = file.name.split('.').pop()?.toLowerCase();
      
      // Handle JSON files (FHIR import)
      if (fileExtension === 'json') {
        const text = await file.text();
        const result = storageUtils.importFromJSON(text);

        if (result.success) {
          setUploadStatus({
            type: 'success',
            message: `Successfully imported ${result.count} record(s)`
          });
          onRecordAdded();
        } else {
          setUploadStatus({
            type: 'error',
            message: result.error || 'Failed to import records'
          });
        }
      } 
      // Handle other file types (PDF, DOC, images)
      else if (['pdf', 'doc', 'docx', 'jpg', 'jpeg', 'png', 'heic'].includes(fileExtension || '')) {
        // Convert file to base64
        const reader = new FileReader();
        reader.onload = (e) => {
          const base64Data = e.target?.result as string;
          
          // Create a DocumentReference FHIR resource
          const id = `doc-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
          const newRecord: StoredHealthRecord = {
            id,
            resource: {
              resourceType: 'DocumentReference',
              id,
              status: 'current',
              type: {
                text: file.name
              },
              subject: {
                reference: 'Patient/self'
              },
              date: new Date().toISOString(),
              content: [{
                attachment: {
                  contentType: file.type || `application/${fileExtension}`,
                  title: file.name,
                  data: base64Data.split(',')[1], // Remove data URL prefix
                  size: file.size
                }
              }],
              meta: {
                lastUpdated: new Date().toISOString()
              }
            },
            category: 'document',
            consent: {
              recordId: id,
              sharedWith: [],
              consentGiven: false
            },
            dateAdded: new Date().toISOString(),
            lastModified: new Date().toISOString()
          };

          storageUtils.saveRecord(newRecord);
          setUploadStatus({
            type: 'success',
            message: `Successfully uploaded ${file.name}`
          });
          onRecordAdded();
        };

        reader.onerror = () => {
          setUploadStatus({
            type: 'error',
            message: 'Error reading file. Please try again.'
          });
        };

        reader.readAsDataURL(file);
      } else {
        setUploadStatus({
          type: 'error',
          message: 'Unsupported file type. Please upload JSON, PDF, DOC, DOCX, JPG, PNG, or HEIC files.'
        });
      }

      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (error) {
      setUploadStatus({
        type: 'error',
        message: 'Error processing file. Please try again.'
      });
    }

    setTimeout(() => setUploadStatus(null), 5000);
  };

  const handleManualAdd = () => {
    if (!manualData.name) {
      setUploadStatus({
        type: 'error',
        message: 'Please provide a name for the record'
      });
      return;
    }

    const id = `record-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    let resource: FHIRResource;
    
    switch (category) {
      case 'medication':
        resource = {
          resourceType: 'MedicationStatement',
          id,
          status: 'active',
          medicationCodeableConcept: {
            text: manualData.name
          },
          subject: {
            reference: 'Patient/self'
          },
          effectivePeriod: {
            start: manualData.date
          },
          dosage: manualData.description ? [{
            text: manualData.description
          }] : undefined,
          meta: {
            lastUpdated: new Date().toISOString()
          }
        };
        break;

      case 'allergy':
        resource = {
          resourceType: 'AllergyIntolerance',
          id,
          clinicalStatus: {
            coding: [{
              system: 'http://terminology.hl7.org/CodeSystem/allergyintolerance-clinical',
              code: 'active'
            }]
          },
          code: {
            text: manualData.name
          },
          patient: {
            reference: 'Patient/self'
          },
          reaction: manualData.description ? [{
            manifestation: [{
              text: manualData.description
            }]
          }] : undefined,
          meta: {
            lastUpdated: new Date().toISOString()
          }
        };
        break;

      case 'immunization':
        resource = {
          resourceType: 'Immunization',
          id,
          status: 'completed',
          vaccineCode: {
            text: manualData.name
          },
          patient: {
            reference: 'Patient/self'
          },
          occurrenceDateTime: manualData.date,
          meta: {
            lastUpdated: new Date().toISOString()
          }
        };
        break;

      case 'observation':
        resource = {
          resourceType: 'Observation',
          id,
          status: 'final',
          code: {
            text: manualData.name
          },
          subject: {
            reference: 'Patient/self'
          },
          effectiveDateTime: manualData.date,
          valueString: manualData.description,
          meta: {
            lastUpdated: new Date().toISOString()
          }
        };
        break;

      case 'document':
        resource = {
          resourceType: 'DocumentReference',
          id,
          status: 'current',
          type: {
            text: manualData.name
          },
          subject: {
            reference: 'Patient/self'
          },
          date: manualData.date,
          content: [{
            attachment: {
              contentType: 'text/plain',
              title: manualData.name,
              data: btoa(manualData.additionalInfo || manualData.description)
            }
          }],
          meta: {
            lastUpdated: new Date().toISOString()
          }
        };
        break;

      default:
        resource = {
          resourceType: 'Basic',
          id,
          meta: {
            lastUpdated: new Date().toISOString()
          }
        };
    }

    const newRecord: StoredHealthRecord = {
      id,
      resource,
      category,
      consent: {
        recordId: id,
        sharedWith: [],
        consentGiven: false
      },
      dateAdded: new Date().toISOString(),
      lastModified: new Date().toISOString(),
      visitDate: manualData.visitDate,
      provider: manualData.provider || undefined
    };

    storageUtils.saveRecord(newRecord);
    setUploadStatus({
      type: 'success',
      message: 'Record added successfully'
    });
    
    // Reset form
    setManualData({
      name: '',
      description: '',
      date: new Date().toISOString().split('T')[0],
      visitDate: new Date().toISOString().split('T')[0],
      provider: '',
      additionalInfo: ''
    });
    
    onRecordAdded();
    setTimeout(() => setUploadStatus(null), 3000);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Add Health Records</CardTitle>
        <CardDescription>
          Import FHIR-compliant records or manually add new health information
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="upload">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="upload">
              <Upload className="w-4 h-4 mr-2" />
              Upload File
            </TabsTrigger>
            <TabsTrigger value="manual">
              <Plus className="w-4 h-4 mr-2" />
              Manual Entry
            </TabsTrigger>
          </TabsList>

          <TabsContent value="upload" className="space-y-4">
            <div className="space-y-4">
              <div>
                <Label htmlFor="file-upload">Upload Health Document</Label>
                <div className="mt-2 flex items-center gap-4">
                  <Input
                    id="file-upload"
                    type="file"
                    accept=".json,.pdf,.doc,.docx,.jpg,.jpeg,.png,.heic"
                    onChange={handleFileUpload}
                    ref={fileInputRef}
                    className="flex-1"
                  />
                  <Button
                    variant="outline"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <FileJson className="w-4 h-4 mr-2" />
                    Browse
                  </Button>
                </div>
                <p className="mt-2 text-sm text-gray-500">
                  Upload FHIR JSON files, PDFs, documents (DOC/DOCX), or images (JPG/PNG/HEIC)
                </p>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="manual" className="space-y-4">
            <div className="space-y-4">
              <div>
                <Label htmlFor="category">Record Type</Label>
                <Select value={category} onValueChange={(value) => setCategory(value as any)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="medication">Medication</SelectItem>
                    <SelectItem value="allergy">Allergy</SelectItem>
                    <SelectItem value="immunization">Immunization</SelectItem>
                    <SelectItem value="observation">Lab Result / Observation</SelectItem>
                    <SelectItem value="document">Document</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="name">Name / Title *</Label>
                <Input
                  id="name"
                  value={manualData.name}
                  onChange={(e) => setManualData({ ...manualData, name: e.target.value })}
                  placeholder="e.g., Aspirin, Peanut Allergy, COVID-19 Vaccine"
                />
              </div>

              <div>
                <Label htmlFor="description">Description / Dosage</Label>
                <Textarea
                  id="description"
                  value={manualData.description}
                  onChange={(e) => setManualData({ ...manualData, description: e.target.value })}
                  placeholder="e.g., 100mg daily, Severe reaction, Moderna dose 1"
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="date">Record Date</Label>
                  <Input
                    id="date"
                    type="date"
                    value={manualData.date}
                    onChange={(e) => setManualData({ ...manualData, date: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="visitDate">Visit Date (Optional)</Label>
                  <Input
                    id="visitDate"
                    type="date"
                    value={manualData.visitDate}
                    onChange={(e) => setManualData({ ...manualData, visitDate: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="provider">Healthcare Provider (Optional)</Label>
                <Input
                  id="provider"
                  value={manualData.provider}
                  onChange={(e) => setManualData({ ...manualData, provider: e.target.value })}
                  placeholder="e.g., Dr. Smith, City Hospital"
                />
              </div>

              <div>
                <Label htmlFor="additional">Additional Notes</Label>
                <Textarea
                  id="additional"
                  value={manualData.additionalInfo}
                  onChange={(e) => setManualData({ ...manualData, additionalInfo: e.target.value })}
                  placeholder="Any additional information..."
                  rows={2}
                />
              </div>

              <Button onClick={handleManualAdd} className="w-full">
                <Plus className="w-4 h-4 mr-2" />
                Add Record
              </Button>
            </div>
          </TabsContent>
        </Tabs>

        {uploadStatus && (
          <Alert className={`mt-4 ${uploadStatus.type === 'error' ? 'border-red-500' : 'border-green-500'}`}>
            <AlertDescription>
              {uploadStatus.message}
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}
