/**
 * 志愿智选 — 全国31省配置表
 * 定义各省份的高考模式、选科规则、数据源、官方信息等
 *
 * 三种高考模式：
 *   - 3+3    : 语数英 + 选考3门（自由组合），总分660/750/900
 *   - 3+1+2  : 语数英 + 首选(物理/历史)1门 + 再选(化生政地)2门，总分750
 *   - old    : 老高考文理分科（语数英 + 文综/理综），总分750
 *
 * 数据来源：各省教育考试院官方XLS/PDF（100%可追溯，详见 data/DATA_SOURCES.md）
 */

const PROVINCE_CONFIG = {
    // ===== 第一批：3+3 模式（2017年起）=====
    "浙江": {
        code: "zhejiang", examMode: "3+3",
        subjects: ["物理","化学","生物","历史","地理","政治","技术"],
        electiveMode: "free", electiveCount: 3,
        totalScore: 750,
        scoreLayout: { core: [{ name: "语文", full: 150 }, { name: "数学", full: 150 }, { name: "英语", full: 150 }], electiveFull: 100 },
        batches: ["平行录取一段","平行录取二段"],
        dataFile: "data/zhejiang-data.json",
        officialName: "浙江省教育考试院", officialUrl: "www.zjzs.net",
        dataScope: "2023-2025 · 83所高校 · 2358专业 · 5927条录取记录"
    },
    "上海": {
        code: "shanghai", examMode: "3+3",
        subjects: ["物理","化学","生物","历史","地理","政治"],
        electiveMode: "free", electiveCount: 3,
        totalScore: 660,
        scoreLayout: { core: [{ name: "语文", full: 150 }, { name: "数学", full: 150 }, { name: "英语", full: 150 }], electiveFull: 70 },
        batches: ["本科批"],
        dataFile: "data/shanghai-data.json",
        officialName: "上海市教育考试院", officialUrl: "www.shmeea.edu.cn",
        dataScope: "2023-2025 · 60所高校 · 216专业组 · 549条记录"
    },

    // ===== 第二批：3+3 模式（2020年起）=====
    "北京": {
        code: "beijing", examMode: "3+3",
        subjects: ["物理","化学","生物","历史","地理","政治"],
        electiveMode: "free", electiveCount: 3,
        totalScore: 750,
        scoreLayout: { core: [{ name: "语文", full: 150 }, { name: "数学", full: 150 }, { name: "英语", full: 150 }], electiveFull: 100 },
        batches: ["本科批"],
        dataFile: "data/beijing-data.json",
        officialName: "北京教育考试院", officialUrl: "www.bjeea.cn",
        dataScope: "2023-2025 · 90所高校 · 571专业组 · 1042条记录"
    },
    "天津": {
        code: "tianjin", examMode: "3+3",
        subjects: ["物理","化学","生物","历史","地理","政治"],
        electiveMode: "free", electiveCount: 3,
        totalScore: 750,
        scoreLayout: { core: [{ name: "语文", full: 150 }, { name: "数学", full: 150 }, { name: "英语", full: 150 }], electiveFull: 100 },
        batches: ["本科批"],
        dataFile: "data/tianjin-data.json",
        officialName: "天津市教育招生考试院", officialUrl: "www.zhaokao.net",
        dataScope: "2023-2025 · 40所高校 · 190专业组 · 396条记录"
    },
    "山东": {
        code: "shandong", examMode: "3+3",
        subjects: ["物理","化学","生物","历史","地理","政治"],
        electiveMode: "free", electiveCount: 3,
        totalScore: 750,
        scoreLayout: { core: [{ name: "语文", full: 150 }, { name: "数学", full: 150 }, { name: "英语", full: 150 }], electiveFull: 100 },
        batches: ["常规批（本科）"],
        dataFile: "data/shandong-data.json",
        officialName: "山东省教育招生考试院", officialUrl: "www.sdzk.cn",
        dataScope: "2023-2025 · 64所高校 · 2198专业 · 5507条记录"
    },
    "海南": {
        code: "hainan", examMode: "3+3",
        subjects: ["物理","化学","生物","历史","地理","政治"],
        electiveMode: "free", electiveCount: 3,
        totalScore: 900,
        scoreLayout: { core: [{ name: "语文", full: 150 }, { name: "数学", full: 150 }, { name: "英语", full: 150 }], electiveFull: 100 },
        batches: ["本科批"],
        dataFile: "data/hainan-data.json",
        officialName: "海南省考试局", officialUrl: "ea.hainan.gov.cn",
        dataScope: "2023-2025 · 63所高校 · 289专业组 · 596条记录（标准分900）"
    },

    // ===== 第三批：3+1+2 模式（2021年起）=====
    "河北": {
        code: "hebei", examMode: "3+1+2",
        subjects: ["物理","历史","化学","生物","政治","地理"],
        electiveMode: "layered", electiveCount: 3,
        firstChoice: ["物理","历史"], firstChoiceCount: 1,
        secondChoice: ["化学","生物","政治","地理"], secondChoiceCount: 2,
        totalScore: 750,
        scoreLayout: { core: [{ name: "语文", full: 150 }, { name: "数学", full: 150 }, { name: "英语", full: 150 }], electiveFull: 100 },
        batches: ["本科批"],
        dataFile: "data/hebei-data.json",
        officialName: "河北省教育考试院", officialUrl: "www.hebeea.edu.cn",
        dataScope: "2023-2025 · 69所高校 · 2928专业 · 7355条记录"
    },
    "辽宁": {
        code: "liaoning", examMode: "3+1+2",
        subjects: ["物理","历史","化学","生物","政治","地理"],
        electiveMode: "layered", electiveCount: 3,
        firstChoice: ["物理","历史"], firstChoiceCount: 1,
        secondChoice: ["化学","生物","政治","地理"], secondChoiceCount: 2,
        totalScore: 750,
        scoreLayout: { core: [{ name: "语文", full: 150 }, { name: "数学", full: 150 }, { name: "英语", full: 150 }], electiveFull: 100 },
        batches: ["本科批"],
        dataFile: "data/liaoning-data.json",
        officialName: "辽宁招生考试之窗", officialUrl: "www.lnzsks.com",
        dataScope: "2023-2025 · 64所高校 · 2443专业 · 6081条记录"
    },
    "江苏": {
        code: "jiangsu", examMode: "3+1+2",
        subjects: ["物理","历史","化学","生物","政治","地理"],
        electiveMode: "layered", electiveCount: 3,
        firstChoice: ["物理","历史"], firstChoiceCount: 1,
        secondChoice: ["化学","生物","政治","地理"], secondChoiceCount: 2,
        totalScore: 750,
        scoreLayout: { core: [{ name: "语文", full: 150 }, { name: "数学", full: 150 }, { name: "英语", full: 150 }], electiveFull: 100 },
        batches: ["本科批"],
        dataFile: "data/jiangsu-data.json",
        officialName: "江苏省教育考试院", officialUrl: "www.jseea.cn",
        dataScope: "2023-2025 · 53所高校 · 764专业组 · 1137条记录"
    },
    "福建": {
        code: "fujian", examMode: "3+1+2",
        subjects: ["物理","历史","化学","生物","政治","地理"],
        electiveMode: "layered", electiveCount: 3,
        firstChoice: ["物理","历史"], firstChoiceCount: 1,
        secondChoice: ["化学","生物","政治","地理"], secondChoiceCount: 2,
        totalScore: 750,
        scoreLayout: { core: [{ name: "语文", full: 150 }, { name: "数学", full: 150 }, { name: "英语", full: 150 }], electiveFull: 100 },
        batches: ["本科批"],
        dataFile: "data/fujian-data.json",
        officialName: "福建省教育考试院", officialUrl: "www.eeafj.cn",
        dataScope: "2023-2025 · 48所高校 · 103专业组 · 185条记录"
    },
    "湖北": {
        code: "hubei", examMode: "3+1+2",
        subjects: ["物理","历史","化学","生物","政治","地理"],
        electiveMode: "layered", electiveCount: 3,
        firstChoice: ["物理","历史"], firstChoiceCount: 1,
        secondChoice: ["化学","生物","政治","地理"], secondChoiceCount: 2,
        totalScore: 750,
        scoreLayout: { core: [{ name: "语文", full: 150 }, { name: "数学", full: 150 }, { name: "英语", full: 150 }], electiveFull: 100 },
        batches: ["本科批"],
        dataFile: "data/hubei-data.json",
        officialName: "湖北省教育考试院", officialUrl: "www.hbea.edu.cn",
        dataScope: "2023-2025 · 47所高校 · 589专业 · 728条记录"
    },
    "湖南": {
        code: "hunan", examMode: "3+1+2",
        subjects: ["物理","历史","化学","生物","政治","地理"],
        electiveMode: "layered", electiveCount: 3,
        firstChoice: ["物理","历史"], firstChoiceCount: 1,
        secondChoice: ["化学","生物","政治","地理"], secondChoiceCount: 2,
        totalScore: 750,
        scoreLayout: { core: [{ name: "语文", full: 150 }, { name: "数学", full: 150 }, { name: "英语", full: 150 }], electiveFull: 100 },
        batches: ["本科批"],
        dataFile: "data/hunan-data.json",
        officialName: "湖南省教育考试院", officialUrl: "hneeb.cn",
        dataScope: "2023-2025 · 60所高校 · 1760专业组 · 2770条记录"
    },
    "广东": {
        code: "guangdong", examMode: "3+1+2",
        subjects: ["物理","历史","化学","生物","政治","地理"],
        electiveMode: "layered", electiveCount: 3,
        firstChoice: ["物理","历史"], firstChoiceCount: 1,
        secondChoice: ["化学","生物","政治","地理"], secondChoiceCount: 2,
        totalScore: 750,
        scoreLayout: { core: [{ name: "语文", full: 150 }, { name: "数学", full: 150 }, { name: "英语", full: 150 }], electiveFull: 100 },
        batches: ["本科批"],
        dataFile: "data/guangdong-data.json",
        officialName: "广东省教育考试院", officialUrl: "eea.gd.gov.cn",
        dataScope: "2023-2025 · 72所高校 · 856专业组 · 1290条记录"
    },
    "重庆": {
        code: "chongqing", examMode: "3+1+2",
        subjects: ["物理","历史","化学","生物","政治","地理"],
        electiveMode: "layered", electiveCount: 3,
        firstChoice: ["物理","历史"], firstChoiceCount: 1,
        secondChoice: ["化学","生物","政治","地理"], secondChoiceCount: 2,
        totalScore: 750,
        scoreLayout: { core: [{ name: "语文", full: 150 }, { name: "数学", full: 150 }, { name: "英语", full: 150 }], electiveFull: 100 },
        batches: ["本科批"],
        dataFile: "data/chongqing-data.json",
        officialName: "重庆市教育考试院", officialUrl: "www.cqksy.cn",
        dataScope: "2023-2025 · 46所高校 · 2023专业 · 3598条记录"
    },

    // ===== 第四批：3+1+2 模式（2024年首届）=====
    "安徽": {
        code: "anhui", examMode: "3+1+2",
        subjects: ["物理","历史","化学","生物","政治","地理"],
        electiveMode: "layered", electiveCount: 3,
        firstChoice: ["物理","历史"], firstChoiceCount: 1,
        secondChoice: ["化学","生物","政治","地理"], secondChoiceCount: 2,
        totalScore: 750,
        scoreLayout: { core: [{ name: "语文", full: 150 }, { name: "数学", full: 150 }, { name: "英语", full: 150 }], electiveFull: 100 },
        batches: ["本科批"],
        dataFile: "data/anhui-data.json",
        officialName: "安徽省教育招生考试院", officialUrl: "www.ahzsks.cn",
        dataScope: "2024-2025 · 31所高校 · 169专业组 · 218条记录"
    },
    "江西": {
        code: "jiangxi", examMode: "3+1+2",
        subjects: ["物理","历史","化学","生物","政治","地理"],
        electiveMode: "layered", electiveCount: 3,
        firstChoice: ["物理","历史"], firstChoiceCount: 1,
        secondChoice: ["化学","生物","政治","地理"], secondChoiceCount: 2,
        totalScore: 750,
        scoreLayout: { core: [{ name: "语文", full: 150 }, { name: "数学", full: 150 }, { name: "英语", full: 150 }], electiveFull: 100 },
        batches: ["本科批"],
        dataFile: "data/jiangxi-data.json",
        officialName: "江西省教育考试院", officialUrl: "www.jxeea.cn",
        dataScope: "2024-2025 · 59所高校 · 194专业组 · 238条记录"
    },
    "广西": {
        code: "guangxi", examMode: "3+1+2",
        subjects: ["物理","历史","化学","生物","政治","地理"],
        electiveMode: "layered", electiveCount: 3,
        firstChoice: ["物理","历史"], firstChoiceCount: 1,
        secondChoice: ["化学","生物","政治","地理"], secondChoiceCount: 2,
        totalScore: 750,
        scoreLayout: { core: [{ name: "语文", full: 150 }, { name: "数学", full: 150 }, { name: "英语", full: 150 }], electiveFull: 100 },
        batches: ["本科批"],
        dataFile: "data/guangxi-data.json",
        officialName: "广西招生考试院", officialUrl: "www.gxeea.cn",
        dataScope: "2024-2025 · 50所高校 · 684专业组 · 900条记录"
    },
    "吉林": {
        code: "jilin", examMode: "3+1+2",
        subjects: ["物理","历史","化学","生物","政治","地理"],
        electiveMode: "layered", electiveCount: 3,
        firstChoice: ["物理","历史"], firstChoiceCount: 1,
        secondChoice: ["化学","生物","政治","地理"], secondChoiceCount: 2,
        totalScore: 750,
        scoreLayout: { core: [{ name: "语文", full: 150 }, { name: "数学", full: 150 }, { name: "英语", full: 150 }], electiveFull: 100 },
        batches: ["本科批"],
        dataFile: "data/jilin-data.json",
        officialName: "吉林省教育考试院", officialUrl: "www.jleea.edu.cn",
        dataScope: "2024-2025 · 47所高校 · 129专业组 · 233条记录"
    },
    "黑龙江": {
        code: "heilongjiang", examMode: "3+1+2",
        subjects: ["物理","历史","化学","生物","政治","地理"],
        electiveMode: "layered", electiveCount: 3,
        firstChoice: ["物理","历史"], firstChoiceCount: 1,
        secondChoice: ["化学","生物","政治","地理"], secondChoiceCount: 2,
        totalScore: 750,
        scoreLayout: { core: [{ name: "语文", full: 150 }, { name: "数学", full: 150 }, { name: "英语", full: 150 }], electiveFull: 100 },
        batches: ["本科批"],
        dataFile: "data/heilongjiang-data.json",
        officialName: "黑龙江省招生考试院", officialUrl: "www.lzk.hl.cn",
        dataScope: "2024-2025 · 43所高校 · 147专业组 · 287条记录"
    },
    "甘肃": {
        code: "gansu", examMode: "3+1+2",
        subjects: ["物理","历史","化学","生物","政治","地理"],
        electiveMode: "layered", electiveCount: 3,
        firstChoice: ["物理","历史"], firstChoiceCount: 1,
        secondChoice: ["化学","生物","政治","地理"], secondChoiceCount: 2,
        totalScore: 750,
        scoreLayout: { core: [{ name: "语文", full: 150 }, { name: "数学", full: 150 }, { name: "英语", full: 150 }], electiveFull: 100 },
        batches: ["本科批"],
        dataFile: "data/gansu-data.json",
        officialName: "甘肃省教育考试院", officialUrl: "www.ganseea.cn",
        dataScope: "2024-2025 · 41所高校 · 758专业组 · 793条记录"
    },
    "贵州": {
        code: "guizhou", examMode: "3+1+2",
        subjects: ["物理","历史","化学","生物","政治","地理"],
        electiveMode: "layered", electiveCount: 3,
        firstChoice: ["物理","历史"], firstChoiceCount: 1,
        secondChoice: ["化学","生物","政治","地理"], secondChoiceCount: 2,
        totalScore: 750,
        scoreLayout: { core: [{ name: "语文", full: 150 }, { name: "数学", full: 150 }, { name: "英语", full: 150 }], electiveFull: 100 },
        batches: ["本科批"],
        dataFile: "data/guizhou-data.json",
        officialName: "贵州省招生考试院", officialUrl: "www.eaagz.org",
        dataScope: "2024-2025 · 46所高校 · 1603专业 · 2660条记录"
    },

    // ===== 第五批：3+1+2 模式（2025年首届）=====
    "山西": {
        code: "shanxi", examMode: "3+1+2",
        subjects: ["物理","历史","化学","生物","政治","地理"],
        electiveMode: "layered", electiveCount: 3,
        firstChoice: ["物理","历史"], firstChoiceCount: 1,
        secondChoice: ["化学","生物","政治","地理"], secondChoiceCount: 2,
        totalScore: 750,
        scoreLayout: { core: [{ name: "语文", full: 150 }, { name: "数学", full: 150 }, { name: "英语", full: 150 }], electiveFull: 100 },
        batches: ["本科批"],
        dataFile: "data/shanxi-data.json",
        officialName: "山西省招生考试管理中心", officialUrl: "www.sxkszx.cn",
        dataScope: "2025 · 48所高校 · 487专业组 · 487条记录"
    },
    "河南": {
        code: "henan", examMode: "3+1+2",
        subjects: ["物理","历史","化学","生物","政治","地理"],
        electiveMode: "layered", electiveCount: 3,
        firstChoice: ["物理","历史"], firstChoiceCount: 1,
        secondChoice: ["化学","生物","政治","地理"], secondChoiceCount: 2,
        totalScore: 750,
        scoreLayout: { core: [{ name: "语文", full: 150 }, { name: "数学", full: 150 }, { name: "英语", full: 150 }], electiveFull: 100 },
        batches: ["本科批"],
        dataFile: "data/henan-data.json",
        officialName: "河南省招生办公室", officialUrl: "www.heao.gov.cn",
        dataScope: "2025 · 49所高校 · 73专业组 · 73条记录"
    },
    "陕西": {
        code: "shaanxi", examMode: "3+1+2",
        subjects: ["物理","历史","化学","生物","政治","地理"],
        electiveMode: "layered", electiveCount: 3,
        firstChoice: ["物理","历史"], firstChoiceCount: 1,
        secondChoice: ["化学","生物","政治","地理"], secondChoiceCount: 2,
        totalScore: 750,
        scoreLayout: { core: [{ name: "语文", full: 150 }, { name: "数学", full: 150 }, { name: "英语", full: 150 }], electiveFull: 100 },
        batches: ["本科批"],
        dataFile: "data/shaanxi-data.json",
        officialName: "陕西省教育考试院", officialUrl: "www.sneac.com",
        dataScope: "2025 · 32所高校 · 163专业组 · 163条记录"
    },
    "内蒙古": {
        code: "neimenggu", examMode: "3+1+2",
        subjects: ["物理","历史","化学","生物","政治","地理"],
        electiveMode: "layered", electiveCount: 3,
        firstChoice: ["物理","历史"], firstChoiceCount: 1,
        secondChoice: ["化学","生物","政治","地理"], secondChoiceCount: 2,
        totalScore: 750,
        scoreLayout: { core: [{ name: "语文", full: 150 }, { name: "数学", full: 150 }, { name: "英语", full: 150 }], electiveFull: 100 },
        batches: ["本科批"],
        dataFile: "data/neimenggu-data.json",
        officialName: "内蒙古教育招生考试中心", officialUrl: "www.nm.zsks.cn",
        dataScope: "2025 · 63所高校 · 559专业组 · 559条记录"
    },
    "四川": {
        code: "sichuan", examMode: "3+1+2",
        subjects: ["物理","历史","化学","生物","政治","地理"],
        electiveMode: "layered", electiveCount: 3,
        firstChoice: ["物理","历史"], firstChoiceCount: 1,
        secondChoice: ["化学","生物","政治","地理"], secondChoiceCount: 2,
        totalScore: 750,
        scoreLayout: { core: [{ name: "语文", full: 150 }, { name: "数学", full: 150 }, { name: "英语", full: 150 }], electiveFull: 100 },
        batches: ["本科批"],
        dataFile: "data/sichuan-data.json",
        officialName: "四川省教育考试院", officialUrl: "www.sceea.cn",
        dataScope: "2025 · 34所高校 · 396专业组 · 396条记录"
    },
    "云南": {
        code: "yunnan", examMode: "3+1+2",
        subjects: ["物理","历史","化学","生物","政治","地理"],
        electiveMode: "layered", electiveCount: 3,
        firstChoice: ["物理","历史"], firstChoiceCount: 1,
        secondChoice: ["化学","生物","政治","地理"], secondChoiceCount: 2,
        totalScore: 750,
        scoreLayout: { core: [{ name: "语文", full: 150 }, { name: "数学", full: 150 }, { name: "英语", full: 150 }], electiveFull: 100 },
        batches: ["本科批"],
        dataFile: "data/yunnan-data.json",
        officialName: "云南省招生考试院", officialUrl: "www.ynzs.cn",
        dataScope: "2025 · 30所高校 · 1433专业 · 1433条记录"
    },
    "宁夏": {
        code: "ningxia", examMode: "3+1+2",
        subjects: ["物理","历史","化学","生物","政治","地理"],
        electiveMode: "layered", electiveCount: 3,
        firstChoice: ["物理","历史"], firstChoiceCount: 1,
        secondChoice: ["化学","生物","政治","地理"], secondChoiceCount: 2,
        totalScore: 750,
        scoreLayout: { core: [{ name: "语文", full: 150 }, { name: "数学", full: 150 }, { name: "英语", full: 150 }], electiveFull: 100 },
        batches: ["本科批"],
        dataFile: "data/ningxia-data.json",
        officialName: "宁夏教育考试院", officialUrl: "www.nxjyks.cn",
        dataScope: "2025 · 57所高校 · 121专业组 · 121条记录"
    },
    "青海": {
        code: "qinghai", examMode: "3+1+2",
        subjects: ["物理","历史","化学","生物","政治","地理"],
        electiveMode: "layered", electiveCount: 3,
        firstChoice: ["物理","历史"], firstChoiceCount: 1,
        secondChoice: ["化学","生物","政治","地理"], secondChoiceCount: 2,
        totalScore: 750,
        scoreLayout: { core: [{ name: "语文", full: 150 }, { name: "数学", full: 150 }, { name: "英语", full: 150 }], electiveFull: 100 },
        batches: ["本科批"],
        dataFile: "data/qinghai-data.json",
        officialName: "青海省教育考试院", officialUrl: "www.qhjyks.com",
        dataScope: "2025 · 37所高校 · 82专业组 · 82条记录"
    },

    // ===== 老高考文理分科 =====
    "新疆": {
        code: "xinjiang", examMode: "old",
        subjects: ["文科","理科"],
        electiveMode: "old",
        totalScore: 750,
        scoreLayout: { core: [{ name: "语文", full: 150 }, { name: "数学", full: 150 }, { name: "英语", full: 150 }], electiveFull: 300 },
        batches: ["本科一批","本科二批"],
        dataFile: "data/xinjiang-data.json",
        officialName: "新疆教育考试院", officialUrl: "www.xjzk.gov.cn",
        dataScope: "2023-2025 · 49所高校 · 84专业 · 252条记录（老高考文理分科）"
    },
    "西藏": {
        code: "xizang", examMode: "old",
        subjects: ["文科","理科"],
        electiveMode: "old",
        totalScore: 750,
        scoreLayout: { core: [{ name: "语文", full: 150 }, { name: "数学", full: 150 }, { name: "英语", full: 150 }], electiveFull: 300 },
        batches: ["本科一批","本科二批"],
        dataFile: "data/xizang-data.json",
        officialName: "西藏教育考试院", officialUrl: "edu.xizang.gov.cn",
        dataScope: "2023-2025 · 50所高校 · 83专业 · 249条记录（老高考文理分科）"
    }
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

/**
 * 获取所有省份名称列表（按批次排序）
 */
function getAllProvinceNames() {
    return Object.keys(PROVINCE_CONFIG);
}

// 暴露到全局
window.PROVINCE_CONFIG = PROVINCE_CONFIG;
window.currentProvince = currentProvince;
window.getCurrentProvinceConfig = getCurrentProvinceConfig;
window.getExamModeDescription = getExamModeDescription;
window.getAllProvinceNames = getAllProvinceNames;
