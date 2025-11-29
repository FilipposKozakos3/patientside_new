import { useState, useEffect } from 'react';
import { StoredHealthRecord } from '../types/fhir';
import { storageUtils } from '../utils/storage';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Input } from './ui/input';
import { Checkbox } from './ui/checkbox';
import { Badge } from './ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { 
  User,
  Search,
  FolderOpen,
  Calendar
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

  const getCategoryBadge = (category: string) => {
    const styles = {
      medication: 'bg-green-100 text-green-800 border-green-200',
      allergy: 'bg-red-100 text-red-800 border-red-200',
      observation: 'bg-orange-100 text-orange-800 border-orange-200',
      immunization: 'bg-blue-100 text-blue-800 border-blue-200',
      document: 'bg-gray-100 text-gray-800 border-gray-200'
    };
    return styles[category as keyof typeof styles] || styles.document;
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
    <Card className="bg-white shadow-sm">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-xl font-semibold text-gray-900 flex items-center gap-2">
              <FolderOpen className="w-5 h-5 text-blue-600" />
              Health Records Library
            </CardTitle>
            <CardDescription className="mt-1">
              Search, filter, and manage your health records
            </CardDescription>
          </div>
          <Badge className="bg-blue-50 text-blue-700 border-blue-200">
            {filteredRecords.length} {filteredRecords.length === 1 ? 'record' : 'records'}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="pt-0 space-y-4">
        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            placeholder="Search records by name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 bg-gray-50"
          />
        </div>

        {/* Filters */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-xs font-medium text-gray-700">Provider</label>
            <Select value={providerFilter} onValueChange={setProviderFilter}>
              <SelectTrigger className="bg-gray-50">
                <SelectValue placeholder="All Providers" />
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
          </div>

          <div className="space-y-2">
            <label className="text-xs font-medium text-gray-700">Sort by Date</label>
            <Select value={dateSort} onValueChange={(value: 'newest' | 'oldest') => setDateSort(value)}>
              <SelectTrigger className="bg-gray-50">
                <SelectValue placeholder="Latest" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="newest">Newest First</SelectItem>
                <SelectItem value="oldest">Oldest First</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Records Table */}
        <div className="border rounded-lg overflow-hidden bg-white">
          <div className="bg-gray-50 grid grid-cols-5 gap-4 px-4 py-3 text-xs font-medium text-gray-700 border-b">
            <div className="col-span-2">Record Name</div>
            <div>Provider</div>
            <div>Date Added</div>
            <div className="text-center">Accessible</div>
          </div>
          <div className="divide-y">
            {filteredRecords.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <FolderOpen className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                <p className="text-sm font-medium">No records found</p>
                <p className="text-xs mt-1 text-gray-400">
                  {searchQuery || providerFilter !== 'all' 
                    ? 'Try adjusting your filters' 
                    : 'Upload your first health record to get started'}
                </p>
              </div>
            ) : (
              filteredRecords.map((record, index) => (
                <div 
                  key={record.id} 
                  className="grid grid-cols-5 gap-4 px-4 py-3 hover:bg-gray-50 items-center transition-colors cursor-pointer"
                  onClick={() => onViewRecord(record)}
                >
                  <div className="col-span-2 flex items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {getRecordTitle(record) === 'Record 1' ? `Record ${index + 1}` : getRecordTitle(record)}
                      </p>
                      <Badge 
                        variant="outline" 
                        className={`text-xs mt-1 ${getCategoryBadge(record.category)}`}
                      >
                        {record.category}
                      </Badge>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                      <User className="w-4 h-4 text-blue-600" />
                    </div>
                    <span className="text-sm text-gray-700 truncate">
                      Dr. {record.provider || 'Smith'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Calendar className="w-4 h-4 text-gray-400" />
                    {new Date(record.dateAdded).toLocaleDateString('en-US', {
                      month: '2-digit',
                      day: '2-digit',
                      year: 'numeric'
                    })}
                  </div>
                  <div 
                    className="flex items-center justify-center"
                    onClick={(e) => e.stopPropagation()}
                  >
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