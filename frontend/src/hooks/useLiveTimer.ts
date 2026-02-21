import { useEffect, useState } from 'react'

/**
 * Devuelve el tiempo transcurrido en segundos desde `fromIso` (ISO string),
 * actualizándose cada segundo mientras la ejecución esté activa.
 * Cuando `active` es false deja de contar y devuelve null.
 */
export function useLiveTimer(fromIso: string | undefined, active: boolean): number | null {
  const [elapsed, setElapsed] = useState<number | null>(null)

  useEffect(() => {
    if (!active || !fromIso) {
      setElapsed(null)
      return
    }

    const start = new Date(fromIso).getTime()

    const tick = () => setElapsed(Math.floor((Date.now() - start) / 1000))
    tick()

    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [fromIso, active])

  return elapsed
}
