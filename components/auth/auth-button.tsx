"use client"

import { useSession } from "next-auth/react"
import { SignIn } from "./sign-in"
import { SignOut } from "./sign-out"

export function AuthButton() {
  const { data: session } = useSession()

  if (session) {
    return <SignOut />
  }

  return <SignIn />
}
