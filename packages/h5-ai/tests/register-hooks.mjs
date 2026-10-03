// 测试运行期装载解析钩子：node --import ./tests/register-hooks.mjs
import { register } from 'node:module'

register('./ext-hooks.mjs', import.meta.url)
