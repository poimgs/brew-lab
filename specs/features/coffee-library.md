# Coffee Library

## Overview

The Coffee Library is where users manage their coffee bean inventory metadata. It serves as a reference for experiments—each brew references a coffee from the library. This separation enables:
- Viewing all experiments for a specific coffee
- Tracking how a coffee tastes over its lifetime (days off roast)
- Avoiding repetitive metadata entry per experiment
- Reusing coffee metadata across multiple experiments

---

## Entity: Coffee

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

### Database Schema

```sql
CREATE TABLE coffees (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id),
    roaster VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    country VARCHAR(100),
    region VARCHAR(255),
    process VARCHAR(100),
    roast_level VARCHAR(50),
    tasting_notes TEXT,
    roast_date DATE,
    purchase_date DATE,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_coffees_user_id ON coffees(user_id);
CREATE INDEX idx_coffees_roaster ON coffees(roaster);
CREATE INDEX idx_coffees_roast_date ON coffees(roast_date);
```

---

## API Endpoints

### List Coffees
```
GET /api/v1/coffees
```

**Query Parameters:**
- `page`, `per_page`: Pagination
- `sort`: Field name, `-` prefix for descending (default: `-created_at`)
- `filter[roaster]`: Filter by roaster name
- `filter[country]`: Filter by country
- `filter[process]`: Filter by process
- `search`: Search roaster and name fields

**Response:**
```json
{
  "data": [
    {
      "id": "uuid",
      "roaster": "Cata Coffee",
      "name": "Kiamaina",
      "country": "Kenya",
      "region": "Nyeri",
      "process": "Washed",
      "roast_level": "Light",
      "tasting_notes": "Apricot Nectar, Lemon Sorbet, Raw Honey",
      "roast_date": "2025-11-19",
      "purchase_date": "2025-11-22",
      "notes": "Best around 3-4 weeks off roast",
      "days_since_roast": 61,
      "experiment_count": 8,
      "last_brewed": "2026-01-19T10:30:00Z",
      "created_at": "2025-11-22T15:00:00Z",
      "updated_at": "2025-11-22T15:00:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "per_page": 20,
    "total": 12,
    "total_pages": 1
  }
}
```

### Create Coffee
```
POST /api/v1/coffees
```

**Request:**
```json
{
  "roaster": "Cata Coffee",
  "name": "Kiamaina",
  "country": "Kenya",
  "region": "Nyeri",
  "process": "Washed",
  "roast_level": "Light",
  "tasting_notes": "Apricot Nectar, Lemon Sorbet, Raw Honey",
  "roast_date": "2025-11-19",
  "purchase_date": "2025-11-22",
  "notes": "Best around 3-4 weeks off roast"
}
```

**Response:** `201 Created` with coffee object

### Get Coffee
```
GET /api/v1/coffees/:id
```

**Response:** Coffee object with computed properties

### Update Coffee
```
PUT /api/v1/coffees/:id
```

**Request:** Full coffee object (partial updates via PATCH)

**Response:** Updated coffee object

### Delete Coffee
```
DELETE /api/v1/coffees/:id
```

**Behavior:**
- If coffee has experiments: `409 Conflict` with error message
- If no experiments: `204 No Content`

**Force Delete (with experiments):**
```
DELETE /api/v1/coffees/:id?cascade=true
```
Deletes coffee and all associated experiments.

### Get Coffee Experiments
```
GET /api/v1/coffees/:id/experiments
```

Returns paginated experiments for this coffee. Supports same filters as `/api/v1/experiments`.

### Autocomplete Suggestions
```
GET /api/v1/coffees/suggestions?field=roaster&q=cat
```

Returns distinct values for autocomplete:
```json
{
  "data": ["Cata Coffee", "Catalyst Roasters"]
}
```

Supported fields: `roaster`, `country`, `process`

---

## User Interface

### User Stories

1. **Add Coffee**: As a user, I can add a new coffee to my library with its metadata
2. **Edit Coffee**: As a user, I can update coffee details (e.g., add notes after tasting)
3. **View Coffee List**: As a user, I can see all my coffees and find ones I want to brew
4. **View Coffee Detail**: As a user, I can see a coffee's full details and brew history
5. **Delete Coffee**: As a user, I can remove coffees I'm done with (if no experiments)
6. **Filter/Search**: As a user, I can find coffees by roaster, origin, or name

### Coffee List View

**Display Columns:**
- Roaster
- Name
- Country
- Process
- Roast Date
- Days Since Roast (calculated)
- Experiment Count
- Last Brewed

**Interactions:**
- Click row → Coffee detail view
- Sort by any column
- Filter by roaster, country, process
- Search by name/roaster
- "Add Coffee" button

**Empty State:**
- Message: "No coffees in your library yet"
- Prominent "Add Your First Coffee" button

### Add/Edit Coffee Form

**Layout:**
```
┌─────────────────────────────────────────┐
│ Add Coffee                              │
├─────────────────────────────────────────┤
│ Roaster*         [________________]     │
│ Name*            [________________]     │
│                                         │
│ ─── Origin ───                          │
│ Country          [________________]     │
│ Region           [________________]     │
│                                         │
│ ─── Details ───                         │
│ Process          [________________]     │
│ Roast Level      [Light ▼        ]     │
│ Tasting Notes    [________________]     │
│                                         │
│ ─── Dates ───                           │
│ Roast Date       [____/____/____]       │
│ Purchase Date    [____/____/____]       │
│                                         │
│ ─── Notes ───                           │
│ Personal Notes   [                ]     │
│                  [                ]     │
│                                         │
│         [Cancel]  [Save Coffee]         │
└─────────────────────────────────────────┘
```

**Field Behavior:**
- Roaster: Autocomplete from existing roasters
- Country: Autocomplete from existing + common list
- Process: Autocomplete from existing + common list
- Roast Level: Dropdown (Light, Medium, Medium-Dark, Dark)
- Roast Date: Date picker, defaults empty
- Tasting Notes: Multi-line text (roaster's notes)
- Personal Notes: Multi-line text (user's notes)

### Coffee Detail View

**Layout:**
```
┌─────────────────────────────────────────┐
│ ← Back to Library                       │
│                                         │
│ Kiamaina                           [Edit]│
│ Cata Coffee · Kenya · Washed            │
│                                         │
│ ┌─────────┬─────────┬─────────────────┐ │
│ │ Roasted │ Days    │ Experiments     │ │
│ │ Nov 19  │ 61      │ 8               │ │
│ └─────────┴─────────┴─────────────────┘ │
│                                         │
│ Tasting Notes                           │
│ Apricot Nectar, Lemon Sorbet, Raw Honey │
│                                         │
│ My Notes                                │
│ Best around 3-4 weeks off roast...      │
│                                         │
│ ─── Brew History ───                    │
│ [Experiment list filtered to this coffee]│
│                                         │
└─────────────────────────────────────────┘
```

**Brew History Section:**
- Shows experiments for this coffee
- Sortable by date, score
- Quick stats: average score, best score, total brews

### Delete Coffee

**Rules:**
- Coffee with 0 experiments: Confirm and delete
- Coffee with experiments: Show warning, require explicit confirmation
- Cascade option: Delete coffee and all its experiments (dangerous)

**Confirmation Dialog:**
```
┌─────────────────────────────────────────┐
│ Delete Coffee?                          │
├─────────────────────────────────────────┤
│ "Kiamaina" by Cata Coffee has 8         │
│ experiments. Deleting will also remove  │
│ all experiment data.                    │
│                                         │
│ This cannot be undone.                  │
│                                         │
│    [Cancel]  [Delete Coffee & Brews]    │
└─────────────────────────────────────────┘
```

---

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

### List as Primary View

Coffee list is the primary view (not cards) because:
- Efficient scanning of many coffees
- Easy sorting and filtering
- Consistent with experiment list
- Works well on smaller screens

### Autocomplete over Dropdowns

Free text with autocomplete for roaster, country, process:
- Users have varied coffees from many sources
- Predefined lists would be incomplete
- Autocomplete provides consistency benefits
- No admin needed to maintain lists

### Days Off Roast Prominence

Days off roast shown prominently because:
- Critical variable for coffee freshness
- Helps users choose which coffee to brew
- Changes daily—needs to be calculated

### Personal Notes Separate from Tasting Notes

Two note fields because:
- Tasting notes = roaster's description (reference)
- Personal notes = user's observations (evolving)
- Common pattern: roaster says X, user experiences Y

### No Archive, Just Filter

No explicit archive feature:
- Filter by "has recent experiments" achieves same result
- Simpler data model
- Users can delete truly finished coffees

---

## Open Questions

1. **Archiving**: Should coffees be archivable/hideable when finished, or just filtered by recency?
2. **Image Upload**: Would coffee bag photos be valuable? Adds storage complexity.
3. **Duplicate Detection**: Warn if adding coffee with same roaster+name?
4. **Import**: Support importing coffee list from CSV?
5. **Freshness Indicator**: Visual indicator for coffees past peak freshness?
