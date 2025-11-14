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
  FolderOpen,
  Bell,
  TrendingUp,
  FileText,
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

    // Mock notifications (in production, these would come from a backend)
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
      default:
        return "Health Record";
    }
  };

  if (!stats) {
    return <div>Loading...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <div>
        <h2 className="text-2xl text-gray-900">
          Welcome, {userName}
        </h2>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Activity */}
        <Card className="bg-gray-100 border-gray-200">
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            {recentRecords.length === 0 ? (
              <div className="text-center py-8 text-gray-500 text-sm">
                No recent activity
              </div>
            ) : (
              <div className="space-y-2">
                {recentRecords.slice(0, 3).map((record) => (
                  <div
                    key={record.id}
                    className="flex items-center justify-between p-2 bg-gray-200 rounded"
                  >
                    <div className="flex items-center gap-2">
                      {getCategoryIcon(record.category)}
                      <div>
                        <p className="text-sm text-gray-900">
                          {getRecordTitle(record)}
                        </p>
                        <p className="text-xs text-gray-500">
                          {new Date(record.dateAdded).toLocaleDateString()}
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
        {userRole === 'patient' && (
          <Card className="bg-gray-100 border-gray-200">
            <CardHeader>
              <CardTitle>Health Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="bg-gray-200 rounded p-4 text-center">
                <div className="text-3xl text-gray-900">{stats.byCategory.medication}</div>
                <div className="text-sm text-gray-700">Medications</div>
              </div>
              <div className="bg-gray-200 rounded p-4 text-center">
                <div className="text-3xl text-gray-900">{stats.byCategory.allergy}</div>
                <div className="text-sm text-gray-700">Allergies</div>
              </div>
              <div className="bg-gray-200 rounded p-4 text-center">
                <div className="text-3xl text-gray-900">{stats.byCategory.observation}</div>
                <div className="text-sm text-gray-700">Lab Results</div>
              </div>
              <Button 
                onClick={onExportSummary}
                className="w-full bg-gray-700 hover:bg-gray-800 text-white"
              >
                Export Health Summary
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}