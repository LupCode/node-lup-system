import fs from 'fs/promises';
import { execCommand } from './utils';

export type Temperatures = {
  /** Overall battery temperature in degrees Celsius (°C). */
  battery?: number;

  /** Overall CPU temperature in degrees Celsius (°C). */
  cpu?: number;

  /**
   * Temperature of each CPU core in degrees Celsius (°C).
   * If present contains at least one value.
   */
  cpuCores?: number[];

  /**
   * Temperature of each CPU socket in degrees Celsius (°C).
   * If present contains at least one value.
   */
  cpuSockets?: number[];

  /** Overall GPU temperature in degrees Celsius (°C). */
  gpu?: number;

  /**
   * Temperature of each GPU in degrees Celsius (°C).
   * If present contains at least one value.
   */
  gpus?: number[];

  /** Temperature of the GPU memory in degrees Celsius (°C). */
  gpuMemory?: number;

  /**
   * Temperature of each GPU memory in degrees Celsius (°C).
   * If present contains at least one value.
   */
  gpuMemories?: number[];

  /** Temperature of the motherboard in degrees Celsius (°C). */
  motherboard?: number;

  /** Temperature of the Wi-Fi adapter in degrees Celsius (°C). */
  wifi?: number;
};

export async function getTemperatures(): Promise<Temperatures> {
  const temperatures: Temperatures = {};

  switch (process.platform) {
    case 'linux': {
      const thermalFiles = await fs.readdir('/sys/class/thermal');
      const hwmonFiles = await fs.readdir('/sys/class/hwmon');
      await Promise.allSettled([
        ...thermalFiles.map(async (file) => {
          const temp = await fs
            .readFile(`/sys/class/thermal/${file}/temp`, 'utf8')
            .then((tempStr) => {
              const t = parseInt(tempStr, 10);
              return !Number.isNaN(t) ? t / 1000 : null; // millidegrees Celsius to degrees Celsius
            })
            .catch(() => null);
          if (temp === null) return;
          const type = (await fs.readFile(`/sys/class/thermal/${file}/type`, 'utf8').catch(() => '')).toLowerCase();
          if (type.includes('core')) {
            temperatures.cpuCores = temperatures.cpuCores || [];
            temperatures.cpuCores.push(temp);
          } else if (type.includes('x86') || type.includes('soc_thermal')) {
            temperatures.cpuSockets = temperatures.cpuSockets || [];
            temperatures.cpuSockets.push(temp);
          } else if (type.startsWith('acp') || type.startsWith('pch')) {
            temperatures.motherboard = temp;
          } else if (type.includes('gpu') || type.includes('graphics')) {
            temperatures.gpus = temperatures.gpus || [];
            temperatures.gpus.push(temp);
          } else if (type.includes('wifi')) {
            temperatures.wifi = temp;
          } else if (type.includes('battery')) {
            temperatures.battery = temp;
          }
        }),
        ...hwmonFiles.map(async (file) => {
          const subFiles = await fs.readdir('/sys/class/hwmon/' + file);
          let defaultName: string | null = null;
          const names: { [key: string]: string } = {};
          const temps: { [key: string]: number } = {};

          await Promise.allSettled(
            subFiles.map(async (subFile) => {
              if (subFile === 'name')
                defaultName = await fs.readFile('/sys/class/hwmon/' + file + '/' + subFile, 'utf8').catch(() => null);
              if (subFile.endsWith('_label')) {
                const key = subFile.slice(0, -6);
                names[key] = await fs.readFile('/sys/class/hwmon/' + file + '/' + subFile, 'utf8').catch(() => '');
              }
              if (subFile.endsWith('_input')) {
                const key = subFile.slice(0, -6);
                const temp = await fs
                  .readFile('/sys/class/hwmon/' + file + '/' + subFile, 'utf8')
                  .then((tempStr) => {
                    const t = parseInt(tempStr, 10);
                    return !Number.isNaN(t) ? t / 1000 : null; // millidegrees Celsius to degrees Celsius
                  })
                  .catch(() => null);
                if (temp !== null) temps[key] = temp;
              }
            }),
          );

          for (const [key, temp] of Object.entries(temps)) {
            const name = (names[key] || defaultName || '').toLowerCase();
            if (name.includes('core')) {
              temperatures.cpuCores = temperatures.cpuCores || [];
              temperatures.cpuCores.push(temp);
            } else if (name.includes('socket') || name.includes('package')) {
              temperatures.cpuSockets = temperatures.cpuSockets || [];
              temperatures.cpuSockets.push(temp);
            } else if (name.includes('gpu') || name.includes('graphics')) {
              temperatures.gpus = temperatures.gpus || [];
              temperatures.gpus.push(temp);
            } else if (name.includes('motherboard') || name.includes('mainboard') || name.includes('mb')) {
              temperatures.motherboard = temp;
            } else if (name.includes('wifi')) {
              temperatures.wifi = temp;
            } else if (name.includes('battery')) {
              temperatures.battery = temp;
            }
          }
        }),
      ]);
      break;
    }

    case 'win32': {
      const output = await execCommand(
        'powershell -Command "Get-CimInstance MSAcpi_ThermalZoneTemperature -Namespace "root/wmi" | Select CurrentTemperature | Format-List"',
      ).catch(() => ''); // only successful if administrator rights are available
      const lines = output.split('\n');
      // tslint:disable-next-line:prefer-for-of
      for (let i = 0; i < lines.length; i++) {
        const [key, value] = lines[i].split(' : ').map((s) => s.trim());
        if (key === 'CurrentTemperature') {
          const temperature = parseInt(value, 10);
          if (!Number.isNaN(temperature)) {
            temperatures.cpu = (temperature - 2732) / 10; // Convert from Kelvin to Celsius
          }
        }
      }
      break;
    }
  }

  // backup nvidia-smi
  {
    const output = await execCommand(
      'nvidia-smi --query-gpu=temperature.gpu,temperature.memory --format=csv,nounits,noheader',
    ).catch(() => '');
    const lines = output.split('\n');
    let clearedGPUTemp = false;
    let clearedGPUMemoryTemp = false;
    // tslint:disable-next-line:prefer-for-of
    for (let i = 0; i < lines.length; i++) {
      const [tempGPU, tempMemory] = lines[i].split(',').map((s) => s.trim());
      const gpuTemp = parseInt(tempGPU, 10);
      const memoryTemp = parseInt(tempMemory, 10);
      if (!Number.isNaN(gpuTemp)) {
        if (!clearedGPUTemp) {
          temperatures.gpus = [];
          clearedGPUTemp = true;
        }
        temperatures.gpus = temperatures.gpus || [];
        temperatures.gpus.push(gpuTemp);
      }
      if (!Number.isNaN(memoryTemp)) {
        if (!clearedGPUMemoryTemp) {
          temperatures.gpuMemories = [];
          clearedGPUMemoryTemp = true;
        }
        temperatures.gpuMemories = temperatures.gpuMemories || [];
        temperatures.gpuMemories.push(memoryTemp);
      }
    }
  }

  // post processing
  if (temperatures.cpu === undefined) {
    if (temperatures.cpuSockets && temperatures.cpuSockets.length > 0) {
      temperatures.cpu = temperatures.cpuSockets.reduce((a, b) => a + b, 0) / temperatures.cpuSockets.length;
    } else if (temperatures.cpuCores && temperatures.cpuCores.length > 0) {
      temperatures.cpu = temperatures.cpuCores.reduce((a, b) => a + b, 0) / temperatures.cpuCores.length;
    }
  }
  if (temperatures.gpu === undefined && temperatures.gpus && temperatures.gpus.length > 0) {
    temperatures.gpu = temperatures.gpus.reduce((a, b) => a + b, 0) / temperatures.gpus.length;
  }
  if (temperatures.gpuMemory === undefined && temperatures.gpuMemories && temperatures.gpuMemories.length > 0) {
    temperatures.gpuMemory = temperatures.gpuMemories.reduce((a, b) => a + b, 0) / temperatures.gpuMemories.length;
  }

  return temperatures;
}
