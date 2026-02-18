import React, { useEffect, useState, useMemo } from "react";
import api from "../api";
import ModelSearch from "./ModelSearch";
import PrinterCarboyGrid from "./PrinterCarboyGrid";
import LoadingSpinner from "./LoadingSpinner";
import {
  Plus,
  Edit2,
  Trash2,
  X,
  List,
  ChevronDown,
  ChevronUp,
  ArrowUpDown,
  Download,
  Upload,
  Camera,
  DollarSign,
  Clock,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Search,
} from "lucide-react";

interface JobMaterialData {
  MaterialTypeID: number;
  MaterialTypeName: string;
  MaterialUsageGrams: number;
  MaterialStartGrams?: number;
  MaterialEndGrams?: number;
  ActualUsageGrams?: number;
}

interface JobPhoto {
  PhotoID: number;
  FilePath: string;
  Caption?: string;
  PhotoType?: string;
}

interface Job {
  JobID: number;
  JobName: string;
  UserID: number;
  ModelID: number;
  PrinterID?: number;
  PrintDate: string;
  ScheduledDate?: string;
  Status: string;
  Notes?: string;
  EstimatedCost?: number;
  ActualCost?: number;
  ActualPrintTimeMin?: number;
  UserName?: string;
  ModelName?: string;
  PrinterName?: string;
  PrinterType?: string;
  JobMaterials: JobMaterialData[];
  JobPhotos: JobPhoto[];
  ClientName?: string;
  ClientID?: number;
}

interface Client {
  ClientID: number;
  Name: string;
}

interface User {
  UserID: number;
  UserName: string;
}

interface Model {
  ModelID: number;
  ModelName: string;
  ModelMaterials?: { MaterialTypeID: number; FilamentUsageGrams: number }[];
  Client?: { Name: string } | null;
}

interface Printer {
  PrinterID: number;
  PrinterName: string;
  PrinterType?: string;
  PrinterCarboys?: any[];
}

const STATUS_COLORS: Record<string, string> = {
  queued: "bg-yellow-100 text-yellow-800 border-yellow-300",
  printing: "bg-blue-100 text-blue-800 border-blue-300",
  completed: "bg-green-100 text-green-800 border-green-300",
  failed: "bg-red-100 text-red-800 border-red-300",
  cancelled: "bg-gray-100 text-gray-600 border-gray-300",
};

const STATUS_DOT: Record<string, string> = {
  queued: "bg-yellow-500",
  printing: "bg-blue-500",
  completed: "bg-green-500",
  failed: "bg-red-500",
  cancelled: "bg-gray-400",
};

export default function Jobs() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [models, setModels] = useState<Model[]>([]);
  const [printers, setPrinters] = useState<Printer[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [expandedJob, setExpandedJob] = useState<number | null>(null);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingJob, setEditingJob] = useState<Job | null>(null);
  const [activeTab, setActiveTab] = useState<"list" | "schedule">("list");
  const [searchQuery, setSearchQuery] = useState("");
  const [showAllJobs, setShowAllJobs] = useState(false);
  const [actualUsageEdits, setActualUsageEdits] = useState<
    Record<number, string>
  >({});
  const [loading, setLoading] = useState(true);

  // Month filter — defaults to current month
  const now = new Date();
  const [filterMonth, setFilterMonth] = useState(
    `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`,
  );

  // Calendar navigation for schedule tab
  const [calYear, setCalYear] = useState(now.getFullYear());
  const [calMonth, setCalMonth] = useState(now.getMonth());

  const [formData, setFormData] = useState({
    JobName: "",
    UserID: "",
    ModelID: "",
    PrinterID: "",
    ClientID: "",
    PrintDate: new Date().toISOString().split("T")[0],
    ScheduledDate: "",
    Status: "queued",
    Notes: "",
    ActualPrintTimeMin: "",
  });

  const [projectedUsage, setProjectedUsage] = useState<Record<number, number>>(
    {},
  );

  useEffect(() => {
    if (!formData.ModelID || !formData.PrinterID) {
      setProjectedUsage({});
      return;
    }

    const model = models.find((m) => m.ModelID === Number(formData.ModelID));
    if (!model || !model.ModelMaterials) {
      setProjectedUsage({});
      return;
    }

    const usage: Record<number, number> = {};
    model.ModelMaterials.forEach((mm) => {
      usage[mm.MaterialTypeID] = Number(mm.FilamentUsageGrams);
    });
    setProjectedUsage(usage);
  }, [formData.ModelID, formData.PrinterID, models]);

  async function load() {
    try {
      const [j, u, m, p, c] = await Promise.all([
        api.get("/jobs"),
        api.get("/users"),
        api.get("/models"),
        api.get("/printers"),
        api.get("/clients"),
      ]);
      setJobs(j.data);
      setUsers(u.data);
      setModels(m.data);
      setPrinters(p.data);
      setClients(c.data);
    } catch (err) {
      console.error("Failed to load data", err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  // Filter jobs by selected month
  const filteredJobs = useMemo(() => {
    let res = jobs;

    // 1. Month Filter (only if NOT showing all)
    if (!showAllJobs && filterMonth) {
      const [y, m] = filterMonth.split("-").map(Number);
      res = res.filter((j) => {
        const d = new Date(j.PrintDate);
        return d.getFullYear() === y && d.getMonth() + 1 === m;
      });
    }

    // 2. Search Filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      res = res.filter(
        (j) =>
          j.JobName.toLowerCase().includes(q) ||
          j.UserName?.toLowerCase().includes(q) ||
          j.ModelName?.toLowerCase().includes(q) ||
          j.PrinterName?.toLowerCase().includes(q) ||
          j.ClientName?.toLowerCase().includes(q) ||
          j.Status.toLowerCase().includes(q),
      );
    }
    return res;
  }, [jobs, filterMonth, showAllJobs, searchQuery]);

  const sortedJobs = [...filteredJobs].sort((a, b) => {
    const da = new Date(a.PrintDate).getTime();
    const db = new Date(b.PrintDate).getTime();
    return sortDir === "asc" ? da - db : db - da;
  });

  const toggleSort = () => setSortDir((d) => (d === "asc" ? "desc" : "asc"));

  const openModal = (job?: Job) => {
    if (job) {
      setEditingJob(job);
      setFormData({
        JobName: job.JobName,
        UserID: job.UserID.toString(),
        ModelID: job.ModelID.toString(),
        PrinterID: job.PrinterID?.toString() || "",
        ClientID: job.ClientID?.toString() || "",
        PrintDate: new Date(job.PrintDate).toISOString().split("T")[0],
        ScheduledDate: job.ScheduledDate
          ? new Date(job.ScheduledDate).toISOString().split("T")[0]
          : "",
        Status: job.Status || "queued",
        Notes: job.Notes || "",
        ActualPrintTimeMin: job.ActualPrintTimeMin?.toString() || "",
      });
    } else {
      setEditingJob(null);
      setFormData({
        JobName: "",
        UserID: "",
        ModelID: "",
        PrinterID: "",
        ClientID: "",
        PrintDate: new Date().toISOString().split("T")[0],
        ScheduledDate: "",
        Status: "queued",
        Notes: "",
        ActualPrintTimeMin: "",
      });
    }
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingJob(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload: any = {
      JobName: formData.JobName,
      UserID: Number(formData.UserID),
      ModelID: Number(formData.ModelID),
      PrinterID: formData.PrinterID ? Number(formData.PrinterID) : null,
      ClientID: formData.ClientID ? Number(formData.ClientID) : null,
      PrintDate: formData.PrintDate,
      ScheduledDate: formData.ScheduledDate || null,
      Status: formData.Status,
      Notes: formData.Notes,
      ActualPrintTimeMin: formData.ActualPrintTimeMin
        ? Number(formData.ActualPrintTimeMin)
        : null,
    };

    try {
      if (editingJob) {
        await api.put(`/jobs/${editingJob.JobID}`, payload);
      } else {
        await api.post("/jobs", payload);
      }
      closeModal();
      load();
    } catch (err) {
      console.error("Failed to save job", err);
      alert("Failed to save job");
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Delete job?")) return;
    try {
      await api.delete(`/jobs/${id}`);
      load();
    } catch (err) {
      console.error("Failed to delete job", err);
    }
  };

  const handleSaveActualUsage = async (jobId: number) => {
    const job = jobs.find((j) => j.JobID === jobId);
    if (!job) return;

    const materials = job.JobMaterials.filter(
      (jm) => actualUsageEdits[jm.MaterialTypeID] !== undefined,
    ).map((jm) => ({
      MaterialTypeID: jm.MaterialTypeID,
      ActualUsageGrams: parseFloat(actualUsageEdits[jm.MaterialTypeID]),
    }));

    if (materials.length === 0) return;

    try {
      await api.post(`/jobs/${jobId}/complete`, { materials });
      setActualUsageEdits({});
      load();
    } catch (err) {
      console.error("Failed to complete job", err);
      alert("Failed to complete job");
    }
  };

  const handleInlineUpdate = async (
    jobId: number,
    field: keyof Job,
    value: any,
  ) => {
    try {
      // Optimistic update
      setJobs(
        jobs.map((j) => (j.JobID === jobId ? { ...j, [field]: value } : j)),
      );

      await api.put(`/jobs/${jobId}`, { [field]: value });
      // Reload to get calculated fields or confirm sync
      // load(); // Optional: might be too heavy to reload on every keystroke/blur
    } catch (err) {
      console.error(`Failed to update ${field}`, err);
      alert(`Failed to update ${field}`);
      load(); // Revert on error
    }
  };

  const formatDateTimeForInput = (isoString?: string) => {
    if (!isoString) return "";
    const date = new Date(isoString);
    const offset = date.getTimezoneOffset() * 60000;
    const localISOTime = new Date(date.getTime() - offset)
      .toISOString()
      .slice(0, 16);
    return localISOTime;
  };

  const calculatePredictedEnd = (start: number, usage: number) => {
    return start - usage;
  };

  const handlePhotoUpload = async (
    jobId: number,
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const fd = new FormData();
    fd.append("photo", file);
    fd.append("PhotoType", "after");

    try {
      await api.post(`/jobs/${jobId}/photos`, fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      load();
    } catch (err) {
      console.error("Failed to upload photo", err);
    }
  };

  const handleDeletePhoto = async (jobId: number, photoId: number) => {
    try {
      await api.delete(`/jobs/${jobId}/photos/${photoId}`);
      load();
    } catch (err) {
      console.error("Failed to delete photo", err);
    }
  };

  const handleCSVExport = async () => {
    try {
      const res = await api.get("/jobs/export/csv", { responseType: "blob" });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement("a");
      a.href = url;
      a.download = `jobs-export-${new Date().toISOString().split("T")[0]}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error("CSV export failed", err);
    }
  };

  const handleCSVImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const fd = new FormData();
    fd.append("file", file);

    try {
      await api.post("/jobs/import/csv", fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      alert("Jobs imported successfully");
      load();
    } catch (err) {
      console.error("Import failed", err);
      alert("Failed to import jobs");
    }
    // Reset input
    e.target.value = "";
  };

  // ───── Calendar helpers ─────
  const calDaysInMonth = new Date(calYear, calMonth + 1, 0).getDate();
  const calFirstDayOfWeek = new Date(calYear, calMonth, 1).getDay(); // 0=Sun
  const calMonthName = new Date(calYear, calMonth).toLocaleString("default", {
    month: "long",
    year: "numeric",
  });

  const calPrev = () => {
    if (calMonth === 0) {
      setCalMonth(11);
      setCalYear(calYear - 1);
    } else {
      setCalMonth(calMonth - 1);
    }
  };

  const calNext = () => {
    if (calMonth === 11) {
      setCalMonth(0);
      setCalYear(calYear + 1);
    } else {
      setCalMonth(calMonth + 1);
    }
  };

  // Jobs for the calendar view (use ScheduledDate OR PrintDate)
  const calendarJobs = useMemo(() => {
    return jobs.filter((j) => {
      const dateStr = j.ScheduledDate || j.PrintDate;
      if (!dateStr) return false;
      const d = new Date(dateStr);
      return d.getFullYear() === calYear && d.getMonth() === calMonth;
    });
  }, [jobs, calYear, calMonth]);

  const jobsByDay = useMemo(() => {
    const map: Record<number, Job[]> = {};
    for (const j of calendarJobs) {
      const dateStr = j.ScheduledDate || j.PrintDate;
      const day = new Date(dateStr).getDate();
      if (!map[day]) map[day] = [];
      map[day].push(j);
    }
    return map;
  }, [calendarJobs]);

  const openModalForDate = (day: number) => {
    const dateStr = `${calYear}-${String(calMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    setEditingJob(null);
    setFormData({
      JobName: "",
      UserID: "",
      ModelID: "",
      PrinterID: "",
      ClientID: "",
      PrintDate: dateStr,
      ScheduledDate: dateStr,
      Status: "queued",
      Notes: "",
      ActualPrintTimeMin: "",
    });
    setIsModalOpen(true);
  };

  // ───── Render ─────
  if (loading) {
    return <LoadingSpinner text="Loading jobs..." />;
  }

  return (
    <div className="bg-white p-6 rounded-lg shadow-md h-full flex flex-col">
      {/* Header */}
      <div className="flex justify-between items-center mb-4 border-b pb-4 flex-wrap gap-3">
        <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
          <List /> Jobs
        </h2>
        <div className="flex items-center gap-3 flex-wrap">
          {/* Tab toggle */}
          <div className="flex bg-gray-100 rounded-lg p-0.5">
            <button
              onClick={() => setActiveTab("list")}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                activeTab === "list"
                  ? "bg-white text-gray-900 shadow-sm"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              <List size={14} className="inline mr-1" />
              List
            </button>
            <button
              onClick={() => setActiveTab("schedule")}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                activeTab === "schedule"
                  ? "bg-white text-gray-900 shadow-sm"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              <CalendarDays size={14} className="inline mr-1" />
              Schedule
            </button>
          </div>

          {/* Month filter (list tab only) */}
          {activeTab === "list" && (
            <input
              type="month"
              className="border border-gray-300 rounded px-3 py-1.5 text-sm focus:ring-2 focus:ring-red-500 outline-none"
              value={filterMonth}
              onChange={(e) => setFilterMonth(e.target.value)}
            />
          )}

          {/* Show All Toggle */}
          {activeTab === "list" && (
            <button
              onClick={() => setShowAllJobs(!showAllJobs)}
              className={`px-3 py-1.5 rounded text-sm font-medium border transition-colors ${
                showAllJobs
                  ? "bg-red-100 text-red-800 border-red-300"
                  : "bg-white text-gray-600 border-gray-300 hover:bg-gray-50"
              }`}
            >
              All Jobs
            </button>
          )}

          {/* Search Bar */}
          <div className="relative">
            <Search
              size={16}
              className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400"
            />
            <input
              type="text"
              placeholder="Search jobs..."
              className="pl-9 pr-3 py-1.5 border border-gray-300 rounded text-sm outline-none focus:ring-2 focus:ring-red-500 w-48"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCSVExport}
              className="border border-gray-300 px-3 py-2 rounded text-sm flex items-center gap-1 hover:bg-gray-50 transition-colors"
            >
              <Download size={14} /> Export CSV
            </button>
            <label className="border border-gray-300 px-3 py-2 rounded text-sm flex items-center gap-1 hover:bg-gray-50 transition-colors cursor-pointer">
              <Upload size={14} /> Import CSV
              <input
                type="file"
                className="hidden"
                accept=".csv"
                onChange={handleCSVImport}
              />
            </label>
          </div>

          <button
            onClick={() => openModal()}
            className="bg-red-800 hover:bg-red-900 text-white px-4 py-2 rounded flex items-center gap-2 transition-colors"
          >
            <Plus size={18} /> New Job
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* ───── LIST TAB ───── */}
        {activeTab === "list" && (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold text-gray-700">
                    Job Name
                  </th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-700">
                    User
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
                  <th
                    className="px-4 py-3 text-left font-semibold text-gray-700 cursor-pointer select-none hover:text-red-700"
                    onClick={toggleSort}
                  >
                    <div className="flex items-center gap-1">
                      Date
                      <ArrowUpDown size={14} />
                    </div>
                  </th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-700">
                    Status
                  </th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-700">
                    <DollarSign size={14} className="inline" /> Cost
                  </th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-700">
                    Materials
                  </th>
                  <th className="px-4 py-3 text-center font-semibold text-gray-700">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {sortedJobs.map((j) => (
                  <React.Fragment key={j.JobID}>
                    <tr className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 font-medium text-gray-900">
                        {j.JobName}
                      </td>
                      <td className="px-4 py-3 text-gray-600">
                        {j.UserName || "-"}
                      </td>
                      <td className="px-4 py-3 text-gray-600">
                        {j.ModelName || "-"}
                      </td>
                      <td className="px-4 py-3 text-gray-600">
                        {j.PrinterName || "-"}
                        {j.PrinterType && (
                          <span className="ml-1 text-xs text-blue-600">
                            ({j.PrinterType})
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-gray-600">
                        {j.ClientName || "-"}
                      </td>
                      <td className="px-4 py-3 text-gray-600 space-y-1">
                        <div>
                          <span className="text-xs text-gray-500 block">
                            Print Date
                          </span>
                          {new Date(j.PrintDate).toLocaleDateString()}
                        </div>
                        <div>
                          <span className="text-xs text-gray-500 block">
                            Scheduled
                          </span>
                          <input
                            type="datetime-local"
                            className="border rounded px-1 py-0.5 text-xs w-full"
                            value={formatDateTimeForInput(j.ScheduledDate)}
                            onChange={(e) => {
                              const date = new Date(e.target.value);
                              handleInlineUpdate(
                                j.JobID,
                                "ScheduledDate",
                                date.toISOString(),
                              );
                            }}
                          />
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <select
                          className={`px-2 py-1 text-xs font-semibold rounded border-0 cursor-pointer ${
                            STATUS_COLORS[j.Status] ||
                            "bg-gray-100 text-gray-600"
                          }`}
                          value={j.Status}
                          onChange={(e) =>
                            handleInlineUpdate(
                              j.JobID,
                              "Status",
                              e.target.value,
                            )
                          }
                        >
                          <option value="queued">Queued</option>
                          <option value="printing">Printing</option>
                          <option value="completed">Completed</option>
                          <option value="failed">Failed</option>
                          <option value="cancelled">Cancelled</option>
                        </select>
                      </td>
                      <td className="px-4 py-3 text-gray-600 text-xs">
                        {j.EstimatedCost != null && (
                          <div>Est: ${Number(j.EstimatedCost).toFixed(2)}</div>
                        )}
                        {j.ActualCost != null && (
                          <div className="font-semibold">
                            Act: ${Number(j.ActualCost).toFixed(2)}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-gray-600 text-xs">
                        <div className="space-y-1">
                          {j.JobMaterials.map((m) => (
                            <div key={m.MaterialTypeID}>
                              <span className="font-medium">
                                {m.MaterialTypeName}
                              </span>
                              <span className="text-gray-400 mx-1">|</span>
                              {m.MaterialStartGrams != null ? (
                                <span title="Predicted End">
                                  {Number(m.MaterialStartGrams)}g →{" "}
                                  {calculatePredictedEnd(
                                    Number(m.MaterialStartGrams),
                                    Number(m.MaterialUsageGrams),
                                  )}
                                  g
                                </span>
                              ) : (
                                <span>{Number(m.MaterialUsageGrams)}g</span>
                              )}
                            </div>
                          ))}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() =>
                              setExpandedJob(
                                expandedJob === j.JobID ? null : j.JobID,
                              )
                            }
                            className="text-gray-500 hover:bg-gray-100 p-1 rounded"
                            title="Expand"
                          >
                            {expandedJob === j.JobID ? (
                              <ChevronUp size={16} />
                            ) : (
                              <ChevronDown size={16} />
                            )}
                          </button>
                          <button
                            onClick={() => openModal(j)}
                            className="text-blue-600 hover:bg-blue-50 p-1 rounded"
                            title="Edit Details"
                          >
                            <Edit2 size={16} />
                          </button>
                          <button
                            onClick={() => handleDelete(j.JobID)}
                            className="text-red-600 hover:bg-red-50 p-1 rounded"
                            title="Delete"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>

                    {/* Expanded Row */}
                    {expandedJob === j.JobID && (
                      <tr>
                        <td colSpan={10} className="px-4 py-4 bg-gray-50">
                          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            {/* Materials Breakdown */}
                            <div>
                              <h4 className="font-semibold text-sm text-gray-700 mb-2">
                                Material Details
                              </h4>
                              {j.JobMaterials.length > 0 ? (
                                <div className="space-y-2">
                                  {j.JobMaterials.map((jm) => (
                                    <div
                                      key={jm.MaterialTypeID}
                                      className="bg-white p-3 rounded border text-sm"
                                    >
                                      <div className="flex justify-between items-center mb-1">
                                        <span className="font-medium">
                                          {jm.MaterialTypeName}
                                        </span>
                                        <span className="text-xs text-gray-500">
                                          Est: {Number(jm.MaterialUsageGrams)}g
                                        </span>
                                      </div>
                                      <div className="text-xs text-gray-500 space-y-0.5">
                                        <div className="flex items-center gap-2 mt-1">
                                          <label className="text-gray-600 font-medium">
                                            Start:
                                          </label>
                                          <input
                                            type="number"
                                            step="1"
                                            className="w-20 border rounded px-2 py-0.5 text-right focus:ring-1 focus:ring-blue-400 outline-none"
                                            value={jm.MaterialStartGrams ?? ""}
                                            defaultValue={
                                              jm.MaterialStartGrams ?? ""
                                            }
                                            readOnly
                                          />
                                          <span className="text-gray-400">
                                            g
                                          </span>
                                          <span className="text-gray-500 mx-1">
                                            →
                                          </span>
                                          <span
                                            className="text-gray-500"
                                            title="Predicted End"
                                          >
                                            {calculatePredictedEnd(
                                              Number(
                                                jm.MaterialStartGrams || 0,
                                              ),
                                              Number(jm.MaterialUsageGrams),
                                            )}
                                            g
                                          </span>
                                        </div>
                                        <div className="flex items-center gap-2 mt-1">
                                          <label className="text-gray-600 font-medium">
                                            Actual:
                                          </label>
                                          <input
                                            type="number"
                                            step="1"
                                            min="0"
                                            className="w-20 border rounded px-2 py-0.5 text-right focus:ring-1 focus:ring-red-400 outline-none"
                                            value={
                                              actualUsageEdits[
                                                jm.MaterialTypeID
                                              ] ??
                                              jm.ActualUsageGrams?.toString() ??
                                              ""
                                            }
                                            onChange={(e) =>
                                              setActualUsageEdits({
                                                ...actualUsageEdits,
                                                [jm.MaterialTypeID]:
                                                  e.target.value,
                                              })
                                            }
                                          />
                                          <span className="text-gray-400">
                                            g
                                          </span>
                                        </div>
                                      </div>
                                    </div>
                                  ))}
                                  <button
                                    onClick={() =>
                                      handleSaveActualUsage(j.JobID)
                                    }
                                    className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded text-xs font-medium mt-1"
                                  >
                                    Complete Job & Save Usage
                                  </button>
                                </div>
                              ) : (
                                <p className="text-sm text-gray-500">
                                  No materials tracked
                                </p>
                              )}
                            </div>

                            {/* Photos */}
                            <div>
                              <h4 className="font-semibold text-sm text-gray-700 mb-2 flex items-center gap-1">
                                <Camera size={14} /> Photos
                              </h4>
                              <div className="flex gap-2 flex-wrap mb-2">
                                {j.JobPhotos.map((p) => (
                                  <div
                                    key={p.PhotoID}
                                    className="relative group"
                                  >
                                    <img
                                      src={
                                        api.defaults.baseURL?.replace(
                                          "/api",
                                          "",
                                        ) + p.FilePath
                                      }
                                      alt={p.Caption || "Job Photo"}
                                      className="w-20 h-20 object-cover rounded border"
                                    />
                                    <button
                                      onClick={() =>
                                        handleDeletePhoto(j.JobID, p.PhotoID)
                                      }
                                      className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                                    >
                                      <X size={10} />
                                    </button>
                                  </div>
                                ))}
                              </div>
                              <label className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 cursor-pointer">
                                <Camera size={12} /> Upload Photo
                                <input
                                  type="file"
                                  accept="image/*"
                                  className="hidden"
                                  onChange={(e) =>
                                    handlePhotoUpload(j.JobID, e)
                                  }
                                />
                              </label>

                              {/* Notes & Print Time */}
                              {j.Notes && (
                                <div className="mt-3 text-sm text-gray-600">
                                  <span className="font-semibold">Notes:</span>{" "}
                                  {j.Notes}
                                </div>
                              )}
                              {j.ActualPrintTimeMin != null && (
                                <div className="mt-1 text-sm text-gray-600 flex items-center gap-1">
                                  <Clock size={12} /> {j.ActualPrintTimeMin} min
                                </div>
                              )}
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
                {sortedJobs.length === 0 && (
                  <tr>
                    <td
                      colSpan={9}
                      className="px-4 py-8 text-center text-gray-500"
                    >
                      No jobs found for this month
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* ───── SCHEDULE TAB ───── */}
        {activeTab === "schedule" && (
          <div className="space-y-4">
            {/* Calendar Nav */}
            <div className="flex items-center justify-between">
              <button
                onClick={calPrev}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ChevronLeft size={20} />
              </button>
              <h3 className="text-xl font-bold text-gray-800">
                {calMonthName}
              </h3>
              <button
                onClick={calNext}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ChevronRight size={20} />
              </button>
            </div>

            {/* Calendar Grid */}
            <div className="border rounded-xl overflow-hidden">
              {/* Day Headers */}
              <div className="grid grid-cols-7 bg-gray-50 border-b">
                {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(
                  (day) => (
                    <div
                      key={day}
                      className="px-2 py-2 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider"
                    >
                      {day}
                    </div>
                  ),
                )}
              </div>

              {/* Day Cells */}
              <div className="grid grid-cols-7">
                {/* Empty cells before first day */}
                {Array.from({ length: calFirstDayOfWeek }, (_, i) => (
                  <div
                    key={`empty-${i}`}
                    className="min-h-[100px] border-b border-r bg-gray-50/50"
                  />
                ))}

                {/* Day cells */}
                {Array.from({ length: calDaysInMonth }, (_, i) => {
                  const day = i + 1;
                  const dayJobs = jobsByDay[day] || [];
                  const isToday =
                    calYear === now.getFullYear() &&
                    calMonth === now.getMonth() &&
                    day === now.getDate();

                  return (
                    <div
                      key={day}
                      onClick={() => openModalForDate(day)}
                      className={`min-h-[100px] border-b border-r p-1.5 cursor-pointer hover:bg-blue-50/50 transition-colors ${
                        isToday ? "bg-red-50/40" : ""
                      }`}
                    >
                      <div className="flex justify-between items-start mb-1">
                        <span
                          className={`text-sm font-medium w-7 h-7 flex items-center justify-center rounded-full ${
                            isToday ? "bg-red-700 text-white" : "text-gray-700"
                          }`}
                        >
                          {day}
                        </span>
                        {dayJobs.length > 0 && (
                          <span className="text-xs text-gray-400 font-medium">
                            {dayJobs.length}
                          </span>
                        )}
                      </div>
                      <div className="space-y-0.5">
                        {dayJobs.slice(0, 3).map((dj) => (
                          <div
                            key={dj.JobID}
                            onClick={(e) => {
                              e.stopPropagation();
                              openModal(dj);
                            }}
                            className={`text-xs px-1.5 py-0.5 rounded truncate border cursor-pointer hover:shadow-sm transition-shadow ${
                              STATUS_COLORS[dj.Status] ||
                              "bg-gray-100 text-gray-600 border-gray-200"
                            }`}
                            title={`${dj.JobName} — ${dj.Status}`}
                          >
                            <div className="flex items-center gap-1">
                              <span
                                className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                                  STATUS_DOT[dj.Status] || "bg-gray-400"
                                }`}
                              />
                              <span className="truncate">{dj.JobName}</span>
                            </div>
                          </div>
                        ))}
                        {dayJobs.length > 3 && (
                          <div className="text-xs text-gray-400 px-1">
                            +{dayJobs.length - 3} more
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}

                {/* Trailing empty cells to complete the grid */}
                {(() => {
                  const totalCells = calFirstDayOfWeek + calDaysInMonth;
                  const remainder = totalCells % 7;
                  if (remainder === 0) return null;
                  return Array.from({ length: 7 - remainder }, (_, i) => (
                    <div
                      key={`trail-${i}`}
                      className="min-h-[100px] border-b border-r bg-gray-50/50"
                    />
                  ));
                })()}
              </div>
            </div>

            {/* Timeline View — Jobs this month */}
            {calendarJobs.length > 0 && (
              <div className="border rounded-xl p-4">
                <h4 className="font-semibold text-sm text-gray-700 mb-3">
                  Timeline — {calMonthName}
                </h4>
                <div className="space-y-2">
                  {calendarJobs
                    .sort((a, b) => {
                      const da = new Date(
                        a.ScheduledDate || a.PrintDate,
                      ).getTime();
                      const db = new Date(
                        b.ScheduledDate || b.PrintDate,
                      ).getTime();
                      return da - db;
                    })
                    .map((j) => {
                      const dateStr = j.ScheduledDate || j.PrintDate;
                      const day = new Date(dateStr).getDate();
                      const pct = ((day - 1) / (calDaysInMonth - 1)) * 100;
                      return (
                        <div
                          key={j.JobID}
                          className="relative flex items-center gap-3"
                        >
                          <div className="w-12 text-right text-xs text-gray-500 font-mono shrink-0">
                            {new Date(dateStr).toLocaleDateString("en-US", {
                              month: "short",
                              day: "numeric",
                            })}
                          </div>
                          <div className="flex-1 relative h-8 bg-gray-100 rounded-lg overflow-hidden">
                            <div
                              className={`absolute top-0 left-0 h-full rounded-lg transition-all ${
                                j.Status === "completed"
                                  ? "bg-green-400/70"
                                  : j.Status === "printing"
                                    ? "bg-blue-400/70"
                                    : j.Status === "failed"
                                      ? "bg-red-400/70"
                                      : "bg-yellow-400/70"
                              }`}
                              style={{
                                left: `${pct}%`,
                                width: `${Math.max(
                                  8,
                                  j.ActualPrintTimeMin
                                    ? (j.ActualPrintTimeMin / (24 * 60)) * 100
                                    : 8,
                                )}%`,
                                maxWidth: `${100 - pct}%`,
                              }}
                            />
                            <div className="absolute inset-0 flex items-center px-2">
                              <span className="text-xs font-medium text-gray-800 truncate z-10">
                                {j.JobName}
                              </span>
                            </div>
                          </div>
                          <span
                            className={`text-xs px-2 py-0.5 rounded font-medium shrink-0 ${
                              STATUS_COLORS[j.Status] ||
                              "bg-gray-100 text-gray-600"
                            }`}
                          >
                            {j.Status}
                          </span>
                        </div>
                      );
                    })}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ───── CREATE / EDIT MODAL ───── */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-[95vw] h-[90vh] flex flex-col">
            <div className="flex justify-between items-center p-4 border-b bg-gray-50">
              <h3 className="font-bold text-lg text-gray-800">
                {editingJob ? "Edit Job" : "New Job"}
              </h3>
              <button
                onClick={closeModal}
                className="text-gray-500 hover:text-gray-700"
              >
                <X size={20} />
              </button>
            </div>

            <form
              onSubmit={handleSubmit}
              className="p-6 overflow-y-auto flex-1 dark:bg-slate-50"
            >
              <div className="flex flex-col lg:flex-row gap-8">
                {/* LEFT COLUMN: Input Fields */}
                <div className="flex-1 space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Job Name
                    </label>
                    <input
                      required
                      className="w-full border border-gray-300 rounded p-2 focus:ring-2 focus:ring-red-500 outline-none"
                      value={formData.JobName}
                      onChange={(e) =>
                        setFormData({ ...formData, JobName: e.target.value })
                      }
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        User
                      </label>
                      <select
                        required
                        className="w-full border border-gray-300 rounded p-2 focus:ring-2 focus:ring-red-500 outline-none"
                        value={formData.UserID}
                        onChange={(e) =>
                          setFormData({ ...formData, UserID: e.target.value })
                        }
                      >
                        <option value="">Select user</option>
                        {users.map((u) => (
                          <option key={u.UserID} value={u.UserID}>
                            {u.UserName}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Billed Client
                      </label>
                      <select
                        className="w-full border border-gray-300 rounded p-2 focus:ring-2 focus:ring-red-500 outline-none"
                        value={formData.ClientID}
                        onChange={(e) =>
                          setFormData({ ...formData, ClientID: e.target.value })
                        }
                      >
                        <option value="">(Default / None)</option>
                        {clients.map((c) => (
                          <option key={c.ClientID} value={c.ClientID}>
                            {c.Name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Printer
                      </label>
                      <select
                        className="w-full border border-gray-300 rounded p-2 focus:ring-2 focus:ring-red-500 outline-none"
                        value={formData.PrinterID}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            PrinterID: e.target.value,
                          })
                        }
                      >
                        <option value="">Select printer</option>
                        {printers.map((p) => (
                          <option key={p.PrinterID} value={p.PrinterID}>
                            {p.PrinterName}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Model
                      </label>
                      <ModelSearch
                        models={models}
                        selectedModelID={formData.ModelID}
                        onSelect={(id) =>
                          setFormData({
                            ...formData,
                            ModelID: id === 0 ? "" : id.toString(),
                          })
                        }
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Print Date
                      </label>
                      <input
                        type="date"
                        required
                        className="w-full border border-gray-300 rounded p-2 focus:ring-2 focus:ring-red-500 outline-none"
                        value={formData.PrintDate}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            PrintDate: e.target.value,
                          })
                        }
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Scheduled
                      </label>
                      <input
                        type="date"
                        className="w-full border border-gray-300 rounded p-2 focus:ring-2 focus:ring-red-500 outline-none"
                        value={formData.ScheduledDate}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            ScheduledDate: e.target.value,
                          })
                        }
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Time (min)
                      </label>
                      <input
                        type="number"
                        className="w-full border border-gray-300 rounded p-2 focus:ring-2 focus:ring-red-500 outline-none"
                        value={formData.ActualPrintTimeMin}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            ActualPrintTimeMin: e.target.value,
                          })
                        }
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Status
                      </label>
                      <select
                        className="w-full border border-gray-300 rounded p-2 focus:ring-2 focus:ring-red-500 outline-none"
                        value={formData.Status}
                        onChange={(e) =>
                          setFormData({ ...formData, Status: e.target.value })
                        }
                      >
                        <option value="queued">Queued</option>
                        <option value="printing">Printing</option>
                        <option value="completed">Completed</option>
                        <option value="failed">Failed</option>
                        <option value="cancelled">Cancelled</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Notes
                    </label>
                    <textarea
                      className="w-full border border-gray-300 rounded p-2 focus:ring-2 focus:ring-red-500 outline-none"
                      rows={3}
                      value={formData.Notes}
                      onChange={(e) =>
                        setFormData({ ...formData, Notes: e.target.value })
                      }
                    />
                  </div>
                </div>

                {/* RIGHT COLUMN: Visualization */}
                <div className="flex-1 flex flex-col">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Material Availability Check
                  </label>

                  <div className="bg-gray-100 rounded-xl p-4 h-full flex items-center justify-center min-h-[300px] border border-gray-200">
                    {formData.PrinterID ? (
                      (() => {
                        const printer = printers.find(
                          (p) => p.PrinterID === Number(formData.PrinterID),
                        );
                        if (!printer || !printer.PrinterCarboys)
                          return (
                            <div className="text-gray-400 text-center">
                              Printer data not available
                            </div>
                          );

                        return (
                          <div className="w-full">
                            <PrinterCarboyGrid
                              carboys={printer.PrinterCarboys}
                              materials={[]}
                              projectedUsage={projectedUsage}
                            />
                            <div className="mt-4 text-xs text-gray-500 text-center">
                              Visualizing current material loading for{" "}
                              <strong>{printer.PrinterName}</strong>.
                              {Object.keys(projectedUsage).length > 0 &&
                                " Red overlay indicates projected usage for this job."}
                            </div>
                          </div>
                        );
                      })()
                    ) : (
                      <div className="text-gray-400 text-center flex flex-col items-center">
                        <List size={48} className="mb-2 opacity-20" />
                        <p>Select a printer to view material status</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-6 border-t mt-6">
                <button
                  type="button"
                  onClick={closeModal}
                  className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-red-800 text-white rounded hover:bg-red-900"
                >
                  {editingJob ? "Save Changes" : "Create Job"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
