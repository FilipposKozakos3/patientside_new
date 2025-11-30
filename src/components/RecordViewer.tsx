import { StoredHealthRecord } from '../types/fhir';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from './ui/dialog';
import { Badge } from './ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Separator } from './ui/separator';
import { Calendar, User, FileText, AlertCircle } from 'lucide-react';

interface RecordViewerProps {
  record: StoredHealthRecord | null;
  isOpen: boolean;
  onClose: () => void;
}

// helper function for opening pdf in a new tab
function base64ToBlobUrl(base64: string, contentType: string) {
  const byteCharacters = atob(base64);
  const byteNumbers = new Array(byteCharacters.length);
  for (let i = 0; i < byteCharacters.length; i++) {
    byteNumbers[i] = byteCharacters.charCodeAt(i);
  }
  const byteArray = new Uint8Array(byteNumbers);
  const blob = new Blob([byteArray], { type: contentType || "application/pdf" });
  return URL.createObjectURL(blob);
}


export function RecordViewer({ record, isOpen, onClose }: RecordViewerProps) {
  if (!record) return null;

  const resource = record.resource;

  // added for preview of the document

  const isDocument = resource.resourceType === "DocumentReference";
  const firstAttachment = isDocument
  ? (resource as any).content?.[0]?.attachment
  : null;

  const inlinePdfUrl =
  firstAttachment?.data && firstAttachment?.contentType?.includes("pdf")
    ? base64ToBlobUrl(firstAttachment.data, firstAttachment.contentType)
    : null;

  
    // end of the section

  const renderResourceDetails = () => {
    switch (resource.resourceType) {
      case 'Patient':
        const patient = resource as any;
        return (
          <div className="space-y-4">
            <div>
              <h4 className="text-sm text-gray-500 mb-1">Full Name</h4>
              <p>{patient.name?.[0]?.given?.join(' ')} {patient.name?.[0]?.family}</p>
            </div>
            {patient.gender && (
              <div>
                <h4 className="text-sm text-gray-500 mb-1">Gender</h4>
                <p className="capitalize">{patient.gender}</p>
              </div>
            )}
            {patient.birthDate && (
              <div>
                <h4 className="text-sm text-gray-500 mb-1">Date of Birth</h4>
                <p>{new Date(patient.birthDate).toLocaleDateString()}</p>
              </div>
            )}
            {patient.telecom && patient.telecom.length > 0 && (
              <div>
                <h4 className="text-sm text-gray-500 mb-1">Contact</h4>
                {patient.telecom.map((t: any, i: number) => (
                  <p key={i}>{t.system}: {t.value}</p>
                ))}
              </div>
            )}
            {patient.address && patient.address.length > 0 && (
              <div>
                <h4 className="text-sm text-gray-500 mb-1">Address</h4>
                <p>
                  {patient.address[0].line?.join(', ')}<br />
                  {patient.address[0].city}, {patient.address[0].state} {patient.address[0].postalCode}
                </p>
              </div>
            )}
          </div>
        );

      case 'MedicationStatement':
        const medication = resource as any;
        return (
          <div className="space-y-4">
            <div>
              <h4 className="text-sm text-gray-500 mb-1">Medication Name</h4>
              <p>{medication.medicationCodeableConcept?.text}</p>
            </div>
            <div>
              <h4 className="text-sm text-gray-500 mb-1">Status</h4>
              <Badge>{medication.status}</Badge>
            </div>
            {medication.effectivePeriod?.start && (
              <div>
                <h4 className="text-sm text-gray-500 mb-1">Start Date</h4>
                <p>{new Date(medication.effectivePeriod.start).toLocaleDateString()}</p>
              </div>
            )}
            {medication.effectivePeriod?.end && (
              <div>
                <h4 className="text-sm text-gray-500 mb-1">End Date</h4>
                <p>{new Date(medication.effectivePeriod.end).toLocaleDateString()}</p>
              </div>
            )}
            {medication.dosage && medication.dosage.length > 0 && (
              <div>
                <h4 className="text-sm text-gray-500 mb-1">Dosage Instructions</h4>
                {medication.dosage.map((d: any, i: number) => (
                  <p key={i}>{d.text}</p>
                ))}
              </div>
            )}
          </div>
        );

      case 'AllergyIntolerance':
        const allergy = resource as any;
        return (
          <div className="space-y-4">
            <div>
              <h4 className="text-sm text-gray-500 mb-1">Allergen</h4>
              <p>{allergy.code?.text}</p>
            </div>
            <div>
              <h4 className="text-sm text-gray-500 mb-1">Clinical Status</h4>
              <Badge>{allergy.clinicalStatus?.coding?.[0]?.code || 'Unknown'}</Badge>
            </div>
            {allergy.reaction && allergy.reaction.length > 0 && (
              <div>
                <h4 className="text-sm text-gray-500 mb-1">Reactions</h4>
                {allergy.reaction.map((r: any, i: number) => (
                  <div key={i} className="mb-2">
                    {r.manifestation?.map((m: any, j: number) => (
                      <p key={j}>{m.text}</p>
                    ))}
                    {r.severity && (
                      <Badge variant="outline" className="mt-1">
                        Severity: {r.severity}
                      </Badge>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        );

      case 'Immunization':
        const immunization = resource as any;
        return (
          <div className="space-y-4">
            <div>
              <h4 className="text-sm text-gray-500 mb-1">Vaccine</h4>
              <p>{immunization.vaccineCode?.text}</p>
            </div>
            <div>
              <h4 className="text-sm text-gray-500 mb-1">Status</h4>
              <Badge>{immunization.status}</Badge>
            </div>
            {immunization.occurrenceDateTime && (
              <div>
                <h4 className="text-sm text-gray-500 mb-1">Date Administered</h4>
                <p>{new Date(immunization.occurrenceDateTime).toLocaleDateString()}</p>
              </div>
            )}
            {immunization.lotNumber && (
              <div>
                <h4 className="text-sm text-gray-500 mb-1">Lot Number</h4>
                <p>{immunization.lotNumber}</p>
              </div>
            )}
            {immunization.performer && immunization.performer.length > 0 && (
              <div>
                <h4 className="text-sm text-gray-500 mb-1">Administered By</h4>
                <p>{immunization.performer[0].actor?.display}</p>
              </div>
            )}
          </div>
        );

      case 'Observation':
        const observation = resource as any;
        return (
          <div className="space-y-4">
            <div>
              <h4 className="text-sm text-gray-500 mb-1">Test/Observation</h4>
              <p>{observation.code?.text}</p>
            </div>
            <div>
              <h4 className="text-sm text-gray-500 mb-1">Status</h4>
              <Badge>{observation.status}</Badge>
            </div>
            {observation.effectiveDateTime && (
              <div>
                <h4 className="text-sm text-gray-500 mb-1">Date</h4>
                <p>{new Date(observation.effectiveDateTime).toLocaleDateString()}</p>
              </div>
            )}
            {observation.valueQuantity && (
              <div>
                <h4 className="text-sm text-gray-500 mb-1">Result</h4>
                <p>{observation.valueQuantity.value} {observation.valueQuantity.unit}</p>
              </div>
            )}
            {observation.valueString && (
              <div>
                <h4 className="text-sm text-gray-500 mb-1">Result</h4>
                <p>{observation.valueString}</p>
              </div>
            )}
            {observation.category && observation.category.length > 0 && (
              <div>
                <h4 className="text-sm text-gray-500 mb-1">Category</h4>
                <Badge variant="outline">
                  {observation.category[0].coding?.[0]?.display || 'Lab'}
                </Badge>
              </div>
            )}
          </div>
        );

      case 'DocumentReference':
        const document = resource as any;
        return (
          <div className="space-y-4">
            <div>
              <h4 className="text-sm text-gray-500 mb-1">Document Type</h4>
              <p>{document.type?.text}</p>
            </div>
            <div>
              <h4 className="text-sm text-gray-500 mb-1">Status</h4>
              <Badge>{document.status}</Badge>
            </div>
            {document.date && (
              <div>
                <h4 className="text-sm text-gray-500 mb-1">Date</h4>
                <p>{new Date(document.date).toLocaleDateString()}</p>
              </div>
            )}
            {document.content && document.content.length > 0 && (
              <div>
                <h4 className="text-sm text-gray-500 mb-1">Content</h4>
                {document.content.map((c: any, i: number) => (
                  <div key={i} className="bg-gray-50 p-3 rounded">
                    <p className="text-sm">Type: {c.attachment.contentType}</p>
                    {c.attachment.title && (
                      <p className="text-sm">Title: {c.attachment.title}</p>
                    )}


                    {inlinePdfUrl && (
                      <a
                        className="text-sm mt-2 text-blue-600 underline"
                        href={inlinePdfUrl}
                        target="_blank"
                        rel="noopener"
                      >
                        Open document in new tab
                      </a>
                    )}

                  </div>
                ))}
              </div>
            )}

            {inlinePdfUrl && (
              <div className="mt-4 h-96 border rounded overflow-hidden">
                <iframe
                  src={inlinePdfUrl}
                  className="w-full h-full"
                  title="PDF preview"
                />
              </div>
            )}
          </div>
        );

      default:
        return (
          <div>
            <pre className="bg-gray-50 p-4 rounded text-sm overflow-auto">
              {JSON.stringify(resource, null, 2)}
            </pre>
          </div>
        );
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Health Record Details</DialogTitle>
          <DialogDescription>
            FHIR Resource Type: {resource.resourceType}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Metadata Card */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Record Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-2 text-sm">
                <FileText className="w-4 h-4 text-gray-500" />
                <span className="text-gray-500">ID:</span>
                <code className="bg-gray-100 px-2 py-1 rounded text-xs">{record.id}</code>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Calendar className="w-4 h-4 text-gray-500" />
                <span className="text-gray-500">Added:</span>
                <span>{new Date(record.dateAdded).toLocaleString()}</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Calendar className="w-4 h-4 text-gray-500" />
                <span className="text-gray-500">Last Modified:</span>
                <span>{new Date(record.lastModified).toLocaleString()}</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <AlertCircle className="w-4 h-4 text-gray-500" />
                <span className="text-gray-500">Category:</span>
                <Badge>{record.category}</Badge>
              </div>
            </CardContent>
          </Card>

          <Separator />

          {/* Resource Details */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Clinical Information</CardTitle>
            </CardHeader>
            <CardContent>
              {renderResourceDetails()}
            </CardContent>
          </Card>

          {/* Consent Information */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Sharing & Consent</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-2 text-sm">
                <span className="text-gray-500">Consent Status:</span>
                <Badge variant={record.consent.consentGiven ? "default" : "outline"}>
                  {record.consent.consentGiven ? 'Shareable' : 'Private'}
                </Badge>
              </div>
              {record.consent.sharedWith.length > 0 && (
                <div>
                  <p className="text-sm text-gray-500 mb-2">Shared with:</p>
                  <div className="flex flex-wrap gap-2">
                    {record.consent.sharedWith.map((clinic, i) => (
                      <Badge key={i} variant="outline">{clinic}</Badge>
                    ))}
                  </div>
                </div>
              )}
              {record.consent.lastShared && (
                <div className="text-sm text-gray-500">
                  Last shared: {new Date(record.consent.lastShared).toLocaleString()}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
}
