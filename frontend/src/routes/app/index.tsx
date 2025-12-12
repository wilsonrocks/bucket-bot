import { createFileRoute, redirect } from '@tanstack/react-router'

export const Route = createFileRoute('/app/')({
  beforeLoad() {
    const authString = localStorage.getItem('auth')
    if (!authString) {
      throw redirect({ to: '/' })
    }
    const { global_name } = JSON.parse(authString)

    console.log(`Hello ${global_name}, you are authorized to be here!`)
  },
})
