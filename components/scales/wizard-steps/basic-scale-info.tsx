"use client"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import type { Scale } from "@/lib/types"

interface BasicScaleInfoProps {
  data: Partial<Scale>
  onChange: (data: Partial<Scale>) => void
}

export function BasicScaleInfo({ data, onChange }: BasicScaleInfoProps) {
  const updateField = <K extends keyof Scale>(field: K, value: Scale[K]) => {
    onChange({ ...data, [field]: value })
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-4">Basic Scale Information</h3>
        <div className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="name">Scale Name *</Label>
            <Input
              id="name"
              placeholder="e.g., Custom Anxiety Scale"
              value={data.name || ""}
              onChange={(e) => updateField("name", e.target.value)}
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="description">Description *</Label>
            <Textarea
              id="description"
              placeholder="Describe what this scale measures and its purpose..."
              value={data.description || ""}
              onChange={(e) => updateField("description", e.target.value)}
              rows={3}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="totalItems">Total Number of Items *</Label>
              <Input
                id="totalItems"
                type="number"
                min="1"
                max="100"
                placeholder="e.g., 10"
                value={data.totalItems || ""}
                onChange={(e) => updateField("totalItems", Number.parseInt(e.target.value) || 0)}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="responseFormat">Response Format *</Label>
              <Select value={data.responseFormat} onValueChange={(value: "numeric" | "text" | "mixed") => updateField("responseFormat", value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select format" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="numeric">Numeric (0, 1, 2, 3)</SelectItem>
                  <SelectItem value="text">Text (&quot;Never&quot;, &quot;Sometimes&quot;, &quot;Always&quot;)</SelectItem>
                  <SelectItem value="mixed">Mixed (Both numeric and text)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="scoringType">Scoring Method</Label>
              <Select 
                value={data.scoringType} 
                onValueChange={(value: "sum" | "average" | "weighted") => updateField("scoringType", value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select method" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="sum">Sum (Add all scores)</SelectItem>
                  <SelectItem value="average">Average (Mean of scores)</SelectItem>
                  <SelectItem value="weighted">Weighted (Custom weights)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="minScore">Minimum Score</Label>
              <Input
                id="minScore"
                type="number"
                placeholder="e.g., 0"
                value={data.minScore || ""}
                onChange={(e) => updateField("minScore", Number.parseInt(e.target.value) || 0)}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="maxScore">Maximum Score</Label>
              <Input
                id="maxScore"
                type="number"
                placeholder="e.g., 30"
                value={data.maxScore || ""}
                onChange={(e) => updateField("maxScore", Number.parseInt(e.target.value) || 0)}
              />
            </div>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="expectedRange">Expected Range (for validation)</Label>
            <Input
              id="expectedRange"
              placeholder="e.g., 0-3 or 1-5"
              value={data.expectedRange || ""}
              onChange={(e) => updateField("expectedRange", e.target.value)}
            />
            <p className="text-sm text-muted-foreground">
              Format: min-max (e.g., &quot;0-3&quot; for 4-point scale, &quot;1-5&quot; for 5-point Likert)
            </p>
          </div>
        </div>
      </div>

      <div>
        <h3 className="text-lg font-semibold mb-4">Additional Information</h3>
        <div className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="citation">Citation (optional)</Label>
            <Input
              id="citation"
              placeholder="Academic reference or source"
              value={data.citation || ""}
              onChange={(e) => updateField("citation", e.target.value)}
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="instructions">Administration Instructions (optional)</Label>
            <Textarea
              id="instructions"
              placeholder="How should this scale be administered?"
              value={data.instructions || ""}
              onChange={(e) => updateField("instructions", e.target.value)}
              rows={2}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="isPublic">Make Public</Label>
              <p className="text-sm text-muted-foreground">Allow other users to use this scale</p>
            </div>
            <Switch
              id="isPublic"
              checked={data.isPublic || false}
              onCheckedChange={(checked) => updateField("isPublic", checked)}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
