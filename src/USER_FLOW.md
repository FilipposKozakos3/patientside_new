# Patient Health Records - User Flow & Wireframes

## Overview
This document outlines the key screens and user interactions for the Patient Health Records MVP application.

---

## Screen 1: Authentication & Access

### Login/Signup Screen
**Components:**
- Logo and app title
- Tab switcher (Login / Sign Up)
- Email input field
- Password input field
- Name input field (signup only)
- Submit button
- Privacy notice banner

**User Actions:**
1. User enters credentials
2. User clicks "Login" or "Sign Up"
3. System validates input

**Navigation:**
→ Role Selection Screen

---

## Screen 2: Role Selection

### Choose Role Screen
**Components:**
- Logo and welcome message
- Two large role selection cards:
  - Patient (with icon)
  - Healthcare Provider (with icon)
- Brief description under each role

**User Actions:**
1. User selects their role (Patient/Provider)
2. System saves role preference

**Navigation:**
→ Dashboard (Main Screen)

---

## Screen 3: Dashboard (Main Screen)

### Patient Dashboard
**Components:**

**Header:**
- App logo and title
- User welcome message
- "Export Health Summary" button (prominent)
- Logout button

**Quick Actions Row:**
- Total Records card (clickable → Records view)
- Upload Records card (clickable → Upload view)
- Export Summary card (clickable → Export modal)

**Main Content:**
- Recent Activity section
  - List of 5 most recent records
  - Record type icon, title, date
  - "View All Records" button
- Health Summary Cards (4 grid)
  - Medications count
  - Allergies count
  - Lab Results count
  - Documents count

**Sidebar:**
- Notifications panel
  - Badge with count
  - List of recent notifications
- Appointments panel
  - Next appointment info
- Quick Tips card

**Navigation Tabs:**
- Dashboard (active)
- Records
- Upload
- Providers
- Settings

**User Actions:**
1. View health snapshot at a glance
2. Click quick action cards to navigate
3. Review recent activity
4. Check notifications
5. Export health summary with one tap

**Navigation:**
→ Any tab via navigation menu

---

## Screen 4: Records Library (Data Access)

### View All Health Records
**Components:**

**Search & Filter Bar:**
- Search input (with icon)
- Provider filter dropdown
- Date sort dropdown (Newest/Oldest)

**Category Tabs:**
- All Records
- Patient Info
- Medications
- Allergies
- Immunizations
- Lab Results
- Documents
(Each shows count)

**Record List:**
Each record card displays:
- Category icon
- Record title
- Date added
- Visit date (if applicable)
- Provider name (if applicable)
- Category badge
- Consent status badge
- Action buttons:
  - View (eye icon)
  - Export (QR icon)
  - Share (share icon)
  - Delete (trash icon)

**User Actions:**
1. Search records by name
2. Filter by provider
3. Filter by category
4. Sort by date
5. View record details
6. Export individual records
7. Manage sharing consent
8. Delete records

**Navigation:**
→ Record Viewer (modal)
→ Export Options (modal)
→ Consent Manager (modal)

---

## Screen 5: Upload/Import Records (Data Upload)

### Add Health Records
**Components:**

**Tab Switcher:**
- Upload File
- Manual Entry

**Upload File Tab:**
- File input field
- Browse button
- Accepted format note (.json)
- Success/error message

**Manual Entry Tab:**
- Record Type dropdown
  - Medication
  - Allergy
  - Immunization
  - Lab Result/Observation
  - Document
- Name/Title input (required)
- Description/Dosage textarea
- Record Date input
- Visit Date input (optional)
- Healthcare Provider input (optional)
- Additional Notes textarea
- "Add Record" button

**User Actions:**
1. Choose upload method
2. Upload FHIR JSON file OR
3. Fill manual entry form
4. Submit record
5. View success confirmation

**Navigation:**
→ Dashboard (after success)
→ Records view (via "View Records" link)

---

## Screen 6: Provider Management

### Manage Healthcare Providers
**Components:**

**Header:**
- Title and description
- "Add Provider" button

**Add Provider Form (when active):**
- Provider Name input (required)
- Specialty input
- Phone input
- Email input
- Address input
- Save/Cancel buttons

**Provider List:**

**Favorite Providers Section:**
- Star icon indicator
- Provider cards

**All Providers Section:**
- Provider cards

**Each Provider Card:**
- Provider icon
- Name and specialty badge
- Contact info (phone, email, address)
- Date added
- Star button (favorite/unfavorite)
- Delete button

**User Actions:**
1. Add new provider
2. Fill provider information form
3. Save provider
4. Mark providers as favorite
5. View provider details
6. Delete providers

**Navigation:**
→ Records view (to share with provider)

---

## Screen 7: Share Data (Consent Manager)

### Manage Sharing & Consent
**Components:**

**Modal Dialog:**
- Title: "Manage Sharing & Consent"
- Description

**Consent Toggle:**
- Large toggle switch
- "Enable Sharing" label
- Description text

**Authorized Providers (when enabled):**
- Input field to add provider
- "Add" button
- List of authorized providers
  - Provider name
  - Remove button (X)
- Count of authorized providers

**Privacy Notices:**
- Privacy control description
- FHIR compliance badge
- How sharing works

**Actions:**
- Cancel button
- "Save Consent Settings" button

**User Actions:**
1. Enable/disable sharing for record
2. Add authorized providers
3. Remove authorized providers
4. Save consent preferences

**Navigation:**
→ Back to Records view

---

## Screen 8: Export Options (Patient Export Button)

### One-Tap Health Summary Export
**Components:**

**Modal Dialog:**
- Title: "Patient Health Summary"
- Description

**Summary Stats Card:**
- Count of medications
- Count of allergies
- Count of lab results
- Count of immunizations
- Total records included

**QR Code Section:**
- Generated QR code (large)
- "Download QR Code" button
- Instructions

**Export Options Section:**
- "Download FHIR Bundle (JSON)" button
- "Copy to Clipboard" button
- Format badges (FHIR R4, Standards-Based)

**Usage Instructions:**
- How to use at clinic
- USB transfer instructions
- Privacy notice

**User Actions:**
1. View summary of included records
2. Download QR code image
3. Download JSON file
4. Copy data to clipboard
5. Close modal

**Navigation:**
→ Back to previous screen

---

## Screen 9: Record Viewer (View Details)

### Detailed Record View
**Components:**

**Modal Dialog:**
- Title: "Health Record Details"
- FHIR Resource Type label

**Record Information Card:**
- Record ID
- Date added
- Last modified
- Category badge

**Clinical Information Card:**
(Content varies by record type)
- All FHIR resource fields
- Formatted and labeled
- Easy-to-read layout

**Sharing & Consent Card:**
- Consent status badge
- List of shared providers
- Last shared date

**User Actions:**
1. View all record details
2. Review sharing status
3. Close modal

**Navigation:**
→ Back to Records view
→ Consent Manager (via share button)

---

## Screen 10: Settings

### Application Settings
**Components:**

**About This System Card:**
- Key Features list
  - Local Storage
  - Offline Access
  - FHIR Compliant
  - Export Options
  - Consent Control
- How to Use guide (numbered steps)
- Privacy & Security section

**Demo Data Card:**
- "Load Sample Records" button
- "Clear All Records" button
- Warning message

**User Actions:**
1. Read about features
2. Load sample data for testing
3. Clear all data

**Navigation:**
→ Dashboard (recommended after loading data)

---

## Key Navigation Flows

### Primary User Journey:
1. **Access**: Login/Signup → Role Selection
2. **Dashboard**: View health snapshot
3. **Upload**: Add health records
4. **View**: Browse and search records
5. **Share**: Export summary or share with provider
6. **Manage**: Update consent and providers

### Quick Export Flow:
1. Click "Export Health Summary" button (anywhere)
2. View summary modal with QR code
3. Download or share

### Add Record Flow:
1. Navigate to Upload tab
2. Choose upload method
3. Fill form or upload file
4. Submit and view success

### Share with Provider Flow:
1. View record in Records tab
2. Click Share button
3. Enable sharing
4. Add authorized provider
5. Save consent settings

---

## Mobile Responsive Considerations

### Breakpoints:
- **Mobile**: < 640px
  - Single column layout
  - Collapsed navigation
  - Simplified cards
  - Touch-optimized buttons

- **Tablet**: 640px - 1024px
  - Two column layout for some sections
  - Visible navigation tabs
  - Medium-sized cards

- **Desktop**: > 1024px
  - Multi-column layouts
  - Sidebar visible
  - Large cards with more info
  - Hover states active

### Mobile-Specific Features:
- Hamburger menu for navigation
- Bottom tab bar option
- Swipe gestures for records
- Camera integration for document capture
- Share sheet integration

---

## Accessibility Features

- ARIA labels on all interactive elements
- Keyboard navigation support
- Screen reader compatible
- High contrast mode support
- Focus indicators
- Error messages in multiple formats
- Alt text for icons

---

## Notifications System

### Types of Notifications:
1. **New Record Uploaded**: Alert when provider adds record
2. **Appointment Reminder**: Upcoming appointments
3. **Record Shared**: Confirmation when record is shared
4. **Consent Request**: When provider requests access
5. **System Updates**: App updates or maintenance

### Notification Display:
- Badge count on bell icon
- List in sidebar
- In-app alerts
- Read/unread status

---

## Error States & Empty States

### Empty States:
- **No Records**: "No records found. Start by uploading..."
- **No Providers**: "No providers added yet. Add your first provider..."
- **No Notifications**: "No new notifications"
- **Search No Results**: "No records match your search"

### Error States:
- **Upload Failed**: Red alert with error message
- **Invalid File**: "Please ensure it is a valid JSON file"
- **Required Fields**: "Please fill in all required fields"
- **Network Error**: Offline mode indicator

---

## Data Flow Summary

```
[User] → [Authentication] → [Dashboard]
                                   ↓
                    [Records] ← → [Upload]
                       ↓
                [View Details] → [Export/Share]
                       ↓
              [Consent Manager] → [Providers]
```

---

## Technical Notes

### Local Storage Structure:
- `patient_health_records`: Array of StoredHealthRecord objects
- `patient_info`: Patient demographic information
- `healthcare_providers`: Array of Provider objects
- `user_preferences`: App settings and preferences

### FHIR Resources Supported:
- Patient
- MedicationStatement
- AllergyIntolerance
- Immunization
- Observation
- DocumentReference

### Export Formats:
- FHIR Bundle (JSON)
- QR Code (PNG)
- Individual FHIR Resources (JSON)

---

## Future Enhancements (Post-MVP)

1. Biometric authentication
2. Encrypted backups
3. Family member accounts
4. Medication reminders
5. Health goal tracking
6. Integration with wearables
7. Telemedicine integration
8. Multi-language support
9. Voice commands
10. AI-powered health insights
