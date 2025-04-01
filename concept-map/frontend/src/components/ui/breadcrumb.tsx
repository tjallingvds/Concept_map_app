import * as React from "react"
import { ChevronRightIcon, HomeIcon } from "lucide-react"
import { cn } from "../../lib/utils"

interface BreadcrumbProps extends React.HTMLAttributes<HTMLDivElement> {}

const Breadcrumb = React.forwardRef<HTMLDivElement, BreadcrumbProps>(
  ({ className, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          "flex flex-wrap items-center gap-1.5 break-words text-sm text-muted-foreground",
          className
        )}
        {...props}
      />
    )
  }
)
Breadcrumb.displayName = "Breadcrumb"

interface BreadcrumbItemProps extends React.HTMLAttributes<HTMLLIElement> {
  current?: boolean
}

const BreadcrumbItem = React.forwardRef<HTMLLIElement, BreadcrumbItemProps>(
  ({ className, current, ...props }, ref) => {
    return (
      <li
        ref={ref}
        aria-current={current ? "page" : undefined}
        className={cn("inline-flex items-center gap-1.5", className)}
        {...props}
      />
    )
  }
)
BreadcrumbItem.displayName = "BreadcrumbItem"

const BreadcrumbLink = React.forwardRef<
  HTMLAnchorElement,
  React.ComponentPropsWithoutRef<"a">
>(({ className, ...props }, ref) => {
  return (
    <a
      ref={ref}
      className={cn("hover:text-foreground transition-colors", className)}
      {...props}
    />
  )
})
BreadcrumbLink.displayName = "BreadcrumbLink"

const BreadcrumbSeparator = ({
  children,
  className,
  ...props
}: React.ComponentProps<"li">) => {
  return (
    <li
      aria-hidden
      className={cn("flex items-center", className)}
      {...props}
    >
      {children || <ChevronRightIcon className="h-4 w-4" />}
    </li>
  )
}
BreadcrumbSeparator.displayName = "BreadcrumbSeparator"

interface BreadcrumbHomeProps extends React.ComponentPropsWithoutRef<"a"> {}

const BreadcrumbHome = React.forwardRef<HTMLAnchorElement, BreadcrumbHomeProps>(
  ({ className, ...props }, ref) => {
    return (
      <a
        ref={ref}
        className={cn("hover:text-foreground transition-colors", className)}
        {...props}
      >
        <HomeIcon className="h-4 w-4" />
        <span className="sr-only">Home</span>
      </a>
    )
  }
)
BreadcrumbHome.displayName = "BreadcrumbHome"

export {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbSeparator,
  BreadcrumbHome,
}
