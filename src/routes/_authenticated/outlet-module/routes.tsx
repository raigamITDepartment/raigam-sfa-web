import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_authenticated/outlet-module/routes')({
  component: RouteComponent,
})

function RouteComponent() {
  return <div>Hello "/_authenticated/outlet-module/routes"!</div>
}
