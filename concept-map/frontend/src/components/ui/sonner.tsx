import { Toaster as Sonner } from "sonner"
import React from "react"

const Toaster = ({ ...props }) => {
  return (
    <Sonner
      className="toaster group"
      toastOptions={{
        style: {
          background: "var(--background)",
          color: "var(--foreground)",
          border: "1px solid var(--border)",
        }
      }}
      {...props}
    />
  )
}

export { Toaster }
