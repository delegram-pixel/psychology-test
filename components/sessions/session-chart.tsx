'use client'

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine, ResponsiveContainer } from 'recharts'

interface Props {
  scale: string
  data: { session: number; score: number }[]
}

const THRESHOLDS: Record<string, number> = { PHQ9: 20, BDI2: 29, GAD7: 15 }

export function SessionChart({ scale, data }: Props) {
  const threshold = THRESHOLDS[scale]
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
        {threshold && (
          <ReferenceLine
            y={threshold}
            stroke="#EF4444"
            strokeDasharray="4 4"
            label={{ value: 'Critical', fontSize: 11, fill: '#EF4444' }}
          />
        )}
        <Line type="monotone" dataKey="score" stroke={lineColor} strokeWidth={2} dot={{ r: 4 }} activeDot={{ r: 6 }} />
      </LineChart>
    </ResponsiveContainer>
  )
}
