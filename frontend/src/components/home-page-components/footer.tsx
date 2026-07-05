export function Footer() {
  return (
    <footer className="border-t border-border px-6 py-12">
      <div className="mx-auto grid max-w-5xl gap-8 md:grid-cols-4">
        <div>
          <div className="mb-3">
            <img
              src="/Vivran.ai.jpg"
              alt="Vivran.ai"
              className="h-8"
            />
          </div>
          <p className="text-sm text-muted-foreground">
            AI meeting intelligence for India
          </p>
        </div>
        <div>
          <h4 className="mb-3 text-sm font-semibold">Product</h4>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li>
              <a
                href="#features"
                className="hover:text-foreground transition-colors"
              >
                Features
              </a>
            </li>
            <li>
              <a
                href="#how-it-works"
                className="hover:text-foreground transition-colors"
              >
                How it works
              </a>
            </li>
            <li>
              <a
                href="#pricing"
                className="hover:text-foreground transition-colors"
              >
                Pricing
              </a>
            </li>
          </ul>
        </div>
        <div>
          <h4 className="mb-3 text-sm font-semibold">Company</h4>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li>
              <a href="#" className="hover:text-foreground transition-colors">
                About
              </a>
            </li>
            <li>
              <a href="#" className="hover:text-foreground transition-colors">
                Blog
              </a>
            </li>
            <li>
              <a href="#" className="hover:text-foreground transition-colors">
                Contact
              </a>
            </li>
          </ul>
        </div>
        <div>
          <h4 className="mb-3 text-sm font-semibold">Legal</h4>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li>
              <a href="#" className="hover:text-foreground transition-colors">
                Privacy Policy
              </a>
            </li>
            <li>
              <a href="#" className="hover:text-foreground transition-colors">
                Terms of Service
              </a>
            </li>
            <li>
              <a href="#" className="hover:text-foreground transition-colors">
                Security
              </a>
            </li>
          </ul>
        </div>
      </div>
      <div className="mx-auto mt-10 max-w-5xl border-t border-border pt-6 text-center text-xs text-muted-foreground">
        &copy; {new Date().getFullYear()} Vivran.ai. Made in India. All meeting
        data stored in Mumbai.
      </div>
    </footer>
  );
}
