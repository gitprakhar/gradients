import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { InputWithButton } from "@/components/ui/input-with-button"
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card"
import { Testimonial } from "@/components/ui/testimonial"
import { SectionHeader } from "@/components/ui/sectionheader"
import { ImageTextSection } from "@/components/ui/featuresection"
import { AccordionItem } from "@/components/ui/accordion-item"
import { AccordionList } from "@/components/ui/accordion-list"

export function App() {
  const variants = [
    { name: "default", variant: "default" as const },
    { name: "secondary", variant: "secondary" as const },
    { name: "outline", variant: "outline" as const },
    { name: "destructive", variant: "destructive" as const },
    { name: "ghost", variant: "ghost" as const },
    { name: "link", variant: "link" as const },
  ]

  const sizes = [
    { name: "sm", size: "sm" as const },
    { name: "default", size: "default" as const },
    { name: "lg", size: "lg" as const },
  ]

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">Component Gallery</h1>
          <p className="text-muted-foreground">Button Variants, Sizes, and Input Components</p>
        </div>

        {/* Button Variants Section */}
        <section className="mb-12">
          <h2 className="text-2xl font-semibold mb-6">Button Variants</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {variants.map(({ name, variant }) => (
              <div
                key={variant}
                className="border rounded-lg p-6 bg-card space-y-4"
              >
                <h3 className="text-lg font-medium capitalize mb-4">
                  {name}
                </h3>
                <div className="flex flex-wrap gap-3">
                  {sizes.map(({ name: sizeName, size }) => (
                    <Button key={size} variant={variant} size={size}>
                      {name} {sizeName}
                    </Button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Button Sizes Section */}
        <section className="mb-12">
          <h2 className="text-2xl font-semibold mb-6">Button Sizes</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {sizes.map(({ name, size }) => (
              <div
                key={size}
                className="border rounded-lg p-6 bg-card space-y-4"
              >
                <h3 className="text-lg font-medium capitalize mb-4">
                  {name}
                </h3>
                <div className="flex flex-wrap gap-3">
                  {variants.map(({ name: variantName, variant }) => (
                    <Button key={variant} variant={variant} size={size}>
                      {variantName}
                    </Button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Complete Grid View */}
        <section className="mb-12">
          <h2 className="text-2xl font-semibold mb-6">All Button Combinations</h2>
          <div className="border rounded-lg p-6 bg-card overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-4 font-semibold">Variant / Size</th>
                  {sizes.map(({ name }) => (
                    <th key={name} className="text-center p-4 font-semibold capitalize">
                      {name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {variants.map(({ name: variantName, variant }) => (
                  <tr key={variant} className="border-b last:border-b-0">
                    <td className="p-4 font-medium capitalize">{variantName}</td>
                    {sizes.map(({ size }) => (
                      <td key={size} className="p-4 text-center">
                        <Button variant={variant} size={size}>
                          Button
                        </Button>
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Input Component Section */}
        <section className="mb-12">
          <h2 className="text-2xl font-semibold mb-6">Input Component</h2>
          
          {/* Basic Input States */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div className="border rounded-lg p-6 bg-card space-y-4">
              <h3 className="text-lg font-medium mb-4">Default States</h3>
              <div className="space-y-3">
                <div>
                  <label className="text-sm text-muted-foreground mb-2 block">Default Input</label>
                  <Input placeholder="Enter text..." />
                </div>
                <div>
                  <label className="text-sm text-muted-foreground mb-2 block">With Value</label>
                  <Input defaultValue="Sample text" />
                </div>
                <div>
                  <label className="text-sm text-muted-foreground mb-2 block">Disabled</label>
                  <Input placeholder="Disabled input" disabled />
                </div>
              </div>
            </div>

            <div className="border rounded-lg p-6 bg-card space-y-4">
              <h3 className="text-lg font-medium mb-4">Input Types</h3>
              <div className="space-y-3">
                <div>
                  <label className="text-sm text-muted-foreground mb-2 block">Email</label>
                  <Input type="email" placeholder="email@example.com" />
                </div>
                <div>
                  <label className="text-sm text-muted-foreground mb-2 block">Password</label>
                  <Input type="password" placeholder="Enter password" />
                </div>
                <div>
                  <label className="text-sm text-muted-foreground mb-2 block">Number</label>
                  <Input type="number" placeholder="Enter number" />
                </div>
              </div>
            </div>
          </div>

          {/* Input Sizes and Widths */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="border rounded-lg p-6 bg-card space-y-4">
              <h3 className="text-lg font-medium mb-4">Different Widths</h3>
              <div className="space-y-3">
                <div>
                  <label className="text-sm text-muted-foreground mb-2 block">Full Width</label>
                  <Input placeholder="Full width input" className="w-full" />
                </div>
                <div>
                  <label className="text-sm text-muted-foreground mb-2 block">Half Width</label>
                  <Input placeholder="Half width" className="w-1/2" />
                </div>
                <div>
                  <label className="text-sm text-muted-foreground mb-2 block">Fixed Width (200px)</label>
                  <Input placeholder="Fixed width" className="w-[200px]" />
                </div>
              </div>
            </div>

            <div className="border rounded-lg p-6 bg-card space-y-4">
              <h3 className="text-lg font-medium mb-4">With Labels</h3>
              <div className="space-y-3">
                <div>
                  <label className="text-sm font-medium mb-2 block">Username</label>
                  <Input placeholder="Enter username" />
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block">Email Address</label>
                  <Input type="email" placeholder="your.email@example.com" />
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block">Phone Number</label>
                  <Input type="tel" placeholder="+1 (555) 000-0000" />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Input With Button Component Section */}
        <section className="mb-12">
          <h2 className="text-2xl font-semibold mb-6">Input With Button</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div className="border rounded-lg p-6 bg-card space-y-4">
              <h3 className="text-lg font-medium mb-4">Examples</h3>
              <div className="space-y-3">
                <div>
                  <label className="text-sm text-muted-foreground mb-2 block">Default</label>
                  <InputWithButton
                    placeholder="Enter email..."
                    buttonText="Subscribe"
                  />
                </div>
                <div>
                  <label className="text-sm text-muted-foreground mb-2 block">With Value</label>
                  <InputWithButton
                    defaultValue="user@example.com"
                    buttonText="Send"
                    buttonVariant="default"
                  />
                </div>
                <div>
                  <label className="text-sm text-muted-foreground mb-2 block">Search</label>
                  <InputWithButton
                    type="search"
                    placeholder="Search..."
                    buttonText="Search"
                    buttonVariant="outline"
                  />
                </div>
              </div>
            </div>

            <div className="border rounded-lg p-6 bg-card space-y-4">
              <h3 className="text-lg font-medium mb-4">Different Sizes</h3>
              <div className="space-y-3">
                <div>
                  <label className="text-sm text-muted-foreground mb-2 block">Small Button</label>
                  <InputWithButton
                    placeholder="Enter code..."
                    buttonText="Verify"
                    buttonSize="sm"
                    buttonVariant="outline"
                  />
                </div>
                <div>
                  <label className="text-sm text-muted-foreground mb-2 block">Default Size</label>
                  <InputWithButton
                    placeholder="Enter text..."
                    buttonText="Submit"
                    buttonSize="default"
                  />
                </div>
                <div>
                  <label className="text-sm text-muted-foreground mb-2 block">Large Button</label>
                  <InputWithButton
                    placeholder="Enter text..."
                    buttonText="Submit"
                    buttonSize="lg"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Different Button Variants */}
          <div className="mt-6 border rounded-lg p-6 bg-card">
            <h3 className="text-lg font-medium mb-4">Button Variants</h3>
            <div className="space-y-3">
              <div>
                <label className="text-sm text-muted-foreground mb-2 block">Default Variant</label>
                <InputWithButton
                  placeholder="Enter email..."
                  buttonText="Submit"
                  buttonVariant="default"
                />
              </div>
              <div>
                <label className="text-sm text-muted-foreground mb-2 block">Outline Variant</label>
                <InputWithButton
                  placeholder="Enter email..."
                  buttonText="Submit"
                  buttonVariant="outline"
                />
              </div>
              <div>
                <label className="text-sm text-muted-foreground mb-2 block">Secondary Variant</label>
                <InputWithButton
                  placeholder="Enter email..."
                  buttonText="Submit"
                  buttonVariant="secondary"
                />
              </div>
            </div>
          </div>
        </section>

        {/* Card Component Section */}
        <section className="mb-12">
          <h2 className="text-2xl font-semibold mb-6">Card Component</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Card with Image Placeholder */}
            <Card>
              <CardHeader>
                <CardTitle>Card with Image</CardTitle>
                <CardDescription>
                  Cards can contain any content
                </CardDescription>
                <Button variant="link" size="lg" className="p-0 h-auto justify-start py-2">
                  Learn more
                </Button>
              </CardHeader>
              <CardContent className="p-0">
                <div className="w-full aspect-video bg-gray-300 rounded-md flex items-center justify-center">
                  <span className="text-sm text-muted">Image Placeholder</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Testimonial Component Section */}
        <section className="mb-12">
          <h2 className="text-2xl font-semibold mb-6">Testimonial Component</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6">
            <Testimonial
              video="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=300&fit=crop"
              quote="This product has completely transformed how we work. The ease of use and powerful features make it a must-have for any team."
              author="John Smith"
              title="CEO, Tech Company"
              buttonText="Read customer story"
            />
            <Testimonial
              video="https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400&h=300&fit=crop"
              quote="We've seen incredible results since implementing this solution. Our productivity has increased by 40% and our team loves using it."
              author="Sarah Johnson"
              title="Product Manager, Startup Inc"
              buttonText="View case study"
            />
            <Testimonial
              video="https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400&h=300&fit=crop"
              quote="The best investment we've made this year. It's intuitive, reliable, and has excellent customer support."
              author="Michael Chen"
              title="CTO, Innovation Labs"
            />
          </div>
        </section>

        {/* Section Header Component Section */}
        <section className="mb-12">
          <h2 className="text-2xl font-semibold mb-6">Section Header Component</h2>
          
          <div className="space-y-8">
            {/* Basic Section Header */}
            <div className="border rounded-lg overflow-hidden">
              <SectionHeader
                title="Basic Section Header"
              />
            </div>

            {/* With Subtitle */}
            <div className="border rounded-lg overflow-hidden">
              <SectionHeader
                title="Header with Subtitle"
                subtitle="This is a subtitle that provides additional context"
              />
            </div>

            {/* With Link */}
            <div className="border rounded-lg overflow-hidden">
              <SectionHeader
                title="Header with Link"
                subtitle="Click the link to learn more"
                link="Learn more"
                linkHref="#"
              />
            </div>

            {/* Dark Variant */}
            <div className="border rounded-lg overflow-hidden">
              <SectionHeader
                title="Dark Section Header"
                subtitle="This is a dark variant of the section header"
                link="Explore"
                linkHref="#"
                dark={true}
              />
            </div>

            {/* Complete Example */}
            <div className="border rounded-lg overflow-hidden">
              <SectionHeader
                title="Complete Example"
                subtitle="A section header with all features enabled"
                link="View all features"
                linkHref="#"
                dark={false}
              />
            </div>
          </div>
        </section>

        {/* Feature Section Component Section */}
        <section className="mb-12">
          <h2 className="text-2xl font-semibold mb-6">Feature Section Component</h2>

          <div className="space-y-8">
            {/* Basic Feature Section - Image on Right */}
            <div className="border rounded-lg overflow-hidden p-8">
              <ImageTextSection
                title="Feature with Image on Right"
                description="This is a feature section component with the image positioned on the right side. It includes a title, description, and optional link button."
                image="https://images.unsplash.com/photo-1551434678-e076c223a692?w=800&h=600&fit=crop"
                imagePosition="right"
              />
            </div>

            {/* Feature Section - Image on Left */}
            <div className="border rounded-lg overflow-hidden p-8">
              <ImageTextSection
                title="Feature with Image on Left"
                description="This is a feature section component with the image positioned on the left side. The text content appears on the right."
                image="https://images.unsplash.com/photo-1551434678-e076c223a692?w=800&h=600&fit=crop"
                imagePosition="left"
              />
            </div>

            {/* Feature Section with Link */}
            <div className="border rounded-lg overflow-hidden p-8">
              <ImageTextSection
                title="Feature Section with Link"
                description="This feature section includes a link button below the description text."
                image="https://images.unsplash.com/photo-1551434678-e076c223a692?w=800&h=600&fit=crop"
                imagePosition="right"
                link="Learn more"
                linkHref="#"
              />
            </div>

            {/* Dark Feature Section */}
            <div className="border rounded-lg overflow-hidden bg-black">
              <div className="p-8">
                <ImageTextSection
                  title="Dark Feature Section"
                  description="This is a feature section with dark background styling. The title is white and the description uses a muted gray color."
                  image="https://images.unsplash.com/photo-1551434678-e076c223a692?w=800&h=600&fit=crop"
                  imagePosition="right"
                  dark={true}
                  link="Learn more"
                  linkHref="#"
                />
              </div>
            </div>
          </div>
        </section>

        {/* Accordion Item Component Section */}
        <section className="mb-12">
          <h2 className="text-2xl font-semibold mb-6">Accordion Item Component</h2>
          
          <div className="space-y-6">
            <div className="rounded-lg overflow-hidden bg-card">
              <AccordionItem
                number="02"
                icon={
                  <svg
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                    className="text-teal-500"
                  >
                    <path
                      d="M9 12L11 14L15 10M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                }
                title="Lawsuits & Bankruptcies"
                description="Identify lawsuits, bankruptcies, and other red flags tied to a business."
                link="Learn more"
                linkHref="#"
              />
            </div>

            <div className="rounded-lg overflow-hidden bg-card">
              <AccordionItem
                number="01"
                icon={
                  <svg
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                    className="text-brand"
                  >
                    <path
                      d="M12 2L2 7L12 12L22 7L12 2Z"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <path
                      d="M2 17L12 22L22 17"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <path
                      d="M2 12L12 17L22 12"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                }
                title="Business Intelligence"
                description="Get comprehensive insights and analytics to make data-driven decisions for your business operations."
                link="Learn more"
                linkHref="#"
              />
            </div>

            <div className="rounded-lg overflow-hidden bg-card">
              <AccordionItem
                number="03"
                title="Financial Risk Assessment"
                description="Evaluate financial risks and identify potential issues before they become problems."
              />
            </div>
          </div>
        </section>

        {/* Accordion List Component Section */}
        <section className="mb-12">
          <h2 className="text-2xl font-semibold mb-6">Accordion List Component</h2>
          
          <div className="rounded-lg overflow-hidden bg-card max-w-3xl">
            <AccordionList
              items={[
                {
                  number: "01",
                  icon: (
                    <svg
                      width="24"
                      height="24"
                      viewBox="0 0 24 24"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                      className="text-brand"
                    >
                      <path
                        d="M9 12L11 14L15 10M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  ),
                  title: "Business Verification",
                  description: "Instantly verify the identity, associated contacts, and legitimacy of 100% of U.S. businesses.",
                  link: "Learn more",
                  linkHref: "#"
                },
                {
                  number: "02",
                  icon: (
                    <div className="w-6 h-6 bg-brand rounded flex items-center justify-center text-white text-sm font-bold">
                      A
                    </div>
                  ),
                  title: "KYB Rating",
                  description: "Get comprehensive Know Your Business ratings and risk assessments for better decision making.",
                  link: "Learn more",
                  linkHref: "#"
                },
                {
                  number: "03",
                  icon: (
                    <svg
                      width="24"
                      height="24"
                      viewBox="0 0 24 24"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                      className="text-brand"
                    >
                      <path
                        d="M3 3V21H21M7 16L12 11L16 15L21 10"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  ),
                  title: "Industry Prediction",
                  description: "Predict industry trends and market movements with advanced analytics and machine learning.",
                  link: "Learn more",
                  linkHref: "#"
                },
                {
                  number: "04",
                  icon: (
                    <svg
                      width="24"
                      height="24"
                      viewBox="0 0 24 24"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                      className="text-brand"
                    >
                      <path
                        d="M20 21V19C20 17.9391 19.5786 16.9217 18.8284 16.1716C18.0783 15.4214 17.0609 15 16 15H8C6.93913 15 5.92172 15.4214 5.17157 16.1716C4.42143 16.9217 4 17.9391 4 19V21M16 7C16 9.20914 14.2091 11 12 11C9.79086 11 8 9.20914 8 7C8 4.79086 9.79086 3 12 3C14.2091 3 16 4.79086 16 7Z"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  ),
                  title: "Consumer Solutions",
                  description: "Comprehensive consumer verification and identity solutions for seamless user experiences.",
                  link: "Learn more",
                  linkHref: "#"
                }
              ]}
            />
          </div>
        </section>
      </div>
    </div>
  )
}

export default App
