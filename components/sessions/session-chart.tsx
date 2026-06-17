'use client'

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine, ResponsiveContainer } from 'recharts'

interface Props {
  scale: string
  data: { session: number; score: number }[]
}

const SEVERITY_LINES: Record<string, { label: string; y: number; color: string }[]> = {
  PHQ9: [
    { label: 'Moderate', y: 10, color: '#F59E0B' },
    { label: 'High',     y: 15, color: '#F97316' },
    { label: 'Critical', y: 20, color: '#EF4444' },
  ],
  BDI2: [
    { label: 'Moderate', y: 14, color: '#F59E0B' },
    { label: 'High',     y: 20, color: '#F97316' },
    { label: 'Critical', y: 29, color: '#EF4444' },
  ],
  GAD7: [
    { label: 'Moderate', y:  5, color: '#F59E0B' },
    { label: 'High',     y: 10, color: '#F97316' },
    { label: 'Critical', y: 15, color: '#EF4444' },
  ],
}

export function SessionChart({ scale, data }: Props) {
  const lines = SEVERITY_LINES[scale] ?? []

  const trend = data.length >= 2
    ? data.at(-1)!.score > data.at(0)!.score ? 'worsening'
    : data.at(-1)!.score < data.at(0)!.score ? 'improving'
    : 'stable'
    : 'stable'

  const lineColor = trend === 'worsening' ? '#EF4444' : trend === 'improving' ? '#22C55E' : '#94A3B8'

  return (
    <ResponsiveContainer width="100%" height={220}>
      <LineChart data={data} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
        <XAxis dataKey="session" tick={{ fontSize: 12 }} tickFormatter={(v: number) => `Session ${v}`} />
        <YAxis tick={{ fontSize: 12 }} />
        <Tooltip formatter={(v: number) => [`Score: ${v}`, '']} />
        {lines.map(({ label, y, color }) => (
          <ReferenceLine
            key={label}
            y={y}
            stroke={color}
            strokeDasharray="4 4"
            label={{ value: label, fontSize: 11, fill: color }}
          />
        ))}
        <Line type="monotone" dataKey="score" stroke={lineColor} strokeWidth={2} dot={{ r: 4 }} activeDot={{ r: 6 }} />
      </LineChart>
    </ResponsiveContainer>
  )
}
