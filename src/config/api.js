const API_BASE = import.meta.env.VITE_API_BASE ?? "";

export function openskyUrl(pathAndQuery) {
    const path = pathAndQuery.startsWith("/")
        ? pathAndQuery
        : `/${pathAndQuery}`;
    return `${API_BASE}/api/opensky${path}`;
}
