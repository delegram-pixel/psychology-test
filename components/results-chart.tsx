"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts"
import type { ProcessedResult, Scale } from "@/lib/types"

interface ResultsChartProps {
  results: ProcessedResult[]
  scale: Scale
}

export function ResultsChart({ results, scale }: ResultsChartProps) {
  // Prepare data for severity distribution pie chart
  const severityData = scale.interpretationRanges
    .map((range) => {
      const count = results.filter((r) => r.severity === range.severity).length
      return {
        name: range.severity,
        value: count,
        color: range.color,
        percentage: results.length > 0 ? ((count / results.length) * 100).toFixed(1) : "0",
      }
    })
    .filter((item) => item.value > 0)

  // Prepare data for score distribution histogram
  const scoreRanges = []
  const minScore = Math.min(...results.map((r) => r.totalScore))
  const maxScore = Math.max(...results.map((r) => r.totalScore))
  const rangeSize = Math.ceil((maxScore - minScore) / 8) || 1

  for (let i = minScore; i <= maxScore; i += rangeSize) {
    const rangeEnd = Math.min(i + rangeSize - 1, maxScore)
    const count = results.filter((r) => r.totalScore >= i && r.totalScore <= rangeEnd).length

    if (count > 0) {
      scoreRanges.push({
        range: `${i}-${rangeEnd}`,
        count,
        midpoint: (i + rangeEnd) / 2,
      })
    }
  }

  return (
    <div className="grid gap-6 md:grid-cols-2">
      {/* Severity Distribution Pie Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Severity Distribution</CardTitle>
          <CardDescription>Breakdown of participants by severity level</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={severityData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percentage }) => `${name} (${percentage}%)`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {severityData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value: number) => [value, "Participants"]}
                  labelFormatter={(label) => `Severity: ${label}`}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Score Distribution Histogram */}
      <Card>
        <CardHeader>
          <CardTitle>Score Distribution</CardTitle>
          <CardDescription>Histogram of total scores across participants</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={scoreRanges}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="range" tick={{ fontSize: 12 }} angle={-45} textAnchor="end" height={60} />
                <YAxis />
                <Tooltip
                  formatter={(value: number) => [value, "Participants"]}
                  labelFormatter={(label) => `Score Range: ${label}`}
                />
                <Bar dataKey="count" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
