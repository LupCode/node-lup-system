import { isPortInUse, getNetworkInterfaces, stopNetworkUtilizationComputation } from '../net';
import net from 'net';

test('getNetworkInterfaces', async () => {
  const nics = await getNetworkInterfaces();
  //console.log(nics); // TODO REMOVE
  expect(nics).toBeDefined();
  expect(nics.length).toBeGreaterThan(0);
}, 10000);

test('isPortInUse(12345)', async () => {
  const port = 12345;

  // port should be free
  const isInUse1 = await isPortInUse(port);
  expect(isInUse1).toBe(false);

  // start a server
  const server = net.createServer();
  server.unref();
  await new Promise<void>((resolve) => server.listen(port, '0.0.0.0', resolve));

  // port should now be in use
  const isInUse2 = await isPortInUse(port);
  expect(isInUse2).toBe(true);

  server.close();
});

afterAll(() => {
  stopNetworkUtilizationComputation();
});
