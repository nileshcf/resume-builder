/**
 * App credit footer — appears in the app chrome ONLY, never in the exported
 * resume (PDF/DOCX export just the #resume-paper DOM), so user output stays
 * clean and ATS-safe. Profile data sourced from the author's portfolio.
 */
export function CreditFooter() {
  return (
    <footer className="credit" aria-label="About the developer">
      <img className="credit-photo" src="/nilesh.jpeg" alt="Nilesh Verma" width={40} height={40} />
      <div className="credit-meta">
        <div className="credit-name">
          Built by <strong>Nilesh Verma</strong>
          <span className="credit-role"> · Cloud Specialist / Solutions Architect</span>
        </div>
        <nav className="credit-links">
          <a href="https://www.linkedin.com/in/nileshvermaa/" target="_blank" rel="noreferrer">LinkedIn</a>
          <span aria-hidden="true">·</span>
          <a href="https://github.com/nileshcf" target="_blank" rel="noreferrer">GitHub</a>
          <span aria-hidden="true">·</span>
          <a href="mailto:nileshvermaq@gmail.com">Email</a>
        </nav>
      </div>
      <span className="credit-note">100% in your browser · free &amp; private</span>
    </footer>
  );
}
