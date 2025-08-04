export type Memory = {
  /** Memory size in bytes. */
  size: number; // Size in bytes

  /** Memory used in bytes. */
  used: number;

  /** Memory free in bytes. */
  free: number;

  /** Utilization of available memory in percentage (0.0-1.0). */
  utilization: number;

  /** Memory type (e.g., DDR4, LPDDR4X). */
  type: string;

  /** Memory clock speed in MHz. */
  frequency: number;

  /** Memory speed in bytes per second. */
  speed: number;
};
