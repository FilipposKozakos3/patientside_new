// import { useState, useEffect } from 'react';
// import { StoredHealthRecord } from '../types/fhir';
// import { storageUtils } from '../utils/storage';
// import { supabase } from "../supabase/supabaseClient";

// import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
// import { Input } from './ui/input';
// import { Checkbox } from './ui/checkbox';
// import { Badge } from './ui/badge';
// import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
// import { 
//   User,
//   Search,
//   FolderOpen,
//   Calendar
// } from 'lucide-react';

// interface RecordsLibraryProps {
//   onViewRecord: (record: StoredHealthRecord) => void;
//   onExportRecord: (record: StoredHealthRecord) => void;
//   onShareRecord: (record: StoredHealthRecord) => void;
//   refreshTrigger: number;
// }

// export function RecordsLibrary({ 
//   onViewRecord, 
//   onExportRecord, 
//   onShareRecord,
//   refreshTrigger 
// }: RecordsLibraryProps) {
//   const [records, setRecords] = useState<StoredHealthRecord[]>([]);
//   const [providerFilter, setProviderFilter] = useState<string>('all');
//   const [searchQuery, setSearchQuery] = useState<string>('');
//   const [dateSort, setDateSort] = useState<'newest' | 'oldest'>('newest');
//   const [accessibleRecords, setAccessibleRecords] = useState<Set<string>>(new Set());

//   useEffect(() => {
//     const run = async () => {
//       await loadRecords();
//       loadAccessibleRecords();
//     };
//     run();
//   }, [refreshTrigger]);


//   const loadRecords = async () => {
//     const localRecords = storageUtils.getAllRecords();

//     try {
//       const { data: userData, error: userError } = await supabase.auth.getUser();

//       if (userError || !userData?.user?.email) {
//         setRecords(localRecords);
//         return;
//       }

//       const email = userData.user.email;

//       const { data: dbDocs, error: dbError } = await supabase
//         .from("health_records")
//         .select("*")
//         .eq("email", email)
//         .order("created_at", { ascending: false });

//       if (dbError) {
//         console.error("Error loading health_records:", dbError);
//         setRecords(localRecords);
//         return;
//       }

//       const dbMapped: StoredHealthRecord[] =
//         (dbDocs ?? []).map((row: any) => ({
//           id: `db-${row.id}`,
//           category: "document",
//           dateAdded: row.created_at || new Date().toISOString(),
//           provider: row.provider_name || "Provider",
//           resource: {
//             resourceType: "DocumentReference",
//             type: { text: row.file_name },
//             content: [
//               {
//                 attachment: {
//                   title: row.file_name,
//                   // You can add URL later if you create signed URLs
//                 },
//               },
//             ],
//           } as any,
//         }));

//       const combined = [...dbMapped, ...localRecords];

//       setRecords(combined);
//     } catch (e) {
//       console.error("Error merging DB + local records:", e);
//       setRecords(localRecords);
//     }
//   };


//   const loadAccessibleRecords = () => {
//     const saved = localStorage.getItem('accessible_records');
//     if (saved) {
//       setAccessibleRecords(new Set(JSON.parse(saved)));
//     }
//   };

//   const toggleAccessible = (recordId: string) => {
//     const newSet = new Set(accessibleRecords);
//     if (newSet.has(recordId)) {
//       newSet.delete(recordId);
//     } else {
//       newSet.add(recordId);
//     }
//     setAccessibleRecords(newSet);
//     localStorage.setItem('accessible_records', JSON.stringify(Array.from(newSet)));
//   };

//   const getRecordTitle = (record: StoredHealthRecord): string => {
//     const resource = record.resource;
//     switch (resource.resourceType) {
//       case 'Patient':
//         return `${(resource as any).name?.[0]?.given?.join(' ')} ${(resource as any).name?.[0]?.family}`;
//       case 'MedicationStatement':
//         return (resource as any).medicationCodeableConcept?.text || 'Medication';
//       case 'AllergyIntolerance':
//         return (resource as any).code?.text || 'Allergy';
//       case 'Immunization':
//         return (resource as any).vaccineCode?.text || 'Immunization';
//       case 'Observation':
//         return (resource as any).code?.text || 'Observation';
//       case 'DocumentReference':
//         return (resource as any).type?.text || (resource as any).content?.[0]?.attachment?.title || 'Document';
//       default:
//         return 'Record 1';
//     }
//   };

//   const getCategoryBadge = (category: string) => {
//     const styles = {
//       medication: 'bg-green-100 text-green-800 border-green-200',
//       allergy: 'bg-red-100 text-red-800 border-red-200',
//       observation: 'bg-orange-100 text-orange-800 border-orange-200',
//       immunization: 'bg-blue-100 text-blue-800 border-blue-200',
//       document: 'bg-gray-100 text-gray-800 border-gray-200'
//     };
//     return styles[category as keyof typeof styles] || styles.document;
//   };

//   // ✅ NEW helper to fix "Dr. Smith" default
//   const getProviderLabel = (record: StoredHealthRecord) => {
//     // provider-uploaded DB docs will have provider_name
//     if (record.provider && record.provider.trim()) return record.provider;

//     // patient-uploaded local records
//     return "You";
//   };

//   // Get unique providers
//   const uniqueProviders = Array.from(
//     new Set(records.map(r => r.provider).filter(Boolean))
//   );

//   // Apply filters
//   let filteredRecords = records;

//   // Provider filter
//   if (providerFilter !== 'all') {
//     filteredRecords = filteredRecords.filter(r => r.provider === providerFilter);
//   }

//   // Search filter
//   if (searchQuery) {
//     filteredRecords = filteredRecords.filter(r => {
//       const title = getRecordTitle(r).toLowerCase();
//       return title.includes(searchQuery.toLowerCase());
//     });
//   }

//   // Sort by date
//   filteredRecords = [...filteredRecords].sort((a, b) => {
//     const dateA = new Date(a.dateAdded).getTime();
//     const dateB = new Date(b.dateAdded).getTime();
//     return dateSort === 'newest' ? dateB - dateA : dateA - dateB;
//   });

//   return (
//     <Card className="bg-white shadow-sm">
//       <CardHeader className="pb-4">
//         <div className="flex items-center justify-between">
//           <div>
//             <CardTitle className="text-xl font-semibold text-gray-900 flex items-center gap-2">
//               <FolderOpen className="w-5 h-5 text-blue-600" />
//               Health Records Library
//             </CardTitle>
//             <CardDescription className="mt-1">
//               Search, filter, and manage your health records
//             </CardDescription>
//           </div>
//           <Badge className="bg-blue-50 text-blue-700 border-blue-200">
//             {filteredRecords.length} {filteredRecords.length === 1 ? 'record' : 'records'}
//           </Badge>
//         </div>
//       </CardHeader>

//       <CardContent className="pt-0 space-y-4">
//         {/* Search Bar */}
//         <div className="relative">
//           <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
//           <Input
//             placeholder="Search records by name..."
//             value={searchQuery}
//             onChange={(e) => setSearchQuery(e.target.value)}
//             className="pl-10 bg-gray-50"
//           />
//         </div>

//         {/* Filters */}
//         <div className="grid grid-cols-2 gap-4">
//           <div className="space-y-2">
//             <label className="text-xs font-medium text-gray-700">Provider</label>
//             <Select value={providerFilter} onValueChange={setProviderFilter}>
//               <SelectTrigger className="bg-gray-50">
//                 <SelectValue placeholder="All Providers" />
//               </SelectTrigger>
//               <SelectContent>
//                 <SelectItem value="all">All Providers</SelectItem>
//                 {uniqueProviders.map(provider => (
//                   <SelectItem key={provider} value={provider!}>
//                     {provider}
//                   </SelectItem>
//                 ))}
//               </SelectContent>
//             </Select>
//           </div>

//           <div className="space-y-2">
//             <label className="text-xs font-medium text-gray-700">Sort by Date</label>
//             <Select value={dateSort} onValueChange={(value: 'newest' | 'oldest') => setDateSort(value)}>
//               <SelectTrigger className="bg-gray-50">
//                 <SelectValue placeholder="Latest" />
//               </SelectTrigger>
//               <SelectContent>
//                 <SelectItem value="newest">Newest First</SelectItem>
//                 <SelectItem value="oldest">Oldest First</SelectItem>
//               </SelectContent>
//             </Select>
//           </div>
//         </div>

//         {/* Records Table */}
//         <div className="border rounded-lg overflow-hidden bg-white">
//           <div className="bg-gray-50 grid grid-cols-5 gap-4 px-4 py-3 text-xs font-medium text-gray-700 border-b">
//             <div className="col-span-2">Record Name</div>
//             <div>Provider</div>
//             <div>Date Added</div>
//             <div className="text-center">Accessible</div>
//           </div>
//           <div className="divide-y">
//             {filteredRecords.length === 0 ? (
//               <div className="text-center py-12 text-gray-500">
//                 <FolderOpen className="w-12 h-12 mx-auto mb-3 text-gray-300" />
//                 <p className="text-sm font-medium">No records found</p>
//                 <p className="text-xs mt-1 text-gray-400">
//                   {searchQuery || providerFilter !== 'all' 
//                     ? 'Try adjusting your filters' 
//                     : 'Upload your first health record to get started'}
//                 </p>
//               </div>
//             ) : (
//               filteredRecords.map((record, index) => (
//                 <div 
//                   key={record.id} 
//                   className="grid grid-cols-5 gap-4 px-4 py-3 hover:bg-gray-50 items-center transition-colors cursor-pointer"
//                   onClick={() => onViewRecord(record)}
//                 >
//                   <div className="col-span-2 flex items-center gap-3">
//                     <div className="flex-1 min-w-0">
//                       <p className="text-sm font-medium text-gray-900 truncate">
//                         {getRecordTitle(record) === 'Record 1' ? `Record ${index + 1}` : getRecordTitle(record)}
//                       </p>
//                       <Badge 
//                         variant="outline" 
//                         className={`text-xs mt-1 ${getCategoryBadge(record.category)}`}
//                       >
//                         {record.category}
//                       </Badge>
//                     </div>
//                   </div>

//                   {/* ✅ FIXED PROVIDER DISPLAY */}
//                   <div className="flex items-center gap-2">
//                     <div className="w-7 h-7 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
//                       <User className="w-4 h-4 text-blue-600" />
//                     </div>
//                     <span className="text-sm text-gray-700 truncate">
//                       {getProviderLabel(record)}
//                     </span>
//                   </div>

//                   <div className="flex items-center gap-2 text-sm text-gray-600">
//                     <Calendar className="w-4 h-4 text-gray-400" />
//                     {new Date(record.dateAdded).toLocaleDateString('en-US', {
//                       month: '2-digit',
//                       day: '2-digit',
//                       year: 'numeric'
//                     })}
//                   </div>

//                   <div 
//                     className="flex items-center justify-center"
//                     onClick={(e) => e.stopPropagation()}
//                   >
//                     <Checkbox
//                       checked={accessibleRecords.has(record.id)}
//                       onCheckedChange={() => toggleAccessible(record.id)}
//                     />
//                   </div>
//                 </div>
//               ))
//             )}
//           </div>
//         </div>
//       </CardContent>
//     </Card>
//   );
// }



// // import { useState, useEffect } from 'react';
// // import { StoredHealthRecord } from '../types/fhir';
// // import { storageUtils } from '../utils/storage';
// // import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
// // import { Input } from './ui/input';
// // import { Checkbox } from './ui/checkbox';
// // import { Badge } from './ui/badge';
// // import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
// // import { 
// //   User,
// //   Search,
// //   FolderOpen,
// //   Calendar
// // } from 'lucide-react';

// // interface RecordsLibraryProps {
// //   onViewRecord: (record: StoredHealthRecord) => void;
// //   onExportRecord: (record: StoredHealthRecord) => void;
// //   onShareRecord: (record: StoredHealthRecord) => void;
// //   refreshTrigger: number;
// // }

// // export function RecordsLibrary({ 
// //   onViewRecord, 
// //   onExportRecord, 
// //   onShareRecord,
// //   refreshTrigger 
// // }: RecordsLibraryProps) {
// //   const [records, setRecords] = useState<StoredHealthRecord[]>([]);
// //   const [providerFilter, setProviderFilter] = useState<string>('all');
// //   const [searchQuery, setSearchQuery] = useState<string>('');
// //   const [dateSort, setDateSort] = useState<'newest' | 'oldest'>('newest');
// //   const [accessibleRecords, setAccessibleRecords] = useState<Set<string>>(new Set());

// //   useEffect(() => {
// //     loadRecords();
// //     loadAccessibleRecords();
// //   }, [refreshTrigger]);

// //   const loadRecords = () => {
// //     const allRecords = storageUtils.getAllRecords();
// //     setRecords(allRecords);
// //   };

// //   const loadAccessibleRecords = () => {
// //     const saved = localStorage.getItem('accessible_records');
// //     if (saved) {
// //       setAccessibleRecords(new Set(JSON.parse(saved)));
// //     }
// //   };

// //   const toggleAccessible = (recordId: string) => {
// //     const newSet = new Set(accessibleRecords);
// //     if (newSet.has(recordId)) {
// //       newSet.delete(recordId);
// //     } else {
// //       newSet.add(recordId);
// //     }
// //     setAccessibleRecords(newSet);
// //     localStorage.setItem('accessible_records', JSON.stringify(Array.from(newSet)));
// //   };

// //   const getRecordTitle = (record: StoredHealthRecord): string => {
// //     const resource = record.resource;
// //     switch (resource.resourceType) {
// //       case 'Patient':
// //         return `${(resource as any).name?.[0]?.given?.join(' ')} ${(resource as any).name?.[0]?.family}`;
// //       case 'MedicationStatement':
// //         return (resource as any).medicationCodeableConcept?.text || 'Medication';
// //       case 'AllergyIntolerance':
// //         return (resource as any).code?.text || 'Allergy';
// //       case 'Immunization':
// //         return (resource as any).vaccineCode?.text || 'Immunization';
// //       case 'Observation':
// //         return (resource as any).code?.text || 'Observation';
// //       case 'DocumentReference':
// //         return (resource as any).type?.text || 'Document';
// //       default:
// //         return 'Record 1';
// //     }
// //   };

// //   const getCategoryBadge = (category: string) => {
// //     const styles = {
// //       medication: 'bg-green-100 text-green-800 border-green-200',
// //       allergy: 'bg-red-100 text-red-800 border-red-200',
// //       observation: 'bg-orange-100 text-orange-800 border-orange-200',
// //       immunization: 'bg-blue-100 text-blue-800 border-blue-200',
// //       document: 'bg-gray-100 text-gray-800 border-gray-200'
// //     };
// //     return styles[category as keyof typeof styles] || styles.document;
// //   };

// //   // Get unique providers
// //   const uniqueProviders = Array.from(
// //     new Set(records.map(r => r.provider).filter(Boolean))
// //   );

// //   // Apply filters
// //   let filteredRecords = records;

// //   // Provider filter
// //   if (providerFilter !== 'all') {
// //     filteredRecords = filteredRecords.filter(r => r.provider === providerFilter);
// //   }

// //   // Search filter
// //   if (searchQuery) {
// //     filteredRecords = filteredRecords.filter(r => {
// //       const title = getRecordTitle(r).toLowerCase();
// //       return title.includes(searchQuery.toLowerCase());
// //     });
// //   }

// //   // Sort by date
// //   filteredRecords = [...filteredRecords].sort((a, b) => {
// //     const dateA = new Date(a.dateAdded).getTime();
// //     const dateB = new Date(b.dateAdded).getTime();
// //     return dateSort === 'newest' ? dateB - dateA : dateA - dateB;
// //   });

// //   return (
// //     <Card className="bg-white shadow-sm">
// //       <CardHeader className="pb-4">
// //         <div className="flex items-center justify-between">
// //           <div>
// //             <CardTitle className="text-xl font-semibold text-gray-900 flex items-center gap-2">
// //               <FolderOpen className="w-5 h-5 text-blue-600" />
// //               Health Records Library
// //             </CardTitle>
// //             <CardDescription className="mt-1">
// //               Search, filter, and manage your health records
// //             </CardDescription>
// //           </div>
// //           <Badge className="bg-blue-50 text-blue-700 border-blue-200">
// //             {filteredRecords.length} {filteredRecords.length === 1 ? 'record' : 'records'}
// //           </Badge>
// //         </div>
// //       </CardHeader>

// //       <CardContent className="pt-0 space-y-4">
// //         {/* Search Bar */}
// //         <div className="relative">
// //           <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
// //           <Input
// //             placeholder="Search records by name..."
// //             value={searchQuery}
// //             onChange={(e) => setSearchQuery(e.target.value)}
// //             className="pl-10 bg-gray-50"
// //           />
// //         </div>

// //         {/* Filters */}
// //         <div className="grid grid-cols-2 gap-4">
// //           <div className="space-y-2">
// //             <label className="text-xs font-medium text-gray-700">Provider</label>
// //             <Select value={providerFilter} onValueChange={setProviderFilter}>
// //               <SelectTrigger className="bg-gray-50">
// //                 <SelectValue placeholder="All Providers" />
// //               </SelectTrigger>
// //               <SelectContent>
// //                 <SelectItem value="all">All Providers</SelectItem>
// //                 {uniqueProviders.map(provider => (
// //                   <SelectItem key={provider} value={provider!}>
// //                     {provider}
// //                   </SelectItem>
// //                 ))}
// //               </SelectContent>
// //             </Select>
// //           </div>

// //           <div className="space-y-2">
// //             <label className="text-xs font-medium text-gray-700">Sort by Date</label>
// //             <Select value={dateSort} onValueChange={(value: 'newest' | 'oldest') => setDateSort(value)}>
// //               <SelectTrigger className="bg-gray-50">
// //                 <SelectValue placeholder="Latest" />
// //               </SelectTrigger>
// //               <SelectContent>
// //                 <SelectItem value="newest">Newest First</SelectItem>
// //                 <SelectItem value="oldest">Oldest First</SelectItem>
// //               </SelectContent>
// //             </Select>
// //           </div>
// //         </div>

// //         {/* Records Table */}
// //         <div className="border rounded-lg overflow-hidden bg-white">
// //           <div className="bg-gray-50 grid grid-cols-5 gap-4 px-4 py-3 text-xs font-medium text-gray-700 border-b">
// //             <div className="col-span-2">Record Name</div>
// //             <div>Provider</div>
// //             <div>Date Added</div>
// //             <div className="text-center">Accessible</div>
// //           </div>
// //           <div className="divide-y">
// //             {filteredRecords.length === 0 ? (
// //               <div className="text-center py-12 text-gray-500">
// //                 <FolderOpen className="w-12 h-12 mx-auto mb-3 text-gray-300" />
// //                 <p className="text-sm font-medium">No records found</p>
// //                 <p className="text-xs mt-1 text-gray-400">
// //                   {searchQuery || providerFilter !== 'all' 
// //                     ? 'Try adjusting your filters' 
// //                     : 'Upload your first health record to get started'}
// //                 </p>
// //               </div>
// //             ) : (
// //               filteredRecords.map((record, index) => (
// //                 <div 
// //                   key={record.id} 
// //                   className="grid grid-cols-5 gap-4 px-4 py-3 hover:bg-gray-50 items-center transition-colors cursor-pointer"
// //                   onClick={() => onViewRecord(record)}
// //                 >
// //                   <div className="col-span-2 flex items-center gap-3">
// //                     <div className="flex-1 min-w-0">
// //                       <p className="text-sm font-medium text-gray-900 truncate">
// //                         {getRecordTitle(record) === 'Record 1' ? `Record ${index + 1}` : getRecordTitle(record)}
// //                       </p>
// //                       <Badge 
// //                         variant="outline" 
// //                         className={`text-xs mt-1 ${getCategoryBadge(record.category)}`}
// //                       >
// //                         {record.category}
// //                       </Badge>
// //                     </div>
// //                   </div>
// //                   <div className="flex items-center gap-2">
// //                     <div className="w-7 h-7 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
// //                       <User className="w-4 h-4 text-blue-600" />
// //                     </div>
// //                     <span className="text-sm text-gray-700 truncate">
// //                       Dr. {record.provider || 'Smith'}
// //                     </span>
// //                   </div>
// //                   <div className="flex items-center gap-2 text-sm text-gray-600">
// //                     <Calendar className="w-4 h-4 text-gray-400" />
// //                     {new Date(record.dateAdded).toLocaleDateString('en-US', {
// //                       month: '2-digit',
// //                       day: '2-digit',
// //                       year: 'numeric'
// //                     })}
// //                   </div>
// //                   <div 
// //                     className="flex items-center justify-center"
// //                     onClick={(e) => e.stopPropagation()}
// //                   >
// //                     <Checkbox
// //                       checked={accessibleRecords.has(record.id)}
// //                       onCheckedChange={() => toggleAccessible(record.id)}
// //                     />
// //                   </div>
// //                 </div>
// //               ))
// //             )}
// //           </div>
// //         </div>
// //       </CardContent>
// //     </Card>
// //   );
// // }

import { useState, useEffect, useMemo } from "react";
import { StoredHealthRecord } from "../types/fhir";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Input } from "./ui/input";
import { Checkbox } from "./ui/checkbox";
import { Badge } from "./ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { User, Search, FolderOpen, Calendar } from "lucide-react";

import { supabase } from "../supabase/supabaseClient";

interface RecordsLibraryProps {
  onViewRecord: (record: StoredHealthRecord) => void;
  onExportRecord: (record: StoredHealthRecord) => void;
  onShareRecord: (record: StoredHealthRecord) => void;
  refreshTrigger: number;
}

// Extend locally for DB-backed docs
type LibraryRecord = StoredHealthRecord & {
  file_name?: string;
  file_path?: string;
  provider_name?: string | null;
  uploaded_at?: string | null;
};

export function RecordsLibrary({
  onViewRecord,
  onExportRecord,
  onShareRecord,
  refreshTrigger,
}: RecordsLibraryProps) {
  const [records, setRecords] = useState<LibraryRecord[]>([]);
  const [providerFilter, setProviderFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [dateSort, setDateSort] = useState<"newest" | "oldest">("newest");
  const [accessibleRecords, setAccessibleRecords] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadRecords();
    loadAccessibleRecords();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshTrigger]);

  const loadAccessibleRecords = () => {
    const saved = localStorage.getItem("accessible_records");
    if (saved) {
      setAccessibleRecords(new Set(JSON.parse(saved)));
    }
  };

  const toggleAccessible = (recordId: string) => {
    const newSet = new Set(accessibleRecords);
    if (newSet.has(recordId)) newSet.delete(recordId);
    else newSet.add(recordId);

    setAccessibleRecords(newSet);
    localStorage.setItem("accessible_records", JSON.stringify(Array.from(newSet)));
  };

  // ✅ NEW: load from Supabase health_records
  const loadRecords = async () => {
    setLoading(true);
    try {
      // Try auth first
      const { data: userData } = await supabase.auth.getUser();
      const email =
        userData?.user?.email ||
        localStorage.getItem("user_email") ||
        localStorage.getItem("userEmail") ||
        "";

      if (!email) {
        setRecords([]);
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from("health_records")
        .select("id, email, provider_name, file_name, file_path, document_type, uploaded_at")
        .eq("email", email)
        .order("uploaded_at", { ascending: false });

      if (error) {
        console.error("loadRecords (health_records) error:", error);
        setRecords([]);
        setLoading(false);
        return;
      }

      const mapped: LibraryRecord[] =
        (data ?? []).map((r: any) => ({
          id: r.id,
          provider: r.provider_name ?? "",
          category: "document",
          dateAdded: r.uploaded_at ?? new Date().toISOString(),
          resource: {
            resourceType: "DocumentReference",
            type: { text: r.file_name ?? "Document" },
          } as any,
          // keep raw DB fields for future open/view logic
          file_name: r.file_name,
          file_path: r.file_path,
          provider_name: r.provider_name,
          uploaded_at: r.uploaded_at,
        }));

      setRecords(mapped);
    } finally {
      setLoading(false);
    }
  };

  const getRecordTitle = (record: LibraryRecord): string => {
    // Prefer file_name for DB documents
    if (record.category === "document" && record.file_name) return record.file_name;

    const resource = record.resource as any;
    switch (resource?.resourceType) {
      case "Patient":
        return `${resource?.name?.[0]?.given?.join(" ") ?? ""} ${resource?.name?.[0]?.family ?? ""}`.trim() || "Patient";
      case "MedicationStatement":
        return resource?.medicationCodeableConcept?.text || "Medication";
      case "AllergyIntolerance":
        return resource?.code?.text || "Allergy";
      case "Immunization":
        return resource?.vaccineCode?.text || "Immunization";
      case "Observation":
        return resource?.code?.text || "Observation";
      case "DocumentReference":
        return resource?.type?.text || "Document";
      default:
        return "Record";
    }
  };

  const getCategoryBadge = (category: string) => {
    const styles = {
      medication: "bg-green-100 text-green-800 border-green-200",
      allergy: "bg-red-100 text-red-800 border-red-200",
      observation: "bg-orange-100 text-orange-800 border-orange-200",
      immunization: "bg-blue-100 text-blue-800 border-blue-200",
      document: "bg-gray-100 text-gray-800 border-gray-200",
    };
    return styles[category as keyof typeof styles] || styles.document;
  };

  const uniqueProviders = useMemo(
    () => Array.from(new Set(records.map((r) => r.provider).filter(Boolean))),
    [records]
  );

  // ---- filters ----
  let filteredRecords = records;

  if (providerFilter !== "all") {
    filteredRecords = filteredRecords.filter((r) => r.provider === providerFilter);
  }

  if (searchQuery) {
    const q = searchQuery.toLowerCase();
    filteredRecords = filteredRecords.filter((r) => getRecordTitle(r).toLowerCase().includes(q));
  }

  filteredRecords = [...filteredRecords].sort((a, b) => {
    const dateA = new Date(a.dateAdded).getTime();
    const dateB = new Date(b.dateAdded).getTime();
    return dateSort === "newest" ? dateB - dateA : dateA - dateB;
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
            {filteredRecords.length} {filteredRecords.length === 1 ? "record" : "records"}
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
                {uniqueProviders.map((provider) => (
                  <SelectItem key={provider} value={provider!}>
                    {provider}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-medium text-gray-700">Sort by Date</label>
            <Select
              value={dateSort}
              onValueChange={(value: "newest" | "oldest") => setDateSort(value)}
            >
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
            {loading ? (
              <div className="text-center py-12 text-gray-500">
                <p className="text-sm font-medium">Loading records...</p>
              </div>
            ) : filteredRecords.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <FolderOpen className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                <p className="text-sm font-medium">No records found</p>
                <p className="text-xs mt-1 text-gray-400">
                  {searchQuery || providerFilter !== "all"
                    ? "Try adjusting your filters"
                    : "Upload your first health record to get started"}
                </p>
              </div>
            ) : (
              filteredRecords.map((record, index) => (
                <div
                  key={record.id}
                  className="grid grid-cols-5 gap-4 px-4 py-3 hover:bg-gray-50 items-center transition-colors cursor-pointer"
                  onClick={() => onViewRecord(record as any)}
                >
                  <div className="col-span-2 flex items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {getRecordTitle(record) || `Record ${index + 1}`}
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
                      {record.provider ? `Dr. ${record.provider}` : "Unknown"}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Calendar className="w-4 h-4 text-gray-400" />
                    {new Date(record.dateAdded).toLocaleDateString("en-US", {
                      month: "2-digit",
                      day: "2-digit",
                      year: "numeric",
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
