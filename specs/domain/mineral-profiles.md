# Mineral Profiles

## Context

Water chemistry significantly affects coffee extraction and taste. Mineral modifiers are concentrated solutions that adjust water composition. This specification defines how mineral profiles are represented and used in the application.

The user's current data includes two specific products:
- **Catalyst**: Higher hardness, emphasizes body and sweetness
- **Affinity**: Balanced profile, emphasizes clarity and acidity

## Requirements

### Mineral Profile Fields

| Field | Type | Unit | Description |
|-------|------|------|-------------|
| id | UUID | — | Unique identifier |
| name | string | — | Profile name (e.g., "Catalyst", "Affinity") |
| brand | string | — | Product brand/manufacturer |
| description | text | — | General description of effects |
| hardness | decimal | ppm | Total hardness (as CaCO3) |
| alkalinity | decimal | ppm | Total alkalinity (as CaCO3) |
| magnesium | decimal | mg/L | Mg concentration |
| calcium | decimal | mg/L | Ca concentration |
| potassium | decimal | mg/L | K concentration |
| sodium | decimal | mg/L | Na concentration |
| chloride | decimal | mg/L | Cl concentration |
| sulfate | decimal | mg/L | SO4 concentration |
| bicarbonate | decimal | mg/L | HCO3 concentration |
| typical_dose | string | — | Usage instructions (e.g., "2 drops per cup") |
| taste_effects | text | — | Expected taste impact |
| created_at | timestamp | — | Record creation time |
| updated_at | timestamp | — | Last modification time |

### Predefined Profiles

Based on user's current products:

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
```

### Usage in Experiments

When logging an experiment, mineral additions are recorded as:
- Reference to a mineral profile (optional)
- Dose description (free text, e.g., "2 drops", "5 drops post-brew")
- Timing (pre-brew in water, or post-brew in cup)

### Profile Characteristics

| Profile | Hardness | Key Property | Expected Effect |
|---------|----------|--------------|-----------------|
| Catalyst | Higher (70.9) | More Mg+Ca | Increased body, enhanced sweetness |
| Affinity | Moderate (50.45) | Balanced | Clarity, balanced acidity |

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

## Open Questions

1. **Third-Party Profiles**: Include database of common commercial products?
2. **Custom Blends**: Support for DIY mineral recipes (from scratch)?
3. **Correlation Analysis**: Show correlations between mineral additions and taste outcomes?
4. **Base Water**: Should base water chemistry be trackable separately?
