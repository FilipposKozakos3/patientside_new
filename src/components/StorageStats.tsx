import { useEffect, useState } from 'react';
import { storageUtils } from '../utils/storage';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Progress } from './ui/progress';
import { Badge } from './ui/badge';
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

  const maxStorage = 5 * 1024 * 1024; // 5MB typical localStorage limit
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
        return resource.type?.text || 'Document';
      default:
        return 'Health Record';
    }
  };

  const getDaysAgo = (dateString: string): string => {
    const now = new Date();
    const date = new Date(dateString);
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return '1 day ago';
    return `${diffDays} days ago`;
  };

  return (
    <Card className="bg-gray-50 border-gray-200">
      <CardHeader>
        <CardTitle className="text-lg">Data Summary</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Storage Overview */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600">{stats.totalRecords} records stored</span>
          </div>
          
          <div className="space-y-1">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-700">Storage Used</span>
            </div>
            <Progress value={usagePercent} className="h-2" />
            <p className="text-xs text-gray-500">
              {stats.storageSize} of 5 MB
            </p>
          </div>
        </div>

        {/* Last Upload */}
        <div className="space-y-2">
          <h4 className="text-sm text-gray-900">Last Upload</h4>
          {recentRecords.length > 0 ? (
            <div className="bg-gray-200 rounded-lg p-3 space-y-1">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <p className="text-sm text-gray-900">{getRecordTitle(recentRecords[0])}</p>
                  <p className="text-xs text-gray-600">Dr. {recentRecords[0].provider || 'Unknown'}</p>
                </div>
              </div>
              <p className="text-xs text-gray-500">{getDaysAgo(recentRecords[0].dateAdded)}</p>
            </div>
          ) : (
            <div className="bg-gray-200 rounded-lg p-3">
              <p className="text-sm text-gray-600">No records uploaded yet</p>
            </div>
          )}
        </div>

        {/* Pending Consent */}
        <div className="space-y-2">
          <h4 className="text-sm text-gray-900">Pending Consent</h4>
          {userRole === 'provider' ? (
            <div className="bg-gray-200 rounded-lg p-3">
              <p className="text-sm text-gray-900">John Smith</p>
            </div>
          ) : (
            <div className="bg-gray-200 rounded-lg p-3 space-y-1">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <p className="text-sm text-gray-900">_____ Records</p>
                  <p className="text-xs text-gray-600">Dr. Doe</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Recent Access */}
        <div className="space-y-2">
          <h4 className="text-sm text-gray-900">Recent Access</h4>
          <div className="space-y-1">
            <p className="text-sm text-gray-700">Dr. Smith viewed files</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
