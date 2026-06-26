import { useEffect, useState } from "react";
import EmptyState from "../components/EmptyState";
import ErrorState from "../components/ErrorState";
import LoadingState from "../components/LoadingState";
import PageHeader from "../components/PageHeader";
import {
  createAdminCoach,
  deleteAdminCoach,
  getAdminCoaches,
  getStoredUser,
  updateAdminCoach
} from "../services/api";

const specialties = [
  "strength training",
  "football",
  "basketball",
  "running",
  "weight loss",
  "general fitness"
];

const emptyForm = {
  userId: null,
  firstName: "",
  lastName: "",
  username: "",
  email: "",
  password: "",
  coachSpecialty: "general fitness",
  coachBio: ""
};

function AdminCoaches() {
  const [coaches, setCoaches] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [status, setStatus] = useState("loading");
  const [message, setMessage] = useState("");
  const user = getStoredUser();

  async function loadCoaches() {
    setStatus("loading");
    setMessage("");

    try {
      const coachData = await getAdminCoaches();
      setCoaches(coachData);
      setStatus("ready");
    } catch (error) {
      setMessage(error.message);
      setStatus("error");
    }
  }

  useEffect(() => {
    if (user?.userRole === "admin") {
      loadCoaches();
    } else {
      setStatus("forbidden");
    }
  }, [user?.userRole]);

  function handleChange(event) {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
    setMessage("");
  }

  function handleEdit(coach) {
    setForm({
      userId: coach.userId,
      firstName: coach.firstName || "",
      lastName: coach.lastName || "",
      username: coach.username || "",
      email: coach.email || "",
      password: "",
      coachSpecialty: coach.coachSpecialty || "general fitness",
      coachBio: coach.coachBio || ""
    });
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setStatus("saving");
    setMessage("");

    try {
      const payload = {
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        username: form.username.trim(),
        email: form.email.trim(),
        password: form.password,
        coachSpecialty: form.coachSpecialty,
        coachBio: form.coachBio.trim()
      };

      if (form.userId) {
        await updateAdminCoach(form.userId, payload);
        setMessage("Coach updated successfully.");
      } else {
        await createAdminCoach(payload);
        setMessage("Coach created successfully.");
      }

      setForm(emptyForm);
      await loadCoaches();
    } catch (error) {
      setMessage(error.message);
      setStatus("ready");
    }
  }

  async function handleDelete(coachId) {
    setStatus("saving");
    setMessage("");

    try {
      await deleteAdminCoach(coachId);
      setMessage("Coach deleted successfully.");
      await loadCoaches();
    } catch (error) {
      setMessage(error.message);
      setStatus("ready");
    }
  }

  if (status === "forbidden") {
    return <ErrorState message="Only admin users can manage coaches." />;
  }

  if (status === "loading") {
    return <LoadingState label="Loading coach management..." />;
  }

  if (status === "error") {
    return <ErrorState message={message} />;
  }

  return (
    <div className="stack">
      <PageHeader
        eyebrow="Admin"
        title="Coach Management"
        description="Create and maintain coach profiles so trainees can choose the right specialist."
      />

      {message ? (
        <div className={`message ${message.includes("successfully") ? "message--success" : "message--error"}`}>
          {message}
        </div>
      ) : null}

      <section className="admin-coach-grid">
        <form className="settings-page" onSubmit={handleSubmit}>
          <div className="section-heading">
            <p className="eyebrow">{form.userId ? "Edit coach" : "New coach"}</p>
            <h2>{form.userId ? "Update Coach" : "Create Coach"}</h2>
          </div>

          <label>
            First name
            <input name="firstName" value={form.firstName} onChange={handleChange} />
          </label>
          <label>
            Last name
            <input name="lastName" value={form.lastName} onChange={handleChange} />
          </label>
          <label>
            Username
            <input name="username" value={form.username} onChange={handleChange} />
          </label>
          <label>
            Email
            <input type="email" name="email" value={form.email} onChange={handleChange} />
          </label>
          <label>
            Password
            <input
              type="password"
              name="password"
              value={form.password}
              onChange={handleChange}
              placeholder={form.userId ? "Leave blank to keep current password" : ""}
            />
          </label>
          <label>
            Specialty
            <select name="coachSpecialty" value={form.coachSpecialty} onChange={handleChange}>
              {specialties.map((specialty) => (
                <option key={specialty} value={specialty}>
                  {specialty}
                </option>
              ))}
            </select>
          </label>
          <label>
            Bio
            <input name="coachBio" value={form.coachBio} onChange={handleChange} />
          </label>
          <button type="submit" className="button button--primary" disabled={status === "saving"}>
            {form.userId ? "Save Coach" : "Create Coach"}
          </button>
        </form>

        <section className="table-section">
          <div className="section-heading">
            <p className="eyebrow">Available coaches</p>
            <h2>Coach Profiles</h2>
          </div>

          {coaches.length === 0 ? (
            <EmptyState title="No coaches yet" message="Create a coach profile for trainees." />
          ) : (
            <div className="mini-list">
              {coaches.map((coach) => (
                <div key={coach.userId} className="mini-list__item">
                  <strong>
                    {coach.firstName} {coach.lastName}
                  </strong>
                  <span>{coach.coachSpecialty}</span>
                  <p>{coach.coachBio || "No bio added."}</p>
                  <div className="button-row">
                    <button type="button" className="button button--ghost" onClick={() => handleEdit(coach)}>
                      Edit
                    </button>
                    <button
                      type="button"
                      className="button button--ghost"
                      onClick={() => handleDelete(coach.userId)}
                      disabled={status === "saving"}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </section>
    </div>
  );
}

export default AdminCoaches;
