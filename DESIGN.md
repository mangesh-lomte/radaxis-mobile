# RadAxis RIS Mobile — Design Authority & Mobile-First UX System
**Document Version:** 1.0.0  
**Phase:** 1.5 Distinct Mobile Design System  
**Ecosystem:** RadAxis Radiology Information System  
**Live Production Web RIS Reference:** `https://meril-ris.mangesh.my.id`  
**Target Clients:** iOS & Android Native (React Native / Expo SDK 58)  
**Status:** Approved Architectural Authority

---

## Table of Contents
1. [Product Vision & Ecosystem Role](#1-product-vision--ecosystem-role)
2. [Brand Identity & Continuity](#2-brand-identity--continuity)
3. [What We Deliberately Stole From Web](#3-what-we-deliberately-stole-from-web)
4. [What We Deliberately Refused To Steal](#4-what-we-deliberately-refused-to-steal)
5. [Foundational Mobile UX Principles](#5-foundational-mobile-ux-principles)
6. [Color Architecture & Meaning](#6-color-architecture--meaning)
7. [Complete Semantic Color Table](#7-complete-semantic-color-table)
8. [Status Mapping Table](#8-status-mapping-table)
9. [Priority Mapping Table](#9-priority-mapping-table)
10. [Modality Color Strategy](#10-modality-color-strategy)
11. [Typography System & Scales](#11-typography-system--scales)
12. [Monospace Identifier Rules](#12-monospace-identifier-rules)
13. [Spacing & Layout Grid](#13-spacing--layout-grid)
14. [Corner Radii Strategy](#14-corner-radii-strategy)
15. [Elevation & Shadow System](#15-elevation--shadow-system)
16. [Touch Targets & Ergonomics](#16-touch-targets--ergonomics)
17. [Thumb Reach Zone Strategy](#17-thumb-reach-zone-strategy)
18. [Information Hierarchy Formula](#18-information-hierarchy-formula)
19. [Card Architecture & Anatomy](#19-card-architecture--anatomy)
20. [Clinical Worklist Mobile Pattern](#20-clinical-worklist-mobile-pattern)
21. [Filter System & Bottom Sheets](#21-filter-system--bottom-sheets)
22. [Master Patient Index Pattern](#22-master-patient-index-pattern)
23. [Critical Findings & Alert UX](#23-critical-findings--alert-ux)
24. [Technologist Scan Flow Preview](#24-technologist-scan-flow-preview)
25. [Radiologist Urgent Triage Preview](#25-radiologist-urgent-triage-preview)
26. [Patient Portal UX Direction](#26-patient-portal-ux-direction)
27. [Offline & Clinical Reliability](#27-offline--clinical-reliability)
28. [Form Design & Clinical Input](#28-form-design--clinical-input)
29. [Micro-Interactions & Feedback](#29-micro-interactions--feedback)
30. [Dark Mode Strategy (Future)](#30-dark-mode-strategy-future)
31. [Accessibility & Legibility](#31-accessibility--legibility)
32. [Component Catalog Index](#32-component-catalog-index)
33. [Screen-by-Screen Specifications](#33-screen-by-screen-specifications)
34. [Stitch Design Brief (Exact Prompt For Google Stitch)](#34-stitch-design-brief-exact-prompt-for-google-stitch)
35. [Recommended Web Reference Screenshots for AI Design Engines](#35-recommended-web-reference-screenshots-for-ai-design-engines)

---

## 1. Product Vision & Ecosystem Role
RadAxis RIS Mobile is a native clinical companion to the live RadAxis Radiology Information System (`https://meril-ris.mangesh.my.id`). It is designed for clinical practitioners on the move:
- **Radiologists** who need emergency stat alerts, fast report verification, and mobile peer consults while away from their multi-monitor PACS reading suites.
- **Technologists** positioned at scanner consoles (CT, MRI, X-Ray, Ultrasound) who must check patient transport arrival, verify contrast allergies, and mark scans in progress.
- **Receptionists and Triage Staff** needing quick bedside or waiting-room patient lookups, queue management, and identity confirmation.
- **Patients (Phases 2+)** accessing their appointment schedule, preparation instructions, and validated diagnostic reports.

The mobile app does not replace high-throughput diagnostic reading stations or 5-monitor diagnostic PACS suites. Instead, it serves as the fast, ergonomic, notification-driven mobile nerve center of the RadAxis enterprise.

---

## 2. Brand Identity & Continuity
The mobile application is an organic extension of the RadAxis **Serene Mint Health** design language:
- **Name:** RadAxis RIS
- **Visual Soul:** Serene, crisp, clinical, trustworthy, high-contrast, modern medical precision.
- **Primary Color:** Deep Navy (`#0F172A`) paired with Emerald Green (`#10B981` / `#059669`) and clinical Cyan (`#0891B2`).
- **Surface Canvas:** Clean cool slate (`#F8FAFC`) with subtle mint accents (`#E9F1ED`).
- **Typography Tone:** System San Francisco / Roboto for UI speed, combined with SpaceMono for clinical identifiers (MRN, ACC, UID) to prevent digit misreads.

---

## 3. What We Deliberately Stole From Web
To ensure zero cognitive friction for clinicians switching between desktop and mobile:
1. **Clinical Nomenclature & Statuses:** Exact state tokens (`SCHEDULED`, `ARRIVED`, `SCANNING`, `PACS_READY`, `READY_FOR_REPORTING`, `REPORTED`, `FINAL_VERIFIED`, `CANCELLED`).
2. **Priority Hierarchy:** Exact 3-tier clinical urgency triage (`STAT`, `URGENT`, `ROUTINE`).
3. **Semantic Color Values:** Rose/Red for STAT & Critical; Amber for Urgent; Emerald for Completed/Verified; Cyan for In-Progress; Slate for Neutral/Routine.
4. **Identifier Formatting:** Strict label prefixes: `MRN: PAT-YYYY-XXXXX`, `ACC: ACC-YYYY-XXXXX`, `UID: 1.2.840...`.
5. **Brand Typography Spirit:** Crisp sans-serif text, bold clinical titles, and monospaced codes.

---

## 4. What We Deliberately Refused To Steal
Desktop web patterns that fail on mobile have been firmly eliminated:
1. **Horizontal Dense Tables:** Desktop 12-column tables never work on a 390px mobile viewport. Replaced with single-column clinical cards.
2. **Hover Actions & Tooltips:** Replaced with explicit tap targets, swipe gestures, and bottom-sheet contextual dialogs.
3. **Complex Multi-Pane Modals:** Replaced with full-height native push screens or sliding bottom sheets.
4. **Tiny Multi-Dropdown Filter Bars:** Replaced with horizontally scrolling quick chips and dedicated bottom-sheet filter drawers.
5. **Full Diagnostic Image Viewing:** Full multi-planar diagnostic reconstruction belongs on calibrated medical monitors. Mobile displays key scout/reference frames and quick OHIF web viewer launch tokens.

---

## 5. Foundational Mobile UX Principles
1. **Glanceability in High-Stress Environments:** A clinician walking through an emergency bay must ascertain patient urgency and status in under 2 seconds.
2. **Single-Handed Ergonomics:** Primary interactions, filters, and CTAs reside in the lower 60% of the screen (the "Thumb Zone").
3. **Zero Accidental Clinician Actions:** Dangerous status changes (e.g. Cancelling an order, rejecting a report) require two-step confirmation sheets.
4. **No Dead Ends:** Empty states, error boundaries, and offline warnings always offer an action (Refresh, Call Desk, Retry, Filter Reset).
5. **Optimistic Speed with Verified Safety:** UI state updates instantly on touch; network rollback occurs gracefully if the backend reports a validation error.

---

## 6. Color Architecture & Meaning
The color palette balances medical authority with calming clarity:

- **Brand Navy (`#0F172A`):** Anchors primary text, titles, navigation tab bars, and high-emphasis surfaces.
- **Brand Emerald (`#10B981` / `#059669`):** Represents healthy outcomes, verified reports, PACS-ready milestones, and affirmative primary actions.
- **Clinical Cyan (`#0891B2`):** Highlights active scanner modalities, patient identifiers, and secondary actions.
- **Emergency Crimson (`#EF4444` / `#DC2626`):** Reserved exclusively for STAT orders, acute critical findings, and system errors.
- **Clinical Amber (`#F59E0B` / `#D97706`):** Indicates urgent triage, delayed exams, contrast allergy alerts, and equipment warnings.
- **Neutral Canvas (`#F8FAFC` & `#FFFFFF`):** High-clarity backgrounds that minimize battery drain and reduce eye strain in dimmed radiologist reading rooms.

---

## 7. Complete Semantic Color Table

| Token Key | Background | Text / Icon | Border | Clinical Meaning |
|:---|:---|:---|:---|:---|
| `Colors.brand.navy` | `#0F172A` | `#FFFFFF` | `#1E293B` | Brand identity, primary screen titles, active navigation |
| `Colors.brand.emerald`| `#ECFDF5` | `#047857` | `#A7F3D0` | PACS Ready, Finalized Report, Success |
| `Colors.status.critical` | `#FEF2F2` | `#B91C1C` | `#FECACA` | STAT priority, Acute intracranial bleed, Life threat |
| `Colors.status.warning` | `#FFFBEB` | `#B45309` | `#FDE68A` | Urgent priority, Contrast extravasation, Scanner delay |
| `Colors.status.info` | `#EFF6FF` | `#1D4ED8` | `#BFDBFE` | Technologist protocol note, Scheduled visit |
| `Colors.status.inProgress` | `#ECFEFF` | `#0E7490` | `#A5F3FC` | Scanning in progress, Live modality acquisition |
| `Colors.status.cancelled` | `#F1F5F9` | `#64748B` | `#CBD5E1` | Cancelled procedure, Inactive patient record |

---

## 8. Status Mapping Table

| Web RIS Status | Mobile Badge Text | Badge Background | Badge Text Color | Icon / Visual Indicator |
|:---|:---|:---|:---|:---|
| `SCHEDULED` | Scheduled | `#EFF6FF` | `#1D4ED8` | Calendar icon (`📅`) |
| `ARRIVED` | Arrived | `#F3E8FF` | `#7E22CE` | Check-in icon (`📍`) |
| `WAITING` | Waiting | `#FFFBEB` | `#B45309` | Clock icon (`⏳`) |
| `SCANNING` / `IN_PROGRESS` | Scanning | `#ECFEFF` | `#0E7490` | Pulse indicator (`⚡`) |
| `PACS_READY` | PACS Ready | `#D1FAE5` | `#065F46` | Database sync icon (`📦`) |
| `READY_FOR_REPORTING` | Ready to Read | `#FEF3C7` | `#92400E` | Stethoscope / Pen (`📝`) |
| `REPORTED` / `DRAFTED` | Preliminary | `#EDE9FE` | `#5B21B6` | Document review icon (`📄`) |
| `FINAL_VERIFIED` | Verified | `#DCFCE7` | `#166534` | Double checkmark (`✓✓`) |
| `CANCELLED` | Cancelled | `#F1F5F9` | `#64748B` | Strike-through (`✕`) |

---

## 9. Priority Mapping Table

| Priority Level | Visual Badge Treatment | Mobile Layout Placement | Vibration / Haptic Pattern |
|:---|:---|:---|:---|
| **STAT** | Pulsing Rose Badge (`#FEF2F2`, `#BE123C`), bold uppercase | Top right card corner, always pinned to top of worklist | Heavy double haptic buzz (`impactAsync('heavy')`) |
| **URGENT** | Amber Pill (`#FFFBEB`, `#B45309`), solid border | Prominent top right badge | Single medium haptic tap |
| **ROUTINE** | Cool Slate Pill (`#F1F5F9`, `#475569`), subtle border | Top right secondary position | Standard silent visual sort |

---

## 10. Modality Color Strategy
Modality recognition is instant across all queues through dedicated modality chips:
- **CT (Computed Tomography):** Cyan / Light Blue (`#E0F2FE` bg, `#0369A1` text, bold `CT`)
- **MRI (Magnetic Resonance Imaging):** Purple / Indigo (`#F3E8FF` bg, `#6B21A8` text, bold `MRI`)
- **X-Ray (Radiography / Fluoroscopy):** Amber / Orange (`#FEF3C7` bg, `#92400E` text, bold `XR`)
- **US (Ultrasound / Doppler):** Emerald / Mint (`#D1FAE5` bg, `#065F46` text, bold `US`)
- **NM (Nuclear Medicine / PET):** Rose / Magenta (`#FFE4E6` bg, `#9F1239` text, bold `NM`)

---

## 11. Typography System & Scales

| Token Name | Font Size | Line Height | Font Weight | Usage / Target UI Elements |
|:---|:---|:---|:---|:---|
| `Typography.hero` | 28px | 34px | 800 (Heavy) | Welcome screen, Auth heading |
| `Typography.screenTitle` | 22px | 28px | 700 (Bold) | Screen header title (`ScreenHeader`) |
| `Typography.sectionHeader` | 16px | 22px | 700 (Bold) | Dashboard & tab category headers |
| `Typography.cardTitle` | 15px | 20px | 700 (Bold) | Patient Full Name, Alert Headline |
| `Typography.body` | 14px | 20px | 400 (Regular) | Descriptive copy, clinical instructions |
| `Typography.callout` | 13px | 18px | 500 (Medium) | Examination procedure name, sub-labels |
| `Typography.caption` | 11px | 15px | 500 (Medium) | Timestamps, metadata, secondary tags |
| `Typography.identifier` | 11px | 14px | 700 (SpaceMono) | Patient MRN, Accession Number, DICOM UID |

---

## 12. Monospace Identifier Rules
Clinical misreads cost lives. RadAxis Mobile enforces strict typography rules for unique IDs:
1. **Always Monospace:** Every Patient ID (`PAT-2026-XXXXX`), Accession Number (`ACC-2026-XXXXX`), and Study Instance UID is rendered exclusively with `SpaceMono`.
2. **Explicit Label Badges:** Never display a naked raw number. Always prefix with a labeled tag: `MRN: PAT-101` or `ACC: ACC-202`.
3. **One-Tap Copy Affordance:** Tapping a `ClinicalIdentifier` copies the string to the clipboard and triggers a brief checkmark confirmation badge.
4. **Distinction from Text:** Monospace identifiers are rendered inside subtle grey pills (`#F1F5F9`) with `#334155` text to distinguish them from standard clinical copy.

---

## 13. Spacing & Layout Grid
Built on a strict 4pt/8pt geometric grid:
- **`Spacing.xs` (4px):** Badge internal padding, icon-to-label gaps.
- **`Spacing.sm` (8px):** Spacing between card rows, chip margins.
- **`Spacing.md` (12px):** Card internal content separation.
- **`Spacing.lg` (16px):** Screen horizontal padding (`paddingHorizontal: 16`–`18`).
- **`Spacing.xl` (24px):** Section gap spacing on dashboard.
- **`Spacing.xxl` (32px):** Top hero spacing and login form layout gaps.

---

## 14. Corner Radii Strategy
Modern rounded geometry that feels friendly yet rigorously professional:
- **`Radius.sm` (6px):** Badges, status pills, filter count badges.
- **`Radius.md` (10px):** Form inputs, search fields, standard buttons.
- **`Radius.lg` (14px):** Clinical study cards, patient cards, alert cards.
- **`Radius.xl` (20px):** Modal sheets, bottom drawer sheets.
- **`Radius.full` (999px):** Circular user avatars, notification count bubbles.

---

## 15. Elevation & Shadow System
Subtle, natural lighting inspired by native iOS/Android system depth:
- **Level 0 (Flat):** Inputs, secondary chips (`borderWidth: 1`, `borderColor: #E2E8F0`).
- **Level 1 (Card):** Standard study and patient cards (`shadowColor: #0F172A`, `shadowOffset: { width: 0, height: 1 }`, `shadowOpacity: 0.04`, `shadowRadius: 4`, `elevation: 1`).
- **Level 2 (Interactive Floating):** STAT alert cards and active filter chips (`shadowOpacity: 0.08`, `shadowRadius: 8`, `elevation: 3`).
- **Level 3 (Modal / Bottom Sheet):** Sliding drawers (`shadowOpacity: 0.15`, `shadowRadius: 16`, `elevation: 8`).

---

## 16. Touch Targets & Ergonomics
- **Minimum Tap Target:** Every interactive element has an active touch area of at least **44x44pt** (meeting Apple HIG and Android Material accessibility standards).
- **HitSlop Expansion:** Small icons (clear search button, copy identifier) include `hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}`.
- **Button Heights:** Primary action buttons are strictly **48pt** to **52pt** tall with centered label typography.

---

## 17. Thumb Reach Zone Strategy
Mobile devices are predominantly operated with one hand:
- **Easy Zone (Lower 40%):** Bottom navigation tabs, primary action buttons, filter bottom sheet triggers, horizontal quick chips.
- **Natural Zone (Middle 35%):** Clinical study cards, scrollable patient list, metric cards.
- **Stretch Zone (Top 25%):** Screen titles, search bars, static status summaries.
- **Rule:** No destructive or frequent critical action is placed in the far top corners where one-handed reach causes hand gymnastics.

---

## 18. Information Hierarchy Formula
Every clinical card adheres to a deterministic, zero-confusion layout formula:
```
┌─────────────────────────────────────────────────────────────┐
│ [Modality Tag]  Patient Full Name            [Priority Tag] │  <- Tier 1: Patient & Urgency
│ Procedure Examination Name                                  │  <- Tier 2: What is being done
│ [MRN: PAT-XXXX]   [ACC: ACC-XXXX]                           │  <- Tier 3: Verified Identifiers
│ Status Badge (e.g. PACS READY)        Scheduled Time / ETA  │  <- Tier 4: Operational State
│ ─────────────────────────────────────────────────────────── │
│ [Primary Action Button, e.g. "Review & Verify Report →"]    │  <- Tier 5: Clinician Next Step
└─────────────────────────────────────────────────────────────┘
```

---

## 19. Card Architecture & Anatomy
`StudyCard.tsx` encapsulates the clinical formula:
- **Surface:** White card with `#F1F5F9` subtle border and 14px rounded corners.
- **Top Row:** Flex row with patient avatar or modality pill, high-emphasis bold patient name, and semantic `PriorityBadge`.
- **Examination Line:** Medium-weight text indicating study anatomy (e.g., *CT Chest Abdomen Pelvis with IV Contrast*).
- **Identifier Row:** Monospaced `ClinicalIdentifier` pills with tap-to-copy handlers.
- **Footer Action:** Clear status chip on the left; full-width or aligned action button on the right with arrow glyph.

---

## 20. Clinical Worklist Mobile Pattern
The mobile worklist transforms dense desktop data into a prioritized clinical feed:
- **Default Sort:** Pinned `STAT` studies first, followed by oldest unread `URGENT` studies, followed by chronological `ROUTINE`.
- **Quick Modality Switcher:** Horizontal filter chips (All, STAT, CT, MRI, X-Ray, US) allow 1-tap queue isolation.
- **Search Header:** Persistent search field accepting patient name, MRN, or accession number with immediate local filtering.
- **Pull-to-Refresh:** Smooth native pull-down refetches the live query without layout jitter.

---

## 21. Filter System & Bottom Sheets
- **Inline Filter Chips:** Top horizontal scroll containing the 4–6 most common operational filters.
- **Advanced Filter Sheet:** Tapping the filter icon slides up a native bottom sheet allowing multi-attribute filtering:
  - Date Range (Today, Yesterday, Last 7 Days, Custom)
  - Modality Selection (Multi-select pill grid)
  - Reporting Status (Unreported, Preliminary, Verified)
  - Referring Physician dropdown

---

## 22. Master Patient Index Pattern
The patient directory serves rapid bedside lookup:
- **Instant Search:** Instant search as you type across patient name, MRN, date of birth, and phone number.
- **Demographic Clarity:** Direct display of Age, Gender, DOB (`1988-04-12`), and verified contact phone.
- **One-Touch Actions:** Quick phone call initiation (`tel:`) or exam history opening from the card footer.

---

## 23. Critical Findings & Alert UX
Radiology emergencies (intracranial hemorrhage, aortic dissection, tension pneumothorax) require dedicated mobile triage:
- **Visual Distinction:** Critical cards have light red backgrounds (`#FEF2F2`), red borders, and high-visibility sirens (`🚨`).
- **Mandatory Acknowledgment:** Clinician must tap "Acknowledge Finding" which brings up a confirmation sheet recording timestamp and clinician ID.
- **Persistent Unread Counter:** Tab badge shows exact count of unacknowledged critical findings.

---

## 24. Technologist Scan Flow Preview
Designed for technologists moving between the scanner room and patient holding:
- **Scan Step Indicator:** Arrived → IV Cannulation / Contrast Safety → Scan in Progress → PACS Transfer.
- **Safety Checks:** Visual allergy badge (e.g. *Iodine Allergy / eGFR: 42*) highlighted in high-contrast amber.
- **One-Tap Status Advance:** Large action button to advance study from *Arrived* to *Scanning* to *PACS Ready*.

---

## 25. Radiologist Urgent Triage Preview
For radiologists reviewing stat examinations on the go:
- **Fast Summary:** Immediate scout review, clinical indications, and key findings.
- **Preliminary Dictation / Note:** Voice-to-text or quick macro insertion for urgent findings.
- **OHIF Token Launch:** One-click launch into the zero-footprint web viewer for detailed multi-planar slice inspection.

---

## 26. Patient Portal UX Direction
In Phase 2, patients gain access to their diagnostic journey:
- **Friendly Non-Clinical Language:** Simplified statuses ("Ready for Your Appointment", "Scan Finished", "Report Ready").
- **Preparation Cards:** Fasting instructions, arrival directions, contrast preparation.
- **Secure Report Access:** Biometric / OTP gated download of finalized PDF reports.

---

## 27. Offline & Clinical Reliability
Hospitals frequently have dead zones (lead-lined X-ray rooms, basement MRI suites):
- **Cached Snapshot:** Previously loaded worklist studies remain fully legible while offline.
- **Status Indicator:** Persistent non-blocking banner: `Offline — Showing cached studies from 10:45 AM`.
- **Queued Actions:** Non-mutating reads work seamlessly; mutating actions are clearly queued with sync indicators.

---

## 28. Form Design & Clinical Input
- **Floating Labels / Clear Labels:** Permanent labels above input fields to prevent context loss during clinical typing.
- **Input Keyboards:** Number pad for MRN/Accession searches; email-optimized for login; phone pad for patient contacts.
- **Validation Feedback:** Inline error messages in rose text below the field, never blocking alerts.

---

## 29. Micro-Interactions & Feedback
- **Touch State:** Buttons scale to `0.98` on touch with `activeOpacity={0.7}`.
- **Haptic Confirmation:** Success haptic on report verification; warning vibration on STAT order arrival.
- **Skeleton Loaders:** Content-shaped pulse loaders instead of generic spinning wheels during list queries.

---

## 30. Dark Mode Strategy (Future)
Planned for high-contrast viewing in darkened radiologist reading rooms:
- **Deep Navy Backgrounds (`#020617`):** Eliminates harsh white backlight glare.
- **Muted Borders (`#1E293B`):** Retains structural card outlines without high-contrast light bleed.
- **Subdued Accents:** Emerald and cyan adjusted for AAA contrast against dark canvas.

---

## 31. Accessibility & Legibility
- **Dynamic Type Support:** Text scales gracefully without clipping or overlapping.
- **Color Independence:** No clinical state is communicated by color alone; every badge includes text labels and distinct icons.
- **Contrast Ratios:** All body text targets high-contrast visibility with minimum 4.5:1 ratio targets against card backgrounds.

---

## 32. Component Catalog Index
The mobile design system provides these reusable components in `mobile/src/components/ui/`:

1. `ScreenHeader.tsx`: Title and subtitle header.
2. `SectionHeader.tsx`: Category divider header with optional right action.
3. `PriorityBadge.tsx`: STAT, URGENT, ROUTINE badges with semantic styling.
4. `StatusBadge.tsx`: Comprehensive clinical state resolver (PACS Ready, Scanning, Verified, etc.).
5. `ClinicalIdentifier.tsx`: Monospace MRN, ACC, and UID pills with tap-to-copy.
6. `FilterChip.tsx`: Interactive horizontal chips with count badges.
7. `SearchField.tsx`: Search input with clear button and magnifying glass.
8. `AppButton.tsx`: Accessible touch button (`primary`, `brand`, `secondary`, `danger`, `outline`).
9. `AppInput.tsx`: Secure and standard text input with focus borders and error states.
10. `AppCard.tsx`: Elevation card container with subtle borders.
11. `MetricCard.tsx`: Operational KPI dashboard card with trend indicators.
12. `StudyCard.tsx`: Master clinical worklist card with priority, identifiers, modality, and action.
13. `PatientCard.tsx`: Master patient index lookup card.
14. `AlertCard.tsx`: Emergency findings card with acknowledgment workflow.

---

## 33. Screen-by-Screen Specifications

### Screen 1: Login (`/(auth)/login.tsx`)
- **Header:** RadAxis brand mark, "RadAxis RIS", subtitle "Enterprise Radiology Information System".
- **Form:** Clinical Staff Email, Password with secure text toggle, API environment pill.
- **CTA:** Full-width Emerald Sign In button (`AppButton`).
- **Footer:** Secure connection indicator to `https://meril-ris.mangesh.my.id`.

### Screen 2: Executive Dashboard (`/(app)/(tabs)/home.tsx`)
- **Header:** Clinician greeting, active user role badge (e.g. `ADMIN`, `RADIOLOGIST`).
- **Live Metrics (2x2 Grid):** Total Studies, Studies Today, Pending Reports, Completed Exams.
- **Clinical Pipeline:** Status distribution overview (`Arrived`, `Scanning`, `PACS Ready`).
- **Fleet Activity:** Modality scanner fleet breakdown (CT, MRI, X-Ray, US).
- **Recent Activity:** Quick glance at urgent incoming orders.

### Screen 3: Clinical Worklist (`/(app)/(tabs)/worklist.tsx`)
- **Header:** ScreenHeader with live active study count.
- **Search:** SearchField matching name, MRN, or accession.
- **Filter Row:** All Active, STAT, URGENT, CT Fleet, MRI Fleet.
- **Study Feed:** Prioritized `StudyCard` list with one-tap action buttons.

### Screen 4: Master Patient Index (`/(app)/(tabs)/patients.tsx`)
- **Header:** ScreenHeader with patient search prompt.
- **Filter Row:** All Patients, Inpatients, Outpatients.
- **Patient Feed:** `PatientCard` items showing MRN, DOB, gender, and contact phone.

### Screen 5: Alerts & Findings (`/(app)/(tabs)/alerts.tsx`)
- **Header:** ScreenHeader with unacknowledged critical findings counter.
- **Filter Row:** All Alerts, Critical, Warnings, Info.
- **Alert Feed:** `AlertCard` items with interactive "Acknowledge Finding" action.

### Screen 6: More & System (`/(app)/(tabs)/more.tsx`)
- **Profile Card:** Initials avatar, user email, role badge.
- **Connectivity Card:** Live production API endpoint, network state dot, app version.
- **Module Roadmap:** Upcoming enterprise modules (MPI, Worklists, Billing, Inventory, Maintenance).
- **Destructive CTA:** Red Sign Out button with alert confirmation.

---

## 34. Stitch Design Brief (Exact Prompt For Google Stitch)

Copy and paste the exact block below into Google Stitch or any advanced multimodal UI design tool:

```text
Project: RadAxis RIS Mobile Client (Native iOS & Android)
Ecosystem: RadAxis Radiology Information System (Companion to live web RIS at https://meril-ris.mangesh.my.id)
Design Language: "Serene Mint Health" Modern Medical Mobile Design System
Target Platforms: iPhone 16 Pro (393x852 pt) & Google Pixel 9 (412x924 pt)

CORE DESIGN INSTRUCTION:
DO NOT design a responsive desktop website or a compressed tablet dashboard.
This is a 100% native mobile app built for clinical staff (radiologists, radiographers/technologists, and receptionists) walking hospital corridors and scanner rooms.
Every layout must be optimized for single-thumb ergonomics, high-contrast readability in dimmed viewing rooms, and instantaneous glanceability.

COLOR PALETTE:
- Primary Brand Navy: #0F172A (Text, dark surfaces, bottom tab bar background)
- Brand Emerald: #10B981 / #059669 (Primary CTAs, finalized badges, verified checkmarks)
- Canvas Background: #F8FAFC (Clean light grey/slate background)
- Card Surfaces: #FFFFFF with subtle #F1F5F9 borders, 14px border radius, subtle elevation shadow
- Clinical Modality Cyan: #0891B2 / #E0F2FE (Modality chips, patient demographic pills)
- Urgency Crimson (STAT): #EF4444 / #FEF2F2 (Urgent emergency findings, STAT priority pills)
- Warning Amber: #F59E0B / #FFFBEB (Delayed studies, contrast allergy warnings)

TYPOGRAPHY:
- Headlines & UI: SF Pro Display / Roboto (Bold, crisp, high contrast)
- Clinical Identifiers: SpaceMono or SF Mono (Strictly used for MRN: PAT-XXXX and ACC: ACC-XXXX)

KEY SCREENS TO GENERATE:

1. Clinical Staff Login:
- Elegant RadAxis logo with emerald pulse accent
- Inputs for Clinical Staff ID/Email and Password
- Production Server status indicator ("Connected to meril-ris.mangesh.my.id")
- Large emerald "Sign In" button (50pt height)

2. Clinician Mobile Dashboard:
- Header with user avatar, name, and role badge (e.g., "DR. MANGESH · RADIOLOGIST")
- 2x2 High-density Metric Cards (Total Studies, Today's Volume, Pending Reports, Completed)
- Horizontal Patient Pipeline cards (Arrived -> Scanning -> PACS Ready)
- Modality Fleet quick-status cards (CT Scanner 1 Active, MRI Scanner 2 Scanning)

3. Clinical Worklist Queue:
- Persistent top search bar ("Search name, MRN, accession...")
- Horizontal scrolling filter chips: [All Active] [STAT (2)] [URGENT (3)] [CT Fleet] [MRI Fleet]
- Vertical list of Clinical Study Cards:
  * Top row: Modality pill (e.g. "CT" in blue) + Patient Name (bold) + STAT badge (pulsing red)
  * Middle row: Examination procedure name ("CT Chest Abdomen Pelvis with Contrast")
  * Identifier row: Monospace pills for "MRN: PAT-2026-00101" and "ACC: ACC-2026-00201"
  * Footer: Status pill ("PACS READY" in green) + Scheduled time ("10:45 AM") + "Open Study →"

4. Critical Findings & Alert Screen:
- Header with "2 Urgent Findings Requiring Acknowledgment"
- High-visibility Alert Cards with light red surface (#FEF2F2), red border, siren icon
- Clear description: "Acute Intracranial Hemorrhage detected on CT Head"
- Referring physician contact button and prominent dark "Acknowledge Finding" button

5. Study Detail & Clinical Triage Screen:
- Patient summary banner with demographics and allergy flags (Contrast Allergy: Yes)
- Timeline of scan progress (Ordered -> Scheduled -> Arrived -> Completed -> PACS Synced)
- Key DICOM thumbnail preview with slice count (342 images)
- Primary CTA: "Launch OHIF Mobile Viewer" and secondary "Preliminary Dictation"

6. Bottom Tab Bar Navigation:
- 5 native tabs: Home (Dashboard), Worklist (List), Patients (MPI), Alerts (Bell with red badge), More (Profile & Settings)
- Active icon colored in brand Emerald (#10B981) or Navy (#0F172A); inactive in cool slate (#94A3B8)
```

---

## 35. Recommended Web Reference Screenshots for AI Design Engines
When feeding visual context into Google Stitch, Figma AI, or design tools, provide these 6 existing screens from the live production RadAxis Web RIS (`https://meril-ris.mangesh.my.id`):

1. **Web Screen 1: Login Screen (`/login`)**
   - *What Stitch should learn:* The exact RadAxis logo geometry, typography weighting, and clean healthcare entrance aesthetics.
2. **Web Screen 2: Executive Dashboard (`/dashboard`)**
   - *What Stitch should learn:* Operational KPI metric cards, modality fleet distribution figures, and department pipeline status terminology.
3. **Web Screen 3: Radiologist Worklist (`/worklist` or `/radiologist`)**
   - *What Stitch should learn:* Priority badge color rules (STAT red vs. URGENT amber vs. ROUTINE grey), accession number conventions, and clinical status definitions.
4. **Web Screen 4: Technologist Scanning Console (`/technologist`)**
   - *What Stitch should learn:* The scanning sequence stages (`READY_FOR_SCAN` → `SCANNING` → `PACS_READY`), contrast notes, and scanner fleet identifiers.
5. **Web Screen 5: Patient Registration & Reception (`/patients` or `/reception`)**
   - *What Stitch should learn:* Patient MRN format (`PAT-YYYY-XXXXX`), demographic field layout, and patient contact record styling.
6. **Web Screen 6: Diagnostic Reporting Workspace (`/reports` / OHIF integration)**
   - *What Stitch should learn:* Report verification states (`DRAFT` → `PRELIMINARY` → `VERIFIED`), radiologist sign-off styling, and PACS study UID references.


---

## 36. Phase 1.6 Stitch Design Reconciliation & Design Lock Authority

### 36.1 Reconciliation Overview
On review of the seven Stitch mobile screen designs (`stitch_radaxis_mobile_ris.zip`), the core visual direction was conditionally approved and reconciled with the existing RadAxis Expo SDK 58 application. Unsupported prototype features and remote asset dependencies were systematically corrected to establish a production-grade, privacy-compliant medical mobile interface.

### 36.2 Accepted Stitch Patterns
- **Five-Tab Bottom Navigation:** Native tab bar with Home, Worklist, Patients, Alerts, and More.
- **Vertical Clinical Feeds:** Single-column vertical study and patient cards replacing desktop multi-column tables.
- **Study Detail Architecture:** Rich patient clinical summary, prominent allergy alert banners, technical imaging parameters, and full-width workflow timeline.
- **Sticky Contextual Bottom Trays:** Fixed bottom action envelope housing primary viewer actions and secondary review triggers within the thumb zone.
- **Horizontal Quick Filter Chips:** Fast modality and priority filtering without leaving the active queue.
- **Monospace Clinical Identifiers:** Strict visual separation of MRN, Accession numbers, and UIDs.
- **Operational Command Center (Home):** 2x2 metric tiles, emergency STAT broadcast alert, and stepped clinical pipeline.

### 36.3 Rejected Stitch Patterns & Corrections
1. **Color Deviation:** Stitch introduced pure black (`#000000`). **Rejected:** Enforced canonical RadAxis Deep Navy (`#0F172A`) and Brand Emerald (`#10B981` / `#059669`).
2. **Remote & Fragile Assets:** Stitch referenced remote Google-hosted images and CDN links that fail offline. **Rejected:** Replaced with local SVG glyphs, offline-safe vector icons, and local initials avatars.
3. **Invented Authentication:** Stitch introduced Badge/RFID scanning, workstation dropdowns, and Face ID bypasses. **Rejected:** Preserved existing real authentication contract (`/auth/login` and `/auth/me`).
4. **Composite Alert Actions:** Stitch combined acknowledgment and clinician calling into an ambiguous `Acknowledge & Direct Call` button. **Rejected:** Strictly separated into 3 discrete actions: (1) Call Clinician, (2) Acknowledge Finding (with confirmation dialog), and (3) Record Verbal Read-Back Note.
5. **Patient Privacy Violations:** Stitch exposed patient headshots, national ID numbers, and phone numbers in list views. **Rejected:** Enforced privacy-minimized patient cards with minimum necessary preview fields (Initials avatar, MRN, age/sex, and encounter location; no patient photos, national ID, or phone numbers in list views).
6. **Fake Telemetry & Modules:** Stitch invented Nuance Dragon, Dictation AI, 280MB offline encrypted caches, and 24ms server latency claims. **Rejected:** Removed all invented features from More/Profile.

### 36.4 Canonical Priority Mapping Table

| Priority Level | Background | Text Color | Border Color | Icon | Clinical Rule |
|:---|:---|:---|:---|:---|:---|
| **`STAT`** | `#FEF2F2` | `#991B1B` | `#FECACA` | `⚠` | Emergency studies; pinned to top of queue; triggers haptic alert |
| **`URGENT`** | `#FFFBEB` | `#B45309` | `#FDE68A` | `▲` | Expedited reads, contrast warnings, inpatient ward priorities |
| **`ROUTINE`** | `#F1F5F9` | `#475569` | `#E2E8F0` | `●` | Standard non-urgent imaging orders |

### 36.5 Canonical Clinical Status Mapping Table

| Backend Token | Canonical Display Label | Symbol | Background | Text Color | Border Color | Clinical Rule & Notes |
|:---|:---|:---|:---|:---|:---|:---|
| `SCHEDULED`, `BOOKED`, `CONFIRMED` | **`SCHEDULED`** | `📅` | `#EFF6FF` | `#1D4ED8` | `#BFDBFE` | Order booked in RIS calendar |
| `ARRIVED`, `CHECKED_IN` | **`ARRIVED`** | `📍` | `#F3E8FF` | `#7E22CE` | `#E9D5FF` | Patient physically present at imaging center |
| `WAITING`, `IN_QUEUE` | **`WAITING`** | `⏳` | `#FFFBEB` | `#B45309` | `#FDE68A` | Patient prepped, waiting for modality room |
| `SCANNING`, `SCAN_IN_PROGRESS`, `ACQUIRING` | **`SCANNING`** | `⚡` | `#ECFEFF` | `#0E7490` | `#A5F3FC` | Active image acquisition underway |
| `PACS_READY`, `PACS_SYNCED`, `IMAGE_ACCEPTED` | **`PACS READY`** | `📦` | `#D1FAE5` | `#065F46` | `#A7F3D0` | DICOM series transferred and verified in Orthanc |
| `READY_FOR_REPORTING`, `READY_FOR_READ` | **`READY FOR REPORTING`**| `📝` | `#FEF3C7` | `#92400E` | `#FDE68A` | Images available, in radiologist unread queue |
| `REPORTING`, `DRAFTED`, `PRELIMINARY` | **`REPORTING`** | `📄` | `#EDE9FE` | `#5B21B6` | `#DDD6FE` | Radiologist dictation or preliminary draft open |
| `FINAL_VERIFIED`, `FINAL`, `VERIFIED`, `SIGNED` | **`FINAL VERIFIED`** | `✓✓` | `#DCFCE7` | `#166534` | `#BBF7D0` | Radiologist electronically signed final diagnostic report |
| `CANCELLED`, `VOIDED` | **`CANCELLED`** | `✕` | `#F1F5F9` | `#64748B` | `#CBD5E1` | Order officially cancelled or voided |
| `COMPLETED`, `SCAN_COMPLETED` *(Non-canonical)* | **`SCAN COMPLETED`** | `✓` | `#ECFDF5` | `#047857` | `#A7F3D0` | Acquisition complete on console; awaiting radiologist report (never promoted to Final Verified) |
| `FAILED`, `PACS_FAILED`, `TRANSFER_FAILED` *(Non-canonical)* | **`FAILED`** | `⚠` | `#FEF2F2` | `#991B1B` | `#FECACA` | Technical transfer failure; clinical order remains active (never conflated with Cancelled) |
| *Unmapped Token* | **Verbatim Label** | `•` | `#F1F5F9` | `#475569` | `#CBD5E1` | Displayed verbatim in uppercase neutral styling; no speculative promotion |

### 36.6 Shared Canonical Preview Fixture
All screens strictly consume `CANONICAL_STUDIES` from `mobile/src/fixtures/canonicalData.ts`. Ages are dynamically computed using `formatDemographics(dob, sex, refDate)` relative to canonical preview date `November 21, 2026`:
- **Eleanor Vance:** 65F (DOB: `1961-08-14`), MRN: `PAT-2026-00101`, ACC: `ACC-2026-00201`, CT Chest Abdomen Pelvis with Contrast, STAT, PACS READY, Cardiothoracic ICU (Bed 04). Indication: Tearing chest pain radiating to back, rule out aortic dissection. Critical Finding: Acute Type A Aortic Dissection.
- **David Kowalski:** 52M (DOB: `1974-11-02`), MRN: `PAT-2026-00102`, ACC: `ACC-2026-00202`, CT Head without Contrast, STAT, SCANNING, Emergency Bay 1.
- **Marcus J. Brody:** 43M (DOB: `1983-05-19`), MRN: `PAT-2026-00103`, ACC: `ACC-2026-00203`, MRI Lumbar Spine without Contrast, URGENT, READY FOR REPORTING, Suite B.
- **Marcus Aurelius Sterling:** 64M (DOB: `1962-07-19`), MRN: `PAT-2026-00104`, ACC: `ACC-2026-00204`, X-Ray Chest 2 Views, ROUTINE, ARRIVED, Pre-Op Holding.
- **Priya Sharma:** 35F (DOB: `1991-03-15`), MRN: `PAT-2026-00105`, ACC: `ACC-2026-00205`, Ultrasound Abdomen Complete, ROUTINE, SCHEDULED, Suite 3.

### 36.7 Target Device & Layout Verification
Every screen has been verified against native ergonomic standards:
- **iPhone 16 Pro (`393 × 852 pt`):** Dynamic island clearance, home indicator insets, full thumb zone compliance.
- **Google Pixel 9 (`412 × 924 pt`):** Android edge-to-edge status bar clearance, gesture navigation bar buffer.
- **Narrow Android (`360dp` width):** Compact metric cards, non-wrapping patient identifiers, horizontal chip scrolling without clipping.
- **Touch Envelopes:** Strict minimum `44pt` (iOS) / `48dp` (Android) touch targets across all interactive buttons and chips.

### 36.8 Phase 2 Implementation Guardrails
1. **Production Freeze:** The live backend (`https://meril-ris.mangesh.my.id`), database, Orthanc PACS, and Docker infrastructure remain completely frozen.
2. **No Unauthenticated Mutations:** Phase 2 will introduce patient booking and report downloads through sanitized, authenticated endpoints only.
3. **Zero UI Drift:** All future Phase 2 and Phase 3 screens must utilize the verified components in `mobile/src/components/ui/` and tokens in `mobile/src/theme/`.
