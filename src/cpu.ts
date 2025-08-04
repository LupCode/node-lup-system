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

  /** CPU model (e.g., Intel Core i7-9700K). */
  model: string;

  /** CPU speed in MHz. */
  speed: number;

  /** CPU utilization data. */
  utilization: CPUUtilization;
};




/** Intervall in milliseconds at which CPU utilization is computed. */
export let CPU_COMPUTE_UTILIZATION_INTERVAL = 1000;


const CPU_COMPUTE_UTILIZATION_INITIAL_DELAY = 50;

let PREV_CPU_CORES: os.CpuInfo[] = [];
let CPU_CORE_UTILIZATIONS: number[] = [];
let CPU_UTILIZATION: number = 0;
let CPU_COMPUTE_RUNNING = false;
let CPU_COMPUTE_TIMEOUT: NodeJS.Timeout | null = null;

async function computeCpuUtilization() {
  const cpuCores = os.cpus();
  const min = Math.min(cpuCores.length, PREV_CPU_CORES.length);
  if (CPU_CORE_UTILIZATIONS.length < min)
    for (let i = CPU_CORE_UTILIZATIONS.length; i < min; i++) CPU_CORE_UTILIZATIONS.push(0);
  else if (CPU_CORE_UTILIZATIONS.length > min) CPU_CORE_UTILIZATIONS = CPU_CORE_UTILIZATIONS.slice(0, min);

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

    CPU_CORE_UTILIZATIONS[i] = usage / total;
    totalUsage += usage;
    totalTotal += total;
  }
  CPU_UTILIZATION = totalTotal !== 0 ? totalUsage / totalTotal : 0;
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
 * Returns the number of CPU cores available on the system.
 *
 * @returns Number of CPU cores.
 */
export function getCpuCoreCount(): number {
  return os.cpus().length;
}

/**
 * Returns the utilization of each CPU core as a percentage (0.0-1.0).
 *
 * @returns List of CPU core utilizations as percentages (0.0-1.0).
 */
export async function getCpuCoreUtilization(): Promise<number[]> {
  if (!CPU_COMPUTE_RUNNING) {
    await runCpuComputeInterval(); // runs the first computation immediately
    await sleep(CPU_COMPUTE_UTILIZATION_INITIAL_DELAY); // wait a bit to get initial values
    await computeCpuUtilization(); // run second computation immediately to get initial values
  }
  return CPU_CORE_UTILIZATIONS;
}

/**
 * Returns the overall CPU utilization as a percentage (0.0-1.0).
 *
 * @returns Overall CPU utilization as a percentage (0.0-1.0).
 */
export async function getCpuUtilization(): Promise<number> {
  if (!CPU_COMPUTE_RUNNING) {
    await runCpuComputeInterval(); // runs the first computation immediately
    await sleep(CPU_COMPUTE_UTILIZATION_INITIAL_DELAY); // wait a bit to get initial values
    await computeCpuUtilization(); // run second computation immediately to get initial values
  }
  return CPU_UTILIZATION;
}
