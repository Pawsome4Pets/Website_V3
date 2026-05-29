import { useState } from 'react';
import { NavLink, Outlet, Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../../context/AuthContext';

const NAV = [
  { to: '/admin',            label: 'Dashboard',   icon: 'M3 12l9-9 9 9M5 10v10h14V10' },
  { to: '/admin/forms',      label: 'Forms',       icon: 'M9 12h6M9 16h6M9 8h6M5 4h14a2 2 0 012 2v14a2 2 0 01-2 2H5a2 2 0 01-2-2V6a2 2 0 012-2z' },
  { to: '/admin/import',     label: 'Import',      icon: 'M12 4v12m0 0l-4-4m4 4l4-4M4 20h16' },
  { to: '/admin/submissions',label: 'Submissions', icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2' },
  { to: '/admin/users',      label: 'Users',       icon: 'M17 20h5v-2a4 4 0 00-3-3.87M9 20H4v-2a4 4 0 013-3.87m6-5.13a4 4 0 11-8 0 4 4 0 018 0zm6 0a4 4 0 11-8 0 4 4 0 018 0z' },
  { to: '/admin/activity',   label: 'Activity',    icon: 'M13 7h8m0 0v8m0-8l-8 8-4-4-6 6' },
  { to: '/admin/settings',   label: 'Settings',    icon: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z' },
];

function NavIcon({ d }) {
  return (
    <svg className="h-5 w-5 shrink-0" fill="none" stroke="currentColor" strokeWidth={1.7} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d={d} />
    </svg>
  );
}

export default function AdminLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  return (
    <div className="flex h-screen overflow-hidden bg-cream">
      {/* Sidebar (desktop) — stays fixed; main column scrolls. */}
      <aside className="hidden w-64 shrink-0 flex-col border-r border-beige/40 bg-white/60 backdrop-blur-md md:flex">
        <SidebarInner onNavigate={() => setOpen(false)} />
      </aside>

      {/* Sidebar (mobile drawer) */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-charcoal/40 backdrop-blur-sm md:hidden"
            onClick={() => setOpen(false)}
          >
            <motion.aside
              initial={{ x: -260 }} animate={{ x: 0 }} exit={{ x: -260 }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              className="flex h-full w-64 flex-col border-r border-beige/40 bg-cream"
              onClick={(e) => e.stopPropagation()}
            >
              <SidebarInner onNavigate={() => setOpen(false)} />
            </motion.aside>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main column — header stays put, only <main> scrolls. */}
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <header className="z-20 flex shrink-0 items-center justify-between border-b border-beige/40 bg-white/70 px-4 py-3 backdrop-blur-md sm:px-6">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setOpen(true)}
              className="rounded-lg p-2 text-charcoal md:hidden"
              aria-label="Open menu"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <h1 className="font-serif text-lg text-charcoal">Pawsome 4 Pets · Admin</h1>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <span className="hidden text-cocoa sm:inline">{user?.email}</span>
            <Link to="/" className="text-cocoa transition-colors hover:text-coral">View site</Link>
            <button
              onClick={handleLogout}
              className="rounded-full bg-coral/10 px-3 py-1.5 font-semibold text-coral transition-colors hover:bg-coral hover:text-cream"
            >
              Sign out
            </button>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto">
          <div className="container-px mx-auto w-full max-w-7xl py-8 sm:py-10">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );

  function SidebarInner({ onNavigate }) {
    return (
      <>
        <div className="flex items-center gap-2.5 px-5 py-5">
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-coral/15 text-coral">
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C8 2 5 5 5 9c0 5 7 13 7 13s7-8 7-13c0-4-3-7-7-7z"/></svg>
          </span>
          <span className="font-serif text-base leading-tight text-charcoal">Pawsome 4 Pets<br/><span className="text-xs text-cocoa">Admin Console</span></span>
        </div>
        <nav className="mt-2 flex-1 space-y-1 px-3">
          {NAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/admin'}
              onClick={onNavigate}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${
                  isActive ? 'bg-coral text-cream shadow-soft' : 'text-charcoal hover:bg-coral/10 hover:text-coral'
                }`
              }
            >
              <NavIcon d={item.icon} />
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="border-t border-beige/40 px-5 py-4 text-xs text-cocoa">
          Signed in as<br/><span className="font-medium text-charcoal">{user?.name || user?.email}</span>
        </div>
      </>
    );
  }
}
