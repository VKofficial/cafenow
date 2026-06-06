import React from "react";
import {
  Sun,
  Moon,
  Monitor,
  Palette,
  Bell,
  Shield,
  Keyboard,
  Database,
  Clock,
  Target,
  Disc,
  Gamepad2,
  Gamepad,
  Save,
  AlertCircle,
  CheckCircle2,
  Terminal,
  Server,
  LogOut,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { supabaseService } from "../services/supabaseService";
import { HappyHourSettings } from "../types";

interface SettingsViewProps {
  theme: "light" | "dark";
  onThemeChange: (theme: "light" | "dark") => void;
  hhSettings: HappyHourSettings | null;
  onUpdateHappyHour: (updates: Partial<HappyHourSettings>) => Promise<void>;
  accentColor: string;
  onAccentColorChange: (color: string) => void;
  onLogout: () => void;
}

export default function SettingsView({
  theme,
  onThemeChange,
  hhSettings,
  onUpdateHappyHour,
  accentColor,
  onAccentColorChange,
  onLogout,
}: SettingsViewProps) {
  const [isLoading, setIsLoading] = React.useState(false);
  const [diagResults, setDiagResults] = React.useState<any | null>(null);
  const [diagLoading, setDiagLoading] = React.useState<boolean>(false);
  const [showRawDiag, setShowRawDiag] = React.useState<boolean>(false);
  const [showConfirmLogout, setShowConfirmLogout] =
    React.useState<boolean>(false);

  const handleRunDiagnostics = async () => {
    setDiagLoading(true);
    try {
      const res = await supabaseService.runTenantDiagnostics();
      setDiagResults(res);
    } catch (e: any) {
      setDiagResults({
        success: false,
        status: "ERROR",
        message: e.message || "Unknown diagnostics execution error.",
      });
    } finally {
      setDiagLoading(false);
    }
  };

  const handleToggleHH = async () => {
    if (!hhSettings) return;
    const newEnabled = !hhSettings.isEnabled;
    await onUpdateHappyHour({ isEnabled: newEnabled });
  };

  const handleRateChange = async (
    key: keyof HappyHourSettings,
    value: string,
  ) => {
    if (!hhSettings) return;
    const numValue = parseFloat(value) || 0;
    await onUpdateHappyHour({ [key]: numValue });
  };

  return (
    <div className="px-4 lg:px-10 max-w-4xl mx-auto">
      <div className="mb-12">
        <h2 className="text-3xl font-bold text-on-surface tracking-tight">
          Settings
        </h2>
        <p className="text-on-surface-variant font-mono text-xs uppercase tracking-widest mt-2">
          Configure your club management system
        </p>
      </div>

      <div className="space-y-8">
        {/* Appearance Section */}
        <section className="glass rounded-3xl border border-outline/20 overflow-hidden">
          <div className="p-6 border-b border-outline/20 bg-on-surface/5 flex items-center gap-3">
            <Palette className="text-neon-blue" size={20} />
            <h3 className="font-bold text-on-surface uppercase tracking-wider text-sm">
              Appearance
            </h3>
          </div>

          <div className="p-8 space-y-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div>
                <p className="font-bold text-on-surface text-base">
                  Interface Theme
                </p>
                <p className="text-sm text-on-surface-variant mt-1">
                  Select your preferred system aesthetic
                </p>
              </div>

              <div className="flex gap-2 p-1.5 bg-on-surface/5 rounded-2xl border border-outline/20">
                <button
                  onClick={() => onThemeChange("light")}
                  className={`flex items-center gap-2 px-6 py-2.5 rounded-xl transition-all font-mono text-[10px] font-bold uppercase tracking-wider ${
                    theme === "light"
                      ? "bg-neon-blue text-black shadow-lg shadow-neon-blue/20"
                      : "text-on-surface-variant hover:text-on-surface hover:bg-on-surface/5"
                  }`}
                >
                  <Sun size={14} />
                  Light
                </button>
                <button
                  onClick={() => onThemeChange("dark")}
                  className={`flex items-center gap-2 px-6 py-2.5 rounded-xl transition-all font-mono text-[10px] font-bold uppercase tracking-wider ${
                    theme === "dark"
                      ? "bg-neon-blue text-black shadow-lg shadow-neon-blue/20"
                      : "text-on-surface-variant hover:text-on-surface hover:bg-on-surface/5"
                  }`}
                >
                  <Moon size={14} />
                  Dark
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 rounded-2xl bg-on-surface/5 border border-outline/20 opacity-50 cursor-not-allowed">
                <div className="flex items-center gap-3 mb-2">
                  <Monitor className="text-on-surface-variant" size={16} />
                  <span className="text-xs font-bold text-on-surface uppercase tracking-wider">
                    System Default
                  </span>
                </div>
                <p className="text-[10px] font-mono text-on-surface-variant lowercase">
                  Automatically match your operating system theme.
                </p>
              </div>
              <div className="p-5 rounded-2xl bg-on-surface/5 border border-outline/20">
                <div className="flex items-center gap-3 mb-4">
                  <Palette className="text-neon-blue" size={16} />
                  <span className="text-xs font-bold text-on-surface uppercase tracking-wider">
                    Accent Color Tag
                  </span>
                </div>
                <div className="flex flex-wrap gap-2.5">
                  {[
                    {
                      value: "#0eaa60",
                      label: "Felt Green",
                      glowColor: "#0eaa60",
                    },
                    {
                      value: "#c59b27",
                      label: "Cue Gold",
                      glowColor: "#c59b27",
                    },
                    {
                      value: "#00dbe9",
                      label: "Chalk Cyan",
                      glowColor: "#00dbe9",
                    },
                    {
                      value: "#1e60ff",
                      label: "Chalk Blue",
                      glowColor: "#1e60ff",
                    },
                    {
                      value: "#ff2a5f",
                      label: "Pocket Red",
                      glowColor: "#ff2a5f",
                    },
                    {
                      value: "#bc00dd",
                      label: "Club Purple",
                      glowColor: "#bc00dd",
                    },
                  ].map((c) => (
                    <button
                      key={c.value}
                      onClick={() => onAccentColorChange(c.value)}
                      className="flex items-center gap-2 px-3 py-2 rounded-xl border transition-all text-[10px] font-mono font-bold uppercase cursor-pointer"
                      style={{
                        borderColor:
                          accentColor === c.value
                            ? c.value
                            : "var(--outline-variant, rgba(124, 148, 134, 0.2))",
                        backgroundColor:
                          accentColor === c.value
                            ? `${c.value}15`
                            : "transparent",
                        boxShadow:
                          accentColor === c.value
                            ? `0 0 10px ${c.glowColor}25`
                            : "none",
                        color:
                          accentColor === c.value
                            ? "var(--on-surface)"
                            : "var(--on-surface-variant)",
                      }}
                    >
                      <span
                        className="w-3 h-3 rounded-full border border-black/20 shrink-0"
                        style={{ backgroundColor: c.value }}
                      />
                      <span>{c.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Happy Hour Settings Section */}
        <section className="glass rounded-3xl border border-outline/20 overflow-hidden">
          <div className="p-6 border-b border-outline/20 bg-on-surface/5 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Clock className="text-neon-blue" size={20} />
              <h3 className="font-bold text-on-surface uppercase tracking-wider text-sm">
                Happy Hour Settings
              </h3>
            </div>
            {hhSettings && (
              <div
                onClick={handleToggleHH}
                className={`w-12 h-6 rounded-full p-1 cursor-pointer transition-all duration-300 ${hhSettings.isEnabled ? "bg-cyber-lime" : "bg-on-surface/10"}`}
              >
                <div
                  className={`w-4 h-4 bg-white rounded-full shadow-sm transform transition-transform duration-300 ${hhSettings.isEnabled ? "translate-x-6" : "translate-x-0"}`}
                />
              </div>
            )}
          </div>

          <div className="p-8 space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 bg-on-surface/5 border border-outline/10 rounded-2xl">
              <div>
                <p className="font-bold text-on-surface text-base">
                  Enable Happy Hour
                </p>
                <p className="text-xs text-on-surface-variant mt-1">
                  When active, custom rates listed below will override normal
                  table rates on all snooker tables, pool tables, and console rigs.
                </p>
              </div>
              <div className="flex items-center gap-4">
                {hhSettings?.isEnabled && (
                  <div className="flex flex-col items-end gap-1">
                    <div className="flex items-center gap-2 px-3 py-1 bg-cyber-lime/10 border border-cyber-lime/20 rounded-full">
                      <div className="w-2 h-2 rounded-full bg-cyber-lime animate-pulse" />
                      <span className="text-[10px] font-bold text-cyber-lime uppercase tracking-widest">
                        Currently Active
                      </span>
                    </div>
                    {hhSettings.lastEnabledAt && (
                      <p className="text-[9px] font-mono text-on-surface-variant uppercase tracking-wider">
                        Since:{" "}
                        {new Date(hhSettings.lastEnabledAt).toLocaleTimeString(
                          [],
                          { hour: "2-digit", minute: "2-digit" },
                        )}
                      </p>
                    )}
                  </div>
                )}
                {hhSettings && (
                  <div
                    onClick={handleToggleHH}
                    className={`w-14 h-7 rounded-full p-1 cursor-pointer transition-all duration-300 ${hhSettings.isEnabled ? "bg-cyber-lime" : "bg-on-surface/20"}`}
                  >
                    <div
                      className={`w-5 h-5 bg-black rounded-full shadow-md transform transition-transform duration-300 ${hhSettings.isEnabled ? "translate-x-7" : "translate-x-0"}`}
                    />
                  </div>
                )}
              </div>
            </div>
 
            {hhSettings &&
              hhSettings.cumulativeDurationSeconds &&
              hhSettings.cumulativeDurationSeconds > 0 && (
                <div className="p-4 bg-on-surface/5 rounded-2xl border border-outline/10 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-neon-blue/10 rounded-lg">
                      <Clock size={16} className="text-neon-blue" />
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">
                        Total Happy Hour Time
                      </p>
                      <p className="text-sm font-mono font-bold text-on-surface">
                        {Math.floor(
                          hhSettings.cumulativeDurationSeconds / 3600,
                        )}
                        h{" "}
                        {Math.floor(
                          (hhSettings.cumulativeDurationSeconds % 3600) / 60,
                        )}
                        m {hhSettings.cumulativeDurationSeconds % 60}s
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={async () => {
                      await onUpdateHappyHour({ cumulativeDurationSeconds: 0 });
                    }}
                    className="px-3 py-1 rounded-lg text-[10px] font-bold font-mono uppercase tracking-wider text-neon-pink hover:bg-neon-pink/10 transition-colors border border-neon-pink/20"
                  >
                    Reset History
                  </button>
                </div>
              )}
 
            {hhSettings && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pt-4">
                {[
                  { label: "Snooker", key: "snookerRate", icon: Target },
                  { label: "Pool", key: "poolRate", icon: Disc },
                  { label: "PS5", key: "ps5Rate", icon: Gamepad2 },
                  {
                    label: "Mini Snooker",
                    key: "miniSnookerRate",
                    icon: Target,
                  },
                  { label: "Other Games", key: "otherRate", icon: Gamepad },
                ].map((item) => {
                  const rateValue = isNaN(hhSettings[item.key as keyof HappyHourSettings] as number)
                    ? 0
                    : (hhSettings[item.key as keyof HappyHourSettings] as number ?? 0);

                  return (
                    <div 
                      key={item.key} 
                      className="space-y-4 p-5 rounded-2xl border border-outline/10 bg-on-surface/[0.02] hover:bg-on-surface/[0.04] hover:border-outline/20 transition-all flex flex-col justify-between"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <item.icon
                            size={16}
                            className="text-neon-blue shrink-0"
                          />
                          <label className="text-xs font-bold text-on-surface uppercase tracking-wider font-sans">
                            {item.label}
                          </label>
                        </div>
                        <span className="text-xs font-mono font-bold text-cyber-lime shrink-0">
                          ₹{rateValue}/hr
                        </span>
                      </div>

                      {/* Precise Numeric Input */}
                      <div className="relative">
                        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant font-mono text-xs">
                          ₹
                        </div>
                        <input
                          type="number"
                          value={rateValue === 0 ? "" : rateValue}
                          onChange={(e) =>
                            handleRateChange(
                              item.key as keyof HappyHourSettings,
                              e.target.value,
                            )
                          }
                          placeholder="0.00"
                          className="w-full bg-on-surface/5 border border-outline/15 rounded-xl px-8 py-2.5 outline-none focus:border-neon-blue/50 focus:bg-on-surface/10 transition-all font-mono text-sm"
                        />
                        <div className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-mono text-on-surface-variant uppercase">
                          /hr
                        </div>
                      </div>

                      {/* Interactive Rate Bar Slider */}
                      <div className="space-y-1.5 pt-1">
                        <input
                          type="range"
                          min="0"
                          max="400"
                          step="5"
                          value={rateValue}
                          onChange={(e) =>
                            handleRateChange(
                              item.key as keyof HappyHourSettings,
                              e.target.value,
                            )
                          }
                          className="w-full h-1.5 bg-on-surface/15 rounded-lg appearance-none cursor-pointer accent-cyber-lime transition-all"
                        />
                        <div className="flex justify-between text-[9px] font-mono text-on-surface-variant/40">
                          <span>₹0</span>
                          <span>₹200</span>
                          <span>₹400</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {!hhSettings && !isLoading && (
              <div className="p-8 text-center bg-on-surface/5 rounded-2xl border border-dashed border-outline/20">
                <p className="text-xs text-on-surface-variant italic">
                  Failed to initialize session settings. Check connection.
                </p>
              </div>
            )}
          </div>
        </section>

        {/* Database Tenant Isolation Diagnostics Section */}
        <section className="glass rounded-3xl border border-outline/20 overflow-hidden">
          <div className="p-6 border-b border-outline/20 bg-on-surface/5 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Database className="text-neon-pink" size={20} />
              <h3 className="font-bold text-on-surface uppercase tracking-wider text-sm">
                Tenant Isolation Diagnostics
              </h3>
            </div>
            <button
              onClick={handleRunDiagnostics}
              disabled={diagLoading}
              className={`px-5 py-2.5 rounded-xl font-mono text-[10px] font-bold uppercase tracking-wider transition-all ${
                diagLoading
                  ? "bg-on-surface/10 text-on-surface-variant cursor-not-allowed animate-pulse"
                  : "bg-neon-pink text-black hover:bg-neon-pink/80 shadow-lg shadow-neon-pink/20"
              }`}
            >
              {diagLoading ? "Auditing Schema & Rows..." : "Run Security Audit"}
            </button>
          </div>

          <div className="p-8 space-y-6">
            <div>
              <p className="font-bold text-on-surface text-base">
                Check Database Cohesion & Isolation
              </p>
              <p className="text-sm text-on-surface-variant mt-1">
                Audits if database queries, columns, and records are properly
                isolated by your active admin account (
                <span className="font-mono text-neon-blue">
                  {supabaseService.getActiveAdminUsername() || "None"}
                </span>
                ).
              </p>
            </div>

            {diagResults ? (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-4"
              >
                {/* Status Callout Banner */}
                <div
                  className={`p-5 rounded-2xl border flex items-start gap-4 ${
                    diagResults.overallIsolationGrade === "PERFECT_ISOLATION"
                      ? "bg-cyber-lime/5 border-cyber-lime/20 text-cyber-lime-variant"
                      : diagResults.status === "OFFLINE_FALLBACK"
                        ? "bg-neon-blue/5 border-neon-blue/20 text-on-surface-variant"
                        : "bg-neon-pink/5 border-neon-pink/20 text-neon-pink-variant"
                  }`}
                >
                  {diagResults.overallIsolationGrade === "PERFECT_ISOLATION" ? (
                    <CheckCircle2
                      className="text-cyber-lime mt-0.5 shrink-0"
                      size={20}
                    />
                  ) : (
                    <AlertCircle
                      className={
                        diagResults.status === "OFFLINE_FALLBACK"
                          ? "text-neon-blue mt-0.5 shrink-0"
                          : "text-neon-pink mt-0.5 shrink-0"
                      }
                      size={20}
                    />
                  )}
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold uppercase font-mono text-xs tracking-wider">
                        Audit Grade:{" "}
                        {diagResults.overallIsolationGrade ||
                          diagResults.status ||
                          "REPORT GENERATED"}
                      </span>
                    </div>
                    <p className="text-xs mt-1.5 leading-relaxed text-on-surface">
                      {diagResults.overallIsolationSummary ||
                        diagResults.message}
                    </p>
                  </div>
                </div>

                {/* Audit Facts Grid */}
                {diagResults.success && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Column detection metrics */}
                    <div className="p-5 rounded-2xl bg-on-surface/5 border border-outline/10 space-y-3">
                      <div className="flex items-center gap-2">
                        <Server className="text-neon-blue shrink-0" size={14} />
                        <span className="text-[10px] font-bold text-on-surface uppercase tracking-wider">
                          Schema Column Alignment
                        </span>
                      </div>
                      <div className="space-y-2 mt-2">
                        {[
                          {
                            table: "tables",
                            status:
                              diagResults.schemaVerification
                                ?.tablesHasAdminUsernameColumn,
                          },
                          {
                            table: "members",
                            status:
                              diagResults.schemaVerification
                                ?.membersHasAdminUsernameColumn,
                          },
                          {
                            table: "bookings",
                            status:
                              diagResults.schemaVerification
                                ?.bookingsHasAdminUsernameColumn,
                          },
                          {
                            table: "billing_history",
                            status:
                              diagResults.schemaVerification
                                ?.billingHistoryHasAdminUsernameColumn,
                          },
                        ].map((sch) => (
                          <div
                            key={sch.table}
                            className="flex items-center justify-between text-xs"
                          >
                            <span className="font-mono text-on-surface-variant">
                              `{sch.table}`:
                            </span>
                            <span
                              className={`px-2 py-0.5 rounded-md font-mono text-[9px] font-bold uppercase ${
                                sch.status
                                  ? "bg-cyber-lime/10 text-cyber-lime"
                                  : "bg-neon-pink/10 text-neon-pink"
                              }`}
                            >
                              {sch.status
                                ? "admin_username present"
                                : "column absent"}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Table-by-Table isolation breakdown */}
                    <div className="p-5 rounded-2xl bg-on-surface/5 border border-outline/10 space-y-3">
                      <div className="flex items-center gap-2">
                        <Shield className="text-neon-pink shrink-0" size={14} />
                        <span className="text-[10px] font-bold text-on-surface uppercase tracking-wider">
                          Active Tenant Row Count
                        </span>
                      </div>
                      <div className="space-y-2 mt-2">
                        {diagResults.rowIsolationSummary?.tables ? (
                          <>
                            <div className="flex items-center justify-between text-xs">
                              <span className="text-on-surface-variant font-mono">
                                My isolated tables:
                              </span>
                              <span className="font-bold font-mono text-neon-blue">
                                {
                                  diagResults.rowIsolationSummary.tables
                                    .rowsOwnedByActiveAdmin
                                }{" "}
                                /{" "}
                                {
                                  diagResults.rowIsolationSummary.tables
                                    .totalRowsInDatabase
                                }
                              </span>
                            </div>
                            <div className="flex items-center justify-between text-xs">
                              <span className="text-on-surface-variant font-mono">
                                Other admins' tables:
                              </span>
                              <span className="font-mono text-on-surface-variant">
                                {
                                  diagResults.rowIsolationSummary.tables
                                    .rowsOwnedByOtherAdmins
                                }
                              </span>
                            </div>
                          </>
                        ) : (
                          <div className="text-xs text-on-surface-variant italic">
                            No table Isolation metadata available.
                          </div>
                        )}
                        {diagResults.rowIsolationSummary?.members && (
                          <div className="flex items-center justify-between text-xs pt-1 border-t border-outline/5">
                            <span className="text-on-surface-variant font-mono">
                              My isolated members:
                            </span>
                            <span className="font-bold font-mono text-cyber-lime">
                              {
                                diagResults.rowIsolationSummary.members
                                  .rowsOwnedByActiveAdmin
                              }{" "}
                              /{" "}
                              {
                                diagResults.rowIsolationSummary.members
                                  .totalRowsInDatabase
                              }
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* Sample row association check */}
                {diagResults.success && diagResults.sampleRowCheck && (
                  <div className="p-4 bg-on-surface/5 border border-outline/10 rounded-2xl flex items-center justify-between gap-4">
                    <div className="flex items-start gap-3">
                      <Terminal
                        size={16}
                        className="text-neon-blue mt-0.5 shrink-0"
                      />
                      <div>
                        <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">
                          Active Table Association Check
                        </p>
                        <p className="text-xs font-mono text-on-surface mt-1">
                          Ref Table Row ID:{" "}
                          <span className="text-neon-pink text-[11px]">
                            {diagResults.sampleRowCheck.sampleRowId}
                          </span>
                        </p>
                        <p className="text-[11px] text-on-surface-variant mt-0.5">
                          Assigned Owner:{" "}
                          <span className="font-mono text-xs font-bold text-neon-blue">
                            {diagResults.sampleRowCheck.adminUsernameInRow ||
                              "unassigned"}
                          </span>
                        </p>
                      </div>
                    </div>
                    <div
                      className={`px-2.5 py-1 bg-cyber-lime/10 border border-cyber-lime/20 rounded-xl shrink-0 text-center ${
                        diagResults.sampleRowCheck.associatedWithCurrentAdmin
                          ? "text-cyber-lime border-cyber-lime/20"
                          : "text-neon-pink border-neon-pink/20 bg-neon-pink/10"
                      }`}
                    >
                      <span className="text-[9px] font-mono font-bold uppercase tracking-widest">
                        {diagResults.sampleRowCheck.associatedWithCurrentAdmin
                          ? "Secure & Associated"
                          : "Shared/Misaligned"}
                      </span>
                    </div>
                  </div>
                )}

                {/* Expandable detailed JSON */}
                <div className="border border-outline/10 rounded-2xl overflow-hidden bg-black/40">
                  <button
                    type="button"
                    onClick={() => setShowRawDiag(!showRawDiag)}
                    className="w-full flex items-center justify-between px-5 py-3 hover:bg-on-surface/5 transition-colors text-left text-[10px] font-bold font-mono uppercase tracking-widest text-on-surface-variant"
                  >
                    <span>
                      {showRawDiag
                        ? "Hide Raw Audit Report"
                        : "See Raw Audit JSON"}
                    </span>
                    <span className="text-neon-blue">
                      {showRawDiag ? "▲" : "▼"}
                    </span>
                  </button>
                  {showRawDiag && (
                    <div className="p-5 border-t border-outline/5 overflow-auto max-h-64 font-mono text-[10px] leading-relaxed text-cyber-lime bg-black/60 scrollbar-thin">
                      <pre>{JSON.stringify(diagResults, null, 2)}</pre>
                    </div>
                  )}
                </div>
              </motion.div>
            ) : (
              <div className="py-6 flex flex-col items-center justify-center text-center bg-on-surface/5 rounded-2xl border border-dashed border-outline/10">
                <Database
                  className="text-on-surface-variant animate-pulse mb-2"
                  size={24}
                />
                <p className="text-[11px] text-on-surface-variant font-bold max-w-sm">
                  No Audit has been executed yet.
                </p>
                <p className="text-[10px] text-on-surface-variant/70 mt-1 max-w-xs">
                  Click the security audit button above to execute a real-time
                  tenant queries isolation check.
                </p>
              </div>
            )}
          </div>
        </section>

        {/* Account & Session Section */}
        <section className="glass rounded-3xl border border-outline/20 overflow-hidden">
          <div className="p-6 border-b border-outline/20 bg-on-surface/5 flex items-center gap-3">
            <Shield className="text-neon-pink" size={20} />
            <h3 className="font-bold text-on-surface uppercase tracking-wider text-sm">
              Account & Session
            </h3>
          </div>

          <div className="p-8 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <p className="font-bold text-on-surface text-base">
                Sign Out of Session
              </p>
              <p className="text-sm text-on-surface-variant mt-1">
                Logs out of the active admin node and clears local operational
                memory.
              </p>
            </div>

            <button
              onClick={() => setShowConfirmLogout(true)}
              className="flex items-center justify-center gap-2 px-6 py-3 rounded-xl border border-red-500/30 bg-red-500/5 hover:bg-red-500/15 text-red-400 font-mono text-xs uppercase font-bold tracking-wider transition-all duration-300 shadow-[0_0_15px_rgba(239,68,68,0.15)]"
            >
              <LogOut size={16} />
              Log Out
            </button>
          </div>
        </section>

        {/* Other Placeholder Sections */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <section className="glass rounded-3xl border border-outline/20 opacity-40">
            <div className="p-6 border-b border-outline/20 bg-on-surface/5 flex items-center gap-3">
              <Bell size={18} />
              <h3 className="font-bold text-on-surface uppercase tracking-wider text-xs">
                Notifications
              </h3>
            </div>
            <div className="p-8 h-32 flex items-center justify-center italic text-xs text-on-surface-variant">
              Notification settings coming soon...
            </div>
          </section>

          <section className="glass rounded-3xl border border-outline/20 opacity-40">
            <div className="p-6 border-b border-outline/20 bg-on-surface/5 flex items-center gap-3">
              <Shield size={18} />
              <h3 className="font-bold text-on-surface uppercase tracking-wider text-xs">
                Security
              </h3>
            </div>
            <div className="p-8 h-32 flex items-center justify-center italic text-xs text-on-surface-variant">
              Privacy and security controls coming soon...
            </div>
          </section>

          <section className="glass rounded-3xl border border-outline/20 opacity-40">
            <div className="p-6 border-b border-outline/20 bg-on-surface/5 flex items-center gap-3">
              <Database size={18} />
              <h3 className="font-bold text-on-surface uppercase tracking-wider text-xs">
                Data Management
              </h3>
            </div>
            <div className="p-8 h-32 flex items-center justify-center italic text-xs text-on-surface-variant">
              Backup and export tools coming soon...
            </div>
          </section>

          <section className="glass rounded-3xl border border-outline/20 opacity-40">
            <div className="p-6 border-b border-outline/20 bg-on-surface/5 flex items-center gap-3">
              <Keyboard size={18} />
              <h3 className="font-bold text-on-surface uppercase tracking-wider text-xs">
                Hotkeys
              </h3>
            </div>
            <div className="p-8 h-32 flex items-center justify-center italic text-xs text-on-surface-variant">
              Keyboard shortcuts coming soon...
            </div>
          </section>
        </div>
      </div>

      {/* Custom Logout Confirmation Modal */}
      <AnimatePresence>
        {showConfirmLogout && (
          <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowConfirmLogout(false)}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            />

            {/* Dialog Content */}
            <motion.div
              initial={{ scale: 0.95, y: 15, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.95, y: 15, opacity: 0 }}
              transition={{ type: "spring", duration: 0.4 }}
              className="relative w-full max-w-md bg-surface border border-outline/30 rounded-3xl p-8 shadow-2xl overflow-hidden"
            >
              {/* Corner Ambient Glow */}
              <div className="absolute top-0 right-0 w-24 h-24 bg-red-500/10 blur-[40px] pointer-events-none" />

              <div className="flex flex-col items-center text-center space-y-6">
                <div className="p-4 bg-red-500/10 rounded-full border border-red-500/25">
                  <LogOut size={28} className="text-red-400 animate-pulse" />
                </div>

                <div>
                  <h4 className="text-xl font-bold text-on-surface">
                    Confirm Signature Logout
                  </h4>
                  <p className="text-xs text-on-surface-variant uppercase tracking-wider font-mono mt-1">
                    Operator Node Session Close
                  </p>
                </div>

                <p className="text-sm text-on-surface-variant leading-relaxed px-2">
                  Are you absolutely sure you want to log out of the command
                  node? You will need to enter your secure Operator ID and
                  credentials to access this station again.
                </p>

                <div className="flex gap-4 w-full">
                  <button
                    onClick={() => setShowConfirmLogout(false)}
                    className="flex-1 px-5 py-3 rounded-xl border border-outline/25 bg-on-surface/5 hover:bg-on-surface/10 text-on-surface font-mono text-xs uppercase font-bold tracking-wider transition-all duration-200"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => {
                      setShowConfirmLogout(false);
                      onLogout();
                    }}
                    className="flex-1 px-5 py-3 rounded-xl bg-red-500 text-black hover:bg-red-400 font-mono text-xs uppercase font-bold tracking-wider transition-all duration-200 shadow-lg shadow-red-500/20"
                  >
                    Log Out
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
