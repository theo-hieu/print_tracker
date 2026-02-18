import { useEffect, useState } from "react";
import api from "../api";
import {
  Calendar,
  AlertTriangle,
  CheckCircle2,
  Package,
  TrendingUp,
} from "lucide-react";
import LoadingSpinner from "./LoadingSpinner";

interface MaterialProjection {
  MaterialTypeID: number;
  TypeName: string;
  TotalUsageGrams: number;
  AvailableGrams: number;
  Sufficient: boolean;
  Jobs: {
    JobID: number;
    JobName: string;
    ScheduledDate: string;
    Status: string;
    ModelName: string;
    PrinterName: string;
    UsageGrams: number;
  }[];
}

interface FutureJob {
  JobID: number;
  JobName: string;
  ScheduledDate: string;
  Status: string;
  ModelName: string;
  PrinterName: string;
  ClientName: string;
  Materials: {
    MaterialTypeID: number;
    TypeName: string;
    UsageGrams: number;
  }[];
}

export default function Planning() {
  const [projections, setProjections] = useState<MaterialProjection[]>([]);
  const [futureJobs, setFutureJobs] = useState<FutureJob[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadProjections();
  }, []);

  async function loadProjections() {
    try {
      setLoading(true);
      const res = await api.get("/jobs/planning/projections");
      setProjections(res.data.projections || []);
      setFutureJobs(res.data.futureJobs || []);
    } catch (err) {
      console.error("Failed to load projections", err);
    } finally {
      setLoading(false);
    }
  }

  const insufficientCount = projections.filter((p) => !p.Sufficient).length;

  if (loading) {
    return <LoadingSpinner text="Calculating projections..." />;
  }

  return (
    <div className="bg-white p-6 rounded-lg shadow-md h-full flex flex-col">
      {/* Header */}
      <div className="flex justify-between items-center mb-6 border-b pb-4">
        <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
          <TrendingUp /> Material Planning
        </h2>
        {insufficientCount > 0 && (
          <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 text-amber-800 px-4 py-2 rounded-lg">
            <AlertTriangle size={18} />
            <span className="font-medium">
              {insufficientCount} material{insufficientCount > 1 ? "s" : ""} may
              be insufficient
            </span>
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto space-y-6">
        {/* Material Projections Overview */}
        <section>
          <h3 className="text-lg font-semibold text-gray-700 mb-3 flex items-center gap-2">
            <Package size={20} /> Projected Material Usage
          </h3>
          {projections.length === 0 ? (
            <p className="text-gray-500 text-sm italic">
              No upcoming jobs with material requirements.
            </p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {projections.map((p) => {
                const usagePercent =
                  p.AvailableGrams > 0
                    ? Math.round((p.TotalUsageGrams / p.AvailableGrams) * 100)
                    : 999;
                return (
                  <div
                    key={p.MaterialTypeID}
                    className={`rounded-xl border p-4 transition-all ${
                      p.Sufficient
                        ? "border-green-200 bg-green-50/50"
                        : "border-amber-300 bg-amber-50/50 shadow-sm"
                    }`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <h4 className="font-semibold text-gray-800">
                        {p.TypeName}
                      </h4>
                      {p.Sufficient ? (
                        <CheckCircle2
                          size={20}
                          className="text-green-600 shrink-0"
                        />
                      ) : (
                        <AlertTriangle
                          size={20}
                          className="text-amber-600 shrink-0"
                        />
                      )}
                    </div>

                    <div className="space-y-1 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Needed:</span>
                        <span className="font-medium">
                          {p.TotalUsageGrams.toFixed(1)}g
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Available:</span>
                        <span className="font-medium">
                          {p.AvailableGrams.toFixed(1)}g
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Usage:</span>
                        <span
                          className={`font-bold ${
                            usagePercent > 100
                              ? "text-red-600"
                              : usagePercent > 80
                                ? "text-amber-600"
                                : "text-green-600"
                          }`}
                        >
                          {usagePercent}%
                        </span>
                      </div>
                    </div>

                    {/* Progress bar */}
                    <div className="mt-2 h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${
                          usagePercent > 100
                            ? "bg-red-500"
                            : usagePercent > 80
                              ? "bg-amber-500"
                              : "bg-green-500"
                        }`}
                        style={{ width: `${Math.min(usagePercent, 100)}%` }}
                      />
                    </div>

                    {/* Job breakdown */}
                    <div className="mt-3 space-y-1">
                      <p className="text-xs font-medium text-gray-500">
                        Jobs ({p.Jobs.length}):
                      </p>
                      {p.Jobs.slice(0, 3).map((job) => (
                        <div
                          key={job.JobID}
                          className="text-xs text-gray-600 flex justify-between"
                        >
                          <span className="truncate mr-2">{job.JobName}</span>
                          <span className="whitespace-nowrap">
                            {job.UsageGrams}g
                          </span>
                        </div>
                      ))}
                      {p.Jobs.length > 3 && (
                        <p className="text-xs text-gray-400">
                          +{p.Jobs.length - 3} more
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* Future Jobs Timeline */}
        <section>
          <h3 className="text-lg font-semibold text-gray-700 mb-3 flex items-center gap-2">
            <Calendar size={20} /> Upcoming Jobs
          </h3>
          {futureJobs.length === 0 ? (
            <p className="text-gray-500 text-sm italic">
              No upcoming or scheduled jobs.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left font-semibold text-gray-700">
                      Job
                    </th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-700">
                      Scheduled
                    </th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-700">
                      Status
                    </th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-700">
                      Model
                    </th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-700">
                      Printer
                    </th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-700">
                      Client
                    </th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-700">
                      Materials
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {futureJobs.map((j) => (
                    <tr
                      key={j.JobID}
                      className="hover:bg-gray-50 transition-colors"
                    >
                      <td className="px-4 py-3 font-medium text-gray-900">
                        {j.JobName}
                      </td>
                      <td className="px-4 py-3 text-gray-600">
                        {j.ScheduledDate
                          ? new Date(j.ScheduledDate).toLocaleDateString()
                          : "-"}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`px-2 py-1 text-xs font-semibold rounded ${
                            j.Status === "queued"
                              ? "bg-yellow-100 text-yellow-800"
                              : j.Status === "printing"
                                ? "bg-blue-100 text-blue-800"
                                : "bg-gray-100 text-gray-600"
                          }`}
                        >
                          {j.Status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-600">
                        {j.ModelName || "-"}
                      </td>
                      <td className="px-4 py-3 text-gray-600">
                        {j.PrinterName || "-"}
                      </td>
                      <td className="px-4 py-3 text-gray-600">
                        {j.ClientName || "-"}
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-600">
                        {j.Materials.map((m) => (
                          <div key={m.MaterialTypeID}>
                            {m.TypeName}: {m.UsageGrams}g
                          </div>
                        ))}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
