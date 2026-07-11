<template>
  <div class="page-container">
    <el-card>
      <template #header>
        <div class="card-header">
          <span>离职继承</span>
        </div>
      </template>

      <el-form :model="searchForm" inline @submit.prevent="handleSearch">
        <el-form-item label="离职员工">
          <el-input
            v-model="searchForm.name"
            placeholder="请输入员工姓名"
            clearable
            style="width: 200px"
          />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="handleSearch"> 搜索 </el-button>
          <el-button @click="handleReset"> 重置 </el-button>
        </el-form-item>
      </el-form>

      <el-table v-loading="loading" :data="tableData" stripe style="width: 100%">
        <el-table-column type="index" width="50" />
        <el-table-column label="员工姓名" prop="name" min-width="120" />
        <el-table-column label="部门" prop="department" min-width="120" />
        <el-table-column label="客户数" prop="customerCount" width="100" />
        <el-table-column label="分配状态" prop="assignStatus" width="120">
          <template #default="{ row }">
            <el-tag :type="statusTagType(row.assignStatus)">
              {{ statusLabel(row.assignStatus) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="离职时间" prop="resignedAt" width="170" />
        <el-table-column label="操作" width="200" fixed="right">
          <template #default="{ row }">
            <el-button link type="primary" @click="openAssignDialog(row)"> 分配 </el-button>
            <el-button link type="primary" @click="openRecordDialog(row)"> 分配记录 </el-button>
          </template>
        </el-table-column>
      </el-table>

      <div class="pagination-wrapper">
        <el-pagination
          v-model:current-page="pagination.page"
          v-model:page-size="pagination.pageSize"
          :total="pagination.total"
          :page-sizes="[10, 20, 50]"
          layout="total, sizes, prev, pager, next, jumper"
          @size-change="loadData"
          @current-change="loadData"
        />
      </div>
    </el-card>

    <el-dialog
      v-model="assignDialogVisible"
      title="分配客户"
      width="800px"
      :close-on-click-modal="false"
      @close="handleAssignDialogClose"
    >
      <div class="assign-dialog-content">
        <div class="assign-header">
          <span>离职员工：{{ currentEmployee?.name }}</span>
          <span>客户数：{{ currentEmployee?.customerCount }}</span>
        </div>

        <el-form :model="customerSearchForm" inline style="margin-bottom: 16px">
          <el-form-item label="客户搜索">
            <el-input
              v-model="customerSearchForm.name"
              placeholder="请输入客户名称"
              clearable
              style="width: 200px"
            />
          </el-form-item>
          <el-form-item>
            <el-button type="primary" @click="loadCustomers"> 搜索 </el-button>
          </el-form-item>
          <el-form-item label="分配给">
            <el-select
              v-model="targetStaffId"
              placeholder="请选择在职员工"
              filterable
              style="width: 200px"
            >
              <el-option
                v-for="staff in activeStaffList"
                :key="staff.id"
                :label="staff.name"
                :value="staff.id"
              >
                <span>{{ staff.name }}</span>
                <span style="color: #999; margin-left: 8px">{{ staff.department }}</span>
              </el-option>
            </el-select>
          </el-form-item>
        </el-form>

        <el-table
          ref="customerTableRef"
          v-loading="customerLoading"
          :data="customerList"
          stripe
          style="width: 100%"
          @selection-change="handleCustomerSelectionChange"
        >
          <el-table-column type="selection" width="50" />
          <el-table-column label="客户名称" prop="name" min-width="120" />
          <el-table-column label="微信号" prop="wechatId" width="120" />
          <el-table-column label="标签" prop="tags" min-width="150">
            <template #default="{ row }">
              <el-tag v-for="tag in row.tags" :key="tag" size="small" style="margin-right: 4px">
                {{ tag }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column label="最后联系" prop="lastContactAt" width="170" />
        </el-table>

        <div class="pagination-wrapper">
          <el-pagination
            v-model:current-page="customerPagination.page"
            v-model:page-size="customerPagination.pageSize"
            :total="customerPagination.total"
            :page-sizes="[10, 20, 50]"
            layout="total, sizes, prev, pager, next"
            @size-change="loadCustomers"
            @current-change="loadCustomers"
          />
        </div>
      </div>

      <template #footer>
        <el-button @click="assignDialogVisible = false"> 取消 </el-button>
        <el-button
          type="primary"
          :loading="assigning"
          :disabled="!selectedCustomers.length || !targetStaffId"
          @click="handleAssign"
        >
          确认分配 ({{ selectedCustomers.length }})
        </el-button>
      </template>
    </el-dialog>

    <el-dialog
      v-model="recordDialogVisible"
      title="分配记录"
      width="900px"
      :close-on-click-modal="false"
    >
      <el-table v-loading="recordLoading" :data="recordList" stripe style="width: 100%">
        <el-table-column type="index" width="50" />
        <el-table-column label="离职员工" prop="employeeName" min-width="100" />
        <el-table-column label="客户名称" prop="customerName" min-width="100" />
        <el-table-column label="分配给" prop="targetStaffName" min-width="100" />
        <el-table-column label="操作人" prop="operatorName" min-width="100" />
        <el-table-column label="分配时间" prop="assignedAt" width="170" />
      </el-table>

      <div class="pagination-wrapper">
        <el-pagination
          v-model:current-page="recordPagination.page"
          v-model:page-size="recordPagination.pageSize"
          :total="recordPagination.total"
          :page-sizes="[10, 20, 50]"
          layout="total, sizes, prev, pager, next"
          @size-change="loadRecords"
          @current-change="loadRecords"
        />
      </div>

      <template #footer>
        <el-button @click="recordDialogVisible = false"> 关闭 </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { ElMessage, type TableInstance } from 'element-plus'
import {
  getResignedEmployeeList,
  getInheritanceCustomerList,
  assignCustomers,
  getActiveStaffList,
  getAssignmentRecordList,
  type ResignedEmployee,
  type InheritanceCustomer,
  type ActiveStaff,
  type AssignmentRecord,
} from '@/api/scrm/inheritance'

defineOptions({ name: 'InheritanceManagement' })

const loading = ref(false)
const tableData = ref<ResignedEmployee[]>([])
const pagination = reactive({ page: 1, pageSize: 10, total: 0 })
const searchForm = reactive({ name: '' })

const assignDialogVisible = ref(false)
const currentEmployee = ref<ResignedEmployee | null>(null)
const customerLoading = ref(false)
const customerList = ref<InheritanceCustomer[]>([])
const customerPagination = reactive({ page: 1, pageSize: 10, total: 0 })
const customerSearchForm = reactive({ name: '' })
const selectedCustomers = ref<InheritanceCustomer[]>([])
const activeStaffList = ref<ActiveStaff[]>([])
const targetStaffId = ref<number | null>(null)
const assigning = ref(false)
const customerTableRef = ref<TableInstance>()

const recordDialogVisible = ref(false)
const recordLoading = ref(false)
const recordList = ref<AssignmentRecord[]>([])
const recordPagination = reactive({ page: 1, pageSize: 10, total: 0 })
const currentRecordEmployeeId = ref<number | null>(null)

function statusTagType(status: string) {
  const map: Record<string, string> = { pending: 'warning', partial: 'info', completed: 'success' }
  return map[status] ?? 'info'
}

function statusLabel(status: string) {
  const map: Record<string, string> = {
    pending: '待分配',
    partial: '部分分配',
    completed: '已分配',
  }
  return map[status] ?? status
}

async function loadData() {
  loading.value = true
  try {
    const res = await getResignedEmployeeList({
      page: pagination.page,
      pageSize: pagination.pageSize,
      name: searchForm.name || undefined,
    })
    tableData.value = res.data
    pagination.total = res.total
  } catch {
    ElMessage.error('加载离职员工列表失败')
  } finally {
    loading.value = false
  }
}

function handleSearch() {
  pagination.page = 1
  loadData()
}

function handleReset() {
  searchForm.name = ''
  handleSearch()
}

function openAssignDialog(row: ResignedEmployee) {
  currentEmployee.value = row
  customerSearchForm.name = ''
  customerPagination.page = 1
  customerPagination.pageSize = 10
  selectedCustomers.value = []
  targetStaffId.value = null
  assignDialogVisible.value = true
  loadCustomers()
  loadActiveStaff()
}

async function loadCustomers() {
  if (!currentEmployee.value) return
  customerLoading.value = true
  try {
    const res = await getInheritanceCustomerList({
      page: customerPagination.page,
      pageSize: customerPagination.pageSize,
      employeeId: currentEmployee.value.id,
      name: customerSearchForm.name || undefined,
    })
    customerList.value = res.data
    customerPagination.total = res.total
  } catch {
    ElMessage.error('加载客户列表失败')
  } finally {
    customerLoading.value = false
  }
}

async function loadActiveStaff() {
  try {
    activeStaffList.value = await getActiveStaffList()
  } catch {
    ElMessage.error('加载在职员工列表失败')
  }
}

function handleCustomerSelectionChange(selection: InheritanceCustomer[]) {
  selectedCustomers.value = selection
}

async function handleAssign() {
  if (!currentEmployee.value || !targetStaffId.value || !selectedCustomers.value.length) return
  assigning.value = true
  try {
    await assignCustomers({
      employeeId: currentEmployee.value.id,
      customerIds: selectedCustomers.value.map((c) => c.id),
      targetStaffId: targetStaffId.value,
    })
    ElMessage.success('分配成功')
    assignDialogVisible.value = false
    loadData()
  } catch {
    ElMessage.error('分配失败')
  } finally {
    assigning.value = false
  }
}

function handleAssignDialogClose() {
  customerTableRef.value?.clearSelection()
}

function openRecordDialog(row: ResignedEmployee) {
  currentRecordEmployeeId.value = row.id
  recordPagination.page = 1
  recordPagination.pageSize = 10
  recordDialogVisible.value = true
  loadRecords()
}

async function loadRecords() {
  recordLoading.value = true
  try {
    const res = await getAssignmentRecordList({
      page: recordPagination.page,
      pageSize: recordPagination.pageSize,
      employeeId: currentRecordEmployeeId.value ?? undefined,
    })
    recordList.value = res.data
    recordPagination.total = res.total
  } catch {
    ElMessage.error('加载分配记录失败')
  } finally {
    recordLoading.value = false
  }
}

onMounted(loadData)
</script>

<style scoped lang="scss">
.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.pagination-wrapper {
  margin-top: 16px;
  display: flex;
  justify-content: flex-end;
}

.assign-dialog-content {
  .assign-header {
    display: flex;
    gap: 24px;
    margin-bottom: 16px;
    font-size: 14px;
    color: var(--el-text-color-regular);
  }
}
</style>
