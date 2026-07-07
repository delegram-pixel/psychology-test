"use client"

import {
  useEffect,
  useRef,
  useState,
  type ReactNode,
  cloneElement,
  isValidElement,
} from "react"
import { cn } from "@/lib/utils"

interface HeaderMenuProps {
  trigger: ReactNode
  children: ReactNode | ((helpers: { close: () => void }) => ReactNode)
  className?: string
  panelClassName?: string
  align?: "end" | "start"
  label: string
}

export function HeaderMenu({
  trigger,
  children,
  className,
  panelClassName,
  align = "end",
  label,
}: HeaderMenuProps) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    function onPointerDown(event: PointerEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener("pointerdown", onPointerDown)
    return () => document.removeEventListener("pointerdown", onPointerDown)
  }, [open])

  useEffect(() => {
    if (!open) return
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false)
    }
    document.addEventListener("keydown", onKeyDown)
    return () => document.removeEventListener("keydown", onKeyDown)
  }, [open])

  const triggerElement = isValidElement(trigger)
    ? cloneElement(trigger as React.ReactElement<Record<string, unknown>>, {
        onClick: (event: React.MouseEvent) => {
          const original = (trigger as React.ReactElement<{ onClick?: (e: React.MouseEvent) => void }>).props.onClick
          original?.(event)
          setOpen((value) => !value)
        },
        "aria-expanded": open,
        "aria-haspopup": "dialog",
      })
    : trigger

  return (
    <div ref={ref} className={cn("relative", className)}>
      {triggerElement}
      {open && (
        <div
          role="dialog"
          aria-label={label}
          className={cn(
            "absolute top-[calc(100%+0.5rem)] z-50 rounded-md border bg-popover text-popover-foreground shadow-md",
            align === "end" ? "right-0" : "left-0",
            panelClassName,
          )}
        >
          {typeof children === "function" ? children({ close: () => setOpen(false) }) : children}
        </div>
      )}
    </div>
  )
}
