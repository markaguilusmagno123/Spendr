async function testOllama() {
  try {
    const response = await fetch(
      "http://localhost:11434/api/chat",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model: "llama3.2",
          messages: [
            {
              role: "user",
              content: "Say hello to Spendr in one short sentence."
            }
          ],
          stream: false
        })
      }
    );

    if (!response.ok) {
      throw new Error(`HTTP error: ${response.status}`);
    }

    const data = await response.json();

    console.log("Ollama says:", data.message.content);
  } catch (error) {
    console.error("Ollama connection failed:", error.message);
  }
}

testOllama();