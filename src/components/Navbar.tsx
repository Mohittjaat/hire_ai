import { Link } from "react-router-dom";

export default function Navbar() {
  return (
    <nav className="bg-blue-600 text-white px-6 py-4 flex justify-between items-center">
      {/* Logo / Title */}
      <h1 className="text-xl font-semibold">
        AI Hiring Assistant
      </h1>

      {/* Navigation Links */}
      <div className="flex gap-6 text-sm font-medium">
        <Link
          to="/dashboard"
          className="hover:text-blue-200 transition"
        >
          Dashboard
        </Link>

        <Link
          to="/candidates"
          className="hover:text-blue-200 transition"
        >
          Candidates
        </Link>

        <Link
          to="/login"
          className="hover:text-blue-200 transition"
        >
          Logout
        </Link>
      </div>
    </nav>
  );
}
