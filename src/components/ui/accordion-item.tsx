import * as React from "react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export interface AccordionItemProps {
  number?: string
  icon?: React.ReactNode
  title: string
  description: string
  link?: string
  linkHref?: string
  className?: string
}

interface AccordionItemInternalProps extends AccordionItemProps {
  onClick?: () => void
  showContent?: boolean
}

export const AccordionItem = ({
  number,
  icon,
  title,
  description,
  link = "Learn more",
  linkHref = "#",
  onClick,
  showContent = true,
  className
}: AccordionItemInternalProps) => {
  return (
    <div className={cn("flex flex-col", className)}>
      {/* Header: Icon + Title on left, Number on right */}
      <div 
        className={cn(
          "flex items-start justify-between gap-4 py-6",
          onClick && "cursor-pointer"
        )}
        onClick={onClick}
      >
        <div className="flex items-center gap-3">
          {icon && <div className="flex-shrink-0">{icon}</div>}
          <h3 className="font-semibold leading-none tracking-tight text-xl">
            {title}
          </h3>
        </div>
        {number && (
          <span className="text-xs text-muted-foreground flex-shrink-0">
            {number}
          </span>
        )}
      </div>
      
      {/* Description and Link */}
      <div
        className={cn(
          "grid transition-all duration-700 ease-in-out",
          showContent ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
        )}
      >
        <div className="overflow-hidden">
          <div className={cn("pb-6", icon ? "pl-9" : "")}>
            <p className="text-sm text-muted-foreground mb-1.5">
              {description}
            </p>
            
            {link && (
              <Button 
                variant="link" 
                asChild
                className="justify-start p-0 h-auto"
              >
                <a href={linkHref}>{link}</a>
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
