const navigationItems = [
  { label: "How it works", href: "#how-it-works" },
  { label: "Features", href: "#features" },
  { label: "Prime Protocol", href: "#prime-protocol" },
  { label: "Community", href: "#community" },
];

export function Navbar() {
  return (
    <header className="sticky top-0 z-30 border-b border-[#ded7c9]/80 bg-[#f7f4ee]/90 backdrop-blur">
      <nav
        aria-label="Main navigation"
        className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-5 py-4 sm:px-6 lg:px-8"
      >
        <a
          href="#top"
          className="text-xl font-bold tracking-tight text-[#1d2420]"
          aria-label="Diong home"
        >
          Diong
        </a>
        <div className="hidden items-center gap-7 text-sm font-medium text-[#4b554d] lg:flex">
          {navigationItems.map((item) => (
            <a
              key={item.href}
              href={item.href}
              className="transition hover:text-[#1d2420]"
            >
              {item.label}
            </a>
          ))}
        </div>
        <div className="flex items-center gap-2 sm:gap-3">
          <a
            href="#"
            className="hidden rounded-full px-4 py-2 text-sm font-semibold text-[#3f4a42] transition hover:bg-white/70 sm:inline-flex"
          >
            Log in
          </a>
          <a
            href="#start"
            className="inline-flex min-h-11 items-center justify-center rounded-full bg-[#1d2420] px-5 text-sm font-semibold text-white shadow-sm shadow-[#1d2420]/20 transition hover:bg-[#2f3a34] focus:outline-none focus:ring-2 focus:ring-[#1d2420] focus:ring-offset-2 focus:ring-offset-[#f7f4ee]"
          >
            Start free
          </a>
        </div>
      </nav>
    </header>
  );
}
