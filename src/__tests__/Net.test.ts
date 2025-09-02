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

/*
test('DEBUG', async () => {
  const ports = {
    5050: false,
    5432: false,
    6379: false,
    27017: false,
  };

  await Promise.allSettled(Object.keys(ports).map(async p => {
    const inUse1 = await isPortInUse(parseInt(p), '0.0.0.0');
    const inUse2 = await isPortInUse(parseInt(p), '127.0.0.1');
    ports[p] = inUse1 || inUse2;
  }));

  console.log(JSON.stringify(ports, null, '  '));
});
*/

afterAll(() => {
  stopNetworkUtilizationComputation();
});
