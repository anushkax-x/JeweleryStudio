const key = process.env.GEMINI_API_KEY;
const model = 'gemini-3.1-flash-image-preview';

async function test() {
  try {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:predict?key=${key}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        instances: [{ prompt: "Generate a beautiful gold necklace" }],
        parameters: { sampleCount: 1 }
      })
    });
    
    if (res.status === 404 || res.status === 400) {
      console.log('Testing generateContent instead...');
      const res2 = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: "Generate a beautiful gold necklace" }] }]
        })
      });
      const data2 = await res2.json();
      console.log("generateContent output:", JSON.stringify(data2, null, 2));
      return;
    }
    
    const data = await res.json();
    console.log("predict output:", JSON.stringify(data, null, 2));
  } catch (err) {
    console.error(err);
  }
}

test();
