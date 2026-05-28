import { useState, useEffect } from 'react'

interface SystemStats {
  cpu: number
  memory: number
  network: string
  temperature: number | null
}

export function useSystemStats(): SystemStats {
  const [stats, setStats] = useState<SystemStats>({
    cpu: 23,
    memory: 48,
    network: '↑ 6.2 MB/s',
    temperature: 58,
  })

  useEffect(() => {
    const interval = setInterval(() => {
      setStats(prev => ({
        cpu: Math.min(100, Math.max(5, prev.cpu + (Math.random() - 0.45) * 8)),
        memory: Math.min(100, Math.max(20, prev.memory + (Math.random() - 0.5) * 3)),
        network: `↑ ${(Math.random() * 10 + 1).toFixed(1)} MB/s`,
        temperature: prev.temperature ? Math.min(90, Math.max(40, prev.temperature + (Math.random() - 0.5) * 2)) : null,
      }))
    }, 2000)

    return () => clearInterval(interval)
  }, [])

  return {
    cpu: Math.round(stats.cpu),
    memory: Math.round(stats.memory),
    network: stats.network,
    temperature: stats.temperature ? Math.round(stats.temperature) : null,
  }
}
