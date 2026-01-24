import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom"
import { ProtectedRoute } from "@/components/protected-route"
import { AuthProvider } from "@/contexts/auth-context"
import { LoginPage } from "@/features/auth/login-page"
import { LibraryPage } from "@/features/library"
import {
  ExperimentsListPage,
  NewExperimentPage,
  ExperimentDetailPage,
  DefaultsPage,
} from "@/features/experiments"
import { EffectMappingsPage } from "@/features/effect-mappings"
import { ReferenceDataPage } from "@/features/reference-data"

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
                <Navigate to="/experiments" replace />
              </ProtectedRoute>
            }
          />
          <Route
            path="/experiments"
            element={
              <ProtectedRoute>
                <ExperimentsListPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/experiments/new"
            element={
              <ProtectedRoute>
                <NewExperimentPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/experiments/:id"
            element={
              <ProtectedRoute>
                <ExperimentDetailPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/library"
            element={
              <ProtectedRoute>
                <LibraryPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/settings/defaults"
            element={
              <ProtectedRoute>
                <DefaultsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/effect-mappings"
            element={
              <ProtectedRoute>
                <EffectMappingsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/settings/reference-data"
            element={
              <ProtectedRoute>
                <ReferenceDataPage />
              </ProtectedRoute>
            }
          />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}

export default App
