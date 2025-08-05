export * from './cpu';
export * from './docker';
export * from './drive';
export * from './gpu';
export * from './memory';
export * from './net';
export * from './os';
export * from './temperature';
export * from './utils';

import * as cpu from './cpu';
import * as docker from './docker';
import * as drive from './drive';
import * as gpu from './gpu';
import * as memory from './memory';
import * as net from './net';
import * as os from './os';
import * as temperatures from './temperature';
import * as utils from './utils';

/**
 * Utility functions for interacting with the system.
 */
const lupSystem = {
  ...cpu,
  ...docker,
  ...drive,
  ...gpu,
  ...memory,
  ...net,
  ...os,
  ...temperatures,
  ...utils,
};
export default lupSystem;
