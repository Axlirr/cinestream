import { useState, useEffect } from "react";
import { tmdbFetch, imgUrl } from "../utils/api";
import { BackIcon, StarIcon, BookmarkIcon } from "../components/Icons";
import MediaCard from "../components/MediaCard";

export default function ActorPage({ personId, apiKey, onBack, onSelect }) {
  const [person, setPerson] = useState(null);
  const [credits, setCredits] = useState(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        const [p, c] = await Promise.all([
          tmdbFetch(`/person/${personId}`, apiKey),
          tmdbFetch(`/person/${personId}/combined_credits`, apiKey),
        ]);
        if (active) {
          setPerson(p);
          // Sort by popularity and filter out items without poster
          const sorted = (c.cast || [])
            .filter((i) => i.poster_path)
            .sort((a, b) => b.popularity - a.popularity);
          setCredits(sorted);
        }
      } catch (err) {
        if (active) setError(true);
      }
    };
    load();
    return () => {
      active = false;
    };
  }, [personId, apiKey]);

  if (error) {
    return (
      <div className="main" style={{ padding: 48, textAlign: "center" }}>
        <h2>Could not load actor profile</h2>
        <button className="btn" onClick={onBack} style={{ marginTop: 24 }}>
          Go Back
        </button>
      </div>
    );
  }

  if (!person) return <div className="main" />;

  return (
    <div className="main" style={{ paddingBottom: 60 }}>
      {/* ── Actor Hero ── */}
      <div
        style={{
          position: "relative",
          padding: "60px 48px 40px",
          background: "var(--surface)",
          display: "flex",
          gap: 32,
          borderBottom: "1px solid var(--border)",
        }}
      >
        <button
          className="btn btn-ghost"
          onClick={onBack}
          style={{
            position: "absolute",
            top: 24,
            left: 24,
            width: 44,
            height: 44,
            padding: 0,
            justifyContent: "center",
            borderRadius: "50%",
          }}
          title="Back"
        >
          <BackIcon size={24} />
        </button>

        <div
          style={{
            width: 220,
            flexShrink: 0,
            borderRadius: 12,
            overflow: "hidden",
            border: "1px solid var(--border)",
            boxShadow: "0 24px 48px rgba(0,0,0,0.4)",
            background: "var(--surface2)",
            aspectRatio: "2/3",
          }}
        >
          {person.profile_path ? (
            <img
              src={imgUrl(person.profile_path, "w500")}
              alt={person.name}
              style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
            />
          ) : (
            <div
              style={{
                width: "100%",
                height: "100%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "var(--text3)",
              }}
            >
              No Photo
            </div>
          )}
        </div>

        <div style={{ flex: 1 }}>
          <h1
            style={{
              fontFamily: "var(--font-display)",
              fontSize: 48,
              letterSpacing: 1,
              marginBottom: 16,
            }}
          >
            {person.name}
          </h1>
          <div style={{ display: "flex", gap: 16, marginBottom: 24, color: "var(--text2)", fontSize: 14 }}>
            {person.birthday && (
              <div>
                Born: {person.birthday}
                {person.deathday ? ` - ${person.deathday}` : ""}
              </div>
            )}
            {person.place_of_birth && <div>{person.place_of_birth}</div>}
          </div>
          {person.biography && (
            <div style={{ fontSize: 14, color: "var(--text2)", lineHeight: 1.6, whiteSpace: "pre-wrap" }}>
              {person.biography.split("\n").slice(0, 4).join("\n")}
              {person.biography.split("\n").length > 4 ? "..." : ""}
            </div>
          )}
        </div>
      </div>

      {/* ── Known For ── */}
      {credits && credits.length > 0 && (
        <div style={{ padding: "40px 48px" }}>
          <div className="section-title" style={{ marginBottom: 24 }}>Known For</div>
          <div className="cards-grid">
            {credits.slice(0, 30).map((item) => (
              <MediaCard
                key={item.id + (item.media_type || "movie")}
                item={{ ...item, media_type: item.media_type || "movie" }}
                onClick={() => onSelect({ ...item, media_type: item.media_type || "movie" })}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
