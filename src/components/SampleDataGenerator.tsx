import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { storageUtils } from '../utils/storage';
import { StoredHealthRecord } from '../types/fhir';
import { Database, Trash2 } from 'lucide-react';
import { Alert, AlertDescription } from './ui/alert';

interface SampleDataGeneratorProps {
  onDataGenerated: () => void;
}

export function SampleDataGenerator({ onDataGenerated }: SampleDataGeneratorProps) {
  const generateSampleData = () => {
    const sampleRecords: StoredHealthRecord[] = [
      {
        id: 'sample-med-1',
        category: 'medication',
        resource: {
          resourceType: 'MedicationStatement',
          id: 'sample-med-1',
          status: 'active',
          medicationCodeableConcept: {
            text: 'Lisinopril 10mg'
          },
          subject: {
            reference: 'Patient/self'
          },
          effectivePeriod: {
            start: '2024-01-15'
          },
          dosage: [{
            text: 'Take one tablet daily in the morning'
          }],
          meta: {
            lastUpdated: new Date().toISOString()
          }
        },
        consent: {
          recordId: 'sample-med-1',
          sharedWith: [],
          consentGiven: false
        },
        dateAdded: '2024-01-15T10:00:00.000Z',
        lastModified: new Date().toISOString()
      },
      {
        id: 'sample-allergy-1',
        category: 'allergy',
        resource: {
          resourceType: 'AllergyIntolerance',
          id: 'sample-allergy-1',
          clinicalStatus: {
            coding: [{
              system: 'http://terminology.hl7.org/CodeSystem/allergyintolerance-clinical',
              code: 'active'
            }]
          },
          code: {
            text: 'Penicillin'
          },
          patient: {
            reference: 'Patient/self'
          },
          reaction: [{
            manifestation: [{
              text: 'Hives and itching'
            }],
            severity: 'moderate'
          }],
          meta: {
            lastUpdated: new Date().toISOString()
          }
        },
        consent: {
          recordId: 'sample-allergy-1',
          sharedWith: ['Emergency Department'],
          consentGiven: true
        },
        dateAdded: '2023-11-20T14:30:00.000Z',
        lastModified: new Date().toISOString()
      },
      {
        id: 'sample-imm-1',
        category: 'immunization',
        resource: {
          resourceType: 'Immunization',
          id: 'sample-imm-1',
          status: 'completed',
          vaccineCode: {
            text: 'COVID-19 mRNA Vaccine'
          },
          patient: {
            reference: 'Patient/self'
          },
          occurrenceDateTime: '2024-09-15',
          lotNumber: 'EK5730',
          performer: [{
            actor: {
              display: 'Community Health Clinic'
            }
          }],
          meta: {
            lastUpdated: new Date().toISOString()
          }
        },
        consent: {
          recordId: 'sample-imm-1',
          sharedWith: [],
          consentGiven: false
        },
        dateAdded: '2024-09-15T11:45:00.000Z',
        lastModified: new Date().toISOString()
      },
      {
        id: 'sample-obs-1',
        category: 'observation',
        resource: {
          resourceType: 'Observation',
          id: 'sample-obs-1',
          status: 'final',
          category: [{
            coding: [{
              system: 'http://terminology.hl7.org/CodeSystem/observation-category',
              code: 'laboratory',
              display: 'Laboratory'
            }]
          }],
          code: {
            text: 'Blood Glucose'
          },
          subject: {
            reference: 'Patient/self'
          },
          effectiveDateTime: '2025-10-10',
          valueQuantity: {
            value: 95,
            unit: 'mg/dL',
            system: 'http://unitsofmeasure.org',
            code: 'mg/dL'
          },
          meta: {
            lastUpdated: new Date().toISOString()
          }
        },
        consent: {
          recordId: 'sample-obs-1',
          sharedWith: [],
          consentGiven: false
        },
        dateAdded: '2025-10-10T09:20:00.000Z',
        lastModified: new Date().toISOString()
      },
      {
        id: 'sample-doc-1',
        category: 'document',
        resource: {
          resourceType: 'DocumentReference',
          id: 'sample-doc-1',
          status: 'current',
          type: {
            text: 'Discharge Summary'
          },
          subject: {
            reference: 'Patient/self'
          },
          date: '2024-08-22',
          content: [{
            attachment: {
              contentType: 'text/plain',
              title: 'Hospital Discharge Summary',
              data: btoa('Patient was admitted for minor surgery. Procedure completed successfully. Discharged in stable condition with follow-up appointment scheduled.')
            }
          }],
          meta: {
            lastUpdated: new Date().toISOString()
          }
        },
        consent: {
          recordId: 'sample-doc-1',
          sharedWith: ['Primary Care Physician'],
          consentGiven: true,
          lastShared: '2024-08-23T10:00:00.000Z'
        },
        dateAdded: '2024-08-22T16:00:00.000Z',
        lastModified: new Date().toISOString()
      }
    ];

    sampleRecords.forEach(record => {
      storageUtils.saveRecord(record);
    });

    onDataGenerated();
  };

  const clearAllData = () => {
    if (confirm('Are you sure you want to delete ALL health records? This action cannot be undone.')) {
      storageUtils.clearAllRecords();
      onDataGenerated();
    }
  };

  return (
    <Card className="border-dashed">
      <CardHeader>
        <CardTitle className="text-base">Demo Data</CardTitle>
        <CardDescription>
          Quickly populate your storage with sample health records for testing
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <Button 
          onClick={generateSampleData} 
          variant="outline" 
          className="w-full"
        >
          <Database className="w-4 h-4 mr-2" />
          Load Sample Records
        </Button>
        
        <Button 
          onClick={clearAllData} 
          variant="outline" 
          className="w-full text-red-600 hover:text-red-700"
        >
          <Trash2 className="w-4 h-4 mr-2" />
          Clear All Records
        </Button>

        <Alert>
          <AlertDescription className="text-xs">
            Sample data includes medications, allergies, immunizations, lab results, and documents.
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  );
}
