"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Plus, Trash2, GripVertical } from "lucide-react"
import type { Scale, ScaleItem } from "@/lib/types"

interface ItemConfigurationStepProps {
  basicInfo: Partial<Scale>
  items: ScaleItem[]
  onChange: (items: ScaleItem[]) => void
}

export function ItemConfigurationStep({ basicInfo, items, onChange }: ItemConfigurationStepProps) {
  const [newItem, setNewItem] = useState<{
    questionText: string;
    responseType: "likert" | "binary" | "multiple_choice";
    isReverseCoded: boolean;
  }>({
    questionText: "",
    responseType: "likert",
    isReverseCoded: false,
  })

  const addItem = () => {
    if (!newItem.questionText.trim()) return

    const item: ScaleItem = {
      id: `item-${Date.now()}`,
      scaleId: basicInfo.id || "",
      itemNumber: items.length + 1,
      questionText: newItem.questionText.trim(),
      responseType: newItem.responseType,
      isReverseCoded: newItem.isReverseCoded,
    }

    onChange([...items, item])
    setNewItem({ questionText: "", responseType: "likert", isReverseCoded: false })
  }

  const removeItem = (id: string) => {
    const updatedItems = items.filter((item) => item.id !== id)
    // Renumber items
    const renumberedItems = updatedItems.map((item, index) => ({
      ...item,
      itemNumber: index + 1,
    }))
    onChange(renumberedItems)
  }

  const updateItem = <K extends keyof ScaleItem>(
    id: string, 
    field: K, 
    value: ScaleItem[K]
  ) => {
    onChange(items.map((item) => (item.id === id ? { ...item, [field]: value } : item)))
  }

  const generateSampleItems = () => {
    const sampleItems = [
      "I feel sad or depressed",
      "I have trouble sleeping",
      "I feel anxious or worried",
      "I have difficulty concentrating",
      "I feel hopeless about the future",
    ]

    const newItems = sampleItems.map((text, index) => ({
      id: `sample-${Date.now()}-${index}`,
      scaleId: basicInfo.id || "",
      itemNumber: items.length + index + 1,
      questionText: text,
      responseType: "likert" as const,
      isReverseCoded: false,
    }))

    onChange([...items, ...newItems])
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-2">Item Configuration</h3>
        <p className="text-muted-foreground mb-4">
          Add questions/items for your scale. Target: {basicInfo.totalItems || 0} items.
        </p>
      </div>

      {/* Add New Item */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Add New Item</CardTitle>
          <CardDescription>Create a question or statement for your scale</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="questionText">Question/Statement Text</Label>
              <Textarea
                id="questionText"
                placeholder="e.g., I feel nervous or anxious"
                value={newItem.questionText}
                onChange={(e) => setNewItem({ ...newItem, questionText: e.target.value })}
                rows={2}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="responseType">Response Type</Label>
                <Select
                  value={newItem.responseType}
                  onValueChange={(value: 'likert' | 'binary' | 'multiple_choice') => 
                    setNewItem({ ...newItem, responseType: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="likert">Likert Scale</SelectItem>
                    <SelectItem value="binary">Yes/No</SelectItem>
                    <SelectItem value="multiple_choice">Multiple Choice</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="isReverseCoded">Reverse Coded</Label>
                  <p className="text-sm text-muted-foreground">Higher scores indicate lower trait</p>
                </div>
                <Switch
                  id="isReverseCoded"
                  checked={newItem.isReverseCoded}
                  onCheckedChange={(checked) => setNewItem({ ...newItem, isReverseCoded: checked })}
                />
              </div>
            </div>
          </div>

          <div className="flex gap-2">
            <Button onClick={addItem} disabled={!newItem.questionText.trim()} className="gap-2">
              <Plus className="w-4 h-4" />
              Add Item
            </Button>
            {items.length === 0 && (
              <Button variant="outline" onClick={generateSampleItems} className="gap-2 bg-transparent">
                Add Sample Items
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Existing Items */}
      {items.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              Scale Items ({items.length}/{basicInfo.totalItems || 0})
            </CardTitle>
            <CardDescription>Review and edit your scale items</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {items.map((item, index) => (
                <div key={item.id} className="flex items-start gap-3 p-4 border rounded-lg">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <GripVertical className="w-4 h-4" />
                    <span className="text-sm font-medium">{index + 1}</span>
                  </div>

                  <div className="flex-1 space-y-3">
                    <div>
                      <Label className="text-xs text-muted-foreground">Question Text</Label>
                      <Textarea
                        value={item.questionText}
                        onChange={(e) => updateItem(item.id, "questionText", e.target.value)}
                        className="mt-1"
                        rows={2}
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label className="text-xs text-muted-foreground">Response Type</Label>
                        <Select
                          value={item.responseType}
                          onValueChange={(value: "likert" | "binary" | "multiple_choice") => 
                            updateItem(item.id, "responseType", value)
                          }
                        >
                          <SelectTrigger className="mt-1">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="likert">Likert Scale</SelectItem>
                            <SelectItem value="binary">Yes/No</SelectItem>
                            <SelectItem value="multiple_choice">Multiple Choice</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                          <Label className="text-xs text-muted-foreground">Reverse Coded</Label>
                        </div>
                        <Switch
                          checked={item.isReverseCoded}
                          onCheckedChange={(checked) => updateItem(item.id, "isReverseCoded", checked)}
                        />
                      </div>
                    </div>
                  </div>

                  <Button variant="ghost" size="sm" onClick={() => removeItem(item.id)}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>

            {items.length < (basicInfo.totalItems || 0) && (
              <div className="mt-4 p-4 bg-muted/50 rounded-lg text-center">
                <p className="text-sm text-muted-foreground">
                  Add {(basicInfo.totalItems || 0) - items.length} more items to complete your scale
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
