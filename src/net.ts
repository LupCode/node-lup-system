import { execCommand } from './utils';
import fs from 'fs/promises';
import net from 'net';
import os from 'os';

export type NICUtilization = {
  /** Current receive link utilization (RX) in percentage (0.0-1.0) of the maximum bandwidth (speed). */
  receive: number;

  /** Current transmit link utilization (TX) in percentage (0.0-1.0) of the maximum bandwidth (speed). */
  transmit: number;
};

export type NICInfo = {
  /** Name of the network interface (e.g. lo, eth0). */
  name: string;

  /** Network addresses assigned to the network interface. */
  addresses: {
    /** Type of the address (IPv4 or IPv6). */
    type: 'ipv4' | 'ipv6';

    /** MAC address of the interface. */
    mac: string;

    /** IPv4 or IPv6 address. */
    ip: string;

    /** Subnet mask in CIDR notation (e.g. /24 for IPv4). */
    netmask: string;

    /** CIDR notation of the address. */
    cidr: string | null;

    /** If the address is internal (e.g. loopback). */
    internal: boolean;
  }[];

  /** Status information about the network interface. */
  status: {
    /** Operational status of the interface (e.g. up, down). */
    operational: 'up' | 'down' | 'dormant' | 'notpresent' | 'lowerlayerdown' | 'testing' | 'unknown';

    /** If the interface is enabled in the settings. */
    admin: boolean;

    /** If a network cable is plugged into the interface. */
    cable: boolean;
  };

  /** If the interface is a physical (e.g. Ethernet) or virtual (e.g. Loopback, VPN, Hyper-V) interface. */
  physical: boolean;

  /**
   * Maximum link speed that the network interface is capable of.
   * For full-duplex interfaces (default), this speed counts once for receive and once for transmit simultaneously.
   * For half-duplex interfaces, this speed counts for both receive and transmit combined/shared.
   *
   * The speed cannot be determined for all interfaces, in which case it will be undefined.
   */
  speed?: {
    /** Speed in bits per second (bps). */
    bits: number;

    /** Speed in bytes per second (Bps). */
    bytes: number;
  };

  /**
   * Current link utilization in percentage (0.0-1.0) of the maximum bandwidth (speed).
   *
   * The utilization cannot be determined for all interfaces, in which case it will be undefined.
   */
  utilization?: NICUtilization;
};

/** Intervall in milliseconds at which network interface utilization is computed. */
export let NET_COMPUTE_UTILIZATION_INTERVAL = 1000;

let NET_LAST_COMPUTE: number = 0;
const NET_LAST_STATS: { [nic: string]: { receivedBytes: number; transmittedBytes: number } } = {};
const NET_BYTES_PER_SECOND: { [nic: string]: { receive: number; transmit: number } } = {}; // bytes/s
let NET_COMPUTE_RUNNING = false;
let NET_COMPUTE_TIMEOUT: NodeJS.Timeout | null = null;

async function computeNetworkUtilization() {
  switch (process.platform) {
    case 'linux': {
      await Promise.allSettled([
        ...Object.keys(NET_LAST_STATS).map(async (nic) =>
          fs.readFile('/sys/class/net/' + nic + '/statistics/rx_bytes', 'utf8').then((data) => {
            const receivedBytes = parseInt(data.trim(), 10) || 0;
            const prevReceived = NET_LAST_STATS[nic]?.receivedBytes;
            if (prevReceived !== undefined) {
              NET_BYTES_PER_SECOND[nic].receive =
                (receivedBytes - prevReceived) / ((Date.now() - NET_LAST_COMPUTE) / 1000);
            }
            NET_LAST_STATS[nic].receivedBytes = receivedBytes;
          }),
        ),
        ...Object.keys(NET_LAST_STATS).map(async (nic) =>
          fs.readFile('/sys/class/net/' + nic + '/statistics/tx_bytes', 'utf8').then((data) => {
            const sentBytes = parseInt(data.trim(), 10) || 0;
            const prevSent = NET_LAST_STATS[nic]?.transmittedBytes;
            if (prevSent !== undefined) {
              NET_BYTES_PER_SECOND[nic].transmit = (sentBytes - prevSent) / ((Date.now() - NET_LAST_COMPUTE) / 1000);
            }
            NET_LAST_STATS[nic].transmittedBytes = sentBytes;
          }),
        ),
      ]);
      break;
    }

    case 'win32': {
      const output = await execCommand(
        'powershell -Command "Get-NetAdapterStatistics | Select-Object Name, ReceivedBytes, SentBytes | Format-List"',
      ).catch(() => '');
      const lines = output.split('\n');
      const durationSec = (Date.now() - NET_LAST_COMPUTE) / 1000;
      let currNic: string | null = null;
      // tslint:disable-next-line:prefer-for-of
      for (let i = 0; i < lines.length; i++) {
        const [key, value] = lines[i].split(' : ').map((part) => part.trim());
        if (key === 'Name') {
          currNic = value;
        }
        if (!currNic) continue;
        if (!NET_LAST_STATS[currNic]) NET_LAST_STATS[currNic] = { receivedBytes: 0, transmittedBytes: 0 };
        if (!NET_BYTES_PER_SECOND[currNic]) NET_BYTES_PER_SECOND[currNic] = { receive: 0, transmit: 0 };

        if (key === 'ReceivedBytes') {
          const receivedBytes = parseInt(value, 10) || 0;
          const prevReceived = NET_LAST_STATS[currNic]?.receivedBytes;
          if (prevReceived !== undefined) {
            NET_BYTES_PER_SECOND[currNic].receive = (receivedBytes - prevReceived) / durationSec;
          }
          NET_LAST_STATS[currNic].receivedBytes = receivedBytes;
        } else if (key === 'SentBytes') {
          const sentBytes = parseInt(value, 10) || 0;
          const prevSent = NET_LAST_STATS[currNic]?.transmittedBytes;
          if (prevSent !== undefined) {
            NET_BYTES_PER_SECOND[currNic].transmit = (sentBytes - prevSent) / durationSec;
          }
          NET_LAST_STATS[currNic].transmittedBytes = sentBytes;
        }
      }
      break;
    }
  }
  NET_LAST_COMPUTE = Date.now();
}

async function runNetComputeInterval() {
  NET_COMPUTE_RUNNING = true;
  await computeNetworkUtilization();
  if (NET_COMPUTE_RUNNING)
    NET_COMPUTE_TIMEOUT = setTimeout(runNetComputeInterval, Math.max(NET_COMPUTE_UTILIZATION_INTERVAL, 1));
}

/**
 * Stops the computation of network utilization.
 * As soon as the getNetworkInterfaces function is called again, the computation will be restarted.
 */
export function stopNetworkUtilizationComputation() {
  if (NET_COMPUTE_TIMEOUT) clearTimeout(NET_COMPUTE_TIMEOUT);
  NET_COMPUTE_TIMEOUT = null;
  NET_COMPUTE_RUNNING = false;
}


/**
 * Checks if a process is listening on a given port.
 * @param port Port number to check.
 * @param bindAddress Address of the interface to bind to (default '0.0.0.0' which binds to all interfaces).
 * @returns Promise that resolves to true if the port is in use, false otherwise.
 */
export async function checkIfPortIsInUse(port: number, bindAddress: string = '0.0.0.0'): Promise<boolean> {
  const server = net.createServer();
  return new Promise((resolve) => {
    server.unref();
    server.once('error', (err) => {
      server.close();
      if((err as any).code === 'EADDRINUSE') {
        resolve(true);
      } else {
        resolve(false);
      }
    });
    server.listen(port, bindAddress, () => {
      server.close();
      resolve(false);
    });
  });
}


/**
 * Returns information about the network interfaces on the system.
 *
 * @returns List of NICInfo objects.
 */
export async function getNetworkInterfaces(): Promise<NICInfo[]> {
  if (!NET_COMPUTE_RUNNING) {
    await runNetComputeInterval(); // runs the first computation immediately
    await computeNetworkUtilization(); // run second computation immediately to get initial values
  }

  const nics: { [name: string]: NICInfo } = {};
  for (const [name, addresses] of Object.entries(os.networkInterfaces())) {
    const nic: NICInfo = {
      name,
      addresses:
        addresses?.map((addr) => ({
          type: addr.family.toLowerCase() as any,
          mac: addr.mac,
          ip: addr.address,
          netmask: addr.netmask,
          cidr: addr.cidr,
          internal: addr.internal,
        })) || [],
      status: {
        operational: 'unknown',
        admin: true, // Default to true, will be updated based on platform
        cable: false, // Default to false, will be updated based on platform
      },
      physical: !name.startsWith('v') && !name.startsWith('lo'), // Assume non-loopback and non-virtual interfaces are physical
    };
    nics[name] = nic;
  }

  switch (process.platform) {
    case 'linux': {
      await Promise.allSettled([
        ...Object.keys(nics).map(async (name) =>
          fs.readFile('/sys/class/net/' + name + '/carrier', 'utf8').then((data) => {
            const present = data.trim() === '1';
            nics[name].status.cable = present;
            if (present) nics[name].physical = true; // If a cable is present, it is a physical interface
          }),
        ),
        ...Object.keys(nics).map(async (name) =>
          fs.readFile('/sys/class/net/' + name + '/operstate', 'utf8').then((data) => {
            nics[name].status.operational = data.trim().toLowerCase() as any;
          }),
        ),
        ...Object.keys(nics).map(async (name) =>
          fs.readFile('/sys/class/net/' + name + '/proto_down', 'utf8').then((data) => {
            nics[name].status.admin = data.trim() !== '1'; // If proto_down is 1, the interface is administratively down
          }),
        ),
        ...Object.keys(nics).map(async (name) =>
          fs.readFile('/sys/class/net/' + name + '/speed', 'utf8').then((data) => {
            const speed = parseInt(data.trim(), 10);
            if (!isNaN(speed) && speed > 0) {
              const bits = speed * 1000000; // Convert from Mbps to bps (bits/s)
              const bytes = Math.floor(bits / 8); // Convert from bps to Bps (bytes/s)
              nics[name].speed = {
                bits,
                bytes, // Convert from bps to Bps (bytes/s)
              };
            }
          }),
        ),
      ]);
      break;
    }

    case 'win32': {
      const additionallyFound: string[] = []; // os.networkInterfaces() does not return all interfaces if they have the same MAC address

      // fetch status
      await execCommand('powershell -Command "Get-NetAdapter | Format-List"')
        .then((output) => {
          const lines = output.split('\n');
          let currNic: string | null = null;
          // tslint:disable-next-line:prefer-for-of
          for (let i = 0; i < lines.length; i++) {
            const [key, value] = lines[i].split(' : ').map((part) => part.trim());
            if (key === 'Name') {
              currNic = value;
            }
            if (!currNic) continue;

            if (!nics[currNic]) {
              // if the NIC is not in the list, add it
              nics[currNic] = {
                name: currNic,
                addresses: [],
                status: {
                  operational: 'unknown',
                  admin: true, // Default to true, will be updated based on platform
                  cable: false, // Default to false, will be updated based on platform
                },
                physical: !currNic.startsWith('v') && !currNic.startsWith('lo'), // Assume non-loopback and non-virtual interfaces are physical
              };
              additionallyFound.push(currNic);
            }

            if (key.startsWith('InterfaceOperationalStat')) {
              nics[currNic].status.operational = value.toLowerCase() as any;
            } else if (key.startsWith('Admin')) {
              nics[currNic].status.admin = value.toLowerCase() === 'up';
            } else if (key.startsWith('LinkSpeed')) {
              const speed = parseFloat(value.replace(/[^0-9.]/g, ''));
              const bits = Math.floor(speed * 1000000000); // Convert from Gbps to bps (bits/s)
              const bytes = Math.floor(bits / 8); // Convert from bps to Bps (bytes/s)
              nics[currNic].speed = {
                bits,
                bytes, // Convert from bps to Bps (bytes/s)
              };

              // compute utilization
              const utilization = NET_BYTES_PER_SECOND[currNic];
              if (utilization) {
                nics[currNic].utilization = {
                  receive: utilization.receive / bytes,
                  transmit: utilization.transmit / bytes,
                };
              }
            } else if (key.startsWith('ConnectorPresent')) {
              const present = value.toLowerCase() === 'true';
              nics[currNic].status.cable = present;
              if (present) nics[currNic].physical = true; // If a cable is present, it is a physical interface
            }
          }
        })
        .catch(() => '');
      break;
    }
  }
  return Object.values(nics);
}
