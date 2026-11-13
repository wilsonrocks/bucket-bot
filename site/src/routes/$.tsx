import { createFileRoute, notFound, redirect } from '@tanstack/react-router'
import { fetchCmsPage } from '#/queries'
import { SITE_NAME, seo } from '#/helpers/seo'

// CMS pages. A splat route ranks below every other route, so a CMS page can
// never shadow a built-in one (and the admin rejects such URLs anyway).
export const Route = createFileRoute('/$')({
  loader: async ({ params, location }) => {
    const path = `/${params._splat ?? ''}`
    // Page URLs are lowercase, so /How-It-Works (or /Teams) goes to the real
    // URL. Permanent is safe here: the lowercase form is always canonical.
    const lower = path.toLowerCase()
    if (lower !== path) throw redirect({ href: lower + location.searchStr, statusCode: 301 })

    const result = await fetchCmsPage({ data: { path } })
    if (!result) throw notFound()
    // Temporary, not 301: browsers cache 301s forever, which would break the
    // old URL if a new page is later created there.
    if (result.kind === 'redirect') throw redirect({ href: result.to, statusCode: 302 })
    return { ...result, path }
  },
  head: ({ loaderData }) =>
    loaderData
      ? seo({
          title: `${loaderData.title} — ${SITE_NAME}`,
          description: loaderData.description || undefined,
          path: loaderData.path,
        })
      : {},
  component: RouteComponent,
})

function RouteComponent() {
  const { title, html } = Route.useLoaderData()
  return (
    <article className="flex max-w-3xl flex-col gap-4">
      <h1 className="text-2xl font-bold text-foreground">{title}</h1>
      {/* Rendered server-side from backend-validated ProseMirror JSON; the renderer escapes text. */}
      <div className="cms-content" dangerouslySetInnerHTML={{ __html: html }} />
    </article>
  )
}
