import { execCommand } from './utils';

export type GPUUtilization = {
  /** GPU memory utilization as a percentage (0.0-1.0). */
  memory?: number;

  /** GPU memory temperature in Celsius. */
  memoryTemperature?: number;

  /** GPU processing utilization as a percentage (0.0-1.0). */
  processing?: number;

  /** GPU temperature in Celsius. */
  temperature?: number;

  /** Fan speed in percentage (0.0-1.0). */
  fanSpeed?: number;

  /** GPU power draw in watts. */
  powerDraw?: number;
};

export type GPU = {
  /** Unique ID of the GPU device. */
  id: string;

  /** Name of the GPU device. */
  name: string;

  /** Name of the processor built into the GPU. */
  processor?: string;

  /** Status of the GPU device. */
  status: 'ok' | 'error' | 'unknown' | string;

  /** Last update date of the GPU driver, if available. */
  driverDate?: string;

  /** Version of the GPU driver, if available. */
  driverVersion?: string;

  /** Memory size of the GPU in bytes. */
  memory?: number;

  /** Index of the GPU device. */
  index?: number;

  /** If a physical display/monitor is attached to one of the GPU's connector.s */
  displayAttached?: boolean;

  /** If memory is allocated inside the GPU for display purposes. Can be true even if no physical display is attached. */
  displayActive?: boolean;

  /** Utilization data of the GPU. */
  utilization?: GPUUtilization;
};

export async function getGPUs(): Promise<GPU[]> {
  const gpus: GPU[] = [];
  switch (process.platform) {
    case 'linux': {
      const output = await execCommand('lspci -k | grep -i -A3 "\[vga\]\|\[3d\]"').catch(() => '');
      const lines = output.split('\n');
      let curr: GPU | null = null;
      // tslint:disable-next-line:prefer-for-of
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue; // skip empty lines
        if (line.startsWith('00:')) {
          // new GPU found, push current if exists
          if (curr) gpus.push(curr);
          curr = {} as GPU;
          curr.id = line.split(' ')[0];
          curr.name = line.split(':')[2].trim();
          curr.status = 'ok'; // assume ok, will update later if needed
        }
      }
      break;
    }

    case 'win32': {
      const output = await execCommand(
        'powershell -Command "Get-CimInstance -ClassName Win32_VideoController | Format-List"',
      ).catch(() => '');
      const lines = output.split('\n');
      let curr: GPU | null = null;
      // tslint:disable-next-line:prefer-for-of
      for (let i = 0; i < lines.length; i++) {
        const [key, value] = lines[i].split(' : ').map((s) => s.trim());
        if (!key && !value) {
          // empty line, push current GPU if exists
          if (curr) gpus.push(curr);
          curr = null;
          continue;
        }
        if (!value) continue; // skip lines without value

        if (key === 'Name') {
          if (!curr) curr = {} as any;
          curr!.name = value;
        } else if (key === 'Status') {
          if (!curr) curr = {} as any;
          curr!.status = value.toLowerCase() || 'unknown';
        } else if (key === 'PNPDeviceID') {
          if (!curr) curr = {} as any;
          curr!.id = value;
        } else if (key === 'VideoProcessor') {
          if (!curr) curr = {} as any;
          curr!.processor = value;
        } else if (key === 'AdapterRAM') {
          const memory = parseInt(value.trim(), 10);
          if (Number.isNaN(memory)) continue; // skip invalid memory values
          if (!curr) curr = {} as any;
          curr!.memory = memory; // not accurate, but gives an idea of the GPU memory
        } else if (key === 'DriverDate') {
          if (!curr) curr = {} as any;
          curr!.driverDate = value;
        } else if (key === 'DriverVersion') {
          if (!curr) curr = {} as any;
          curr!.driverVersion = value;
        }
      }
      if (curr) gpus.push(curr);
      break;
    }
  }

  // nvidia-smi for more detailed info
  {
    const output = await execCommand(
      'nvidia-smi --query-gpu=name,display_attached,display_active,fan.speed,memory.total,utilization.gpu,utilization.memory,temperature.gpu,temperature.memory,power.draw --format=csv,nounits,noheader',
    ).catch(() => '');
    const lines = output.split('\n').filter((line) => line.trim() !== '');
    const updatedIndexes = new Set<number>();
    // tslint:disable-next-line:prefer-for-of
    for (let i = 0; i < lines.length; i++) {
      const [
        name,
        displayAttached,
        displayActive,
        fanSpeed,
        memoryTotal,
        utilizationGPU,
        utilizationMemory,
        temperatureGPU,
        temperatureMemory,
        powerDraw,
      ] = lines[i].split(',').map((s) => s.trim());
      let currIdx = gpus.length;
      let currGpu: GPU | undefined = undefined;
      for (let g = 0; g < gpus.length; g++) {
        if (updatedIndexes.has(g)) continue; // already updated this GPU
        const gpu = gpus[g];
        if (gpu.name !== name) continue;
        updatedIndexes.add(g);
        currIdx = g;
        currGpu = gpus[g];
        break;
      }
      if (!currGpu) {
        currGpu = { id: name, name } as GPU;
        updatedIndexes.add(gpus.length);
        gpus.push(currGpu);
      }
      if (displayAttached) currGpu.displayAttached = ['yes', 'enabled', '1'].includes(displayAttached.toLowerCase());
      if (displayActive) currGpu.displayActive = ['yes', 'enabled', '1'].includes(displayActive.toLowerCase());
      if (fanSpeed && !Number.isNaN(parseFloat(fanSpeed))) {
        if (!currGpu.utilization) currGpu.utilization = {} as GPUUtilization;
        currGpu.utilization.fanSpeed = parseFloat(fanSpeed) / 100;
      }
      if (memoryTotal && !Number.isNaN(parseInt(memoryTotal, 10)))
        currGpu.memory = parseInt(memoryTotal, 10) * 1024 * 1024; // convert MiB to bytes
      if (utilizationGPU && !Number.isNaN(parseFloat(utilizationGPU))) {
        if (!currGpu.utilization) currGpu.utilization = {} as GPUUtilization;
        currGpu.utilization.processing = parseFloat(utilizationGPU) / 100;
      }
      if (utilizationMemory && !Number.isNaN(parseFloat(utilizationMemory))) {
        if (!currGpu.utilization) currGpu.utilization = {} as GPUUtilization;
        currGpu.utilization.memory = parseFloat(utilizationMemory) / 100;
      }
      if (temperatureGPU && !Number.isNaN(parseFloat(temperatureGPU))) {
        if (!currGpu.utilization) currGpu.utilization = {} as GPUUtilization;
        currGpu.utilization.temperature = parseFloat(temperatureGPU);
      }
      if (temperatureMemory && !Number.isNaN(parseFloat(temperatureMemory))) {
        if (!currGpu.utilization) currGpu.utilization = {} as GPUUtilization;
        currGpu.utilization.memoryTemperature = parseFloat(temperatureMemory);
      }
      if (powerDraw && !Number.isNaN(parseFloat(powerDraw))) {
        if (!currGpu.utilization) currGpu.utilization = {} as GPUUtilization;
        currGpu.utilization.powerDraw = parseFloat(powerDraw);
      }
      gpus[currIdx] = currGpu;
    }
  }

  return gpus;
}
