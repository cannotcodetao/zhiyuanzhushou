/**
 * 志愿智选 — 省份配置表
 * 定义各省份的高考模式、选科规则、数据源、官方信息等
 *
 * 三种高考模式：
 *   - 3+3    : 语数英 + 选考3门（自由组合），总分750
 *   - 3+1+2  : 语数英 + 首选(物理/历史)1门 + 再选(化生政地)2门，总分750
 *   - old    : 老高考文理分科（预留接口，数据待补充）
 */

const PROVINCE_CONFIG = {
    "浙江": {
        code: "zhejiang",
        examMode: "3+3",
        subjects: ["物理", "化学", "生物", "历史", "地理", "政治", "技术"],
        electiveMode: "free",
        electiveCount: 3,
        totalScore: 750,
        scoreLayout: { core: [{ name: "语文", full: 150 }, { name: "数学", full: 150 }, { name: "英语", full: 150 }], electiveFull: 100 },
        batches: ["平行录取一段", "平行录取二段"],
        dataFile: "data/zhejiang-data.json",
        officialName: "浙江省教育考试院",
        officialUrl: "www.zjzs.net",
        dataScope: "2023-2025 · 83所高校 · 2358专业 · 5927条录取记录"
    },
    "山东": {
        code: "shandong",
        examMode: "3+3",
        subjects: ["物理", "化学", "生物", "历史", "地理", "政治"],
        electiveMode: "free",
        electiveCount: 3,
        totalScore: 750,
        scoreLayout: { core: [{ name: "语文", full: 150 }, { name: "数学", full: 150 }, { name: "英语", full: 150 }], electiveFull: 100 },
        batches: ["常规批（本科）"],
        dataFile: "data/shandong-data.json",
        officialName: "山东省教育招生考试院",
        officialUrl: "www.sdzk.cn",
        dataScope: "2023-2025 · 64所高校 · 2198专业 · 5507条录取记录"
    },
    "江苏": {
        code: "jiangsu",
        examMode: "3+1+2",
        subjects: ["物理", "历史", "化学", "生物", "政治", "地理"],
        electiveMode: "layered",
        electiveCount: 3,
        firstChoice: ["物理", "历史"],
        firstChoiceCount: 1,
        secondChoice: ["化学", "生物", "政治", "地理"],
        secondChoiceCount: 2,
        totalScore: 750,
        scoreLayout: { core: [{ name: "语文", full: 150 }, { name: "数学", full: 150 }, { name: "英语", full: 150 }], electiveFull: 100 },
        batches: ["本科批"],
        dataFile: "data/jiangsu-data.json",
        officialName: "江苏省教育考试院",
        officialUrl: "www.jseea.cn",
        dataScope: "2023-2025 · 53所高校 · 764专业组 · 1137条录取记录（min_rank由一分一段表反查补全97.9%）"
    }
    // 老高考省份预留接口（数据待补充）：
    // "四川": { code:"sichuan", examMode:"old", ... }
};

// 当前选中的省份（运行时状态）
let currentProvince = "浙江";

/**
 * 获取当前省份配置
 */
function getCurrentProvinceConfig() {
    return PROVINCE_CONFIG[currentProvince];
}

/**
 * 获取当前省份的高考模式描述
 */
function getExamModeDescription(mode) {
    const map = {
        "3+3": "新高考3+3（语数英 + 选考3门自由组合）",
        "3+1+2": "新高考3+1+2（语数英 + 首选物理/历史 + 再选化生政地4选2）",
        "old": "老高考文理分科（语数英 + 文综/理综）"
    };
    return map[mode] || mode;
}

// 暴露到全局
window.PROVINCE_CONFIG = PROVINCE_CONFIG;
window.currentProvince = currentProvince;
window.getCurrentProvinceConfig = getCurrentProvinceConfig;
window.getExamModeDescription = getExamModeDescription;
