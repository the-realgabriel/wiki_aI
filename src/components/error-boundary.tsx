import { Component, type ReactNode, type ErrorInfo } from "react"
import { Button } from "#components/ui/button"
import { AlertTriangleIcon } from "lucide-react"

type Props = { children: ReactNode }
type State = { error: Error | null }

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("ErrorBoundary caught:", error, info.componentStack)
  }

  render() {
    if (this.state.error) {
      return (
        <div className="flex min-h-svh flex-col items-center justify-center gap-4 p-8 text-center">
          <AlertTriangleIcon className="size-12 text-destructive" />
          <h1 className="text-2xl font-bold">Something went wrong</h1>
          <p className="text-muted-foreground max-w-md">
            {this.state.error.message || "An unexpected error occurred."}
          </p>
          <Button
            onClick={() => {
              this.setState({ error: null })
              window.location.href = "/"
            }}
          >
            Go Home
          </Button>
        </div>
      )
    }
    return this.props.children
  }
}
