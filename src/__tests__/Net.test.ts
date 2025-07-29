import { getNetworkInterfaces, stopNetworkUtilizationComputation } from '../net';

test('getNetworkInterfaces', async () => {
  const nics = await getNetworkInterfaces();
  console.log(nics); // TODO REMOVE
});

afterAll(() => {
  stopNetworkUtilizationComputation();
});
