import { useState, useEffect } from 'react';
import { storageUtils } from '../utils/storage';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from './ui/dialog';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Alert, AlertDescription } from './ui/alert';
import { toast } from 'sonner@2.0.3';
import { supabase } from '../supabase/supabaseClient';
import { 
  Download, 
  FileText, 
  CheckCircle, 
  Share2,
  Pill,
  AlertCircle,
  Activity,
  Syringe
} from 'lucide-react';
import { Separator } from './ui/separator';
import jsPDF from 'jspdf';

interface PatientExportSummaryProps {
  isOpen: boolean;
  onClose: () => void;
}

export function PatientExportSummary({ isOpen, onClose }: PatientExportSummaryProps) {
  const [summary, setSummary] = useState<any>(null);

  useEffect(() => {
    if (isOpen) {
      generateSummary();
    }
  }, [isOpen]);

    // added for generating Health Summary

    // added for generating Health Summary
const generateSummary = async () => {
  // 1) Local records (what was already there)
  const allRecords = storageUtils.getAllRecords();

  const localMedications = allRecords
    .filter(r => r.category === 'medication')
    .map(r => r.resource);

  const localAllergies = allRecords
    .filter(r => r.category === 'allergy')
    .map(r => r.resource);

  const localObservations = allRecords
    .filter(r => r.category === 'observation')
    .map(r => r.resource);

  const localImmunizations = allRecords
    .filter(r => r.category === 'immunization')
    .map(r => r.resource);

  const localDocuments = allRecords
    .filter(r => r.category === 'document')
    .map(r => r.resource);

  const patient = allRecords
    .filter(r => r.category === 'patient')
    .map(r => r.resource)[0];

  // 2) Get current user email
  let userEmail: string | null = null;
  try {
    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (!userError && userData?.user?.email) {
      userEmail = userData.user.email;
    }
  } catch (err) {
    console.error('Error getting user for export summary:', err);
  }

  // 3) If logged in, pull rows from Supabase tables and map to FHIR
  let dbMedications: any[] = [];
  let dbAllergies: any[] = [];
  let dbObservations: any[] = [];
  let dbImmunizations: any[] = [];

  let manualMedications: any[] = [];
  let manualAllergies: any[] = [];
  let manualObservations: any[] = [];
  let manualImmunizations: any[] = [];


  if (userEmail) {
    try {
      const [
        { data: medsRows, error: medsError },
        { data: allergyRows, error: allergyError },
        { data: labRows, error: labError },
        { data: immRows, error: immError },
      ] = await Promise.all([
        supabase.from('medications')
          .select('id, medication')
          .eq('email', userEmail),
        supabase.from('allergies')
          .select('id, allergy')
          .eq('email', userEmail),
        supabase.from('lab_results')
          .select('id, test_name, result_value, result_date')
          .eq('email', userEmail),
        supabase.from('immunizations')
          .select('id, immunization, date')
          .eq('email', userEmail),
      ]);

      if (medsError) console.error("Error loading medications:", medsError);
      if (allergyError) console.error("Error loading allergies:", allergyError);
      if (labError) console.error("Error loading lab_results:", labError);
      if (immError) console.error("Error loading immunizations:", immError);

      // ✅ NEW: load manual uploads from health_records
      const { data: hrRows, error: hrError } = await supabase
        .from("health_records")
        .select("id, file_name, provider_name, document_type, uploaded_at")
        .eq("email", userEmail);

      if (hrError) console.error("Error loading health_records:", hrError);

      const nowIso = new Date().toISOString();

      // reset manual arrays (important if generateSummary runs multiple times)
      manualMedications = [];
      manualAllergies = [];
      manualObservations = [];
      manualImmunizations = [];

      (hrRows || []).forEach((row: any) => {
        const type = (row.document_type || "").toLowerCase();
        const label =
          (row.file_name || "").replace(/\.pdf$/i, "") || "Manual record";
        const lastUpdated = row.uploaded_at || nowIso;

        // Manual Medications
        if (type === "medication") {
          manualMedications.push({
            resourceType: "MedicationStatement",
            id: `manual-med-${row.id}`,
            status: "active",
            medicationCodeableConcept: { text: label },
            subject: { reference: "Patient/self" },
            effectiveDateTime: lastUpdated,
            meta: { lastUpdated },
          });
        }

        // Manual Allergies
        if (type === "allergy") {
          manualAllergies.push({
            resourceType: "AllergyIntolerance",
            id: `manual-allergy-${row.id}`,
            clinicalStatus: {
              coding: [
                {
                  system:
                    "http://terminology.hl7.org/CodeSystem/allergyintolerance-clinical",
                  code: "active",
                },
              ],
            },
            code: { text: label },
            patient: { reference: "Patient/self" },
            recordedDate: lastUpdated,
            meta: { lastUpdated },
          });
        }

        // Manual Labs / Observations
        if (type === "lab_result" || type === "lab" || type === "observation") {
          manualObservations.push({
            resourceType: "Observation",
            id: `manual-lab-${row.id}`,
            status: "final",
            code: { text: label },
            subject: { reference: "Patient/self" },
            effectiveDateTime: lastUpdated,
            valueString: label,
            meta: { lastUpdated },
          });
        }

        // Manual Immunizations
        if (type === "immunization") {
          manualImmunizations.push({
            resourceType: "Immunization",
            id: `manual-imm-${row.id}`,
            status: "completed",
            vaccineCode: { text: label },
            patient: { reference: "Patient/self" },
            occurrenceDateTime: lastUpdated,
            meta: { lastUpdated },
          });
        }
      });

      

      dbMedications = (medsRows || []).map((row: any) => ({
        resourceType: 'MedicationStatement',
        id: `db-med-${row.id}`,
        status: 'active',
        medicationCodeableConcept: {
          text: row.medication,
        },
        subject: { reference: 'Patient/self' },
        meta: { lastUpdated: nowIso },
      }));

      dbAllergies = (allergyRows || []).map((row: any) => ({
        resourceType: 'AllergyIntolerance',
        id: `db-allergy-${row.id}`,
        clinicalStatus: {
          coding: [{
            system: 'http://terminology.hl7.org/CodeSystem/allergyintolerance-clinical',
            code: 'active',
          }],
        },
        code: { text: row.allergy },
        patient: { reference: 'Patient/self' },
        meta: { lastUpdated: nowIso },
      }));

      dbObservations = (labRows || []).map((row: any) => ({
        resourceType: 'Observation',
        id: `db-lab-${row.id}`,
        status: 'final',
        code: { text: row.test_name },
        subject: { reference: 'Patient/self' },
        effectiveDateTime: row.result_date || nowIso,
        valueString: row.result_value || row.test_name,
        meta: { lastUpdated: nowIso },
      }));

      dbImmunizations = (immRows || []).map((row: any) => ({
        resourceType: 'Immunization',
        id: `db-imm-${row.id}`,
        status: 'completed',
        vaccineCode: { text: row.immunization },
        patient: { reference: 'Patient/self' },
        occurrenceDateTime: row.date || nowIso,
        meta: { lastUpdated: nowIso },
      }));
    } catch (err) {
      console.error('Error loading Supabase data for export summary:', err);
    }
  }

  // 4) Combine local + Supabase FHIR resources
  // const medications   = [...localMedications,   ...dbMedications];
  // const allergies     = [...localAllergies,     ...dbAllergies];
  // const observations  = [...localObservations,  ...dbObservations];
  // const immunizations = [...localImmunizations, ...dbImmunizations];

  const medications = [
    ...localMedications,
    ...dbMedications,
    ...manualMedications,
  ];

  const allergies = [
    ...localAllergies,
    ...dbAllergies,
    ...manualAllergies,
  ];

  const observations = [
    ...localObservations,
    ...dbObservations,
    ...manualObservations,
  ];

  const immunizations = [
    ...localImmunizations,
    ...dbImmunizations,
    ...manualImmunizations,
  ];


  // 5) Build FHIR Bundle
  const bundle = {
    resourceType: 'Bundle',
    type: 'collection',
    timestamp: new Date().toISOString(),
    meta: {
      lastUpdated: new Date().toISOString(),
      profile: ['http://hl7.org/fhir/StructureDefinition/Bundle'],
    },
    entry: [
      ...(patient ? [{
        fullUrl: `Patient/${patient.id}`,
        resource: patient,
      }] : []),
      ...medications.map(m => ({
        fullUrl: `MedicationStatement/${m.id}`,
        resource: m,
      })),
      ...allergies.map(a => ({
        fullUrl: `AllergyIntolerance/${a.id}`,
        resource: a,
      })),
      ...observations.map(o => ({
        fullUrl: `Observation/${o.id}`,
        resource: o,
      })),
      ...immunizations.map(i => ({
        fullUrl: `Immunization/${i.id}`,
        resource: i,
      })),
      ...localDocuments.map(d => ({
        fullUrl: `DocumentReference/${d.id}`,
        resource: d,
      })),
    ],
    total:
      medications.length +
      allergies.length +
      observations.length +
      immunizations.length,
  };

  // 👇 NEW: expose detailed lists for the PDF
  setSummary({
    bundle,
    counts: {
      medications: medications.length,
      allergies: allergies.length,
      observations: observations.length,
      immunizations: immunizations.length,
      hasPatientInfo: !!patient,
    },
    details: {
      medications,
      allergies,
      observations,
      immunizations,
      documents: localDocuments,
      patient,
    },
  });
};


  //   const generateSummary = async () => {
  //   // 1) Local records (what was already there)
  //   const allRecords = storageUtils.getAllRecords();

  //   const localMedications = allRecords
  //     .filter(r => r.category === 'medication')
  //     .map(r => r.resource);

  //   const localAllergies = allRecords
  //     .filter(r => r.category === 'allergy')
  //     .map(r => r.resource);

  //   const localObservations = allRecords
  //     .filter(r => r.category === 'observation')
  //     .map(r => r.resource);

  //   const localImmunizations = allRecords
  //     .filter(r => r.category === 'immunization')
  //     .map(r => r.resource);

  //   const localDocuments = allRecords
  //     .filter(r => r.category === 'document')
  //     .map(r => r.resource);

  //   const patient = allRecords
  //     .filter(r => r.category === 'patient')
  //     .map(r => r.resource)[0];

  //   // 2) Get current user email
  //   let userEmail: string | null = null;
  //   try {
  //     const { data: userData, error: userError } = await supabase.auth.getUser();
  //     if (!userError && userData?.user?.email) {
  //       userEmail = userData.user.email;
  //     }
  //   } catch (err) {
  //     console.error('Error getting user for export summary:', err);
  //   }

  //   // 3) If logged in, pull rows from Supabase tables and map to FHIR
  //   let dbMedications: any[] = [];
  //   let dbAllergies: any[] = [];
  //   let dbObservations: any[] = [];
  //   let dbImmunizations: any[] = [];

  //   if (userEmail) {
  //     try {
  //       const [{ data: medsRows, error: medsError },
  //              { data: allergyRows, error: allergyError },
  //              { data: labRows, error: labError },
  //              { data: immRows, error: immError }] = await Promise.all([
  //         supabase.from('medications')
  //           .select('id, medication')
  //           .eq('email', userEmail),
  //         supabase.from('allergies')
  //           .select('id, allergy')
  //           .eq('email', userEmail),
  //         supabase.from('lab_results')
  //           .select('id, test_name, result_value, result_date')
  //           .eq('email', userEmail),
  //         supabase.from('immunizations')
  //           .select('id, immunization, date')
  //           .eq('email', userEmail),
  //       ]);

  //       if (medsError) console.error('Error loading medications:', medsError);
  //       if (allergyError) console.error('Error loading allergies:', allergyError);
  //       if (labError) console.error('Error loading lab_results:', labError);
  //       if (immError) console.error('Error loading immunizations:', immError);

  //       const nowIso = new Date().toISOString();

  //       dbMedications = (medsRows || []).map((row: any) => ({
  //         resourceType: 'MedicationStatement',
  //         id: `db-med-${row.id}`,
  //         status: 'active',
  //         medicationCodeableConcept: {
  //           text: row.medication,
  //         },
  //         subject: { reference: 'Patient/self' },
  //         meta: { lastUpdated: nowIso },
  //       }));

  //       dbAllergies = (allergyRows || []).map((row: any) => ({
  //         resourceType: 'AllergyIntolerance',
  //         id: `db-allergy-${row.id}`,
  //         clinicalStatus: {
  //           coding: [{
  //             system: 'http://terminology.hl7.org/CodeSystem/allergyintolerance-clinical',
  //             code: 'active',
  //           }],
  //         },
  //         code: { text: row.allergy },
  //         patient: { reference: 'Patient/self' },
  //         meta: { lastUpdated: nowIso },
  //       }));

  //       dbObservations = (labRows || []).map((row: any) => ({
  //         resourceType: 'Observation',
  //         id: `db-lab-${row.id}`,
  //         status: 'final',
  //         code: { text: row.test_name },
  //         subject: { reference: 'Patient/self' },
  //         effectiveDateTime: row.result_date || nowIso,
  //         valueString: row.result_value || row.test_name,
  //         meta: { lastUpdated: nowIso },
  //       }));

  //       dbImmunizations = (immRows || []).map((row: any) => ({
  //         resourceType: 'Immunization',
  //         id: `db-imm-${row.id}`,
  //         status: 'completed',
  //         vaccineCode: { text: row.immunization },
  //         patient: { reference: 'Patient/self' },
  //         occurrenceDateTime: row.date || nowIso,
  //         meta: { lastUpdated: nowIso },
  //       }));
  //     } catch (err) {
  //       console.error('Error loading Supabase data for export summary:', err);
  //     }
  //   }

  //   // 4) Combine local + Supabase FHIR resources
  //   const medications = [...localMedications, ...dbMedications];
  //   const allergies = [...localAllergies, ...dbAllergies];
  //   const observations = [...localObservations, ...dbObservations];
  //   const immunizations = [...localImmunizations, ...dbImmunizations];

  //   // 5) Build FHIR Bundle
  //   const bundle = {
  //     resourceType: 'Bundle',
  //     type: 'collection',
  //     timestamp: new Date().toISOString(),
  //     meta: {
  //       lastUpdated: new Date().toISOString(),
  //       profile: ['http://hl7.org/fhir/StructureDefinition/Bundle'],
  //     },
  //     entry: [
  //       ...(patient ? [{
  //         fullUrl: `Patient/${patient.id}`,
  //         resource: patient,
  //       }] : []),
  //       ...medications.map(m => ({
  //         fullUrl: `MedicationStatement/${m.id}`,
  //         resource: m,
  //       })),
  //       ...allergies.map(a => ({
  //         fullUrl: `AllergyIntolerance/${a.id}`,
  //         resource: a,
  //       })),
  //       ...observations.map(o => ({
  //         fullUrl: `Observation/${o.id}`,
  //         resource: o,
  //       })),
  //       ...immunizations.map(i => ({
  //         fullUrl: `Immunization/${i.id}`,
  //         resource: i,
  //       })),
  //       ...localDocuments.map(d => ({
  //         fullUrl: `DocumentReference/${d.id}`,
  //         resource: d,
  //       })),
  //     ],
  //     total:
  //       medications.length +
  //       allergies.length +
  //       observations.length +
  //       immunizations.length +
  //       localDocuments.length +
  //       (patient ? 1 : 0),
  //   };

  //   setSummary({
  //     bundle,
  //     counts: {
  //       medications: medications.length,
  //       allergies: allergies.length,
  //       observations: observations.length,
  //       immunizations: immunizations.length,
  //       hasPatientInfo: !!patient,
  //     },
  //   });
  // };



  // commented out - correct functionality added above
  // const generateSummary = () => {
  //   const allRecords = storageUtils.getAllRecords();
    
  //   // Get all medications
  //   const medications = allRecords
  //     .filter(r => r.category === 'medication')
  //     .map(r => r.resource);
    
  //   // Get all allergies
  //   const allergies = allRecords
  //     .filter(r => r.category === 'allergy')
  //     .map(r => r.resource);
    
  //   // Get all observations/labs
  //   const observations = allRecords
  //     .filter(r => r.category === 'observation')
  //     .map(r => r.resource);
    
  //   // Get all immunizations
  //   const immunizations = allRecords
  //     .filter(r => r.category === 'immunization')
  //     .map(r => r.resource);
    
  //   // Get patient info
  //   const patient = allRecords
  //     .filter(r => r.category === 'patient')
  //     .map(r => r.resource)[0];

  //   // Create FHIR Bundle
  //   const bundle = {
  //     resourceType: 'Bundle',
  //     type: 'collection',
  //     timestamp: new Date().toISOString(),
  //     meta: {
  //       lastUpdated: new Date().toISOString(),
  //       profile: ['http://hl7.org/fhir/StructureDefinition/Bundle']
  //     },
  //     entry: [
  //       ...(patient ? [{
  //         fullUrl: `Patient/${patient.id}`,
  //         resource: patient
  //       }] : []),
  //       ...medications.map(m => ({
  //         fullUrl: `MedicationStatement/${m.id}`,
  //         resource: m
  //       })),
  //       ...allergies.map(a => ({
  //         fullUrl: `AllergyIntolerance/${a.id}`,
  //         resource: a
  //       })),
  //       ...observations.map(o => ({
  //         fullUrl: `Observation/${o.id}`,
  //         resource: o
  //       })),
  //       ...immunizations.map(i => ({
  //         fullUrl: `Immunization/${i.id}`,
  //         resource: i
  //       }))
  //     ],
  //     total: medications.length + allergies.length + observations.length + immunizations.length + (patient ? 1 : 0)
  //   };

  //   setSummary({
  //     bundle,
  //     counts: {
  //       medications: medications.length,
  //       allergies: allergies.length,
  //       observations: observations.length,
  //       immunizations: immunizations.length,
  //       hasPatientInfo: !!patient
  //     }
  //   });
  // };


  // below added for better document formatting
  const downloadPDF = () => {
  if (!summary) return;

  try {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 20;
    let yPosition = 20;

    const { counts, bundle, details } = summary;

    const ensurePageSpace = (needed = 10) => {
      if (yPosition > pageHeight - margin - needed) {
        doc.addPage();
        yPosition = margin;
      }
    };

    // Title
    doc.setFontSize(18);
    doc.text("Patient Health Summary", margin, yPosition);
    yPosition += 10;

    // Date
    doc.setFontSize(10);
    doc.text(`Generated: ${new Date().toLocaleDateString()}`, margin, yPosition);
    yPosition += 15;

    // Summary counts
    doc.setFontSize(14);
    doc.text("Summary Contents", margin, yPosition);
    yPosition += 8;

    doc.setFontSize(10);
    doc.text(`• Medications: ${counts.medications}`, margin + 5, yPosition);
    yPosition += 6;
    doc.text(`• Allergies: ${counts.allergies}`, margin + 5, yPosition);
    yPosition += 6;
    doc.text(`• Lab Results: ${counts.observations}`, margin + 5, yPosition);
    yPosition += 6;
    doc.text(`• Immunizations: ${counts.immunizations}`, margin + 5, yPosition);
    yPosition += 6;
    doc.text(`• Total Records: ${bundle.total}`, margin + 5, yPosition);
    yPosition += 12;

    // FHIR Bundle details
    /*
    doc.setFontSize(14);
    doc.text("FHIR Bundle Information", margin, yPosition);
    yPosition += 8;

    doc.setFontSize(10);
    doc.text(`Bundle Type: ${bundle.type}`, margin + 5, yPosition);
    yPosition += 6;
    doc.text(
      `Timestamp: ${new Date(bundle.timestamp).toLocaleString()}`,
      margin + 5,
      yPosition
    );
    yPosition += 6;
    doc.text(`Profile: HL7 FHIR R4`, margin + 5, yPosition);
    yPosition += 12;
    */

    // ============= DETAILED SECTIONS =============

    doc.setFontSize(14);
    doc.text("Detailed Records", margin, yPosition);
    yPosition += 8;

    doc.setFontSize(11);

    // ---- Medications ----
    if (details.medications?.length) {
      ensurePageSpace(12);
      doc.text("Medications", margin, yPosition);
      yPosition += 6;
      doc.setFontSize(9);

      details.medications.forEach((m: any, idx: number) => {
        ensurePageSpace(10);
        const name =
          m.medicationCodeableConcept?.text || `Medication ${idx + 1}`;
        const start = m.effectivePeriod?.start
          ? new Date(m.effectivePeriod.start).toLocaleDateString()
          : null;
        const status = m.status || null;

        let line = `${idx + 1}. ${name}`;
        if (status) line += ` — ${status}`;
        if (start) line += ` (since ${start})`;

        const wrapped = doc.splitTextToSize(
          line,
          pageWidth - 2 * margin - 5
        );
        wrapped.forEach((l: string) => {
          ensurePageSpace(6);
          doc.text(l, margin + 5, yPosition);
          yPosition += 5;
        });
      });

      yPosition += 6;
      doc.setFontSize(11);
    }

    // ---- Allergies ----
    if (details.allergies?.length) {
      ensurePageSpace(12);
      doc.text("Allergies", margin, yPosition);
      yPosition += 6;
      doc.setFontSize(9);

      details.allergies.forEach((a: any, idx: number) => {
        ensurePageSpace(10);
        const name = a.code?.text || `Allergy ${idx + 1}`;
        const severity =
          a.reaction?.[0]?.severity ||
          a.clinicalStatus?.coding?.[0]?.code ||
          null;

        let line = `${idx + 1}. ${name}`;
        if (severity) line += ` — severity: ${severity}`;

        const wrapped = doc.splitTextToSize(
          line,
          pageWidth - 2 * margin - 5
        );
        wrapped.forEach((l: string) => {
          ensurePageSpace(6);
          doc.text(l, margin + 5, yPosition);
          yPosition += 5;
        });
      });

      yPosition += 6;
      doc.setFontSize(11);
    }

    // ---- Lab Results / Observations ----
    if (details.observations?.length) {
      ensurePageSpace(12);
      doc.text("Lab Results / Observations", margin, yPosition);
      yPosition += 6;
      doc.setFontSize(9);

      details.observations.forEach((o: any, idx: number) => {
        ensurePageSpace(10);
        const name = o.code?.text || `Result ${idx + 1}`;
        const date = o.effectiveDateTime
          ? new Date(o.effectiveDateTime).toLocaleDateString()
          : null;

        let value: string | null = null;
        if (o.valueQuantity) {
          value = `${o.valueQuantity.value} ${o.valueQuantity.unit || ""}`.trim();
        } else if (o.valueString) {
          value = o.valueString;
        }

        let line = `${idx + 1}. ${name}`;
        if (value) line += ` — ${value}`;
        if (date) line += ` (${date})`;

        const wrapped = doc.splitTextToSize(
          line,
          pageWidth - 2 * margin - 5
        );
        wrapped.forEach((l: string) => {
          ensurePageSpace(6);
          doc.text(l, margin + 5, yPosition);
          yPosition += 5;
        });
      });

      yPosition += 6;
      doc.setFontSize(11);
    }

    // ---- Immunizations ----
    if (details.immunizations?.length) {
      ensurePageSpace(12);
      doc.text("Immunizations", margin, yPosition);
      yPosition += 6;
      doc.setFontSize(9);

      details.immunizations.forEach((im: any, idx: number) => {
        ensurePageSpace(10);
        const name = im.vaccineCode?.text || `Immunization ${idx + 1}`;
        const date = im.occurrenceDateTime
          ? new Date(im.occurrenceDateTime).toLocaleDateString()
          : null;

        let line = `${idx + 1}. ${name}`;
        if (date) line += ` — ${date}`;

        const wrapped = doc.splitTextToSize(
          line,
          pageWidth - 2 * margin - 5
        );
        wrapped.forEach((l: string) => {
          ensurePageSpace(6);
          doc.text(l, margin + 5, yPosition);
          yPosition += 5;
        });
      });

      yPosition += 10;
      doc.setFontSize(11);
    }

    /*
    // ============= Instructions (existing section) =============
    ensurePageSpace(20);
    doc.setFontSize(12);
    doc.text("Instructions", margin, yPosition);
    yPosition += 8;

    doc.setFontSize(9);
    const instructions = [
      "This summary contains your complete health information in FHIR R4 format.",
      "Share this document only with authorized healthcare providers.",
      "For machine-readable format, use the JSON export option.",
      "Keep this document secure and update it regularly with new health information.",
    ];

    instructions.forEach(instruction => {
      const lines = doc.splitTextToSize(
        instruction,
        pageWidth - 2 * margin - 5
      );
      lines.forEach((line: string) => {
        ensurePageSpace(6);
        doc.text(`• ${line}`, margin + 5, yPosition);
        yPosition += 6;
      });
    });
    */

    // Footer
    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.text(
        `Page ${i} of ${pageCount} - Patient Health Summary - FHIR R4 Compliant`,
        pageWidth / 2,
        doc.internal.pageSize.getHeight() - 10,
        { align: "center" }
      );
    }

    doc.save(
      `patient-health-summary-${new Date()
        .toISOString()
        .split("T")[0]}.pdf`
    );
    toast.success("PDF downloaded successfully");
  } catch (error) {
    console.error("Error generating PDF:", error);
    toast.error("Failed to generate PDF");
  }
};



  // WORKED - commented out for above code

  // const downloadPDF = () => {
  //   if (!summary) return;

  //   try {
  //     const doc = new jsPDF();
  //     const pageWidth = doc.internal.pageSize.getWidth();
  //     const margin = 20;
  //     let yPosition = 20;

  //     // Title
  //     doc.setFontSize(18);
  //     doc.text('Patient Health Summary', margin, yPosition);
  //     yPosition += 10;

  //     // Date
  //     doc.setFontSize(10);
  //     doc.text(`Generated: ${new Date().toLocaleDateString()}`, margin, yPosition);
  //     yPosition += 15;

  //     // Summary counts
  //     doc.setFontSize(14);
  //     doc.text('Summary Contents', margin, yPosition);
  //     yPosition += 8;

  //     doc.setFontSize(10);
  //     doc.text(`• Medications: ${summary.counts.medications}`, margin + 5, yPosition);
  //     yPosition += 6;
  //     doc.text(`• Allergies: ${summary.counts.allergies}`, margin + 5, yPosition);
  //     yPosition += 6;
  //     doc.text(`• Lab Results: ${summary.counts.observations}`, margin + 5, yPosition);
  //     yPosition += 6;
  //     doc.text(`• Immunizations: ${summary.counts.immunizations}`, margin + 5, yPosition);
  //     yPosition += 6;
  //     doc.text(`• Total Records: ${summary.bundle.total}`, margin + 5, yPosition);
  //     yPosition += 15;

  //     // FHIR Bundle details (truncated for readability)
  //     doc.setFontSize(14);
  //     doc.text('FHIR Bundle Information', margin, yPosition);
  //     yPosition += 8;

  //     doc.setFontSize(10);
  //     doc.text(`Bundle Type: ${summary.bundle.type}`, margin + 5, yPosition);
  //     yPosition += 6;
  //     doc.text(`Timestamp: ${new Date(summary.bundle.timestamp).toLocaleString()}`, margin + 5, yPosition);
  //     yPosition += 6;
  //     doc.text(`Profile: HL7 FHIR R4`, margin + 5, yPosition);
  //     yPosition += 15;

  //     // Instructions
  //     doc.setFontSize(12);
  //     doc.text('Instructions', margin, yPosition);
  //     yPosition += 8;

  //     doc.setFontSize(9);
  //     const instructions = [
  //       'This summary contains your complete health information in FHIR R4 format.',
  //       'Share this document only with authorized healthcare providers.',
  //       'For machine-readable format, use the QR code or JSON export option.',
  //       'Keep this document secure and update it regularly with new health information.'
  //     ];

  //     instructions.forEach(instruction => {
  //       const lines = doc.splitTextToSize(instruction, pageWidth - 2 * margin - 5);
  //       lines.forEach((line: string) => {
  //         if (yPosition > 280) {
  //           doc.addPage();
  //           yPosition = 20;
  //         }
  //         doc.text(`• ${line}`, margin + 5, yPosition);
  //         yPosition += 6;
  //       });
  //     });

  //     // Footer
  //     const pageCount = doc.getNumberOfPages();
  //     for (let i = 1; i <= pageCount; i++) {
  //       doc.setPage(i);
  //       doc.setFontSize(8);
  //       doc.text(
  //         `Page ${i} of ${pageCount} - Patient Health Summary - FHIR R4 Compliant`,
  //         pageWidth / 2,
  //         doc.internal.pageSize.getHeight() - 10,
  //         { align: 'center' }
  //       );
  //     }

  //     doc.save(`patient-health-summary-${new Date().toISOString().split('T')[0]}.pdf`);
  //     toast.success('PDF downloaded successfully');
  //   } catch (error) {
  //     console.error('Error generating PDF:', error);
  //     toast.error('Failed to generate PDF');
  //   }
  // };


  if (!summary) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Share2 className="w-5 h-5 text-blue-600" />
            Patient Health Summary
          </DialogTitle>
          <DialogDescription>
            One-tap export of your complete health snapshot for sharing with any healthcare provider
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Summary Stats */}
          <Card className="border-2 border-blue-200 bg-blue-50">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Summary Contents</CardTitle>
              <CardDescription>FHIR Bundle with all your critical health information</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="flex flex-col items-center justify-center gap-2 p-3 bg-white rounded-lg text-center">
                  <Pill className="w-5 h-5 text-green-600" />
                  <div className="w-full flex flex-col items-center">
                    <div className="text-xs text-gray-500 text-center break-words w-full">Medications</div>
                    <div className="text-center font-semibold">{summary.counts.medications}</div>
                  </div>
                </div>
                <div className="flex flex-col items-center justify-center gap-2 p-3 bg-white rounded-lg text-center">
                  <AlertCircle className="w-5 h-5 text-red-600" />
                  <div className="w-full flex flex-col items-center">
                    <div className="text-xs text-gray-500 text-center break-words w-full">Allergies</div>
                    <div className="text-center font-semibold">{summary.counts.allergies}</div>
                  </div>
                </div>
                <div className="flex flex-col items-center justify-center gap-2 p-3 bg-white rounded-lg text-center">
                  <Activity className="w-5 h-5 text-orange-600" />
                  <div className="w-full flex flex-col items-center">
                    <div className="text-xs text-gray-500 text-center break-words w-full">Lab Results</div>
                    <div className="text-center font-semibold">{summary.counts.observations}</div>
                  </div>
                </div>
                <div className="flex flex-col items-center justify-center gap-2 p-3 bg-white rounded-lg">
                  <Syringe className="w-5 h-5 text-purple-600 flex-shrink-0" />
                  <div className="w-full flex flex-col items-center justify-center min-w-0">
                    <div className="text-xs text-gray-500 ">Immunizations</div>
                    <div className="text-center font-semibold">{summary.counts.immunizations}</div>
                  </div>
                </div>
              </div>
              <div className="mt-3 flex items-center gap-2 text-sm">
                <CheckCircle className="w-4 h-4 text-green-600" />
                <span className="text-gray-700">
                  Total: <strong>{summary.bundle.total}</strong> health records in this summary
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Export Options */}
          <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <FileText className="w-5 h-5" />
                  Export Health Summary
                </CardTitle>
                <CardDescription>
                  Download for sharing
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button onClick={downloadPDF} className="w-full" size="lg">
                  <Download className="w-4 h-4 mr-2" />
                  Download PDF
                </Button>
              </CardContent>
            </Card>

          <Alert>
            <AlertDescription>
              <strong>Privacy Notice:</strong> This summary contains your complete health information. 
              Only share it with authorized healthcare providers in clinical settings.
            </AlertDescription>
          </Alert>

        </div>
      </DialogContent>
    </Dialog>
  );
}
