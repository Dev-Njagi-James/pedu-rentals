// The single rule for who may see phone_number, location_url, ward_location.
// Batch 1: any signed-in, synced account.
// Batch 2 adds: owner always, lister needs a subscription.
// Batch 3 adds: the subscription check. Routes and UI never change.
export function canViewContact(caller, listing) {
  return Boolean(caller?.userId);
}
