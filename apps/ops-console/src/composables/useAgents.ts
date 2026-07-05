import { useQuery, useMutation, useQueryClient } from '@tanstack/vue-query'
import { http } from '@scrm/shared'

export function useAgents() {
  return useQuery({
    queryKey: ['agents'],
    queryFn: () => http.get('/scrm/agents'),
  })
}

export function useAgent(id: number) {
  return useQuery({
    queryKey: ['agent', id],
    queryFn: () => http.get(`/scrm/agents/${id}`),
    enabled: !!id,
  })
}

export function useAgentConversations(agentId: number) {
  return useQuery({
    queryKey: ['agent-conversations', agentId],
    queryFn: () => http.get(`/scrm/agents/${agentId}/conversations`),
    enabled: !!agentId,
  })
}

export function useTriggerAgent() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ agentId, task }: { agentId: number; task: string }) =>
      http.post(`/scrm/agents/${agentId}/trigger`, { task }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['agents'] }),
  })
}
