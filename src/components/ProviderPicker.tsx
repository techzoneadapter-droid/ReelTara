import { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import type { StreamingProvider } from "../types/movie";
import { legalUrl } from "../services/legal";

export function ProviderPicker({
  providers,
  initial,
  country,
  onClose,
}: {
  providers: StreamingProvider[];
  initial?: StreamingProvider;
  country: string;
  onClose: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [selected, setSelected] = useState(initial);
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    dialog.current?.showModal();
    return () => {
      document.body.style.overflow = overflow;
      previous?.focus();
    };
  }, []);
  return (
    <dialog
      ref={dialog}
      className="player-dialog"
      aria-label="Where to Watch"
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
    >
      <div className="player-heading">
        <h2>Where to Watch · {country}</h2>
        <button
          className="icon-button"
          aria-label="Close providers"
          onClick={onClose}
        >
          <X />
        </button>
      </div>
      {providers.length === 0 && (
        <p role="status">
          Provider availability unavailable. Try again from movie details.
        </p>
      )}
      {(["subscription", "rent", "buy", "free", "ads"] as const).map((kind) => {
        const group = providers.filter(
          (p) => p.kind === kind && p.country === country,
        );
        return (
          group.length > 0 && (
            <section key={kind}>
              <h3>
                {
                  {
                    subscription: "Streaming",
                    rent: "Rent",
                    buy: "Buy",
                    free: "Free",
                    ads: "Free with ads",
                  }[kind]
                }
              </h3>
              <div className="hero-buttons">
                {group.map((p) => (
                  <button
                    key={`${p.id}-${p.kind}`}
                    className="button secondary"
                    disabled={!legalUrl(p.url)}
                    aria-pressed={selected === p}
                    onClick={() => setSelected(p)}
                  >
                    {p.logoUrl && (
                      <img
                        className="provider-logo"
                        src={p.logoUrl}
                        alt=""
                        loading="lazy"
                        onError={(e) => {
                          e.currentTarget.hidden = true;
                        }}
                      />
                    )}
                    {p.name} · {p.kind}
                  </button>
                ))}
              </div>
            </section>
          )
        );
      })}
      {selected && (
        <div className="provider-availability" role="status">
          <p>
            {selected.destination === "provider"
              ? `You'll continue on ${selected.name}.`
              : `You'll continue to TMDB / JustWatch for ${selected.name}. Choose the provider there to open its legal platform.`}
          </p>
          {legalUrl(selected.url) ? (
            <a
              className="button primary"
              href={legalUrl(selected.url)}
              target="_blank"
              rel="noopener noreferrer"
            >
              Continue to{" "}
              {selected.destination === "provider"
                ? selected.name
                : "availability page"}
            </a>
          ) : (
            <p>Currently unavailable</p>
          )}
        </div>
      )}
    </dialog>
  );
}
