/**
 * 志愿智选 — 高考志愿智能规划系统
 * MVP v1.0 — 浙江省新高考3+3模式
 */

// ===== 全局状态 =====
let allData = null;          // 完整录取数据
let recommendResult = null;  // 推荐结果
let wishList = [];           // 志愿表

// ===== 1. 数据加载 =====

async function loadData() {
    const loadingText = document.getElementById('loadingText');
    const errorText = document.getElementById('errorText');
    loadingText.style.display = 'block';
    errorText.style.display = 'none';

    try {
        const response = await fetch('data/zhejiang-data.json');
        if (!response.ok) throw new Error('数据加载失败');
        allData = await response.json();
        loadingText.style.display = 'none';
        populateCityFilter();
        return true;
    } catch (err) {
        loadingText.style.display = 'none';
        errorText.textContent = '数据加载失败：' + err.message + '。请确保通过本地服务器访问（不要直接打开HTML文件）。';
        errorText.style.display = 'block';
        return false;
    }
}

// 填充城市筛选下拉框
function populateCityFilter() {
    if (!allData) return;
    const cities = [...new Set(allData.schools.map(s => s.city))].sort();
    const select = document.getElementById('filterCity');
    cities.forEach(city => {
        const option = document.createElement('option');
        option.value = city;
        option.textContent = city;
        select.appendChild(option);
    });
}

// ===== 2. 表单处理 =====

// 选科数量校验
function setupSubjectSelector() {
    const checkboxes = document.querySelectorAll('#subjectSelector input[type="checkbox"]');
    const hint = document.getElementById('subjectHint');

    checkboxes.forEach(cb => {
        cb.addEventListener('change', () => {
            const checked = document.querySelectorAll('#subjectSelector input:checked');
            if (checked.length > 3) {
                cb.checked = false;
                hint.textContent = '最多只能选择3门科目';
                hint.style.color = '#dc2626';
            } else if (checked.length === 3) {
                hint.textContent = '已选择3门：' + Array.from(checked).map(c => c.value).join('、');
                hint.style.color = '#16a34a';
            } else {
                hint.textContent = `已选择${checked.length}门，还需选择${3 - checked.length}门`;
                hint.style.color = '#64748b';
            }
        });
    });
}

// 获取表单数据
function getFormData() {
    const score = parseInt(document.getElementById('score').value);
    const rank = parseInt(document.getElementById('rank').value);
    const subjects = Array.from(document.querySelectorAll('#subjectSelector input:checked')).map(c => c.value);
    const category = document.getElementById('category').value;
    const cityPref = document.getElementById('cityPref').value;
    const batch = document.getElementById('batch').value;

    return { score, rank, subjects, category, cityPref, batch };
}

// 表单验证
function validateForm(data) {
    if (!data.score || data.score < 0 || data.score > 750) {
        return '请输入有效的高考总分（0-750）';
    }
    if (!data.rank || data.rank < 1) {
        return '请输入有效的全省位次';
    }
    if (data.subjects.length !== 3) {
        return '请选择3门选考科目';
    }
    return null;
}

// ===== 3. 推荐算法 =====

/**
 * 核心推荐算法：冲稳保
 * 位次法：考生位次越小（排名越靠前），成绩越好
 * 冲刺校：专业往年录取位次 < 考生位次 × 0.95（专业要求更高）
 * 稳妥校：专业往年录取位次在考生位次 × 0.95~1.10 之间
 * 保底校：专业往年录取位次 > 考生位次 × 1.10（专业要求更低）
 */
function generateRecommendations(formData) {
    const { rank, subjects, category, cityPref, batch } = formData;

    // 收集所有符合条件的专业
    const candidates = [];

    allData.schools.forEach(school => {
        // 城市筛选
        if (cityPref && school.city !== cityPref) return;

        school.majors.forEach(major => {
            // 专业类别筛选
            if (category && major.category !== category) return;

            // 选科匹配检查
            if (!checkSubjectMatch(major.subject_req, subjects)) return;

            // 获取近3年录取数据
            const scores = major.scores.filter(s => s.year >= 2023);
            if (scores.length === 0) return;

            // 计算平均位次（加权：最近年份权重高）
            const avgRank = weightedAverageRank(scores);
            if (!avgRank || avgRank <= 0) return;

            // 计算录取概率
            const probability = calculateProbability(rank, avgRank);

            // 判断冲稳保类别
            const tier = determineTier(rank, avgRank);

            // 生成推荐理由
            const reason = generateReason(school, major, avgRank, rank, probability);

            candidates.push({
                schoolId: school.id,
                schoolName: school.name,
                schoolCity: school.city,
                schoolProvince: school.province,
                schoolLevel: school.level,
                schoolTags: school.tags,
                majorName: major.name,
                majorCategory: major.category,
                subjectReq: major.subject_req,
                scores: scores,
                avgRank: avgRank,
                avgScore: Math.round(scores.reduce((sum, s) => sum + s.min_score, 0) / scores.length),
                probability: probability,
                tier: tier,
                reason: reason
            });
        });
    });

    // 按位次排序（位次越小越难进）
    candidates.sort((a, b) => a.avgRank - b.avgRank);

    // 分组：冲3 + 稳5 + 保3
    const chong = candidates.filter(c => c.tier === 'chong').slice(0, 3);
    const wen = candidates.filter(c => c.tier === 'wen').slice(0, 5);
    const bao = candidates.filter(c => c.tier === 'bao').slice(0, 3);

    // 如果某档不足，从相邻档补
    fillTiers(chong, wen, bao, candidates);

    // 生成专业选择建议
    const advice = generateAdvice(candidates, subjects);

    return { chong, wen, bao, advice, totalCount: candidates.length };
}

// 选科匹配检查
function checkSubjectMatch(requirement, studentSubjects) {
    // 不限选科的专业，所有人都能报
    if (!requirement || requirement.length === 0) return true;
    // 考生的选科必须包含专业要求的所有科目
    return requirement.every(req => studentSubjects.includes(req));
}

// 加权平均位次（最近年份权重高）
function weightedAverageRank(scores) {
    const weights = { 2025: 3, 2024: 2, 2023: 1 };
    let totalWeight = 0;
    let weightedSum = 0;
    let hasData = false;

    scores.forEach(s => {
        const w = weights[s.year] || 1;
        if (s.min_rank > 0) {
            weightedSum += s.min_rank * w;
            totalWeight += w;
            hasData = true;
        }
    });

    return hasData ? Math.round(weightedSum / totalWeight) : null;
}

// 录取概率计算
function calculateProbability(studentRank, majorRank) {
    if (majorRank <= 0) return 0;

    // 位次差比例
    const ratio = studentRank / majorRank;

    // ratio < 0.7: 考生位次远高于专业要求（位次数更小），录取概率极高
    // ratio 0.7-0.95: 冲刺区间
    // ratio 0.95-1.10: 稳妥区间
    // ratio > 1.10: 保底区间

    if (ratio < 0.5) return 98;
    if (ratio < 0.7) return 90;
    if (ratio < 0.85) return 70;
    if (ratio < 0.95) return 45;
    if (ratio < 1.0) return 60;
    if (ratio < 1.05) return 75;
    if (ratio < 1.10) return 85;
    if (ratio < 1.20) return 92;
    if (ratio < 1.35) return 96;
    return 98;
}

// 判断冲稳保类别
function determineTier(studentRank, majorRank) {
    const ratio = studentRank / majorRank;

    // 冲刺：专业录取位次比考生位次高（更难进）
    // ratio < 0.95 表示考生位次数 > 专业位次数 × 0.95，即专业要求更高
    if (ratio < 0.95) return 'chong';

    // 稳妥：位次相当
    if (ratio >= 0.95 && ratio < 1.10) return 'wen';

    // 保底：专业录取位次比考生位次低（更容易进）
    return 'bao';
}

// 填充不足的档位
function fillTiers(chong, wen, bao, all) {
    // 如果冲刺不足3个，从稳妥中补
    if (chong.length < 3) {
        const need = 3 - chong.length;
        const fromWen = wen.splice(0, need);
        chong.push(...fromWen);
    }
    // 如果保底不足3个，从稳妥中补
    if (bao.length < 3) {
        const need = 3 - bao.length;
        const fromWen = wen.splice(-need, need);
        bao.unshift(...fromWen);
    }
}

// 生成推荐理由
function generateReason(school, major, majorRank, studentRank, prob) {
    const ratio = studentRank / majorRank;
    const yearInfo = major.scores.map(s => `${s.year}年最低位次${s.min_rank}`).join('，');

    let tierDesc = '';
    if (ratio < 0.95) {
        tierDesc = `该专业近3年平均录取位次为${majorRank}，高于你的位次${studentRank}，有一定冲刺难度，录取概率约${prob}%。`;
    } else if (ratio < 1.10) {
        tierDesc = `该专业近3年平均录取位次为${majorRank}，与你的位次${studentRank}相当，录取概率约${prob}%，较为稳妥。`;
    } else {
        tierDesc = `该专业近3年平均录取位次为${majorRank}，低于你的位次${studentRank}，录取概率约${prob}%，可作为保底选择。`;
    }

    const tagInfo = school.tags.length > 0 ? `【${school.tags.join('/')}】` : '';
    return `${tagInfo}${school.city}的${school.name}${major.name}专业，${tierDesc}（${yearInfo}）`;
}

// 生成专业选择建议（三方向：政策/就业/兴趣 + 概览）
function generateAdvice(candidates, subjects) {
    // ===== 概览：原有分析 =====
    const overview = [];

    // 统计各类别专业数量
    const categoryCount = {};
    candidates.forEach(c => {
        categoryCount[c.majorCategory] = (categoryCount[c.majorCategory] || 0) + 1;
    });
    const sortedCategories = Object.entries(categoryCount).sort((a, b) => b[1] - a[1]);

    if (sortedCategories.length > 0) {
        overview.push({
            title: '可报专业类别分析',
            content: `根据你的选科（${subjects.join('、')}），共匹配到${candidates.length}个可报专业。` +
                     `其中${sortedCategories.map(c => `${c[0]}（${c[1]}个）`).join('、')}。`
        });
    }

    // 选科优势分析
    const hasPhysics = subjects.includes('物理');
    const hasChemistry = subjects.includes('化学');
    const hasHistory = subjects.includes('历史');
    const hasBio = subjects.includes('生物');
    const hasGeo = subjects.includes('地理');
    const hasTech = subjects.includes('技术');
    const hasPol = subjects.includes('政治');

    if (hasPhysics && hasChemistry) {
        overview.push({
            title: '选科优势',
            content: '你选考了物理和化学，可报考绝大多数理工科和医学专业，专业选择面最广。建议重点关注计算机、电子信息、人工智能等热门工科专业。'
        });
    } else if (hasPhysics) {
        overview.push({
            title: '选科优势',
            content: '你选考了物理，可报考大部分理工科专业。但部分医学和化学相关专业可能要求化学，建议关注计算机、机械、电气等工科方向。'
        });
    } else if (hasHistory) {
        overview.push({
            title: '选科优势',
            content: '你选考了历史，适合报考文史类、法学、新闻传播、教育学等专业。建议结合自身兴趣和就业前景选择。'
        });
    }

    overview.push({
        title: '填报策略建议',
        content: '建议按照"冲3-稳5-保3"的比例填报志愿，确保最后一个保底志愿的录取概率在90%以上。' +
                 '同时注意专业服从调剂，避免退档风险。建议将最想去的学校和专业放在前面。'
    });

    // ===== 方向一：政策导向（国家战略急需） =====
    // 数据来源：教育部《普通高等学校本科专业目录（2025年/2026年）》、工信部2026年新增专业、国家战略性新兴产业分类
    const policyRecommendations = [
        { name: '集成电路设计与集成系统', field: '集成电路', reason: '国家大基金三期重点投向，半导体人才缺口超30万，工信部直属高校首批增设', source: '教育部2024年度新专业/工信部2026' },
        { name: '人工智能', field: '新一代信息技术', reason: '《新一代人工智能发展规划》核心专业，大模型、具身智能、AI for Science 急需方向', source: '国务院2017规划/教育部2025' },
        { name: '量子信息科学', field: '量子科技', reason: '"十四五"量子信息重大科技基础设施投入超百亿，中科大、清华等本硕博贯通培养', source: '教育部2021新增/工信部2026' },
        { name: '新能源科学与工程', field: '新能源', reason: '双碳目标核心支撑，2030年碳达峰承诺下新能源装机年增超1亿千瓦', source: '国家发改委/麦可思2025绿牌' },
        { name: '微电子科学与工程', field: '半导体', reason: '芯片自给率目标70%→更高，卡脖子突围主战场，2025届高薪榜第1名（7814元/月）', source: '教育部/麦可思2025' },
        { name: '低空技术与工程', field: '低空经济', reason: '2025年政府工作报告重点，万亿级新赛道，北航等6所高校超常增设', source: '教育部2024超常设置专业' },
        { name: '具身智能', field: '人工智能', reason: '2025年政府工作报告提出，北航、北理工、哈工大、南航等2026年首批增设', source: '工信部2026年新增专业' },
        { name: '生物制药', field: '生物医药', reason: '国家战略性新兴产业，创新药物研发缺口大，后疫情时代持续升温', source: '国家战略性新兴产业分类' },
        { name: '碳中和科学与工程', field: '绿色低碳', reason: '双碳目标急需，教育部2025年新增专业，北理工等首批设置', source: '教育部2025年新增专业' },
        { name: '储能科学与工程', field: '新能源', reason: '新型储能被列入战略新兴产业，宁德时代、比亚迪等企业高薪抢人', source: '国家发改委/工信部2026' }
    ];

    // 筛选：优先推荐用户可报（选科匹配）的政策导向专业
    const policyMatched = policyRecommendations.filter(p => {
        // 简化匹配：物化方向的专业要求物化同选
        if (['集成电路设计与集成系统','人工智能','量子信息科学','微电子科学与工程','低空技术与工程','具身智能','储能科学与工程','新能源科学与工程','碳中和科学与工程'].includes(p.name)) {
            return hasPhysics && hasChemistry;
        }
        if (p.name === '生物制药') return hasChemistry && hasBio;
        return true;
    });

    const policy = {
        title: '跟随国家战略 · 政策导向',
        icon: '-policy',
        description: '紧扣"新质生产力"与国家战略急需，对接九大战略性新兴产业与六大未来产业。教育部2025年新增29种、2026年新增38种本科专业，重点布局集成电路、人工智能、量子科技、新能源、低空经济、具身智能等领域。',
        source: '教育部《普通高等学校本科专业目录（2025/2026年）》、工信部直属高校2026年新增专业、国家发改委战略性新兴产业分类',
        recommendations: policyMatched.length > 0 ? policyMatched : policyRecommendations.slice(0, 6),
        matchNote: policyMatched.length > 0
            ? `根据你的选科（${subjects.join('、')}），以下${policyMatched.length}个政策导向专业你具备报考资格：`
            : '以下为政策导向重点专业（请注意核对你是否满足选科要求）：'
    };

    // ===== 方向二：就业导向（麦可思2025报告） =====
    // 数据来源：麦可思《2025年中国本科生就业报告》（2024届毕业生数据）
    const employment = {
        title: '跟随就业市场 · 就业导向',
        icon: 'employment',
        description: '基于麦可思《2025年中国本科生就业报告》（样本19.5万人，覆盖522个本科专业），从就业落实率、薪资水平、就业满意度三维度评估。',
        source: '麦可思研究院《2025年中国本科生就业报告》（2024届毕业生跟踪评价）',
        greenCards: [
            { name: '电气工程及其自动化', salary: '6971元', note: '近5年4次绿牌，工作相关度86%，满意度85%' },
            { name: '微电子科学与工程', salary: '7282元', note: '近5年4次绿牌，2024届月收入全国第2' },
            { name: '机械电子工程', salary: '7018元', note: '近5年3次绿牌，智能制造需求旺盛' },
            { name: '新能源科学与工程', salary: '—', note: '近5年首入绿牌，双碳目标驱动' },
            { name: '车辆工程', salary: '—', note: '近5年首次绿牌，新能源汽车产业爆发' },
            { name: '机器人工程', salary: '—', note: '近5年首入绿牌，工业机器人普及' }
        ],
        highSalary: [
            { name: '微电子科学与工程', salary: '7814元', rank: 'No.1' },
            { name: '电子科学与技术', salary: '7752元', rank: 'No.2' },
            { name: '自动化', salary: '7573元', rank: 'No.3' },
            { name: '信息安全', salary: '—', rank: 'No.4' },
            { name: '光电信息科学与工程', salary: '7525元', rank: 'No.5' },
            { name: '通信工程', salary: '7249元', rank: 'No.10' }
        ],
        redCards: [
            { name: '公共事业管理', note: '2025年首次红牌，10年撤销150个布点' },
            { name: '音乐表演', note: '近5年4次红牌，就业渠道狭窄' },
            { name: '绘画', note: '连续5年红牌，纯艺术需求有限' },
            { name: '法学', note: '连续5年红牌，法考通过率低+供给过剩' },
            { name: '美术学', note: '近2年红牌，岗位匹配度低' }
        ],
        trendNote: '重要趋势：计算机科学与技术、软件工程已跌出2025届高薪Top10。互联网行业进入成熟期，供给过剩（2024年计算机类毕业生近70万），而电子信息类（微电子/电子科学/光电/通信）全面霸榜。'
    };

    // ===== 方向三：兴趣导向（基于选科推导） =====
    let interestTrack = '';
    let interestDesc = '';
    let interestRecommendations = [];

    if (hasPhysics && hasChemistry && hasBio) {
        interestTrack = '医学/科研方向';
        interestDesc = '你的选科（物+化+生）是医学和生命科学的标准配置，适合对生命现象、疾病诊疗、科学探究有强烈兴趣的考生。';
        interestRecommendations = [
            { name: '临床医学', reason: '直接救死扶伤，专业壁垒高，社会需求刚性' },
            { name: '口腔医学', reason: '工作节奏可控，自主创业空间大' },
            { name: '生物科学', reason: '科研导向，可深造读博进入高校或研究所' },
            { name: '基础医学', reason: '适合热爱科研、愿长期投入的考生' },
            { name: '药学', reason: '医药产业人才缺口大，研发方向薪资优' }
        ];
    } else if (hasPhysics && hasChemistry && hasGeo) {
        interestTrack = '工科应用方向';
        interestDesc = '你的选科（物+化+地）兼具理工基础与地理视野，适合对工程技术、自然资源、地球科学感兴趣的考生。';
        interestRecommendations = [
            { name: '计算机科学与技术', reason: '逻辑思维导向，创造数字产品' },
            { name: '电子信息工程', reason: '软硬件结合，万物互联时代核心' },
            { name: '土木工程', reason: '空间建构兴趣，基础设施建设刚需' },
            { name: '地质工程', reason: '结合地理优势，能源与矿产勘查' },
            { name: '环境工程', reason: '生态保护导向，双碳时代新机遇' }
        ];
    } else if (hasPhysics && hasChemistry && hasTech) {
        interestTrack = '信息技术方向';
        interestDesc = '你的选科（物+化+技）是信息技术时代的黄金组合，适合对编程、算法、智能系统有浓厚兴趣的考生。';
        interestRecommendations = [
            { name: '人工智能', reason: '前沿技术，AI for Science 新范式' },
            { name: '软件工程', reason: '系统化构建数字产品，创业门槛低' },
            { name: '网络空间安全', reason: '数字时代守护者，国家战略急需' },
            { name: '数据科学与大数据技术', reason: '数据驱动决策，各行各业都需要' },
            { name: '物联网工程', reason: '连接物理与数字世界，应用场景广' }
        ];
    } else if (hasPhysics && hasGeo && hasTech) {
        interestTrack = '地理信息方向';
        interestDesc = '你的选科（物+地+技）适合对空间数据、智慧城市、地理技术感兴趣的考生。';
        interestRecommendations = [
            { name: '地理信息科学', reason: 'GIS技术核心，地图/导航/智慧城市基础' },
            { name: '遥感科学与技术', reason: '对地观测，自然资源与环境监测' },
            { name: '城乡规划', reason: '空间规划创造宜居城市' },
            { name: '测绘工程', reason: '精准定位，北斗产业核心' },
            { name: '智能建造', reason: '建筑+AI，传统行业升级' }
        ];
    } else if (hasHistory && hasGeo && hasPol) {
        interestTrack = '人文社科方向';
        interestDesc = '你的选科（史+地+政）是传统文科核心组合，适合对社会、文化、治理有深度兴趣的考生。';
        interestRecommendations = [
            { name: '法学', reason: '逻辑与正义结合，司法考试是关键门槛（注意：近5年红牌，需谨慎）' },
            { name: '新闻传播学', reason: '信息时代的内容创造者与传播者' },
            { name: '汉语言文学', reason: '文化底蕴深厚，教育/传媒/文秘通吃' },
            { name: '国际政治', reason: '全球视野，外交/智库/国际组织方向' },
            { name: '社会学', reason: '理解社会运行，适合做调研与政策研究' }
        ];
    } else if (hasHistory && hasBio && hasGeo) {
        interestTrack = '教育/心理方向';
        interestDesc = '你的选科（史+生+地）适合对人的发展、教育、自然环境感兴趣的考生。';
        interestRecommendations = [
            { name: '教育学', reason: '热爱教育事业，师范类首选' },
            { name: '心理学', reason: '理解人心，咨询/HR/用户体验皆可' },
            { name: '学前教育', reason: '低龄教育，耐心与创意并重' },
            { name: '社会工作', reason: '助人专业，社区/公益/民政方向' },
            { name: '旅游管理', reason: '地理优势+人文素养，文旅融合新机遇' }
        ];
    } else if (hasChemistry && hasBio && hasGeo) {
        interestTrack = '环境/生态方向';
        interestDesc = '你的选科（化+生+地）适合对生态环境保护、农业、生命科学感兴趣的考生。';
        interestRecommendations = [
            { name: '环境科学', reason: '双碳时代核心，污染防治与生态修复' },
            { name: '生态学', reason: '生态文明建设基础学科' },
            { name: '农学', reason: '粮食安全国之大者，乡村振兴战略' },
            { name: '食品科学与工程', reason: '民以食为天，食品安全刚需' },
            { name: '园林', reason: '植物+设计，城市绿化与景观营造' }
        ];
    } else if (hasPhysics && hasChemistry) {
        interestTrack = '理工科方向';
        interestDesc = '你的选科（含物+化）是理工科的万能钥匙，适合对工程、技术、物质科学感兴趣的考生。';
        interestRecommendations = [
            { name: '机械工程', reason: '工业之母，智能制造升级核心' },
            { name: '材料科学与工程', reason: '一切制造的根基，2025届高薪第9（7304元）' },
            { name: '化学工程与工艺', reason: '物质转化之学，新能源材料必备' },
            { name: '电气工程及其自动化', reason: '近5年4次绿牌，电网/能源稳定就业' },
            { name: '能源与动力工程', reason: '能源转型主力，近5年3次绿牌' }
        ];
    } else if (hasHistory) {
        interestTrack = '文史方向';
        interestDesc = '你的选科（含历史）适合对人文、社会、文化有深度兴趣的考生。建议结合就业前景理性选择。';
        interestRecommendations = [
            { name: '汉语言文学', reason: '文科基础专业，就业面相对广' },
            { name: '历史学', reason: '学术深耕方向，适合深造' },
            { name: '新闻学', reason: '内容创作能力迁移性强' },
            { name: '广告学', reason: '创意+商业，互联网营销需求' },
            { name: '文化产业管理', reason: '文旅融合新赛道' }
        ];
    } else {
        interestTrack = '综合方向';
        interestDesc = '根据你的选科组合，建议结合自身兴趣与就业前景综合考量，重点关注交叉学科。';
        interestRecommendations = [
            { name: '数据科学与大数据技术', reason: '跨学科热门，各行各业需要' },
            { name: '工商管理', reason: '商业通用，适合多元兴趣' },
            { name: '新闻传播学', reason: '内容创作能力迁移性强' }
        ];
    }

    const interest = {
        title: '跟随个人兴趣 · 兴趣导向',
        icon: 'interest',
        track: interestTrack,
        description: interestDesc,
        source: '霍兰德职业兴趣理论 + 教育部学科认知指南（选科-专业对应关系）',
        recommendations: interestRecommendations
    };

    return { overview, policy, employment, interest };
}

// ===== 4. 结果渲染 =====

function renderResults(result, formData) {
    document.getElementById('inputSection').style.display = 'none';
    document.getElementById('resultSection').style.display = 'block';

    // 打印信息
    document.getElementById('printScore').textContent = formData.score;
    document.getElementById('printRank').textContent = formData.rank;
    document.getElementById('printSubjects').textContent = formData.subjects.join('、');
    document.getElementById('reportDate').textContent = `生成日期：${new Date().toLocaleDateString('zh-CN')}`;

    // 渲染各档推荐
    renderTier('chongList', result.chong, 'chong');
    renderTier('wenList', result.wen, 'wen');
    renderTier('baoList', result.bao, 'bao');

    // 渲染专业建议
    renderAdvice(result.advice);

    // 滚动到结果
    document.getElementById('resultSection').scrollIntoView({ behavior: 'smooth' });
}

function renderTier(containerId, items, tier) {
    const container = document.getElementById(containerId);
    container.innerHTML = '';

    if (items.length === 0) {
        container.innerHTML = '<p class="empty-text">暂无符合条件的推荐</p>';
        return;
    }

    items.forEach((item, index) => {
        const card = createRecommendCard(item, tier, index);
        container.appendChild(card);
    });
}

function createRecommendCard(item, tier, index) {
    const card = document.createElement('div');
    card.className = `recommend-card ${tier}`;

    const probClass = item.probability >= 75 ? 'high' : (item.probability >= 50 ? 'medium' : 'low');
    const tagsHtml = item.schoolTags.map(t => {
        const cls = t === '985' ? 'tag-985' : (t === '211' ? 'tag-211' : (t === '双一流' ? 'tag-double' : 'tag-normal'));
        return `<span class="tag ${cls}">${t}</span>`;
    }).join('');

    const subjectReqText = item.subjectReq.length > 0 ? item.subjectReq.join(' + ') : '不限';
    const scoreHistory = item.scores.map(s => `${s.year}: ${s.min_score}分/${s.min_rank}名`).join(' | ');

    const isInWishList = wishList.some(w => w.schoolId === item.schoolId && w.majorName === item.majorName);

    card.innerHTML = `
        <div class="card-header">
            <div>
                <div class="school-name">${index + 1}. ${item.schoolName}</div>
                <div class="school-tags">${tagsHtml}</div>
            </div>
            <div class="probability">
                <div class="prob-label">录取概率</div>
                <div class="prob-value ${probClass}">${item.probability}%</div>
            </div>
        </div>
        <div class="card-body">
            <div class="info-row">
                <span class="info-item"><strong>专业：</strong>${item.majorName}</span>
                <span class="info-item"><strong>类别：</strong>${item.majorCategory}</span>
                <span class="info-item"><strong>选科要求：</strong>${subjectReqText}</span>
                <span class="info-item"><strong>所在地：</strong>${item.schoolCity}</span>
            </div>
            <div class="info-row">
                <span class="info-item"><strong>近3年录取：</strong>${scoreHistory}</span>
            </div>
            <div class="reason">${item.reason}</div>
            <div class="card-actions">
                <button class="btn-small ${isInWishList ? 'added' : ''}" onclick="toggleWish('${item.schoolId}', '${item.schoolName}', '${item.majorName}', ${item.probability})">
                    ${isInWishList ? '已加入志愿表' : '加入志愿表'}
                </button>
            </div>
        </div>
    `;

    return card;
}

function renderAdvice(advice) {
    const container = document.getElementById('adviceContent');
    container.innerHTML = '';

    // ===== 概览 =====
    const overviewDiv = document.createElement('div');
    overviewDiv.className = 'advice-overview';
    advice.overview.forEach(item => {
        const div = document.createElement('div');
        div.className = 'advice-item';
        div.innerHTML = `<strong>${item.title}</strong><br>${item.content}`;
        overviewDiv.appendChild(div);
    });
    container.appendChild(overviewDiv);

    // ===== 三方向卡片网格 =====
    const grid = document.createElement('div');
    grid.className = 'advice-grid';

    // 方向一：政策导向
    grid.appendChild(renderPolicyCard(advice.policy));
    // 方向二：就业导向
    grid.appendChild(renderEmploymentCard(advice.employment));
    // 方向三：兴趣导向
    grid.appendChild(renderInterestCard(advice.interest));

    container.appendChild(grid);
}

// 渲染政策导向卡片
function renderPolicyCard(policy) {
    const card = document.createElement('div');
    card.className = 'advice-card advice-card-policy';

    const recsHtml = policy.recommendations.map(r => `
        <li class="advice-rec-item">
            <div class="rec-header">
                <span class="rec-name">${r.name}</span>
                <span class="rec-field tag">${r.field}</span>
            </div>
            <div class="rec-reason">${r.reason}</div>
            <div class="rec-source">来源：${r.source}</div>
        </li>
    `).join('');

    card.innerHTML = `
        <div class="advice-card-header">
            <span class="advice-icon advice-icon-policy" aria-hidden="true">◆</span>
            <h4 class="advice-card-title">${policy.title}</h4>
        </div>
        <p class="advice-card-desc">${policy.description}</p>
        <p class="advice-match-note">${policy.matchNote}</p>
        <ul class="advice-rec-list">${recsHtml}</ul>
        <p class="advice-source">数据来源：${policy.source}</p>
    `;
    return card;
}

// 渲染就业导向卡片
function renderEmploymentCard(emp) {
    const card = document.createElement('div');
    card.className = 'advice-card advice-card-employment';

    const greenHtml = emp.greenCards.map(g => `
        <li class="emp-tag-item emp-green">
            <span class="emp-name">${g.name}</span>
            <span class="emp-salary-value">${g.salary}</span>
            <span class="emp-note">${g.note}</span>
        </li>
    `).join('');

    const salaryHtml = emp.highSalary.map(s => `
        <li class="emp-tag-item emp-highsalary">
            <span class="emp-rank">${s.rank}</span>
            <span class="emp-name">${s.name}</span>
            <span class="emp-salary-value">${s.salary}</span>
        </li>
    `).join('');

    const redHtml = emp.redCards.map(r => `
        <li class="emp-tag-item emp-red">
            <span class="emp-name">${r.name}</span>
            <span class="emp-note">${r.note}</span>
        </li>
    `).join('');

    card.innerHTML = `
        <div class="advice-card-header">
            <span class="advice-icon advice-icon-employment" aria-hidden="true">▲</span>
            <h4 class="advice-card-title">${emp.title}</h4>
        </div>
        <p class="advice-card-desc">${emp.description}</p>

        <div class="emp-section">
            <h5 class="emp-section-title emp-section-green">2025绿牌专业（推荐）</h5>
            <ul class="emp-list">${greenHtml}</ul>
        </div>

        <div class="emp-section">
            <h5 class="emp-section-title emp-section-salary">2025届高薪Top10（毕业半年后月收入）</h5>
            <ul class="emp-list">${salaryHtml}</ul>
        </div>

        <div class="emp-section">
            <h5 class="emp-section-title emp-section-red">2025红牌专业（谨慎报考）</h5>
            <ul class="emp-list">${redHtml}</ul>
        </div>

        <p class="emp-trend">${emp.trendNote}</p>
        <p class="advice-source">数据来源：${emp.source}</p>
    `;
    return card;
}

// 渲染兴趣导向卡片
function renderInterestCard(interest) {
    const card = document.createElement('div');
    card.className = 'advice-card advice-card-interest';

    const recsHtml = interest.recommendations.map(r => `
        <li class="advice-rec-item">
            <div class="rec-header">
                <span class="rec-name">${r.name}</span>
            </div>
            <div class="rec-reason">${r.reason}</div>
        </li>
    `).join('');

    card.innerHTML = `
        <div class="advice-card-header">
            <span class="advice-icon advice-icon-interest" aria-hidden="true">●</span>
            <h4 class="advice-card-title">${interest.title}</h4>
        </div>
        <div class="interest-track">适合你的兴趣方向：<strong>${interest.track}</strong></div>
        <p class="advice-card-desc">${interest.description}</p>
        <ul class="advice-rec-list">${recsHtml}</ul>
        <p class="advice-source">参考：${interest.source}</p>
    `;
    return card;
}

// ===== 5. 志愿表模拟 =====

function toggleWish(schoolId, schoolName, majorName, probability) {
    const index = wishList.findIndex(w => w.schoolId === schoolId && w.majorName === majorName);

    if (index >= 0) {
        wishList.splice(index, 1);
    } else {
        wishList.push({ schoolId, schoolName, majorName, probability });
    }

    renderWishList();
    // 更新按钮状态
    refreshCardButtons();
}

function renderWishList() {
    const container = document.getElementById('wishListContent');

    if (wishList.length === 0) {
        container.innerHTML = '<p class="empty-text">志愿表为空</p>';
        return;
    }

    container.innerHTML = '';
    wishList.forEach((item, index) => {
        const div = document.createElement('div');
        div.className = 'wish-item';
        div.innerHTML = `
            <div class="wish-info">
                <span class="wish-num">${index + 1}.</span>
                <strong>${item.schoolName}</strong> — ${item.majorName}
                <span style="color:#64748b; font-size:13px;">（录取概率${item.probability}%）</span>
            </div>
            <span class="wish-remove" onclick="removeWish(${index})">移除</span>
        `;
        container.appendChild(div);
    });
}

function removeWish(index) {
    wishList.splice(index, 1);
    renderWishList();
    refreshCardButtons();
}

function refreshCardButtons() {
    // 重新渲染当前结果以更新按钮状态
    if (recommendResult) {
        renderTier('chongList', recommendResult.chong, 'chong');
        renderTier('wenList', recommendResult.wen, 'wen');
        renderTier('baoList', recommendResult.bao, 'bao');
    }
}

// ===== 6. 筛选功能 =====

function applyFilter() {
    if (!recommendResult) return;

    const filterCategory = document.getElementById('filterCategory').value;
    const filterLevel = document.getElementById('filterLevel').value;
    const filterCity = document.getElementById('filterCity').value;

    function filterItems(items) {
        return items.filter(item => {
            if (filterCategory && item.majorCategory !== filterCategory) return false;
            if (filterLevel && !item.schoolTags.includes(filterLevel)) return false;
            if (filterCity && item.schoolCity !== filterCity) return false;
            return true;
        });
    }

    renderTier('chongList', filterItems(recommendResult.chong), 'chong');
    renderTier('wenList', filterItems(recommendResult.wen), 'wen');
    renderTier('baoList', filterItems(recommendResult.bao), 'bao');
}

function toggleFilter() {
    const panel = document.getElementById('filterPanel');
    const btn = document.getElementById('filterBtn');
    panel.style.display = panel.style.display === 'none' ? 'block' : 'none';
    btn.classList.toggle('active');
}

function toggleWishList() {
    const panel = document.getElementById('wishListPanel');
    const btn = document.getElementById('wishListBtn');
    panel.style.display = panel.style.display === 'none' ? 'block' : 'none';
    btn.classList.toggle('active');
}

// ===== 7. 其他功能 =====

function resetForm() {
    document.getElementById('inputSection').style.display = 'block';
    document.getElementById('resultSection').style.display = 'none';
    document.getElementById('studentForm').reset();
    document.querySelectorAll('#subjectSelector input:checked').forEach(cb => cb.checked = false);
    document.getElementById('subjectHint').textContent = '请选择3门选考科目';
    document.getElementById('subjectHint').style.color = '#64748b';
    wishList = [];
    recommendResult = null;
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ===== 8. 初始化 =====

document.addEventListener('DOMContentLoaded', async () => {
    setupSubjectSelector();

    // 预加载数据
    await loadData();

    // 表单提交
    document.getElementById('studentForm').addEventListener('submit', async (e) => {
        e.preventDefault();

        const formData = getFormData();
        const error = validateForm(formData);
        if (error) {
            alert(error);
            return;
        }

        if (!allData) {
            const loaded = await loadData();
            if (!loaded) return;
        }

        // 生成推荐
        recommendResult = generateRecommendations(formData);

        if (recommendResult.totalCount === 0) {
            alert('未找到符合条件的推荐，请尝试调整选科或筛选条件');
            return;
        }

        // 渲染结果
        renderResults(recommendResult, formData);
    });
});
