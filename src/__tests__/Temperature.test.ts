import { getTemperatures } from '../temperature';

test('getTemperatures', async () => {
  const temperatures = await getTemperatures();
  console.log(temperatures); // TODO REMOVE
});
