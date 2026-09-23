import { Link } from '#/components/link'
import fluffernutterUrl from '#/assets/fluffernutter.webp'

export function NotFound() {
  return (
    <div className="flex flex-col items-center gap-4 py-16 text-center">
      <img
        src={fluffernutterUrl}
        alt="Fluffernutter, a Gremlin riding a rabbit"
        width={240}
        height={239}
        className="w-60"
      />
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
