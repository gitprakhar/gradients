import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { type VariantProps } from "class-variance-authority"
import { buttonVariants } from "@/components/ui/button"

export interface SectionHeaderProps {
  title: string
  subtitle?: string
  description?: string
  link?: string
  linkHref?: string
  buttonVariant?: VariantProps<typeof buttonVariants>["variant"]
  buttonSize?: VariantProps<typeof buttonVariants>["size"]
  dark?: boolean
  isHero?: boolean
  maxWidth?: "sm" | "md" | "lg" | "xl" | "2xl" | "3xl" | "4xl" | "full"
  className?: string
}

export const SectionHeader = ({
  title,
  subtitle,
  description,
  link,
  linkHref = "#",
  buttonVariant = "link",
  buttonSize = "lg",
  dark = false,
  isHero = false,
  maxWidth = "2xl",
  className
}: SectionHeaderProps) => {
  const maxWidthClasses = {
    sm: "max-w-sm",
    md: "max-w-md",
    lg: "max-w-lg",
    xl: "max-w-xl",
    "2xl": "max-w-2xl",
    "3xl": "max-w-3xl",
    "4xl": "max-w-4xl",
    full: "max-w-full"
  }
  
  return (
    <div className={cn(
      "text-center",
      dark ? "text-white" : "text-black",
      className
    )}>
      <div className={cn(maxWidthClasses[maxWidth], "mx-auto")}>
      {subtitle && (
        <p className={cn(
            "font-sans text-base mb-4",
            dark ? "text-[#a3a3a3]" : "text-gray-600"
        )}>
          {subtitle}
        </p>
      )}
        <h2 className={cn(
          "font-serif",
          isHero ? "text-6xl" : "text-5xl",
          (description || link) && "mb-6",
          dark && "text-white"
        )}>
        {title}
      </h2>
        {description && (
          <p className={cn(
            "font-sans mb-6",
            dark ? "text-[#a3a3a3]" : "text-gray-600"
          )}>
            {description}
          </p>
        )}
      {link && (
        <Button 
          variant={buttonVariant}
          size={buttonSize}
          asChild
          className={cn("font-sans", dark ? "text-[#a3a3a3]" : "")}
        >
          <a href={linkHref}>
            {link}
        </a>
        </Button>
      )}
      </div>
    </div>
  )
}