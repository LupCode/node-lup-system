import * as cpu from './cpu';
import * as drive from './drive';
import * as net from './net';
import * as temperatures from './temperature';
import * as utils from './utils';

/**
 * Utility functions for interacting with the operating system.
 */
const osUtils = {
  ...cpu,
  ...drive,
  ...net,
  ...temperatures,
  ...utils,
};
export default osUtils;
