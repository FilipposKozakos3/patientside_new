// FHIR-compliant data types for health records

export interface FHIRResource {
  resourceType: string;
  id: string;
  meta?: {
    lastUpdated: string;
    versionId?: string;
  };
}

export interface PatientRecord extends FHIRResource {
  resourceType: 'Patient';
  name: Array<{
    use: string;
    family: string;
    given: string[];
  }>;
  gender?: 'male' | 'female' | 'other' | 'unknown';
  birthDate?: string;
  telecom?: Array<{
    system: string;
    value: string;
  }>;
  address?: Array<{
    use: string;
    line: string[];
    city: string;
    state: string;
    postalCode: string;
    country: string;
  }>;
}

export interface MedicationRecord extends FHIRResource {
  resourceType: 'MedicationStatement';
  status: 'active' | 'completed' | 'stopped';
  medicationCodeableConcept: {
    text: string;
    coding?: Array<{
      system: string;
      code: string;
      display: string;
    }>;
  };
  subject: {
    reference: string;
  };
  effectivePeriod?: {
    start: string;
    end?: string;
  };
  dosage?: Array<{
    text: string;
    timing?: any;
  }>;
}

export interface AllergyRecord extends FHIRResource {
  resourceType: 'AllergyIntolerance';
  clinicalStatus: {
    coding: Array<{
      system: string;
      code: string;
    }>;
  };
  code: {
    text: string;
  };
  patient: {
    reference: string;
  };
  reaction?: Array<{
    manifestation: Array<{
      text: string;
    }>;
    severity?: 'mild' | 'moderate' | 'severe';
  }>;
}

export interface ImmunizationRecord extends FHIRResource {
  resourceType: 'Immunization';
  status: 'completed' | 'not-done';
  vaccineCode: {
    text: string;
  };
  patient: {
    reference: string;
  };
  occurrenceDateTime: string;
  lotNumber?: string;
  performer?: Array<{
    actor: {
      display: string;
    };
  }>;
}

export interface ObservationRecord extends FHIRResource {
  resourceType: 'Observation';
  status: 'final' | 'preliminary' | 'amended';
  category?: Array<{
    coding: Array<{
      system: string;
      code: string;
      display: string;
    }>;
  }>;
  code: {
    text: string;
  };
  subject: {
    reference: string;
  };
  effectiveDateTime?: string;
  valueQuantity?: {
    value: number;
    unit: string;
    system?: string;
    code?: string;
  };
  valueString?: string;
}

export interface DocumentRecord extends FHIRResource {
  resourceType: 'DocumentReference';
  status: 'current';
  type: {
    text: string;
  };
  subject: {
    reference: string;
  };
  date: string;
  content: Array<{
    attachment: {
      contentType: string;
      data?: string; // base64 encoded
      url?: string;
      title?: string;
    };
  }>;
}

export interface HealthRecordConsent {
  recordId: string;
  sharedWith: string[];
  lastShared?: string;
  consentGiven: boolean;
}

export interface StoredHealthRecord {
  id: string;
  resource: FHIRResource;
  consent: HealthRecordConsent;
  category: 'patient' | 'medication' | 'allergy' | 'immunization' | 'observation' | 'document';
  dateAdded: string;
  lastModified: string;
  visitDate?: string; // Date of medical visit/encounter
  provider?: string; // Healthcare provider who created/uploaded the record
  tags?: string[];
  encrypted?: boolean;
}
