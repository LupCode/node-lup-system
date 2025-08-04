import { getCpuInfo, stopCpuUtilizationComputation } from '../cpu';

test('getCpuInfo', async () => {
  const cpuInfo = await getCpuInfo();
  console.log('CPU Info:', cpuInfo); // TODO REMOVE
});

afterAll(() => {
  stopCpuUtilizationComputation();
});
