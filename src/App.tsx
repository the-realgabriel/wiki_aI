import { Route, Routes, BrowserRouter as Router } from 'react-router-dom'
import Dashboard from './pags/dashboard'
import File from './pags/file'
import KnowledgeBase from './pags/know'
import Login from './pags/auth/login'
import Signup from './pags/auth/signup'
import { TooltipProvider } from '@/components/ui/tooltip'
import { AuthProvider } from '#contexts/AuthContext'
import { ProtectedRoute } from '#components/protected-route'
import './App.css'
import Search from './pags/search'

function App() {
  return (
    <TooltipProvider>
      <AuthProvider>
        <Router>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
            <Route path="/files/*" element={<ProtectedRoute><File /></ProtectedRoute>} />
            <Route path="/knowledge-base" element={<ProtectedRoute><KnowledgeBase /></ProtectedRoute>} />
            <Route path="/knowledge-base/:slug" element={<ProtectedRoute><KnowledgeBase /></ProtectedRoute>} />
            <Route path="/search" element={<ProtectedRoute><Search /></ProtectedRoute>} />
          </Routes>
        </Router>
      </AuthProvider>
    </TooltipProvider>
  )
}

export default App
