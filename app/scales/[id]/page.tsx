"use client"
import { useParams, useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ArrowLeft, Edit, Copy, Share, Download, CheckCircle, Users, BookOpen } from "lucide-react"
import { scoringEngine } from "@/lib/scoring-engine"
import { ScalePreview } from "@/components/scales/scale-preview"

export default function ScaleDetailPage() {
  const params = useParams()
  const router = useRouter()
  const scaleId = params.id as string

  const scale = scoringEngine.getScale(scaleId)

  if (!scale) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="max-w-md">
          <CardContent className="p-6 text-center">
            <h2 className="text-lg font-semibold mb-2">Scale Not Found</h2>
            <p className="text-muted-foreground mb-4">The requested scale could not be found.</p>
            <Button onClick={() => router.push("/scales")}>Back to Library</Button>
          </CardContent>
        </Card>
      </div>
    )
  }

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

  const getScoringBadgeVariant = (scoring: string) => {
    switch (scoring) {
      case "sum":
        return "outline"
      case "average":
        return "secondary"
      case "weighted":
        return "default"
      default:
        return "outline"
    }
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="sm" onClick={() => router.push("/scales")} className="gap-2">
                <ArrowLeft className="w-4 h-4" />
                Back to Library
              </Button>
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center w-10 h-10 bg-primary rounded-lg">
                  <BookOpen className="w-5 h-5 text-primary-foreground" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-balance">{scale.name}</h1>
                  <p className="text-muted-foreground">{scale.description}</p>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" className="gap-2 bg-transparent">
                <Share className="w-4 h-4" />
                Share
              </Button>
              <Button variant="outline" size="sm" className="gap-2 bg-transparent">
                <Copy className="w-4 h-4" />
                Duplicate
              </Button>
              <Button variant="outline" size="sm" className="gap-2 bg-transparent">
                <Download className="w-4 h-4" />
                Export
              </Button>
              {!scale.isPublic && (
                <Button size="sm" className="gap-2">
                  <Edit className="w-4 h-4" />
                  Edit
                </Button>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="grid gap-8 lg:grid-cols-3">
          {/* Left Column - Scale Info */}
          <div className="lg:col-span-1 space-y-6">
            {/* Basic Info */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Scale Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <div className="font-medium">{scale.totalItems}</div>
                    <div className="text-muted-foreground">Items</div>
                  </div>
                  <div>
                    <div className="font-medium">
                      {scale.minScore}-{scale.maxScore}
                    </div>
                    <div className="text-muted-foreground">Score Range</div>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  <Badge variant={getFormatBadgeVariant(scale.responseFormat)}>{scale.responseFormat}</Badge>
                  <Badge variant={getScoringBadgeVariant(scale.scoringType)}>{scale.scoringType}</Badge>
                  {scale.isVerified && (
                    <Badge variant="default" className="gap-1">
                      <CheckCircle className="w-3 h-3" />
                      Verified
                    </Badge>
                  )}
                  {scale.isPublic && (
                    <Badge variant="secondary" className="gap-1">
                      <Users className="w-3 h-3" />
                      Public
                    </Badge>
                  )}
                </div>

                {scale.expectedRange && (
                  <div>
                    <div className="text-sm font-medium">Expected Range</div>
                    <div className="text-sm text-muted-foreground">{scale.expectedRange}</div>
                  </div>
                )}

                {scale.citation && (
                  <div>
                    <div className="text-sm font-medium">Citation</div>
                    <div className="text-sm text-muted-foreground italic text-balance">{scale.citation}</div>
                  </div>
                )}

                {scale.instructions && (
                  <div>
                    <div className="text-sm font-medium">Instructions</div>
                    <div className="text-sm text-muted-foreground text-balance">{scale.instructions}</div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Score Interpretation */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Score Interpretation</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {scale.interpretationRanges.map((range) => (
                    <div key={range.id} className="flex items-center gap-3">
                      <div className="w-4 h-4 rounded-full flex-shrink-0" style={{ backgroundColor: range.color }} />
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <span className="font-medium">{range.severity}</span>
                          <span className="text-sm text-muted-foreground">
                            {range.minScore}-{range.maxScore}
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground text-balance">{range.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Actions */}
            <Card>
              <CardContent className="p-4">
                <Button className="w-full" onClick={() => router.push(`/?scale=${scale.id}`)}>
                  Use This Scale
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Detailed View */}
          <div className="lg:col-span-2">
            <Tabs defaultValue="preview" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="preview">Preview</TabsTrigger>
                <TabsTrigger value="items">Items</TabsTrigger>
                <TabsTrigger value="mappings">Response Mappings</TabsTrigger>
              </TabsList>

              <TabsContent value="preview" className="mt-6">
                <ScalePreview scale={scale} />
              </TabsContent>

              <TabsContent value="items" className="mt-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Scale Items</CardTitle>
                    <CardDescription>Questions and statements in this scale</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {/* This would show actual scale items - for now showing placeholder */}
                      <div className="text-center py-8 text-muted-foreground">
                        <BookOpen className="w-8 h-8 mx-auto mb-2" />
                        <p>Scale items would be displayed here</p>
                        <p className="text-sm">This requires the full item configuration data</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="mappings" className="mt-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Response Mappings</CardTitle>
                    <CardDescription>How text responses are converted to numeric values</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {scale.responseFormat === "numeric" ? (
                        <div className="text-center py-8 text-muted-foreground">
                          <p>No response mappings needed for numeric scales</p>
                          <p className="text-sm">Responses are validated against range: {scale.expectedRange}</p>
                        </div>
                      ) : (
                        <div className="text-center py-8 text-muted-foreground">
                          <p>Response mappings would be displayed here</p>
                          <p className="text-sm">This requires the full mapping configuration data</p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </main>
    </div>
  )
}
