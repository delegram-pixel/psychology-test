"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { HelpCircle, FileText, Upload, BarChart3, Download } from "lucide-react"

export function HelpDialog() {
  const [open, setOpen] = useState(false)

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="w-9 h-9 p-0">
          <HelpCircle className="w-4 h-4" />
          <span className="sr-only">Help</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Psychology Test Scoring Platform - Help Guide</DialogTitle>
          <DialogDescription>Learn how to use the platform to score psychological assessments</DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Getting Started */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Getting Started
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-3">
                <div className="text-center">
                  <div className="w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center mx-auto mb-2 text-sm font-bold">
                    1
                  </div>
                  <h4 className="font-semibold mb-1">Select Scale</h4>
                  <p className="text-sm text-muted-foreground">Choose the psychological assessment scale</p>
                </div>
                <div className="text-center">
                  <div className="w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center mx-auto mb-2 text-sm font-bold">
                    2
                  </div>
                  <h4 className="font-semibold mb-1">Upload Data</h4>
                  <p className="text-sm text-muted-foreground">Upload your CSV file with responses</p>
                </div>
                <div className="text-center">
                  <div className="w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center mx-auto mb-2 text-sm font-bold">
                    3
                  </div>
                  <h4 className="font-semibold mb-1">View Results</h4>
                  <p className="text-sm text-muted-foreground">Analyze scores and download reports</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Supported Scales */}
          <Card>
            <CardHeader>
              <CardTitle>Supported Assessment Scales</CardTitle>
              <CardDescription>Currently supported psychological assessment instruments</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">BDI-II</Badge>
                    <span className="font-medium">Beck Depression Inventory-II</span>
                  </div>
                  <p className="text-sm text-muted-foreground">21-item depression severity measure</p>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">GAD-7</Badge>
                    <span className="font-medium">Generalized Anxiety Disorder 7-item</span>
                  </div>
                  <p className="text-sm text-muted-foreground">7-item anxiety symptoms measure</p>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">PHQ-9</Badge>
                    <span className="font-medium">Patient Health Questionnaire-9</span>
                  </div>
                  <p className="text-sm text-muted-foreground">9-item depression screening tool</p>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">Big Five</Badge>
                    <span className="font-medium">Big Five Personality Inventory</span>
                  </div>
                  <p className="text-sm text-muted-foreground">50-item personality assessment</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* File Format */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Upload className="w-5 h-5" />
                File Format Requirements
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h4 className="font-semibold mb-2">Supported Formats</h4>
                <div className="flex gap-2 mb-4">
                  <Badge variant="outline">CSV</Badge>
                  <Badge variant="outline">TSV</Badge>
                  <Badge variant="outline">TXT</Badge>
                </div>
              </div>

              <div>
                <h4 className="font-semibold mb-2">File Structure</h4>
                <div className="bg-muted p-4 rounded-lg font-mono text-sm">
                  <div>participant_id,item_1,item_2,item_3,...</div>
                  <div>P001,Not at all,Several days,Often,...</div>
                  <div>P002,Never,Sometimes,Always,...</div>
                </div>
              </div>

              <div>
                <h4 className="font-semibold mb-2">Column Headers</h4>
                <p className="text-sm text-muted-foreground mb-2">Use any of these formats for item columns:</p>
                <div className="flex flex-wrap gap-2">
                  <Badge variant="outline">item_1, item_2, ...</Badge>
                  <Badge variant="outline">1, 2, 3, ...</Badge>
                  <Badge variant="outline">q1, q2, q3, ...</Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Response Formats */}
          <Card>
            <CardHeader>
              <CardTitle>Response Formats</CardTitle>
              <CardDescription>Accepted response formats for different scales</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h4 className="font-semibold mb-2">GAD-7 & PHQ-9 (0-3 Scale)</h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <strong>0:</strong> Not at all, Never, None, No
                  </div>
                  <div>
                    <strong>1:</strong> Several days, Sometimes, Rarely
                  </div>
                  <div>
                    <strong>2:</strong> More than half the days, Often, Frequently
                  </div>
                  <div>
                    <strong>3:</strong> Nearly every day, Always, Daily
                  </div>
                </div>
              </div>

              <div>
                <h4 className="font-semibold mb-2">Big Five (1-5 Scale)</h4>
                <div className="grid grid-cols-1 gap-2 text-sm">
                  <div>
                    <strong>1:</strong> Strongly disagree, Completely disagree
                  </div>
                  <div>
                    <strong>2:</strong> Disagree, Somewhat disagree
                  </div>
                  <div>
                    <strong>3:</strong> Neutral, Neither agree nor disagree
                  </div>
                  <div>
                    <strong>4:</strong> Agree, Somewhat agree
                  </div>
                  <div>
                    <strong>5:</strong> Strongly agree, Completely agree
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Results */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="w-5 h-5" />
                Understanding Results
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h4 className="font-semibold mb-2">Overview Tab</h4>
                <p className="text-sm text-muted-foreground">
                  Summary statistics, severity distribution, and key metrics for your dataset.
                </p>
              </div>

              <div>
                <h4 className="font-semibold mb-2">Detailed Results Tab</h4>
                <p className="text-sm text-muted-foreground">
                  Individual participant scores with filtering and sorting options.
                </p>
              </div>

              <div>
                <h4 className="font-semibold mb-2">Visualizations Tab</h4>
                <p className="text-sm text-muted-foreground">
                  Charts showing score distributions and severity breakdowns.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Export */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Download className="w-5 h-5" />
                Exporting Results
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h4 className="font-semibold mb-2">CSV Export</h4>
                <p className="text-sm text-muted-foreground">
                  Spreadsheet-friendly format with participant scores, interpretations, and processing status.
                </p>
              </div>

              <div>
                <h4 className="font-semibold mb-2">JSON Export</h4>
                <p className="text-sm text-muted-foreground">
                  Complete dataset including session metadata, scale information, and detailed results.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  )
}
