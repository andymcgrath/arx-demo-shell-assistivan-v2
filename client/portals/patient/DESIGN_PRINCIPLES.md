# Patient Portal Design Principles

## Button Styling

The patient portal uses a clear button hierarchy to guide user attention and reduce cognitive load.

### Primary Action Button

**Usage:** Use for the main, expected action in a workflow step. Only one primary button per screen/card.

**Styling:**
```tsx
className="w-full text-white font-semibold py-3.5 rounded-lg transition-colors bg-arx-primary hover:bg-arx-primary-dark"
```

**Example:**
- CTA buttons that advance the workflow (e.g., "Next", "Submit", "Continue", "Enroll")
- Located in WelcomeCard and primary workflow components

### Secondary Action Button

**Usage:** Use for supporting actions that provide additional information, alternative paths, or less critical interactions (e.g., "Learn more", "Chat with us", "Prescription received").

**Styling:**
```tsx
className="w-full text-arx-primary font-semibold py-3.5 rounded-lg transition-colors border-2 border-arx-primary bg-transparent hover:bg-arx-primary hover:text-white"
```

**Features:**
- Outlined style with teal border
- Dark teal text on transparent background
- Text and border change to white on hover (when background fills with teal)
- Maintains visual hierarchy without competing for attention

## Card Layout

All content cards follow this structure:
```tsx
className="bg-white rounded-2xl shadow-sm p-5 border border-arx-borders"
```

- White background with subtle border
- Consistent padding and rounded corners
- Subtle shadow for depth

## Typography

- **Headings:** `text-xl font-bold text-arx-slate`
- **Body Copy:** `text-sm text-arx-body-copy`
- **Labels/Helper Text:** `text-xs text-arx-inactive`

## Color Usage

- **Primary Action:** `bg-arx-primary text-white`
- **Secondary Action:** `border-arx-primary text-arx-primary`
- **Text:** `text-arx-slate` (headings), `text-arx-body-copy` (body)
- **Borders:** `border-arx-borders`

## Application Across Portals

Apply these principles consistently across all patient-facing screens to:
- Reduce cognitive load
- Guide users toward primary workflow actions
- Maintain visual consistency
- Support accessibility through clear hierarchy
