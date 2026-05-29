import { useEffect, lazy, Suspense } from 'react';
import { Routes, Route, useLocation, Outlet } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';

import Navbar from './components/Navbar';
import Footer from './components/Footer';
import WhatsAppButton from './components/WhatsAppButton';
import CustomCursor from './components/CustomCursor';
import ProtectedRoute from './components/ProtectedRoute';
import AdminLayout from './components/admin/AdminLayout';

const Home       = lazy(() => import('./pages/Home'));
const About      = lazy(() => import('./pages/About'));
const Services   = lazy(() => import('./pages/Services'));
const Info       = lazy(() => import('./pages/Info'));
const Team       = lazy(() => import('./pages/Team'));
const Contact    = lazy(() => import('./pages/Contact'));
const Login           = lazy(() => import('./pages/Login'));
const Register        = lazy(() => import('./pages/Register'));
const Account         = lazy(() => import('./pages/Account'));
const ForgotPassword  = lazy(() => import('./pages/ForgotPassword'));
const ResetPassword   = lazy(() => import('./pages/ResetPassword'));
const PublicForm = lazy(() => import('./pages/PublicForm'));
const PublicFormsIndex = lazy(() => import('./pages/PublicFormsIndex'));

const AdminHome             = lazy(() => import('./pages/admin/AdminHome'));
const AdminForms            = lazy(() => import('./pages/admin/AdminForms'));
const AdminImport           = lazy(() => import('./pages/admin/AdminImport'));
const AdminFormEditor       = lazy(() => import('./pages/admin/AdminFormEditor'));
const AdminSubmissions      = lazy(() => import('./pages/admin/AdminSubmissions'));
const AdminSubmissionDetail = lazy(() => import('./pages/admin/AdminSubmissionDetail'));
const AdminUsers            = lazy(() => import('./pages/admin/AdminUsers'));
const AdminUserDetail       = lazy(() => import('./pages/admin/AdminUserDetail'));
const AdminActivity         = lazy(() => import('./pages/admin/AdminActivity'));
const AdminSettings         = lazy(() => import('./pages/admin/AdminSettings'));

function ScrollToTop() {
  const { pathname, hash } = useLocation();
  useEffect(() => { if (!hash) window.scrollTo({ top: 0, behavior: 'instant' }); }, [pathname, hash]);
  return null;
}

function Page({ children }) {
  return (
    <motion.main
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -6 }}
      transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.main>
  );
}

// Marketing-site layout (Navbar/Footer/CustomCursor/WhatsApp).
function PublicLayout() {
  return (
    <div className="min-h-screen bg-cream bg-grain">
      <CustomCursor />
      <ScrollToTop />
      <Navbar />
      <Outlet />
      <Footer />
      <WhatsAppButton />
    </div>
  );
}

export default function App() {
  const location = useLocation();
  return (
    <Suspense fallback={<div className="min-h-screen" />}>
      <AnimatePresence mode="wait">
        <Routes location={location} key={location.pathname.split('/').slice(0, 3).join('/')}>
          {/* Public marketing pages + auth + public forms */}
          <Route element={<PublicLayout />}>
            <Route path="/"            element={<Page><Home /></Page>} />
            <Route path="/about"       element={<Page><About /></Page>} />
            <Route path="/services"    element={<Page><Services /></Page>} />
            <Route path="/info"        element={<Page><Info /></Page>} />
            <Route path="/team"        element={<Page><Team /></Page>} />
            <Route path="/contact"     element={<Page><Contact /></Page>} />
            <Route path="/login"            element={<Page><Login /></Page>} />
            <Route path="/register"         element={<Page><Register /></Page>} />
            <Route path="/forgot-password"  element={<Page><ForgotPassword /></Page>} />
            <Route path="/reset-password"   element={<Page><ResetPassword /></Page>} />
            <Route path="/forms"       element={<Page><PublicFormsIndex /></Page>} />
            <Route path="/forms/:slug" element={<Page><PublicForm /></Page>} />
            <Route
              path="/account"
              element={<ProtectedRoute><Page><Account /></Page></ProtectedRoute>}
            />
          </Route>

          {/* Admin console — gated, no marketing chrome */}
          <Route
            path="/admin"
            element={<ProtectedRoute adminOnly><AdminLayout /></ProtectedRoute>}
          >
            <Route index                       element={<AdminHome />} />
            <Route path="forms"                element={<AdminForms />} />
            <Route path="import"               element={<AdminImport />} />
            <Route path="forms/:id"            element={<AdminFormEditor />} />
            <Route path="submissions"          element={<AdminSubmissions />} />
            <Route path="submissions/:id"      element={<AdminSubmissionDetail />} />
            <Route path="users"                element={<AdminUsers />} />
            <Route path="users/:id"            element={<AdminUserDetail />} />
            <Route path="activity"             element={<AdminActivity />} />
            <Route path="settings"             element={<AdminSettings />} />
          </Route>
        </Routes>
      </AnimatePresence>
    </Suspense>
  );
}
