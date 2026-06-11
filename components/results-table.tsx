"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import type { ProcessedResult, Scale } from "@/lib/types"
import { Search, AlertTriangle, CheckCircle, ChevronDown, ChevronRight } from "lucide-react"

interface ResultsTableProps {
  results: ProcessedResult[]
  scale: Scale
}

export function ResultsTable({ results, scale }: ResultsTableProps) {
  const [searchTerm, setSearchTerm] = useState("")
  const [severityFilter, setSeverityFilter] = useState<string>("all")
  const [sortBy, setSortBy] = useState<"participant" | "score" | "severity">("participant")
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc")
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set())

  // Filter and sort results
  const filteredResults = results
    .filter((result) => {
      const matchesSearch = result.participantId.toLowerCase().includes(searchTerm.toLowerCase())
      const matchesSeverity = severityFilter === "all" || result.severity === severityFilter
      return matchesSearch && matchesSeverity
    })
    .sort((a, b) => {
      let comparison = 0

      switch (sortBy) {
        case "participant":
          comparison = a.participantId.localeCompare(b.participantId)
          break
        case "score":
          comparison = a.totalScore - b.totalScore
          break
        case "severity":
          comparison = a.severity.localeCompare(b.severity)
          break
      }

      return sortOrder === "asc" ? comparison : -comparison
    })

  const uniqueSeverities = Array.from(new Set(results.map((r) => r.severity)))

  const handleSort = (column: "participant" | "score" | "severity") => {
    if (sortBy === column) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc")
    } else {
      setSortBy(column)
      setSortOrder("asc")
    }
  }

  const getSeverityColor = (severity: string) => {
    const range = scale.interpretationRanges.find((r) => r.severity === severity)
    return range?.color || "#6b7280"
  }

  const toggleRow = (resultId: string) => {
    const newExpanded = new Set(expandedRows)
    if (newExpanded.has(resultId)) {
      newExpanded.delete(resultId)
    } else {
      newExpanded.add(resultId)
    }
    setExpandedRows(newExpanded)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Detailed Results</CardTitle>
        <CardDescription>Individual participant scores and interpretations</CardDescription>

        {/* Filters */}
        <div className="flex gap-4 pt-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search participants..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          <Select value={severityFilter} onValueChange={setSeverityFilter}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Filter by severity" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Severities</SelectItem>
              {uniqueSeverities.map((severity) => (
                <SelectItem key={severity} value={severity}>
                  {severity}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </CardHeader>

      <CardContent>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>
                  <Button
                    variant="ghost"
                    onClick={() => handleSort("participant")}
                    className="h-auto p-0 font-semibold"
                  >
                    Participant ID
                    {sortBy === "participant" && <span className="ml-1">{sortOrder === "asc" ? "↑" : "↓"}</span>}
                  </Button>
                </TableHead>
                <TableHead>
                  <Button variant="ghost" onClick={() => handleSort("score")} className="h-auto p-0 font-semibold">
                    Total Score
                    {sortBy === "score" && <span className="ml-1">{sortOrder === "asc" ? "↑" : "↓"}</span>}
                  </Button>
                </TableHead>
                <TableHead>
                  <Button variant="ghost" onClick={() => handleSort("severity")} className="h-auto p-0 font-semibold">
                    Severity
                    {sortBy === "severity" && <span className="ml-1">{sortOrder === "asc" ? "↑" : "↓"}</span>}
                  </Button>
                </TableHead>
                <TableHead>Interpretation</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredResults.map((result) => {
                const isExpanded = expandedRows.has(result.id)
                const hasErrors = result.processingErrors.length > 0

                return (
                  <>
                    <TableRow key={result.id} className={hasErrors ? "cursor-pointer hover:bg-muted/50" : ""}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          {hasErrors && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 w-6 p-0"
                              onClick={() => toggleRow(result.id)}
                            >
                              {isExpanded ? (
                                <ChevronDown className="h-4 w-4" />
                              ) : (
                                <ChevronRight className="h-4 w-4" />
                              )}
                            </Button>
                          )}
                          {result.participantId}
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="font-mono text-lg">{result.totalScore}</span>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="secondary"
                          style={{
                            backgroundColor: `${getSeverityColor(result.severity)}20`,
                            color: getSeverityColor(result.severity),
                            borderColor: getSeverityColor(result.severity),
                          }}
                        >
                          {result.severity}
                        </Badge>
                      </TableCell>
                      <TableCell className="max-w-xs">
                        <p className="text-sm text-muted-foreground truncate" title={result.interpretation}>
                          {result.interpretation}
                        </p>
                      </TableCell>
                      <TableCell>
                        {result.processingErrors.length === 0 ? (
                          <div className="flex items-center gap-1 text-green-600">
                            <CheckCircle className="w-4 h-4" />
                            <span className="text-sm">Valid</span>
                          </div>
                        ) : (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="flex items-center gap-1 text-orange-600 hover:text-orange-700 hover:bg-orange-50"
                            onClick={() => toggleRow(result.id)}
                          >
                            <AlertTriangle className="w-4 h-4" />
                            <span className="text-sm">{result.processingErrors.length} error(s)</span>
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                    {hasErrors && isExpanded && (
                      <TableRow key={`${result.id}-errors`}>
                        <TableCell colSpan={5} className="bg-orange-50/50 border-l-4 border-orange-500">
                          <Alert variant="destructive" className="border-orange-200 bg-white">
                            <AlertTriangle className="h-4 w-4" />
                            <AlertDescription>
                              <div className="space-y-2">
                                <p className="font-semibold text-sm">Processing Errors for {result.participantId}:</p>
                                <ul className="list-disc list-inside space-y-1">
                                  {result.processingErrors.map((error, idx) => (
                                    <li key={idx} className="text-sm">{error}</li>
                                  ))}
                                </ul>
                                <div className="mt-3 p-2 bg-orange-50 rounded border border-orange-200">
                                  <p className="text-xs font-semibold mb-1">💡 How to Fix:</p>
                                  <ul className="text-xs space-y-1 list-disc list-inside">
                                    <li>Check your CSV file for empty cells</li>
                                    <li>Ensure all values are between 0-3</li>
                                    <li>Verify you have the correct number of columns</li>
                                    <li>See TROUBLESHOOTING_ERRORS.md for detailed help</li>
                                  </ul>
                                </div>
                              </div>
                            </AlertDescription>
                          </Alert>
                        </TableCell>
                      </TableRow>
                    )}
                  </>
                )
              })}
            </TableBody>
          </Table>

          {filteredResults.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              <p>No results match your current filters</p>
            </div>
          )}
        </div>

        <div className="mt-4 text-sm text-muted-foreground">
          Showing {filteredResults.length} of {results.length} results
        </div>
      </CardContent>
    </Card>
  )
}
