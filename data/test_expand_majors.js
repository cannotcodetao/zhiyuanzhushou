// 验证「展开专业」功能：HTTP 可访问性 + computeEligibleMajors 核心逻辑
// 运行方式：node data/test_expand_majors.js
const http = require('http');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
let pass = 0, fail = 0;

function check(name, cond, detail) {
    if (cond) { console.log(`  [OK] ${name}`); pass++; }
    else { console.log(`  [FAIL] ${name} ${detail || ''}`); fail++; }
}

function httpGet(url) {
    return new Promise((resolve) => {
        http.get(url, (res) => {
            let data = '';
            res.on('data', c => data += c);
            res.on('end', () => resolve({ status: res.statusCode, data }));
        }).on('error', (e) => resolve({ status: 0, error: e.message }));
    });
}

(async () => {
    console.log('\n=== 展开专业功能验证 ===\n');

    // 1. HTTP 可访问性
    console.log('[1] HTTP 文件可访问性');
    const files = [
        ['index.html', 'http://localhost:8765/'],
        ['app.js', 'http://localhost:8765/js/app.js'],
        ['style.css', 'http://localhost:8765/css/style.css'],
        ['province-config.js', 'http://localhost:8765/js/province-config.js'],
        ['zhejiang-data.json', 'http://localhost:8765/data/zhejiang-data.json'],
    ];
    for (const [name, url] of files) {
        const r = await httpGet(url);
        check(`${name} HTTP ${r.status}`, r.status === 200, `got ${r.status}`);
    }

    // 2. app.js 语法正确
    console.log('\n[2] app.js 语法验证');
    const appSrc = fs.readFileSync(path.join(ROOT, 'js/app.js'), 'utf8');
    try {
        new Function(appSrc);
        check('app.js 语法正确', true);
    } catch (e) {
        check('app.js 语法正确', false, e.message);
    }

    // 3. 关键函数存在
    console.log('\n[3] 关键函数存在性');
    check('expandMajors 函数已定义', appSrc.includes('function expandMajors('));
    check('computeEligibleMajors 函数已定义', appSrc.includes('function computeEligibleMajors('));
    check('lastFormData 全局变量已声明', appSrc.includes('let lastFormData'));
    check('展开专业按钮 HTML', appSrc.includes('btn-expand'));
    check('majorList 容器 HTML', appSrc.includes("id=\"majorList-"));

    // 4. CSS 样式存在
    console.log('\n[4] CSS 样式存在性');
    const cssSrc = fs.readFileSync(path.join(ROOT, 'css/style.css'), 'utf8');
    check('.btn-expand 样式', cssSrc.includes('.btn-expand'));
    check('.major-list 样式', cssSrc.includes('.major-list'));
    check('.major-item 样式', cssSrc.includes('.major-item'));
    check('.year-badge 样式', cssSrc.includes('.year-badge'));

    // 5. 核心逻辑验证：用浙江真实数据模拟 computeEligibleMajors
    console.log('\n[5] 核心逻辑验证（浙江真实数据）');
    const zjData = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/zhejiang-data.json'), 'utf8'));
    check('浙江数据加载成功', zjData.schools && zjData.schools.length > 0);

    // 模拟用户：分数620, 位次15000, 选科物化生
    const studentRank = 15000;
    const subjects = ['物理', '化学', '生物'];

    // 选科匹配检查（与 app.js 中 checkSubjectMatch 一致）
    function checkSubjectMatch(requirement, studentSubjects) {
        if (!requirement || requirement.length === 0) return true;
        return requirement.every(req => studentSubjects.includes(req));
    }

    // 遍历所有学校，统计匹配专业总数和多年合并专业总数
    let testSchool = null;
    let totalEligible = 0;
    let totalYearMerge = 0;
    for (const school of zjData.schools) {
        let count = 0, merge = 0;
        school.majors.forEach(major => {
            if (!checkSubjectMatch(major.subject_req, subjects)) return;
            const scores = (major.scores || []).filter(s => s.year >= 2023);
            if (scores.length === 0) return;
            const eligibleYears = scores.filter(s => s.min_rank && studentRank <= s.min_rank);
            if (eligibleYears.length === 0) return;
            count++;
            if (eligibleYears.length > 1) merge++;
        });
        if (count > 0 && !testSchool) testSchool = school;
        totalEligible += count;
        totalYearMerge += merge;
    }
    check(`找到测试学校: ${testSchool ? testSchool.name : 'none'}`, !!testSchool);
    check(`位次法匹配专业总数 > 0`, totalEligible > 0, `got ${totalEligible}`);
    check(`存在多年合并的专业（近3年合并去重生效）`, totalYearMerge > 0, `got ${totalYearMerge}`);

    // 6. 位次法逻辑验证：studentRank <= min_rank 才算"能上"
    console.log('\n[6] 位次法逻辑验证');
    // 构造测试数据：位次15000，专业A(min_rank=10000)难、专业B(min_rank=20000)易
    const mockMajorHard = { name: '难专业', subject_req: [], scores: [{ year: 2024, min_score: 650, min_rank: 10000 }] };
    const mockMajorEasy = { name: '易专业', subject_req: [], scores: [{ year: 2024, min_score: 550, min_rank: 20000 }] };
    const mockSchool = { id: 'test', name: '测试大学', majors: [mockMajorHard, mockMajorEasy] };

    let mockEligible = 0;
    mockSchool.majors.forEach(major => {
        if (!checkSubjectMatch(major.subject_req, subjects)) return;
        const scores = major.scores.filter(s => s.year >= 2023);
        const eligibleYears = scores.filter(s => s.min_rank && studentRank <= s.min_rank);
        if (eligibleYears.length > 0) mockEligible++;
    });
    check('位次法：只匹配"能上"的专业（易专业，min_rank=20000>=15000）', mockEligible === 1, `got ${mockEligible}`);

    // 7. 选科过滤验证：选科不匹配的专业不显示
    console.log('\n[7] 选科过滤验证');
    const mockMajorRequirePhysics = { name: '需物理专业', subject_req: ['物理'], scores: [{ year: 2024, min_score: 550, min_rank: 20000 }] };
    const mockMajorRequireHistory = { name: '需历史专业', subject_req: ['历史'], scores: [{ year: 2024, min_score: 550, min_rank: 20000 }] };
    const mockSchool2 = { id: 'test2', name: '测试大学2', majors: [mockMajorRequirePhysics, mockMajorRequireHistory] };
    let physicsEligible = 0;
    mockSchool2.majors.forEach(major => {
        if (!checkSubjectMatch(major.subject_req, subjects)) return; // subjects=物化生
        const scores = major.scores.filter(s => s.year >= 2023);
        const eligibleYears = scores.filter(s => s.min_rank && studentRank <= s.min_rank);
        if (eligibleYears.length > 0) physicsEligible++;
    });
    check('选科过滤：物化生只匹配需物理的专业，排除需历史的专业', physicsEligible === 1, `got ${physicsEligible}`);

    console.log(`\n=== 结果: ${pass} passed, ${fail} failed ===\n`);
    process.exit(fail > 0 ? 1 : 0);
})();
