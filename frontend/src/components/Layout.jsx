import { Outlet } from "react-router-dom";
import Footer from "./Footer";
import Navbar from "./Navbar";

function Layout() {
  return (
    <div className="app-shell">
      <Navbar />
      <main className="page">
        <Outlet />
      </main>
      <Footer />
    </div>
  );
}

export default Layout;
