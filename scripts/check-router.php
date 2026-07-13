<?php
$base = '/Users/arthur/Devel/WorkSpaceAI/framework/scrm-platform-front/apps/ops-console/src';
$router = file_get_contents("$base/router/index.ts");

// Count all import patterns
preg_match_all("/import\([^)]+\)/", $router, $matches);
$paths = [];
foreach ($matches[0] as $m) {
    if (preg_match("/'([^']+\.vue)'/", $m, $pm)) {
        $paths[] = $pm[1];
    }
}

echo "Router imports: " . count($paths) . "\n";

// Check if all imported files exist
$missing = 0;
foreach ($paths as $p) {
    $resolved = str_replace('@/', "$base/", $p);
    if (!file_exists($resolved)) {
        echo "  MISSING: $p -> $resolved\n";
        $missing++;
    }
}
echo "Missing files: $missing\n";

// Show distribution
$modules = [];
foreach ($paths as $p) {
    if (str_starts_with($p, '@/modules/')) {
        preg_match('@/modules/(\w+)/@', $p, $m);
        $mod = $m[1] ?? 'unknown';
        $modules[$mod] = ($modules[$mod] ?? 0) + 1;
    } elseif (str_starts_with($p, '@/views/')) {
        $modules['views (root)'] = ($modules['views (root)'] ?? 0) + 1;
    } else {
        $modules['other'] = ($modules['other'] ?? 0) + 1;
    }
}
echo "\nModule distribution:\n";
foreach ($modules as $mod => $count) echo "  $mod: $count\n";
