import { lazy, Suspense } from 'react'
import { Route, Routes, BrowserRouter as Router } from 'react-router-dom'
import { TooltipProvider } from '@/components/ui/tooltip'
import { AuthProvider } from '#contexts/AuthContext'
import { ProtectedRoute } from '#components/protected-route'
import { NotFound } from '#components/not-found'
import { ErrorBoundary } from '#components/error-boundary'
import './App.css'

const Dashboard = lazy(() => import('./pags/dashboard'))
const File = lazy(() => import('./pags/file'))
const KnowledgeBase = lazy(() => import('./pags/know'))
const Login = lazy(() => import('./pags/auth/login'))
const Signup = lazy(() => import('./pags/auth/signup'))
const Search = lazy(() => import('./pags/search'))
const Calendar = lazy(() => import('./pags/calendar'))

function PageLoader() {
  return (
    <div className="flex items-center justify-center min-h-svh">
      <div className="size-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
    </div>
  )
}

function App() {
  return (
    <TooltipProvider>
      <AuthProvider>
        <Router>
          <ErrorBoundary>
            <Suspense fallback={<PageLoader />}>
              <Routes>
                <Route path="/login" element={<Login />} />
                <Route path="/signup" element={<Signup />} />
                <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
                <Route path="/files/*" element={<ProtectedRoute><File /></ProtectedRoute>} />
                <Route path="/knowledge-base" element={<ProtectedRoute><KnowledgeBase /></ProtectedRoute>} />
                <Route path="/knowledge-base/:slug" element={<ProtectedRoute><KnowledgeBase /></ProtectedRoute>} />
                <Route path="/search" element={<ProtectedRoute><Search /></ProtectedRoute>} />
                <Route path="/calendar" element={<ProtectedRoute><Calendar /></ProtectedRoute>} />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </Suspense>
          </ErrorBoundary>
        </Router>
      </AuthProvider>
    </TooltipProvider>
  )
}

export default App
