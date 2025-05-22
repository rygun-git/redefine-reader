import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"

const gradientButtonVariants = cva("relative font-bold text-white overflow-hidden transition-all duration-300", {
  variants: {
    variant: {
      purple: "bg-gradient-to-r from-purple-500 to-purple-700 hover:from-purple-600 hover:to-purple-800",
      blue: "bg-gradient-to-r from-blue-500 to-blue-700 hover:from-blue-600 hover:to-blue-800",
      green: "bg-gradient-to-r from-green-500 to-green-700 hover:from-green-600 hover:to-green-800",
      red: "bg-gradient-to-r from-red-500 to-red-700 hover:from-red-600 hover:to-red-800",
      orange: "bg-gradient-to-r from-orange-500 to-orange-700 hover:from-orange-600 hover:to-orange-800",
      teal: "bg-gradient-to-r from-teal-500 to-teal-700 hover:from-teal-600 hover:to-teal-800",
      pink: "bg-gradient-to-r from-pink-500 to-pink-700 hover:from-pink-600 hover:to-pink-800",
    },
    size: {
      default: "h-10 px-4 py-2",
      sm: "h-9 rounded-md px-3",
      lg: "h-11 rounded-md px-8",
      icon: "h-10 w-10",
    },
  },
  defaultVariants: {
    variant: "purple",
    size: "default",
  },
})

export interface GradientButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof gradientButtonVariants> {
  asChild?: boolean
}

const GradientButton = React.forwardRef<HTMLButtonElement, GradientButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    return <Button className={cn(gradientButtonVariants({ variant, size, className }))} ref={ref} {...props} />
  },
)
GradientButton.displayName = "GradientButton"

export { GradientButton, gradientButtonVariants }
