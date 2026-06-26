function DataCard({ eyebrow, title, value, detail }) {
  return (
    <article className="data-card">
      <p className="data-card__eyebrow">{eyebrow}</p>
      <div className="data-card__body">
        <h3>{title}</h3>
        <strong>{value}</strong>
      </div>
      {detail ? <p className="data-card__detail">{detail}</p> : null}
    </article>
  );
}

export default DataCard;
