import type { Scale, ScaleItem, ResponseMapping, ProcessedResult, FileUploadData } from "./types"
import { SCALES, SCALE_ITEMS, RESPONSE_MAPPINGS } from "./scales-data"
import { formatDetector } from "./format-detector"

export class ScoringEngine {
  private scales: Map<string, Scale>
  private scaleItems: Map<string, ScaleItem[]>
  private responseMappings: Map<string, ResponseMapping[]>

  constructor() {
    this.scales = new Map(SCALES.map((scale) => [scale.id, scale]))

    this.scaleItems = new Map()
    SCALES.forEach((scale) => {
      const items = SCALE_ITEMS.filter((item) => item.scaleId === scale.id)
      this.scaleItems.set(scale.id, items)
    })

    this.responseMappings = new Map()
    SCALE_ITEMS.forEach((item) => {
      const mappings = RESPONSE_MAPPINGS.filter((mapping) => mapping.scaleItemId === item.id)
      this.responseMappings.set(item.id, mappings)
    })
  }

  public processResponses(data: FileUploadData[], scaleId: string): ProcessedResult[] {
    const scale = this.scales.get(scaleId)
    if (!scale) {
      throw new Error(`Scale ${scaleId} not found`)
    }

    // Detect format first
    const formatResult = formatDetector.detectFormat(data, scaleId)
    console.log("[v0] Format detection result:", formatResult)

    const scaleItems = this.scaleItems.get(scaleId) || []

    return data.map((participant, index) => {
      const scores: { [itemNumber: number]: number } = {}
      const processingErrors: string[] = []
      let totalScore = 0

      // Process each response based on detected format
      scaleItems.forEach((item) => {
        // Check each possible key, using nullish coalescing to handle 0 values correctly
        const responseText =
          participant.responses[`item_${item.itemNumber}`] ??
          participant.responses[item.itemNumber.toString()] ??
          participant.responses[`q${item.itemNumber}`] ??
          participant.responses[`Q${item.itemNumber}`] ??
          participant.responses[`Item${item.itemNumber}`] ??
          participant.responses[`item${item.itemNumber}`]

        // Check if responseText is null, undefined, or an empty string after trimming
        if (responseText === null || responseText === undefined || responseText.toString().trim() === "") {
          processingErrors.push(`Missing response for item ${item.itemNumber}`)
          return
        }

        let numericScore: number | null = null

        // Use appropriate processing pipeline based on format
        if (formatResult.detectedFormat === "numeric") {
          numericScore = this.processNumericResponse(responseText, scale)
        } else if (formatResult.detectedFormat === "text") {
          numericScore = this.convertTextToScore(item.id, responseText)
        } else {
          // Mixed format - try both approaches
          numericScore = this.processNumericResponse(responseText, scale)
          if (numericScore === null) {
            numericScore = this.convertTextToScore(item.id, responseText)
          }
        }

        if (numericScore !== null) {
          const finalScore = item.isReverseCoded ? this.reverseScore(numericScore, item) : numericScore
          scores[item.itemNumber] = finalScore
          totalScore += finalScore
        } else {
          processingErrors.push(`Could not convert "${responseText}" for item ${item.itemNumber}`)
        }
      })

      // Calculate final score based on scoring type
      const finalTotalScore = this.calculateFinalScore(totalScore, scale, Object.keys(scores).length)

      // Get interpretation
      const interpretation = this.getInterpretation(scale, finalTotalScore)

      return {
        id: `result-${index + 1}`,
        sessionId: "",
        participantId: participant.participantId || `participant-${index + 1}`,
        responses: participant.responses,
        scores,
        totalScore: finalTotalScore,
        interpretation: interpretation.description,
        severity: interpretation.severity,
        processingErrors,
      }
    })
  }

  private convertTextToScore(scaleItemId: string, textResponse: string): number | null {
    const mappings = this.responseMappings.get(scaleItemId) || []
    const normalizedText = textResponse.toLowerCase().trim()

    for (const mapping of mappings) {
      if (
        mapping.textResponse.toLowerCase() === normalizedText ||
        mapping.aliases.some((alias) => alias.toLowerCase() === normalizedText)
      ) {
        return mapping.numericValue
      }
    }

    // Try to parse as number
    const numericValue = Number.parseInt(textResponse)
    if (!isNaN(numericValue)) {
      return numericValue
    }

    return null
  }

  private reverseScore(score: number, item: ScaleItem): number {
    // Simple reverse scoring - would need to be customized per scale
    const maxScore = 3 // Assuming 0-3 scale for most items
    return maxScore - score
  }

  private getInterpretation(scale: Scale, totalScore: number) {
    for (const range of scale.interpretationRanges) {
      if (totalScore >= range.minScore && totalScore <= range.maxScore) {
        return range
      }
    }

    return {
      severity: "Unknown",
      description: "Score outside expected range",
      color: "#6b7280",
    }
  }

  public getAvailableScales(): Scale[] {
    return Array.from(this.scales.values())
  }

  public getScale(scaleId: string): Scale | undefined {
    return this.scales.get(scaleId)
  }

  private processNumericResponse(responseText: string, scale: Scale): number | null {
    const numericValue = Number(responseText)
    if (isNaN(numericValue)) {
      return null
    }

    // Validate against expected range if available
    if (scale.expectedRange) {
      const rangeParts = scale.expectedRange.split("-")
      if (rangeParts.length === 2) {
        const min = Number(rangeParts[0])
        const max = Number(rangeParts[1])
        if (numericValue < min || numericValue > max) {
          console.log(`[v0] Warning: Value ${numericValue} outside expected range ${scale.expectedRange}`)
        }
      }
    }

    return numericValue
  }

  private calculateFinalScore(totalScore: number, scale: Scale, itemCount: number): number {
    switch (scale.scoringType) {
      case "average":
        return itemCount > 0 ? totalScore / itemCount : 0
      case "weighted":
        // For now, treat weighted same as sum - would need item weights
        return totalScore
      case "sum":
      default:
        return totalScore
    }
  }
}

export const scoringEngine = new ScoringEngine()
