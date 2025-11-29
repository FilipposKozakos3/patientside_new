import { useEffect, useState } from "react";
import { storageUtils } from "../utils/storage";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "./ui/card";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Alert, AlertDescription } from "./ui/alert";
import {
  Heart,
  Pill,
  AlertCircle,
  Activity,
  Calendar,
  Share2,
  Upload,
  // FolderOpen,   // no longer using this here
  Bell,
  TrendingUp,
  FileText,
  Clock,
} from "lucide-react";

interface DashboardProps {
  userName: string;
  userRole: string;
  onNavigate: (view: string) => void;
  onExportSummary: () => void;
  refreshTrigger: number;
}

export function Dashboard({
  userName,
  userRole,
  onNavigate,
  onExportSummary,
  refreshTrigger,
}: DashboardProps) {
  const [stats, setStats] = useState<any>(null);
  const [recentRecords, setRecentRecords] = useState<any[]>([]);
  const [notifications, setNotifications] = useState<any[]>([]);

  useEffect(() => {
    loadDashboardData();
  }, [refreshTrigger]);

  const loadDashboardData = () => {
    const allRecords = storageUtils.getAllRecords();
    const storageStats = storageUtils.getStorageStats();

    // Get recent records (last 5)
    const sorted = [...allRecords].sort(
      (a, b) =>
        new Date(b.dateAdded).getTime() -
        new Date(a.dateAdded).getTime(),
    );
    setRecentRecords(sorted.slice(0, 5));

    // Set stats
    setStats(storageStats);

    // Mock notifications (in production these would come from a backend)
    const mockNotifications = [
      {
        id: 1,
        type: "new_record",
        message: "New lab results uploaded",
        date: new Date().toISOString(),
        read: false,
      },
      {
        id: 2,
        type: "reminder",
        message: "Upcoming appointment with Dr. Smith",
        date: new Date(Date.now() - 86400000).toISOString(),
        read: false,
      },
    ];
    setNotifications(mockNotifications);
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case "medication":
        return <Pill className="w-4 h-4 text-green-600" />;
      case "allergy":
        return <AlertCircle className="w-4 h-4 text-red-600" />;
      case "observation":
        return <Activity className="w-4 h-4 text-orange-600" />;
      default:
        return <FileText className="w-4 h-4 text-gray-600" />;
    }
  };

  const getRecordTitle = (record: any): string => {
    const resource = record.resource;
    switch (resource.resourceType) {
      case "MedicationStatement":
        return (
          resource.medicationCodeableConcept?.text ||
          "Medication"
        );
      case "AllergyIntolerance":
        return resource.code?.text || "Allergy";
      case "Observation":
        return resource.code?.text || "Lab Result";
      case "Immunization":
        return resource.vaccineCode?.text || "Immunization";
      case "DocumentReference":
        // Use the file name / title where possible
        return (
          resource.type?.text ||
          resource.content?.[0]?.attachment?.title ||
          "Document"
        );
      default:
        return "Health Record";
    }
  };

  const getUploaderLabel = (record: any): string => {
    // Manual records store provider on the record object in UploadRecord.tsx
    if (record.provider) {
      return record.provider;
    }
    // Default to the patient themselves
    return "You";
  };

  if (!stats) {
    return <div>Loading...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <div className="flex flex-col gap-1">
        <h2 className="text-2xl font-semibold text-gray-900">
          Welcome back, {userName}!
        </h2>
        <p className="text-sm text-gray-500">
          Here&apos;s a quick snapshot of your recent health records and summary.
        </p>
      </div>

      {/* Main grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Activity */}
        <Card className="bg-white border-l-4 border-l-blue-500 shadow-sm">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              {/* Title + badge on the same row */}
              <div className="flex items-center gap-3">
                <CardTitle className="font-semibold flex items-center gap-2 text-base md:text-lg">
                  <Clock className="w-5 h-5 text-blue-600" />
                  Recent Activity
                </CardTitle>
                {recentRecords.length > 0 && (
                  <Badge className="bg-blue-50 text-blue-700 border-blue-200">
                    {recentRecords.length} recent
                  </Badge>
                )}
              </div>
            </div>
            {/* Description below the heading row */}
            <CardDescription className="mt-1 text-sm">
              Latest updates from your uploaded records
            </CardDescription>
          </CardHeader>
          {/* add a bit more breathing room top + bottom */}
          <CardContent className="pt-3 pb-4">
            {recentRecords.length === 0 ? (
              <div className="text-center py-10 text-gray-500 text-sm">
                No recent activity yet. Try{" "}
                  <button
                    type="button"
                    className="text-blue-600 underline underline-offset-2 text-sm"
                    onClick={() => onNavigate("upload")}
                  >
                    uploading a record
                  </button>{" "}
                to get started.
              </div>
            ) : (
              <div className="space-y-3">
                {recentRecords.slice(0, 5).map((record) => (
                  <div
                    key={record.id}
                    onClick={() => onNavigate("records")}
                    className="flex items-center rounded-lg border bg-gray-50 px-3 py-3 hover:bg-gray-100 transition-colors cursor-pointer"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white border">
                        {getCategoryIcon(record.category)}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {getRecordTitle(record)}
                        </p>
                        <p className="text-xs text-gray-500">
                          {new Date(record.dateAdded).toLocaleDateString()} • Uploaded by{" "}
                          {getUploaderLabel(record)}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Health Summary - Only for patients */}
        {userRole === "patient" && (
          <Card
            className="bg-white shadow-sm"
            style={{ borderLeft: "4px solid #ef4444" }}
          >
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="font-semibold flex items-center gap-2 text-base md:text-lg">
                    <Heart className="w-5 h-5 text-red-600" />
                    Health Summary
                  </CardTitle>
                  <CardDescription className="mt-1 text-sm">
                    High-level view of your stored records by category
                  </CardDescription>
                </div>
              </div>
            </CardHeader>

            <CardContent className="space-y-5 pt-0">
              {/* Stat tiles */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="rounded-xl border bg-gray-50 px-4 py-3 text-center">
                  <p className="text-xs uppercase tracking-wide text-gray-500">
                    Medications
                  </p>
                  <p className="mt-1 text-3xl font-semibold text-gray-900">
                    {stats.byCategory.medication}
                  </p>
                </div>

                <div className="rounded-xl border bg-gray-50 px-4 py-3 text-center">
                  <p className="text-xs uppercase tracking-wide text-gray-500">
                    Allergies
                  </p>
                  <p className="mt-1 text-3xl font-semibold text-gray-900">
                    {stats.byCategory.allergy}
                  </p>
                </div>

                <div className="rounded-xl border bg-gray-50 px-4 py-3 text-center">
                  <p className="text-xs uppercase tracking-wide text-gray-500">
                    Lab Results
                  </p>
                  <p className="mt-1 text-3xl font-semibold text-gray-900">
                    {stats.byCategory.observation}
                  </p>
                </div>
              </div>

              {/* CTA Button – styled like the Browse button (outline) */}
              <div className="pt-4 mb-4">
                <Button
                  onClick={onExportSummary}
                  variant="outline"
                  className="w-full gap-2 justify-center"
                >
                  <Share2 className="w-4 h-4" />
                  Export Health Summary
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
