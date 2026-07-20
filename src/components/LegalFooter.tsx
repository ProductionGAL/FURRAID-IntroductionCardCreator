type LegalFooterProps = {
  readonly className: string
  readonly noticesHref: string
}

export const LegalFooter = ({ className, noticesHref }: LegalFooterProps) => (
  <footer className={`legal-footer ${className}`}>
    <span>© 2026 FUR:RAID Comm. All rights reserved.</span>
    <span>Developed by Logmong</span>
    <a href={noticesHref} target="_blank" rel="noreferrer">
      Open Source Licenses
    </a>
  </footer>
)
