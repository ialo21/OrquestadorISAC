import { useEffect, useRef, useState } from 'react'

/**
 * Devuelve el tiempo transcurrido en segundos desde `fromIso` (ISO string),
 * actualizándose cada segundo mientras la ejecución esté activa.
 * Cuando `active` es false deja de contar y devuelve null.
 *
 * Usa una referencia interna al timestamp de inicio para evitar recalcular
 * en cada render, y clampea a 0 para prevenir valores negativos por desfase
 * entre el reloj del servidor y el del navegador.
 */
export function useLiveTimer(fromIso: string | undefined, active: boolean): number | null {
  const [elapsed, setElapsed] = useState<number | null>(null)
  const startRef = useRef<number | null>(null)

  useEffect(() => {
    if (!active || !fromIso) {
      setElapsed(null)
      startRef.current = null
      return
    }

    const parsed = new Date(fromIso).getTime()
    // Si la fecha no es válida, no arrancar el timer
    if (isNaN(parsed)) {
      setElapsed(null)
      return
    }

    startRef.current = parsed

    const tick = () => {
      if (startRef.current === null) return
      const raw = Math.floor((Date.now() - startRef.current) / 1000)
      setElapsed(Math.max(0, raw))
    }

    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [fromIso, active])

  return elapsed
}
