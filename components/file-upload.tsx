"use client"

import type React from "react"

import { useState, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Upload, FileText, X, CheckCircle, AlertCircle } from "lucide-react"
import type { FileUploadData } from "@/lib/types"

interface FileUploadProps {
  onFileProcessed: (data: FileUploadData[], fileName: string) => void
  disabled?: boolean
}

export function FileUpload({ onFileProcessed, disabled = false }: FileUploadProps) {
  const [isDragOver, setIsDragOver] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const processExcelFile = async (file: File): Promise<FileUploadData[]> => {
    const XLSX = await import("xlsx")

    return new Promise((resolve, reject) => {
      const reader = new FileReader()

      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target?.result as ArrayBuffer)
          const workbook = XLSX.read(data, { type: "array" })

          const firstSheetName = workbook.SheetNames[0]
          const worksheet = workbook.Sheets[firstSheetName]

          const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as string[][]

          if (jsonData.length < 2) {
            throw new Error("Excel file must contain at least a header row and one data row")
          }

          const headers = jsonData[0].map((h) => String(h || "").trim())
          const processedData: FileUploadData[] = []

          for (let i = 1; i < jsonData.length; i++) {
            const row = jsonData[i]
            if (!row || row.length === 0) continue

            const participantId = String(row[0] || `participant-${i}`)
            const responses: { [key: string]: string } = {}

            headers.forEach((header, index) => {
              if (index > 0 && header) {
                responses[header] = String(row[index] || "").trim()
              }
            })

            processedData.push({
              participantId,
              responses,
            })
          }

          resolve(processedData)
        } catch (err) {
          reject(new Error(`Failed to parse Excel file: ${err instanceof Error ? err.message : "Unknown error"}`))
        }
      }

      reader.onerror = () => reject(new Error("Failed to read Excel file"))
      reader.readAsArrayBuffer(file)
    })
  }

  const processFile = useCallback(
    async (file: File) => {
      setIsProcessing(true)
      setError(null)
      setSuccess(null)
      setUploadProgress(0)

      try {
        const progressInterval = setInterval(() => {
          setUploadProgress((prev) => Math.min(prev + 10, 90))
        }, 100)

        let data: FileUploadData[]

        if (file.name.match(/\.(xlsx|xls)$/i)) {
          data = await processExcelFile(file)
        } else {
          const text = await file.text()
          const lines = text.trim().split("\n")
          if (lines.length < 2) {
            throw new Error("File must contain at least a header row and one data row")
          }

          const headers = lines[0].split(/[,\t]/).map((h) => h.trim().replace(/"/g, ""))

          data = []
          for (let i = 1; i < lines.length; i++) {
            const values = lines[i].split(/[,\t]/).map((v) => v.trim().replace(/"/g, ""))

            if (values.length !== headers.length) {
              console.warn(`Row ${i + 1} has ${values.length} columns, expected ${headers.length}`)
              continue
            }

            const responses: { [key: string]: string } = {}
            const participantId = values[0] || `participant-${i}`

            headers.forEach((header, index) => {
              if (index > 0) {
                responses[header] = values[index] || ""
              }
            })

            data.push({
              participantId,
              responses,
            })
          }
        }

        clearInterval(progressInterval)
        setUploadProgress(95)

        if (data.length === 0) {
          throw new Error("No valid data rows found in file")
        }

        setUploadProgress(100)
        setSuccess(`Successfully processed ${data.length} participant responses`)
        onFileProcessed(data, file.name)
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to process file")
      } finally {
        setIsProcessing(false)
        setTimeout(() => {
          setUploadProgress(0)
          setSuccess(null)
        }, 3000)
      }
    },
    [onFileProcessed],
  )

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setIsDragOver(false)

      if (disabled) return

      const files = Array.from(e.dataTransfer.files)
      const file = files[0]

      if (!file) return

      if (!file.name.match(/\.(csv|tsv|txt|xlsx|xls)$/i)) {
        setError("Please upload a CSV, TSV, TXT, or Excel file")
        return
      }

      processFile(file)
    },
    [disabled, processFile],
  )

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (!file) return

      if (!file.name.match(/\.(csv|tsv|txt|xlsx|xls)$/i)) {
        setError("Please upload a CSV, TSV, TXT, or Excel file")
        return
      }

      processFile(file)
      e.target.value = ""
    },
    [processFile],
  )

  const handleDragOver = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      if (!disabled) {
        setIsDragOver(true)
      }
    },
    [disabled],
  )

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
  }, [])

  return (
    <div className="space-y-4">
      <Card
        className={`transition-colors ${
          isDragOver && !disabled
            ? "border-primary bg-primary/5"
            : disabled
              ? "border-muted bg-muted/20"
              : "border-dashed border-2 hover:border-primary/50"
        }`}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
      >
        <CardContent className="p-8">
          <div className="text-center space-y-4">
            <div
              className={`w-16 h-16 mx-auto rounded-full flex items-center justify-center ${
                disabled ? "bg-muted" : "bg-primary/10"
              }`}
            >
              <Upload className={`w-8 h-8 ${disabled ? "text-muted-foreground" : "text-primary"}`} />
            </div>

            <div>
              <h3 className="text-lg font-semibold mb-2">Upload Response Data</h3>
              <p className="text-muted-foreground text-sm mb-4">
                Drag and drop your CSV, Excel, or text file here, or click to browse
              </p>
            </div>

            <div className="space-y-2">
              <Button
                variant="outline"
                disabled={disabled || isProcessing}
                onClick={() => document.getElementById("file-input")?.click()}
                className="w-full"
              >
                <FileText className="w-4 h-4 mr-2" />
                {isProcessing ? "Processing..." : "Choose File"}
              </Button>

              <input
                id="file-input"
                type="file"
                accept=".csv,.tsv,.txt,.xlsx,.xls"
                onChange={handleFileSelect}
                className="hidden"
                disabled={disabled}
              />
            </div>

            <div className="text-xs text-muted-foreground">
              Supported formats: CSV, TSV, TXT, Excel (.xlsx, .xls)
              <br />
              First column should contain participant IDs
            </div>
          </div>
        </CardContent>
      </Card>

      {isProcessing && (
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>Processing file...</span>
            <span>{uploadProgress}%</span>
          </div>
          <Progress value={uploadProgress} className="w-full" />
        </div>
      )}

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
          <Button variant="ghost" size="sm" className="absolute right-2 top-2" onClick={() => setError(null)}>
            <X className="h-4 w-4" />
          </Button>
        </Alert>
      )}

      {success && (
        <Alert className="border-green-200 bg-green-50 text-green-800">
          <CheckCircle className="h-4 w-4 text-green-600" />
          <AlertDescription>{success}</AlertDescription>
        </Alert>
      )}
    </div>
  )
}
