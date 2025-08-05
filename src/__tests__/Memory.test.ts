import { getMemoryInfo } from '../memory';

test('getMemoryInfo', async () => {
  const memory = await getMemoryInfo();
  console.log(memory); // TODO REMOVE
});
