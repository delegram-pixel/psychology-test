"use client"

import { useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScaleLibrary } from "@/components/scales/scale-library"
import { ScaleWizard } from "@/components/scales/scale-wizard"
import { Plus, Search, BookOpen } from "lucide-react"
import { scoringEngine } from "@/lib/scoring-engine"

export default function ScalesPage() {
  const [showWizard, setShowWizard] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const [filterType, setFilterType] = useState<"all" | "public" | "personal">("all")

  const availableScales = scoringEngine.getAvailableScales()

  const filteredScales = availableScales.filter((scale) => {
    const matchesSearch =
      scale.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      scale.description.toLowerCase().includes(searchTerm.toLowerCase())

    const matchesFilter =
      filterType === "all" ||
      (filterType === "public" && scale.isPublic) ||
      (filterType === "personal" && !scale.isPublic)

    return matchesSearch && matchesFilter
  })

  if (showWizard) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-8">
          <ScaleWizard onClose={() => setShowWizard(false)} />
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-10 h-10 bg-primary rounded-lg">
                <BookOpen className="w-5 h-5 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-balance">Scale Library</h1>
                <p className="text-muted-foreground">Manage and create psychological assessment scales</p>
              </div>
            </div>
            <Button onClick={() => setShowWizard(true)} className="gap-2">
              <Plus className="w-4 h-4" />
              Create New Scale
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {/* Search and Filter */}
        <div className="mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Search scales by name or description..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <div className="flex gap-2">
                  <Button
                    variant={filterType === "all" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setFilterType("all")}
                  >
                    All Scales
                  </Button>
                  <Button
                    variant={filterType === "public" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setFilterType("public")}
                  >
                    Public
                  </Button>
                  <Button
                    variant={filterType === "personal" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setFilterType("personal")}
                  >
                    Personal
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Scale Library */}
        <ScaleLibrary scales={filteredScales} />

        {/* Empty State */}
        {filteredScales.length === 0 && (
          <Card className="text-center py-12">
            <CardContent>
              <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                <BookOpen className="w-8 h-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-semibold mb-2">No Scales Found</h3>
              <p className="text-muted-foreground mb-4">
                {searchTerm ? "No scales match your search criteria." : "Get started by creating your first scale."}
              </p>
              <Button onClick={() => setShowWizard(true)} className="gap-2">
                <Plus className="w-4 h-4" />
                Create New Scale
              </Button>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  )
}
