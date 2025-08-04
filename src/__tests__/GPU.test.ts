import { getGPUs } from '../gpu';

test('getGPUs', async () => {
  const gpus = await getGPUs();
  console.log(gpus); // TODO REMOVE
});
