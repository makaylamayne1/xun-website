import React from "react";

export const CONTACT_EMAIL = "xche225@uwo.ca";

export default function ContactForm() {
  return (
    <section
      className="contact-section site-section py-3"
      id="contact"
      aria-labelledby="contact-heading"
    >
      <h2 className="mb-4 text-start" id="contact-heading">
        Contact
      </h2>

      <p>
        Please feel free to contact me by email at{" "}
        <a
          href={`mailto:${CONTACT_EMAIL}`}
          style={{ textDecoration: "none" }}
        >
          {CONTACT_EMAIL}
        </a>
        .
      </p>
    </section>
  );
}