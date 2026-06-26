function LoadingState({ label = "Loading data..." }) {
  return (
    <div className="loading-state" role="status">
      <span className="loading-state__spinner" aria-hidden="true" />
      <span>{label}</span>
    </div>
  );
}

export default LoadingState;
