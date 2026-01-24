import { useState, useCallback } from "react"
import { api, type Experiment, type TryMappingInput } from "@/lib/api"

interface UseRecommendationMutationsResult {
  dismissMapping: (
    experimentId: string,
    mappingId: string
  ) => Promise<void>
  undoDismissMapping: (
    experimentId: string,
    mappingId: string
  ) => Promise<void>
  tryMapping: (
    experimentId: string,
    input: TryMappingInput
  ) => Promise<Experiment>
  isDismissing: boolean
  isUndoing: boolean
  isTrying: boolean
  error: string | null
  clearError: () => void
}

export function useRecommendationMutations(): UseRecommendationMutationsResult {
  const [isDismissing, setIsDismissing] = useState(false)
  const [isUndoing, setIsUndoing] = useState(false)
  const [isTrying, setIsTrying] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const dismissMapping = useCallback(
    async (experimentId: string, mappingId: string): Promise<void> => {
      setIsDismissing(true)
      setError(null)
      try {
        await api.dismissMapping(experimentId, mappingId)
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Failed to dismiss mapping"
        setError(message)
        throw err
      } finally {
        setIsDismissing(false)
      }
    },
    []
  )

  const undoDismissMapping = useCallback(
    async (experimentId: string, mappingId: string): Promise<void> => {
      setIsUndoing(true)
      setError(null)
      try {
        await api.undoDismissMapping(experimentId, mappingId)
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Failed to undo dismissal"
        setError(message)
        throw err
      } finally {
        setIsUndoing(false)
      }
    },
    []
  )

  const tryMapping = useCallback(
    async (
      experimentId: string,
      input: TryMappingInput
    ): Promise<Experiment> => {
      setIsTrying(true)
      setError(null)
      try {
        const response = await api.tryMapping(experimentId, input)
        return response.data
      } catch (err) {
        const message =
          err instanceof Error
            ? err.message
            : "Failed to create experiment from mapping"
        setError(message)
        throw err
      } finally {
        setIsTrying(false)
      }
    },
    []
  )

  const clearError = useCallback(() => setError(null), [])

  return {
    dismissMapping,
    undoDismissMapping,
    tryMapping,
    isDismissing,
    isUndoing,
    isTrying,
    error,
    clearError,
  }
}
