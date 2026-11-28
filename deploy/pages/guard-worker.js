import { checkExport } from './guard-engine.js';

self.addEventListener('message', async ({ data }) => {
  try {
    const { contract, csv } = data;
    const decode = new TextDecoder('utf-8', { fatal: true });
    const read = async (input, label) => {
      if (typeof input === 'string') return input;
      const limit = label === 'CSV' ? 8 : 1;
      if (input.size > limit * 1024 * 1024) throw new Error(label + ' exceeds the ' + limit + ' MiB limit.');
      if (!input.size) throw new Error(label + ' file is empty.');
      try { return decode.decode(await input.arrayBuffer()); }
      catch { throw new Error(label + ' file must be valid UTF-8.'); }
    };
    const [contractText, csvText] = await Promise.all([read(contract, 'Contract'), read(csv, 'CSV')]);
    self.postMessage({ report: checkExport(contractText, csvText) });
  } catch (error) {
    self.postMessage({ error: error.message });
  }
});
