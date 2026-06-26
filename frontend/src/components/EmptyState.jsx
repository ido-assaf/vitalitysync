function EmptyState({ title = "No data yet", message }) {
  return (
    <div className="empty-state empty-state--panel">
      <strong>{title}</strong>
      {message ? <span>{message}</span> : null}
    </div>
  );
}

export default EmptyState;
