import { useState } from "react"
import { AccordionItem, type AccordionItemProps } from "@/components/ui/accordion-item"
import { cn } from "@/lib/utils"

export interface AccordionListProps {
  items: AccordionItemProps[]
  defaultOpenIndex?: number | null
  className?: string
}

export const AccordionList = ({
  items,
  defaultOpenIndex = null,
  className
}: AccordionListProps) => {
  const [openIndex, setOpenIndex] = useState<number | null>(defaultOpenIndex)

  const handleItemClick = (index: number) => {
    setOpenIndex(openIndex === index ? null : index)
  }

  return (
    <div className={cn("flex flex-col", className)}>
      {items.map((item, index) => {
        const isOpen = openIndex === index
        return (
          <AccordionItem
            key={item.number || index}
            {...item}
            showContent={isOpen}
            onClick={() => handleItemClick(index)}
          />
        )
      })}
    </div>
  )
}
