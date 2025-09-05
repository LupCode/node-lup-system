import { start } from 'repl';
import {
  isPortInUse,
  getNetworkInterfaces,
  stopNetworkUtilizationComputation,
  canConnect,
  isPortListendedOn,
  getPrimaryIp,
} from '../net';
import net from 'net';

test('getNetworkInterfaces', async () => {
  const nics = await getNetworkInterfaces();
  console.log(JSON.stringify(nics, null, 2));
  expect(nics).toBeDefined();
  expect(nics.length).toBeGreaterThan(0);
}, 10000);

test('getPrimaryIp()', async () => {
  const ip = await getPrimaryIp();
  console.log('Primary IP:', ip);
  expect(ip).toBeDefined();
  expect(ip).toMatch(/\d+\.\d+\.\d+\.\d+/);
});

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

test('isPortListenedOn not affecting canConnect', async () => {
  for (let i = 0; i < 10; i++) {
    const canConn = await canConnect(12345);
    expect(canConn).toBe(false);

    const isListened = await isPortListendedOn(12345);
    expect(isListened).toBe(false);
  }
});

/*
test('canConnect vs isPortListenedOn', async () => {
  const iterations = 50;
  const freePort = 12345;
  const usedPort = 12346;


  // start server
  const server = net.createServer();
  server.unref();
  await new Promise<void>((resolve) => server.listen(usedPort, '0.0.0.0', resolve));


  console.log('-----');


  // measure canConnect on free port
  let start = Date.now();
  for(let i=0; i < iterations; i++){
    await canConnect(freePort);
  }
  const durationConnectFree = Date.now() - start;
  console.log(`canConnect -> false: took ${durationConnectFree}ms`);
  
  // measure isPortListendedOn on free port
  start = Date.now();
  for(let i=0; i < iterations; i++){
    await isPortListendedOn(freePort);
  }
  const durationListenFree = Date.now() - start;
  console.log(`isPortListendedOn -> false: took ${durationListenFree}ms`);


  console.log('-----');


  // measure canConnect on used port
  start = Date.now();
  for(let i=0; i < iterations; i++){
    await canConnect(usedPort);
  }
  const durationConnectUsed = Date.now() - start;
  console.log(`canConnect -> true: took ${durationConnectUsed}ms`);

  // measure isPortListendedOn on used port
  start = Date.now();
  for(let i=0; i < iterations; i++){
    await isPortListendedOn(usedPort);
  }
  const durationListenUsed = Date.now() - start;
  console.log(`isPortListendedOn -> true: took ${durationListenUsed}ms`);


  console.log('-----');

  const durationConnAvg = (durationConnectFree + durationConnectUsed) / 2;
  const durationListenAvg = (durationListenFree + durationListenUsed) / 2;

  console.log(`canConnect avg: ${durationConnAvg}ms`);
  console.log(`isPortListendedOn avg: ${durationListenAvg}ms`);

  server.close();
});
*/

/*
test('DEBUG', async () => {
  const ports = [ 5050, 5432, 6379, 27017 ];
  const addresses = [ '0.0.0.0', '127.0.0.1', '::' ];

  await Promise.allSettled(ports.flatMap(p => addresses.map<[number, string]>(a => [p, a])).map(async ([port, addr]) => {
    const inUse = await isPortInUse(port, addr);
    console.log(port, addr, inUse); // TODO REMOVE
  }));
});
*/

afterAll(() => {
  stopNetworkUtilizationComputation();
});
