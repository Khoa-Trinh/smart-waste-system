"use client";
import { useEffect, useState } from "react";

// Define the shape of our incoming data
interface FloorData {
  floor: number;
  capacity: number;
  timestamp: string;
}

interface LogEntry {
  id: string;
  floor: number;
  capacity: number;
  timestamp: string;
  status: "safe" | "warning" | "critical";
}

export default function Dashboard() {
  // Initialize an array of 10 floors starting at 0%
  const [floors, setFloors] = useState<FloorData[]>(
    Array.from({ length: 10 }, (_, i) => ({
      floor: i + 1,
      capacity: 0,
      timestamp: new Date().toISOString(),
    })),
  );

  // Maintain a live activity feed of the latest events
  const [logs, setLogs] = useState<LogEntry[]>([]);

  // Connect to the Bun SSE Stream
  useEffect(() => {
    const eventSource = new EventSource("http://localhost:3001/stream");

    eventSource.onmessage = (event) => {
      try {
        const newData: FloorData = JSON.parse(event.data);

        // Update only the specific floor that sent new data
        setFloors((prevFloors) =>
          prevFloors.map((f) =>
            f.floor === newData.floor ? { ...f, ...newData } : f,
          ),
        );

        // Add to our activity log (limit to last 8 entries)
        const status =
          newData.capacity >= 80
            ? "critical"
            : newData.capacity >= 50
              ? "warning"
              : "safe";
        const newLog: LogEntry = {
          id: `${newData.floor}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          floor: newData.floor,
          capacity: newData.capacity,
          timestamp: newData.timestamp,
          status,
        };

        setLogs((prevLogs) => [newLog, ...prevLogs.slice(0, 7)]);
      } catch (err) {
        console.error("Error parsing SSE message in Next.js:", err);
      }
    };

    return () => eventSource.close();
  }, []);

  // Compute summary stats dynamically
  const totalCapacity = floors.reduce((acc, f) => acc + f.capacity, 0);
  const avgCapacity = Math.round(totalCapacity / floors.length);
  const criticalCount = floors.filter((f) => f.capacity >= 80).length;
  const warningCount = floors.filter(
    (f) => f.capacity >= 50 && f.capacity < 80,
  ).length;

  // Styling helper for the main dashboard status
  const systemStatus =
    criticalCount > 0
      ? {
          text: "DISPATCH REQUIRED",
          color: "text-rose-500 border-rose-500/30 bg-rose-500/10",
        }
      : warningCount > 0
        ? {
            text: "MONITORING WARNINGS",
            color: "text-amber-500 border-amber-500/30 bg-amber-500/10",
          }
        : {
            text: "SYSTEM OPTIMAL",
            color: "text-emerald-500 border-emerald-500/30 bg-emerald-500/10",
          };

  // Styling helper for individual floor cards
  const getFloorStyles = (capacity: number) => {
    if (capacity >= 80) {
      return {
        card: "bg-rose-950/20 border-rose-500/40 hover:border-rose-500 shadow-[0_0_20px_rgba(244,63,94,0.15)] text-rose-200",
        bar: "bg-rose-500 shadow-[0_0_10px_rgba(244,63,94,0.5)]",
        badge: "bg-rose-500/10 text-rose-400 border-rose-500/30",
        text: "text-rose-400",
        label: "CRITICAL",
      };
    }
    if (capacity >= 50) {
      return {
        card: "bg-amber-950/20 border-amber-500/40 hover:border-amber-500 shadow-[0_0_15px_rgba(245,158,11,0.1)] text-amber-200",
        bar: "bg-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.5)]",
        badge: "bg-amber-500/10 text-amber-400 border-amber-500/30",
        text: "text-amber-400",
        label: "WARNING",
      };
    }
    return {
      card: "bg-emerald-950/10 border-emerald-500/30 hover:border-emerald-500/60 text-emerald-200",
      bar: "bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.4)]",
      badge: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
      text: "text-emerald-400",
      label: "NORMAL",
    };
  };

  return (
    <main className="min-h-screen bg-neutral-950 text-neutral-100 p-6 sm:p-8 font-sans antialiased">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header Panel */}
        <header className="border border-neutral-800 bg-neutral-900/40 backdrop-blur-md rounded-3xl p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 shadow-xl">
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl font-mono">
                LumiKuwu Waste Network
              </h1>
              <span className="hidden sm:inline-block px-2.5 py-0.5 text-xs font-semibold rounded-md bg-neutral-800 border border-neutral-700 text-neutral-400">
                v1.2
              </span>
            </div>
            <p className="text-neutral-400 text-xs sm:text-sm tracking-wide uppercase font-mono">
              Live Telemetry & Bin Capacity Monitor
            </p>
          </div>

          <div
            className={`flex items-center gap-2 text-sm font-semibold border px-4 py-2 rounded-full transition-all duration-500 font-mono ${systemStatus.color}`}
          >
            <span className="relative flex h-3.5 w-3.5">
              <span
                className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${criticalCount > 0 ? "bg-rose-400" : warningCount > 0 ? "bg-amber-400" : "bg-emerald-400"}`}
              ></span>
              <span
                className={`relative inline-flex rounded-full h-3.5 w-3.5 ${criticalCount > 0 ? "bg-rose-500" : warningCount > 0 ? "bg-amber-500" : "bg-emerald-500"}`}
              ></span>
            </span>
            {systemStatus.text}
          </div>
        </header>

        {/* Stats Row */}
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-neutral-900/40 border border-neutral-800 rounded-2xl p-5 flex flex-col justify-between shadow-md">
            <span className="text-xs font-semibold uppercase tracking-widest text-neutral-400 font-mono">
              Avg Network Fill
            </span>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-4xl font-extrabold text-white font-mono">
                {avgCapacity}%
              </span>
              <span
                className={`text-xs font-semibold ${avgCapacity >= 80 ? "text-rose-500" : avgCapacity >= 50 ? "text-amber-500" : "text-emerald-500"}`}
              >
                {avgCapacity >= 80
                  ? "Critical"
                  : avgCapacity >= 50
                    ? "Heavy"
                    : "Light"}
              </span>
            </div>
            <div className="w-full bg-neutral-800 h-1.5 rounded-full mt-4 overflow-hidden">
              <div
                className={`h-full transition-all duration-1000 ${avgCapacity >= 80 ? "bg-rose-500" : avgCapacity >= 50 ? "bg-amber-500" : "bg-emerald-500"}`}
                style={{ width: `${avgCapacity}%` }}
              />
            </div>
          </div>

          <div className="bg-neutral-900/40 border border-neutral-800 rounded-2xl p-5 flex flex-col justify-between shadow-md">
            <span className="text-xs font-semibold uppercase tracking-widest text-neutral-400 font-mono">
              Critical Nodes
            </span>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-4xl font-extrabold text-white font-mono">
                {criticalCount}
              </span>
              <span className="text-xs text-neutral-400">/ 10 Bins</span>
            </div>
            <p className="text-xs text-neutral-500 mt-4 font-mono">
              Requires immediate empty routing
            </p>
          </div>

          <div className="bg-neutral-900/40 border border-neutral-800 rounded-2xl p-5 flex flex-col justify-between shadow-md">
            <span className="text-xs font-semibold uppercase tracking-widest text-neutral-400 font-mono">
              Warning Nodes
            </span>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-4xl font-extrabold text-white font-mono">
                {warningCount}
              </span>
              <span className="text-xs text-neutral-400">/ 10 Bins</span>
            </div>
            <p className="text-xs text-neutral-500 mt-4 font-mono">
              Approaching capacity thresholds
            </p>
          </div>

          <div className="bg-neutral-900/40 border border-neutral-800 rounded-2xl p-5 flex flex-col justify-between shadow-md">
            <span className="text-xs font-semibold uppercase tracking-widest text-neutral-400 font-mono">
              Active Terminals
            </span>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-4xl font-extrabold text-white font-mono">
                10
              </span>
              <span className="text-xs text-emerald-500 font-semibold font-mono">
                Online
              </span>
            </div>
            <p className="text-xs text-neutral-500 mt-4 font-mono">
              Listening on building/+/capacity
            </p>
          </div>
        </section>

        {/* Main Workspace Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
          {/* The 10-Floor Grid (Occupies 3 columns) */}
          <div className="lg:col-span-3 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-4">
            {floors.map((floor) => {
              const styles = getFloorStyles(floor.capacity);
              return (
                <div
                  key={floor.floor}
                  className={`relative border rounded-2xl p-5 transition-all duration-700 flex flex-col justify-between h-56 group overflow-hidden ${styles.card}`}
                >
                  {/* Subtle Background Glow on Hover */}
                  <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

                  {/* Card Header */}
                  <div className="flex items-center justify-between z-10">
                    <span className="text-xs font-bold font-mono tracking-widest text-neutral-300">
                      FLOOR {floor.floor < 10 ? `0${floor.floor}` : floor.floor}
                    </span>
                    <span
                      className={`text-[10px] font-mono px-2 py-0.5 rounded-full border ${styles.badge}`}
                    >
                      {styles.label}
                    </span>
                  </div>

                  {/* Bin fill status simulator visual */}
                  <div className="my-3 flex items-center justify-center relative h-16 z-10">
                    <span className="text-4xl font-black font-mono tracking-tight text-white select-none">
                      {floor.capacity}%
                    </span>
                  </div>

                  {/* Dynamic Progress Bar & Time */}
                  <div className="space-y-3 z-10">
                    <div className="w-full bg-neutral-900/50 rounded-full h-2 border border-neutral-800/30 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-1000 ${styles.bar}`}
                        style={{ width: `${floor.capacity}%` }}
                      />
                    </div>

                    <div className="flex justify-between items-center text-[10px] text-neutral-500 font-mono">
                      <span>TELEMETRY</span>
                      <span>
                        {new Date(floor.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Activity Feed Sidebar (Occupies 1 column) */}
          <div className="bg-neutral-900/40 border border-neutral-800 rounded-3xl p-5 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
              <h2 className="text-sm font-bold uppercase tracking-wider text-white font-mono">
                Activity Log
              </h2>
              <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
            </div>

            <div className="space-y-3 min-h-[300px] max-h-[464px] overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-neutral-800">
              {logs.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-48 text-center text-neutral-600 font-mono text-xs">
                  <span className="animate-bounce mb-2">📡</span>
                  Waiting for stream telemetry...
                </div>
              ) : (
                logs.map((log) => (
                  <div
                    key={log.id}
                    className="p-3 bg-neutral-900/80 border border-neutral-800/60 rounded-xl flex items-start gap-3 text-xs font-mono transition-all duration-300 animate-fadeIn"
                  >
                    <span
                      className={`mt-1 flex-shrink-0 h-2.5 w-2.5 rounded-full ${
                        log.status === "critical"
                          ? "bg-rose-500"
                          : log.status === "warning"
                            ? "bg-amber-500"
                            : "bg-emerald-500"
                      }`}
                    />
                    <div className="space-y-1 flex-1 min-w-0">
                      <div className="flex justify-between text-neutral-400">
                        <span className="font-semibold text-white">
                          Floor {log.floor < 10 ? `0${log.floor}` : log.floor}
                        </span>
                        <span className="text-[10px] opacity-75">
                          {new Date(log.timestamp).toLocaleTimeString()}
                        </span>
                      </div>
                      <p className="text-[11px] text-neutral-500 truncate">
                        Capacity changed to{" "}
                        <span className="font-bold text-neutral-300">
                          {log.capacity}%
                        </span>
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
