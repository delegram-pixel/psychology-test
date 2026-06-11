"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Plus, Trash2, Palette } from "lucide-react"
import type { Scale, InterpretationRange } from "@/lib/types"

interface ScoreInterpretationStepProps {
  basicInfo: Partial<Scale>
  interpretations: InterpretationRange[]
  onChange: (interpretations: InterpretationRange[]) => void
}

export function ScoreInterpretationStep({ basicInfo, interpretations, onChange }: ScoreInterpretationStepProps) {
  const [newInterpretation, setNewInterpretation] = useState({
    minScore: 0,
    maxScore: 0,
    severity: "",
    description: "",
    color: "#10b981",
  })

  const predefinedColors = [
    { name: "Green", value: "#10b981" },
    { name: "Yellow", value: "#f59e0b" },
    { name: "Orange", value: "#f97316" },
    { name: "Red", value: "#dc2626" },
    { name: "Blue", value: "#3b82f6" },
    { name: "Purple", value: "#8b5cf6" },
  ]

  const addInterpretation = () => {
    if (!newInterpretation.severity.trim() || !newInterpretation.description.trim()) return

    const interpretation: InterpretationRange = {
      id: `interpretation-${Date.now()}`,
      scaleId: basicInfo.id || "",
      minScore: newInterpretation.minScore,
      maxScore: newInterpretation.maxScore,
      severity: newInterpretation.severity.trim(),
      description: newInterpretation.description.trim(),
      color: newInterpretation.color,
    }

    onChange([...interpretations, interpretation])
    setNewInterpretation({
      minScore: newInterpretation.maxScore + 1,
      maxScore: newInterpretation.maxScore + 5,
      severity: "",
      description: "",
      color: "#10b981",
    })
  }

  const removeInterpretation = (id: string) => {
    onChange(interpretations.filter((interpretation) => interpretation.id !== id))
  }

  const updateInterpretation = (id: string, field: keyof InterpretationRange, value: string | number) => {
    onChange(
      interpretations.map((interpretation) =>
        interpretation.id === id ? { ...interpretation, [field]: value } : interpretation,
      ),
    )
  }

  const generateStandardRanges = () => {
    const totalRange = (basicInfo.maxScore || 0) - (basicInfo.minScore || 0)
    const rangeSize = Math.ceil(totalRange / 4)

    const standardRanges = [
      {
        severity: "Minimal",
        description: "Minimal or no symptoms",
        color: "#10b981",
        minScore: basicInfo.minScore || 0,
        maxScore: (basicInfo.minScore || 0) + rangeSize - 1,
      },
      {
        severity: "Mild",
        description: "Mild symptoms",
        color: "#f59e0b",
        minScore: (basicInfo.minScore || 0) + rangeSize,
        maxScore: (basicInfo.minScore || 0) + rangeSize * 2 - 1,
      },
      {
        severity: "Moderate",
        description: "Moderate symptoms",
        color: "#f97316",
        minScore: (basicInfo.minScore || 0) + rangeSize * 2,
        maxScore: (basicInfo.minScore || 0) + rangeSize * 3 - 1,
      },
      {
        severity: "Severe",
        description: "Severe symptoms",
        color: "#dc2626",
        minScore: (basicInfo.minScore || 0) + rangeSize * 3,
        maxScore: basicInfo.maxScore || 0,
      },
    ]

    const newInterpretations = standardRanges.map((range, index) => ({
      id: `standard-${Date.now()}-${index}`,
      scaleId: basicInfo.id || "",
      ...range,
    }))

    onChange([...interpretations, ...newInterpretations])
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-2">Score Interpretation</h3>
        <p className="text-muted-foreground mb-4">
          Define score ranges and their meanings. Score range: {basicInfo.minScore || 0} - {basicInfo.maxScore || 0}
        </p>
      </div>

      {/* Add New Interpretation */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Add Score Range</CardTitle>
          <CardDescription>Define what a score range means</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="minScore">Minimum Score</Label>
              <Input
                id="minScore"
                type="number"
                value={newInterpretation.minScore}
                onChange={(e) =>
                  setNewInterpretation({ ...newInterpretation, minScore: Number.parseInt(e.target.value) || 0 })
                }
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="maxScore">Maximum Score</Label>
              <Input
                id="maxScore"
                type="number"
                value={newInterpretation.maxScore}
                onChange={(e) =>
                  setNewInterpretation({ ...newInterpretation, maxScore: Number.parseInt(e.target.value) || 0 })
                }
              />
            </div>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="severity">Severity Level</Label>
            <Input
              id="severity"
              placeholder="e.g., Minimal, Mild, Moderate, Severe"
              value={newInterpretation.severity}
              onChange={(e) => setNewInterpretation({ ...newInterpretation, severity: e.target.value })}
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              placeholder="Describe what this score range indicates..."
              value={newInterpretation.description}
              onChange={(e) => setNewInterpretation({ ...newInterpretation, description: e.target.value })}
              rows={2}
            />
          </div>

          <div className="grid gap-2">
            <Label>Color</Label>
            <div className="flex gap-2">
              {predefinedColors.map((color) => (
                <button
                  key={color.value}
                  type="button"
                  className={`w-8 h-8 rounded-full border-2 ${
                    newInterpretation.color === color.value ? "border-foreground" : "border-muted"
                  }`}
                  style={{ backgroundColor: color.value }}
                  onClick={() => setNewInterpretation({ ...newInterpretation, color: color.value })}
                  title={color.name}
                />
              ))}
              <div className="flex items-center gap-2">
                <Palette className="w-4 h-4 text-muted-foreground" />
                <Input
                  type="color"
                  value={newInterpretation.color}
                  onChange={(e) => setNewInterpretation({ ...newInterpretation, color: e.target.value })}
                  className="w-12 h-8 p-0 border-0"
                />
              </div>
            </div>
          </div>

          <div className="flex gap-2">
            <Button
              onClick={addInterpretation}
              disabled={!newInterpretation.severity.trim() || !newInterpretation.description.trim()}
              className="gap-2"
            >
              <Plus className="w-4 h-4" />
              Add Range
            </Button>
            {interpretations.length === 0 && (
              <Button variant="outline" onClick={generateStandardRanges} className="gap-2 bg-transparent">
                Generate Standard Ranges
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Existing Interpretations */}
      {interpretations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Score Interpretations ({interpretations.length})</CardTitle>
            <CardDescription>Review and edit your score interpretations</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {interpretations
                .sort((a, b) => a.minScore - b.minScore)
                .map((interpretation) => (
                  <div key={interpretation.id} className="flex items-start gap-4 p-4 border rounded-lg">
                    <div
                      className="w-4 h-4 rounded-full mt-1 flex-shrink-0"
                      style={{ backgroundColor: interpretation.color }}
                    />

                    <div className="flex-1 grid grid-cols-1 md:grid-cols-4 gap-4">
                      <div>
                        <Label className="text-xs text-muted-foreground">Score Range</Label>
                        <div className="flex gap-1 mt-1">
                          <Input
                            type="number"
                            value={interpretation.minScore}
                            onChange={(e) =>
                              updateInterpretation(interpretation.id, "minScore", Number.parseInt(e.target.value) || 0)
                            }
                            className="w-20"
                          />
                          <span className="flex items-center px-2">-</span>
                          <Input
                            type="number"
                            value={interpretation.maxScore}
                            onChange={(e) =>
                              updateInterpretation(interpretation.id, "maxScore", Number.parseInt(e.target.value) || 0)
                            }
                            className="w-20"
                          />
                        </div>
                      </div>

                      <div>
                        <Label className="text-xs text-muted-foreground">Severity</Label>
                        <Input
                          value={interpretation.severity}
                          onChange={(e) => updateInterpretation(interpretation.id, "severity", e.target.value)}
                          className="mt-1"
                        />
                      </div>

                      <div className="md:col-span-2">
                        <Label className="text-xs text-muted-foreground">Description</Label>
                        <Textarea
                          value={interpretation.description}
                          onChange={(e) => updateInterpretation(interpretation.id, "description", e.target.value)}
                          className="mt-1"
                          rows={2}
                        />
                      </div>
                    </div>

                    <Button variant="ghost" size="sm" onClick={() => removeInterpretation(interpretation.id)}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Coverage Visualization */}
      {interpretations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Score Coverage</CardTitle>
            <CardDescription>Visual representation of your score ranges</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>{basicInfo.minScore || 0}</span>
                <span>{basicInfo.maxScore || 0}</span>
              </div>
              <div className="h-8 bg-muted rounded-lg overflow-hidden flex">
                {interpretations
                  .sort((a, b) => a.minScore - b.minScore)
                  .map((interpretation) => {
                    const totalRange = (basicInfo.maxScore || 0) - (basicInfo.minScore || 0)
                    const rangeSize = interpretation.maxScore - interpretation.minScore + 1
                    const width = totalRange > 0 ? (rangeSize / totalRange) * 100 : 0

                    return (
                      <div
                        key={interpretation.id}
                        className="flex items-center justify-center text-xs font-medium text-white"
                        style={{
                          backgroundColor: interpretation.color,
                          width: `${width}%`,
                        }}
                        title={`${interpretation.severity}: ${interpretation.minScore}-${interpretation.maxScore}`}
                      >
                        {width > 15 && interpretation.severity}
                      </div>
                    )
                  })}
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
