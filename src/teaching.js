import React from "react";
import { instructorCourses, teachingAssistantCourses } from "./content";

function Teaching() {
  return (
    <section className="teaching-section site-section" id="teaching" aria-labelledby="teaching-heading">
      <h2 id="teaching-heading">Teaching</h2>
      <h3>Instructor (Undergraduate)</h3>
      <ul className="teaching-list">
        {instructorCourses.map((course) => (
          <li key={course.title}>
            <h4>{course.title}{course.honours ? " (Honours)" : ""}</h4>
            <p className="course-details">
              <span>{course.details}</span>
              {course.evaluation === "Ongoing" ? (
                <span>Ongoing</span>
              ) : (
                <a className="course-evaluation" href={course.evaluationUrl} target="_blank" rel="noopener noreferrer">
                  Course evaluation: {course.evaluation === "Insufficient responses" ? "insufficient responses" : course.evaluation}
                </a>
              )}
            </p>
          </li>
        ))}
      </ul>
      <h3>Teaching Assistant</h3>
      <ul className="teaching-list">
        {teachingAssistantCourses.map((course) => (
          <li key={course.title}>
            <h4>{course.title}</h4>
            <p>{course.details}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}
export default Teaching;
