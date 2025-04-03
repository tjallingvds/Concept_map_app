import * as React from "react"
import { type LucideIcon } from "lucide-react"

import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"

export function NavSecondary({
  items,
  className,
  onAction,
}: {
  items: {
    title: string
    url: string
    icon: LucideIcon
    action?: string
  }[]
  className?: string
  onAction?: (action?: string) => void
}) {
  return (
    <SidebarGroup className={className}>
      <SidebarMenu>
        {items.map((item) => (
          <SidebarMenuItem key={item.title}>
            <SidebarMenuButton
              asChild={!item.action}
              tooltip={item.title}
              onClick={item.action ? () => onAction?.(item.action) : undefined}
            >
              {item.action ? (
                <button>
                  <item.icon />
                  <span>{item.title}</span>
                </button>
              ) : (
                <a href={item.url}>
                  <item.icon />
                  <span>{item.title}</span>
                </a>
              )}
            </SidebarMenuButton>
          </SidebarMenuItem>
        ))}
      </SidebarMenu>
    </SidebarGroup>
  )
}
