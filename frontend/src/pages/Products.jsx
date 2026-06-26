import { useEffect, useMemo, useState } from "react";
import DataCard from "../components/DataCard";
import DataTable from "../components/DataTable";
import EmptyState from "../components/EmptyState";
import ErrorState from "../components/ErrorState";
import LoadingState from "../components/LoadingState";
import PageHeader from "../components/PageHeader";
import {
  generateProductEvaluation,
  getNutritionProfiles,
  getProducts,
  getStoredUser
} from "../services/api";

const productColumns = [
  { key: "productId", label: "ID" },
  { key: "name", label: "Product name" },
  { key: "brand", label: "Brand" },
  { key: "calories", label: "Calories" },
  { key: "protein", label: "Protein" },
  { key: "sugar", label: "Sugar" },
  { key: "allergens", label: "Allergens" },
  { key: "barcode", label: "Barcode" }
];

function Products() {
  const [products, setProducts] = useState([]);
  const [nutritionProfiles, setNutritionProfiles] = useState([]);
  const [status, setStatus] = useState("loading");
  const [error, setError] = useState("");
  const [aiForm, setAiForm] = useState({ productId: "", nutritionProfileId: "" });
  const [aiStatus, setAiStatus] = useState("idle");
  const [aiMessage, setAiMessage] = useState("");
  const [aiEvaluation, setAiEvaluation] = useState(null);
  const storedUser = getStoredUser();

  useEffect(() => {
    async function loadProducts() {
      setStatus("loading");
      setError("");

      try {
        const [productData, profileData] = await Promise.all([
          getProducts(),
          getNutritionProfiles()
        ]);
        setProducts(productData);
        setNutritionProfiles(profileData);
        setAiForm({
          productId: productData[0]?.productId ? String(productData[0].productId) : "",
          nutritionProfileId: profileData[0]?.nutritionProfileId
            ? String(profileData[0].nutritionProfileId)
            : ""
        });
        setStatus("success");
      } catch (requestError) {
        setError(requestError.message);
        setStatus("error");
      }
    }

    loadProducts();
  }, []);

  const highlightedProducts = useMemo(() => {
    return [...products].sort((a, b) => b.protein - a.protein).slice(0, 3);
  }, [products]);

  function handleAiFormChange(event) {
    const { name, value } = event.target;
    setAiForm((current) => ({ ...current, [name]: value }));
  }

  async function handleGenerateEvaluation(event) {
    event.preventDefault();
    setAiStatus("loading");
    setAiMessage("");
    setAiEvaluation(null);

    try {
      const evaluation = await generateProductEvaluation({
        userId: storedUser?.userId || 1,
        productId: Number(aiForm.productId),
        nutritionProfileId: Number(aiForm.nutritionProfileId)
      });

      setAiStatus("success");
      setAiEvaluation(evaluation);
      setAiMessage(
        `Saved AI evaluation #${evaluation.evaluationId}: ${evaluation.recommendation} (${evaluation.score}/100)`
      );
    } catch (requestError) {
      setAiStatus("error");
      setAiMessage(requestError.message);
    }
  }

  if (status === "loading") {
    return <LoadingState label="Loading products..." />;
  }

  if (status === "error") {
    return <ErrorState message={error} />;
  }

  return (
    <div className="stack">
      <PageHeader
        eyebrow="NutriScan"
        title="NutriScan Products"
        description="Food-product nutrition data from the backend, ready for barcode scanning and smart recommendation flows."
      />

      {products.length === 0 ? (
        <EmptyState title="No products found" message="/api/products returned an empty list." />
      ) : null}

      <section className="stats-grid stats-grid--three" aria-label="Highlighted products">
        {highlightedProducts.map((product) => (
          <DataCard
            key={product.productId}
            eyebrow={product.brand}
            title={product.name}
            value={`${product.protein}g`}
            detail={`${product.calories} kcal, ${product.sugar}g sugar`}
          />
        ))}
      </section>

      <section className="ai-evaluation-panel" aria-labelledby="ai-evaluation-heading">
        <div className="ai-evaluation-layout">
          <div>
            <div className="section-heading">
              <p className="eyebrow">Backend AI</p>
              <h2 id="ai-evaluation-heading">Product Suitability</h2>
              <p>
                Compare a product against a saved nutrition profile and keep the generated
                recommendation in the database.
              </p>
            </div>
            <form className="ai-evaluation-form" onSubmit={handleGenerateEvaluation}>
              <label>
                Product
                <select name="productId" value={aiForm.productId} onChange={handleAiFormChange}>
                  {products.map((product) => (
                    <option key={product.productId} value={product.productId}>
                      {product.name}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Nutrition profile
                <select
                  name="nutritionProfileId"
                  value={aiForm.nutritionProfileId}
                  onChange={handleAiFormChange}
                >
                  {nutritionProfiles.map((profile) => (
                    <option key={profile.nutritionProfileId} value={profile.nutritionProfileId}>
                      {profile.goal}
                    </option>
                  ))}
                </select>
              </label>
              <button
                type="submit"
                className="button button--primary"
                disabled={aiStatus === "loading" || !aiForm.productId || !aiForm.nutritionProfileId}
              >
                {aiStatus === "loading" ? "Generating..." : "Generate Evaluation"}
              </button>
            </form>
          </div>

          <aside className="ai-result-card" aria-live="polite">
            {aiEvaluation ? (
              <>
                <div className="score-ring">
                  <strong>{aiEvaluation.score}</strong>
                  <span>/100</span>
                </div>
                <div>
                  <p className="eyebrow">Recommendation</p>
                  <h3>{aiEvaluation.recommendation}</h3>
                  <p>{aiEvaluation.explanation}</p>
                </div>
                {Array.isArray(aiEvaluation.suggestedAlternatives) &&
                aiEvaluation.suggestedAlternatives.length > 0 ? (
                  <div className="ai-result-card__section">
                    <span>Alternatives</span>
                    <div className="chip-row">
                      {aiEvaluation.suggestedAlternatives.map((alternative) => (
                        <span key={alternative} className="chip">
                          {alternative}
                        </span>
                      ))}
                    </div>
                  </div>
                ) : null}
              </>
            ) : (
              <>
                <div className="score-ring score-ring--empty">
                  <strong>AI</strong>
                </div>
                <div>
                  <p className="eyebrow">Result card</p>
                  <h3>Ready to evaluate</h3>
                  <p>Select a product and profile to generate a saved suitability result.</p>
                </div>
              </>
            )}
          </aside>
        </div>
        {aiMessage ? (
          <div className={`message message--${aiStatus === "error" ? "error" : "success"}`}>
            {aiMessage}
          </div>
        ) : null}
      </section>

      <section className="table-section">
        <div className="section-heading">
          <p className="eyebrow">Dynamic backend table</p>
          <h2>Product catalog</h2>
        </div>
        <DataTable
          columns={productColumns}
          rows={products}
          emptyMessage="No products were returned by the backend."
        />
      </section>
    </div>
  );
}

export default Products;
