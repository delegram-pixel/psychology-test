"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { CheckCircle, AlertTriangle, Info } from "lucide-react"
import type { FormatDetectionResult } from "@/lib/types"

interface FormatDetectionDisplayProps {
  result: FormatDetectionResult
  onConfirm?: () => void
}

export function FormatDetectionDisplay({ result, onConfirm }: FormatDetectionDisplayProps) {
  const getFormatBadgeVariant = (format: string) => {
    switch (format) {
      case "numeric":
        return "default"
      case "text":
        return "secondary"
      case "mixed":
        return "destructive"
      default:
        return "outline"
    }
  }

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return "text-green-600"
    if (confidence >= 0.6) return "text-yellow-600"
    return "text-red-600"
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Info className="w-5 h-5" />
          Format Detection Results
        </CardTitle>
        <CardDescription>Analysis of your uploaded response data</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Detection Summary */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold">{result.totalResponses}</div>
            <div className="text-sm text-muted-foreground">Total Responses</div>
          </div>
          <div className="text-center">
            <Badge variant={getFormatBadgeVariant(result.detectedFormat)} className="text-sm">
              {result.detectedFormat.toUpperCase()}
            </Badge>
            <div className="text-sm text-muted-foreground mt-1">Detected Format</div>
          </div>
          <div className="text-center">
            <div className={`text-2xl font-bold ${getConfidenceColor(result.confidence)}`}>
              {Math.round(result.confidence * 100)}%
            </div>
            <div className="text-sm text-muted-foreground">Confidence</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold">{result.numericResponses}</div>
            <div className="text-sm text-muted-foreground">Numeric</div>
            <div className="text-2xl font-bold">{result.textResponses}</div>
            <div className="text-sm text-muted-foreground">Text</div>
          </div>
        </div>

        {/* Sample Responses */}
        {result.sampleResponses.length > 0 && (
          <div>
            <h4 className="font-medium mb-2">Sample Responses</h4>
            <div className="bg-muted p-3 rounded-md">
              <div className="grid gap-1 text-sm font-mono">
                {result.sampleResponses.slice(0, 5).map((sample, index) => (
                  <div key={index} className="text-muted-foreground">
                    {sample}
                  </div>
                ))}
                {result.sampleResponses.length > 5 && (
                  <div className="text-muted-foreground">... and {result.sampleResponses.length - 5} more</div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Recommendations */}
        {result.recommendations.length > 0 && (
          <Alert>
            <CheckCircle className="h-4 w-4" />
            <AlertDescription>
              <div className="space-y-1">
                {result.recommendations.map((rec, index) => (
                  <div key={index}>• {rec}</div>
                ))}
              </div>
            </AlertDescription>
          </Alert>
        )}

        {/* Validation Errors */}
        {result.validationErrors.length > 0 && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <div className="space-y-1">
                {result.validationErrors.map((error, index) => (
                  <div key={index}>• {error}</div>
                ))}
              </div>
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  )
}
