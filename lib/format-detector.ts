import type { FormatDetectionResult, ValidationResult, Scale, FileUploadData } from "./types"

export class FormatDetector {
  /**
   * Analyzes uploaded data to detect response format
   */
  public detectFormat(data: FileUploadData[], scaleId?: string): FormatDetectionResult {
    if (!data || data.length === 0) {
      return {
        detectedFormat: "text",
        confidence: 0,
        numericResponses: 0,
        textResponses: 0,
        totalResponses: 0,
        sampleResponses: [],
        validationErrors: ["No data provided"],
        recommendations: ["Upload a valid CSV or Excel file with response data"],
      }
    }

    let numericCount = 0
    let textCount = 0
    const sampleResponses: string[] = []
    const allResponses: string[] = []

    // Analyze all response values
    data.forEach((row, index) => {
      Object.entries(row.responses).forEach(([key, value]) => {
        if (key.toLowerCase().includes("participant") || key.toLowerCase().includes("id")) {
          return // Skip ID columns
        }

        const stringValue = String(value).trim()
        if (stringValue === "" || stringValue === "null" || stringValue === "undefined") {
          return // Skip empty values
        }

        allResponses.push(stringValue)

        if (sampleResponses.length < 10) {
          sampleResponses.push(`${key}: ${stringValue}`)
        }

        if (this.isNumericResponse(stringValue)) {
          numericCount++
        } else {
          textCount++
        }
      })
    })

    const totalResponses = numericCount + textCount
    const numericRatio = totalResponses > 0 ? numericCount / totalResponses : 0

    let detectedFormat: "numeric" | "text" | "mixed"
    let confidence: number

    if (numericRatio >= 0.9) {
      detectedFormat = "numeric"
      confidence = numericRatio
    } else if (numericRatio <= 0.1) {
      detectedFormat = "text"
      confidence = 1 - numericRatio
    } else {
      detectedFormat = "mixed"
      confidence = 0.5 // Mixed format has lower confidence
    }

    const validationErrors: string[] = []
    const recommendations: string[] = []

    // Add recommendations based on detection
    if (detectedFormat === "numeric") {
      recommendations.push("Detected numeric responses - will validate against expected range")
      recommendations.push("Ensure all values are within the scale's expected range")
    } else if (detectedFormat === "text") {
      recommendations.push("Detected text responses - will convert using response mappings")
      recommendations.push("Verify that all text responses have corresponding mappings")
    } else {
      recommendations.push("Mixed format detected - review data for consistency")
      recommendations.push("Consider standardizing response format for better accuracy")
    }

    return {
      detectedFormat,
      confidence,
      numericResponses: numericCount,
      textResponses: textCount,
      totalResponses,
      sampleResponses,
      validationErrors,
      recommendations,
    }
  }

  /**
   * Validates responses against a specific scale
   */
  public validateResponses(data: FileUploadData[], scale: Scale): ValidationResult {
    const errors: string[] = []
    const warnings: string[] = []

    if (!scale) {
      return {
        isValid: false,
        errors: ["Scale not found"],
        warnings: [],
      }
    }

    const formatResult = this.detectFormat(data)

    // Validate based on scale's expected format
    if (scale.responseFormat === "numeric" && formatResult.detectedFormat === "text") {
      errors.push(`Scale expects numeric responses but text responses detected`)
    } else if (scale.responseFormat === "text" && formatResult.detectedFormat === "numeric") {
      warnings.push(`Scale expects text responses but numeric responses detected - will attempt conversion`)
    }

    // Validate numeric ranges if applicable
    if (formatResult.detectedFormat === "numeric" || formatResult.detectedFormat === "mixed") {
      const numericValues = this.extractNumericValues(data)
      const outOfRange = numericValues.filter((val) =>
        scale.expectedRange ? !this.isInExpectedRange(val, scale.expectedRange) : false,
      )

      if (outOfRange.length > 0) {
        warnings.push(`${outOfRange.length} responses outside expected range: ${scale.expectedRange}`)
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    }
  }

  private isNumericResponse(value: string): boolean {
    // Check if value is a number (including decimals)
    const num = Number(value)
    return !isNaN(num) && isFinite(num)
  }

  private extractNumericValues(data: FileUploadData[]): number[] {
    const values: number[] = []

    data.forEach((row) => {
      Object.entries(row.responses).forEach(([key, value]) => {
        if (key.toLowerCase().includes("participant") || key.toLowerCase().includes("id")) {
          return
        }

        const stringValue = String(value).trim()
        if (this.isNumericResponse(stringValue)) {
          values.push(Number(stringValue))
        }
      })
    })

    return values
  }

  private isInExpectedRange(value: number, expectedRange: string): boolean {
    // Parse range like "0-3" or "1-5"
    const rangeParts = expectedRange.split("-")
    if (rangeParts.length !== 2) return true // Can't validate malformed range

    const min = Number(rangeParts[0])
    const max = Number(rangeParts[1])

    return value >= min && value <= max
  }
}

export const formatDetector = new FormatDetector()
