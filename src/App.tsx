import { lazy, Suspense } from "react"
import { Route, Routes, BrowserRouter as Router } from "react-router-dom"
import { TooltipProvider } from "@/components/ui/tooltip"
import { AuthProvider } from "#contexts/AuthContext"
import { ThemeProvider } from "#contexts/ThemeContext"
import { ProtectedRoute } from "#components/protected-route"
import { NotFound } from "#components/not-found"
import { ErrorBoundary } from "#components/error-boundary"
import { RightSidebarProvider, PageContentProvider, RightSidebar } from "#components/right-sidebar"
import { SiteHeader } from "#components/site-header"
import { AppSidebar } from "#components/app-sidebar"
import {
  SidebarInset,
  SidebarProvider,
} from "#components/ui/sidebar"
import "./App.css"

const Dashboard = lazy(() => import("./pags/dashboard"))
const File = lazy(() => import("./pags/file"))
const KnowledgeBase = lazy(() => import("./pags/know"))
const Login = lazy(() => import("./pags/auth/login"))
const Signup = lazy(() => import("./pags/auth/signup"))
const Search = lazy(() => import("./pags/search"))
const Calendar = lazy(() => import("./pags/calendar"))
const Admin = lazy(() => import("./pags/admin/index"))
const AdminRegister = lazy(() => import("./pags/admin/register"))
const FileView = lazy(() => import("./pags/file-view"))

function PageLoader() {
  return (
    <div className="flex items-center justify-center min-h-svh">
      <div className="size-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
    </div>
  )
}

function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="[--header-height:calc(--spacing(14))]">
      <SidebarProvider defaultOpen={true} className="flex flex-col">
        <SiteHeader />
        <div className="flex flex-1">
          <AppSidebar />
          <SidebarInset>
            <main className="p-4 sm:p-6 lg:p-8 max-w-4xl mx-auto w-full">
              {children}
            </main>
          </SidebarInset>
        </div>
        <RightSidebar />
      </SidebarProvider>
    </div>
  )
}

function App() {
  return (
    <TooltipProvider>
      <AuthProvider>
        <ThemeProvider>
          <RightSidebarProvider>
            <PageContentProvider>
              <Router>
                <ErrorBoundary>
                  <Suspense fallback={<PageLoader />}>
                    <Routes>
                      <Route path="/login" element={<Login />} />
                      <Route path="/signup" element={<Signup />} />
                      <Route path="/" element={<ProtectedRoute><AppShell><Dashboard /></AppShell></ProtectedRoute>} />
                      <Route path="/files/*" element={<ProtectedRoute><AppShell><File /></AppShell></ProtectedRoute>} />
                      <Route path="/file/:filename" element={<ProtectedRoute><AppShell><FileView /></AppShell></ProtectedRoute>} />
                      <Route path="/knowledge-base" element={<ProtectedRoute><AppShell><KnowledgeBase /></AppShell></ProtectedRoute>} />
                      <Route path="/knowledge-base/:slug" element={<ProtectedRoute><AppShell><KnowledgeBase /></AppShell></ProtectedRoute>} />
                      <Route path="/search" element={<ProtectedRoute><AppShell><Search /></AppShell></ProtectedRoute>} />
                      <Route path="/calendar" element={<ProtectedRoute><AppShell><Calendar /></AppShell></ProtectedRoute>} />
                      <Route path="/admin/register" element={<ProtectedRoute><AppShell><AdminRegister /></AppShell></ProtectedRoute>} />
                      <Route path="/admin/*" element={<ProtectedRoute><AppShell><Admin /></AppShell></ProtectedRoute>} />
                      <Route path="*" element={<NotFound />} />
                    </Routes>
                  </Suspense>
                </ErrorBoundary>
              </Router>
            </PageContentProvider>
          </RightSidebarProvider>
        </ThemeProvider>
      </AuthProvider>
    </TooltipProvider>
  )
}

export default App
