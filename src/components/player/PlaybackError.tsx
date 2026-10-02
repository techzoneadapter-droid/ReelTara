export function PlaybackError({
  message,
  source,
  sourceLabel = "View Legal Source",
  onRetry,
  onBack,
}: {
  message: string;
  source?: string;
  sourceLabel?: string;
  onRetry: () => void;
  onBack: () => void;
}) {
  return (
    <div className="playback-error" role="status">
      <p>{message}</p>
      <button onClick={onRetry} aria-label="Retry">
        Retry
      </button>
      {source && (
        <a href={source} target="_blank" rel="noopener noreferrer">
          {sourceLabel}
        </a>
      )}
      <button onClick={onBack} aria-label="Back">
        Back
      </button>
    </div>
  );
}
