import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import ErrorState from "../components/ErrorState";
import LoadingState from "../components/LoadingState";
import { getSettings, getStoredUser, saveStoredUser, updateSettings } from "../services/api";

const initialForm = {
  username: "",
  email: "",
  theme: "",
  userRole: ""
};

function validateSettings(form) {
  const errors = {};

  if (!form.username.trim()) {
    errors.username = "Username is required.";
  }

  if (!form.email.trim()) {
    errors.email = "Email is required.";
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
    errors.email = "Enter a valid email address.";
  }

  if (!form.theme.trim()) {
    errors.theme = "Theme is required.";
  }

  return errors;
}

function Settings() {
  const [form, setForm] = useState(initialForm);
  const [errors, setErrors] = useState({});
  const [status, setStatus] = useState("loading");
  const [message, setMessage] = useState("");
  const storedUser = getStoredUser();

  useEffect(() => {
    async function loadSettings() {
      setStatus("loading");
      setMessage("");

      try {
        const settings = await getSettings();
        setForm(settings);
        setStatus("ready");
      } catch (error) {
        setMessage(error.message);
        setStatus("error");
      }
    }

    loadSettings();
  }, []);

  function handleChange(event) {
    const { name, value } = event.target;
    setForm((currentForm) => ({ ...currentForm, [name]: value }));
    setErrors((currentErrors) => ({ ...currentErrors, [name]: "" }));
    setMessage("");
  }

  async function handleSubmit(event) {
    event.preventDefault();
    const validationErrors = validateSettings(form);
    setErrors(validationErrors);
    setMessage("");

    if (Object.keys(validationErrors).length > 0) {
      return;
    }

    setStatus("saving");
    try {
      const updatedSettings = await updateSettings({
        username: form.username.trim(),
        email: form.email.trim(),
        theme: form.theme
      });
      setForm(updatedSettings);
      if (storedUser) {
        saveStoredUser({
          ...storedUser,
          ...updatedSettings
        });
      }
      setMessage("Settings saved successfully.");
      setStatus("ready");
    } catch (error) {
      setMessage(error.message);
      setStatus("ready");
    }
  }

  if (status === "loading") {
    return <LoadingState label="Loading settings..." />;
  }

  if (status === "error") {
    return <ErrorState message={message} />;
  }

  return (
    <section className="settings-page">
      <div className="section-heading">
        <p className="eyebrow">Preferences</p>
        <h1>Settings</h1>
        <p>Manage account details, theme, and your editable fitness profile.</p>
      </div>

      <div className="settings-summary-grid">
        <article className="settings-summary-card">
          <span>Role</span>
          <strong>{form.userRole || "User"}</strong>
          <p>{form.userRole === "trainee" ? "Personalized training profile" : "Management access"}</p>
        </article>
      </div>

      {form.userRole === "trainee" ? (
        <div className="profile-action">
          <Link className="button button--ghost" to="/onboarding">
            Edit Fitness Profile
          </Link>
        </div>
      ) : null}

      {message ? (
        <div className={`message ${message.includes("successfully") ? "message--success" : "message--error"}`}>
          {message}
        </div>
      ) : null}

      <form className="settings-form" onSubmit={handleSubmit} noValidate>
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
          Email
          <input
            type="email"
            name="email"
            value={form.email}
            onChange={handleChange}
            aria-invalid={Boolean(errors.email)}
          />
          {errors.email ? <span className="field-error">{errors.email}</span> : null}
        </label>

        <label>
          Theme
          <select
            name="theme"
            value={form.theme}
            onChange={handleChange}
            aria-invalid={Boolean(errors.theme)}
          >
            <option value="">Choose a theme</option>
            <option value="system">System</option>
            <option value="light">Light</option>
            <option value="dark">Dark</option>
          </select>
          {errors.theme ? <span className="field-error">{errors.theme}</span> : null}
        </label>

        <button type="submit" className="button button--primary" disabled={status === "saving"}>
          {status === "saving" ? "Saving..." : "Save settings"}
        </button>
      </form>
    </section>
  );
}

export default Settings;
