import { useState, useEffect, useRef, useCallback, memo } from "react";
import { imgUrl, isAnimeContent } from "../utils/api";
import { useMetadata } from "../utils/metadata";
import {
  PlayIcon,
  FilmIcon,
  TVIcon,
  WatchedIcon,
  RatingShieldIcon,
  RatingLockIcon,
} from "./Icons";

const MediaCard = memo(function MediaCard({
  item,
  onClick,
  onContextMenu,
  progress,
  watched,
  onMarkWatched,
  onMarkUnwatched,
  onEditMetadata,
  ageRating,
  restricted,
}) {
  const patchedItem = useMetadata(item);

  const title = patchedItem.title || patchedItem.name;
  const release_date = patchedItem.release_date || patchedItem.first_air_date || "";
  const year = release_date.slice(0, 4);
  const isTV = patchedItem.media_type === "tv";
  const isAnime = isAnimeContent(patchedItem);
  const isOverridePoster = patchedItem.overridePoster;

  // Unreleased detection
  const rawDate = release_date;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const isUnreleased = rawDate ? new Date(rawDate) > today : false;

  // Build watched key for TV cards from Continue Watching we get season/episode
  const watchedKey = isTV
    ? patchedItem.season != null && patchedItem.episode != null
      ? `tv_${patchedItem.id}_s${patchedItem.season}e${patchedItem.episode}`
      : `tv_${patchedItem.id}`
    : `movie_${patchedItem.id}`;

  const isWatched = !!watched?.[watchedKey];

  // Context menu state
  const [menu, setMenu] = useState(null); // { x, y }

  // For TV series cards without a specific episode, watched marking is disabled
  const canMarkWatched = !isTV || (patchedItem.season != null && patchedItem.episode != null);

  const openMenu = useCallback(
    (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (onContextMenu) {
        onContextMenu(patchedItem, { x: e.clientX, y: e.clientY });
      } else {
        setMenu({ x: e.clientX, y: e.clientY });
      }
    },
    [patchedItem, onContextMenu],
  );

  useEffect(() => {
    if (!menu) return;
    const close = () => setMenu(null);
    window.addEventListener("click", close);
    window.addEventListener("contextmenu", close);
    return () => {
      window.removeEventListener("click", close);
      window.removeEventListener("contextmenu", close);
    };
  }, [menu]);

  const handleMarkWatched = (e) => {
    e.stopPropagation();
    onMarkWatched?.(watchedKey);
    setMenu(null);
  };
  const handleMarkUnwatched = (e) => {
    e.stopPropagation();
    onMarkUnwatched?.(watchedKey);
    setMenu(null);
  };

  return (
    <>
      <div
        className={`card${isWatched ? " ep-watched" : ""}${isUnreleased ? " card--unreleased" : ""}`}
        onClick={() => !isUnreleased && onClick(patchedItem)}
        onContextMenu={isUnreleased ? undefined : openMenu}
      >
        <div className="card-poster">
          {patchedItem.poster_path ? (
            <img
              src={isOverridePoster ? patchedItem.poster_path : imgUrl(patchedItem.poster_path, "w342")}
              alt={title}
              loading="lazy"
              onError={(e) => {
                if (!isOverridePoster) e.target.src = imgUrl(patchedItem.poster_path, "w300");
              }}
            />
          ) : (
            <div className="no-poster">
              {isTV ? <TVIcon /> : <FilmIcon />}
              <span style={{ fontSize: 10, color: "var(--text3)" }}>
                No Image
              </span>
            </div>
          )}
          {ageRating && (
            <div
              className={`card-age-badge${restricted ? " card-age-badge--restricted" : ""}`}
            >
              {restricted ? (
                <RatingLockIcon size={9} />
              ) : (
                <RatingShieldIcon size={9} />
              )}
              {ageRating}
            </div>
          )}

          <div className="card-overlay">
            {isUnreleased ? (
              <div className="card-unreleased-overlay">
                <span className="card-unreleased-label">🔒 Unreleased</span>
              </div>
            ) : (
              <div className="card-play">
                <PlayIcon />
              </div>
            )}
          </div>
          {!isUnreleased && progress > 0 && !isWatched && (
            <div className="card-progress">
              <div
                className="card-progress-fill"
                style={{ width: `${Math.min(progress, 100)}%` }}
              />
            </div>
          )}
          {!isUnreleased && isWatched && (
            <div className="card-watched-badge">
              <WatchedIcon size={26} />
            </div>
          )}
        </div>
        <div className="card-info">
          <div className="card-title" title={title}>
            {title}
          </div>
          <div className="card-year">
            {year} · {isTV ? "Series" : "Movie"}
          </div>
        </div>
        <span
          className={`card-badge${isUnreleased ? " card-badge--unreleased" : ""}${isAnime && !isUnreleased ? " card-badge--anime" : ""}`}
        >
          {isUnreleased ? "SOON" : isAnime ? "ANIME" : isTV ? "TV" : "HD"}
        </span>
      </div>

      {menu && (
        <div
          ref={menuRef}
          className="context-menu"
          style={{ top: menu.y, left: menu.x }}
          onClick={(e) => e.stopPropagation()}
        >
          {canMarkWatched && isWatched ? (
            <button className="context-menu-item" onClick={handleMarkUnwatched}>
              ↩ Mark as Unwatched
            </button>
          ) : canMarkWatched ? (
            <button className="context-menu-item" onClick={handleMarkWatched}>
              ✓ Mark as Watched
            </button>
          ) : null}
          {onEditMetadata && (
            <button className="context-menu-item" onClick={(e) => { e.stopPropagation(); onEditMetadata(patchedItem); setMenu(null); }}>
              ✎ Edit Metadata
            </button>
          )}
        </div>
      )}
    </>
  );
});
export default MediaCard;
