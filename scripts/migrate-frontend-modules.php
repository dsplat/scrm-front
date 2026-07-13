<?php
/**
 * 前端模块化迁移脚本
 * 
 * 将 views/ 和 api/scrm/ 迁移到 modules/ 目录结构
 */

$base = '/Users/arthur/Devel/WorkSpaceAI/framework/scrm-platform-front/apps/ops-console/src';
$moved = 0;
$errors = [];

// ── 视图目录映射 ──────────────────────────────────────────
$viewDirMapping = [
    'customers' => 'customer',
    'journey' => 'customer',
    'tags' => 'customer',
    'pipeline' => 'customer',
    'channels' => 'channel',
    'live-codes' => 'channel',
    'wechat' => 'channel',
    'campaign' => 'marketing',
    'automations' => 'marketing',
    'communities' => 'community',
    'materials' => 'content',
    'staff' => 'staff',
    'agents' => 'ai',
    'conversations' => 'ai',
    'knowledge' => 'knowledge',
    'external-kb' => 'knowledge',
    'notifications' => 'platform',
    'permission' => 'platform',
    'risk' => 'platform',
];

// ── scrm/ 文件映射 ────────────────────────────────────────
$scrmFileMapping = [
    'WelcomeMessage.vue' => 'channel',
    'FissionCampaign.vue' => 'marketing',
    'PosterManagement.vue' => 'marketing',
    'ScheduledReach.vue' => 'marketing',
    'MassPush.vue' => 'community',
    'MomentsSOP.vue' => 'community',
    'ScriptLibrary.vue' => 'content',
    'InheritanceManagement.vue' => 'staff',
    'ProductManagement.vue' => 'product',
    'MembershipCard.vue' => 'membership',
    'DistributionManagement.vue' => 'distribution',
    'LotteryCampaign.vue' => 'lottery',
    'VotingCampaign.vue' => 'voting',
    'CouponManagement.vue' => 'coupon',
    'SmsMarketing.vue' => 'sms',
    'AchievementSystem.vue' => 'platform',
    'SurveyForm.vue' => 'platform',
];

// ── API 文件映射 ──────────────────────────────────────────
$apiFileMapping = [
    'achievement.ts' => 'platform',
    'analytics.ts' => 'analytics',
    'coupon.ts' => 'coupon',
    'distribution.ts' => 'distribution',
    'fission.ts' => 'marketing',
    'inheritance.ts' => 'staff',
    'lottery.ts' => 'lottery',
    'massPush.ts' => 'community',
    'membershipCard.ts' => 'membership',
    'momentsSop.ts' => 'community',
    'points.ts' => 'membership',
    'poster.ts' => 'marketing',
    'product.ts' => 'product',
    'sms.ts' => 'sms',
    'survey.ts' => 'platform',
    'voting.ts' => 'voting',
    'welcome.ts' => 'channel',
];

// ── Phase 1: 创建模块目录 ──────────────────────────────────
echo "=== Phase 1: Creating module directories ===\n";
$moduleNames = ['customer', 'channel', 'marketing', 'community', 'content', 'staff', 
    'ai', 'knowledge', 'product', 'membership', 'distribution', 'analytics', 
    'lottery', 'voting', 'coupon', 'sms', 'platform'];

foreach ($moduleNames as $mod) {
    @mkdir("$base/modules/$mod/views", 0755, true);
    @mkdir("$base/modules/$mod/api", 0755, true);
}
echo "Created " . count($moduleNames) . " module directories\n";

// ── Phase 2: 移动视图目录 ──────────────────────────────────
echo "\n=== Phase 2: Moving view directories ===\n";
foreach ($viewDirMapping as $viewDir => $module) {
    $src = "$base/views/$viewDir";
    $dst = "$base/modules/$module/views/$viewDir";
    
    if (!is_dir($src)) {
        $errors[] = "View dir not found: $viewDir";
        continue;
    }
    
    // Copy directory
    @mkdir($dst, 0755, true);
    $files = glob("$src/*");
    foreach ($files as $file) {
        if (is_file($file)) {
            copy($file, $dst . '/' . basename($file));
            $moved++;
        }
    }
    echo "  $viewDir/ -> modules/$module/views/$viewDir/ (" . count($files) . " files)\n";
}

// ── Phase 3: 移动 scrm/ 目录文件 ──────────────────────────
echo "\n=== Phase 3: Moving scrm/ files ===\n";
foreach ($scrmFileMapping as $file => $module) {
    $src = "$base/views/scrm/$file";
    $dst = "$base/modules/$module/views/$file";
    
    if (!file_exists($src)) {
        $errors[] = "Scrm file not found: $file";
        continue;
    }
    
    copy($src, $dst);
    $moved++;
    echo "  scrm/$file -> modules/$module/views/$file\n";
}

// ── Phase 4: 移动 API 文件 ────────────────────────────────
echo "\n=== Phase 4: Moving API files ===\n";
foreach ($apiFileMapping as $file => $module) {
    $src = "$base/api/scrm/$file";
    $dst = "$base/modules/$module/api/$file";
    
    if (!file_exists($src)) {
        $errors[] = "API file not found: $file";
        continue;
    }
    
    copy($src, $dst);
    $moved++;
    echo "  api/scrm/$file -> modules/$module/api/$file\n";
}

// ── Phase 5: 更新 import 路径 ──────────────────────────────
echo "\n=== Phase 5: Updating import paths ===\n";
$updateCount = 0;

// Build path replacement map
$pathReplacements = [];

// View directory replacements: @/views/{dir} -> @/modules/{module}/views/{dir}
foreach ($viewDirMapping as $viewDir => $module) {
    $pathReplacements["@/views/$viewDir"] = "@/modules/$module/views/$viewDir";
    $pathReplacements["../views/$viewDir"] = "../modules/$module/views/$viewDir";
    $pathReplacements["../../views/$viewDir"] = "../../modules/$module/views/$viewDir";
}

// scrm/ file replacements: @/views/scrm/{file} -> @/modules/{module}/views/{file}
foreach ($scrmFileMapping as $file => $module) {
    $name = pathinfo($file, PATHINFO_FILENAME);
    $pathReplacements["@/views/scrm/$name"] = "@/modules/$module/views/$name";
    $pathReplacements["../views/scrm/$name"] = "../modules/$module/views/$name";
    $pathReplacements["../../views/scrm/$name"] = "../../modules/$module/views/$name";
}

// API file replacements: @/api/scrm/{file} -> @/modules/{module}/api/{file}
foreach ($apiFileMapping as $file => $module) {
    $name = pathinfo($file, PATHINFO_FILENAME);
    $pathReplacements["@/api/scrm/$name"] = "@/modules/$module/api/$name";
    $pathReplacements["../api/scrm/$name"] = "../modules/$module/api/$name";
    $pathReplacements["../../api/scrm/$name"] = "../../modules/$module/api/$name";
}

// Find all .vue and .ts files
$iterator = new RecursiveIteratorIterator(
    new RecursiveDirectoryIterator($base, RecursiveDirectoryIterator::SKIP_DOTS),
    RecursiveIteratorIterator::LEAVES_ONLY
);

$files = [];
foreach ($iterator as $file) {
    $ext = $file->getExtension();
    if (in_array($ext, ['vue', 'ts', 'tsx'])) {
        $files[] = $file->getPathname();
    }
}

foreach ($files as $filePath) {
    $content = file_get_contents($filePath);
    $original = $content;
    
    foreach ($pathReplacements as $old => $new) {
        $content = str_replace($old, $new, $content);
    }
    
    if ($content !== $original) {
        file_put_contents($filePath, $content);
        $updateCount++;
    }
}

echo "  Import paths updated in: $updateCount files\n";

// ── Summary ────────────────────────────────────────────────
echo "\n=== Migration Summary ===\n";
echo "Files moved: $moved\n";
echo "Import paths updated: $updateCount files\n";
echo "Errors: " . count($errors) . "\n";
foreach ($errors as $e) echo "  ERROR: $e\n";
