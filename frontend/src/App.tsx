import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { AuthProvider } from '@/contexts/AuthContext';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import Layout from '@/components/layout/Layout';
import LoginPage from '@/pages/LoginPage';
import HomePage from '@/pages/HomePage';
import LibraryPage from '@/pages/LibraryPage';
import PreferencesPage from '@/pages/PreferencesPage';
import ExperimentsPage from '@/pages/ExperimentsPage';
import ExperimentNewPage from '@/pages/ExperimentNewPage';
import ExperimentDetailPage from '@/pages/ExperimentDetailPage';
import AnalysisPage from '@/pages/AnalysisPage';
import CoffeesPage from '@/pages/CoffeesPage';
import CoffeeDetailPage from '@/pages/CoffeeDetailPage';

function App() {
  return (
    <BrowserRouter>
      <ThemeProvider>
        <AuthProvider>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <Layout>
                  <HomePage />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/coffees"
            element={
              <ProtectedRoute>
                <Layout>
                  <CoffeesPage />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/coffees/:id"
            element={
              <ProtectedRoute>
                <Layout>
                  <CoffeeDetailPage />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/library"
            element={
              <ProtectedRoute>
                <Layout>
                  <LibraryPage />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/library/filter-papers"
            element={
              <ProtectedRoute>
                <Layout>
                  <LibraryPage />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/library/mineral-profiles"
            element={
              <ProtectedRoute>
                <Layout>
                  <LibraryPage />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/preferences"
            element={
              <ProtectedRoute>
                <Layout>
                  <PreferencesPage />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/experiments"
            element={
              <ProtectedRoute>
                <Layout>
                  <ExperimentsPage />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/experiments/new"
            element={
              <ProtectedRoute>
                <Layout>
                  <ExperimentNewPage />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/experiments/:id"
            element={
              <ProtectedRoute>
                <Layout>
                  <ExperimentDetailPage />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/analysis"
            element={
              <ProtectedRoute>
                <Layout>
                  <AnalysisPage />
                </Layout>
              </ProtectedRoute>
            }
          />
        </Routes>
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
}

export default App;
