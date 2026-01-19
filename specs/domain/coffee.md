# Coffee Entity

## Context

The Coffee entity represents metadata about a bag of coffee beans, separate from individual brewing experiments. This separation allows:
- Reusing coffee metadata across multiple experiments
- Tracking how a coffee's taste profile evolves over days off roast
- Viewing brew history for a specific coffee

## Requirements

### Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| id | UUID | Auto | Unique identifier |
| roaster | string | Yes | Company/person who roasted the beans |
| name | string | Yes | Coffee name (farm, blend name, etc.) |
| country | string | No | Origin country |
| region | string | No | Specific region within country |
| process | string | No | Processing method (Washed, Natural, Honey, etc.) |
| roast_level | enum | No | Light, Medium, Medium-Dark, Dark |
| tasting_notes | string | No | Roaster's described flavor notes |
| roast_date | date | No | Date the coffee was roasted |
| purchase_date | date | No | Date acquired |
| notes | text | No | Personal notes about this coffee |
| created_at | timestamp | Auto | Record creation time |
| updated_at | timestamp | Auto | Last modification time |

### Validation Rules

1. `roaster` and `name` together should be treated as a logical identifier (not enforced unique, but used for display)
2. `roast_date` cannot be in the future
3. `purchase_date` cannot be before `roast_date` if both are provided
4. `process` is free-text but UI may suggest common values:
   - Washed
   - Natural
   - Honey (Yellow, Red, Black)
   - Anaerobic
   - Carbonic Maceration
   - Wet-hulled

### Relationships

- **One-to-Many with Experiment**: A coffee can have many experiments; each experiment references exactly one coffee
- Deleting a coffee should be blocked if experiments reference it, or require explicit cascade decision

### Computed Properties

- **Days Since Roast**: `current_date - roast_date` (if roast_date provided)
- **Experiment Count**: Number of experiments using this coffee
- **Last Brewed**: Most recent experiment date for this coffee

## Design Decisions

### Roaster as Free Text

Roaster is stored as free-text rather than a separate entity because:
- Users may have one-off coffees from various sources
- Autocomplete from existing values provides sufficient convenience
- Avoids complexity of managing a roaster entity

### Process as Free Text with Suggestions

Processing methods evolve and vary regionally. Free text with UI suggestions balances:
- Flexibility to enter any process type
- Consistency through autocomplete of previously used values

### No Bag/Inventory Tracking

The system tracks coffee metadata, not inventory levels. Users manually decide when a coffee is "finished" by simply not creating new experiments for it.

## Open Questions

1. **Archiving**: Should coffees be archivable/hideable when finished, or just filtered by recency?
2. **Image Upload**: Would coffee bag photos be valuable? Adds storage complexity.
