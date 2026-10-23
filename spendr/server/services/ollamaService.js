const OLLAMA_URL =
  process.env.OLLAMA_URL || "http://localhost:11434";

const OLLAMA_MODEL =
  process.env.OLLAMA_MODEL || "llama3.2";

async function askOllama(prompt) {
  const response = await fetch(
    `${OLLAMA_URL}/api/chat`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: OLLAMA_MODEL,
        messages: [
          {
            role: "system",
            content:
              "You are Spendr AI, a helpful personal expense assistant. " +
              "Use the supplied data, explain insights simply, and never invent financial figures."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        stream: false
      })
    }
  );

  if (!response.ok) {
    throw new Error(
      `Ollama request failed: HTTP ${response.status}`
    );
  }

  const data = await response.json();

  return data.message.content;
}

module.exports = { askOllama };