![GitHub package.json version](https://img.shields.io/github/package-json/v/LupCode/node-lup-system)
![npm bundle size](https://img.shields.io/bundlephobia/min/lup-system)
![GitHub Workflow Status](https://img.shields.io/github/workflow/status/LupCode/node-lup-system/On%20Push)
![NPM](https://img.shields.io/npm/l/lup-system)

# lup-system
Node module that provides utilities for interacting with the operating system and the hardware of the machine. 

## Example

JavaScript:
```javascript
const osUtils = require('lup-system');

osUtils.getCpuUtilization().then(utilization => console.log("CPU Utilization: " + utilization));
osUtils.getDrives().then(drives => console.log("Drives: " + drives)); // Array of drive objects
osUtils.getNetworkInterfaces().then(interfaces => console.log("Network Interfaces: " + interfaces));
osUtils.getGPUs().then(gpus => console.log("GPU Info: " + gpus));
osUtils.getTemperatures().then(temps => console.log("Temperatures: " + temps));
```

TypeScript:
```typescript
import osUtils from 'lup-system';

(async () => {
    console.log("CPU Utilization: " + await osUtils.getCpuUtilization());
    console.log("Drives: ", await osUtils.getDrives()); // Array of drive objects
    console.log("Network Interfaces: ", await osUtils.getNetworkInterfaces());
    console.log("GPU Info: ", await osUtils.getGPUs());
    console.log("Temperatures: ", await osUtils.getTemperatures());
})();
```

Output:
```
CPU Utilization: 0.2313135420902806
Drives: [
    {
        filesystem: 'C:',
        mount: 'C:',
        type: 'ntfs',
        total: 1999519543296,
        free: 479322533888,
        used: 1520197009408,
        utilization: 0.7602811457907099
    },
    {
        filesystem: 'D:',
        mount: 'D:',
        type: 'ntfs',
        total: 1000203087872,
        free: 917103894528,
        used: 83099193344,
        utilization: 0.08308232033236287
    }
]
Network Interfaces: [
    {
        name: 'Loopback Pseudo-Interface 1',
        addresses: [ [Object], [Object] ],
        status: { operational: 'unknown', admin: true, cable: false },
        physical: true
    },
    {
        name: 'Ethernet',
        addresses: [],
        status: { operational: 'up', admin: true, cable: true },
        physical: true,
        speed: { bits: 1000000000, bytes: 125000000 },
        utilization: {
        receive: 0.000003003690036900369,
        transmit: 4.723247232472324e-7
        }
    }
]
GPU Info: [
    {
        name: 'NVIDIA GeForce RTX 3060 Ti',
        status: 'ok',
        id: 'PCI\\VEN_10DE&DEV_2489&SUBSYS_884F1043&REV_A1\\4&2130FF93&0&0008',
        processor: 'NVIDIA GeForce RTX 3060 Ti',
        memory: 8589934592,
        driverDate: '14.05.2025 02:00:00',
        driverVersion: '32.0.15.7652',
        displayAttached: true,
        displayActive: true,
        fanSpeed: 0.53,
        utilization: 0.03,
        memoryUtilization: 0.01,
        temperature: 52,
        powerDraw: 48.32
    }
]
Temperatures: {
    cpu: 45.2,
    gpu: 60.8,
}
```


## Considerations

### GPU Readings
For more detailed information on GPUs it is recommended to 
install the [nvidia-smi](https://developer.nvidia.com/nvidia-system-management-interface) tool.