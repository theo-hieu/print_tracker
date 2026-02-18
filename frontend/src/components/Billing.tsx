import { useState, useEffect, useMemo } from "react";
import api from "../api";
import { DollarSign, Save, Plus, Search } from "lucide-react";
import LoadingSpinner from "./LoadingSpinner";

export default function Billing() {
  const [activeMode, setActiveMode] = useState<"model" | "job">("job");

  const [models, setModels] = useState<any[]>([]);
  const [selectedModelID, setSelectedModelID] = useState<number | null>(null);

  const [jobs, setJobs] = useState<any[]>([]);
  const [selectedJobID, setSelectedJobID] = useState<number | null>(null);

  const [materialTypes, setMaterialTypes] = useState<any[]>([]);
  const [printers, setPrinters] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);

  // Billing factors
  const [laborCost, setLaborCost] = useState<number>(0);
  const [additionalCost, setAdditionalCost] = useState<number>(0);
  const [markupPercent, setMarkupPercent] = useState<number>(0);
  const [hourlyRate, setHourlyRate] = useState<number>(0);
  const [manualPrintHours, setManualPrintHours] = useState<number>(0);
  const [selectedClientID, setSelectedClientID] = useState<number | null>(null);

  // New Client Form
  const [showNewClient, setShowNewClient] = useState(false);
  const [newClientName, setNewClientName] = useState("");
  const [newClientChartstring, setNewClientChartstring] = useState("");

  const [loading, setLoading] = useState(true);
  const [modelSearch, setModelSearch] = useState("");
  const [jobSearch, setJobSearch] = useState("");

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      const [m, mt, p, j, c] = await Promise.all([
        api.get("/models"),
        api.get("/material-types"),
        api.get("/printers"),
        api.get("/jobs"),
        api.get("/clients").catch(() => ({ data: [] })), // Handle if missing initially
      ]);
      setModels(m.data);
      setMaterialTypes(mt.data);
      setPrinters(p.data);
      setJobs(j.data);
      setClients(c.data);
    } catch (err) {
      console.error("Failed to load billing data", err);
    } finally {
      setLoading(false);
    }
  }

  // Derived state
  const selectedModel = useMemo(
    () => models.find((m) => m.ModelID === Number(selectedModelID)),
    [models, selectedModelID],
  );
  const selectedJob = useMemo(
    () => jobs.find((j) => j.JobID === Number(selectedJobID)),
    [jobs, selectedJobID],
  );

  // Load existing values
  useEffect(() => {
    if (activeMode === "model" && selectedModel) {
      setLaborCost(Number(selectedModel.LaborCost) || 0);
      setAdditionalCost(Number(selectedModel.AdditionalCost) || 0);
      setMarkupPercent(Number(selectedModel.MarkupPercent) || 0);
      setManualPrintHours(0); // Reset or parse if possible
      setHourlyRate(0); // Reset
    } else if (activeMode === "job" && selectedJob) {
      setLaborCost(Number(selectedJob.LaborCost) || 0);
      setAdditionalCost(Number(selectedJob.AdditionalCost) || 0);
      setMarkupPercent(Number(selectedJob.MarkupPercent) || 0);
      setManualPrintHours(
        selectedJob.ActualPrintTimeMin
          ? selectedJob.ActualPrintTimeMin / 60
          : 0,
      );

      // Try to find printer hourly rate from job's printer
      if (selectedJob.PrinterID) {
        const p = printers.find((x) => x.PrinterID === selectedJob.PrinterID);
        if (p) setHourlyRate(Number(p.HourlyRate) || 0);
      }

      setSelectedClientID(selectedJob.ClientID || null);
    }
  }, [activeMode, selectedModel, selectedJob, printers]);

  // Calculations
  const materialCost = useMemo(() => {
    if (activeMode === "model" && selectedModel) {
      if (selectedModel.ModelMaterials?.length > 0) {
        return selectedModel.ModelMaterials.reduce((acc: number, mm: any) => {
          const mt = materialTypes.find(
            (t: any) => t.MaterialTypeID === mm.MaterialTypeID,
          );
          const costPerGram = mt ? Number(mt.CostPerGram) : 0;
          return acc + Number(mm.FilamentUsageGrams) * costPerGram;
        }, 0);
      }
      return 0;
    } else if (activeMode === "job" && selectedJob) {
      // Use JobMaterials (ActualUsage or Usage)
      if (selectedJob.JobMaterials?.length > 0) {
        return selectedJob.JobMaterials.reduce((acc: number, jm: any) => {
          const mt = materialTypes.find(
            (t: any) => t.MaterialTypeID === jm.MaterialTypeID,
          );
          const costPerGram = mt ? Number(mt.CostPerGram) : 0;
          const usage =
            Number(jm.ActualUsageGrams) || Number(jm.MaterialUsageGrams) || 0;
          return acc + usage * costPerGram;
        }, 0);
      }
      return 0;
    }
    return 0;
  }, [activeMode, selectedModel, selectedJob, materialTypes]);

  const totalPrintCost = manualPrintHours * hourlyRate;
  const subTotal = materialCost + totalPrintCost + laborCost + additionalCost;
  const totalCost = subTotal * (1 + markupPercent / 100);

  const handleCreateClient = async () => {
    if (!newClientName) return;
    try {
      const res = await api.post("/clients", {
        Name: newClientName,
        Chartstring: newClientChartstring,
      });
      setClients([...clients, res.data]);
      setSelectedClientID(res.data.ClientID);
      setShowNewClient(false);
      setNewClientName("");
      setNewClientChartstring("");
    } catch (err) {
      console.error("Failed to create client", err);
      alert("Failed to create client");
    }
  };

  const handleSave = async () => {
    try {
      setLoading(true);
      if (activeMode === "model" && selectedModel) {
        await api.put(`/models/${selectedModel.ModelID}`, {
          LaborCost: laborCost,
          AdditionalCost: additionalCost,
          MarkupPercent: markupPercent,
          EstimatedCost: totalCost,
        });
      } else if (activeMode === "job" && selectedJob) {
        await api.put(`/jobs/${selectedJob.JobID}`, {
          LaborCost: laborCost,
          AdditionalCost: additionalCost,
          MarkupPercent: markupPercent,
          ActualCost: totalCost,
          ClientID: selectedClientID,
        });
      }
      alert("Cost updated successfully!");
      loadData();
    } catch (err) {
      console.error("Failed to save cost", err);
      alert("Failed to save cost");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <LoadingSpinner text="Loading billing data..." />;
  }

  return (
    <div className="bg-white p-6 rounded-lg shadow-md h-full overflow-y-auto">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
          <DollarSign /> Billing & Cost Calculator
        </h2>

        {/* Mode Switcher */}
        <div className="bg-gray-100 p-1 rounded-lg flex">
          <button
            onClick={() => setActiveMode("model")}
            className={`px-4 py-2 rounded-md font-medium text-sm transition-all ${
              activeMode === "model"
                ? "bg-white text-blue-600 shadow"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            Bill by Model
          </button>
          <button
            onClick={() => setActiveMode("job")}
            className={`px-4 py-2 rounded-md font-medium text-sm transition-all ${
              activeMode === "job"
                ? "bg-white text-blue-600 shadow"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            Bill by Job
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Left Column: Selection */}
        <div className="md:col-span-1 space-y-6">
          {activeMode === "model" ? (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Select Model
              </label>
              <div className="relative mb-2">
                <Search
                  size={16}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                />
                <input
                  type="text"
                  placeholder="Search models..."
                  className="w-full border rounded-md p-2 pl-9 text-sm focus:ring-2 focus:ring-blue-400 outline-none"
                  value={modelSearch}
                  onChange={(e) => setModelSearch(e.target.value)}
                />
              </div>
              <select
                className="w-full border rounded-md p-2"
                value={selectedModelID || ""}
                onChange={(e) => setSelectedModelID(Number(e.target.value))}
              >
                <option value="">-- Select a Model --</option>
                {models
                  .filter((m) =>
                    m.ModelName.toLowerCase().includes(
                      modelSearch.toLowerCase(),
                    ),
                  )
                  .map((m) => (
                    <option key={m.ModelID} value={m.ModelID}>
                      {m.ModelName}
                    </option>
                  ))}
              </select>

              {selectedModel && (
                <div className="bg-gray-50 p-4 rounded-md text-sm space-y-2 mt-4 border">
                  <p>
                    <span className="font-semibold">Est. Material:</span>{" "}
                    {Number(selectedModel.EstimatedFilamentUsage).toFixed(2)}g
                  </p>
                  <p>
                    <span className="font-semibold">Est. Time:</span>{" "}
                    {selectedModel.EstimatedPrintTime || "N/A"}
                  </p>
                  <p>
                    <span className="font-semibold">Current Cost:</span> $
                    {Number(selectedModel.EstimatedCost).toFixed(2)}
                  </p>
                </div>
              )}
            </div>
          ) : (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Select Job
              </label>
              <div className="relative mb-2">
                <Search
                  size={16}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                />
                <input
                  type="text"
                  placeholder="Search jobs..."
                  className="w-full border rounded-md p-2 pl-9 text-sm focus:ring-2 focus:ring-blue-400 outline-none"
                  value={jobSearch}
                  onChange={(e) => setJobSearch(e.target.value)}
                />
              </div>
              <select
                className="w-full border rounded-md p-2"
                value={selectedJobID || ""}
                onChange={(e) => setSelectedJobID(Number(e.target.value))}
              >
                <option value="">-- Select a Job --</option>
                {jobs
                  .filter((j) => {
                    const q = jobSearch.toLowerCase();
                    return (
                      !q ||
                      j.JobName?.toLowerCase().includes(q) ||
                      j.Status?.toLowerCase().includes(q) ||
                      String(j.JobID).includes(q)
                    );
                  })
                  .map((j) => (
                    <option key={j.JobID} value={j.JobID}>
                      #{j.JobID} - {j.JobName} ({j.Status})
                    </option>
                  ))}
              </select>

              {selectedJob && (
                <div className="bg-gray-50 p-4 rounded-md text-sm space-y-2 mt-4 border">
                  <p>
                    <span className="font-semibold">Printer:</span>{" "}
                    {printers.find((p) => p.PrinterID === selectedJob.PrinterID)
                      ?.PrinterName || "Unknown"}
                  </p>
                  <p>
                    <span className="font-semibold">Date:</span>{" "}
                    {new Date(selectedJob.PrintDate).toLocaleDateString()}
                  </p>
                  <p>
                    <span className="font-semibold">Current Billed:</span> $
                    {Number(selectedJob.ActualCost || 0).toFixed(2)}
                  </p>

                  <div className="mt-4 pt-4 border-t">
                    <label className="block text-xs font-semibold uppercase text-gray-500 mb-1">
                      Client / Chartstring
                    </label>
                    <div className="flex gap-2">
                      <select
                        className="w-full border rounded p-2 text-sm"
                        value={selectedClientID || ""}
                        onChange={(e) =>
                          setSelectedClientID(
                            e.target.value ? Number(e.target.value) : null,
                          )
                        }
                      >
                        <option value="">-- No Client --</option>
                        {clients.map((c) => (
                          <option key={c.ClientID} value={c.ClientID}>
                            {c.Name} {c.Chartstring ? `(${c.Chartstring})` : ""}
                          </option>
                        ))}
                      </select>
                      <button
                        onClick={() => setShowNewClient(true)}
                        className="bg-gray-200 hover:bg-gray-300 p-2 rounded text-gray-700"
                        title="New Client"
                      >
                        <Plus size={16} />
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* New Client Modal/Popover area (simple inline for now) */}
          {showNewClient && (
            <div className="p-4 border border-blue-200 bg-blue-50 rounded-md">
              <h4 className="font-semibold text-sm mb-2 text-blue-800">
                New Client
              </h4>
              <input
                className="w-full border rounded p-2 text-sm mb-2"
                placeholder="Client Name"
                value={newClientName}
                onChange={(e) => setNewClientName(e.target.value)}
              />
              <input
                className="w-full border rounded p-2 text-sm mb-2"
                placeholder="Chartstring (Optional)"
                value={newClientChartstring}
                onChange={(e) => setNewClientChartstring(e.target.value)}
              />
              <div className="flex gap-2 justify-end">
                <button
                  onClick={() => setShowNewClient(false)}
                  className="text-xs text-gray-500 hover:text-gray-700"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateClient}
                  className="bg-blue-600 text-white text-xs px-3 py-1 rounded"
                >
                  Create
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Middle/Right: Calculator */}
        {(selectedModel || selectedJob) && (
          <div className="md:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-6">
            {/* Inputs */}
            <div className="space-y-4">
              <h3 className="font-semibold text-lg border-b pb-2">
                Cost Factors
              </h3>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Printer Hourly Rate ($/hr)
                </label>
                <div className="flex gap-2">
                  <select
                    className="w-1/2 border rounded p-2 text-sm"
                    onChange={(e) => {
                      const p = printers.find(
                        (x) => x.PrinterID === Number(e.target.value),
                      );
                      if (p) setHourlyRate(Number(p.HourlyRate) || 0);
                    }}
                  >
                    <option value="">Select Printer Ref...</option>
                    {printers.map((p) => (
                      <option key={p.PrinterID} value={p.PrinterID}>
                        {p.PrinterName}
                      </option>
                    ))}
                  </select>
                  <input
                    type="number"
                    className="w-1/2 border rounded p-2"
                    value={hourlyRate}
                    onChange={(e) => setHourlyRate(parseFloat(e.target.value))}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Print Operations (Hours)
                </label>
                <input
                  type="number"
                  className="w-full border rounded p-2"
                  value={manualPrintHours}
                  onChange={(e) =>
                    setManualPrintHours(parseFloat(e.target.value))
                  }
                  placeholder="e.g. 5.5"
                />
                {activeMode === "model" && selectedModel && (
                  <p className="text-xs text-gray-500 mt-1">
                    Est: {selectedModel.EstimatedPrintTime}
                  </p>
                )}
                {activeMode === "job" &&
                  selectedJob &&
                  selectedJob.ActualPrintTimeMin && (
                    <p className="text-xs text-gray-500 mt-1">
                      Actual: {(selectedJob.ActualPrintTimeMin / 60).toFixed(2)}{" "}
                      hrs
                    </p>
                  )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Labor Cost ($)
                </label>
                <input
                  type="number"
                  className="w-full border rounded p-2"
                  value={laborCost}
                  onChange={(e) => setLaborCost(parseFloat(e.target.value))}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Additional Costs ($)
                </label>
                <input
                  type="number"
                  className="w-full border rounded p-2"
                  value={additionalCost}
                  onChange={(e) =>
                    setAdditionalCost(parseFloat(e.target.value))
                  }
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Markup (%)
                </label>
                <input
                  type="number"
                  className="w-full border rounded p-2"
                  value={markupPercent}
                  onChange={(e) => setMarkupPercent(parseFloat(e.target.value))}
                />
              </div>
            </div>

            {/* Summary */}
            <div className="bg-gray-100 p-6 rounded-lg h-fit">
              <h3 className="font-semibold text-lg border-b pb-2 mb-4">
                Cost Summary{" "}
                <span className="text-sm font-normal text-gray-500">
                  ({activeMode})
                </span>
              </h3>

              <div className="space-y-2 text-sm mb-4">
                <div className="flex justify-between">
                  <span>Material Cost:</span>
                  <span>${materialCost.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Machine Cost:</span>
                  <span>${totalPrintCost.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Labor:</span>
                  <span>${laborCost.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Additional:</span>
                  <span>${additionalCost.toFixed(2)}</span>
                </div>
                <div className="flex justify-between pt-2 border-t font-medium">
                  <span>Subtotal:</span>
                  <span>${subTotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-green-700">
                  <span>Markup ({markupPercent}%):</span>
                  <span>${(subTotal * (markupPercent / 100)).toFixed(2)}</span>
                </div>
              </div>

              <div className="flex justify-between text-xl font-bold border-t border-gray-300 pt-4 mt-2">
                <span>Total:</span>
                <span>${totalCost.toFixed(2)}</span>
              </div>

              <button
                onClick={handleSave}
                disabled={loading}
                className="w-full mt-6 bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-lg font-semibold flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
              >
                <Save size={20} />
                {loading
                  ? "Saving..."
                  : activeMode === "model"
                    ? "Update Model Cost"
                    : "Update Job Billing"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
