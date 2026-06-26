import { useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import ErrorState from "../components/ErrorState";
import LoadingState from "../components/LoadingState";
import { getStoredUser, register, saveStoredUser } from "../services/api";

const initialForm = {
  firstName: "",
  lastName: "",
  username: "",
  email: "",
  password: ""
};

function validateRegister(form) {
  const errors = {};

  ["firstName", "lastName", "username"].forEach((field) => {
    if (!form[field].trim()) {
      errors[field] = "This field is required.";
    }
  });

  if (!form.email.trim()) {
    errors.email = "Email is required.";
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
    errors.email = "Enter a valid email address.";
  }

  if (!form.password) {
    errors.password = "Password is required.";
  } else if (form.password.length < 6) {
    errors.password = "Password must contain at least 6 characters.";
  }

  return errors;
}

function Register() {
  const navigate = useNavigate();
  const [form, setForm] = useState(initialForm);
  const [errors, setErrors] = useState({});
  const [apiError, setApiError] = useState("");
  const [status, setStatus] = useState("ready");

  if (getStoredUser()) {
    return <Navigate to="/dashboard" replace />;
  }

  function handleChange(event) {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
    setErrors((current) => ({ ...current, [name]: "" }));
    setApiError("");
  }

  async function handleSubmit(event) {
    event.preventDefault();
    const validationErrors = validateRegister(form);
    setErrors(validationErrors);
    setApiError("");

    if (Object.keys(validationErrors).length > 0) {
      return;
    }

    setStatus("submitting");
    try {
      const user = await register({
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        username: form.username.trim(),
        email: form.email.trim(),
        password: form.password
      });

      saveStoredUser(user);
      navigate("/onboarding", { replace: true });
    } catch (error) {
      setApiError(error.message);
    } finally {
      setStatus("ready");
    }
  }

  return (
    <main className="login-page">
      <section className="login-hero" aria-label="VitalitySync registration">
        <div>
          <p className="eyebrow">VitalitySync</p>
          <h1>Build a personalized training plan around your goals</h1>
          <p>
            Register as a trainee, complete your fitness profile, and begin logging personalized
            workouts.
          </p>
        </div>
      </section>

      <section className="login-card" aria-label="Registration form">
        <div className="section-heading">
          <p className="eyebrow">New trainee</p>
          <h2>Create account</h2>
          <p>Public registration creates a trainee account and starts your fitness profile setup.</p>
        </div>

        {apiError ? <ErrorState message={apiError} /> : null}

        <form onSubmit={handleSubmit} noValidate>
          <label>
            First name
            <input name="firstName" value={form.firstName} onChange={handleChange} />
            {errors.firstName ? <span className="field-error">{errors.firstName}</span> : null}
          </label>

          <label>
            Last name
            <input name="lastName" value={form.lastName} onChange={handleChange} />
            {errors.lastName ? <span className="field-error">{errors.lastName}</span> : null}
          </label>

          <label>
            Username
            <input name="username" value={form.username} onChange={handleChange} />
            {errors.username ? <span className="field-error">{errors.username}</span> : null}
          </label>

          <label>
            Email
            <input type="email" name="email" value={form.email} onChange={handleChange} />
            {errors.email ? <span className="field-error">{errors.email}</span> : null}
          </label>

          <label>
            Password
            <input
              type="password"
              name="password"
              value={form.password}
              onChange={handleChange}
            />
            {errors.password ? <span className="field-error">{errors.password}</span> : null}
          </label>

          <aside className="coach-preview-card">
            <span>Personalized guidance</span>
            <strong>Your profile drives the plan</strong>
            <p>An admin can connect your profile to an AI coach specialist.</p>
          </aside>

          <button type="submit" className="button button--primary" disabled={status === "submitting"}>
            {status === "submitting" ? "Creating..." : "Create trainee account"}
          </button>
        </form>

        <p className="auth-switch">
          Already have an account? <Link to="/login">Sign in</Link>
        </p>

        {status === "submitting" ? <LoadingState label="Creating trainee account..." /> : null}
      </section>
    </main>
  );
}

export default Register;
