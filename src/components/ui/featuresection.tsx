import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"

export interface ImageTextSectionProps {
  title: string
  description: string
  image: string
  imagePosition?: "left" | "right"
  dark?: boolean
  link?: string
  linkHref?: string
  className?: string
}

export const ImageTextSection = ({
    title,
    description,
    imagePosition = "right",
    dark = false,
  link,
  linkHref = "#",
    className
  }: ImageTextSectionProps) => {
    return (
    <div className={cn("flex gap-24 items-center", className)}>
      
      {imagePosition === "left" ? (
        <>
          {/* Image on left */}
          <div className="flex-1 bg-gray-300 rounded-xl w-full aspect-video">
          </div>
          {/* Text on right */}
          <div className="flex-1 flex flex-col justify-center max-w-md">
            <h2 className={cn("text-2xl mb-2", dark && "text-white")}>{title}</h2>
            <p className={cn("text-base mb-4", dark && "text-[#a3a3a3]")}>{description}</p>
            {link && (
              <Button
                variant="link"
                size="lg"
                asChild
                className={cn(dark ? "text-[#a3a3a3]" : "", "justify-start p-0 h-auto")}
              >
                <a href={linkHref}>{link}</a>
                </Button>
              )}
            </div>
        </>
      ) : (
        <>
          {/* Text on left */}
          <div className="flex-1 flex flex-col justify-center max-w-md">
            <h2 className={cn("text-2xl mb-4", dark && "text-white")}>{title}</h2>
            <p className={cn("text-base mb-4", dark && "text-[#a3a3a3]")}>{description}</p>
            {link && (
              <Button
                variant="link"
                size="lg"
                asChild
                className={cn(dark ? "text-[#a3a3a3]" : "", "justify-start p-0 h-auto")}
              >
                <a href={linkHref}>{link}</a>
              </Button>
            )}
              </div>
          {/* Image on right */}
          <div className="flex-1 bg-gray-300 rounded-xl w-full aspect-video">
          </div>
        </>
      )}
      
      </div>
    )
  }