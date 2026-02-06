import { redirect } from 'next/navigation'
import ViewClient from './ViewClient'

interface ViewPageProps {
  params: { locale: string }
  searchParams: { token?: string }
}

export default function ViewPage({ params, searchParams }: ViewPageProps) {
  const { locale } = params
  const token = searchParams?.token
  const expected = process.env.DISPLAY_PUBLIC_TOKEN

  if (expected && token !== expected) {
    redirect(`/${locale}`)
  }

  return <ViewClient />
}
