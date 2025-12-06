import { useState } from "react";
import { Link } from "react-router-dom";
import reactLogo from "../../assets/react.svg";
import { invoke } from "@tauri-apps/api/core";

function App() {
  const [greetMsg, setGreetMsg] = useState("");
  const [name, setName] = useState("");

  async function greet() {
    // Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
    setGreetMsg(await invoke("greet", { name }));
  }

  return (
    <main className="container">
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
      <p>Click on the Tauri, Vite, and React logos to learn more.</p>

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

      <div className="mt-4">
        <Link to="/timer" className="text-blue-500 hover:underline">
          Go to Timer
        </Link>
        <Link to="/login" className="text-blue-500 hover:underline ml-4">
          Login
        </Link>
        <Link to="/register" className="text-blue-500 hover:underline ml-4">
          Register
        </Link>
        <Link to="/projects/create" className="text-blue-500 hover:underline ml-4">
          Create Project
        </Link>
        <Link to="/tasks/create" className="text-blue-500 hover:underline ml-4">
          Create Task
        </Link>
        <Link to="/clients/create" className="text-blue-500 hover:underline ml-4">
          Create Client
        </Link>
      </div>
    </main>
  );
}

export default App;
