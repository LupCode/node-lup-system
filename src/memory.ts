import os from 'os';
import { execCommand } from './utils';

export type MemoryUtilization = {

  /** Memory used in bytes. */
  used: number;

  /** Memory free in bytes. */
  free: number;

  /** Utilization of available memory in percentage (0.0-1.0). */
  percentage: number;

};

export type MemoryDevice = {

  /** Name of the manufacturer. */
  manufacturer?: string;

  /** Name of the memory module. */
  model?: string;

  /** Memory size in bytes. */
  size?: number;

  /** Memory type (e.g., DDR4, LPDDR4X). */
  type?: string;

  /** Configured clock speed in MHz. */
  clockSpeed?: number;

  /** Maximum possible clock speed in MHz. */
  maxClockSpeed?: number;

  /** Memory bus width in bits. */
  busWidth?: number;

  /** 
   * Amount of data transfers can be performed in one clock cycle. 
   * A data transfer is a single read or write operation of size equal to the bus width.
   */
  transfersPerClockCycle?: number;

  /** Memory voltage in volts. */
  voltage?: number;

  /** Memory speed in bytes per second. */
  bandwidth?: number;
};

export type Memory = {
  /** Memory size in bytes. */
  size: number;

  /** Physical memory banks. */
  devices?: MemoryDevice[];

  /** Number of memory channels. */
  channels?: number;

  /** Total memory bandwidth in bytes per second. */
  bandwidth?: number;

  /** Memory utilization data. */
  utilization: MemoryUtilization;
};


/**
 * Returns information about the memory (RAM).
 * 
 * @returns Memory information.
 */
export async function getMemory(): Promise<Memory> {
  const memoryInfo: Memory = {
    size: os.totalmem(),
    utilization: {
      used: os.totalmem() - os.freemem(),
      free: os.freemem(),
      percentage: (os.totalmem() - os.freemem()) / os.totalmem(),
    },
  };
  
  switch(process.platform){

    case 'linux': {
      // TODO
      break;
    }

    case 'win32': {
      const output = await execCommand(
        'powershell -Command "Get-CimInstance -ClassName Win32_PhysicalMemory | Format-List"'
      ).catch(() => '');
      const lines = output.split('\n');
      const interleavePositions = new Set<number>();
      let currDevice: MemoryDevice | null = null;
      for(let i=0; i < lines.length; i++){
        const [key, value] = lines[i].split(' : ').map(s => s.trim());
        if(!key || !currDevice){ // empty line marks new device
          if(currDevice && Object.keys(currDevice).length > 0) {
            memoryInfo.devices = memoryInfo.devices || [];
            memoryInfo.devices.push(currDevice as any);
          }
          currDevice = {};
          continue;
        }
        if(!value) continue; // skip empty lines

        if(key === 'Manufacturer'){
          currDevice.manufacturer = value;
        } else
        if(key === 'Model' || key === 'PartNumber'){
          currDevice.model = currDevice.model || value;
        } else
        if(key === 'Capacity'){
          const size = parseInt(value, 10);
          if(!Number.isNaN(size)) currDevice.size = size;
        } else
        if(key === 'DataWidth' || key === 'TotalWidth'){
          const busWidth = parseInt(value, 10);
          if(!Number.isNaN(busWidth)) currDevice.busWidth = busWidth;
        } else
        if(key === 'InterleavePosition'){
          const position = parseInt(value, 10);
          if(!Number.isNaN(position)) interleavePositions.add(position);
        } else 
        if(key === 'Speed'){
          const mhz = parseInt(value, 10);
          if(!Number.isNaN(mhz)){
            currDevice.maxClockSpeed = mhz;
            if(!currDevice.clockSpeed) currDevice.clockSpeed = mhz; // use max speed as default clock speed
          }
        } else
        if(key === 'ConfiguredClockSpeed'){ // higher priority than Speed
          const mhz = parseInt(value, 10);
          if(!Number.isNaN(mhz)){
            currDevice.clockSpeed = mhz;
            if(!currDevice.maxClockSpeed) currDevice.maxClockSpeed = mhz; // use configured speed as default max speed
          }
        } else
        if(key === 'ConfiguredVoltage' || key === 'Voltage'){
          const voltage = parseFloat(value);
          if(!Number.isNaN(voltage)) currDevice.voltage = voltage / 1000; // convert from mV to V
        } else
        if(key === 'SMBIOSMemoryType'){
          switch(value){
            case '0': currDevice.type = 'Unknown'; break;
            case '1': currDevice.type = 'Other'; break;
            case '2': currDevice.type = 'DRAM'; break;
            case '3': currDevice.type = 'Synchronous DRAM'; break;
            case '4': currDevice.type = 'Cache DRAM'; break;
            case '5': currDevice.type = 'EDO'; break;
            case '6': currDevice.type = 'EDRAM'; break;
            case '7': currDevice.type = 'VRAM'; break;
            case '8': currDevice.type = 'SRAM'; break;
            case '9': currDevice.type = 'RAM'; break;
            case '10': currDevice.type = 'ROM'; break;
            case '11': currDevice.type = 'Flash'; break;
            case '12': currDevice.type = 'EEPROM'; break;
            case '13': currDevice.type = 'FEPROM'; break;
            case '14': currDevice.type = 'EPROM'; break;
            case '15': currDevice.type = 'CDRAM'; break;
            case '16': currDevice.type = '3DRAM'; break;
            case '17': currDevice.type = 'SDRAM'; break;
            case '18': currDevice.type = 'SGRAM'; break;
            case '19': currDevice.type = 'RDRAM'; break;
            case '20': currDevice.type = 'DDR'; currDevice.transfersPerClockCycle = 2; break;
            case '21': currDevice.type = 'DDR2'; currDevice.transfersPerClockCycle = 2; break;
            case '22': currDevice.type = 'DDR2 FB-DIMM'; currDevice.transfersPerClockCycle = 2; break;
            case '24': currDevice.type = 'DDR3'; currDevice.transfersPerClockCycle = 2; break;
            case '25': currDevice.type = 'FBD2'; currDevice.transfersPerClockCycle = 2; break;
            case '26': currDevice.type = 'DDR4'; currDevice.transfersPerClockCycle = 2; break;
            case '27': currDevice.type = 'LPDDR'; currDevice.transfersPerClockCycle = 2; break;
            case '28': currDevice.type = 'LPDDR2'; currDevice.transfersPerClockCycle = 2; break;
            case '29': currDevice.type = 'LPDDR3'; currDevice.transfersPerClockCycle = 2; break;
            case '30': currDevice.type = 'LPDDR4'; currDevice.transfersPerClockCycle = 2; break;
            case '34': currDevice.type = 'HBM'; currDevice.transfersPerClockCycle = 2; break;
            case '35': currDevice.type = 'HBM2'; currDevice.transfersPerClockCycle = 2; break;
            case '36': currDevice.type = 'DDR5'; currDevice.transfersPerClockCycle = 2; break;
            case '37': currDevice.type = 'LPDDR5'; currDevice.transfersPerClockCycle = 2; break;
            // TODO keep up to date
          }
        }
      }

      // post-processing
      if(memoryInfo.devices){
        const parallelism = Math.max(1, interleavePositions.size);
        let clockSpeed: number | undefined;
        let busWidth: number | undefined;
        let transfersPerCycle: number | undefined;
        for(let device of memoryInfo.devices){
          if(device.size && device.busWidth && device.clockSpeed){
            clockSpeed = clockSpeed ? Math.min(clockSpeed, device.clockSpeed) : device.clockSpeed;
            busWidth = busWidth ? Math.min(busWidth, device.busWidth) : device.busWidth;
            transfersPerCycle = transfersPerCycle ? Math.min(transfersPerCycle, device.transfersPerClockCycle ?? 1) : device.transfersPerClockCycle;
            device.bandwidth = device.clockSpeed*1000*1000 * device.busWidth/8 * (transfersPerCycle ??  1);
          }
        }
        if(clockSpeed && busWidth)
          memoryInfo.bandwidth = clockSpeed*1000*1000 * busWidth/8 * (transfersPerCycle ?? 1) * parallelism; // bytes per second
      }
      break;
    }
  }

  return memoryInfo;
}


/**
 * Returns memory utilization data.
 * 
 * @returns Memory utilization data.
 */
export async function getMemoryUtilization(): Promise<MemoryUtilization> {
  return {
    used: os.totalmem() - os.freemem(),
    free: os.freemem(),
    percentage: (os.totalmem() - os.freemem()) / os.totalmem(),
  };
}