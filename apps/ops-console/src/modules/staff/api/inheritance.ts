import { http, type ApiResponse } from '@scrm/shared'

export interface ResignedEmployee {
  id: number
  name: string
  department: string
  customerCount: number
  assignStatus: 'pending' | 'partial' | 'completed'
  resignedAt: string
}

export interface ResignedEmployeeListParams {
  page: number
  pageSize: number
  name?: string
}

export interface ResignedEmployeeListResult {
  data: ResignedEmployee[]
  total: number
}

export interface InheritanceCustomer {
  id: number
  name: string
  wechatId: string
  avatar: string
  tags: string[]
  lastContactAt: string
}

export interface InheritanceCustomerListParams {
  page: number
  pageSize: number
  employeeId: number
  name?: string
}

export interface InheritanceCustomerListResult {
  data: InheritanceCustomer[]
  total: number
}

export interface AssignCustomersData {
  employeeId: number
  customerIds: number[]
  targetStaffId: number
}

export interface ActiveStaff {
  id: number
  name: string
  department: string
}

export interface AssignmentRecord {
  id: number
  employeeName: string
  customerName: string
  targetStaffName: string
  assignedAt: string
  operatorName: string
}

export interface AssignmentRecordListParams {
  page: number
  pageSize: number
  employeeId?: number
}

export interface AssignmentRecordListResult {
  data: AssignmentRecord[]
  total: number
}

function extractListResult<T>(res: ApiResponse<T[]>): { data: T[]; total: number } {
  return {
    data: res.data ?? [],
    total: res.meta?.total ?? res.total ?? 0,
  }
}

export async function getResignedEmployeeList(
  params: ResignedEmployeeListParams,
): Promise<ResignedEmployeeListResult> {
  const res = await http.get<ResignedEmployee[]>('/scrm/inheritance/resigned-employees', { params })
  return extractListResult(res)
}

export async function getInheritanceCustomerList(
  params: InheritanceCustomerListParams,
): Promise<InheritanceCustomerListResult> {
  const res = await http.get<InheritanceCustomer[]>(
    `/scrm/inheritance/employees/${params.employeeId}/customers`,
    {
      params: { page: params.page, pageSize: params.pageSize, name: params.name },
    },
  )
  return extractListResult(res)
}

export async function assignCustomers(data: AssignCustomersData): Promise<void> {
  await http.post('/scrm/inheritance/assign', data)
}

export async function getActiveStaffList(): Promise<ActiveStaff[]> {
  const res = await http.get<ActiveStaff[]>('/scrm/inheritance/active-staff')
  return res.data ?? []
}

export async function getAssignmentRecordList(
  params: AssignmentRecordListParams,
): Promise<AssignmentRecordListResult> {
  const res = await http.get<AssignmentRecord[]>('/scrm/inheritance/records', { params })
  return extractListResult(res)
}
