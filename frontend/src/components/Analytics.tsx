import { useEffect, useState } from "react";
import api from "../api";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  LineChart,
  Line,
  CartesianGrid,
} from "recharts";
import { BarChart as BarChartIcon } from "lucide-react";

interface MaterialUsage {
  MaterialName: string;
  totalUsage: number;
}

interface JobsOverTime {
  period: string;
  jobCount: number;
}

interface PrinterUtilization {
  PrinterName: string;
  PrinterType?: string;
  TotalPrintHours: number;
  period: string;
  jobCount: number;
  totalMinutes: number;
  totalHours: number;
}

interface CostSummary {
  period: string;
  totalEstimated: number;
  totalActual: number;
  jobCount: number;
}

const tooltipStyle = {
  borderRadius: "8px",
  border: "none",
  boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
};

export default function Analytics() {
  const [mat, setMat] = useState<MaterialUsage[]>([]);
  const [jobsOverTime, setJobsOverTime] = useState<JobsOverTime[]>([]);
  const [utilization, setUtilization] = useState<PrinterUtilization[]>([]);
  const [costSummary, setCostSummary] = useState<CostSummary[]>([]);

  useEffect(() => {
    (async () => {
      try {
        const [matRes, jobsRes, utilRes, costRes] = await Promise.all([
          api.get("/analytics/material-usage"),
          api.get("/analytics/jobs-over-time"),
          api.get("/analytics/printer-utilization"),
          api.get("/analytics/cost-summary"),
        ]);
        setMat(matRes.data);
        setJobsOverTime(jobsRes.data);
        setUtilization(utilRes.data);
        setCostSummary(costRes.data);
      } catch (err) {
        console.error("Failed to load analytics", err);
      }
    })();
  }, []);

  // Transform utilization data for a per-printer-per-month chart
  const utilizationByPrinter = utilization.reduce(
    (acc: Record<string, any[]>, item) => {
      if (!item.period) return acc;
      if (!acc[item.PrinterName]) acc[item.PrinterName] = [];
      acc[item.PrinterName].push(item);
      return acc;
    },
    {},
  );

  // Aggregate utilization for overview bars
  const printerSummary = Object.entries(utilizationByPrinter).map(
    ([name, items]) => ({
      PrinterName: name,
      PrinterType: items[0]?.PrinterType || "",
      totalJobs: items.reduce((s, i) => s + i.jobCount, 0),
      totalHours: items.reduce((s, i) => s + i.totalHours, 0),
    }),
  );

  return (
    <div className="space-y-6 h-full overflow-y-auto">
      <h2 className="text-2xl font-bold text-gray-800 border-b pb-2 flex items-center gap-2">
        <BarChartIcon /> Analytics Dashboard
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Material Usage */}
        <div className="p-6 border rounded-lg bg-white shadow-md">
          <h3 className="font-semibold text-lg text-gray-700 mb-4">
            Material Usage (grams)
          </h3>
          <div style={{ height: 300 }}>
            {mat.length > 0 ? (
              <ResponsiveContainer>
                <BarChart data={mat}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="MaterialName" tick={{ fontSize: 11 }} />
                  <YAxis />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Legend />
                  <Bar
                    dataKey="totalUsage"
                    name="Grams"
                    fill="#991b1b"
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-gray-400">
                No data available
              </div>
            )}
          </div>
        </div>

        {/* Jobs Over Time */}
        <div className="p-6 border rounded-lg bg-white shadow-md">
          <h3 className="font-semibold text-lg text-gray-700 mb-4">
            Jobs Over Time
          </h3>
          <div style={{ height: 300 }}>
            {jobsOverTime.length > 0 ? (
              <ResponsiveContainer>
                <LineChart data={jobsOverTime}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="period" />
                  <YAxis />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="jobCount"
                    name="Jobs"
                    stroke="#991b1b"
                    strokeWidth={2}
                    dot={{ r: 4 }}
                    activeDot={{ r: 6 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-gray-400">
                No data available
              </div>
            )}
          </div>
        </div>

        {/* Printer Utilization */}
        <div className="p-6 border rounded-lg bg-white shadow-md">
          <h3 className="font-semibold text-lg text-gray-700 mb-4">
            Printer Utilization (hours)
          </h3>
          <div style={{ height: 300 }}>
            {printerSummary.length > 0 ? (
              <ResponsiveContainer>
                <BarChart data={printerSummary}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="PrinterName" tick={{ fontSize: 11 }} />
                  <YAxis />
                  <Tooltip
                    contentStyle={tooltipStyle}
                    formatter={(value: number, name: string) => [
                      `${Number(value).toFixed(1)}`,
                      name,
                    ]}
                  />
                  <Legend />
                  <Bar
                    dataKey="totalHours"
                    name="Hours"
                    fill="#1e40af"
                    radius={[4, 4, 0, 0]}
                  />
                  <Bar
                    dataKey="totalJobs"
                    name="Jobs"
                    fill="#166534"
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-gray-400">
                No data available
              </div>
            )}
          </div>
        </div>

        {/* Cost Summary */}
        <div className="p-6 border rounded-lg bg-white shadow-md">
          <h3 className="font-semibold text-lg text-gray-700 mb-4">
            Cost Summary (by month)
          </h3>
          <div style={{ height: 300 }}>
            {costSummary.length > 0 ? (
              <ResponsiveContainer>
                <BarChart data={costSummary}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="period" />
                  <YAxis />
                  <Tooltip
                    contentStyle={tooltipStyle}
                    formatter={(value: number) => [
                      `$${Number(value).toFixed(2)}`,
                    ]}
                  />
                  <Legend />
                  <Bar
                    dataKey="totalEstimated"
                    name="Estimated ($)"
                    fill="#c2410c"
                    radius={[4, 4, 0, 0]}
                  />
                  <Bar
                    dataKey="totalActual"
                    name="Actual ($)"
                    fill="#0891b2"
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-gray-400">
                No data available
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
