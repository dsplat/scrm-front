import { useQuery, useMutation, useQueryClient } from '@tanstack/vue-query'
import { http } from '@scrm/shared'

export function useCustomers(params?: { page?: number; channel?: string; tag?: string }) {
  return useQuery({
    queryKey: ['customers', params],
    queryFn: () => http.get('/scrm/customers', { params }),
  })
}

export function useCustomer(id: number) {
  return useQuery({
    queryKey: ['customer', id],
    queryFn: () => http.get(`/scrm/customers/${id}`),
    enabled: !!id,
  })
}

export function useCustomerGroups() {
  return useQuery({
    queryKey: ['customer-groups'],
    queryFn: () => http.get('/scrm/customer-groups'),
  })
}

export function useCreateCustomer() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: Record<string, unknown>) => http.post('/scrm/customers', data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['customers'] }),
  })
}
