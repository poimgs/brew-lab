# Coffee Library Feature

## Context

The Coffee Library is where users manage their coffee bean inventory metadata. It serves as a reference for experiments—each brew references a coffee from the library. This separation enables:
- Viewing all experiments for a specific coffee
- Tracking how a coffee tastes over its lifetime (days off roast)
- Avoiding repetitive metadata entry per experiment

## Requirements

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

## Design Decisions

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

## Open Questions

1. **Duplicate Detection**: Warn if adding coffee with same roaster+name?
2. **Import**: Support importing coffee list from CSV?
3. **Freshness Indicator**: Visual indicator for coffees past peak freshness?
