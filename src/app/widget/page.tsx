import { WidgetView } from '@/components/WidgetView'

interface WidgetPageProps {
  searchParams: Promise<{ mode?: string }>
}

/**
 * `/widget?mode=map|heat` — the iframe-embeddable map surface.
 *
 * This is what makes ATLAS stack-agnostic: a host application on Flask, Vue, or
 * plain HTML embeds one iframe and gets the live 3D map without running any of
 * our code in their bundle.
 *
 * @example
 * <iframe src="http://localhost:4102/widget?mode=heat"
 *         style="border:0;width:100%;height:420px"></iframe>
 */
export default async function WidgetPage({ searchParams }: WidgetPageProps) {
  const { mode } = await searchParams
  return <WidgetView mode={mode === 'heat' ? 'heat' : 'map'} />
}
