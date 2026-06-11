"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Plus, Trash2, Info } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import type { Scale, ResponseMapping } from "@/lib/types"

interface ResponseMappingStepProps {
  basicInfo: Partial<Scale>
  mappings: ResponseMapping[]
  onChange: (mappings: ResponseMapping[]) => void
}

export function ResponseMappingStep({ basicInfo, mappings, onChange }: ResponseMappingStepProps) {
  const [newMapping, setNewMapping] = useState({
    textResponse: "",
    numericValue: 0,
    aliases: "",
  })

  const addMapping = () => {
    if (!newMapping.textResponse.trim()) return

    const mapping: ResponseMapping = {
      id: `mapping-${Date.now()}`,
      scaleItemId: "", // Will be set when items are created
      textResponse: newMapping.textResponse.trim(),
      numericValue: newMapping.numericValue,
      aliases: newMapping.aliases
        .split(",")
        .map((alias) => alias.trim())
        .filter((alias) => alias.length > 0),
    }

    onChange([...mappings, mapping])
    setNewMapping({ textResponse: "", numericValue: 0, aliases: "" })
  }

  const removeMapping = (id: string) => {
    onChange(mappings.filter((mapping) => mapping.id !== id))
  }

  const updateMapping = (
    id: string,
    field: keyof ResponseMapping,
    value: string | number | string[]
  ) => {
    onChange(
      mappings.map((mapping) =>
        mapping.id === id
          ? {
              ...mapping,
              [field]: field === "aliases" 
                ? typeof value === 'string' 
                  ? value.split(",").map(alias => alias.trim()) 
                  : value
                : value,
            }
          : mapping,
      ),
    )
  }

  // Skip this step for numeric-only scales
  if (basicInfo.responseFormat === "numeric") {
    return (
      <div className="space-y-6">
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            Since you selected numeric responses, no text-to-number mapping is needed. Responses will be validated
            against your expected range: {basicInfo.expectedRange || "not specified"}.
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-2">Response Mapping</h3>
        <p className="text-muted-foreground mb-4">
          Define how text responses should be converted to numeric values. This applies to all items in your scale.
        </p>
      </div>

      {/* Add New Mapping */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Add Response Option</CardTitle>
          <CardDescription>Define a text response and its numeric value</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="textResponse">Text Response</Label>
              <Input
                id="textResponse"
                placeholder="e.g., Never"
                value={newMapping.textResponse}
                onChange={(e) => setNewMapping({ ...newMapping, textResponse: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="numericValue">Numeric Value</Label>
              <Input
                id="numericValue"
                type="number"
                placeholder="e.g., 0"
                value={newMapping.numericValue}
                onChange={(e) => setNewMapping({ ...newMapping, numericValue: Number.parseInt(e.target.value) || 0 })}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="aliases">Aliases (comma-separated)</Label>
              <Input
                id="aliases"
                placeholder="e.g., not at all, 0, none"
                value={newMapping.aliases}
                onChange={(e) => setNewMapping({ ...newMapping, aliases: e.target.value })}
              />
            </div>
          </div>
          <Button onClick={addMapping} disabled={!newMapping.textResponse.trim()} className="gap-2">
            <Plus className="w-4 h-4" />
            Add Mapping
          </Button>
        </CardContent>
      </Card>

      {/* Existing Mappings */}
      {mappings.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Response Mappings ({mappings.length})</CardTitle>
            <CardDescription>Review and edit your response mappings</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {mappings.map((mapping) => (
                <div key={mapping.id} className="flex items-center gap-4 p-3 border rounded-lg">
                  <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <Label className="text-xs text-muted-foreground">Text Response</Label>
                      <Input
                        value={mapping.textResponse}
                        onChange={(e) => updateMapping(mapping.id, "textResponse", e.target.value)}
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">Numeric Value</Label>
                      <Input
                        type="number"
                        value={mapping.numericValue}
                        onChange={(e) =>
                          updateMapping(mapping.id, "numericValue", Number.parseInt(e.target.value) || 0)
                        }
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">Aliases</Label>
                      <div className="mt-1 flex flex-wrap gap-1">
                        {mapping.aliases.map((alias, index) => (
                          <Badge key={index} variant="secondary" className="text-xs">
                            {alias}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => removeMapping(mapping.id)}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Common Templates */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Quick Templates</CardTitle>
          <CardDescription>Add common response patterns</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Button
              variant="outline"
              onClick={() => {
                const likert4 = [
                  { textResponse: "Never", numericValue: 0, aliases: ["not at all", "0", "none"] },
                  { textResponse: "Sometimes", numericValue: 1, aliases: ["rarely", "1", "few times"] },
                  { textResponse: "Often", numericValue: 2, aliases: ["frequently", "2", "most times"] },
                  { textResponse: "Always", numericValue: 3, aliases: ["constantly", "3", "every time"] },
                ]
                const newMappings = likert4.map((item, index) => ({
                  id: `template-${Date.now()}-${index}`,
                  scaleItemId: "",
                  ...item,
                }))
                onChange([...mappings, ...newMappings])
              }}
            >
              4-Point Frequency Scale
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                const likert5 = [
                  { textResponse: "Strongly Disagree", numericValue: 1, aliases: ["1", "completely disagree"] },
                  { textResponse: "Disagree", numericValue: 2, aliases: ["2", "somewhat disagree"] },
                  { textResponse: "Neutral", numericValue: 3, aliases: ["3", "neither", "undecided"] },
                  { textResponse: "Agree", numericValue: 4, aliases: ["4", "somewhat agree"] },
                  { textResponse: "Strongly Agree", numericValue: 5, aliases: ["5", "completely agree"] },
                ]
                const newMappings = likert5.map((item, index) => ({
                  id: `template-${Date.now()}-${index}`,
                  scaleItemId: "",
                  ...item,
                }))
                onChange([...mappings, ...newMappings])
              }}
            >
              5-Point Likert Scale
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
