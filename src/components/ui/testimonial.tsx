import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export interface TestimonialProps {
  video: string
  quote: string
  author: string
  title: string
  buttonText?: string
  className?: string
}

export const Testimonial = ({
  video,
  quote,
  author,
  title,
  buttonText = "Read customer story",
  className
}: TestimonialProps) => {
  return (
<Card className={cn("bg-white border-none", className)}>
  <CardContent className="p-0 pb-6">
    <div className="w-full aspect-video overflow-hidden rounded-xl bg-gray-300">
    </div>
  </CardContent>
  
  <CardContent className="p-6">
    {/* Mobile: stack everything, Desktop: side by side */}
    <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-6">
      
      {/* Left side: Quote + Author */}
      <div className="flex flex-col gap-6 text-center md:text-left">
        <p className="text-2xl md:text-lg">{quote}</p>
        <div>
          <p className="font-semibold">{author}</p>
          <p className="text-sm text-muted-foreground">{title}</p>
        </div>
      </div>
      
      {/* Right side: Button */}
      <Button variant="secondary" size="lg" className="w-full md:w-auto mx-auto md:mx-0">{buttonText}</Button>
    </div>
  </CardContent>
</Card>
  )
}