/** One row of the CRM Stage Quick View. */
export interface StageField {
  label: string;
  value: string | null;
}

export interface Stage {
  id: string;
  name: string;
  statusLabel: string;
  statusDetail: string;
  isComplete: boolean;
  isNotStarted: boolean;
  fields: StageField[];
  lastUpdated: string | null;
  lastUpdatedAgo: string | null;
}
