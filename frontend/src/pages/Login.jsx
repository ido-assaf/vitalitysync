import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import ErrorState from "../components/ErrorState";
import LoadingState from "../components/LoadingState";
import { login, saveStoredUser } from "../services/api";

const initialForm = {
  username: "",
  password: ""
};

function validateLogin(form) {
  const errors = {};

  if (!form.username.trim()) {
    errors.username = "Username is required.";
  }

  if (!form.password) {
    errors.password = "Password is required.";
  } else if (form.password.length < 6) {
    errors.password = "Password must contain at least 6 characters.";
  }

  return errors;
}

function Login() {
  const navigate = useNavigate();
  const [form, setForm] = useState(initialForm);
  const [errors, setErrors] = useState({});
  const [apiError, setApiError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  function handleChange(event) {
    const { name, value } = event.target;
    setForm((currentForm) => ({ ...currentForm, [name]: value }));
    setErrors((currentErrors) => ({ ...currentErrors, [name]: "" }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    const validationErrors = validateLogin(form);
    setErrors(validationErrors);
    setApiError("");

    if (Object.keys(validationErrors).length > 0) {
      return;
    }

    setIsSubmitting(true);
    try {
      const user = await login({
        username: form.username.trim(),
        password: form.password
      });
      saveStoredUser(user);
      navigate(user.userRole === "admin" ? "/admin" : "/dashboard", {
        replace: true
      });
    } catch (error) {
      setApiError(error.message);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="login-page">
      <section className="login-hero" aria-label="VitalitySync login">
        <div>
          <p className="eyebrow">VitalitySync</p>
          <h1>Train smarter with VitalitySync</h1>
          <p>
            AI-guided workouts, nutrition checks, and progress insights in one dashboard.
          </p>
        </div>
      </section>

      <section className="login-card" aria-label="Login form">
        <div className="section-heading">
          <p className="eyebrow">Welcome back</p>
          <h2>Sign in</h2>
        </div>

        {apiError ? <ErrorState message={apiError} /> : null}

        <form onSubmit={handleSubmit} noValidate>
          <label>
            Username
            <input
              type="text"
              name="username"
              value={form.username}
              onChange={handleChange}
              aria-invalid={Boolean(errors.username)}
            />
            {errors.username ? <span className="field-error">{errors.username}</span> : null}
          </label>

          <label>
            Password
            <input
              type="password"
              name="password"
              value={form.password}
              onChange={handleChange}
              aria-invalid={Boolean(errors.password)}
            />
            {errors.password ? <span className="field-error">{errors.password}</span> : null}
          </label>

          <button type="submit" className="button button--primary" disabled={isSubmitting}>
            {isSubmitting ? "Signing in..." : "Sign in"}
          </button>
        </form>

        <p className="auth-switch">
          New trainee? <Link to="/register">Create an account</Link>
        </p>

        {isSubmitting ? <LoadingState label="Checking credentials..." /> : null}
      </section>
    </main>
  );
}

export default Login;
