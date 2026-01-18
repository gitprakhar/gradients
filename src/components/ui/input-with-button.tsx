import * as React from "react"
import { Input } from "@/components/ui/input"
import { Button, type ButtonProps } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export interface InputWithButtonProps
  extends React.ComponentProps<"input"> {
  buttonText?: string
  buttonVariant?: ButtonProps["variant"]
  buttonSize?: ButtonProps["size"]
  onButtonClick?: () => void
  buttonProps?: Omit<ButtonProps, "onClick" | "children">
}

const InputWithButton = React.forwardRef<HTMLInputElement, InputWithButtonProps>(
  (
    {
      className,
      buttonText = "Submit",
      buttonVariant = "default",
      buttonSize = "default",
      onButtonClick,
      buttonProps,
      ...props
    },
    ref
  ) => {
    return (
      <div className={cn("relative flex w-full items-center", className)}>
        <Input
          ref={ref}
          className={cn(
            "pr-24",
            buttonSize === "sm" && "h-11",
            buttonSize === "default" && "h-12",
            buttonSize === "lg" && "h-15"
          )}
          {...props}
        />
        <Button
          variant={buttonVariant}
          size={buttonSize}
          onClick={onButtonClick}
          className="absolute right-1.5 top-1.5 bottom-1.5"
          {...buttonProps}
        >
          {buttonText}
        </Button>
      </div>
    )
  }
)
InputWithButton.displayName = "InputWithButton"

export { InputWithButton }
