import { http, type ApiResponse } from '@scrm/shared'

export interface Product {
  id: number
  name: string
  image: string
  price: number
  stock: number
  category: string
  status: number
  createdAt: string
  updatedAt: string
}

export interface ProductListParams {
  page: number
  pageSize: number
  name?: string
  category?: string
  status?: number
}

export interface ProductListResult {
  data: Product[]
  total: number
}

export interface CreateProductData {
  name: string
  image: string
  price: number
  stock: number
  category: string
  status: number
}

export interface UpdateProductData {
  name?: string
  image?: string
  price?: number
  stock?: number
  category?: string
  status?: number
}

function extractListResult<T>(res: ApiResponse<T[]>): { data: T[]; total: number } {
  return {
    data: res.data ?? [],
    total: res.meta?.total ?? res.total ?? 0,
  }
}

export async function getProductList(params: ProductListParams): Promise<ProductListResult> {
  const res = await http.get<Product[]>('/scrm/products', { params })
  return extractListResult(res)
}

export async function getProductDetail(id: number): Promise<Product> {
  const res = await http.get<Product>(`/scrm/products/${id}`)
  return res.data
}

export async function createProduct(data: CreateProductData): Promise<Product> {
  const res = await http.post<Product>('/scrm/products', data)
  return res.data
}

export async function updateProduct(id: number, data: UpdateProductData): Promise<Product> {
  const res = await http.put<Product>(`/scrm/products/${id}`, data)
  return res.data
}

export async function deleteProduct(id: number): Promise<void> {
  await http.delete(`/scrm/products/${id}`)
}

export async function updateProductStatus(id: number, status: number): Promise<void> {
  await http.put(`/scrm/products/${id}/status`, { status })
}
