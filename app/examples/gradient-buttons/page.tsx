import { GradientButton } from "@/components/ui/gradient-button"

export default function GradientButtonsExample() {
  return (
    <div className="container mx-auto py-10 space-y-8">
      <h1 className="text-3xl font-bold mb-6">Gradient Buttons</h1>

      <div className="space-y-6">
        <div>
          <h2 className="text-xl font-semibold mb-4">Purple Gradient (Default)</h2>
          <div className="flex flex-wrap gap-4">
            <GradientButton>Get started for free</GradientButton>
            <GradientButton size="sm">Small Button</GradientButton>
            <GradientButton size="lg">Large Button</GradientButton>
          </div>
        </div>

        <div>
          <h2 className="text-xl font-semibold mb-4">Other Color Variants</h2>
          <div className="flex flex-wrap gap-4">
            <GradientButton variant="blue">Blue Gradient</GradientButton>
            <GradientButton variant="green">Green Gradient</GradientButton>
            <GradientButton variant="red">Red Gradient</GradientButton>
            <GradientButton variant="orange">Orange Gradient</GradientButton>
            <GradientButton variant="teal">Teal Gradient</GradientButton>
            <GradientButton variant="pink">Pink Gradient</GradientButton>
          </div>
        </div>
      </div>
    </div>
  )
}
