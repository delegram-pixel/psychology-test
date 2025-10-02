"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { Clock, FileText, CheckCircle } from "lucide-react"

export default function SessionsPage() {
  const { data: session } = useSession()
  const [sessions, setSessions] = useState([])

  useEffect(() => {
    if (session?.user?.id) {
      fetch("/api/sessions")
        .then((res) => res.json())
        .then((data) => setSessions(data))
    }
  }, [session])

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-6">
          <h1 className="text-2xl font-bold">My Sessions</h1>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {sessions.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {sessions.map((s) => (
              <Card key={s.id}>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span>{s.fileName}</span>
                    <Link href={`/sessions/${s.id}`}>
                      <Button variant="outline" size="sm">
                        View
                      </Button>
                    </Link>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4" />
                    <span>{s.selectedScaleId}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4" />
                    <span>
                      {s.processedResponses} / {s.totalResponses} responses
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    <span>{new Date(s.uploadedAt).toLocaleString()}</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <p>No sessions found.</p>
        )}
      </main>
    </div>
  )
}
