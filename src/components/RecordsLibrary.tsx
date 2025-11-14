import { useState, useEffect } from 'react';
import { StoredHealthRecord } from '../types/fhir';
import { storageUtils } from '../utils/storage';
import { Card, CardContent } from './ui/card';
import { Input } from './ui/input';
import { Checkbox } from './ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { 
  User,
  Search
} from 'lucide-react';

interface RecordsLibraryProps {
  onViewRecord: (record: StoredHealthRecord) => void;
  onExportRecord: (record: StoredHealthRecord) => void;
  onShareRecord: (record: StoredHealthRecord) => void;
  refreshTrigger: number;
}

export function RecordsLibrary({ 
  onViewRecord, 
  onExportRecord, 
  onShareRecord,
  refreshTrigger 
}: RecordsLibraryProps) {
  const [records, setRecords] = useState<StoredHealthRecord[]>([]);
  const [providerFilter, setProviderFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [dateSort, setDateSort] = useState<'newest' | 'oldest'>('newest');
  const [accessibleRecords, setAccessibleRecords] = useState<Set<string>>(new Set());

  useEffect(() => {
    loadRecords();
    loadAccessibleRecords();
  }, [refreshTrigger]);

  const loadRecords = () => {
    const allRecords = storageUtils.getAllRecords();
    setRecords(allRecords);
  };

  const loadAccessibleRecords = () => {
    const saved = localStorage.getItem('accessible_records');
    if (saved) {
      setAccessibleRecords(new Set(JSON.parse(saved)));
    }
  };

  const toggleAccessible = (recordId: string) => {
    const newSet = new Set(accessibleRecords);
    if (newSet.has(recordId)) {
      newSet.delete(recordId);
    } else {
      newSet.add(recordId);
    }
    setAccessibleRecords(newSet);
    localStorage.setItem('accessible_records', JSON.stringify(Array.from(newSet)));
  };

  const getRecordTitle = (record: StoredHealthRecord): string => {
    const resource = record.resource;
    switch (resource.resourceType) {
      case 'Patient':
        return `${(resource as any).name?.[0]?.given?.join(' ')} ${(resource as any).name?.[0]?.family}`;
      case 'MedicationStatement':
        return (resource as any).medicationCodeableConcept?.text || 'Medication';
      case 'AllergyIntolerance':
        return (resource as any).code?.text || 'Allergy';
      case 'Immunization':
        return (resource as any).vaccineCode?.text || 'Immunization';
      case 'Observation':
        return (resource as any).code?.text || 'Observation';
      case 'DocumentReference':
        return (resource as any).type?.text || 'Document';
      default:
        return 'Record 1';
    }
  };

  // Get unique providers
  const uniqueProviders = Array.from(
    new Set(records.map(r => r.provider).filter(Boolean))
  );

  // Apply filters
  let filteredRecords = records;

  // Provider filter
  if (providerFilter !== 'all') {
    filteredRecords = filteredRecords.filter(r => r.provider === providerFilter);
  }

  // Search filter
  if (searchQuery) {
    filteredRecords = filteredRecords.filter(r => {
      const title = getRecordTitle(r).toLowerCase();
      return title.includes(searchQuery.toLowerCase());
    });
  }

  // Sort by date
  filteredRecords = [...filteredRecords].sort((a, b) => {
    const dateA = new Date(a.dateAdded).getTime();
    const dateB = new Date(b.dateAdded).getTime();
    return dateSort === 'newest' ? dateB - dateA : dateA - dateB;
  });

  return (
    <Card className="bg-white">
      <CardContent className="pt-6 space-y-4">
        <h2 className="text-xl">Health Records Library</h2>
        
        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            placeholder="Search records..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 bg-gray-100"
          />
        </div>

        {/* Filters */}
        <div className="grid grid-cols-2 gap-4">
          <Select value={providerFilter} onValueChange={setProviderFilter}>
            <SelectTrigger className="bg-gray-100">
              <SelectValue placeholder="Dr. Smith" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Providers</SelectItem>
              {uniqueProviders.map(provider => (
                <SelectItem key={provider} value={provider!}>
                  {provider}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={dateSort} onValueChange={(value: 'newest' | 'oldest') => setDateSort(value)}>
            <SelectTrigger className="bg-gray-100">
              <SelectValue placeholder="Latest" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="newest">Latest</SelectItem>
              <SelectItem value="oldest">Oldest</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Records Table */}
        <div className="border rounded-lg overflow-hidden">
          <div className="bg-gray-100 grid grid-cols-4 gap-4 p-3 text-sm text-gray-700 border-b">
            <div>File Name</div>
            <div>Owner</div>
            <div>Date Uploaded</div>
            <div>Accessible</div>
          </div>
          <div className="divide-y bg-white">
            {filteredRecords.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <p>No records found</p>
              </div>
            ) : (
              filteredRecords.map((record, index) => (
                <div 
                  key={record.id} 
                  className="grid grid-cols-4 gap-4 p-3 hover:bg-gray-50 items-center"
                >
                  <div 
                    className="text-sm text-gray-900 cursor-pointer"
                    onClick={() => onViewRecord(record)}
                  >
                    {getRecordTitle(record) === 'Record 1' ? `Record ${index + 1}` : getRecordTitle(record)}
                  </div>
                  <div 
                    className="flex items-center gap-2 cursor-pointer"
                    onClick={() => onViewRecord(record)}
                  >
                    <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center">
                      <User className="w-4 h-4 text-gray-600" />
                    </div>
                    <span className="text-sm text-gray-700">
                      Dr. {record.provider || 'Smith'}
                    </span>
                  </div>
                  <div 
                    className="text-sm text-gray-700 cursor-pointer"
                    onClick={() => onViewRecord(record)}
                  >
                    {new Date(record.dateAdded).toLocaleDateString('en-US', {
                      month: '2-digit',
                      day: '2-digit',
                      year: 'numeric'
                    })}
                  </div>
                  <div className="flex items-center">
                    <Checkbox
                      checked={accessibleRecords.has(record.id)}
                      onCheckedChange={() => toggleAccessible(record.id)}
                    />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
