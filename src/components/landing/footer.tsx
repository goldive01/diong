const footerLinks = ["About", "How it works", "Privacy", "Terms", "Contact"];

export function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="border-t border-[#ded7c9] bg-[#f7f4ee]">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-5 py-8 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8">
        <p className="text-sm text-[#5f695f]">
          &copy; {currentYear} Diong. All rights reserved.
        </p>
        <nav aria-label="Footer navigation" className="flex flex-wrap gap-4">
          {footerLinks.map((link) => (
            <a
              key={link}
              href={link === "How it works" ? "#how-it-works" : "#"}
              className="text-sm font-medium text-[#4b554d] transition hover:text-[#1d2420]"
            >
              {link}
            </a>
          ))}
        </nav>
      </div>
    </footer>
  );
}
