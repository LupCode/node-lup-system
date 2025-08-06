import { getDockerContainers } from '../docker';

test('getDockerContainers', async () => {
  const containers = await getDockerContainers(true);
  console.log(JSON.stringify(containers, null, 2)); // TODO REMOVE
});
