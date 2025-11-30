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

import { supabase } from '../supabase/supabaseClient';

// Configure pdf.js worker
import * as pdfjsLib from "pdfjs-dist";
import workerSrc from "pdfjs-dist/build/pdf.worker.min.mjs?url";
(pdfjsLib as any).GlobalWorkerOptions.workerSrc = workerSrc;

// Helper functions go HERE (this is "above the component")

async function extractTextFromPdf(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

  let fullText = "";

  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
    const page = await pdf.getPage(pageNum);
    const content = await page.getTextContent();

    const strings = (content.items as any[])
      .map((item) => ("str" in item ? item.str : ""))
      .join(" ");

    fullText += strings + "\n";
  }

  return fullText;
}

function parseHealthRecordFromText(text: string) {
  const providerMatch = text.match(/Provider:\s*(.+?)\s+Medications:/);
  const provider = providerMatch ? providerMatch[1].trim() : "";

  const getSection = (name: string, nextName?: string) => {
    const startIdx = text.indexOf(name + ":");
    if (startIdx === -1) return "";

    let start = startIdx + name.length + 1;
    let end = nextName ? text.indexOf(nextName + ":", start) : text.length;
    if (end === -1) end = text.length;

    return text.slice(start, end).trim();
  };

  const toList = (section: string) =>
    section
      .split("- ")
      .map((s) => s.trim())
      .filter(Boolean);

  const medsStr = getSection("Medications", "Allergies");
  const allergiesStr = getSection("Allergies", "Immunizations");
  const immsStr = getSection("Immunizations", "Lab Results");
  const labsStr = getSection("Lab Results");

  return {
    provider,
    medications: toList(medsStr),
    allergies: toList(allergiesStr),
    immunizations: toList(immsStr),
    lab_results: toList(labsStr),
  };
}

// -- code above for parsing the pdf text ---


interface UploadRecordProps {
  onRecordAdded: () => void;
}

export function UploadRecord({ onRecordAdded }: UploadRecordProps) {
  const [uploadStatus, setUploadStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFileName, setSelectedFileName] = useState<string>('');

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

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFileName(file.name);
    }
  };


  // new version 2 handlefile upload
  const handleFileUpload = async () => {
  const file = fileInputRef.current?.files?.[0];
  if (!file) {
    setUploadStatus({
      type: "error",
      message: "Please select a file first",
    });
    return;
  }

  try {
    const fileExtension = file.name.split(".").pop()?.toLowerCase();

    // 🔹 Get logged-in user email
    let userEmail: string | null = null;
    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (!userError && userData?.user?.email) {
      userEmail = userData.user.email;
    }

    // Handle JSON files (FHIR import) – unchanged
    if (fileExtension === "json") {
      const text = await file.text();
      const result = storageUtils.importFromJSON(text);

      if (result.success) {
        setUploadStatus({
          type: "success",
          message: `Successfully imported ${result.count} record(s)`,
        });
        onRecordAdded();
      } else {
        setUploadStatus({
          type: "error",
          message: result.error || "Failed to import records",
        });
      }
    }
    // Handle other file types (PDF, DOC, images)
    else if (
      ["pdf", "doc", "docx", "jpg", "jpeg", "png", "heic"].includes(
        fileExtension || ""
      )
    ) {
      // 1️⃣ Extract & parse the PDF if it's actually a PDF
      let parsedFromPdf:
        | {
            provider: string;
            medications: string[];
            allergies: string[];
            immunizations: string[];
            lab_results: string[];
          }
        | null = null;

      if (fileExtension === "pdf") {
        const rawText = await extractTextFromPdf(file);
        parsedFromPdf = parseHealthRecordFromText(rawText);
        console.log("Parsed from PDF:", parsedFromPdf);
      }

      // 2️⃣ Your existing FileReader + DocumentReference logic
      const reader = new FileReader();

      reader.onload = async (e) => {
        const base64Data = e.target?.result as string;

        const id = `doc-${Date.now()}-${Math.random()
          .toString(36)
          .substr(2, 9)}`;
        const newRecord: StoredHealthRecord = {
          id,
          resource: {
            resourceType: "DocumentReference",
            id,
            status: "current",
            type: {
              text: file.name,
            },
            subject: {
              reference: "Patient/self",
            },
            date: new Date().toISOString(),
            content: [
              {
                attachment: {
                  contentType: file.type || `application/${fileExtension}`,
                  title: file.name,
                  data: base64Data.split(",")[1], // Remove data URL prefix
                  size: file.size,
                },
              },
            ],
            meta: {
              lastUpdated: new Date().toISOString(),
            },
          },
          category: "document",
          consent: {
            recordId: id,
            sharedWith: [],
            consentGiven: false,
          },
          dateAdded: new Date().toISOString(),
          lastModified: new Date().toISOString(),
        };

        storageUtils.saveRecord(newRecord);
        setUploadStatus({
          type: "success",
          message: `Successfully uploaded ${file.name}`,
        });
        onRecordAdded();

        // 3️⃣ Call Edge Function with parsed data (if we have it AND an email)
        // if (userEmail && parsedFromPdf) {
        //   try {
        //     const { data, error } = await supabase.functions.invoke(
        //       "parse-record",
        //       {
        //         body: {
        //           userEmail,
        //           parsed: parsedFromPdf,
        //         },
        //       }
        //     );

        //     console.log("parse-record from upload:", { data, error });
        //   } catch (err) {
        //     console.error("parse-record invoke failed:", err);
        //   }
        // } else {
        //   console.warn(
        //     "Skipped parse-record: no userEmail or no parsedFromPdf available."
        //   );
        // }

        if (userEmail && parsedFromPdf) {
          try {
            const { data, error } = await supabase.functions.invoke(
              "parse-record",
              {
                body: {
                  userEmail,
                  parsed: parsedFromPdf,
                  fileName: file.name,
                  // you’re not using real storage paths yet, so just reuse file name
                  filePath: file.name,
                },
              }
            );

            console.log("parse-record from upload:", { data, error });
          } catch (err) {
            console.error("parse-record invoke failed:", err);
          }
        } else {
          console.warn(
            "Skipped parse-record: no userEmail or no parsedFromPdf available."
          );
        }
      };

      reader.onerror = () => {
        setUploadStatus({
          type: "error",
          message: "Error reading file. Please try again.",
        });
      };

      reader.readAsDataURL(file);
    } else {
      setUploadStatus({
        type: "error",
        message:
          "Unsupported file type. Please upload JSON, PDF, DOC, DOCX, JPG, PNG, or HEIC files.",
      });
    }

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
    setSelectedFileName("");
  } catch (error) {
    setUploadStatus({
      type: "error",
      message: "Error processing file. Please try again.",
    });
  }

  setTimeout(() => setUploadStatus(null), 5000);
};


  // new version old - WORKS handlefileupload functionality
//   const handleFileUpload = async () => {
//   const file = fileInputRef.current?.files?.[0];
//   if (!file) {
//     setUploadStatus({
//       type: 'error',
//       message: 'Please select a file first'
//     });
//     return;
//   }

//   try {
//     const fileExtension = file.name.split('.').pop()?.toLowerCase();

//     // 🔹 Get logged-in user email ONCE (we'll use it for parse-record)
//     let userEmail: string | null = null;
//     const { data: userData, error: userError } = await supabase.auth.getUser();
//     if (!userError && userData?.user?.email) {
//       userEmail = userData.user.email;
//     }

//     // Handle JSON files (FHIR import)
//     if (fileExtension === 'json') {
//       const text = await file.text();
//       const result = storageUtils.importFromJSON(text);

//       if (result.success) {
//         setUploadStatus({
//           type: 'success',
//           message: `Successfully imported ${result.count} record(s)`
//         });
//         onRecordAdded();
//       } else {
//         setUploadStatus({
//           type: 'error',
//           message: result.error || 'Failed to import records'
//         });
//       }
//     }
//     // Handle other file types (PDF, DOC, images)
//     else if (['pdf', 'doc', 'docx', 'jpg', 'jpeg', 'png', 'heic'].includes(fileExtension || '')) {
//       const reader = new FileReader();

//       reader.onload = async (e) => {
//         const base64Data = e.target?.result as string;
        
//         // Create a DocumentReference FHIR resource (your existing code)
//         const id = `doc-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
//         const newRecord: StoredHealthRecord = {
//           id,
//           resource: {
//             resourceType: 'DocumentReference',
//             id,
//             status: 'current',
//             type: {
//               text: file.name
//             },
//             subject: {
//               reference: 'Patient/self'
//             },
//             date: new Date().toISOString(),
//             content: [{
//               attachment: {
//                 contentType: file.type || `application/${fileExtension}`,
//                 title: file.name,
//                 data: base64Data.split(',')[1], // Remove data URL prefix
//                 size: file.size
//               }
//             }],
//             meta: {
//               lastUpdated: new Date().toISOString()
//             }
//           },
//           category: 'document',
//           consent: {
//             recordId: id,
//             sharedWith: [],
//             consentGiven: false
//           },
//           dateAdded: new Date().toISOString(),
//           lastModified: new Date().toISOString()
//         };

//         // Save locally as before
//         storageUtils.saveRecord(newRecord);
//         setUploadStatus({
//           type: 'success',
//           message: `Successfully uploaded ${file.name}`
//         });
//         onRecordAdded();

//         // 🔹 NEW: also call the parse-record Edge Function for this user
//         if (userEmail) {
//           try {
//             const { data, error } = await supabase.functions.invoke(
//               "parse-record",
//               {
//                 body: {
//                   bucket: "patient-docs",   // any non-empty string for now
//                   path: file.name,          // we’re not using this yet in the stub
//                   userEmail,                // REAL logged-in user email
//                 },
//               }
//             );

//             console.log("parse-record from upload:", { data, error });

//             // You can optionally show a subtle toast/alert here
//             // if (error) { ... }
//           } catch (err) {
//             console.error("parse-record invoke failed:", err);
//           }
//         } else {
//           console.warn("No user email found; skipping parse-record call");
//         }
//       };

//       reader.onerror = () => {
//         setUploadStatus({
//           type: 'error',
//           message: 'Error reading file. Please try again.'
//         });
//       };

//       reader.readAsDataURL(file);
//     } else {
//       setUploadStatus({
//         type: 'error',
//         message: 'Unsupported file type. Please upload JSON, PDF, DOC, DOCX, JPG, PNG, or HEIC files.'
//       });
//     }

//     if (fileInputRef.current) {
//       fileInputRef.current.value = '';
//     }
//     setSelectedFileName('');
//   } catch (error) {
//     setUploadStatus({
//       type: 'error',
//       message: 'Error processing file. Please try again.'
//     });
//   }

//   setTimeout(() => setUploadStatus(null), 5000);
// };



  // const handleFileUpload = async () => {
  //   const file = fileInputRef.current?.files?.[0];
  //   if (!file) {
  //     setUploadStatus({
  //       type: 'error',
  //       message: 'Please select a file first'
  //     });
  //     return;
  //   }

  //   try {
  //     const fileExtension = file.name.split('.').pop()?.toLowerCase();
      
  //     // Handle JSON files (FHIR import)
  //     if (fileExtension === 'json') {
  //       const text = await file.text();
  //       const result = storageUtils.importFromJSON(text);

  //       if (result.success) {
  //         setUploadStatus({
  //           type: 'success',
  //           message: `Successfully imported ${result.count} record(s)`
  //         });
  //         onRecordAdded();
  //       } else {
  //         setUploadStatus({
  //           type: 'error',
  //           message: result.error || 'Failed to import records'
  //         });
  //       }
  //     } 

  //     // --- changed the commented if/else block to this ---
  //     // Handle other file types (PDF, DOC, images)
  //   else if (['pdf', 'doc', 'docx', 'jpg', 'jpeg', 'png', 'heic'].includes(fileExtension || '')) {
  //   // 1) Get logged-in user (for email + user.id)
  //   const { data: userData, error: userError } = await supabase.auth.getUser();

  //   if (userError || !userData.user?.email) {
  //     setUploadStatus({
  //       type: 'error',
  //       message: 'You must be logged in to upload documents.'
  //     });
  //     return;
  //   }

  //   const user = userData.user;

  //   // 2) Upload file to Supabase Storage (e.g. bucket: 'patient-docs')
  //   const filePath = `user-${user.id}/${Date.now()}-${file.name}`;

  //   const { error: storageError } = await supabase.storage
  //     .from('patient-docs')              // make sure this bucket exists
  //     .upload(filePath, file);

  //   if (storageError) {
  //     console.error(storageError);
  //     setUploadStatus({
  //       type: 'error',
  //       message: 'Error uploading file to storage.'
  //     });
  //     return;
  //   }

  //   // 3) Insert into health_records
  //   const { data: recordInsert, error: recordError } = await supabase
  //     .from('health_records')
  //     .insert({
  //       email: user.email,
  //       provider_name: null,             // will be filled by parser later
  //       file_name: file.name,
  //       file_path: filePath,
  //       document_type: fileExtension
  //     })
  //     .select()
  //     .single();

  //   if (recordError || !recordInsert) {
  //     console.error(recordError);
  //     setUploadStatus({
  //       type: 'error',
  //       message: 'Error creating health record entry.'
  //     });
  //     return;
  //   }

  //   const healthRecordId = recordInsert.id as string;

  //   // 4) (Frontend) Keep your existing local FHIR DocumentReference for UI purposes
  //   const reader = new FileReader();
  //   reader.onload = async (e) => {
  //     const base64Data = e.target?.result as string;

  //     const id = `doc-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  //     const newRecord: StoredHealthRecord = {
  //       id,
  //       resource: {
  //         resourceType: 'DocumentReference',
  //         id,
  //         status: 'current',
  //         type: {
  //           text: file.name
  //         },
  //         subject: {
  //           reference: 'Patient/self'
  //         },
  //         date: new Date().toISOString(),
  //         content: [{
  //           attachment: {
  //             contentType: file.type || `application/${fileExtension}`,
  //             title: file.name,
  //             data: base64Data.split(',')[1], // Remove data URL prefix
  //             size: file.size
  //           }
  //         }],
  //         meta: {
  //           lastUpdated: new Date().toISOString()
  //         }
  //       },
  //       category: 'document',
  //       consent: {
  //         recordId: id,
  //         sharedWith: [],
  //         consentGiven: false
  //       },
  //       dateAdded: new Date().toISOString(),
  //       lastModified: new Date().toISOString()
  //     };

  //     storageUtils.saveRecord(newRecord);

  //     // 5) (Backend) Kick off parsing via Edge Function (to be implemented next)
  //     try {
  //       const { error: parseError } = await supabase.functions.invoke('parse-record', {
  //         body: {
  //           recordId: healthRecordId,
  //           patientEmail: user.email,
  //           filePath: filePath
  //         }
  //       });

  //       if (parseError) {
  //         console.error(parseError);
  //         setUploadStatus({
  //           type: 'error',
  //           message: 'File uploaded, but parsing failed. Please try again later.'
  //         });
  //       } else {
  //         setUploadStatus({
  //           type: 'success',
  //           message: `Successfully uploaded and parsed ${file.name}`
  //         });
  //       }
  //     } catch (err) {
  //       console.error(err);
  //       setUploadStatus({
  //         type: 'error',
  //         message: 'File uploaded, but parsing failed. Please try again later.'
  //       });
  //     }

  //     onRecordAdded();
  //   };

  //   reader.onerror = () => {
  //     setUploadStatus({
  //       type: 'error',
  //       message: 'Error reading file. Please try again.'
  //     });
  //   };

  //   reader.readAsDataURL(file);
  // }

      // Handle other file types (PDF, DOC, images)
      // else if (['pdf', 'doc', 'docx', 'jpg', 'jpeg', 'png', 'heic'].includes(fileExtension || '')) {
      //   // Convert file to base64
      //   const reader = new FileReader();
      //   reader.onload = (e) => {
      //     const base64Data = e.target?.result as string;
          
      //     // Create a DocumentReference FHIR resource
      //     const id = `doc-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      //     const newRecord: StoredHealthRecord = {
      //       id,
      //       resource: {
      //         resourceType: 'DocumentReference',
      //         id,
      //         status: 'current',
      //         type: {
      //           text: file.name
      //         },
      //         subject: {
      //           reference: 'Patient/self'
      //         },
      //         date: new Date().toISOString(),
      //         content: [{
      //           attachment: {
      //             contentType: file.type || `application/${fileExtension}`,
      //             title: file.name,
      //             data: base64Data.split(',')[1], // Remove data URL prefix
      //             size: file.size
      //           }
      //         }],
      //         meta: {
      //           lastUpdated: new Date().toISOString()
      //         }
      //       },
      //       category: 'document',
      //       consent: {
      //         recordId: id,
      //         sharedWith: [],
      //         consentGiven: false
      //       },
      //       dateAdded: new Date().toISOString(),
      //       lastModified: new Date().toISOString()
      //     };

      //     storageUtils.saveRecord(newRecord);
      //     setUploadStatus({
      //       type: 'success',
      //       message: `Successfully uploaded ${file.name}`
      //     });
      //     onRecordAdded();
      //   };

      //   reader.onerror = () => {
      //     setUploadStatus({
      //       type: 'error',
      //       message: 'Error reading file. Please try again.'
      //     });
      //   };

      //   reader.readAsDataURL(file);
      // } 

  //       else {
  //       setUploadStatus({
  //         type: 'error',
  //         message: 'Unsupported file type. Please upload JSON, PDF, DOC, DOCX, JPG, PNG, or HEIC files.'
  //       });
  //     }

  //     if (fileInputRef.current) {
  //       fileInputRef.current.value = '';
  //     }
  //     setSelectedFileName('');
  //   } catch (error) {
  //     setUploadStatus({
  //       type: 'error',
  //       message: 'Error processing file. Please try again.'
  //     });
  //   }

  //   setTimeout(() => setUploadStatus(null), 5000);
  // };



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
    <Card className="bg-white shadow-sm">
      <CardHeader className="pb-4">
        <CardTitle className="text-xl font-semibold text-gray-900">Add Health Records</CardTitle>
        <CardDescription className="mt-1">
          Import FHIR-compliant records or manually add new health information
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-0">
        <Tabs defaultValue="upload">
          <TabsList className="grid w-full grid-cols-2 mb-6">
            <TabsTrigger value="upload" className="gap-2">
              <Upload className="w-4 h-4" />
              Upload File
            </TabsTrigger>
            <TabsTrigger value="manual" className="gap-2">
              <Plus className="w-4 h-4" />
              Manual Entry
            </TabsTrigger>
          </TabsList>

          <TabsContent value="upload" className="space-y-4 mt-0">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="file-upload" className="text-sm font-medium">Upload Health Document</Label>
                <div className="mt-2 flex items-center gap-3">
                  <input
                    id="file-upload"
                    type="file"
                    accept=".json,.pdf,.doc,.docx,.jpg,.jpeg,.png,.heic"
                    onChange={handleFileSelect}
                    ref={fileInputRef}
                    className="hidden"
                  />
                  <div className="flex-1 px-3 py-2 border rounded-md bg-gray-50 text-sm text-gray-500">
                    {selectedFileName || 'No file chosen'}
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => fileInputRef.current?.click()}
                    className="cursor-pointer"
                  >
                    <FileJson className="w-4 h-4 mr-2" />
                    Browse
                  </Button>
                </div>
                <p className="text-xs text-gray-500">
                  Upload FHIR JSON files, PDFs, documents (DOC/DOCX), or images (JPG/PNG/HEIC)
                </p>
              </div>

              {selectedFileName && (
                <Button 
                  onClick={handleFileUpload} 
                  className="w-full"
                >
                  <Upload className="w-4 h-4 mr-2" />
                  Confirm Upload
                </Button>
              )}
            </div>
          </TabsContent>

          <TabsContent value="manual" className="space-y-4 mt-0">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="category" className="text-sm font-medium">Record Type</Label>
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

              <div className="space-y-2">
                <Label htmlFor="name" className="text-sm font-medium">
                  Name / Title <span className="text-red-600">*</span>
                </Label>
                <Input
                  id="name"
                  value={manualData.name}
                  onChange={(e) => setManualData({ ...manualData, name: e.target.value })}
                  placeholder="e.g., Aspirin, Peanut Allergy, COVID-19 Vaccine"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description" className="text-sm font-medium">Description / Dosage</Label>
                <Textarea
                  id="description"
                  value={manualData.description}
                  onChange={(e) => setManualData({ ...manualData, description: e.target.value })}
                  placeholder="e.g., 100mg daily, Severe reaction, Moderna dose 1"
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="date" className="text-sm font-medium">Record Date</Label>
                  <Input
                    id="date"
                    type="date"
                    value={manualData.date}
                    onChange={(e) => setManualData({ ...manualData, date: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="visitDate" className="text-sm font-medium">Visit Date (Optional)</Label>
                  <Input
                    id="visitDate"
                    type="date"
                    value={manualData.visitDate}
                    onChange={(e) => setManualData({ ...manualData, visitDate: e.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="provider" className="text-sm font-medium">Healthcare Provider (Optional)</Label>
                <Input
                  id="provider"
                  value={manualData.provider}
                  onChange={(e) => setManualData({ ...manualData, provider: e.target.value })}
                  placeholder="e.g., Dr. Smith, City Hospital"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="additional" className="text-sm font-medium">Additional Notes</Label>
                <Textarea
                  id="additional"
                  value={manualData.additionalInfo}
                  onChange={(e) => setManualData({ ...manualData, additionalInfo: e.target.value })}
                  placeholder="Any additional information..."
                  rows={2}
                />
              </div>

              <Button onClick={handleManualAdd} className="w-full mt-2">
                <Plus className="w-4 h-4 mr-2" />
                Add Record
              </Button>
            </div>
          </TabsContent>
        </Tabs>

        {uploadStatus && (
          <Alert className={`mt-4 ${uploadStatus.type === 'error' ? 'border-red-500 bg-red-50' : 'border-green-500 bg-green-50'}`}>
            <AlertDescription className={uploadStatus.type === 'error' ? 'text-red-800' : 'text-green-800'}>
              {uploadStatus.message}
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}