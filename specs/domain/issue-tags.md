# Issue Tags

## Context

Issue tags are standardized labels for common problems or characteristics in a brew. They serve two purposes:
1. Quickly annotate experiments with identified issues
2. Trigger rule matching for recommendations

Tags are primarily predefined (for consistency and rule matching) but users can create custom tags.

## Requirements

### Predefined Tags

Organized by category for UI presentation.

#### Extraction Issues
| Tag | Description |
|-----|-------------|
| `under_extracted` | General under-extraction (sour, thin, lacking sweetness) |
| `over_extracted` | General over-extraction (bitter, astringent, harsh) |
| `channeling` | Uneven extraction, likely from channeling |
| `uneven_extraction` | Some notes underdeveloped, others overdeveloped |

#### Taste Balance
| Tag | Description |
|-----|-------------|
| `too_acidic` | Acidity overpowering or unpleasant |
| `too_bitter` | Bitterness overpowering or harsh |
| `too_sweet` | Sweetness cloying (rare) |
| `lacks_acidity` | Flat, missing brightness |
| `lacks_sweetness` | Missing sweetness development |
| `lacks_body` | Thin, watery mouthfeel |
| `too_heavy` | Overly thick, muddy body |

#### Flavor Issues
| Tag | Description |
|-----|-------------|
| `muted_flavors` | Overall flavor intensity too low |
| `harsh_flavors` | Unpleasant harshness in taste |
| `off_flavors` | Unexpected negative flavors |
| `vegetal` | Green, grassy, unripe notes |
| `papery` | Filter paper taste |
| `stale` | Flat, cardboard-like (often old coffee) |

#### Temperature Issues
| Tag | Description |
|-----|-------------|
| `too_hot` | Serving temperature too high, burns palate |
| `cooled_poorly` | Taste degraded as it cooled |
| `better_when_cooled` | Improved as it cooled (informational) |

#### Process Issues
| Tag | Description |
|-----|-------------|
| `slow_drawdown` | Drawdown time too long |
| `fast_drawdown` | Drawdown time too short |
| `inconsistent` | Results vary between similar attempts |

### Custom Tags

Users can create custom tags with:
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| name | string | Yes | Tag identifier (lowercase, underscores) |
| display_name | string | Yes | Human-readable name |
| description | text | No | What this tag means |
| category | string | No | Grouping category |

### Tag-to-Outcome Mapping

Some tags map to specific outcome variables, enabling correlation analysis.

| Tag | Related Outcome Variables |
|-----|---------------------------|
| `too_acidic` | acidity_intensity |
| `lacks_acidity` | acidity_intensity |
| `too_bitter` | bitterness_intensity |
| `lacks_sweetness` | sweetness_intensity |
| `lacks_body` | body_weight |
| `too_heavy` | body_weight |
| `muted_flavors` | aroma_intensity, overall_score |
| `under_extracted` | extraction_yield, tds |
| `over_extracted` | extraction_yield, tds |

## Design Decisions

### Predefined over Free-Form

Predefined tags chosen over free-form because:
- Consistent vocabulary enables rule matching
- Reduces cognitive load when tagging
- Enables meaningful aggregation
- Custom tags available for edge cases

### Tag Format

Tags use `snake_case` for:
- URL/query-string friendliness
- Code compatibility
- Unambiguous parsing

UI displays human-readable `display_name`.

### Categories for Organization

Categories group related tags in the UI but have no functional meaning. Users select from a flat list; categories just aid discovery.

### Multiple Tags per Experiment

An experiment can have any number of issue tags:
- Brews often have multiple issues
- Allows nuanced description
- All matching rules surface

### Informational Tags

Some tags like `better_when_cooled` are informational rather than "issues":
- Captures useful observations
- Can trigger positive recommendations
- Keeps tag system flexible

## Open Questions

1. **Tag Deprecation**: How to handle removing predefined tags if they prove unhelpful?
2. **Tag Synonyms**: Should common misspellings or alternatives map to canonical tags?
3. **Tag Frequency Analysis**: Show which tags appear most often?
