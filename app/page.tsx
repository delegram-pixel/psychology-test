"use client"

import React, { useState, useEffect, useCallback } from "react"
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  ResponsiveContainer,
} from "recharts"
import {
  LayoutDashboard,
  User,
  Brain,
  FileText,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Minus,
  Loader2,
  CheckCircle,
  Bell,
  Users,
  Activity,
  Shield,
  Upload,
} from "lucide-react"
import { FileUpload } from "@/components/file-upload"
import { ResultsDisplay } from "@/components/results-display"
import { FormatDetectionDisplay } from "@/components/format-detection-display"
import { scoringEngine } from "@/lib/scoring-engine"
import { formatDetector } from "@/lib/format-detector"
import { useSession } from "next-auth/react"
import type { ProcessedResult, UploadSession, FormatDetectionResult, FileUploadData, Scale } from "@/lib/types"

// ─── DATA ───────────────────────────────────────────────────────────────────

const PARTICIPANTS = [
  {
    id: "P-001",
    scale: "PHQ-9",
    lastScore: 22,
    severity: "Critical",
    trend: "worsening",
    sessions: [9, 11, 14, 16, 19, 22],
    flag: "Suicidal ideation endorsed",
    riskColor: "red",
  },
  {
    id: "P-002",
    scale: "BDI-II",
    lastScore: 17,
    severity: "Moderate",
    trend: "stable",
    sessions: [14, 16, 15, 17],
    flag: null,
    riskColor: "amber",
  },
  {
    id: "P-003",
    scale: "GAD-7",
    lastScore: 19,
    severity: "High",
    trend: "worsening",
    sessions: [7, 9, 12, 15, 19],
    flag: null,
    riskColor: "orange",
  },
  {
    id: "P-004",
    scale: "PHQ-9",
    lastScore: 6,
    severity: "Low",
    trend: "improving",
    sessions: [18, 15, 12, 9, 6],
    flag: null,
    riskColor: "green",
  },
  {
    id: "P-005",
    scale: "BDI-II",
    lastScore: 31,
    severity: "Critical",
    trend: "worsening",
    sessions: [18, 22, 27, 31],
    flag: null,
    riskColor: "red",
  },
  {
    id: "P-006",
    scale: "GAD-7",
    lastScore: 8,
    severity: "Moderate",
    trend: "stable",
    sessions: [10, 9, 8, 8],
    flag: null,
    riskColor: "amber",
  },
]

const ALERTS = [
  {
    id: "A-001",
    participantId: "P-001",
    type: "Critical Risk",
    scale: "PHQ-9",
    score: 22,
    trigger: "Rule-based + Suicidal ideation item endorsed",
    severity: "critical",
    status: "new",
  },
  {
    id: "A-002",
    participantId: "P-005",
    type: "Critical Risk",
    scale: "BDI-II",
    score: 31,
    trigger: "Rule-based",
    severity: "critical",
    status: "new",
  },
  {
    id: "A-003",
    participantId: "P-003",
    type: "High Risk",
    scale: "GAD-7",
    score: 19,
    trigger: "Rule-based",
    severity: "high",
    status: "acknowledged",
  },
  {
    id: "A-004",
    participantId: "P-002",
    type: "Moderate Elevation",
    scale: "BDI-II",
    score: 17,
    trigger: "Rule-based",
    severity: "moderate",
    status: "new",
  },
]

const P001_ITEMS = [
  { number: 1, text: "Little interest or pleasure in doing things", responseLabel: "More than half the days", value: 2 },
  { number: 2, text: "Feeling down, depressed, or hopeless", responseLabel: "Nearly every day", value: 3 },
  { number: 3, text: "Trouble falling or staying asleep", responseLabel: "More than half the days", value: 2 },
  { number: 4, text: "Feeling tired or having little energy", responseLabel: "Nearly every day", value: 3 },
  { number: 5, text: "Poor appetite or overeating", responseLabel: "Several days", value: 1 },
  { number: 6, text: "Feeling bad about yourself", responseLabel: "More than half the days", value: 2 },
  { number: 7, text: "Trouble concentrating on things", responseLabel: "More than half the days", value: 2 },
  { number: 8, text: "Moving or speaking slowly or being fidgety", responseLabel: "Several days", value: 1 },
  { number: 9, text: "Thoughts of being better off dead or hurting yourself", responseLabel: "Several days", value: 1 },
]

// ─── HELPERS ─────────────────────────────────────────────────────────────────

function getThreshold(scale: string) {
  if (scale === "PHQ-9") return 20
  if (scale === "BDI-II") return 29
  if (scale === "GAD-7") return 15
  return 20
}

function getSeverityLabel(scale: string, score: number): string {
  if (scale === "PHQ-9") {
    if (score <= 4) return "None"
    if (score <= 9) return "Mild"
    if (score <= 14) return "Moderate"
    if (score <= 19) return "Moderately Severe"
    return "Severe"
  }
  if (scale === "BDI-II") {
    if (score <= 13) return "Minimal"
    if (score <= 19) return "Mild"
    if (score <= 28) return "Moderate"
    return "Severe"
  }
  if (scale === "GAD-7") {
    if (score <= 4) return "Minimal"
    if (score <= 9) return "Mild"
    if (score <= 14) return "Moderate"
    return "Severe"
  }
  return "Unknown"
}

const RISK_TEXT: Record<string, string> = {
  red: "#EF4444",
  orange: "#F97316",
  amber: "#F59E0B",
  green: "#22C55E",
}
const RISK_BG: Record<string, string> = {
  red: "#FEF2F2",
  orange: "#FFF7ED",
  amber: "#FFFBEB",
  green: "#F0FDF4",
}
const RISK_BORDER: Record<string, string> = {
  red: "#FCA5A5",
  orange: "#FDBA74",
  amber: "#FCD34D",
  green: "#86EFAC",
}
const SEVERITY_COLOR: Record<string, string> = {
  critical: "#EF4444",
  high: "#F97316",
  moderate: "#F59E0B",
  low: "#22C55E",
}
const SEVERITY_BG: Record<string, string> = {
  critical: "#FEF2F2",
  high: "#FFF7ED",
  moderate: "#FFFBEB",
  low: "#F0FDF4",
}

// ─── SHARED UI ────────────────────────────────────────────────────────────────

function Card({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div
      style={{
        background: "#fff",
        border: "1px solid #E5E7EB",
        borderRadius: 8,
        padding: 20,
        ...style,
      }}
    >
      {children}
    </div>
  )
}

function RiskBadge({ color, label }: { color: string; label: string }) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 4,
        padding: "2px 10px",
        borderRadius: 20,
        fontSize: 12,
        fontWeight: 600,
        color: RISK_TEXT[color] ?? "#6B7280",
        background: RISK_BG[color] ?? "#F3F4F6",
        border: `1px solid ${RISK_BORDER[color] ?? "#E5E7EB"}`,
      }}
    >
      {label}
    </span>
  )
}

function SeverityBadge({ severity, label }: { severity: string; label?: string }) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        padding: "2px 10px",
        borderRadius: 20,
        fontSize: 12,
        fontWeight: 600,
        color: SEVERITY_COLOR[severity] ?? "#6B7280",
        background: SEVERITY_BG[severity] ?? "#F3F4F6",
        border: `1px solid ${SEVERITY_COLOR[severity] ?? "#E5E7EB"}`,
      }}
    >
      {label ?? severity.charAt(0).toUpperCase() + severity.slice(1)}
    </span>
  )
}

function TrendIcon({ trend }: { trend: string }) {
  if (trend === "worsening") return <TrendingUp size={14} color="#EF4444" />
  if (trend === "improving") return <TrendingDown size={14} color="#22C55E" />
  return <Minus size={14} color="#9CA3AF" />
}

function TrendLabel({ trend }: { trend: string }) {
  if (trend === "worsening") return <span style={{ color: "#EF4444", fontWeight: 600 }}>↑ Worsening</span>
  if (trend === "improving") return <span style={{ color: "#22C55E", fontWeight: 600 }}>↓ Improving</span>
  return <span style={{ color: "#9CA3AF" }}>→ Stable</span>
}

// ─── SIDEBAR ──────────────────────────────────────────────────────────────────

type Screen = "dashboard" | "profile" | "narrative" | "report" | "upload"

const NAV_ITEMS: { key: Screen; label: string; icon: React.ReactNode }[] = [
  { key: "dashboard", label: "Dashboard", icon: <LayoutDashboard size={16} /> },
  { key: "profile", label: "Participant Profile", icon: <User size={16} /> },
  { key: "narrative", label: "AI Narrative", icon: <Brain size={16} /> },
  { key: "report", label: "Report Preview", icon: <FileText size={16} /> },
  { key: "upload", label: "Upload & Score", icon: <Upload size={16} /> },
]

function Sidebar({ active, onNav }: { active: Screen; onNav: (s: Screen) => void }) {
  return (
    <div
      style={{
        width: 220,
        minWidth: 220,
        background: "#0F172A",
        display: "flex",
        flexDirection: "column",
        height: "100vh",
        position: "sticky",
        top: 0,
      }}
    >
      {/* Logo */}
      <div style={{ padding: "24px 20px 20px", borderBottom: "1px solid #1E293B" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div
            style={{
              background: "#4F46E5",
              borderRadius: 6,
              width: 28,
              height: 28,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Activity size={14} color="#fff" />
          </div>
          <div>
            <div style={{ color: "#fff", fontWeight: 700, fontSize: 13, lineHeight: 1.2 }}>APAS</div>
            <div style={{ color: "#64748B", fontSize: 10 }}>Clinical Overwatch</div>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, padding: "12px 0" }}>
        {NAV_ITEMS.map((item) => {
          const isActive = active === item.key
          return (
            <button
              key={item.key}
              onClick={() => onNav(item.key)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                width: "100%",
                padding: "9px 20px",
                background: isActive ? "#4F46E5" : "transparent",
                border: "none",
                cursor: "pointer",
                color: isActive ? "#fff" : "#94A3B8",
                fontSize: 13,
                fontWeight: isActive ? 600 : 400,
                textAlign: "left",
                borderRadius: 0,
                transition: "background 0.15s",
              }}
            >
              {item.icon}
              {item.label}
            </button>
          )
        })}
      </nav>

      {/* User */}
      <div style={{ padding: "16px 20px", borderTop: "1px solid #1E293B" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div
            style={{
              width: 30,
              height: 30,
              borderRadius: "50%",
              background: "#1E293B",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <User size={14} color="#94A3B8" />
          </div>
          <div>
            <div style={{ color: "#fff", fontSize: 12, fontWeight: 500 }}>Dr. Amara Okafor</div>
            <div style={{ color: "#64748B", fontSize: 11 }}>Clinician</div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── SCREEN 1 — DASHBOARD ────────────────────────────────────────────────────

function DashboardScreen({ onViewParticipant }: { onViewParticipant: (id: string) => void }) {
  return (
    <div style={{ padding: 32, maxWidth: 1100 }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 20, fontWeight: 700, color: "#0F172A", margin: 0 }}>Dashboard</h1>
        <p style={{ color: "#64748B", fontSize: 13, margin: "4px 0 0" }}>Clinical overview — active caseload</p>
      </div>

      {/* Stat cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 28 }}>
        {[
          { label: "Active Participants", value: "6", icon: <Users size={18} color="#4F46E5" /> },
          {
            label: "Open Alerts",
            value: "4",
            sub: "2 Critical",
            icon: <Bell size={18} color="#EF4444" />,
          },
          { label: "Due for Reassessment", value: "2", icon: <Activity size={18} color="#F59E0B" /> },
          { label: "Avg Caseload Risk", value: "High", icon: <Shield size={18} color="#F97316" /> },
        ].map((card) => (
          <Card key={card.label}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div>
                <div style={{ fontSize: 12, color: "#64748B", fontWeight: 500, marginBottom: 6 }}>{card.label}</div>
                <div style={{ fontSize: 24, fontWeight: 700, color: "#0F172A" }}>{card.value}</div>
                {card.sub && <div style={{ fontSize: 12, color: "#EF4444", fontWeight: 500 }}>{card.sub}</div>}
              </div>
              <div
                style={{
                  background: "#F8FAFC",
                  border: "1px solid #E5E7EB",
                  borderRadius: 8,
                  padding: 8,
                }}
              >
                {card.icon}
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Alert feed */}
      <Card style={{ marginBottom: 28 }}>
        <div style={{ fontWeight: 600, fontSize: 14, color: "#0F172A", marginBottom: 16 }}>Open Alerts</div>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead>
            <tr style={{ borderBottom: "1px solid #E5E7EB" }}>
              {["Severity", "Participant", "Type", "Scale / Score", "Trigger", "Status", ""].map((h) => (
                <th
                  key={h}
                  style={{ textAlign: "left", padding: "6px 10px", color: "#64748B", fontWeight: 500, fontSize: 12 }}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {ALERTS.map((alert) => (
              <tr key={alert.id} style={{ borderBottom: "1px solid #F1F5F9" }}>
                <td style={{ padding: "10px 10px" }}>
                  <SeverityBadge severity={alert.severity} />
                </td>
                <td style={{ padding: "10px 10px", fontWeight: 600, color: "#0F172A" }}>
                  <div>{alert.participantId}</div>
                  {alert.participantId === "P-001" && (
                    <div
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 4,
                        marginTop: 4,
                        padding: "2px 8px",
                        background: "#FEF2F2",
                        border: "1px solid #FCA5A5",
                        borderRadius: 4,
                        color: "#EF4444",
                        fontSize: 11,
                        fontWeight: 600,
                      }}
                    >
                      <AlertTriangle size={10} />⚠ Suicidal ideation endorsed
                    </div>
                  )}
                </td>
                <td style={{ padding: "10px 10px", color: "#374151" }}>{alert.type}</td>
                <td style={{ padding: "10px 10px", color: "#374151" }}>
                  {alert.scale} · {alert.score}
                </td>
                <td style={{ padding: "10px 10px", color: "#6B7280", fontSize: 12, maxWidth: 220 }}>
                  {alert.trigger}
                </td>
                <td style={{ padding: "10px 10px" }}>
                  <span
                    style={{
                      display: "inline-block",
                      padding: "2px 8px",
                      borderRadius: 20,
                      fontSize: 11,
                      fontWeight: 600,
                      background: alert.status === "new" ? "#EFF6FF" : "#F3F4F6",
                      color: alert.status === "new" ? "#2563EB" : "#6B7280",
                      border: `1px solid ${alert.status === "new" ? "#BFDBFE" : "#E5E7EB"}`,
                    }}
                  >
                    {alert.status.charAt(0).toUpperCase() + alert.status.slice(1)}
                  </span>
                </td>
                <td style={{ padding: "10px 10px" }}>
                  <button
                    onClick={() => onViewParticipant(alert.participantId)}
                    style={{
                      padding: "5px 14px",
                      background: "#4F46E5",
                      color: "#fff",
                      border: "none",
                      borderRadius: 6,
                      fontSize: 12,
                      fontWeight: 500,
                      cursor: "pointer",
                    }}
                  >
                    View
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      {/* Caseload table */}
      <Card>
        <div style={{ fontWeight: 600, fontSize: 14, color: "#0F172A", marginBottom: 16 }}>Caseload</div>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead>
            <tr style={{ borderBottom: "1px solid #E5E7EB" }}>
              {["Anonymous ID", "Scale", "Last Score", "Trend", "Risk", "Action"].map((h) => (
                <th
                  key={h}
                  style={{ textAlign: "left", padding: "6px 10px", color: "#64748B", fontWeight: 500, fontSize: 12 }}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {PARTICIPANTS.map((p) => (
              <tr key={p.id} style={{ borderBottom: "1px solid #F1F5F9" }}>
                <td style={{ padding: "10px 10px", fontWeight: 600, color: "#0F172A" }}>{p.id}</td>
                <td style={{ padding: "10px 10px", color: "#374151" }}>{p.scale}</td>
                <td style={{ padding: "10px 10px", fontWeight: 600, color: "#0F172A" }}>{p.lastScore}</td>
                <td style={{ padding: "10px 10px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                    <TrendIcon trend={p.trend} />
                    <TrendLabel trend={p.trend} />
                  </div>
                </td>
                <td style={{ padding: "10px 10px" }}>
                  <RiskBadge color={p.riskColor} label={p.severity} />
                </td>
                <td style={{ padding: "10px 10px" }}>
                  <button
                    onClick={() => onViewParticipant(p.id)}
                    style={{
                      padding: "5px 14px",
                      background: "transparent",
                      color: "#4F46E5",
                      border: "1px solid #4F46E5",
                      borderRadius: 6,
                      fontSize: 12,
                      fontWeight: 500,
                      cursor: "pointer",
                    }}
                  >
                    View Profile
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  )
}

// ─── SCREEN 2 — PARTICIPANT PROFILE ──────────────────────────────────────────

const P001_SESSION_TABLE = [
  { session: 1, score: 9, severity: "Mild", rci: "—", trend: "—" },
  { session: 2, score: 11, severity: "Mild", rci: "+0.71", trend: "No Reliable Change" },
  { session: 3, score: 14, severity: "Moderate", rci: "+1.07", trend: "No Reliable Change" },
  { session: 4, score: 16, severity: "Moderate", rci: "+2.13", trend: "Reliable Worsening" },
  { session: 5, score: 19, severity: "Moderately Severe", rci: "+2.49", trend: "Reliable Worsening" },
  { session: 6, score: 22, severity: "Severe", rci: "+2.85", trend: "Reliable Worsening" },
]

function buildSessionTable(p: (typeof PARTICIPANTS)[0]) {
  if (p.id === "P-001") return P001_SESSION_TABLE
  return p.sessions.map((score, i) => ({
    session: i + 1,
    score,
    severity: getSeverityLabel(p.scale, score),
    rci: i === 0 ? "—" : `${score > p.sessions[i - 1] ? "+" : ""}${((score - p.sessions[i - 1]) * 0.6).toFixed(2)}`,
    trend: i === 0 ? "—" : score > p.sessions[i - 1] ? "Worsening" : score < p.sessions[i - 1] ? "Improving" : "Stable",
  }))
}

function ParticipantProfileScreen({
  participantId,
  onViewAI,
}: {
  participantId: string
  onViewAI: () => void
}) {
  const p = PARTICIPANTS.find((x) => x.id === participantId) ?? PARTICIPANTS[0]
  const chartData = p.sessions.map((score, i) => ({ name: `Sess ${i + 1}`, score }))
  const threshold = getThreshold(p.scale)
  const lineColor = p.trend === "worsening" ? "#EF4444" : p.trend === "improving" ? "#22C55E" : "#9CA3AF"
  const sessionTable = buildSessionTable(p)
  const lastThreeRCI = sessionTable.slice(-3).filter((r) => r.trend === "Reliable Worsening")

  return (
    <div style={{ padding: 32, maxWidth: 900 }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 4 }}>
            <h1 style={{ fontSize: 20, fontWeight: 700, color: "#0F172A", margin: 0 }}>{p.id}</h1>
            <span style={{ fontSize: 13, color: "#64748B", fontWeight: 500 }}>{p.scale}</span>
            <RiskBadge color={p.riskColor} label={p.severity} />
          </div>
          <p style={{ color: "#64748B", fontSize: 13, margin: 0 }}>
            {p.sessions.length} sessions · Last score: {p.lastScore}
          </p>
        </div>
        <button
          onClick={onViewAI}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "10px 20px",
            background: "#4F46E5",
            color: "#fff",
            border: "none",
            borderRadius: 8,
            fontSize: 13,
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          <Brain size={15} />
          View AI Summary
        </button>
      </div>

      {/* Trend flags */}
      <div style={{ display: "flex", gap: 10, marginBottom: 20 }}>
        {p.trend === "worsening" && (
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              padding: "6px 14px",
              background: "#FFF7ED",
              border: "1px solid #FDBA74",
              borderRadius: 6,
              color: "#F97316",
              fontSize: 13,
              fontWeight: 600,
            }}
          >
            <AlertTriangle size={14} />⚠ Deteriorating
          </div>
        )}
        {(p.riskColor === "red") && (
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              padding: "6px 14px",
              background: "#FEF2F2",
              border: "1px solid #FCA5A5",
              borderRadius: 6,
              color: "#EF4444",
              fontSize: 13,
              fontWeight: 600,
            }}
          >
            <AlertTriangle size={14} />Critical Risk
          </div>
        )}
        {lastThreeRCI.length > 0 && (
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              padding: "6px 14px",
              background: "#F3F4F6",
              border: "1px solid #D1D5DB",
              borderRadius: 6,
              color: "#374151",
              fontSize: 13,
            }}
          >
            RCI: Reliable Worsening confirmed (last {lastThreeRCI.length} sessions)
          </div>
        )}
      </div>

      {/* Score chart */}
      <Card style={{ marginBottom: 24 }}>
        <div style={{ fontWeight: 600, fontSize: 14, color: "#0F172A", marginBottom: 16 }}>Score History</div>
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={chartData} margin={{ top: 8, right: 20, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
            <XAxis dataKey="name" tick={{ fontSize: 12, fill: "#64748B" }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 12, fill: "#64748B" }} axisLine={false} tickLine={false} />
            <Tooltip
              contentStyle={{ border: "1px solid #E5E7EB", borderRadius: 6, fontSize: 12 }}
              cursor={{ stroke: "#E5E7EB" }}
            />
            <ReferenceLine
              y={threshold}
              stroke="#94A3B8"
              strokeDasharray="4 4"
              label={{ value: `Threshold (${threshold})`, position: "insideTopRight", fontSize: 11, fill: "#94A3B8" }}
            />
            <Line
              type="monotone"
              dataKey="score"
              stroke={lineColor}
              strokeWidth={2}
              dot={{ r: 4, fill: lineColor, strokeWidth: 0 }}
              activeDot={{ r: 5 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </Card>

      {/* Session history table */}
      <Card>
        <div style={{ fontWeight: 600, fontSize: 14, color: "#0F172A", marginBottom: 16 }}>Session History</div>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead>
            <tr style={{ borderBottom: "1px solid #E5E7EB" }}>
              {["Session", "Score", "Severity", "RCI", "Trend"].map((h) => (
                <th
                  key={h}
                  style={{ textAlign: "left", padding: "6px 10px", color: "#64748B", fontWeight: 500, fontSize: 12 }}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sessionTable.map((row) => (
              <tr key={row.session} style={{ borderBottom: "1px solid #F1F5F9" }}>
                <td style={{ padding: "9px 10px", color: "#374151", fontWeight: 500 }}>{row.session}</td>
                <td style={{ padding: "9px 10px", fontWeight: 700, color: "#0F172A" }}>{row.score}</td>
                <td style={{ padding: "9px 10px", color: "#374151" }}>{row.severity}</td>
                <td style={{ padding: "9px 10px", color: "#374151" }}>{row.rci}</td>
                <td style={{ padding: "9px 10px" }}>
                  {row.trend === "Reliable Worsening" ? (
                    <span style={{ color: "#EF4444", fontWeight: 600 }}>{row.trend}</span>
                  ) : (
                    <span style={{ color: "#6B7280" }}>{row.trend}</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  )
}

// ─── SCREEN 3 — AI NARRATIVE ─────────────────────────────────────────────────

async function generateNarrative(): Promise<string> {
  const safePayload = {
    scaleName: "PHQ-9",
    scaleAbbreviation: "PHQ-9",
    totalScore: 22,
    scoreMin: 0,
    scoreMax: 27,
    severityLabel: "Severe",
    sessionNumber: 6,
    totalSessionCount: 6,
    priorScores: [
      { score: 9, severity: "Mild" },
      { score: 11, severity: "Mild" },
      { score: 14, severity: "Moderate" },
      { score: 16, severity: "Moderate" },
      { score: 19, severity: "Moderately Severe" },
    ],
    items: P001_ITEMS,
  }

  const prompt = `You are a clinical psychologist assistant providing a structured clinical summary for a clinician's review. Do not make a diagnosis. Do not address the participant directly. Use professional clinical language. You have no identifying information about this person — do not speculate about their identity, age, gender, or background.

Scale: ${safePayload.scaleName}
Score: ${safePayload.totalScore} (Range: ${safePayload.scoreMin}–${safePayload.scoreMax}) — Severity: ${safePayload.severityLabel}
Session: ${safePayload.sessionNumber} of ${safePayload.totalSessionCount} on this scale
Prior scores: ${safePayload.priorScores.map((s, i) => `Session ${i + 1}: ${s.score} (${s.severity})`).join(", ")}

Item responses:
${safePayload.items.map((item) => `Item ${item.number} — ${item.text}: ${item.responseLabel} (${item.value})`).join("\n")}

Write a clinical summary of 4–5 sentences: (1) overall severity with reference to the score, (2) most clinically significant item-level patterns, (3) any safety-relevant endorsements — item 9 is endorsed above zero, flag this explicitly as the first clinical priority, (4) recommended follow-up priority (routine / priority / urgent) with brief rationale.`

  const response = await fetch("/api/narrative", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "claude-sonnet-4-5",
      max_tokens: 1000,
      messages: [{ role: "user", content: prompt }],
    }),
  })

  const data = await response.json()
  if (!response.ok) throw new Error(data.error ?? "API error")
  return data.content[0].text
}

function NarrativeScreen() {
  const [narrative, setNarrative] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [reviewed, setReviewed] = useState(false)
  const [escalated, setEscalated] = useState(false)

  useEffect(() => {
    setLoading(true)
    setNarrative(null)
    setError(null)
    generateNarrative()
      .then(setNarrative)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  return (
    <div style={{ padding: 32, maxWidth: 820 }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 20, fontWeight: 700, color: "#0F172A", margin: 0 }}>AI Clinical Summary</h1>
        <p style={{ color: "#64748B", fontSize: 13, margin: "4px 0 0" }}>
          Participant P-001 · PHQ-9 · Session 6 of 6
        </p>
      </div>

      {/* Critical banner — always visible */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          padding: "12px 18px",
          background: "#FEF2F2",
          border: "1px solid #FCA5A5",
          borderRadius: 8,
          marginBottom: 20,
        }}
      >
        <AlertTriangle size={18} color="#EF4444" />
        <span style={{ color: "#991B1B", fontWeight: 700, fontSize: 13 }}>
          CRITICAL — Suicidal ideation endorsed (Item 9)
        </span>
      </div>

      {/* AI output card */}
      <Card style={{ marginBottom: 20 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
          <Brain size={16} color="#4F46E5" />
          <span style={{ fontWeight: 600, fontSize: 14, color: "#0F172A" }}>AI-Generated Clinical Summary</span>
          <span
            style={{
              marginLeft: "auto",
              padding: "2px 8px",
              background: "#EEF2FF",
              border: "1px solid #C7D2FE",
              borderRadius: 20,
              fontSize: 11,
              color: "#4F46E5",
              fontWeight: 500,
            }}
          >
            Claude · PII Firewall Active
          </span>
        </div>

        {loading && (
          <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "20px 0", color: "#64748B" }}>
            <Loader2 size={16} className="animate-spin" style={{ animation: "spin 1s linear infinite" }} />
            <span style={{ fontSize: 13 }}>Generating clinical summary...</span>
          </div>
        )}

        {error && (
          <div
            style={{
              padding: "12px 16px",
              background: "#FEF2F2",
              border: "1px solid #FCA5A5",
              borderRadius: 6,
              color: "#DC2626",
              fontSize: 13,
            }}
          >
            Error: {error}
          </div>
        )}

        {narrative && (
          <p style={{ color: "#1E293B", fontSize: 14, lineHeight: 1.7, margin: 0 }}>{narrative}</p>
        )}
      </Card>

      {/* Risk badge row */}
      {!loading && !error && (
        <Card style={{ marginBottom: 20 }}>
          <div style={{ fontWeight: 600, fontSize: 14, color: "#0F172A", marginBottom: 14 }}>Risk Assessment</div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
            <span style={{ fontSize: 13, color: "#64748B", fontWeight: 500 }}>Risk Level:</span>
            <SeverityBadge severity="critical" label="Critical" />
          </div>
          <div style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 12, color: "#64748B", fontWeight: 500, marginBottom: 8 }}>Key Factors</div>
            {[
              "Suicidal ideation endorsed — Item 9",
              "Score increased 13 points across 5 sessions",
              "Three consecutive sessions in Moderately Severe or Severe range",
            ].map((factor) => (
              <div
                key={factor}
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: 8,
                  marginBottom: 6,
                  fontSize: 13,
                  color: "#374151",
                }}
              >
                <div
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: "50%",
                    background: "#EF4444",
                    marginTop: 6,
                    flexShrink: 0,
                  }}
                />
                {factor}
              </div>
            ))}
          </div>
          <div
            style={{
              padding: "10px 14px",
              background: "#FEF2F2",
              border: "1px solid #FCA5A5",
              borderRadius: 6,
              color: "#991B1B",
              fontSize: 13,
              fontWeight: 500,
            }}
          >
            Recommended action: Urgent clinical review required within 24 hours
          </div>
        </Card>
      )}

      {/* Disclaimer */}
      <div
        style={{
          padding: "12px 16px",
          background: "#F8FAFC",
          border: "1px solid #E2E8F0",
          borderRadius: 6,
          marginBottom: 20,
          fontSize: 12,
          color: "#64748B",
          lineHeight: 1.5,
          fontStyle: "italic",
        }}
      >
        AI-generated clinical summary. For clinician review and decision support only. Not a substitute for
        professional clinical judgment. This output was generated by an AI model and has not been verified by a
        licensed clinician.
      </div>

      {/* Action buttons */}
      {!loading && !error && (
        <div style={{ display: "flex", gap: 12 }}>
          <button
            onClick={() => setReviewed(true)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "10px 20px",
              background: reviewed ? "#22C55E" : "#F0FDF4",
              color: reviewed ? "#fff" : "#16A34A",
              border: `1px solid ${reviewed ? "#22C55E" : "#86EFAC"}`,
              borderRadius: 8,
              fontSize: 13,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            <CheckCircle size={15} />
            {reviewed ? "Reviewed" : "Mark Reviewed"}
          </button>
          <button
            onClick={() => setEscalated(true)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "10px 20px",
              background: escalated ? "#F97316" : "#FFF7ED",
              color: escalated ? "#fff" : "#C2410C",
              border: `1px solid ${escalated ? "#F97316" : "#FDBA74"}`,
              borderRadius: 8,
              fontSize: 13,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            <AlertTriangle size={15} />
            {escalated ? "Escalated" : "Escalate to Supervisor"}
          </button>
        </div>
      )}

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}

// ─── SCREEN 4 — REPORT PREVIEW ────────────────────────────────────────────────

const REPORT_ROWS = [
  { session: 1, score: 9, severity: "Mild", change: "—" },
  { session: 2, score: 11, severity: "Mild", change: "+2 ↑" },
  { session: 3, score: 14, severity: "Moderate", change: "+3 ↑" },
  { session: 4, score: 16, severity: "Moderate", change: "+2 ↑" },
  { session: 5, score: 19, severity: "Moderately Severe", change: "+3 ↑" },
  { session: 6, score: 22, severity: "Severe", change: "+3 ↑" },
]

function ReportScreen() {
  const [toast, setToast] = useState(false)

  const handleDownload = () => {
    setToast(true)
    setTimeout(() => setToast(false), 3500)
  }

  return (
    <div style={{ padding: 32, maxWidth: 820 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 700, color: "#0F172A", margin: 0 }}>Report Preview</h1>
          <p style={{ color: "#64748B", fontSize: 13, margin: "4px 0 0" }}>Generated clinical assessment report</p>
        </div>
        <button
          onClick={handleDownload}
          style={{
            padding: "10px 20px",
            background: "#4F46E5",
            color: "#fff",
            border: "none",
            borderRadius: 8,
            fontSize: 13,
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          Download PDF
        </button>
      </div>

      <Card>
        {/* Report header */}
        <div
          style={{
            borderBottom: "2px solid #0F172A",
            paddingBottom: 16,
            marginBottom: 24,
          }}
        >
          <div style={{ fontSize: 16, fontWeight: 700, color: "#0F172A", marginBottom: 12, letterSpacing: 0.5 }}>
            CLINICAL ASSESSMENT REPORT
          </div>
          {[
            ["Participant", "P-001"],
            ["Assessing Clinician", "Dr. Amara Okafor"],
            ["Assessment Period", "Sessions 1–6"],
            ["Scale", "PHQ-9 (Patient Health Questionnaire)"],
          ].map(([label, value]) => (
            <div key={label} style={{ display: "flex", gap: 16, marginBottom: 4, fontSize: 13 }}>
              <span style={{ color: "#64748B", fontWeight: 500, minWidth: 180 }}>{label}:</span>
              <span style={{ color: "#0F172A", fontWeight: 600 }}>{value}</span>
            </div>
          ))}
        </div>

        {/* Score summary table */}
        <div style={{ marginBottom: 24 }}>
          <div style={{ fontWeight: 600, fontSize: 14, color: "#0F172A", marginBottom: 12 }}>Score Summary</div>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: "1px solid #E5E7EB" }}>
                {["Session", "Score", "Severity", "Change"].map((h) => (
                  <th
                    key={h}
                    style={{
                      textAlign: "left",
                      padding: "6px 12px",
                      color: "#64748B",
                      fontWeight: 500,
                      fontSize: 12,
                    }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {REPORT_ROWS.map((row) => (
                <tr key={row.session} style={{ borderBottom: "1px solid #F1F5F9" }}>
                  <td style={{ padding: "9px 12px", color: "#374151" }}>{row.session}</td>
                  <td style={{ padding: "9px 12px", fontWeight: 700, color: "#0F172A" }}>{row.score}</td>
                  <td style={{ padding: "9px 12px", color: "#374151" }}>{row.severity}</td>
                  <td
                    style={{
                      padding: "9px 12px",
                      color: row.change === "—" ? "#9CA3AF" : "#EF4444",
                      fontWeight: row.change === "—" ? 400 : 600,
                    }}
                  >
                    {row.change}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* AI trend narrative */}
        <div style={{ marginBottom: 24 }}>
          <div style={{ fontWeight: 600, fontSize: 14, color: "#0F172A", marginBottom: 10 }}>AI Trend Narrative</div>
          <div
            style={{
              padding: "14px 16px",
              background: "#F8FAFC",
              border: "1px solid #E2E8F0",
              borderRadius: 6,
              fontSize: 13,
              color: "#1E293B",
              lineHeight: 1.7,
              fontStyle: "italic",
            }}
          >
            "This participant has shown a sustained and clinically significant deterioration across all six assessed
            sessions, with PHQ-9 scores rising from 9 (Mild) to 22 (Severe). The trajectory represents a reliable
            worsening as confirmed by RCI analysis across each session transition. Most recent session data indicates
            endorsement of suicidal ideation (Item 9), representing an urgent safety concern requiring immediate
            clinical attention. The pattern of consistent score elevation without any stabilisation period suggests the
            participant may be non-responsive to current treatment and a comprehensive clinical review is indicated."
          </div>
        </div>

        {/* Recommendations */}
        <div style={{ marginBottom: 24 }}>
          <div style={{ fontWeight: 600, fontSize: 14, color: "#0F172A", marginBottom: 10 }}>Recommendations</div>
          <div
            style={{
              padding: "14px 16px",
              background: "#F8FAFC",
              border: "1px solid #E2E8F0",
              borderRadius: 6,
              fontSize: 13,
              color: "#374151",
              lineHeight: 1.8,
            }}
          >
            1. Immediate risk assessment in response to suicidal ideation endorsement.
            <br />
            2. Review current treatment plan — consider escalation of care.
            <br />
            3. Weekly monitoring sessions recommended given rate of deterioration.
            <br />
            4. Supervisor consultation advised.
          </div>
        </div>

        {/* Footer */}
        <div
          style={{
            borderTop: "1px solid #E5E7EB",
            paddingTop: 14,
            fontSize: 12,
            color: "#64748B",
            fontStyle: "italic",
          }}
        >
          AI-generated report. For clinical use only. Not a substitute for professional clinical judgment.
        </div>
      </Card>

      {/* Toast */}
      {toast && (
        <div
          style={{
            position: "fixed",
            bottom: 24,
            right: 24,
            background: "#0F172A",
            color: "#fff",
            padding: "12px 20px",
            borderRadius: 8,
            fontSize: 13,
            fontWeight: 500,
            boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
            zIndex: 1000,
          }}
        >
          PDF generation requires the full system. Available in production.
        </div>
      )}
    </div>
  )
}

// ─── SCREEN 5 — UPLOAD & SCORE ───────────────────────────────────────────────

function InlineScaleSelector({
  scales,
  selectedId,
  onSelect,
}: {
  scales: Scale[]
  selectedId: string
  onSelect: (id: string) => void
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {scales.map((scale) => {
        const active = selectedId === scale.id
        return (
          <button
            key={scale.id}
            onClick={() => onSelect(scale.id)}
            style={{
              textAlign: "left",
              padding: "10px 14px",
              background: active ? "#EEF2FF" : "#F8FAFC",
              border: `1px solid ${active ? "#4F46E5" : "#E5E7EB"}`,
              borderRadius: 6,
              cursor: "pointer",
              width: "100%",
            }}
          >
            <div style={{ fontWeight: 600, fontSize: 13, color: active ? "#4F46E5" : "#0F172A", marginBottom: 2 }}>
              {scale.name}
            </div>
            <div style={{ fontSize: 12, color: "#64748B", marginBottom: 4 }}>{scale.description}</div>
            <div style={{ display: "flex", gap: 8 }}>
              <span style={{ fontSize: 11, color: "#94A3B8", fontWeight: 500 }}>{scale.totalItems} items</span>
              <span style={{ fontSize: 11, color: "#94A3B8" }}>·</span>
              <span style={{ fontSize: 11, color: "#94A3B8", fontWeight: 500 }}>{scale.scoringType}</span>
            </div>
          </button>
        )
      })}
    </div>
  )
}

function UploadScreen() {
  const { data: session } = useSession()
  const [selectedScaleId, setSelectedScaleId] = useState("")
  const [results, setResults] = useState<ProcessedResult[]>([])
  const [currentSession, setCurrentSession] = useState<UploadSession | null>(null)
  const [formatDetection, setFormatDetection] = useState<FormatDetectionResult | null>(null)
  const [showFormatDetection, setShowFormatDetection] = useState(false)
  const [pendingData, setPendingData] = useState<FileUploadData[] | null>(null)
  const [pendingFileName, setPendingFileName] = useState("")

  const availableScales = scoringEngine.getAvailableScales()

  const handleFileProcessed = (data: FileUploadData[], fileName: string) => {
    if (!selectedScaleId) { alert("Please select a scale first"); return }
    const detectionResult = formatDetector.detectFormat(data, selectedScaleId)
    setFormatDetection(detectionResult)
    setPendingData(data)
    setPendingFileName(fileName)
    setShowFormatDetection(true)
  }

  const handleFormatConfirmed = async () => {
    if (!pendingData || !selectedScaleId) return
    try {
      const processedResults = scoringEngine.processResponses(pendingData, selectedScaleId)
      const uploadSessionData = {
        fileName: pendingFileName,
        totalResponses: pendingData.length,
        processedResponses: processedResults.length,
        selectedScaleId,
        status: "completed",
      }
      if (session?.user?.id) {
        const response = await fetch("/api/sessions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ uploadSession: uploadSessionData, results: processedResults }),
        })
        if (!response.ok) throw new Error("Failed to save session")
        setCurrentSession(await response.json())
      } else {
        setCurrentSession({
          id: `local-${Date.now()}`,
          fileName: pendingFileName,
          uploadedAt: new Date(),
          totalResponses: pendingData.length,
          processedResponses: processedResults.length,
          selectedScaleId,
          status: "completed",
          results: processedResults,
        })
      }
      setResults(processedResults)
      setShowFormatDetection(false)
      setPendingData(null)
      setPendingFileName("")
    } catch (error) {
      alert("Error processing file: " + (error as Error).message)
    }
  }

  return (
    <div style={{ padding: 32, maxWidth: 1100 }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 20, fontWeight: 700, color: "#0F172A", margin: 0 }}>Upload & Score</h1>
        <p style={{ color: "#64748B", fontSize: 13, margin: "4px 0 0" }}>
          Upload CSV or Excel responses and score against a psychometric scale
        </p>
      </div>

      {/* Format detection modal */}
      {showFormatDetection && formatDetection && (
        <div style={{
          position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 50,
          display: "flex", alignItems: "center", justifyContent: "center", padding: 24,
        }}>
          <div style={{ maxWidth: 640, width: "100%", background: "#fff", borderRadius: 8, padding: 24, border: "1px solid #E5E7EB" }}>
            <FormatDetectionDisplay result={formatDetection} />
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 16 }}>
              <button
                onClick={() => setShowFormatDetection(false)}
                style={{ padding: "8px 16px", background: "#F8FAFC", border: "1px solid #E5E7EB", borderRadius: 6, fontSize: 13, cursor: "pointer", color: "#374151" }}
              >
                Cancel
              </button>
              <button
                onClick={handleFormatConfirmed}
                style={{ padding: "8px 16px", background: "#4F46E5", color: "#fff", border: "none", borderRadius: 6, fontSize: 13, fontWeight: 600, cursor: "pointer" }}
              >
                Continue Processing
              </button>
            </div>
          </div>
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "280px 1fr", gap: 24, alignItems: "start" }}>
        {/* Left column */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <Card>
            <div style={{ fontWeight: 600, fontSize: 14, color: "#0F172A", marginBottom: 12 }}>Select Scale</div>
            <InlineScaleSelector
              scales={availableScales}
              selectedId={selectedScaleId}
              onSelect={setSelectedScaleId}
            />
          </Card>

          <Card>
            <div style={{ fontWeight: 600, fontSize: 14, color: "#0F172A", marginBottom: 4 }}>Upload Responses</div>
            {!selectedScaleId && (
              <div style={{ fontSize: 12, color: "#94A3B8", marginBottom: 10 }}>Select a scale above first</div>
            )}
            <FileUpload onFileProcessed={handleFileProcessed} disabled={!selectedScaleId} />
          </Card>

          {currentSession && (
            <Card>
              <div style={{ fontWeight: 600, fontSize: 14, color: "#0F172A", marginBottom: 12 }}>Summary</div>
              {[
                ["File", currentSession.fileName],
                ["Scale", scoringEngine.getScale(currentSession.selectedScaleId)?.name ?? currentSession.selectedScaleId],
                ["Responses", `${currentSession.processedResponses} / ${currentSession.totalResponses}`],
                ["Status", currentSession.status],
              ].map(([label, value]) => (
                <div key={label} style={{ display: "flex", justifyContent: "space-between", marginBottom: 8, fontSize: 13, borderBottom: "1px solid #F1F5F9", paddingBottom: 6 }}>
                  <span style={{ color: "#64748B" }}>{label}</span>
                  <span style={{ fontWeight: 600, color: "#0F172A" }}>{value}</span>
                </div>
              ))}
            </Card>
          )}
        </div>

        {/* Right column — results */}
        <div>
          {results.length > 0 ? (
            <ResultsDisplay
              results={results}
              scale={scoringEngine.getScale(selectedScaleId)}
              session={currentSession}
            />
          ) : (
            <Card style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: 360 }}>
              <div style={{ textAlign: "center" }}>
                <div style={{
                  width: 56, height: 56, borderRadius: "50%", background: "#F1F5F9",
                  display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px"
                }}>
                  <Upload size={24} color="#94A3B8" />
                </div>
                <div style={{ fontSize: 15, fontWeight: 600, color: "#374151", marginBottom: 6 }}>No results yet</div>
                <div style={{ fontSize: 13, color: "#94A3B8" }}>Select a scale and upload a response file to see results</div>
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── ROOT ─────────────────────────────────────────────────────────────────────

export default function APASDemo() {
  const [screen, setScreen] = useState<Screen>("dashboard")
  const [selectedId, setSelectedId] = useState("P-001")

  const goToProfile = useCallback((id: string) => {
    setSelectedId(id)
    setScreen("profile")
  }, [])

  const goToNarrative = useCallback(() => {
    setScreen("narrative")
  }, [])

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: 'DM Sans', sans-serif; font-size: 14px; background: #F8FAFC; }
      `}</style>
      <div style={{ display: "flex", height: "100vh", overflow: "hidden", fontFamily: "'DM Sans', sans-serif" }}>
        <Sidebar active={screen} onNav={setScreen} />
        <main style={{ flex: 1, overflowY: "auto", background: "#F8FAFC" }}>
          {screen === "dashboard" && <DashboardScreen onViewParticipant={goToProfile} />}
          {screen === "profile" && (
            <ParticipantProfileScreen participantId={selectedId} onViewAI={goToNarrative} />
          )}
          {screen === "narrative" && <NarrativeScreen key={selectedId} />}
          {screen === "report" && <ReportScreen />}
          {screen === "upload" && <UploadScreen />}
        </main>
      </div>
    </>
  )
}
