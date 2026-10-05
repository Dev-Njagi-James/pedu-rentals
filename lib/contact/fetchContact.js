export async function fetchContact(listingId) {
  try {
    const res = await fetch(`/api/v1/listings/${listingId}/contact`, {
      cache: "no-store",
    });
    if (res.status === 401) return { status: "signed_out" };
    if (res.status === 403) return { status: "forbidden" };
    if (res.status === 409) return { status: "syncing" };
    if (!res.ok) return { status: "error" };
    const json = await res.json();
    return { status: "ok", data: json.data };
  } catch {
    return { status: "error" };
  }
}
