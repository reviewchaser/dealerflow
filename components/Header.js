import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import Image from "next/image";

const links = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/appraisals", label: "Appraisals" },
  { href: "/vehicles", label: "Vehicles" },
  { href: "/contacts", label: "Contacts" },
];

const Header = () => {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    setIsOpen(false);
  }, [router.asPath]);

  return (
    <header className="bg-base-200">
      <nav className="container flex items-center justify-between px-8 py-4 mx-auto">
        <div className="flex lg:flex-1">
          <Link className="flex items-center gap-2 shrink-0" href="/">
            <span className="text-2xl">🚗</span>
            <span className="font-extrabold text-lg">DealerFlow</span>
          </Link>
        </div>

        <div className="flex lg:hidden">
          <button 
            type="button" 
            className="-m-2.5 inline-flex items-center justify-center rounded-md p-2.5" 
            onClick={() => setIsOpen(true)}
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
            </svg>
          </button>
        </div>

        <div className="hidden lg:flex lg:justify-center lg:gap-12 lg:items-center">
          {links.map((link) => (
            <Link 
              key={link.href} 
              href={link.href} 
              className={`link link-hover ${router.pathname.startsWith(link.href) ? "text-primary font-semibold" : ""}`}
            >
              {link.label}
            </Link>
          ))}
        </div>

        <div className="hidden lg:flex lg:justify-end lg:flex-1">
          <Link href="/dashboard" className="btn btn-primary btn-sm">
            Go to Dashboard
          </Link>
        </div>
      </nav>

      {/* Mobile menu */}
      <div className={`relative z-50 ${isOpen ? "" : "hidden"}`}>
        <div className="fixed inset-y-0 right-0 z-10 w-full px-8 py-4 overflow-y-auto bg-base-200 sm:max-w-sm">
          <div className="flex items-center justify-between">
            <Link className="flex items-center gap-2" href="/">
              <span className="text-2xl">🚗</span>
              <span className="font-extrabold text-lg">DealerFlow</span>
            </Link>
            <button type="button" onClick={() => setIsOpen(false)}>
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <div className="flow-root mt-6">
            <div className="py-4 flex flex-col gap-y-4">
              {links.map((link) => (
                <Link 
                  key={link.href} 
                  href={link.href} 
                  className={`link link-hover ${router.pathname.startsWith(link.href) ? "text-primary font-semibold" : ""}`}
                >
                  {link.label}
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
