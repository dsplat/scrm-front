import { http } from '@scrm/shared'

export async function getOverview() {
  const res = await http.get('/scrm/dashboards/overview')
  return res.data
}

export async function getChannelDashboard() {
  const res = await http.get('/scrm/dashboards/channel')
  return res.data
}

export async function getAiDashboard() {
  const res = await http.get('/scrm/dashboards/ai')
  return res.data
}

export async function getStaffDashboard() {
  const res = await http.get('/scrm/dashboards/staff')
  return res.data
}

export async function exportReport(data: Record<string, any>) {
  const res = await http.post('/scrm/dashboards/export', data, { responseType: 'blob' })
  return res.data
}
