# Sessions

## Overview

Sessions group related brews within a single coffee to encode deliberate variable testing. A session captures what you changed, what you expected, and what you learned.

**Key capabilities:**
- Group 2+ brews that test the same variable(s)
- Record hypothesis before brewing and conclusion after
- Retroactive grouping — create sessions from existing brews
- Upfront creation — plan a session, then brew into it

**Dependencies:** coffees, brew-tracking

---

## Entity: Session

### Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| id | UUID | Auto | Unique identifier |
| user_id | UUID | Auto | Owner (from auth) |
| coffee_id | UUID | Yes | FK to coffee — sessions are per-coffee |
| name | string | Yes | Descriptive name (e.g., "Grind size sweep") |
| variable_tested | string | Yes | What variable(s) were changed (e.g., "grind size", "water temperature") |
| hypothesis | text | No | What you expected to happen |
| conclusion | text | No | What you learned / what actually happened |
| created_at | timestamp | Auto | Record creation time |
| updated_at | timestamp | Auto | Last modification time |

### Validation Rules

1. `name` required, max 255 characters
2. `variable_tested` required, max 255 characters
3. `coffee_id` must reference an existing, non-deleted coffee owned by the user
4. A session must have at least 1 brew linked (enforced at UI level, not DB)

### Relationships

- **Many-to-One with Coffee**: Each session belongs to one coffee
- **Many-to-Many with Brew**: Sessions link to brews via `session_brews` join table
- A brew can belong to multiple sessions
- Deleting a session does NOT delete its brews (only removes the grouping)
- Deleting a brew removes it from all sessions (cascade on join table)

### Database Schema

```sql
CREATE TABLE sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id),
    coffee_id UUID NOT NULL REFERENCES coffees(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    variable_tested VARCHAR(255) NOT NULL,
    hypothesis TEXT,
    conclusion TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE session_brews (
    session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
    brew_id UUID NOT NULL REFERENCES brews(id) ON DELETE CASCADE,
    PRIMARY KEY (session_id, brew_id)
);

CREATE INDEX idx_sessions_user_id ON sessions(user_id);
CREATE INDEX idx_sessions_coffee_id ON sessions(coffee_id);
CREATE INDEX idx_session_brews_brew_id ON session_brews(brew_id);
```

---

## API Endpoints

### List Sessions

```
GET /api/v1/sessions
```

**Query Parameters:**
- `coffee_id` (required): Filter by coffee
- `page`, `per_page`: Pagination

**Default sort:** `-created_at` (newest first)

**Response:**
```json
{
  "items": [
    {
      "id": "uuid",
      "coffee_id": "uuid",
      "name": "Grind size sweep",
      "variable_tested": "grind size",
      "hypothesis": "Finer grind will increase sweetness",
      "conclusion": "Confirmed — 3.0 was noticeably sweeter than 4.0",
      "brew_count": 3,
      "created_at": "2026-01-20T10:00:00Z",
      "updated_at": "2026-01-22T14:30:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "per_page": 20,
    "total": 4,
    "total_pages": 1
  }
}
```

Note: `brew_count` is computed via subquery on `session_brews`.

### Create Session

```
POST /api/v1/sessions
```

**Request:**
```json
{
  "coffee_id": "uuid",
  "name": "Grind size sweep",
  "variable_tested": "grind size",
  "hypothesis": "Finer grind will increase sweetness",
  "brew_ids": ["uuid1", "uuid2"]
}
```

- `brew_ids` is optional — allows linking existing brews at creation time
- All referenced brews must belong to the same coffee as the session

**Response:** `201 Created` with session object including linked brews

### Get Session

```
GET /api/v1/sessions/:id
```

**Response:**
```json
{
  "id": "uuid",
  "coffee_id": "uuid",
  "name": "Grind size sweep",
  "variable_tested": "grind size",
  "hypothesis": "Finer grind will increase sweetness",
  "conclusion": "Confirmed — 3.0 was noticeably sweeter than 4.0",
  "brews": [
    {
      "id": "uuid1",
      "brew_date": "2026-01-20T10:00:00Z",
      "grind_size": 4.0,
      "overall_score": 6,
      "overall_notes": "Thin, under-extracted"
    },
    {
      "id": "uuid2",
      "brew_date": "2026-01-20T10:30:00Z",
      "grind_size": 3.5,
      "overall_score": 7,
      "overall_notes": "Better body, more sweetness"
    },
    {
      "id": "uuid3",
      "brew_date": "2026-01-20T11:00:00Z",
      "grind_size": 3.0,
      "overall_score": 8,
      "overall_notes": "Best balance, clear sweetness"
    }
  ],
  "created_at": "2026-01-20T10:00:00Z",
  "updated_at": "2026-01-22T14:30:00Z"
}
```

Brews are returned in `brew_date` order (oldest first) to show the progression.

### Update Session

```
PUT /api/v1/sessions/:id
```

**Request:**
```json
{
  "name": "Grind size sweep (3.0-4.0)",
  "variable_tested": "grind size",
  "hypothesis": "Finer grind will increase sweetness",
  "conclusion": "Confirmed — 3.0 was noticeably sweeter than 4.0"
}
```

Updates metadata only. Use the link/unlink endpoints to modify brew membership.

**Response:** `200 OK` with updated session object

### Delete Session

```
DELETE /api/v1/sessions/:id
```

Deletes the session and all join table entries. Does NOT delete brews.

**Response:** `204 No Content`

### Link Brews to Session

```
POST /api/v1/sessions/:id/brews
```

**Request:**
```json
{
  "brew_ids": ["uuid3", "uuid4"]
}
```

- Brews must belong to the same coffee as the session
- Duplicates are silently ignored (idempotent)

**Response:** `200 OK` with updated session object

### Unlink Brew from Session

```
DELETE /api/v1/sessions/:id/brews/:brew_id
```

Removes the brew from the session without deleting it.

**Response:** `204 No Content`

---

## User Interface

### Sessions on Coffee Detail Page

Sessions appear as a section on the coffee detail page, between Target Goals and Brew History:

```
+-----------------------------------------------------+
| --- Sessions ---                      [+ New Session]|
|                                                     |
| +---------------------------------------------+    |
| | Grind size sweep              3 brews        |    |
| | Variable: grind size                         |    |
| | "Finer grind will increase sweetness"        |    |
| | Conclusion: Confirmed — 3.0 was noticeably...|    |
| |                         [View] [Edit] [Delete]|    |
| +---------------------------------------------+    |
|                                                     |
| +---------------------------------------------+    |
| | Temperature range test        2 brews        |    |
| | Variable: water temperature                  |    |
| | "Higher temp = more brightness"              |    |
| | Conclusion: Not yet recorded                 |    |
| |                         [View] [Edit] [Delete]|    |
| +---------------------------------------------+    |
|                                                     |
| No more sessions.                                   |
+-----------------------------------------------------+
```

### Create Session Dialog

Opened from the [+ New Session] button on coffee detail:

```
+---------------------------------------+
| New Session                      [x]  |
+---------------------------------------+
| Name*            [________________]   |
| Variable Tested* [________________]   |
| Hypothesis       [                ]   |
|                  [                ]   |
|                                       |
| --- Link Brews ---                    |
| Select brews to include:             |
|                                       |
| [x] Jan 20 - 3.0 grind - Score 8    |
| [x] Jan 20 - 3.5 grind - Score 7    |
| [x] Jan 20 - 4.0 grind - Score 6    |
| [ ] Jan 18 - 3.5 grind - Score 7    |
| [ ] Jan 15 - 3.5 grind - Score 8    |
|                                       |
|         [Cancel]  [Create Session]    |
+---------------------------------------+
```

- Shows all brews for this coffee (most recent first)
- Checkboxes to select which brews belong to the session
- At least 1 brew should be selected (UI validation)

### Session Detail View

Opened from [View] button on a session card. Displayed as a dialog/modal:

```
+-----------------------------------------------------+
| Grind size sweep                               [x]   |
| Variable: grind size - 3 brews                       |
+-----------------------------------------------------+
| Hypothesis                                           |
| "Finer grind will increase sweetness"                |
|                                                     |
| --- Brews ---                                        |
| +----------+-------+-------+-------+-------+        |
| | Date     | Grind | Score | Sweet | Notes |        |
| +----------+-------+-------+-------+-------+        |
| | Jan 20   | 4.0   | 6     | 4     | Thin  |        |
| | Jan 20   | 3.5   | 7     | 6     | Better|        |
| | Jan 20   | 3.0   | 8     | 8     | Best  |        |
| +----------+-------+-------+-------+-------+        |
|                                                     |
| --- Conclusion ---                           [Edit]  |
| "Confirmed — 3.0 was noticeably sweeter than 4.0.   |
| Going forward, use 3.0-3.2 range for this coffee."  |
|                                                     |
| [+ Add Brews]                [Edit Session] [Delete] |
+-----------------------------------------------------+
```

**Dynamic columns:** The brews table highlights the tested variable column (e.g., "Grind" when `variable_tested` is "grind size").

### Edit Session

Same dialog as Create, but pre-populated with existing values. Brew linking is managed separately via the [+ Add Brews] action in the detail view.

### Empty State

When a coffee has no sessions:

```
| --- Sessions ---                      [+ New Session]|
|                                                     |
| No sessions yet. Create a session to group          |
| brews and track what you learn from                 |
| testing different variables.                        |
```

---

## Workflow

### Upfront Session Creation

1. User is about to test a variable (e.g., grind size)
2. Goes to coffee detail → [+ New Session]
3. Fills in name, variable, hypothesis
4. Optionally links existing brews
5. Brews new brews (from coffee detail [+ New Brew])
6. Returns to session → [+ Add Brews] to link new brews
7. Writes conclusion after evaluating results

### Retroactive Grouping

1. User has already brewed several brews varying a parameter
2. Goes to coffee detail → [+ New Session]
3. Fills in name, variable, hypothesis
4. Selects the relevant brews from the list
5. Writes conclusion based on what they observed

Both workflows converge — the session captures the same structured learning either way.

---

## Design Decisions

### Per-Coffee Only

Sessions are scoped to a single coffee because:
- Variable testing is meaningful when other factors are held constant (same beans)
- Cross-coffee variable testing introduces too many confounding variables
- Keeps the data model and UI simple
- Dashboard handles cross-coffee pattern discovery

### Many-to-Many Join Table

Brews link to sessions via a join table because:
- A brew can participate in multiple sessions (e.g., testing grind AND temperature)
- Clean separation — sessions don't own brews
- Deleting a session doesn't affect brews
- Easy to add/remove brews from sessions

### Variable + Hypothesis + Conclusion

This triple captures the scientific method in minimal form:
- **Variable**: What you changed (structured enough to be useful, free-text for flexibility)
- **Hypothesis**: What you expected (optional — some sessions are exploratory)
- **Conclusion**: What you learned (the primary value — often filled in after all brews)

### No Session Status/State

Sessions don't have an explicit "open/closed" status because:
- Conclusion being empty effectively means "in progress"
- Users can always add more brews or update the conclusion
- Avoids workflow ceremony — sessions are lightweight documentation

---

## Open Questions

1. **Session Templates**: Pre-built session templates for common variables (grind sweep, temp sweep)?
2. **Auto-Suggest Sessions**: Detect when user brews multiple brews with one variable changed and suggest creating a session?
3. **Session Comparison**: Compare two sessions side-by-side (e.g., grind sweep at two different temperatures)?
