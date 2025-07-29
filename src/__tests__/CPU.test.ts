import { getCpuTemperature, getCpuUtilization, stopCpuUtilizationComputation } from '../cpu';

test('getCpuTemperature', async () => {
  const temp = await getCpuTemperature();
  console.log('CPU temperature:', temp); // TODO REMOVE
});

test('getCpuUtilization', async () => {
  const utilization = await getCpuUtilization();
  console.log('CPU utilization:', utilization); // TODO REMOVE
});

afterAll(() => {
  stopCpuUtilizationComputation();
});
