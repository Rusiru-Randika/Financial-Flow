type AmplifyOutputs = any;

let cachedOutputs: AmplifyOutputs | null | undefined;

export async function loadAmplifyOutputs(): Promise<AmplifyOutputs | null> {
  if (cachedOutputs !== undefined) return cachedOutputs;

  try {
    const res = await fetch('/amplify_outputs.json', { cache: 'no-store' });
    if (!res.ok) {
      cachedOutputs = null;
      return null;
    }

    const outputs = (await res.json()) as AmplifyOutputs;
    if (outputs && outputs.auth && typeof outputs.auth.user_pool_id === 'string' && outputs.auth.user_pool_id) {
      cachedOutputs = outputs;
      return outputs;
    }
  } catch {
    // ignore
  }

  cachedOutputs = null;
  return null;
}
