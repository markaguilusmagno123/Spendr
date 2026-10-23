
import { useState } from "react";
import "./SpendrAI.css";

function SpendrAI() {
    const [message, setMessage] = useState("");
    const [answer, setAnswer] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const sendMessage = async (event) => {
        event.preventDefault();

        if (!message.trim() || loading) return;

        setLoading(true);
        setError("");
        setAnswer("");

        try {
            const response = await fetch(
                "http://localhost:5000/api/ai/chat",
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({
                        message: message.trim()
                    })
                }
            );

            const data = await response.json();

            if (!response.ok) {
                throw new Error(
                    data.message || "Failed to get an AI response."
                );
            }

            setAnswer(data.answer);
            setMessage("");
        } catch (error) {
            setError(
                error.message || "Unable to connect to Spendr AI."
            );
        } finally {
            setLoading(false);
        }
    };

    return (
        <section className="spendr-ai">
            <h2>Spendr AI</h2>
            <p>
                Get helpful insights about your spending.
            </p>

            <form onSubmit={sendMessage}>
                <textarea
                    value={message}
                    onChange={(event) =>
                        setMessage(event.target.value)
                    }
                    placeholder="Ask about your expenses..."
                    rows={3}
                    maxLength={1000}
                    disabled={loading}
                />

                <button
                    type="submit"
                    disabled={loading || !message.trim()}
                >
                    {loading ? "Analyzing..." : "Ask Spendr AI"}
                </button>
            </form>

            {error && (
                <p className="ai-error" role="alert">
                    {error}
                </p>
            )}

            {answer && (
                <div className="ai-answer">
                    <h3>AI Insight</h3>
                    <p>{answer}</p>
                </div>
            )}
        </section>
    );
}

export default SpendrAI;
