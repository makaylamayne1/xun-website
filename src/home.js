import React from "react";
import About from "./about";
import Research from "./research";
import Teaching from "./teaching";
import ContactForm from "./contact";

function Home() {
  return (
    <div className="Home">
      <div className="profile-intro" aria-label="Profile">
        <About />
        <figure className="profile-portrait">
          <img src="/xun-chen.jpg" alt="Xun Chen" width="300" height="361" fetchPriority="high" />
        </figure>
      </div>
      <Research />
      <Teaching />
      <ContactForm />
    </div>
  );
}
export default Home;
