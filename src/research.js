import React from "react";
import { workInProgress } from "./content";

function Research() {
  return (
    <section className="research-section site-section" id="research" aria-labelledby="research-heading">
      <h2 id="research-heading">Research</h2>
      <div className="research-group" id="working-papers">
        <h3>Working Papers</h3>
        <article className="paper">
          <h4>Optimally Selling Heterogeneous Objects by Quantity</h4>
          <p className="paper-meta">Job Market Paper · Coming soon</p>
        </article>
        <article className="paper">
          <h4>Optimal Multi-Object Auctions for Geographic Concessions under a Cardinality Constraint</h4>
          <p className="paper-meta">Coming soon</p>
        </article>
        <article className="paper">
          <h4>Reserve Price Signaling in Equity Auctions</h4>
          <p className="paper-authors"><em>Joint with</em> Mingrui Gao, Dazhong Wang, and Kun Zhu · Available upon request</p>
        </article>
        <article className="paper">
          <h4>Standard Equity Auctions with Seller Moral Hazard</h4>
          <p className="paper-authors"><em>Joint with</em> Dazhong Wang and Xianjie Zeng · Available upon request</p>
        </article>
      </div>
      <div className="research-group" id="publications">
        <h3>Publications</h3>
        <article className="paper">
          <h4><a href="https://doi.org/10.1016/j.jmateco.2026.103246" target="_blank" rel="noopener noreferrer">Equity auctions with bidder moral hazard</a></h4>
          <p className="paper-meta"><em>Journal of Mathematical Economics</em>, 124, 103246, 2026</p>
          <p className="paper-authors"><em>Joint with</em> Mingrui Gao and Dazhong Wang</p>
        </article>
        <article className="paper">
          <h4><a href="https://doi.org/10.1007/s00355-021-01351-w" target="_blank" rel="noopener noreferrer">Optimal revenue-sharing mechanisms with seller commitment to ex-post effort</a></h4>
          <p className="paper-meta"><em>Social Choice and Welfare</em>, 58(1), 141–159, 2022</p>
          <p className="paper-authors"><em>Joint with</em> Shanmin Li and Dazhong Wang</p>
        </article>
      </div>
      <div className="research-group" id="work-in-progress">
        <h3>Work in Progress</h3>
        <ul className="work-in-progress-list">
          {workInProgress.map((title) => <li key={title}>{title}</li>)}
        </ul>
      </div>
    </section>
  );
}
export default Research;
