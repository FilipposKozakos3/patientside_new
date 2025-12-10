import { useEffect, useState } from "react";
import { supabase } from "../supabase/supabaseClient";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Progress } from "./ui/progress";
import { HardDrive, FileText, Clock, Eye, AlertTriangle } from "lucide-react";

interface StorageStatsProps {
  refreshTrigger: number;
  userRole: string; // 'patient' | 'provider', not strictly enforced
}

interface StorageSummary {
  totalRecords: number;
  sizeInBytes: number;
  storageSize: string;
  lastUpload: string | null;
}

interface HealthRecordRow {
  id: number;
  file_name: string;
  document_type: string | null;
  uploaded_at: string;
  provider_name: string | null;
  email: string;
}

export function StorageStats({ refreshTrigger, userRole }: StorageStatsProps) {
  const [summary, setSummary] = useState<StorageSummary | null>(null);
  const [recentRecords, setRecentRecords] = useState<HealthRecordRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    const loadStats = async () => {
      setLoading(true);
      setErrorMsg(null);

      try {
        // 1) Get current user
        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser();

        if (userError || !user?.email) {
          console.error("StorageStats: no authenticated user", userError);
          setSummary(null);
          setRecentRecords([]);
          setErrorMsg("Unable to load storage info. Please sign in again.");
          setLoading(false);
          return;
        }

        const email = user.email;

        // 2) Fetch health_records for this user (works for both patient & provider)
        const { data, count, error } = await supabase
          .from("health_records")
          .select("*", { count: "exact" })
          .eq("email", email)
          .order("uploaded_at", { ascending: false });

        if (error) {
          console.error("StorageStats: error fetching health_records", error);
          setSummary(null);
          setRecentRecords([]);
          setErrorMsg("Failed to load storage usage.");
          setLoading(false);
          return;
        }

        const rows = (data || []) as HealthRecordRow[];
        const totalRecords = count ?? rows.length;

        // Very rough "size" estimate; you can refine later if you want real byte sizes
        const sizeInBytes = totalRecords * 1024; // pretend 1KB per record
        const storageSize = `${totalRecords} record${
          totalRecords === 1 ? "" : "s"
        }`;

        const lastUpload =
          rows.length > 0
            ? rows[0].uploaded_at || new Date().toISOString()
            : null;

        setSummary({
          totalRecords,
          sizeInBytes,
          storageSize,
          lastUpload,
        });

        setRecentRecords(rows.slice(0, 3));
      } catch (err) {
        console.error("StorageStats: loadStats failed", err);
        setSummary(null);
        setRecentRecords([]);
        setErrorMsg("Something went wrong while loading storage usage.");
      } finally {
        setLoading(false);
      }
    };

    loadStats();
  }, [refreshTrigger, userRole]);

  const maxStorageBytes = 5 * 1024 * 1024; // pretend 5 MB quota
  const usagePercent = summary
    ? Math.min(
        100,
        Math.round((summary.sizeInBytes / maxStorageBytes) * 100)
      )
    : 0;

  const formatDate = (iso: string | null) => {
    if (!iso) return "No uploads yet";
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "Unknown date";
    return d.toLocaleDateString("en-US", {
      month: "short",
      day: "2-digit",
      year: "numeric",
    });
  };

  const getRecordTitle = (record: HealthRecordRow): string =>
    record.file_name || record.document_type || "Health Record";

  if (loading && !summary && recentRecords.length === 0) {
    return (
      <Card className="bg-white shadow-sm">
        <CardHeader>
          <CardTitle className="text-base font-semibold text-gray-900 flex items-center gap-2">
            <HardDrive className="w-4 h-4 text-blue-600" />
            Storage &amp; Recent Activity
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-500">Loading storage usage…</p>
        </CardContent>
      </Card>
    );
  }

  if (errorMsg && !summary) {
    return (
      <Card className="bg-white shadow-sm border-red-100">
        <CardHeader>
          <CardTitle className="text-base font-semibold text-gray-900 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-red-500" />
            Storage &amp; Recent Activity
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-red-600">{errorMsg}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-white shadow-sm">
      <CardHeader>
        <CardTitle className="text-base font-semibold text-gray-900 flex items-center gap-2">
          <HardDrive className="w-4 h-4 text-blue-600" />
          Storage &amp; Recent Activity
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Storage usage */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-700">
              Records Stored
            </span>
            <span className="text-sm text-gray-600">
              {summary?.storageSize ?? "0 records"}
            </span>
          </div>
          <Progress value={usagePercent} className="h-2" />
          <p className="text-xs text-gray-500 mt-1">
            Approx. {summary?.totalRecords ?? 0} record
            {(summary?.totalRecords ?? 0) === 1 ? "" : "s"} of a 5&nbsp;MB test
            quota.
          </p>
        </div>

        {/* Last upload */}
        <div className="space-y-1">
          <h4 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
            <Clock className="w-4 h-4 text-gray-700" />
            Last Upload
          </h4>
          <p className="text-sm text-gray-700">
            {formatDate(summary?.lastUpload ?? null)}
          </p>
        </div>

        {/* Recent documents */}
        <div className="space-y-2">
          <h4 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
            <FileText className="w-4 h-4 text-gray-700" />
            Recent Documents
          </h4>
          {recentRecords.length === 0 ? (
            <p className="text-sm text-gray-500">
              No documents uploaded yet. Upload your first record to see it
              here.
            </p>
          ) : (
            <ul className="space-y-1">
              {recentRecords.map((record) => (
                <li
                  key={record.id}
                  className="flex items-center justify-between text-sm"
                >
                  <span className="text-gray-800 truncate max-w-[65%]">
                    {getRecordTitle(record)}
                  </span>
                  <span className="text-xs text-gray-500">
                    {formatDate(record.uploaded_at)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Recent access – simple placeholder for now */}
        <div className="space-y-2">
          <h4 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
            <Eye className="w-4 h-4 text-gray-700" />
            Recent Access
          </h4>
          <p className="text-sm text-gray-700">
            {userRole === "provider"
              ? "Recently accessed patient documents will appear here."
              : "Providers who view your documents will appear here in the future."}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
