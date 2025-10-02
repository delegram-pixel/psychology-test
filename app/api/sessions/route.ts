export const dynamic = 'force-dynamic' // Prevent static optimization

import { NextRequest, NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/app/api/auth/[...nextauth]/route"

export async function GET() {
  const session = await getServerSession(authOptions)

  if (!session?.user?.id) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
  }

  try {
    const sessions = await prisma.uploadSession.findMany({
      where: {
        userId: session.user.id,
      },
      orderBy: {
        uploadedAt: "desc",
      },
    })
    return NextResponse.json(sessions, { status: 200 })
  } catch (error) {
    console.error("Error fetching sessions:", error)
    return NextResponse.json({ message: "Error fetching sessions" }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)

  if (!session?.user?.id) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
  }

  try {
    const { uploadSession, results } = await req.json()

    const createdSession = await prisma.uploadSession.create({
      data: {
        ...uploadSession,
        userId: session.user.id,
        results: {
          create: results.map((result: {
            participantId: string;
            totalScore: number;
            interpretation: string;
            severity: string;
            responses?: Record<string, unknown>;
            scores?: Record<string, unknown>;
            processingErrors?: unknown[];
          }) => ({
            participantId: result.participantId,
            totalScore: result.totalScore,
            interpretation: result.interpretation,
            severity: result.severity,
            responsesJson: result.responses || {},
            scoresJson: result.scores || {},
            processingErrorsJson: result.processingErrors || [],
          })),
        },
      },
      include: {
        results: true,
      },
    })

    return NextResponse.json(createdSession, { status: 201 })
  } catch (error) {
    console.error("Error saving session:", error)
    return NextResponse.json({ message: "Error saving session" }, { status: 500 })
  }
}
