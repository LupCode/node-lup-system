import { getDrives } from '../drive';

test('getDrives', async () => {
  const drives = await getDrives();
  console.log(drives); // TODO REMOVE
});
