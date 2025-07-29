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
```

TypeScript:
```typescript
import osUtils from 'lup-system';

(async () => {
    console.log("CPU Utilization: " + await osUtils.getCpuUtilization());
    console.log("Drives: ", await osUtils.getDrives()); // Array of drive objects
    console.log("Network Interfaces: ", await osUtils.getNetworkInterfaces());
})();
```

Output:
```
CPU Utilization: 45.3
```