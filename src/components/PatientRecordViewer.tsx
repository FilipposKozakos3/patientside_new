import React, { useState, useEffect, useCallback } from "react";
import { supabase } from "../supabase/supabaseClient";
import { Button } from "./ui/button";
import { Separator } from "./ui/separator";
import { Avatar, AvatarFallback } from "./ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "./ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "./ui/tabs";
import { Badge } from "./ui/badge";
import { Alert, AlertTitle, AlertDescription } from "./ui/alert";
import { toast } from "sonner";
import {
  Mail,
  Calendar,
  Link as LinkIcon,
  Upload,
  FileText,
  Folder,
  Clock,
  List,
  Loader2,
} from "lucide-react";

// Minimal + Clean (Apple-like) Redesign
// - Softer spacing
// - Subtle borders
// - Clean typography
// - Light neutral shades
// - Smooth hierarchy and spacing

// --- INTERFACES --- (unchanged)

export function PatientRecordViewer({
  isOpen,
  onClose,
  patient,
  onAddData,
  refreshTrigger,
}) {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [fetchError, setFetchError] = useState(null);

  const getInitials = (name) => {
    if (!name) return "?";
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase();
  };

  const fetchPatientDocuments = useCallback(
    async (patient) => {
      setLoading(true);
      setFetchError(null);
      setDocuments([]);

      try {
        // 1) Get only shared records from health_records
        const { data: records, error } = await supabase
          .from("health_records")
          .select("*")
          .eq("email", patient.email)
          .eq("is_shared", true)
          .order("uploaded_at", { ascending: false });

        if (error) throw new Error(error.message);

        const docs: any[] = [];

        // 2) For each shared record, create a signed URL from its file_path
        for (const record of records || []) {
          if (!record.file_path) continue;

          const { data: urlData, error: urlError } = await supabase.storage
            .from("health-records")
            .createSignedUrl(record.file_path, 60);

          if (urlError || !urlData?.signedUrl) continue;

          docs.push({
            id: record.id,
            name: record.file_name,
            type: record.document_type || "document",
            date: new Date(record.uploaded_at).toLocaleDateString(),
            url: urlData.signedUrl,
            provider: record.provider_name || "Unknown",
          });
        }

        setDocuments(docs);
      } catch (e: any) {
        setFetchError(`Failed to load documents: ${e.message}`);
      } finally {
        setLoading(false);
      }
    },
    []
  );


  useEffect(() => {
    if (patient && isOpen) fetchPatientDocuments(patient);
    if (!isOpen) setDocuments([]);
  }, [patient, isOpen, refreshTrigger]);

  const handlePreviewDocument = (doc) => {
    if (doc.url) window.open(doc.url, "_blank");
    else toast.error("Could not open document.");
  };

  if (!patient) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl p-0 max-h-[90vh] overflow-y-auto rounded-xl shadow-xl border border-neutral-200 bg-white">
        <div className="flex flex-col lg:flex-row h-[90vh] min-h-0">
          {/* LEFT PANEL — Minimal Apple Style */}
          <div className="lg:w-1/3 border-r border-neutral-200 p-8 flex flex-col justify-between bg-neutral-50/60">
            <div className="space-y-8">

              <div className="flex items-center gap-x-4"> 
                <Avatar className="w-12 h-12 shadow-sm">
                    <AvatarFallback className="bg-blue-600 text-white text-xl">
                    {getInitials(patient.name)}
                    </AvatarFallback>
                </Avatar>
                <div className="flex flex-col min-w-0">
                    <h2 className="text-xl font-semibold text-neutral-900">
                    {patient.name}
                    </h2>
                    <p className="text-sm text-neutral-500">Patient Overview</p>
                </div>
            </div>


              <Separator />

              <div className="space-y-4 text-sm">
                <div>
                  <p className="text-neutral-500 flex items-center mb-1">
                    <Mail className="w-4 h-4 mr-2" /> Email
                  </p>
                  <p className="font-medium text-neutral-900">{patient.email}</p>
                </div>

                <div>
                  <p className="text-neutral-500 flex items-center mb-1">
                    <Calendar className="w-4 h-4 mr-2" /> DOB
                  </p>
                  <p className="font-medium text-neutral-900">
                    {patient.patient_profile?.dob || "N/A"}
                  </p>
                </div>

                <div>
                  <p className="text-neutral-500 flex items-center mb-1">
                    <LinkIcon className="w-4 h-4 mr-2" /> Access Granted
                  </p>
                  <p className="font-medium text-neutral-900">
                    {new Date(patient.access_granted_at).toLocaleDateString()}
                  </p>
                </div>

                <div>
                    <p className="text-neutral-500 flex items-center mb-1">
                        <Upload className="w-4 h-4 mr-2" /> Permissions
                    </p>
                    <div
                        style={{ backgroundColor: "#16a34a", color: "white" }} // Tailwind green-600
                        className="inline-flex items-center text-xs font-medium px-2 py-1 rounded-md shadow-sm"
                    >
                        Full Access
                    </div>
                </div>



              </div>
            </div>

            <div className="space-y-3 mt-6">
              <Button
                className="w-full bg-black text-white hover:bg-neutral-800"
                onClick={() => {
                  onClose();
                  onAddData(patient);
                }}
              >
                <Upload className="w-4 h-4 mr-2" /> Add Data
              </Button>
              <Button variant="outline" className="w-full border-neutral-300">
                <Mail className="w-4 h-4 mr-2" /> Contact Patient
              </Button>
            </div>
          </div>

          {/* RIGHT PANEL */}
          <div className="lg:w-2/3 p-8 flex flex-col min-h-0 bg-white">
            <DialogHeader className="mb-4">
              <DialogTitle className="text-lg font-semibold text-neutral-900">
                Patient Records
              </DialogTitle>
              <DialogDescription className="text-neutral-500 text-sm">
                Viewing documents for {patient.name}
              </DialogDescription>
            </DialogHeader>

            <Tabs defaultValue="documents" className="flex flex-col flex-1 min-h-0 mt-2">
              <TabsList className="grid grid-cols-2 w-full mb-2 bg-neutral-100 p-1 rounded-lg">
                <TabsTrigger value="documents" className="rounded-md">
                  <List className="w-4 h-4 mr-2" /> Documents
                </TabsTrigger>
                <TabsTrigger value="timeline" className="rounded-md">
                  <Clock className="w-4 h-4 mr-2" /> Timeline
                </TabsTrigger>
              </TabsList>

              {/* DOCUMENTS TAB */}
              <TabsContent value="documents" className="flex flex-col flex-1 min-h-0">
                <div className="flex justify-between items-center mb-4 flex-shrink-0">
                  <h3 className="text-lg font-medium text-neutral-900">
                    Documents ({documents.length})
                  </h3>

                  <Button
                    variant="outline"
                    size="sm"
                    className="border-neutral-300"
                    onClick={() => fetchPatientDocuments(patient)}
                    disabled={loading}
                  >
                    {loading ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Calendar className="w-4 h-4 mr-2" />
                    )}
                    Refresh
                  </Button>
                </div>

                <div className="flex-1 overflow-y-auto min-h-0 space-y-3 pr-1">
                  {loading ? (
                    <div className="text-center py-10 text-neutral-500">
                      <Loader2 className="w-6 h-6 mx-auto animate-spin mb-3" />
                      Loading...
                    </div>
                  ) : fetchError ? (
                    <Alert variant="destructive" className="mt-4">
                      <AlertTitle>Error</AlertTitle>
                      <AlertDescription>{fetchError}</AlertDescription>
                    </Alert>
                  ) : documents.length === 0 ? (
                    <div className="text-center py-10 text-neutral-400">
                      <Folder className="w-10 h-10 mx-auto mb-3" />
                      No documents found.
                    </div>
                  ) : (
                    documents.map((doc) => (
                      <div
                        key={doc.id}
                        onClick={() => handlePreviewDocument(doc)}
                        className="border border-neutral-200 rounded-lg p-4 hover:bg-neutral-50 cursor-pointer transition-colors flex justify-between items-center"
                      >
                        <div className="flex items-center space-x-3 min-w-0 flex-1">
                          <FileText className="w-5 h-5 text-neutral-700 flex-shrink-0" />
                          <div className="min-w-0">
                            <p className="font-medium text-neutral-900 text-sm truncate">
                              {doc.name}
                            </p>
                            <p className="text-xs text-neutral-500 mt-1 truncate">
                              Uploaded by {doc.provider} · {doc.date}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </TabsContent>

              {/* TIMELINE TAB */}
              <TabsContent value="timeline" className="flex-1 min-h-0">
                <div className="text-center text-neutral-500 pt-8">
                  Timeline view coming soon.
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
