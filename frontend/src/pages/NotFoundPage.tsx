import { Link } from "react-router-dom"

export function NotFoundPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="text-center">
        <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-muted">
          <span className="text-3xl font-bold text-muted-foreground">404</span>
        </div>
        <h1 className="mb-2 text-2xl font-semibold text-foreground">Page not found</h1>
        <p className="mb-6 text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <Link
          to="/"
          className="inline-flex h-10 items-center justify-center rounded-md bg-primary px-6 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary-hover"
        >
          Go to Home
        </Link>
      </div>
    </div>
  )
}
