import { exec } from 'child_process';

/**
 * Runs a shell command and returns the output.
 *
 * @param command Command to execute in the shell.
 * @returns Stdout and stderr output of the command.
 */
export async function execCommand(command: string): Promise<string> {
  return new Promise((resolve, reject) => {
    let output = '';
    const child = exec(command, { windowsHide: true });
    child.stdout?.on('data', (data) => {
      output += data.toString();
    });
    child.stderr?.on('data', (data) => {
      output += data.toString();
    });
    child.on('close', (code) => {
      if (code === 0) {
        resolve(output);
      } else {
        reject(new Error(`Command failed with exit code ${code}: ${output}`));
      }
    });
  });
}

/**
 * Pauses execution for a specified duration.
 *
 * @param ms Duration to sleep in milliseconds.
 * @returns A promise that resolves after the specified duration.
 */
export async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}
