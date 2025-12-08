// import { useState } from 'react';
// import { StoredHealthRecord } from '../types/fhir';
// import { storageUtils } from '../utils/storage';
// import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from './ui/dialog';
// import { Button } from './ui/button';
// import { Input } from './ui/input';
// import { Label } from './ui/label';
// import { Switch } from './ui/switch';
// import { Badge } from './ui/badge';
// import { Card, CardContent } from './ui/card';
// import { Alert, AlertDescription } from './ui/alert';
// import { Share2, Plus, X, Shield, CheckCircle } from 'lucide-react';

// interface ConsentManagerProps {
//   record: StoredHealthRecord | null;
//   isOpen: boolean;
//   onClose: () => void;
//   onUpdate: () => void;
// }

// export function ConsentManager({ record, isOpen, onClose, onUpdate }: ConsentManagerProps) {
//   const [consentGiven, setConsentGiven] = useState(record?.consent.consentGiven || false);
//   const [sharedWith, setSharedWith] = useState<string[]>(record?.consent.sharedWith || []);
//   const [newClinic, setNewClinic] = useState('');
//   const [saved, setSaved] = useState(false);

//   const handleAddClinic = () => {
//     if (newClinic.trim() && !sharedWith.includes(newClinic.trim())) {
//       setSharedWith([...sharedWith, newClinic.trim()]);
//       setNewClinic('');
//     }
//   };

//   const handleRemoveClinic = (clinic: string) => {
//     setSharedWith(sharedWith.filter(c => c !== clinic));
//   };

//   const handleSave = () => {
//     if (!record) return;

//     const updatedRecord: StoredHealthRecord = {
//       ...record,
//       consent: {
//         recordId: record.id,
//         consentGiven,
//         sharedWith,
//         lastShared: consentGiven && sharedWith.length > 0 ? new Date().toISOString() : record.consent.lastShared
//       },
//       lastModified: new Date().toISOString()
//     };

//     storageUtils.saveRecord(updatedRecord);
//     setSaved(true);
//     setTimeout(() => {
//       setSaved(false);
//       onUpdate();
//       onClose();
//     }, 1500);
//   };

//   if (!record) return null;

//   return (
//     <Dialog open={isOpen} onOpenChange={onClose}>
//       <DialogContent className="max-w-2xl">
//         <DialogHeader>
//           <DialogTitle>Manage Sharing & Consent</DialogTitle>
//           <DialogDescription>
//             Control who can access this health record and manage consent preferences
//           </DialogDescription>
//         </DialogHeader>

//         <div className="space-y-6">
//           {/* Consent Toggle */}
//           <Card className="border-2 border-blue-200 bg-blue-50">
//             <CardContent className="pt-6">
//               <div className="flex items-center justify-between">
//                 <div className="flex items-start gap-3">
//                   <Shield className="w-5 h-5 text-blue-600 mt-1" />
//                   <div>
//                     <Label htmlFor="consent-toggle" className="text-base">
//                       Enable Sharing
//                     </Label>
//                     <p className="text-sm text-gray-600 mt-1">
//                       Allow this record to be shared with healthcare providers
//                     </p>
//                   </div>
//                 </div>
//                 <Switch
//                   id="consent-toggle"
//                   checked={consentGiven}
//                   onCheckedChange={setConsentGiven}
//                 />
//               </div>
//             </CardContent>
//           </Card>

//           {/* Authorized Clinics */}
//           {consentGiven && (
//             <div className="space-y-4">
//               <div>
//                 <Label htmlFor="clinic-name">Authorized Healthcare Providers</Label>
//                 <p className="text-sm text-gray-500 mb-3">
//                   Add clinics or providers who are authorized to access this record
//                 </p>
//                 <div className="flex gap-2">
//                   <Input
//                     id="clinic-name"
//                     value={newClinic}
//                     onChange={(e) => setNewClinic(e.target.value)}
//                     placeholder="e.g., City General Hospital"
//                     onKeyPress={(e) => e.key === 'Enter' && handleAddClinic()}
//                   />
//                   <Button onClick={handleAddClinic} variant="outline">
//                     <Plus className="w-4 h-4 mr-2" />
//                     Add
//                   </Button>
//                 </div>
//               </div>

//               {sharedWith.length > 0 && (
//                 <div className="space-y-2">
//                   <Label>Currently Authorized ({sharedWith.length})</Label>
//                   <div className="space-y-2">
//                     {sharedWith.map((clinic, index) => (
//                       <div
//                         key={index}
//                         className="flex items-center justify-between p-3 bg-white border rounded-lg"
//                       >
//                         <div className="flex items-center gap-2">
//                           <Share2 className="w-4 h-4 text-gray-500" />
//                           <span>{clinic}</span>
//                         </div>
//                         <Button
//                           size="sm"
//                           variant="ghost"
//                           onClick={() => handleRemoveClinic(clinic)}
//                         >
//                           <X className="w-4 h-4" />
//                         </Button>
//                       </div>
//                     ))}
//                   </div>
//                 </div>
//               )}

//               {sharedWith.length === 0 && (
//                 <Alert>
//                   <AlertDescription>
//                     No providers have been authorized yet. Add providers who should have access to this record.
//                   </AlertDescription>
//                 </Alert>
//               )}
//             </div>
//           )}

//           {/* Privacy Notice */}
//           <Alert className="border-orange-200 bg-orange-50">
//             <AlertDescription>
//               <strong>Privacy Notice:</strong> You maintain full control over your health records. 
//               You can revoke access at any time by disabling sharing or removing authorized providers. 
//               Records are stored locally on your device and only shared when you explicitly choose to do so.
//             </AlertDescription>
//           </Alert>

//           {/* FHIR Compliance Notice */}
//           <div className="bg-gray-50 p-4 rounded-lg">
//             <div className="flex items-start gap-2">
//               <CheckCircle className="w-5 h-5 text-green-600 mt-0.5" />
//               <div>
//                 <p className="text-sm">
//                   <strong>FHIR Compliant:</strong> This record follows HL7 FHIR standards, 
//                   ensuring interoperability with any healthcare system that supports FHIR.
//                 </p>
//               </div>
//             </div>
//           </div>

//           {/* Action Buttons */}
//           <div className="flex justify-end gap-3">
//             <Button variant="outline" onClick={onClose}>
//               Cancel
//             </Button>
//             <Button onClick={handleSave} disabled={saved}>
//               {saved ? (
//                 <>
//                   <CheckCircle className="w-4 h-4 mr-2" />
//                   Saved!
//                 </>
//               ) : (
//                 'Save Consent Settings'
//               )}
//             </Button>
//           </div>
//         </div>
//       </DialogContent>
//     </Dialog>
//   );
// }

import { useState, useEffect } from 'react';
import { StoredHealthRecord } from '../types/fhir';
import { storageUtils } from '../utils/storage';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Switch } from './ui/switch';
import { Card, CardContent } from './ui/card';
import { Alert, AlertDescription } from './ui/alert';
import { Share2, Plus, X, Shield, CheckCircle } from 'lucide-react';

interface ConsentManagerProps {
  record: StoredHealthRecord | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdate: () => void;
}

const defaultConsent = {
  consentGiven: false,
  sharedWith: [] as string[],
  lastShared: null as string | null,
};

export function ConsentManager({ record, isOpen, onClose, onUpdate }: ConsentManagerProps) {
  // SAFE consent snapshot for initialization
  const consent = record?.consent ?? defaultConsent;

  const [consentGiven, setConsentGiven] = useState<boolean>(consent.consentGiven);
  const [sharedWith, setSharedWith] = useState<string[]>(consent.sharedWith);
  const [newClinic, setNewClinic] = useState('');
  const [saved, setSaved] = useState(false);

  // Keep local state in sync when record changes / dialog reopens
  useEffect(() => {
    const c = record?.consent ?? defaultConsent;
    setConsentGiven(c.consentGiven);
    setSharedWith(c.sharedWith);
  }, [record?.id, isOpen]);

  const handleAddClinic = () => {
    const trimmed = newClinic.trim();
    if (trimmed && !sharedWith.includes(trimmed)) {
      setSharedWith([...sharedWith, trimmed]);
      setNewClinic('');
    }
  };

  const handleRemoveClinic = (clinic: string) => {
    setSharedWith(sharedWith.filter(c => c !== clinic));
  };

  const handleSave = () => {
    if (!record) return;

    const updatedRecord: StoredHealthRecord = {
      ...record,
      consent: {
        recordId: record.id,
        consentGiven,
        sharedWith,
        lastShared:
          consentGiven && sharedWith.length > 0
            ? new Date().toISOString()
            : (record.consent?.lastShared ?? null),
      },
      lastModified: new Date().toISOString(),
    };

    storageUtils.saveRecord(updatedRecord);
    setSaved(true);
    setTimeout(() => {
      setSaved(false);
      onUpdate();
      onClose();
    }, 1500);
  };

  if (!record) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Manage Sharing & Consent</DialogTitle>
          <DialogDescription>
            Control who can access this health record and manage consent preferences
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          <Card className="border-2 border-blue-200 bg-blue-50">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div className="flex items-start gap-3">
                  <Shield className="w-5 h-5 text-blue-600 mt-1" />
                  <div>
                    <Label htmlFor="consent-toggle" className="text-base">
                      Enable Sharing
                    </Label>
                    <p className="text-sm text-gray-600 mt-1">
                      Allow this record to be shared with healthcare providers
                    </p>
                  </div>
                </div>
                <Switch
                  id="consent-toggle"
                  checked={consentGiven}
                  onCheckedChange={setConsentGiven}
                />
              </div>
            </CardContent>
          </Card>

          {consentGiven && (
            <div className="space-y-4">
              <div>
                <Label htmlFor="clinic-name">Authorized Healthcare Providers</Label>
                <p className="text-sm text-gray-500 mb-3">
                  Add clinics or providers who are authorized to access this record
                </p>
                <div className="flex gap-2">
                  <Input
                    id="clinic-name"
                    value={newClinic}
                    onChange={(e) => setNewClinic(e.target.value)}
                    placeholder="e.g., City General Hospital"
                    onKeyDown={(e) => e.key === 'Enter' && handleAddClinic()}
                  />
                  <Button onClick={handleAddClinic} variant="outline">
                    <Plus className="w-4 h-4 mr-2" />
                    Add
                  </Button>
                </div>
              </div>

              {sharedWith.length > 0 && (
                <div className="space-y-2">
                  <Label>Currently Authorized ({sharedWith.length})</Label>
                  <div className="space-y-2">
                    {sharedWith.map((clinic, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between p-3 bg-white border rounded-lg"
                      >
                        <div className="flex items-center gap-2">
                          <Share2 className="w-4 h-4 text-gray-500" />
                          <span>{clinic}</span>
                        </div>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleRemoveClinic(clinic)}
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {sharedWith.length === 0 && (
                <Alert>
                  <AlertDescription>
                    No providers have been authorized yet. Add providers who should have access to this record.
                  </AlertDescription>
                </Alert>
              )}
            </div>
          )}

          <Alert className="border-orange-200 bg-orange-50">
            <AlertDescription>
              <strong>Privacy Notice:</strong> You maintain full control over your health records.
              You can revoke access at any time by disabling sharing or removing authorized providers.
              Records are stored locally on your device and only shared when you explicitly choose to do so.
            </AlertDescription>
          </Alert>

          <div className="bg-gray-50 p-4 rounded-lg">
            <div className="flex items-start gap-2">
              <CheckCircle className="w-5 h-5 text-green-600 mt-0.5" />
              <div>
                <p className="text-sm">
                  <strong>FHIR Compliant:</strong> This record follows HL7 FHIR standards,
                  ensuring interoperability with any healthcare system that supports FHIR.
                </p>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saved}>
              {saved ? (
                <>
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Saved!
                </>
              ) : (
                'Save Consent Settings'
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

