import { useState } from "react"
import { BrowserRouter, Routes, Route } from "react-router-dom"
import { RootLayout, PageHeader } from "@/components/layout"
import { ProtectedRoute } from "@/components/protected-route"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Slider } from "@/components/ui/slider"
import { Separator } from "@/components/ui/separator"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { Plus, Coffee, Zap } from "lucide-react"
import { AuthProvider } from "@/contexts/auth-context"
import { LoginPage } from "@/features/auth/login-page"

function HomePage() {
  const [sliderValue, setSliderValue] = useState([50])
  const [inputValue, setInputValue] = useState("250")

  return (
    <TooltipProvider>
      <RootLayout>
        <PageHeader
          title="Design System"
          description="Coffee Tracker component showcase"
          actions={
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Add Coffee
            </Button>
          }
        />

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {/* Color Palette */}
          <Card>
            <CardHeader>
              <CardTitle>Color Palette</CardTitle>
              <CardDescription>Coffee-inspired warm tones</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap gap-2">
                <Badge>Default</Badge>
                <Badge variant="secondary">Secondary</Badge>
                <Badge variant="outline">Outline</Badge>
                <Badge variant="destructive">Destructive</Badge>
              </div>
              <div className="grid grid-cols-4 gap-2">
                <div className="h-12 rounded-md bg-primary" title="Primary" />
                <div className="h-12 rounded-md bg-secondary" title="Secondary" />
                <div className="h-12 rounded-md bg-muted" title="Muted" />
                <div className="h-12 rounded-md bg-accent" title="Accent" />
              </div>
            </CardContent>
          </Card>

          {/* Typography */}
          <Card>
            <CardHeader>
              <CardTitle>Typography</CardTitle>
              <CardDescription>Font families and styles</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm text-muted-foreground">Display (DM Sans)</p>
                <p className="font-display text-2xl font-bold">Espresso Shot</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Body (Inter)</p>
                <p className="text-base">Track your daily caffeine intake.</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Mono (JetBrains)</p>
                <p className="font-mono text-lg">
                  <span className="text-primary">250</span> mg
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Form Elements */}
          <Card>
            <CardHeader>
              <CardTitle>Form Elements</CardTitle>
              <CardDescription>Inputs and controls</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="caffeine">Caffeine Amount</Label>
                <div className="relative">
                  <Input
                    id="caffeine"
                    type="number"
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    className="pr-12"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                    mg
                  </span>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Intensity</Label>
                <Slider
                  value={sliderValue}
                  onValueChange={setSliderValue}
                  max={100}
                  step={1}
                />
                <p className="text-right text-sm text-muted-foreground">
                  {sliderValue[0]}%
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Button Variants */}
          <Card className="md:col-span-2 lg:col-span-3">
            <CardHeader>
              <CardTitle>Button Variants</CardTitle>
              <CardDescription>All button styles with 44px touch targets</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap items-center gap-4">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button size="lg">
                      <Coffee className="mr-2 h-4 w-4" />
                      Primary
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Primary action button</TooltipContent>
                </Tooltip>

                <Button variant="secondary" size="lg">
                  <Zap className="mr-2 h-4 w-4" />
                  Secondary
                </Button>

                <Button variant="outline" size="lg">
                  Outline
                </Button>

                <Button variant="ghost" size="lg">
                  Ghost
                </Button>

                <Button variant="destructive" size="lg">
                  Destructive
                </Button>

                <Separator orientation="vertical" className="h-10" />

                <Button size="icon" className="h-11 w-11">
                  <Plus className="h-5 w-5" />
                </Button>

                <Button variant="outline" size="icon" className="h-11 w-11">
                  <Coffee className="h-5 w-5" />
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </RootLayout>
    </TooltipProvider>
  )
}

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <HomePage />
              </ProtectedRoute>
            }
          />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}

export default App
