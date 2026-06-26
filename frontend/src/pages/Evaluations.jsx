import { useEffect, useState } from "react";
import Badge from "../components/Badge";
import DataTable from "../components/DataTable";
import EmptyState from "../components/EmptyState";
import ErrorState from "../components/ErrorState";
import LoadingState from "../components/LoadingState";
import PageHeader from "../components/PageHeader";
import { getProductEvaluations } from "../services/api";

const evaluationColumns = [
  { key: "evaluationId", label: "ID" },
  { key: "productId", label: "Product" },
  { key: "score", label: "Score" },
  { key: "recommendation", label: "Recommendation" },
  { key: "explanation", label: "Explanation" },
  { key: "suggestedAlternatives", label: "Suggested alternatives" }
];

function getTone(score) {
  if (score >= 80) {
    return "mint";
  }

  if (score >= 70) {
    return "gold";
  }

  return "red";
}

function Evaluations() {
  const [evaluations, setEvaluations] = useState([]);
  const [status, setStatus] = useState("loading");
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadEvaluations() {
      setStatus("loading");
      setError("");

      try {
        const evaluationData = await getProductEvaluations();
        setEvaluations(evaluationData);
        setStatus("success");
      } catch (requestError) {
        setError(requestError.message);
        setStatus("error");
      }
    }

    loadEvaluations();
  }, []);

  if (status === "loading") {
    return <LoadingState label="Loading AI evaluations..." />;
  }

  if (status === "error") {
    return <ErrorState message={error} />;
  }

  return (
    <div className="stack">
      <PageHeader
        eyebrow="AI decision layer"
        title="AI Product Evaluations"
        description="Suitability scores and recommendations showing how NutriScan interprets products for user needs."
      />

      {evaluations.length === 0 ? (
        <EmptyState
          title="No evaluations found"
          message="/product-evaluations returned an empty list."
        />
      ) : null}

      <section className="evaluation-grid" aria-label="Evaluation summaries">
        {evaluations.map((evaluation) => (
          <article key={evaluation.evaluationId} className="evaluation-card">
            <div className="evaluation-card__top">
              <Badge tone={getTone(evaluation.score)}>{evaluation.score}/100</Badge>
              <strong>{evaluation.recommendation}</strong>
            </div>
            <p>{evaluation.explanation}</p>
            <div className="chip-row">
              {evaluation.suggestedAlternatives.map((alternative) => (
                <span key={alternative} className="chip">
                  {alternative}
                </span>
              ))}
            </div>
          </article>
        ))}
      </section>

      <section className="table-section">
        <div className="section-heading">
          <p className="eyebrow">Structured data</p>
          <h2>Evaluation records</h2>
        </div>
        <DataTable
          columns={evaluationColumns}
          rows={evaluations}
          emptyMessage="No evaluations were returned by the backend."
        />
      </section>
    </div>
  );
}

export default Evaluations;
