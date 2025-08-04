import os from 'os';
import { sleep } from './utils';

export type CPUUtilization = {
  /** Overall CPU utilization as a percentage (0.0-1.0). */
  overall: number;

  /** Utilization of each CPU core as a percentage (0.0-1.0). */
  cores: number[];
};

export type CPU = {
  /** Name of the CPU. */
  name: string;

  /** Number of CPU cores. */
  coreCount: number;

  /** CPU architecture (e.g., x64, arm64). */
  architecture: string;

  /** Endianness of the CPU (e.g., LE for little-endian, BE for big-endian). */
  endian: 'LE' | 'BE';

  /** CPU speed in MHz. */
  speed: number;

  /** CPU utilization data. */
  utilization: CPUUtilization;
};

/** Intervall in milliseconds at which CPU utilization is computed. */
export let CPU_COMPUTE_UTILIZATION_INTERVAL = 1000;

const CPU_COMPUTE_UTILIZATION_INITIAL_DELAY = 50;

let PREV_CPU_CORES: os.CpuInfo[] = [];
const CPU_UTILIZATION: CPUUtilization = {
  overall: 0,
  cores: [],
};
let CPU_COMPUTE_RUNNING = false;
let CPU_COMPUTE_TIMEOUT: NodeJS.Timeout | null = null;

async function computeCpuUtilization() {
  const cpuCores = os.cpus();
  const min = Math.min(cpuCores.length, PREV_CPU_CORES.length);
  if (CPU_UTILIZATION.cores.length < min)
    for (let i = CPU_UTILIZATION.cores.length; i < min; i++) CPU_UTILIZATION.cores.push(0);
  else if (CPU_UTILIZATION.cores.length > min) CPU_UTILIZATION.cores = CPU_UTILIZATION.cores.slice(0, min);

  let totalUsage = 0;
  let totalTotal = 0;
  for (let i = 0; i < min; i++) {
    const prev = PREV_CPU_CORES[i] as os.CpuInfo;
    const next = cpuCores[i] as os.CpuInfo;

    const nextUsage = (next.times.user + next.times.nice + next.times.sys + next.times.irq) * 1.0;
    const prevUsage = prev.times.user + prev.times.nice + prev.times.sys + prev.times.irq;
    const usage = nextUsage - prevUsage;

    const nextTotal = nextUsage + next.times.idle;
    const prevTotal = prevUsage + prev.times.idle;
    const total = nextTotal - prevTotal;

    CPU_UTILIZATION.cores[i] = usage / total;
    totalUsage += usage;
    totalTotal += total;
  }
  CPU_UTILIZATION.overall = totalTotal !== 0 ? totalUsage / totalTotal : 0;
  PREV_CPU_CORES = cpuCores;
}

async function runCpuComputeInterval() {
  CPU_COMPUTE_RUNNING = true;
  await computeCpuUtilization();
  if (CPU_COMPUTE_RUNNING)
    CPU_COMPUTE_TIMEOUT = setTimeout(runCpuComputeInterval, Math.max(CPU_COMPUTE_UTILIZATION_INTERVAL, 1));
}

/**
 * Stops the computation of CPU utilization.
 * As soon as one of the getCpu*Utilization functions is called again, the computation will be restarted.
 */
export function stopCpuUtilizationComputation() {
  if (CPU_COMPUTE_TIMEOUT) clearTimeout(CPU_COMPUTE_TIMEOUT);
  CPU_COMPUTE_TIMEOUT = null;
  CPU_COMPUTE_RUNNING = false;
}

/**
 * Returns information about the CPU.
 *
 * @returns CPU information.
 */
export async function getCpuInfo(): Promise<CPU> {
  const cpuCores = os.cpus();
  return {
    architecture: os.arch(),
    coreCount: cpuCores.length,
    endian: os.endianness() as 'LE' | 'BE',
    name: cpuCores[0].model,
    speed: cpuCores[0].speed,
    utilization: await getCpuUtilization(),
  };
}

/**
 * Returns the current CPU utilization.
 * If the computation is not running, it will start the computation and return the initial values.
 *
 * @returns CPU utilization data.
 */
export async function getCpuUtilization(): Promise<CPUUtilization> {
  if (!CPU_COMPUTE_RUNNING) {
    await runCpuComputeInterval(); // runs the first computation immediately
    await sleep(CPU_COMPUTE_UTILIZATION_INITIAL_DELAY); // wait a bit to get initial values
    await computeCpuUtilization(); // run second computation immediately to get initial values
  }
  return CPU_UTILIZATION;
}

/**
 * Returns the number of CPU cores available on the system.
 *
 * @returns Number of CPU cores.
 */
export function getCpuCoreCount(): number {
  return os.cpus().length;
}
