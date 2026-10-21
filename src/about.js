import React from "react";

export function ContactLinks({ className = "" }) {
  return (
    <div className={"profile-contact-links " + className}>
      <p>Email: <a href="mailto:xche225@uwo.ca">xche225@uwo.ca</a></p>
      <p><a href="/Xun-Chen-CV.pdf" target="_blank" rel="noopener noreferrer">CV</a></p>
    </div>
  );
}

function About() {
  return (
    <section className="About site-section" id="about" aria-label="About Me">
      <p>Welcome to my website!</p>
      <p>I am a PhD candidate in economics at the University of Western Ontario.</p>
      <p>My research interests are microeconomic theory, corporate finance, and industrial organization.</p>
      <p>I am on the 2026–2027 academic job market.</p>
      <ContactLinks />
    </section>
  );
}
export default About;
