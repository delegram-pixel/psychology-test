"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import type { Scale } from "@/lib/types"
import { CheckCircle, FileText } from "lucide-react"

interface ScaleSelectorProps {
  scales: Scale[]
  selectedScaleId: string
  onScaleSelect: (scaleId: string) => void
}

export function ScaleSelector({ scales, selectedScaleId, onScaleSelect }: ScaleSelectorProps) {
  return (
    <div className="space-y-3">
      {scales.map((scale) => {
        const isSelected = selectedScaleId === scale.id

        return (
          <Card
            key={scale.id}
            className={`cursor-pointer transition-all ${
              isSelected ? "border-primary bg-primary/5 shadow-md" : "hover:border-primary/50 hover:shadow-sm"
            }`}
            onClick={() => onScaleSelect(scale.id)}
          >
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <FileText className="w-4 h-4 text-primary" />
                    <h4 className="font-semibold text-sm">{scale.name}</h4>
                    {isSelected && <CheckCircle className="w-4 h-4 text-primary" />}
                  </div>
                  <p className="text-xs text-muted-foreground mb-3 leading-relaxed">{scale.description}</p>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="text-xs">
                      {scale.totalItems} items
                    </Badge>
                    <Badge variant="outline" className="text-xs">
                      {scale.scoringType}
                    </Badge>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )
      })}

      {scales.length === 0 && (
        <div className="text-center py-8 text-muted-foreground">
          <FileText className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">No scales available</p>
        </div>
      )}
    </div>
  )
}
