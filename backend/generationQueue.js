/** Run generate-image work one at a time so Gemini calls do not overlap. */
let chain = Promise.resolve();

export function enqueueGeneration(task) {
  const run = chain.then(() => task());
  chain = run.catch(() => {});
  return run;
}
