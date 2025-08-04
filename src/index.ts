import * as cpu from './cpu';
import * as drive from './drive';
import * as gpu from './gpu';
import * as net from './net';
import * as os from './os';
import * as temperatures from './temperature';
import * as utils from './utils';

/**
 * Utility functions for interacting with the operating system.
 */
const osUtils = {
  ...cpu,
  ...drive,
  ...gpu,
  ...net,
  ...os,
  ...temperatures,
  ...utils,
};
export default osUtils;
