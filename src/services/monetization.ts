import type { Entitlement } from "../types/movie";
export interface AdService {
  eligible(entitlement: Entitlement): boolean;
  show(placement: string): Promise<void>;
}
// Deliberately inactive until billing and consent are integrated.
export class DisabledAdService implements AdService {
  eligible(_entitlement: Entitlement) {
    return false;
  }
  async show(_placement: string) {
    return;
  }
}

export const EntitlementService = {
  current(): Entitlement {
    // Local preferences must never grant paid privileges.
    return { tier: "free", removeAds: false, cloudSync: false };
  },
};
