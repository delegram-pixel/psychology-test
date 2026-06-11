"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import type { Scale } from "@/lib/types"

interface ScalePreviewProps {
  scale: Scale
}

export function ScalePreview({ scale }: ScalePreviewProps) {
  // Calculate coverage of interpretation ranges
  const totalPossibleRange = scale.maxScore - scale.minScore
  const coveredRange = scale.interpretationRanges.reduce((acc, range) => {
    return acc + (range.maxScore - range.minScore + 1)
  }, 0)
  const coverage = totalPossibleRange > 0 ? (coveredRange / totalPossibleRange) * 100 : 0

  return (
    <div className="space-y-6">
      {/* Scale Overview */}
      <Card>
        <CardHeader>
          <CardTitle>Scale Overview</CardTitle>
          <CardDescription>Summary of scale properties and configuration</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Key Metrics */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-4 bg-muted/50 rounded-lg">
              <div className="text-2xl font-bold">{scale.totalItems}</div>
              <div className="text-sm text-muted-foreground">Total Items</div>
            </div>
            <div className="text-center p-4 bg-muted/50 rounded-lg">
              <div className="text-2xl font-bold">
                {scale.minScore}-{scale.maxScore}
              </div>
              <div className="text-sm text-muted-foreground">Score Range</div>
            </div>
            <div className="text-center p-4 bg-muted/50 rounded-lg">
              <div className="text-2xl font-bold">{scale.interpretationRanges.length}</div>
              <div className="text-sm text-muted-foreground">Interpretations</div>
            </div>
            <div className="text-center p-4 bg-muted/50 rounded-lg">
              <div className="text-2xl font-bold">{Math.round(coverage)}%</div>
              <div className="text-sm text-muted-foreground">Coverage</div>
            </div>
          </div>

          {/* Configuration Details */}
          <div className="grid gap-4">
            <div className="flex justify-between items-center">
              <span className="font-medium">Response Format</span>
              <Badge variant="secondary">{scale.responseFormat}</Badge>
            </div>
            <div className="flex justify-between items-center">
              <span className="font-medium">Scoring Method</span>
              <Badge variant="outline">{scale.scoringType}</Badge>
            </div>
            {scale.expectedRange && (
              <div className="flex justify-between items-center">
                <span className="font-medium">Expected Range</span>
                <span className="text-muted-foreground">{scale.expectedRange}</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Score Distribution Visualization */}
      <Card>
        <CardHeader>
          <CardTitle>Score Distribution</CardTitle>
          <CardDescription>Visual representation of interpretation ranges</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>{scale.minScore}</span>
              <span>{scale.maxScore}</span>
            </div>
            <div className="h-12 bg-muted rounded-lg overflow-hidden flex">
              {scale.interpretationRanges
                .sort((a, b) => a.minScore - b.minScore)
                .map((range) => {
                  const rangeSize = range.maxScore - range.minScore + 1
                  const width = totalPossibleRange > 0 ? (rangeSize / totalPossibleRange) * 100 : 0

                  return (
                    <div
                      key={range.id}
                      className="flex items-center justify-center text-sm font-medium text-white relative group"
                      style={{
                        backgroundColor: range.color,
                        width: `${width}%`,
                      }}
                    >
                      {width > 20 && (
                        <div className="text-center">
                          <div className="font-semibold">{range.severity}</div>
                          <div className="text-xs opacity-90">
                            {range.minScore}-{range.maxScore}
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })}
            </div>
          </div>

          {/* Range Details */}
          <div className="grid gap-3">
            {scale.interpretationRanges
              .sort((a, b) => a.minScore - b.minScore)
              .map((range) => (
                <div key={range.id} className="flex items-center gap-3 p-3 border rounded-lg">
                  <div className="w-4 h-4 rounded-full flex-shrink-0" style={{ backgroundColor: range.color }} />
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-medium">{range.severity}</span>
                      <span className="text-sm text-muted-foreground">
                        {range.minScore} - {range.maxScore} points
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground text-balance">{range.description}</p>
                  </div>
                </div>
              ))}
          </div>
        </CardContent>
      </Card>

      {/* Usage Guidelines */}
      <Card>
        <CardHeader>
          <CardTitle>Usage Guidelines</CardTitle>
          <CardDescription>How to use this scale effectively</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <div>
              <h4 className="font-medium mb-1">Data Format</h4>
              <p className="text-sm text-muted-foreground">
                {scale.responseFormat === "numeric"
                  ? `Upload CSV files with numeric responses in the range ${scale.expectedRange || "as specified"}.`
                  : scale.responseFormat === "text"
                    ? "Upload CSV files with text responses that match the defined response mappings."
                    : "Upload CSV files with either numeric or text responses. The system will auto-detect the format."}
              </p>
            </div>

            <div>
              <h4 className="font-medium mb-1">Scoring</h4>
              <p className="text-sm text-muted-foreground">
                {scale.scoringType === "sum"
                  ? "Individual item scores are summed to create the total score."
                  : scale.scoringType === "average"
                    ? "Individual item scores are averaged to create the final score."
                    : "Individual item scores are weighted according to their importance."}
              </p>
            </div>

            {scale.instructions && (
              <div>
                <h4 className="font-medium mb-1">Administration</h4>
                <p className="text-sm text-muted-foreground text-balance">{scale.instructions}</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
