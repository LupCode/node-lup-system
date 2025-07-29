import { getCpuUtilization, stopCpuUtilizationComputation } from '../cpu';

test('getCpuUtilization', async () => {
  const utilization = await getCpuUtilization();
  console.log('CPU utilization:', utilization); // TODO REMOVE
});

afterAll(() => {
  stopCpuUtilizationComputation();
});
