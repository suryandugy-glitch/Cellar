import { checkCompiledContract, compileContract, draftHeaderContract } from './guard-engine.js';

async function read(input, label, limit) {
  if (typeof input === 'string') return input;
  if (input.size > limit * 1024 * 1024) throw new Error(label + ' exceeds the ' + limit + ' MiB limit.');
  if (!input.size) throw new Error(label + ' file is empty.');
  const bytes = await input.arrayBuffer();
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(bytes);
  } catch {
    throw new Error(label + ' file must be valid UTF-8.');
  }
}

self.addEventListener('message', async ({ data }) => {
  const { task, contract, csv, delimiter } = data;
  let field = 'csv';
  let details;
  try {
    if (task === 'draft') {
      self.postMessage({ draft: draftHeaderContract(await read(csv, 'CSV', 8), delimiter) });
      return;
    }
    field = 'contract';
    const source = await read(contract, 'Contract', 1);
    const compiled = compileContract(source);
    details = {
      source: typeof contract === 'string' ? null : source,
      count: compiled.integrations.length,
    };
    if (task === 'validate') {
      self.postMessage({ details });
      return;
    }
    field = 'csv';
    const report = checkCompiledContract(compiled, await read(csv, 'CSV', 8));
    self.postMessage({ details, report });
  } catch (error) {
    self.postMessage({ details, field, error: error.message });
  }
});
