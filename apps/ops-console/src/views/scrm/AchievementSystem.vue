<template>
  <div class="page-container">
    <el-card>
      <template #header>
        <div class="card-header">
          <span>成就体系</span>
          <el-button type="primary" @click="handleCreate">新建成就</el-button>
        </div>
      </template>

      <ProTable
        ref="tableRef"
        :columns="columns"
        :request="handleRequest"
        :search-config="searchConfig"
        :actions="actions"
      />
    </el-card>

    <ProFormDialog
      v-model="dialogVisible"
      :title="dialogTitle"
      :fields="fields"
      :initial-data="currentAchievement"
      :on-submit="handleSubmit"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, h } from 'vue'
import { ElMessage, ElMessageBox, ElImage, ElTag } from 'element-plus'
import ProTable from '@/components/common/ProTable/ProTable.vue'
import type {
  ColumnConfig,
  SearchConfig,
  ActionConfig,
  RequestParams,
  RequestResult,
} from '@/components/common/ProTable/ProTable.vue'
import ProFormDialog from '@/components/common/ProFormDialog/ProFormDialog.vue'
import type { FieldConfig } from '@/components/common/ProFormDialog/ProFormDialog.vue'
import {
  getAchievementList,
  createAchievement,
  updateAchievement,
  deleteAchievement,
  type Achievement,
  type AchievementListParams,
} from '@/api/scrm/achievement'

defineOptions({ name: 'AchievementSystem' })

const tableRef = ref<InstanceType<typeof ProTable>>()
const dialogVisible = ref(false)
const dialogTitle = ref('新建成就')
const currentAchievement = ref<Partial<Achievement>>({})

const searchConfig: SearchConfig[] = [
  { prop: 'name', label: '成就名称', type: 'input', placeholder: '请输入成就名称' },
  {
    prop: 'status',
    label: '状态',
    type: 'select',
    placeholder: '请选择状态',
    options: [
      { label: '启用', value: 1 },
      { label: '禁用', value: 0 },
    ],
  },
]

const columns: ColumnConfig[] = [
  { prop: 'id', label: 'ID', width: 80 },
  { prop: 'name', label: '成就名称', minWidth: 150 },
  {
    prop: 'icon',
    label: '图标',
    width: 80,
    render: (row: Achievement) =>
      h(ElImage, {
        src: row.icon,
        style: 'width: 40px; height: 40px',
        fit: 'cover',
      }),
  },
  { prop: 'description', label: '描述', minWidth: 200, showOverflowTooltip: true },
  {
    prop: 'conditionType',
    label: '达成条件',
    minWidth: 150,
    render: (row: Achievement) =>
      h('span', null, getConditionText(row.conditionType, row.conditionValue)),
  },
  {
    prop: 'rewardType',
    label: '奖励',
    minWidth: 120,
    render: (row: Achievement) => h('span', null, getRewardText(row.rewardType, row.rewardValue)),
  },
  {
    prop: 'status',
    label: '状态',
    width: 100,
    render: (row: Achievement) =>
      h(ElTag, { type: row.status === 1 ? 'success' : 'danger' }, () =>
        row.status === 1 ? '启用' : '禁用',
      ),
  },
  { prop: 'createdAt', label: '创建时间', width: 180, sortable: true },
]

const actions: ActionConfig[] = [
  { label: '编辑', type: 'primary', onClick: (row) => handleEdit(row as Achievement) },
  { label: '删除', type: 'danger', onClick: (row) => handleDelete(row as Achievement) },
]

const fields: FieldConfig[] = [
  { prop: 'name', label: '成就名称', type: 'input', required: true, maxlength: 50 },
  {
    prop: 'icon',
    label: '图标',
    type: 'input',
    required: true,
    placeholder: '请输入图标标识或URL',
  },
  { prop: 'description', label: '描述', type: 'textarea', maxlength: 200, rows: 3 },
  {
    prop: 'conditionType',
    label: '达成条件类型',
    type: 'select',
    required: true,
    options: [
      { label: '消费金额', value: 'consume_amount' },
      { label: '消费次数', value: 'consume_count' },
      { label: '邀请人数', value: 'invite_count' },
      { label: '连续签到', value: 'sign_in_streak' },
      { label: '积分累计', value: 'points_total' },
    ],
  },
  { prop: 'conditionValue', label: '目标值', type: 'number', required: true, min: 1 },
  {
    prop: 'rewardType',
    label: '奖励类型',
    type: 'select',
    required: true,
    options: [
      { label: '积分', value: 'points' },
      { label: '优惠券', value: 'coupon' },
      { label: '会员等级', value: 'member_level' },
      { label: '实物奖品', value: 'physical' },
    ],
  },
  { prop: 'rewardValue', label: '奖励值', type: 'number', required: true, min: 1 },
  {
    prop: 'status',
    label: '状态',
    type: 'radio',
    required: true,
    options: [
      { label: '启用', value: 1 },
      { label: '禁用', value: 0 },
    ],
  },
]

function getConditionText(type: string, value: number): string {
  const map: Record<string, string> = {
    consume_amount: `累计消费满${value}元`,
    consume_count: `累计消费${value}次`,
    invite_count: `邀请${value}人`,
    sign_in_streak: `连续签到${value}天`,
    points_total: `累计获得${value}积分`,
  }
  return map[type] || `${type}: ${value}`
}

function getRewardText(type: string, value: number): string {
  const map: Record<string, string> = {
    points: `${value}积分`,
    coupon: `${value}张优惠券`,
    member_level: `会员等级+${value}`,
    physical: `实物奖品(${value})`,
  }
  return map[type] || `${type}: ${value}`
}

async function handleRequest(params: RequestParams): Promise<RequestResult> {
  try {
    const query: AchievementListParams = {
      page: params.page,
      pageSize: params.pageSize,
    }
    if (params.name) query.name = params.name
    if (params.status !== undefined && params.status !== '') query.status = Number(params.status)
    const res = await getAchievementList(query)
    return { data: res.data ?? [], total: res.total ?? 0 }
  } catch (e: any) {
    ElMessage.error(e.message || '获取成就列表失败')
    return { data: [], total: 0 }
  }
}

function handleCreate() {
  dialogTitle.value = '新建成就'
  currentAchievement.value = { status: 1, conditionValue: 1, rewardValue: 1 }
  dialogVisible.value = true
}

function handleEdit(row: Achievement) {
  dialogTitle.value = '编辑成就'
  currentAchievement.value = { ...row }
  dialogVisible.value = true
}

async function handleSubmit(data: Record<string, any>) {
  try {
    if (data.id) {
      const { id, ...updateData } = data
      await updateAchievement(id, updateData)
    } else {
      const {
        name,
        icon,
        description,
        conditionType,
        conditionValue,
        rewardType,
        rewardValue,
        status,
      } = data
      await createAchievement({
        name,
        icon,
        description,
        conditionType,
        conditionValue,
        rewardType,
        rewardValue,
        status,
      })
    }
    tableRef.value?.refresh()
  } catch (e: any) {
    ElMessage.error(e.message || '操作失败')
  }
}

async function handleDelete(row: Achievement) {
  try {
    await ElMessageBox.confirm('确定删除该成就吗？', '提示', { type: 'warning' })
    await deleteAchievement(row.id)
    ElMessage.success('删除成功')
    tableRef.value?.refresh()
  } catch (e: any) {
    if (e !== 'cancel') {
      ElMessage.error(e.message || '删除失败')
    }
  }
}
</script>

<style scoped>
.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
</style>
