import React from "react";
import NamePronunciation from "./pronunciation";

function homeUrl() {
  return typeof window !== "undefined" && new URLSearchParams(window.location.search).get("view") === "desktop"
    ? "/?view=desktop"
    : "/";
}

export function SectionLinks({ className = "" }) {
  const rootUrl = homeUrl();
  return (
    <nav className={"section-navigation " + className} aria-label="Main navigation">
      <a href={rootUrl + "#top"}>About Me</a>
      <a href={rootUrl + "#research"}>Research</a>
      <a href={rootUrl + "#teaching"}>Teaching</a>
    </nav>
  );
}

function Navbar() {
  return (
    <header className="site-header navbar navbar-light bg-light">
      <div className="container header-inner">
        <div className="site-identity">
          <a className="navbar-brand" href={homeUrl() + "#top"}><h1>Xun Chen</h1></a>
          <NamePronunciation />
        </div>
        <SectionLinks className="header-navigation" />
      </div>
    </header>
  );
}
export default Navbar;
