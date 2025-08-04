import { execCommand } from './utils';

const VIRTUAL_DRIVE_TYPES = [
  'devtmpfs', // Device filesystem
  'tmpfs', // Temporary filesystem
  'overlay', // Overlay filesystem
];

export type DriveInfo = {
  /** The device name of the drive (e.g., /dev/sda1) */
  filesystem: string;

  /** The mount point of the drive (e.g., /, /home) */
  mount: string;

  /** The filesystem type (e.g., ext4, ntfs) */
  type: 'btrfs' | 'devtmpfs' | 'ext4' | 'ntfs' | 'overlay' | 'tmpfs' | 'vfat' | 'xfs' | string;

  /** The total amount of unused drive space in bytes. */
  free: number;

  /** The amount of drive space used in bytes. */
  used: number;

  /** The total size of the drive in bytes. */
  total: number;

  /** The current drive utilization as a percentage (0-1). */
  utilization: number;
};

/**
 * Returns information about the drives on the system (in Windows the logical drives are returned).
 *
 * @param includeVirtual If virtual drives should be included in the results (only relevant for Linux and macOS).
 * @returns List of drive information objects.
 */
export async function getDrives(includeVirtual: boolean = false): Promise<DriveInfo[]> {
  const drives: DriveInfo[] = [];
  switch (process.platform) {
    case 'darwin':
    case 'linux': {
      const output = await execCommand('df -PT --block-size=1').catch(() => '');
      const lines = output.split('\n');
      for (let i = 1; i < lines.length; i++) {
        // skip first line (header)
        const line = lines[i].trim();
        if (!line) continue;
        const parts = line.split(/\s+/); // columns are separated by one or more spaces
        if (parts.length < 5) continue; // expect at least 5 columns
        const type = (parts[1] as string).toLowerCase();
        if (!includeVirtual && VIRTUAL_DRIVE_TYPES.includes(type)) continue; // skip virtual drives
        const used = parseInt(parts[3], 10) || 0;
        const total = parseInt(parts[2], 10) || 0;
        drives.push({
          filesystem: parts[0] as string,
          type,
          total,
          used,
          free: parseInt(parts[4], 10) || 0,
          utilization: total !== 0 ? used / total : 0,
          mount: (parts[6] || parts[0]) as string,
        });
      }
      break;
    }

    case 'win32': {
      const output = await execCommand(
        'powershell -Command "Get-CimInstance -ClassName Win32_LogicalDisk | Select-Object Caption, VolumeName, Size, FreeSpace, FileSystem | ConvertTo-Json"',
      ).catch(() => '');
      const json = JSON.parse(output);
      for (const drive of json) {
        const total = parseInt(drive.Size, 10) || 0;
        const free = parseInt(drive.FreeSpace, 10) || 0;
        drives.push({
          filesystem: drive.Caption,
          mount: drive.VolumeName || drive.Caption,
          type: (drive.FileSystem || 'unknown').toLowerCase(),
          total,
          free,
          used: total - free,
          utilization: total !== 0 ? (total - free) / total : 0,
        });
      }
      break;
    }
  }
  return drives;
}
