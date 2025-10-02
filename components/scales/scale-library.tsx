"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { MoreHorizontal, Eye, Edit, Copy, Trash2, CheckCircle, Users } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import type { Scale } from "@/lib/types"

interface ScaleLibraryProps {
  scales: Scale[]
}

export function ScaleLibrary({ scales }: ScaleLibraryProps) {
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
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
      {scales.map((scale) => (
        <Card key={scale.id} className="hover:shadow-md transition-shadow">
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <CardTitle className="text-lg text-balance">{scale.name}</CardTitle>
                <CardDescription className="mt-1 text-balance">{scale.description}</CardDescription>
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm">
                    <MoreHorizontal className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem>
                    <Eye className="w-4 h-4 mr-2" />
                    View Details
                  </DropdownMenuItem>
                  <DropdownMenuItem>
                    <Copy className="w-4 h-4 mr-2" />
                    Duplicate
                  </DropdownMenuItem>
                  {!scale.isPublic && (
                    <>
                      <DropdownMenuItem>
                        <Edit className="w-4 h-4 mr-2" />
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem className="text-destructive">
                        <Trash2 className="w-4 h-4 mr-2" />
                        Delete
                      </DropdownMenuItem>
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Scale Metrics */}
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

            {/* Badges */}
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

            {/* Citation */}
            {scale.citation && <p className="text-xs text-muted-foreground italic text-balance">{scale.citation}</p>}

            {/* Actions */}
            <div className="flex gap-2 pt-2">
              <Button size="sm" className="flex-1">
                Use Scale
              </Button>
              <Button variant="outline" size="sm">
                Preview
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
