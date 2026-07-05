import { useQuery } from '@tanstack/vue-query'
import { http } from '@scrm/shared'

export function useDashboardOverview() {
  return useQuery({
    queryKey: ['dashboard-overview'],
    queryFn: () => http.get('/scrm/dashboards/overview'),
    refetchInterval: 60_000,
  })
}
