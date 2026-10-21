import React from "react";
import "bootstrap/dist/css/bootstrap.min.css";
import "./App.css";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Navbar from "./nav";
import Home from "./home";
import About from "./about";
import Research from "./research";
import Teaching from "./teaching";
import ContactForm from "./contact";

function App() {
  return (
    <BrowserRouter>
      <div className="App" id="top">
        <a className="skip-link" href="#main-content">Skip to content</a>
        <Navbar />
        <main className="container site-content" id="main-content" tabIndex="-1">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/about" element={<About />} />
            <Route path="/research" element={<Research />} />
            <Route path="/teaching" element={<Teaching />} />
            <Route path="/contact" element={<ContactForm />} />
          </Routes>
        </main>
        <footer className="container site-footer">
          <p>Website by Makayla Chen.</p>
        </footer>
      </div>
    </BrowserRouter>
  );
}
export default App;
