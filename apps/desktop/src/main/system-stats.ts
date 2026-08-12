import { app, ipcMain } from 'electron'
import { cpus, totalmem, freemem } from 'os'

// ─────────────────────────────────────────────────────────────────────────────
// Real system telemetry for the status bar.
//
// The renderer previously invented these numbers with Math.random(). For a live
// production tool that is worse than showing nothing: an operator watching a
// fake 23% CPU has no warning before the encoder starts dropping frames.
// ─────────────────────────────────────────────────────────────────────────────

export interface SystemStats {
  /** Whole-app CPU usage across every Electron process, 0..100. */
  cpu: number
  /** Resident memory of the app in MB. */
  memoryUsedMb: number
  /** Physical RAM installed, in MB. */
  memoryTotalMb: number
  /** Machine-wide memory pressure, 0..100. */
  memoryPercent: number
  /** GPU process CPU usage, 0..100. Null when no GPU process is reported. */
  gpu: number | null
}

/**
 * `percentCPUUsage` is already a delta since the previous getAppMetrics() call,
 * so polling on a fixed interval gives a live reading without any differencing
 * of our own. The very first call after launch reports 0 by design.
 */
function sampleCpu(): { total: number; gpu: number | null } {
  const metrics = app.getAppMetrics()

  let total = 0
  let gpu: number | null = null

  for (const m of metrics) {
    const percent = m.cpu?.percentCPUUsage ?? 0
    total += percent
    if (m.type === 'GPU') gpu = percent
  }

  // Electron reports per-process usage where 100% means one saturated core.
  // Normalise against core count so 100% means "the whole machine", matching
  // what Task Manager shows the operator.
  //
  // Kept to one decimal rather than rounded to an integer: on a many-core
  // machine a genuinely-busy app still divides down to a fraction of a percent,
  // and integer rounding reported every such reading as a flat "0%" that looked
  // like broken telemetry rather than a light load.
  const cores = cpus().length || 1
  const round1 = (n: number) => Math.round(n * 10) / 10
  return {
    total: Math.min(100, round1(total / cores)),
    gpu: gpu === null ? null : Math.min(100, round1(gpu / cores)),
  }
}

function read(): SystemStats {
  const { total, gpu } = sampleCpu()

  const totalBytes = totalmem()
  const freeBytes = freemem()
  const appMemory = process.memoryUsage().rss

  return {
    cpu: total,
    gpu,
    memoryUsedMb: Math.round(appMemory / 1024 / 1024),
    memoryTotalMb: Math.round(totalBytes / 1024 / 1024),
    memoryPercent: Math.round(((totalBytes - freeBytes) / totalBytes) * 100),
  }
}

export function registerSystemStats(): void {
  // Prime the CPU sampler so the first renderer poll returns a real delta
  // rather than a meaningless zero.
  sampleCpu()
  ipcMain.handle('system:stats', () => read())
}
