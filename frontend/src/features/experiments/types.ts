import type { Coffee } from "@/lib/api"

export interface Experiment {
  id: string
  coffee_id?: string
  brew_date: string
  overall_notes: string
  overall_score?: number
  // Pre-brew
  coffee_weight?: number
  water_weight?: number
  ratio?: number
  grind_size?: string
  water_temperature?: number
  filter_type?: string
  // Brew
  bloom_water?: number
  bloom_time?: number
  pour_1?: string
  pour_2?: string
  pour_3?: string
  total_brew_time?: number
  drawdown_time?: number
  technique_notes?: string
  // Post-brew
  serving_temperature?: number
  water_bypass?: number
  mineral_additions?: string
  // Quantitative
  final_weight?: number
  tds?: number
  extraction_yield?: number
  // Sensory (1-10)
  aroma_intensity?: number
  acidity_intensity?: number
  sweetness_intensity?: number
  bitterness_intensity?: number
  body_weight?: number
  aftertaste_duration?: number
  aftertaste_intensity?: number
  // Notes
  aroma_notes?: string
  flavor_notes?: string
  aftertaste_notes?: string
  improvement_notes?: string
  // Computed
  days_off_roast?: number
  calculated_ratio?: number
  // Nested
  coffee?: Coffee
  issue_tags?: IssueTag[]
  created_at: string
  updated_at: string
}

export interface ExperimentFormData {
  coffee_id?: string
  brew_date?: string
  overall_notes: string
  overall_score?: number
  // Pre-brew
  coffee_weight?: number
  water_weight?: number
  grind_size?: string
  water_temperature?: number
  filter_type?: string
  // Brew
  bloom_water?: number
  bloom_time?: number
  pour_1?: string
  pour_2?: string
  pour_3?: string
  total_brew_time?: number
  drawdown_time?: number
  technique_notes?: string
  // Post-brew
  serving_temperature?: number
  water_bypass?: number
  mineral_additions?: string
  // Quantitative
  final_weight?: number
  tds?: number
  // Sensory (1-10)
  aroma_intensity?: number
  acidity_intensity?: number
  sweetness_intensity?: number
  bitterness_intensity?: number
  body_weight?: number
  aftertaste_duration?: number
  aftertaste_intensity?: number
  // Notes
  aroma_notes?: string
  flavor_notes?: string
  aftertaste_notes?: string
  improvement_notes?: string
  // Tags
  tag_ids?: string[]
}

export interface IssueTag {
  id: string
  name: string
  is_system: boolean
}

export interface UserDefaults {
  [field: string]: string
}

export interface ExperimentListParams {
  page?: number
  page_size?: number
  coffee_id?: string
  min_score?: number
  max_score?: number
  start_date?: string
  end_date?: string
  tag_id?: string
  sort_by?: "brew_date" | "created_at" | "overall_score"
  sort_dir?: "asc" | "desc"
}
