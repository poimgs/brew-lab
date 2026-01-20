# Mineral Profiles

## Overview

Water chemistry significantly affects coffee extraction and taste. Mineral modifiers are concentrated solutions that adjust water composition. This feature allows users to manage mineral profile reference data and track which profiles they use in experiments.

The system tracks mineral *additions*, not base water chemistry. Profiles are relatively static reference data—users add products they own, and the chemical composition doesn't change.

---

## Entity: Mineral Profile

### Fields

| Field | Type | Unit | Required | Description |
|-------|------|------|----------|-------------|
| id | UUID | — | Auto | Unique identifier |
| name | string | — | Yes | Profile name (e.g., "Catalyst", "Affinity") |
| brand | string | — | No | Product brand/manufacturer |
| description | text | — | No | General description of effects |
| hardness | decimal | ppm | No | Total hardness (as CaCO3) |
| alkalinity | decimal | ppm | No | Total alkalinity (as CaCO3) |
| magnesium | decimal | mg/L | No | Mg concentration |
| calcium | decimal | mg/L | No | Ca concentration |
| potassium | decimal | mg/L | No | K concentration |
| sodium | decimal | mg/L | No | Na concentration |
| chloride | decimal | mg/L | No | Cl concentration |
| sulfate | decimal | mg/L | No | SO4 concentration |
| bicarbonate | decimal | mg/L | No | HCO3 concentration |
| typical_dose | string | — | No | Usage instructions (e.g., "2 drops per cup") |
| taste_effects | text | — | No | Expected taste impact |
| is_system | boolean | — | Auto | True for predefined profiles |
| created_at | timestamp | — | Auto | Record creation time |
| updated_at | timestamp | — | Auto | Last modification time |

### Predefined Profiles

Based on common commercial products:

**Catalyst**
```
hardness: 70.9 ppm
alkalinity: 15 ppm
magnesium: 12.2 mg/L
calcium: 8.2 mg/L
potassium: 14.3 mg/L
sodium: 3.9 mg/L
chloride: 58.7 mg/L
bicarbonate: 18.3 mg/L
taste_effects: "Increased body, enhanced sweetness"
```

**Affinity**
```
hardness: 50.45 ppm
alkalinity: 12.18 ppm
magnesium: 12.25 mg/L
sodium: 16.51 mg/L
chloride: 46.55 mg/L
sulfate: 8.15 mg/L
bicarbonate: 14.86 mg/L
taste_effects: "Clarity, balanced acidity"
```

### Profile Characteristics Summary

| Profile | Hardness | Key Property | Expected Effect |
|---------|----------|--------------|-----------------|
| Catalyst | Higher (70.9) | More Mg+Ca | Increased body, enhanced sweetness |
| Affinity | Moderate (50.45) | Balanced | Clarity, balanced acidity |

### Usage in Experiments

When logging an experiment, mineral additions are recorded as:
- Reference to a mineral profile (optional)
- Dose description (free text, e.g., "2 drops", "5 drops post-brew")
- Timing (pre-brew in water, or post-brew in cup)

See brew-tracking.md for the `mineral_additions` field on experiments.

### Database Schema

```sql
CREATE TABLE mineral_profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id), -- NULL for system profiles
    name VARCHAR(100) NOT NULL,
    brand VARCHAR(100),
    description TEXT,
    hardness DECIMAL(6,2),
    alkalinity DECIMAL(6,2),
    magnesium DECIMAL(6,2),
    calcium DECIMAL(6,2),
    potassium DECIMAL(6,2),
    sodium DECIMAL(6,2),
    chloride DECIMAL(6,2),
    sulfate DECIMAL(6,2),
    bicarbonate DECIMAL(6,2),
    typical_dose VARCHAR(100),
    taste_effects TEXT,
    is_system BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

---

## API Endpoints

### List Profiles
```
GET /api/v1/mineral-profiles
```

**Query Parameters:**
- `include_system`: Include system profiles (default: true)

**Response:**
```json
{
  "data": [
    {
      "id": "uuid",
      "name": "Catalyst",
      "brand": "Lotus Coffee Products",
      "description": "Higher hardness mineral concentrate",
      "hardness": 70.9,
      "alkalinity": 15.0,
      "magnesium": 12.2,
      "calcium": 8.2,
      "potassium": 14.3,
      "sodium": 3.9,
      "chloride": 58.7,
      "bicarbonate": 18.3,
      "typical_dose": "2 drops per cup",
      "taste_effects": "Increased body, enhanced sweetness",
      "is_system": true,
      "created_at": "2026-01-01T00:00:00Z"
    }
  ]
}
```

### Create Profile
```
POST /api/v1/mineral-profiles
```

**Request:**
```json
{
  "name": "Third Wave Water",
  "brand": "Third Wave Water",
  "description": "Mineral packets for brewing",
  "hardness": 50.0,
  "alkalinity": 40.0,
  "magnesium": 10.0,
  "calcium": 5.0,
  "typical_dose": "1 packet per gallon",
  "taste_effects": "Balanced, good clarity"
}
```

**Response:** `201 Created` with profile object

### Get Profile
```
GET /api/v1/mineral-profiles/:id
```

**Response:** Full profile object

### Update Profile
```
PUT /api/v1/mineral-profiles/:id
```

Only user-created profiles (is_system=false) can be updated.
System profiles return `403 Forbidden`.

### Delete Profile
```
DELETE /api/v1/mineral-profiles/:id
```

Only user-created profiles can be deleted.
System profiles return `403 Forbidden`.

**Response:** `204 No Content`

---

## User Interface

### User Stories

1. **View Profiles**: As a user, I can see all available mineral profiles
2. **Add Profile**: As a user, I can add a new mineral product I own
3. **Edit Profile**: As a user, I can update profile details
4. **Select in Experiment**: As a user, I can select a profile when logging mineral additions
5. **Compare Profiles**: As a user, I can see profile characteristics side-by-side

### Profile List View

**Layout:**
```
┌─────────────────────────────────────────────────────────┐
│ Mineral Profiles                          [Add Profile] │
├─────────────────────────────────────────────────────────┤
│                                                         │
│ ┌─────────────────────────────────────────────────────┐ │
│ │ Catalyst                                    [System] │ │
│ │ Lotus Coffee Products                               │ │
│ │ Hardness: 70.9 ppm · Mg: 12.2 · Ca: 8.2           │ │
│ │ → Increased body, enhanced sweetness                │ │
│ │                                      [View Details] │ │
│ └─────────────────────────────────────────────────────┘ │
│                                                         │
│ ┌─────────────────────────────────────────────────────┐ │
│ │ Affinity                                    [System] │ │
│ │ Lotus Coffee Products                               │ │
│ │ Hardness: 50.45 ppm · Mg: 12.25                    │ │
│ │ → Clarity, balanced acidity                         │ │
│ │                                      [View Details] │ │
│ └─────────────────────────────────────────────────────┘ │
│                                                         │
│ ┌─────────────────────────────────────────────────────┐ │
│ │ Third Wave Water                              [Edit] │ │
│ │ Third Wave Water                                    │ │
│ │ Hardness: 50 ppm                                    │ │
│ │ → Balanced, good clarity                            │ │
│ │                          [View Details] [Delete]    │ │
│ └─────────────────────────────────────────────────────┘ │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### Profile Detail View

**Layout:**
```
┌─────────────────────────────────────────────────────────┐
│ ← Back to Profiles                                      │
│                                                         │
│ Catalyst                                   [System Tag] │
│ Lotus Coffee Products                                   │
├─────────────────────────────────────────────────────────┤
│                                                         │
│ Description                                             │
│ Higher hardness mineral concentrate for enhanced body   │
│                                                         │
│ ─── Chemical Composition ───                            │
│                                                         │
│ ┌─────────────────┬─────────────────┐                   │
│ │ Hardness        │ 70.9 ppm        │                   │
│ │ Alkalinity      │ 15 ppm          │                   │
│ │ Magnesium       │ 12.2 mg/L       │                   │
│ │ Calcium         │ 8.2 mg/L        │                   │
│ │ Potassium       │ 14.3 mg/L       │                   │
│ │ Sodium          │ 3.9 mg/L        │                   │
│ │ Chloride        │ 58.7 mg/L       │                   │
│ │ Bicarbonate     │ 18.3 mg/L       │                   │
│ └─────────────────┴─────────────────┘                   │
│                                                         │
│ ─── Usage ───                                           │
│                                                         │
│ Typical Dose: 2 drops per cup                           │
│                                                         │
│ Expected Effects:                                       │
│ Increased body, enhanced sweetness                      │
│                                                         │
│ ─── Usage in Experiments ───                            │
│                                                         │
│ Used in 12 experiments                                  │
│ [View Experiments Using This Profile]                   │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### Add/Edit Profile Form

**Layout:**
```
┌─────────────────────────────────────────────────────────┐
│ Add Mineral Profile                                     │
├─────────────────────────────────────────────────────────┤
│                                                         │
│ Name*            [________________________]             │
│ Brand            [________________________]             │
│                                                         │
│ Description                                             │
│ [                                                  ]    │
│ [                                                  ]    │
│                                                         │
│ ─── Chemical Composition (all optional) ───             │
│                                                         │
│ Hardness (ppm)      [______]                            │
│ Alkalinity (ppm)    [______]                            │
│ Magnesium (mg/L)    [______]                            │
│ Calcium (mg/L)      [______]                            │
│ Potassium (mg/L)    [______]                            │
│ Sodium (mg/L)       [______]                            │
│ Chloride (mg/L)     [______]                            │
│ Sulfate (mg/L)      [______]                            │
│ Bicarbonate (mg/L)  [______]                            │
│                                                         │
│ ─── Usage Information ───                               │
│                                                         │
│ Typical Dose       [________________________]           │
│                    (e.g., "2 drops per cup")            │
│                                                         │
│ Taste Effects      [________________________]           │
│                    (e.g., "Enhanced body, sweetness")   │
│                                                         │
│                [Cancel]  [Save Profile]                 │
└─────────────────────────────────────────────────────────┘
```

### Profile Selection in Experiment

In the Post-Brew Variables section of experiment entry:

```
│ ─── Post-Brew Variables ───                             │
│                                                         │
│ Mineral Additions                                       │
│ Profile:  [Catalyst               ▼]                    │
│ Amount:   [2 drops                  ]                   │
│ Timing:   [○ Pre-brew  ● Post-brew]                     │
│                                                         │
```

---

## Design Decisions

### Separate Entity from Experiments

Mineral profiles are a standalone entity because:
- Profile details are reused across many experiments
- Chemical composition rarely changes (product-specific)
- Enables comparison of profile effects
- Clean separation of reference data and experiment data

### Free-Text Dose Recording

Dose is recorded as free text rather than structured drops/mL because:
- Different products have different drop sizes
- Users may add varying amounts
- "2 drops Catalyst" is natural description
- Precise measurements rarely available

### Optional Chemical Details

Not all fields are required:
- Users may not know full composition
- Allows partial profiles
- Commercial products may not disclose everything

### No Water Base Profile

The system tracks mineral *additions*, not base water chemistry:
- Base water varies by location/filter
- Tracking additions is what changes between experiments
- Full water chemistry tracking adds significant complexity
- Future enhancement could add base water profiles

### Profile as Reference Data

Profiles are relatively static reference data:
- Users add products they own
- Chemical composition doesn't change
- System can ship with common profiles predefined

### System vs User Profiles

`is_system` flag distinguishes:
- Predefined profiles (Catalyst, Affinity) that ship with the app
- User-created profiles for products they own
- System profiles cannot be modified or deleted

---

## Open Questions

1. **Third-Party Profiles**: Include database of common commercial products?
2. **Custom Blends**: Support for DIY mineral recipes (from scratch)?
3. **Correlation Analysis**: Show correlations between mineral additions and taste outcomes?
4. **Base Water**: Should base water chemistry be trackable separately?
5. **Profile Comparison**: Side-by-side comparison view for choosing which profile to use?
