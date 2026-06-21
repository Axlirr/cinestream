import { storage, STORAGE_KEYS } from "./storage";

export function getMetadataOverride(itemId) {
  const overrides = storage.get(STORAGE_KEYS.METADATA_OVERRIDES) || {};
  return overrides[itemId] || null;
}

export function applyMetadataOverrides(item) {
  if (!item) return item;
  const override = getMetadataOverride(item.id);
  if (!override) return item;

  const newItem = { ...item };
  if (override.title) {
    newItem.title = override.title;
    newItem.name = override.title;
  }
  if (override.year) {
    if (newItem.media_type === "movie" || newItem.release_date !== undefined) {
      newItem.release_date = `${override.year}-01-01`;
    } else {
      newItem.first_air_date = `${override.year}-01-01`;
    }
  }
  if (override.poster) {
    newItem.poster_path = override.poster;
    newItem.overridePoster = true;
  }
  return newItem;
}

import { useState, useEffect } from "react";

export function useMetadata(item) {
  const [patchedItem, setPatchedItem] = useState(() => applyMetadataOverrides(item));

  useEffect(() => {
    setPatchedItem(applyMetadataOverrides(item));
    
    const handler = () => {
      setPatchedItem(applyMetadataOverrides(item));
    };
    window.addEventListener("streambert:metadata-overrides-changed", handler);
    return () => window.removeEventListener("streambert:metadata-overrides-changed", handler);
  }, [item]);

  return patchedItem;
}
