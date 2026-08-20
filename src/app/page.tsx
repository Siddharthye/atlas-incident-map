import { ConsoleShell } from '@/components/ConsoleShell'
import { storageBackend } from '@/store'

/**
 * `/` — the ops console. The interesting work happens client-side in
 * `ConsoleShell`; this server component only injects deploy-time facts.
 */
export default function ConsolePage() {
  return <ConsoleShell storageBackend={storageBackend} />
}
