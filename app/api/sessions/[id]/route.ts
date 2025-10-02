import { NextRequest, NextResponse } from "next/server"
import { PrismaClient } from "@prisma/client"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/app/api/auth/[...nextauth]/route"

const prisma = new PrismaClient()

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)

  if (!session?.user?.id) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
  }

  const { id } = params

  try {
    const uploadSession = await prisma.uploadSession.findUnique({
      where: {
        id: id,
      },
      include: {
        results: true,
      },
    })

    if (!uploadSession) {
      return NextResponse.json({ message: "Session not found" }, { status: 404 })
    }

    if (uploadSession.userId !== session.user.id) {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 })
    }

    // Convert Prisma's Decimal to number and ensure JSON fields are objects
    const results = uploadSession.results.map((r) => ({
      ...r,
      totalScore: Number(r.totalScore),
      responses: r.responsesJson,
      scores: r.scoresJson,
      processingErrors: r.processingErrorsJson,
    }))

    return NextResponse.json({ ...uploadSession, results }, { status: 200 })
  } catch (error) {
    console.error("Error fetching session:", error)
    return NextResponse.json({ message: "Error fetching session" }, { status: 500 })
  }
}
