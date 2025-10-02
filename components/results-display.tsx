"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Progress } from "@/components/ui/progress"
import { Alert, AlertDescription } from "@/components/ui/alert"
import type { ProcessedResult, Scale, UploadSession } from "@/lib/types"
import { Download, BarChart3, Users, AlertTriangle, CheckCircle, TrendingUp } from "lucide-react"
import { ResultsTable } from "./results-table"
import { ResultsChart } from "./results-chart"

interface ResultsDisplayProps {
  results: ProcessedResult[]
  scale?: Scale
  session: UploadSession | null
}

export function ResultsDisplay({ results, scale, session }: ResultsDisplayProps) {
  const [activeTab, setActiveTab] = useState("overview")

  if (!scale || results.length === 0) {
    return (
      <Card className="h-96 flex items-center justify-center">
        <CardContent className="text-center">
          <BarChart3 className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">No Results Available</h3>
          <p className="text-muted-foreground">Upload data to see scoring results</p>
        </CardContent>
      </Card>
    )
  }

  // Calculate summary statistics
  const totalParticipants = results.length
  const validResults = results.filter((r) => r.processingErrors.length === 0)
  const errorCount = results.filter((r) => r.processingErrors.length > 0).length

  const scores = validResults.map((r) => r.totalScore)
  const averageScore = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0
  const minScore = scores.length > 0 ? Math.min(...scores) : 0
  const maxScore = scores.length > 0 ? Math.max(...scores) : 0

  // Group by severity
  const severityGroups = validResults.reduce(
    (acc, result) => {
      acc[result.severity] = (acc[result.severity] || 0) + 1
      return acc
    },
    {} as Record<string, number>,
  )

  const handleDownload = (format: "csv" | "json") => {
    let content: string
    let filename: string
    let mimeType: string

    if (format === "csv") {
      const headers = [
        "Participant ID",
        "Total Score",
        "Severity",
        "Interpretation",
        "Processing Errors",
        ...Object.keys(results[0]?.scores || {}).map((item) => `Item ${item} Score`),
      ]

      const rows = results.map((result) => [
        result.participantId,
        result.totalScore.toString(),
        result.severity,
        result.interpretation,
        result.processingErrors.join("; "),
        ...Object.values(result.scores).map((score) => score.toString()),
      ])

      content = [headers, ...rows].map((row) => row.map((cell) => `"${cell}"`).join(",")).join("\n")
      filename = `${scale.name.replace(/\s+/g, "_")}_results_${new Date().toISOString().split("T")[0]}.csv`
      mimeType = "text/csv"
    } else {
      content = JSON.stringify(
        {
          session: session,
          scale: scale,
          results: results,
          summary: {
            totalParticipants,
            validResults: validResults.length,
            errorCount,
            averageScore,
            minScore,
            maxScore,
            severityDistribution: severityGroups,
          },
        },
        null,
        2,
      )
      filename = `${scale.name.replace(/\s+/g, "_")}_results_${new Date().toISOString().split("T")[0]}.json`
      mimeType = "application/json"
    }

    const blob = new Blob([content], { type: mimeType })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-6">
      {/* Header with Download Actions */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="w-5 h-5" />
                Scoring Results
              </CardTitle>
              <CardDescription>
                {scale.name} - {totalParticipants} participants processed
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => handleDownload("csv")}>
                <Download className="w-4 h-4 mr-2" />
                CSV
              </Button>
              <Button variant="outline" size="sm" onClick={() => handleDownload("json")}>
                <Download className="w-4 h-4 mr-2" />
                JSON
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Error Summary */}
      {errorCount > 0 && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            {errorCount} participant{errorCount > 1 ? "s" : ""} had processing errors. Check the detailed results for
            more information.
          </AlertDescription>
        </Alert>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="detailed">Detailed Results</TabsTrigger>
          <TabsTrigger value="charts">Visualizations</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* Single Participant Result Highlight (if only 1 participant) */}
          {totalParticipants === 1 && validResults.length === 1 && (
            <Card className="border-2 border-primary/20 bg-gradient-to-br from-primary/5 to-background">
              <CardHeader>
                <CardTitle className="text-2xl">Participant Result</CardTitle>
                <CardDescription>Individual assessment outcome for {validResults[0].participantId}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-6 md:grid-cols-3">
                  <div className="text-center p-4 bg-background rounded-lg border">
                    <p className="text-sm text-muted-foreground mb-2">Total Score</p>
                    <p className="text-5xl font-bold text-primary">{validResults[0].totalScore}</p>
                    <p className="text-xs text-muted-foreground mt-2">
                      Range: {scale.minScore} - {scale.maxScore}
                    </p>
                  </div>
                  <div className="text-center p-4 bg-background rounded-lg border">
                    <p className="text-sm text-muted-foreground mb-2">Severity Level</p>
                    <Badge
                      className="text-2xl px-4 py-2 font-bold"
                      style={{
                        backgroundColor:
                          scale.interpretationRanges.find((r) => r.severity === validResults[0].severity)?.color ||
                          "#6b7280",
                      }}
                    >
                      {validResults[0].severity}
                    </Badge>
                  </div>
                  <div className="text-center p-4 bg-background rounded-lg border">
                    <p className="text-sm text-muted-foreground mb-2">Interpretation</p>
                    <p className="text-lg font-semibold mt-4">{validResults[0].interpretation}</p>
                  </div>
                </div>
                {validResults[0].processingErrors.length > 0 && (
                  <Alert variant="destructive" className="mt-4">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>
                      <strong>Processing Errors Found:</strong>
                      <ul className="list-disc list-inside mt-2 mb-3">
                        {validResults[0].processingErrors.map((error, idx) => (
                          <li key={idx} className="text-sm">{error}</li>
                        ))}
                      </ul>
                      <div className="text-sm bg-destructive/10 p-3 rounded border border-destructive/20 mt-3">
                        <p className="font-semibold mb-1">💡 Common Causes:</p>
                        <ul className="list-disc list-inside space-y-1 text-xs">
                          <li>Empty cells in your CSV file</li>
                          <li>Invalid values (must be 0-3 or valid text responses)</li>
                          <li>Wrong number of columns (check template files)</li>
                        </ul>
                        <p className="text-xs mt-2 italic">
                          See <strong>TROUBLESHOOTING_ERRORS.md</strong> for detailed solutions
                        </p>
                      </div>
                    </AlertDescription>
                  </Alert>
                )}
              </CardContent>
            </Card>
          )}

          {/* Summary Statistics (for multiple participants or general overview) */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-primary" />
                  <div>
                    <p className="text-sm text-muted-foreground">
                      {totalParticipants === 1 ? "Participant" : "Total Participants"}
                    </p>
                    <p className="text-2xl font-bold">{totalParticipants}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-primary" />
                  <div>
                    <p className="text-sm text-muted-foreground">
                      {totalParticipants === 1 ? "Score" : "Average Score"}
                    </p>
                    <p className="text-2xl font-bold">{averageScore.toFixed(1)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-600" />
                  <div>
                    <p className="text-sm text-muted-foreground">
                      {totalParticipants === 1 ? "Status" : "Valid Results"}
                    </p>
                    <p className="text-2xl font-bold">
                      {totalParticipants === 1 ? (validResults.length === 1 ? "✓" : "✗") : validResults.length}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-orange-600" />
                  <div>
                    <p className="text-sm text-muted-foreground">Errors</p>
                    <p className="text-2xl font-bold">{errorCount}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Severity Distribution */}
          <Card>
            <CardHeader>
              <CardTitle>Severity Distribution</CardTitle>
              <CardDescription>Distribution of participants across severity levels</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {scale.interpretationRanges.map((range) => {
                const count = severityGroups[range.severity] || 0
                const percentage = validResults.length > 0 ? (count / validResults.length) * 100 : 0

                return (
                  <div key={range.id} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: range.color }} />
                        <span className="font-medium">{range.severity}</span>
                        <span className="text-sm text-muted-foreground">
                          ({range.minScore}-{range.maxScore})
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">{count}</span>
                        <Badge variant="secondary">{percentage.toFixed(1)}%</Badge>
                      </div>
                    </div>
                    <Progress value={percentage} className="h-2" />
                  </div>
                )
              })}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="detailed">
          <ResultsTable results={results} scale={scale} />
        </TabsContent>

        <TabsContent value="charts">
          <ResultsChart results={validResults} scale={scale} />
        </TabsContent>
      </Tabs>
    </div>
  )
}
