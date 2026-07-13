<template>
  <div class="page-container">
    <el-card v-loading="loading">
      <template #header>
        <div class="card-header">
          <span>知识库详情 — {{ kb.name || '' }}</span>
          <el-button @click="$router.back()"> 返回 </el-button>
        </div>
      </template>
      <el-tabs>
        <el-tab-pane label="文档列表">
          <el-table :data="documents" stripe>
            <el-table-column label="名称" prop="name" />
            <el-table-column label="大小" prop="size" width="100" />
            <el-table-column label="状态" prop="status" width="100">
              <template #default="{ row }">
                <el-tag :type="row.status === 'ready' ? 'success' : 'warning'">
                  {{ row.status }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column label="上传时间" prop="created_at" width="180" />
          </el-table>
        </el-tab-pane>
        <el-tab-pane label="上传文档">
          <el-upload
            drag
            :action="uploadUrl"
            :headers="uploadHeaders"
            :on-success="onUploadSuccess"
            :on-error="onUploadError"
            multiple
          >
            <div style="padding: 20px">
              <div>拖拽文件到此处，或点击上传</div>
            </div>
          </el-upload>
        </el-tab-pane>
        <el-tab-pane label="搜索测试">
          <el-input v-model="searchQuery" placeholder="输入关键词测试">
            <template #append>
              <el-button :loading="searching" @click="handleSearch"> 搜索 </el-button>
            </template>
          </el-input>
          <div v-if="searchResults.length" style="margin-top: 16px">
            <div
              v-for="(r, i) in searchResults"
              :key="i"
              style="padding: 8px; border-bottom: 1px solid #eee"
            >
              <div style="font-weight: bold">
                {{ r.title || `结果 ${i + 1}` }}
              </div>
              <div style="color: #606266; font-size: 13px">
                {{ r.content }}
              </div>
              <div v-if="r.score" style="color: #909399; font-size: 12px">
                相关度: {{ r.score }}
              </div>
            </div>
          </div>
        </el-tab-pane>
      </el-tabs>
    </el-card>
  </div>
</template>
<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { ElMessage } from 'element-plus'
import { http } from '@scrm/shared'

const route = useRoute()
const kbId = route.params.id as string

const loading = ref(false)
const kb = ref<Record<string, any>>({})
const documents = ref<any[]>([])
const searchQuery = ref('')
const searching = ref(false)
const searchResults = ref<any[]>([])

const uploadUrl = `${import.meta.env.VITE_API_BASE ?? '/api'}/scrm/knowledge-bases/${kbId}/documents/upload`
const uploadHeaders = {} as Record<string, string>

async function loadKB() {
  if (!kbId) return
  loading.value = true
  try {
    const res = (await http.get(`/scrm/knowledge-bases/${kbId}`)) as any
    const data = res?.data ?? res ?? {}
    kb.value = data
    documents.value = data.documents ?? []
  } catch {
    ElMessage.error('加载知识库详情失败')
  } finally {
    loading.value = false
  }
}

function onUploadSuccess() {
  ElMessage.success('上传成功')
  loadKB()
}
function onUploadError() {
  ElMessage.error('上传失败')
}

async function handleSearch() {
  if (!searchQuery.value) return
  searching.value = true
  try {
    const res = (await http.post(`/scrm/knowledge-bases/${kbId}/search`, {
      query: searchQuery.value,
    })) as any
    searchResults.value = res?.data ?? res ?? []
  } catch {
    ElMessage.error('搜索失败')
  } finally {
    searching.value = false
  }
}

onMounted(loadKB)
</script>
<template>
  <div class="page-container">
    <el-card
      ><template #header>知识库详情</template>
      <el-tabs
        ><el-tab-pane label="文档列表"><el-empty /></el-tab-pane>
        <el-tab-pane label="上传文档"
          ><el-upload drag
            ><el-icon><Upload /></el-icon>
            <div>拖拽文件到此处</div></el-upload
          ></el-tab-pane
        >
        <el-tab-pane label="搜索测试"
          ><el-input placeholder="输入关键词测试"
            ><template #append><el-button>搜索</el-button></template></el-input
          ></el-tab-pane
        ></el-tabs
      >
    </el-card>
  </div>
</template>
<script setup lang="ts"></script>
<style scoped>
.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
</style>
