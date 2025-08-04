import os from 'os';

export type OSInfo = {

    /** Name of the operating system (e.g., Windows, Linux, macOS). */
    name: string;

    /** Version of the operating system (e.g., 10.0.19042 for Windows 10). */
    version: string;

    /** 
     * Architecture of the operating system (e.g., x64, arm64). 
     * This refers to the CPU architecture, which indicates the type of processor and instruction set used by the operating system.
     * For example, x64 is used for 64-bit Intel/AMD processors, while arm64 is used for 64-bit ARM processors.
     */
    architecture: string;

    /** 
     * Machine type (e.g., x86_64, armv7l). 
     * The difference between architecture and machine is that architecture refers to the CPU architecture, while machine refers to the specific hardware platform
     * like x86_64 for 64-bit Intel/AMD processors or armv7l for 32-bit ARM processors.
     */
    machine: string;

    /** 
     * Platform of the operating system (e.g., win32, linux, darwin). 
     * This indicates the underlying platform on which the operating system is running.
     * For example, win32 is used for Windows, linux for Linux distributions, and darwin for macOS.
     */
    platform: string;

    /** Number of bits in the operating system (e.g., 32 or 64). */
    bits: number;

    /** Hostname of the machine. */
    hostname: string;

    /** Date since when the system has been booted. */
    uptime?: Date;
};

/**
 * Returns information about the operating system.
 * 
 * @returns Operating system information.
 */
export async function getOSInfo(): Promise<OSInfo> {
    return {
        name: os.type().replaceAll('_NT', ''), // normalize name
        version: os.release(),
        architecture: os.arch(),
        machine: os.machine(),
        platform: os.platform(),
        bits: os.arch().includes('64') ? 64 : 32,
        hostname: os.hostname(),
        uptime: new Date(Date.now() - os.uptime() * 1000)
    };
}