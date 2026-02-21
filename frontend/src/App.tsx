import { BrowserRouter, Routes, Route, Navigate, useParams, useSearchParams } from "react-router-dom"
import { Toaster } from "sonner"
import { AuthProvider } from "@/contexts/AuthContext"
import { ThemeProvider, useTheme } from "@/contexts/ThemeContext"
import { ProtectedRoute } from "@/components/ProtectedRoute"
import { Layout } from "@/components/layout/Layout"
import { LoginPage } from "@/pages/LoginPage"
import { HomePage } from "@/pages/HomePage"
import { EquipmentPage } from "@/pages/EquipmentPage"
import { CoffeesPage } from "@/pages/CoffeesPage"
import { CoffeeDetailPage } from "@/pages/CoffeeDetailPage"
import { BrewFormPage } from "@/pages/BrewFormPage"
import { BrewsPage } from "@/pages/BrewsPage"
import { PreferencesPage } from "@/pages/PreferencesPage"
import { CoffeeFormPage } from "@/pages/CoffeeFormPage"
import { BrewComparisonPage } from "@/pages/BrewComparisonPage"
import { SharePage } from "@/pages/SharePage"
import { NotFoundPage } from "@/pages/NotFoundPage"

function BrewComparisonRedirect() {
  const { id } = useParams<{ id: string }>()
  const [searchParams] = useSearchParams()
  const brews = searchParams.get("brews") || ""
  return (
    <Navigate
      to={`/brews/compare?brews=${brews}&from=coffee&coffee_id=${id}`}
      replace
    />
  )
}

function AppToaster() {
  const { resolved } = useTheme()
  return (
    <Toaster
      theme={resolved}
      position="bottom-right"
      toastOptions={{
        duration: 3000,
      }}
    />
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <ThemeProvider>
        <AuthProvider>
          <AppToaster />
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/share/:token" element={<SharePage />} />
            <Route element={<ProtectedRoute />}>
              <Route element={<Layout />}>
                <Route path="/" element={<HomePage />} />
                <Route path="/coffees" element={<CoffeesPage />} />
                <Route path="/coffees/new" element={<CoffeeFormPage />} />
                <Route path="/coffees/:id/edit" element={<CoffeeFormPage />} />
                <Route path="/coffees/:id/compare" element={<BrewComparisonRedirect />} />
                <Route path="/coffees/:id" element={<CoffeeDetailPage />} />
                <Route path="/equipment" element={<EquipmentPage />} />
                <Route path="/brews" element={<BrewsPage />} />
                <Route path="/brews/compare" element={<BrewComparisonPage />} />
                <Route path="/brews/new" element={<BrewFormPage />} />
                <Route path="/brews/:id/edit" element={<BrewFormPage />} />
                <Route path="/preferences" element={<PreferencesPage />} />
              </Route>
            </Route>
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  )
}
