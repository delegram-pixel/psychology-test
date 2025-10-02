"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { useSearchParams } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { FileUpload } from "@/components/file-upload"
import { ScaleSelector } from "@/components/scale-selector"
import { ResultsDisplay } from "@/components/results-display"
import { FormatDetectionDisplay } from "@/components/format-detection-display"
import { ThemeToggle } from "@/components/theme-toggle"
import { HelpDialog } from "@/components/help-dialog"
import type { ProcessedResult, UploadSession, FormatDetectionResult, FileUploadData } from "@/lib/types"
import { scoringEngine } from "@/lib/scoring-engine"
import { formatDetector } from "@/lib/format-detector"
import { AuthButton } from "@/components/auth/auth-button"
import { FileText, Calculator, BarChart3, Sparkles, BookOpen, Clock } from "lucide-react"
import Link from "next/link"

export default function HomePage() {
  const searchParams = useSearchParams()
  const [currentSession, setCurrentSession] = useState<UploadSession | null>(null)
  const [results, setResults] = useState<ProcessedResult[]>([])
  const [selectedScaleId, setSelectedScaleId] = useState<string>("")
  const [formatDetection, setFormatDetection] = useState<FormatDetectionResult | null>(null)
  const [showFormatDetection, setShowFormatDetection] = useState(false)
  const [pendingData, setPendingData] = useState<FileUploadData[] | null>(null)
  const [pendingFileName, setPendingFileName] = useState<string>("")

  // Check for scale parameter in URL
  useEffect(() => {
    const scaleParam = searchParams.get("scale")
    if (scaleParam) {
      setSelectedScaleId(scaleParam)
    }
  }, [searchParams])

  const handleFileProcessed = (data: FileUploadData[], fileName: string) => {
    if (!selectedScaleId) {
      alert("Please select a scale first")
      return
    }

    // Detect format first
    const scale = scoringEngine.getScale(selectedScaleId)
    const detectionResult = formatDetector.detectFormat(data, selectedScaleId)

    setFormatDetection(detectionResult)
    setPendingData(data)
    setPendingFileName(fileName)
    setShowFormatDetection(true)
  }

  const { data: session } = useSession()

  const handleFormatConfirmed = async () => {
    if (!pendingData || !selectedScaleId) return

    try {
      const processedResults = scoringEngine.processResponses(pendingData, selectedScaleId)

      const uploadSessionData = {
        fileName: pendingFileName,
        totalResponses: pendingData.length,
        processedResponses: processedResults.length,
        selectedScaleId,
        status: "completed",
      }

      if (session?.user?.id) {
        const response = await fetch("/api/sessions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            uploadSession: uploadSessionData,
            results: processedResults,
          }),
        })

        if (!response.ok) {
          throw new Error("Failed to save session")
        }

        const savedSession = await response.json()
        setCurrentSession(savedSession)
      } else {
        // Handle case where user is not logged in
        const localSession: UploadSession = {
          id: `local-${Date.now()}`,
          fileName: uploadSessionData.fileName || 'unknown',
          uploadedAt: new Date(),
          totalResponses: uploadSessionData.totalResponses || 0,
          processedResponses: processedResults.length,
          selectedScaleId: uploadSessionData.selectedScaleId || '',
          status: 'completed',
          results: processedResults
        }
        setCurrentSession(localSession)
      }

      setResults(processedResults)
      setShowFormatDetection(false)
      setPendingData(null)
      setPendingFileName("")
    } catch (error) {
      console.error("Processing error:", error)
      alert("Error processing file: " + (error as Error).message)
    }
  }

  const availableScales = scoringEngine.getAvailableScales()

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-10 h-10 bg-primary rounded-lg">
                <Calculator className="w-5 h-5 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-balance">Psychology Test Scoring Platform</h1>
                <p className="text-muted-foreground">Convert questionnaire responses to numerical scores</p>
              </div>
            </div>


            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" asChild>
                <Link href="/sessions" className="gap-2">
                  <Clock className="w-4 h-4" />
                  My Sessions
                </Link>
              </Button>
              <Button variant="outline" size="sm" asChild>
                <Link href="/scales" className="gap-2">
                  <BookOpen className="w-4 h-4" />
                  Scale Library
                </Link>
              </Button>
              <HelpDialog />
              <ThemeToggle />
              <AuthButton />
            </div>


          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {/* Format Detection Modal */}
        {showFormatDetection && formatDetection && (
          <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="max-w-2xl w-full">
              <FormatDetectionDisplay result={formatDetection} />
              <div className="flex justify-end gap-2 mt-4">
                <Button variant="outline" onClick={() => setShowFormatDetection(false)}>
                  Cancel
                </Button>
                <Button onClick={handleFormatConfirmed}>Continue Processing</Button>
              </div>
            </div>
          </div>
        )}

        <div className="mb-8">
          <Card className="bg-gradient-to-r from-primary/10 via-primary/5 to-background border-primary/20">
            <CardContent className="p-6">
              <div className="flex items-center gap-2 mb-3">
                <Sparkles className="w-5 h-5 text-primary" />
                <h2 className="text-lg font-semibold">Professional Psychology Assessment Scoring</h2>
              </div>
              <div className="grid gap-4 md:grid-cols-4 text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-primary rounded-full" />
                  <span>Multiple assessment scales</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-primary rounded-full" />
                  <span>Smart format detection</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-primary rounded-full" />
                  <span>Custom scale creation</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-primary rounded-full" />
                  <span>Export-ready reports</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-8 lg:grid-cols-3">
          {/* Left Column - Upload & Configuration */}
          <div className="lg:col-span-1 space-y-6">
            {/* Scale Selection */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="w-5 h-5" />
                  Select Assessment Scale
                </CardTitle>
                <CardDescription>Choose the psychological assessment scale for scoring</CardDescription>
              </CardHeader>
              <CardContent>
                <ScaleSelector
                  scales={availableScales}
                  selectedScaleId={selectedScaleId}
                  onScaleSelect={setSelectedScaleId}
                />
                <div className="mt-3 pt-3 border-t">
                  <Button variant="outline" size="sm" asChild className="w-full gap-2 bg-transparent">
                    <Link href="/scales">
                      <BookOpen className="w-4 h-4" />
                      Browse Scale Library
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* File Upload */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="w-5 h-5" />
                  Upload Response Data
                </CardTitle>
                <CardDescription>Upload CSV or Excel file with participant responses</CardDescription>
              </CardHeader>
              <CardContent>
                <FileUpload onFileProcessed={handleFileProcessed} disabled={!selectedScaleId} />
                {!selectedScaleId && <p className="text-sm text-muted-foreground mt-2">Please select a scale first</p>}
              </CardContent>
            </Card>

            {/* Session Info */}
            {currentSession && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="w-5 h-5" />
                    Processing Summary
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">File:</span>
                    <span className="text-sm font-medium">{currentSession.fileName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Scale:</span>
                    <Badge variant="secondary">{scoringEngine.getScale(currentSession.selectedScaleId)?.name}</Badge>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Responses:</span>
                    <span className="text-sm font-medium">
                      {currentSession.processedResponses} / {currentSession.totalResponses}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Status:</span>
                    <Badge variant={currentSession.status === "completed" ? "default" : "secondary"}>
                      {currentSession.status}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Right Column - Results */}
          <div className="lg:col-span-2">
            {results.length > 0 ? (
              <ResultsDisplay
                results={results}
                scale={scoringEngine.getScale(selectedScaleId)}
                session={currentSession}
              />
            ) : (
              <Card className="h-96 flex items-center justify-center">
                <CardContent className="text-center">
                  <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                    <BarChart3 className="w-8 h-8 text-muted-foreground" />
                  </div>
                  <h3 className="text-lg font-semibold mb-2">No Results Yet</h3>
                  <p className="text-muted-foreground text-balance">
                    Select a scale and upload your response data to see scoring results
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
