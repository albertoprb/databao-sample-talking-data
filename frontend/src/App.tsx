import { useState, useEffect } from "react";
import reactLogo from "./assets/react.svg";
import "./App.css";

const API_URL = "http://localhost:8808";

function App() {
  const [greetMsg, setGreetMsg] = useState("");
  const [name, setName] = useState("");
  const [backendStatus, setBackendStatus] = useState("Checking...");

  async function greet() {
    try {
      const response = await fetch(
        `${API_URL}/greet?name=${encodeURIComponent(name)}`
      );
      const data = await response.json();
      setGreetMsg(data.message);
    } catch (error) {
      setGreetMsg("Failed to greet - backend may be offline");
    }
  }

  useEffect(() => {
    // Retry health check since sidecar may take a moment to start
    const checkHealth = async (retries = 5, delay = 1000) => {
      for (let i = 0; i < retries; i++) {
        try {
          const res = await fetch(`${API_URL}/health`);
          const data = await res.json();
          setBackendStatus(`Backend: ${data.status}`);
          return;
        } catch (err) {
          if (i < retries - 1) {
            setBackendStatus(
              `Backend: Starting... (attempt ${i + 1}/${retries})`
            );
            await new Promise((r) => setTimeout(r, delay));
          } else {
            setBackendStatus(`Backend: Offline (${(err as Error).message})`);
          }
        }
      }
    };
    checkHealth();
  }, []);

  return (
    <main className="container">
      <h1>Welcome to Tauri + React</h1>

      <div className="row">
        <a href="https://vite.dev" target="_blank">
          <img src="/vite.svg" className="logo vite" alt="Vite logo" />
        </a>
        <a href="https://tauri.app" target="_blank">
          <img src="/tauri.svg" className="logo tauri" alt="Tauri logo" />
        </a>
        <a href="https://react.dev" target="_blank">
          <img src={reactLogo} className="logo react" alt="React logo" />
        </a>
      </div>
      <p>Click on the Tauri, Vite, and React logos to learn.</p>
      <p>
        <strong>{backendStatus}</strong>
      </p>

      <form
        className="row"
        onSubmit={(e) => {
          e.preventDefault();
          greet();
        }}
      >
        <input
          id="greet-input"
          onChange={(e) => setName(e.currentTarget.value)}
          placeholder="Enter a name..."
        />
        <button type="submit">Greet</button>
      </form>
      <p>{greetMsg}</p>
    </main>
  );
}

export default App;
