import { Link } from '#/components/link'

export function NotFound() {
  return (
    <div className="flex flex-col items-center gap-4 py-16 text-center">
      <h1 className="text-3xl font-bold text-foreground sm:text-4xl">404: I Meant to Do That.</h1>
      <p className="text-muted-foreground">
        After failing, the next page you try to access receives +2 <strong>Skl</strong>
      </p>
      <Link to="/" search={{}}>
        Back to the home page
      </Link>
    </div>
  )
}
