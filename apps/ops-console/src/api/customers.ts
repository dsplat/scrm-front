import { http } from '@scrm/shared'

export async function listCustomers(params?: Record<string, any>) {
  const res = await http.get('/scrm/customers', { params })
  return res.data
}

export async function getCustomer(id: number) {
  const res = await http.get(`/scrm/customers/${id}`)
  return res.data
}

export async function createCustomer(data: Record<string, any>) {
  const res = await http.post('/scrm/customers', data)
  return res.data
}

export async function updateCustomer(id: number, data: Record<string, any>) {
  const res = await http.put(`/scrm/customers/${id}`, data)
  return res.data
}

export async function assignTag(customerId: number, tagIds: number[]) {
  const res = await http.post(`/scrm/customers/${customerId}/tags`, { tag_ids: tagIds })
  return res.data
}

export async function removeTag(customerId: number, tagIds: number[]) {
  const res = await http.delete(`/scrm/customers/${customerId}/tags`, { data: { tag_ids: tagIds } })
  return res.data
}

export async function getCustomerJourney(customerId: number) {
  const res = await http.get(`/scrm/customers/${customerId}/journey`)
  return res.data
}

export async function getCustomerConversations(customerId: number) {
  const res = await http.get(`/scrm/customers/${customerId}/conversations`)
  return res.data
}
