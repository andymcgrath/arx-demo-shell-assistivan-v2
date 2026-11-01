/**
 * The skin resolver. It returns the component for each slot from the current view, so a page renders a slot and never
 * checks the view. This file, view.ts, and demoStore.ts are the only places that read the view
 * (see engine/__tests__/skin.rule2.test.ts). Both views map to the default components for now. The patient skin fills
 * its slots in later steps (components live in portals/patient/skins/patient/).
 */
import type { ComponentType } from "react";
import type { ViewId } from "@/brand/schema";
import { useDemoStore } from "@/store/demoStore";
import Header from "@/portals/patient/components/Header";
import Footer from "@/portals/patient/components/Footer";

export interface SkinSlots {
  Header: ComponentType;
  Footer: ComponentType;
}

const DEFAULT_SKIN: SkinSlots = { Header, Footer };

const SKINS: Record<ViewId, SkinSlots> = {
  full: DEFAULT_SKIN,
  patient: DEFAULT_SKIN,
};

/** The slots for a view. */
export const skinFor = (view: ViewId): SkinSlots => SKINS[view];

/** The slots for the current view. */
export function useSkin(): SkinSlots {
  return skinFor(useDemoStore((s) => s.view));
}
