/** Run up to 2 generate-image tasks concurrently (avoids overloading Gemini). */
const MAX_CONCURRENT = 2;

let active = 0;
const waitQueue = [];

function drain() {
  while (active < MAX_CONCURRENT && waitQueue.length > 0) {
    const { task, resolve, reject } = waitQueue.shift();
    active += 1;
    Promise.resolve()
      .then(() => task())
      .then(resolve, reject)
      .finally(() => {
        active -= 1;
        drain();
      });
  }
}

function enqueueGeneration(task) {
  return new Promise((resolve, reject) => {
    waitQueue.push({ task, resolve, reject });
    drain();
  });
}

module.exports = { enqueueGeneration };
