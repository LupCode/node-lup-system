import { getOSInfo } from '../os';

test('getOSInfo', async () => {
  const osInfo = await getOSInfo();
  console.log(osInfo); // TODO REMOVE
});
