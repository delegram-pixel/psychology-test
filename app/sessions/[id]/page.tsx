"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { ResultsDisplay } from "@/components/results-display"
import { scoringEngine } from "@/lib/scoring-engine"

export default function SessionDetailsPage({ params }: { params: { id: string } }) {
  const { data: session } = useSession()
  const [uploadSession, setUploadSession] = useState(null)
  const [results, setResults] = useState([])
  const [scale, setScale] = useState(null)

  useEffect(() => {
    if (session?.user?.id && params.id) {
      fetch(`/api/sessions/${params.id}`)
        .then((res) => res.json())
        .then((data) => {
          setUploadSession(data)
          setResults(data.results)
          setScale(scoringEngine.getScale(data.selectedScaleId))
        })
    }
  }, [session, params.id])

  if (!uploadSession) {
    return <div>Loading...</div>
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-6">
          <h1 className="text-2xl font-bold">Session Details</h1>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <ResultsDisplay results={results} scale={scale} session={uploadSession} />
      </main>
    </div>
  )
}
