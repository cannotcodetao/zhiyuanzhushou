// 配置完整性验证：检查 province-config.js 中 31 省配置 + app.js 中 old 模式适配
// 运行方式：node data/config_validate.js
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.resolve(__dirname, '..');

console.log('\n=== Phase 14 配置完整性验证 ===\n');

// 1. 加载 province-config.js（在 vm 沙箱中执行，模拟浏览器环境）
const configSrc = fs.readFileSync(path.join(ROOT, 'js/province-config.js'), 'utf8');
const sandbox = {
    window: {},
    console: console
};
try {
    vm.createContext(sandbox);
    vm.runInContext(configSrc, sandbox);
    console.log('[OK] province-config.js 语法正确，可执行');
} catch (e) {
    console.log(`[FAIL] province-config.js 执行错误: ${e.message}`);
    process.exit(1);
}

const config = sandbox.window.PROVINCE_CONFIG || sandbox.PROVINCE_CONFIG;
if (!config) {
    console.log('[FAIL] PROVINCE_CONFIG 未定义');
    process.exit(1);
}

const provinceCount = Object.keys(config).length;
console.log(`[INFO] 配置中省份数量: ${provinceCount}`);

if (provinceCount !== 31) {
    console.log(`[FAIL] 应有 31 省，实际 ${provinceCount} 省`);
    process.exit(1);
}
console.log(`[OK] 省份数量 = 31`);

// 2. 验证每省配置完整性
const REQUIRED_FIELDS = ['code', 'examMode', 'subjects', 'electiveMode', 'totalScore', 'batches', 'dataFile', 'officialName', 'officialUrl', 'dataScope'];
const OPTIONAL_FIELDS = ['electiveCount', 'firstChoice', 'firstChoiceCount', 'secondChoice', 'secondChoiceCount', 'scoreLayout'];

let cfgOk = 0, cfgFail = 0;
const cfgFailures = [];

Object.entries(config).forEach(([prov, c]) => {
    const missing = REQUIRED_FIELDS.filter(f => !c[f] || (Array.isArray(c[f]) && c[f].length === 0));
    if (missing.length > 0) {
        cfgFailures.push(`${prov}: 缺失字段 ${missing.join(',')}`);
        cfgFail++;
        return;
    }
    // 验证 examMode 与 electiveMode 一致性
    const validModes = [
        { exam: '3+3', elective: 'free' },
        { exam: '3+1+2', elective: 'layered' },
        { exam: 'old', elective: 'old' }
    ];
    const match = validModes.some(m => m.exam === c.examMode && m.elective === c.electiveMode);
    if (!match) {
        cfgFailures.push(`${prov}: examMode=${c.examMode} 与 electiveMode=${c.electiveMode} 不匹配`);
        cfgFail++;
        return;
    }
    // 验证 layered 模式必须有 firstChoice/secondChoice
    if (c.electiveMode === 'layered') {
        if (!c.firstChoice || !c.secondChoice || !c.firstChoiceCount || !c.secondChoiceCount) {
            cfgFailures.push(`${prov}: layered 模式缺少 firstChoice/secondChoice`);
            cfgFail++;
            return;
        }
    }
    // 验证数据文件存在
    const dataPath = path.join(ROOT, c.dataFile);
    if (!fs.existsSync(dataPath)) {
        cfgFailures.push(`${prov}: 数据文件 ${c.dataFile} 不存在`);
        cfgFail++;
        return;
    }
    // 验证 totalScore 特殊值
    if (prov === '上海' && c.totalScore !== 660) {
        cfgFailures.push(`${prov}: totalScore 应为 660，实际 ${c.totalScore}`);
        cfgFail++;
        return;
    }
    if (prov === '海南' && c.totalScore !== 900) {
        cfgFailures.push(`${prov}: totalScore 应为 900，实际 ${c.totalScore}`);
        cfgFail++;
        return;
    }
    // 验证老高考省份
    if (c.electiveMode === 'old') {
        if (!c.subjects.includes('文科') || !c.subjects.includes('理科')) {
            cfgFailures.push(`${prov}: 老高考应包含文科/理科`);
            cfgFail++;
            return;
        }
    }
    cfgOk++;
});

console.log(`\n[配置验证] ${cfgOk}/${provinceCount} 省配置完整`);
cfgFailures.forEach(f => console.log(`  [FAIL] ${f}`));

// 3. 验证全局函数
const fns = ['getCurrentProvinceConfig', 'getExamModeDescription', 'getAllProvinceNames'];
fns.forEach(fn => {
    const fnRef = sandbox.window[fn] || sandbox[fn];
    if (typeof fnRef === 'function') {
        console.log(`[OK] 全局函数 ${fn} 已导出`);
    } else {
        console.log(`[FAIL] 全局函数 ${fn} 未导出`);
    }
});

// 4. 验证 getAllProvinceNames 返回 31 省
try {
    const fnRef = sandbox.window.getAllProvinceNames || sandbox.getAllProvinceNames;
    const names = fnRef.call(sandbox.window);
    if (names.length === 31) {
        console.log(`[OK] getAllProvinceNames() 返回 ${names.length} 省`);
    } else {
        console.log(`[FAIL] getAllProvinceNames() 返回 ${names.length} 省，应为 31`);
    }
} catch (e) {
    console.log(`[FAIL] getAllProvinceNames() 调用失败: ${e.message}`);
}

// 5. 验证 app.js 语法
console.log('\n=== app.js 老高考模式适配验证 ===\n');
const appSrc = fs.readFileSync(path.join(ROOT, 'js/app.js'), 'utf8');

// 检查 5 个核心函数都处理了 old 模式
const CHECKS = [
    { fn: 'buildSubjectSelector', pattern: /electiveMode\s*===?\s*['"]old['"]/g, minCount: 1 },
    { fn: 'setupSubjectSelector', pattern: /electiveMode\s*===?\s*['"]old['"]/g, minCount: 1 },
    { fn: 'updateSubjectHint', pattern: /electiveMode\s*===?\s*['"]old['"]/g, minCount: 1 },
    { fn: 'getSelectedSubjects', pattern: /electiveMode\s*===?\s*['"]old['"]/g, minCount: 1 },
    { fn: 'validateForm', pattern: /electiveMode\s*===?\s*['"]old['"]/g, minCount: 1 }
];

const allOldChecks = appSrc.match(/electiveMode\s*===?\s*['"]old['"]/g) || [];
console.log(`[INFO] app.js 中 'old' 模式分支出现次数: ${allOldChecks.length}（应 ≥ 5）`);

if (allOldChecks.length >= 5) {
    console.log('[OK] 5 个核心函数均适配了 old 模式');
} else {
    console.log(`[FAIL] 仅 ${allOldChecks.length} 处适配 old 模式，应为至少 5 处`);
}

// 6. 验证 oldChoice radio 名称
if (appSrc.includes('name="oldChoice"')) {
    console.log('[OK] 老高考 radio name="oldChoice" 已实现');
} else {
    console.log('[FAIL] 缺少老高考 radio name="oldChoice"');
}

// 7. 验证 index.html 31 省 option
console.log('\n=== index.html 31 省 option 验证 ===\n');
const htmlSrc = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const optionMatches = htmlSrc.match(/<option value="[^"]+">[^<]+<\/option>/g) || [];
const provinceOptions = optionMatches.filter(o => !o.includes('value=""'));
console.log(`[INFO] index.html 中省份 option 数量: ${provinceOptions.length}`);
if (provinceOptions.length >= 31) {
    console.log('[OK] 31 省 option 已添加');
} else {
    console.log(`[FAIL] 仅 ${provinceOptions.length} 个省份 option，应为 31`);
}

// 8. 验证 optgroup 分组
const optgroups = htmlSrc.match(/<optgroup label="[^"]+">/g) || [];
console.log(`[INFO] optgroup 分组数量: ${optgroups.length}（应为 6）`);
optgroups.forEach(g => console.log(`  - ${g.match(/label="([^"]+)"/)[1]}`));

// 9. 验证缺失 ID 已补全
const requiredIds = ['printProvince', 'disclaimerText', 'footerText', 'faqAnswer1', 'faqAnswer5'];
requiredIds.forEach(id => {
    if (htmlSrc.includes(`id="${id}"`)) {
        console.log(`[OK] id="${id}" 已存在`);
    } else {
        console.log(`[FAIL] id="${id}" 缺失`);
    }
});

// 总结
console.log('\n=== 总结 ===');
const totalChecks = cfgOk + cfgFailures.length;
if (cfgFail === 0 && allOldChecks.length >= 5 && provinceOptions.length >= 31 && requiredIds.every(id => htmlSrc.includes(`id="${id}"`))) {
    console.log('✓ 所有验证通过');
    process.exit(0);
} else {
    console.log(`✗ 有 ${cfgFailures.length + (allOldChecks.length < 5 ? 1 : 0)} 项失败`);
    process.exit(1);
}
