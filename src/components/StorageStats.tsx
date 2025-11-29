import { useEffect, useState } from 'react';
import { storageUtils } from '../utils/storage';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Progress } from './ui/progress';
import { 
  HardDrive, 
  FileText, 
  Clock,
  Eye,
  AlertTriangle
} from 'lucide-react';

interface StorageStatsProps {
  refreshTrigger: number;
  userRole: string;
}

export function StorageStats({ refreshTrigger, userRole }: StorageStatsProps) {
  const [stats, setStats] = useState<any>(null);
  const [recentRecords, setRecentRecords] = useState<any[]>([]);

  useEffect(() => {
    loadStats();
  }, [refreshTrigger]);

  const loadStats = () => {
    const storageStats = storageUtils.getStorageStats();
    setStats(storageStats);

    const allRecords = storageUtils.getAllRecords();
    const sorted = [...allRecords].sort(
      (a, b) => new Date(b.dateAdded).getTime() - new Date(a.dateAdded).getTime()
    );
    setRecentRecords(sorted.slice(0, 3));
  };

  if (!stats) return null;

  const maxStorage = 5 * 1024 * 1024;
  const usagePercent = (stats.sizeInBytes / maxStorage) * 100;

  const getRecordTitle = (record: any): string => {
    const resource = record.resource;
    switch (resource.resourceType) {
      case 'MedicationStatement':
        return resource.medicationCodeableConcept?.text || 'Medication';
      case 'AllergyIntolerance':
        return resource.code?.text || 'Allergy';
      case 'Observation':
        return resource.code?.text || 'Lab Result';
      case 'Immunization':
        return resource.vaccineCode?.text || 'Immunization';
      case 'DocumentReference':
        return (
          resource.type?.text ||
          resource.content?.[0]?.attachment?.title ||
          'Document'
        );
      default:
        return 'Health Record';
    }
  };

  const getDaysAgo = (dateString: string): string => {
    const now = new Date();
    const date = new Date(dateString);
    const diff = Math.abs(now.getTime() - date.getTime());
    const days = Math.ceil(diff / (1000 * 60 * 60 * 24));

    if (days === 0) return 'Today';
    if (days === 1) return '1 day ago';
    return `${days} days ago`;
  };

  return (
    <Card className="bg-white border border-gray-200 shadow-sm">
      <CardHeader>
        <CardTitle className="text-md font-semibold text-gray-900 flex items-center gap-2">
          <HardDrive className="w-5 h-5 text-gray-700" />
          Data Summary
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-6">

        {/* Storage Overview */}
        <div className="space-y-2">
          <h4 className="text-sm font-semibold text-gray-900">Storage Overview</h4>

          <p className="text-xs text-gray-600">
            {stats.totalRecords} records stored
          </p>

          <div className="space-y-1">
            <div className="flex items-center justify-between text-xs">
              <span className="text-gray-700">Storage used</span>
              <span className="text-gray-700">{usagePercent.toFixed(0)}%</span>
            </div>

            <Progress value={usagePercent} className="h-2" />

            <p className="text-xs text-gray-500">{stats.storageSize} of 5 MB</p>
          </div>
        </div>

        {/* Last Upload */}
        <div className="space-y-2">
          <h4 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
            <FileText className="w-4 h-4 text-gray-700" />
            Last Upload
          </h4>

          {recentRecords.length > 0 ? (
            <div className="bg-gray-100 rounded-lg p-3 space-y-1">
              <p className="text-sm font-medium text-gray-900">
                {getRecordTitle(recentRecords[0])}
              </p>

              <p className="text-xs text-gray-600">
                Dr. {recentRecords[0].provider || 'Unknown'}
              </p>

              <p className="text-xs text-gray-500 flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {getDaysAgo(recentRecords[0].dateAdded)}
              </p>
            </div>
          ) : (
            <div className="bg-gray-100 rounded-lg p-3">
              <p className="text-sm text-gray-600">No records uploaded yet</p>
            </div>
          )}
        </div>

        {/* Pending Consent */}
        <div className="space-y-2">
          <h4 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-gray-700" />
            Pending Consent
          </h4>

          {userRole === 'provider' ? (
            <div className="bg-gray-100 rounded-lg p-3">
              <p className="text-sm font-medium text-gray-900">John Smith</p>
              <p className="text-xs text-gray-600">Awaiting patient approval</p>
            </div>
          ) : (
            <div className="bg-gray-100 rounded-lg p-3 space-y-1">
              <p className="text-sm font-medium text-gray-900">_____ Records</p>
              <p className="text-xs text-gray-600">Dr. Doe</p>
            </div>
          )}
        </div>

        {/* Recent Access */}
        <div className="space-y-2">
          <h4 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
            <Eye className="w-4 h-4 text-gray-700" />
            Recent Access
          </h4>

          <p className="text-sm text-gray-700">Dr. Smith viewed files</p>
        </div>

      </CardContent>
    </Card>
  );
}
