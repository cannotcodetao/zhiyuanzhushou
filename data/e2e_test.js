// 端到端数据验证：检查31省配置 + 数据文件可访问性 + 结构完整性
// 运行方式：node data/e2e_test.js（需先启动 http.server）
const http = require('http');

const BASE = 'http://127.0.0.1:8765';

// 31省代码列表（按 province-config.js 顺序）
const PROVINCES = [
    // 第一批 3+3
    '浙江', '上海',
    // 第二批 3+3
    '北京', '天津', '山东', '海南',
    // 第三批 3+1+2
    '河北', '辽宁', '江苏', '福建', '湖北', '湖南', '广东', '重庆',
    // 第四批 3+1+2
    '安徽', '江西', '广西', '吉林', '黑龙江', '甘肃', '贵州',
    // 第五批 3+1+2
    '河南', '四川', '山西', '陕西', '云南', '内蒙古', '宁夏', '青海',
    // 老高考
    '新疆', '西藏'
];

const PROVINCE_FILE = {
    '浙江': 'zhejiang-data.json', '上海': 'shanghai-data.json',
    '北京': 'beijing-data.json', '天津': 'tianjin-data.json',
    '山东': 'shandong-data.json', '海南': 'hainan-data.json',
    '河北': 'hebei-data.json', '辽宁': 'liaoning-data.json',
    '江苏': 'jiangsu-data.json', '福建': 'fujian-data.json',
    '湖北': 'hubei-data.json', '湖南': 'hunan-data.json',
    '广东': 'guangdong-data.json', '重庆': 'chongqing-data.json',
    '安徽': 'anhui-data.json', '江西': 'jiangxi-data.json',
    '广西': 'guangxi-data.json', '吉林': 'jilin-data.json',
    '黑龙江': 'heilongjiang-data.json', '甘肃': 'gansu-data.json',
    '贵州': 'guizhou-data.json', '河南': 'henan-data.json',
    '四川': 'sichuan-data.json', '山西': 'shanxi-data.json',
    '陕西': 'shaanxi-data.json', '云南': 'yunnan-data.json',
    '内蒙古': 'neimenggu-data.json', '宁夏': 'ningxia-data.json',
    '青海': 'qinghai-data.json', '新疆': 'xinjiang-data.json',
    '西藏': 'xizang-data.json'
};

function fetchJSON(path) {
    return new Promise((resolve, reject) => {
        http.get(`${BASE}/${path}`, (res) => {
            if (res.statusCode !== 200) {
                reject(new Error(`HTTP ${res.statusCode}`));
                return;
            }
            let body = '';
            res.on('data', c => body += c);
            res.on('end', () => {
                try { resolve(JSON.parse(body)); }
                catch (e) { reject(new Error(`JSON parse: ${e.message}`)); }
            });
        }).on('error', reject);
    });
}

(async () => {
    console.log(`\n=== 端到端数据验证：${PROVINCES.length}省 ===\n`);
    let ok = 0, fail = 0;
    const failures = [];

    // 1. 验证 province-config.js 可加载
    try {
        await fetchJSON('js/province-config.js');
        console.log('[OK] province-config.js 可访问');
    } catch (e) {
        console.log(`[FAIL] province-config.js: ${e.message}`);
        failures.push('province-config.js');
    }

    // 2. 并行验证31省数据文件
    const results = await Promise.all(PROVINCES.map(async (prov) => {
        const file = PROVINCE_FILE[prov];
        try {
            const data = await fetchJSON(`data/${file}`);
            // 结构校验
            if (!data.schools || !Array.isArray(data.schools)) {
                return { prov, ok: false, err: 'schools 字段缺失或非数组' };
            }
            if (data.schools.length === 0) {
                return { prov, ok: false, err: 'schools 为空' };
            }
            // 统计
            let majorCount = 0, scoreCount = 0, nullRankCount = 0, yearSet = new Set();
            data.schools.forEach(s => {
                majorCount += s.majors.length;
                s.majors.forEach(m => {
                    scoreCount += m.scores.length;
                    m.scores.forEach(sc => {
                        if (sc.year) yearSet.add(sc.year);
                        if (sc.min_rank === null || sc.min_rank === undefined || sc.min_rank <= 0) {
                            nullRankCount++;
                        }
                    });
                });
            });
            const years = [...yearSet].sort();
            const fillRate = scoreCount > 0 ? ((scoreCount - nullRankCount) / scoreCount * 100).toFixed(1) : '0';
            return {
                prov, ok: true,
                stats: {
                    schools: data.schools.length,
                    majors: majorCount,
                    scores: scoreCount,
                    years: years.join(','),
                    nullRank: nullRankCount,
                    fillRate: fillRate + '%'
                }
            };
        } catch (e) {
            return { prov, ok: false, err: e.message };
        }
    }));

    // 输出结果
    results.forEach(r => {
        if (r.ok) {
            console.log(`[OK] ${r.prov.padEnd(4)} 学校=${String(r.stats.schools).padStart(3)} 专业=${String(r.stats.majors).padStart(4)} 记录=${String(r.stats.scores).padStart(5)} 年份=[${r.stats.years}] min_rank填充率=${r.stats.fillRate}`);
            ok++;
        } else {
            console.log(`[FAIL] ${r.prov}: ${r.err}`);
            failures.push(`${r.prov}: ${r.err}`);
            fail++;
        }
    });

    console.log(`\n=== 总结：${ok}/${PROVINCES.length} 省通过 ===`);
    if (fail > 0) {
        console.log('失败列表：');
        failures.forEach(f => console.log(`  - ${f}`));
        process.exit(1);
    } else {
        console.log('✓ 全部31省数据文件验证通过');
    }
})();
