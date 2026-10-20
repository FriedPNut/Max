export const RIDE_SEATS_MIN = 1;
export const RIDE_SEATS_MAX = 12;

export type PlanPerson = {
  id: string;
  name: string;
  username: string | null;
};

export type EventItem = {
  id: string;
  label: string;
  createdBy: string;
  createdAt: string;
  claimedBy: string | null;
  claimer: PlanPerson | null;
};

export type EventRide = {
  id: string;
  driverId: string;
  driver: PlanPerson;
  seats: number;
  departingFrom: string;
  departAt: string | null;
  notes: string | null;
  createdAt: string;
  passengers: PlanPerson[];
};

export type EventPlanSnapshot = {
  items: EventItem[];
  rides: EventRide[];
  error?: string;
};

export type EventPlanActionResult = {
  error?: string;
  snapshot?: EventPlanSnapshot;
};

export type RideInput = {
  seats: number;
  departingFrom: string;
  departAt: string | null;
  notes: string | null;
};
