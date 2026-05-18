import { Route, Routes, BrowserRouter as Router } from 'react-router-dom'
import Dashboard from './pags/dashboard'
import File from './pags/file'
import KnowledgeBase from './pags/know'
import { TooltipProvider } from '@/components/ui/tooltip'
import './App.css'
import Search from './pags/search'

function App() {
  return (
    <TooltipProvider>
      <Router>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/files/*" element={<File />} />
          <Route path="/knowledge-base" element={<KnowledgeBase />} />
          <Route path="/knowledge-base/:slug" element={<KnowledgeBase />} />
          <Route path="/search" element={<Search />} />
        </Routes>
      </Router>
    </TooltipProvider>
  )
}

export default App
