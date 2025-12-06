import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import App from "./routes/home/page";
import Timer from "./routes/timer/page";
import LoginPage from "./routes/login/page";
import "./App.css";
import RegisterPage from "./routes/register/page";
import CreateProjectPage from "./routes/projects/create/page";
import CreateTaskPage from "./routes/tasks/create/page";
import CreateClientPage from "./routes/clients/create/page";
import Navbar from "./components/Navbar";

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <BrowserRouter>
      <Navbar />
      <Routes>
        <Route path="/" element={<App />} />
        <Route path="/timer" element={<Timer />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/projects/create" element={<CreateProjectPage />} />
        <Route path="/tasks/create" element={<CreateTaskPage />} />
        <Route path="/clients/create" element={<CreateClientPage />} />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>,
);
