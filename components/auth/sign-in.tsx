"use client"

import { signIn } from "next-auth/react"
import { Button } from "@/components/ui/button"

export function SignIn() {
  return <Button onClick={() => signIn("google")}>Sign In</Button>
}
