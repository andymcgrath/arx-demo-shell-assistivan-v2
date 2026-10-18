import type { ForkDefinition } from "@/engine/workflow/types";
import { COASSIST_FORKS } from "./coassist/forks";

/** Every declared fork. The CRM draws its branch buttons from this, and the brand test checks demo choices against it. */
export const ALL_FORKS: ForkDefinition[] = [...COASSIST_FORKS];
