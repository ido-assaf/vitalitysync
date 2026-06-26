import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import ErrorState from "../components/ErrorState";
import LoadingState from "../components/LoadingState";
import PageHeader from "../components/PageHeader";
import WorkoutHistoryList from "../components/WorkoutHistoryList";
import { getStoredUser, getWorkoutSessions } from "../services/api";

function WorkoutHistory() {
  const [sessions, setSessions] = useState([]);
  const [status, setStatus] = useState("loading");
  const [error, setError] = useState("");
  const storedUser = getStoredUser();

  useEffect(() => {
    async function loadHistory() {
      try {
        const workoutSessions = await getWorkoutSessions(storedUser.userId);
        setSessions(workoutSessions);
        setStatus("success");
      } catch (requestError) {
        setError(requestError.message);
        setStatus("error");
      }
    }

    loadHistory();
  }, [storedUser.userId]);

  if (status === "loading") {
    return <LoadingState label="Loading your completed workouts..." />;
  }

  if (status === "error") {
    return <ErrorState message={error} />;
  }

  return (
    <div className="stack">
      <PageHeader
        eyebrow="Workout history"
        title="Last Workouts"
        description="Choose a week to review the exercises, sets, weight, reps, and issues you recorded."
        action={
          <Link className="button button--ghost button--outline" to="/training">
            Back to Training
          </Link>
        }
      />
      <WorkoutHistoryList sessions={sessions} />
    </div>
  );
}

export default WorkoutHistory;
