import { createFileRoute, notFound, redirect } from '@tanstack/react-router'
import { fetchCmsPage } from '#/queries'
import { SITE_NAME, seo } from '#/helpers/seo'

// CMS pages. A splat route ranks below every other route, so a CMS page can
// never shadow a built-in one (and the admin rejects such URLs anyway).
export const Route = createFileRoute('/$')({
  loader: async ({ params }) => {
    const path = `/${params._splat ?? ''}`
    const result = await fetchCmsPage({ data: { path } })
    if (!result) throw notFound()
    if (result.kind === 'redirect') throw redirect({ href: result.to, statusCode: 301 })
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
    <article className="flex flex-col gap-4">
      <h1 className="text-2xl font-bold text-foreground">{title}</h1>
      {/* Rendered server-side from backend-validated ProseMirror JSON; the renderer escapes text. */}
      <div className="cms-content" dangerouslySetInnerHTML={{ __html: html }} />
    </article>
  )
}
