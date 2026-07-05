import { useQuery, useMutation, useQueryClient } from '@tanstack/vue-query'
import { http } from '@scrm/shared'

export function useChannels() {
  return useQuery({
    queryKey: ['channels'],
    queryFn: () => http.get('/channels'),
  })
}

export function useChannel(id: number) {
  return useQuery({
    queryKey: ['channel', id],
    queryFn: () => http.get(`/channels/${id}`),
    enabled: !!id,
  })
}

export function useCreateChannel() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: Record<string, unknown>) => http.post('/channels', data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['channels'] }),
  })
}

export function useTestChannel() {
  return useMutation({
    mutationFn: (id: number) => http.post(`/channels/${id}/test`),
  })
}
