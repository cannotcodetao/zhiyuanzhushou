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

// 选科数量校验 + 选考分数标签动态更新
function setupSubjectSelector() {
    const checkboxes = document.querySelectorAll('#subjectSelector input[type="checkbox"]');
    const hint = document.getElementById('subjectHint');

    function updateElectiveLabels() {
        const checked = Array.from(document.querySelectorAll('#subjectSelector input:checked')).map(c => c.value);
        const labels = document.querySelectorAll('.score-input.elective label');
        const inputs = document.querySelectorAll('.score-input.elective input');

        for (let i = 0; i < 3; i++) {
            if (labels[i] && inputs[i]) {
                if (checked[i]) {
                    labels[i].textContent = checked[i];
                    inputs[i].placeholder = '0-100';
                    inputs[i].disabled = false;
                    labels[i].style.opacity = '1';
                } else {
                    labels[i].textContent = `选考${i + 1}`;
                    inputs[i].placeholder = '请先选科';
                    inputs[i].disabled = true;
                    inputs[i].value = '';
                    labels[i].style.opacity = '0.5';
                }
            }
        }
    }

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
            updateElectiveLabels();
        });
    });

    updateElectiveLabels();
}

// 获取表单数据
function getFormData() {
    const score = parseInt(document.getElementById('score').value);
    const rank = parseInt(document.getElementById('rank').value);
    const subjects = Array.from(document.querySelectorAll('#subjectSelector input:checked')).map(c => c.value);
    const category = document.getElementById('category').value;
    const cityPref = document.getElementById('cityPref').value;
    const batch = document.getElementById('batch').value;
    const interestRadio = document.querySelector('#interestSelector input[name="interest"]:checked');
    const interest = interestRadio ? interestRadio.value : '';

    const scoreChinese = parseInt(document.getElementById('scoreChinese').value) || null;
    const scoreMath = parseInt(document.getElementById('scoreMath').value) || null;
    const scoreEnglish = parseInt(document.getElementById('scoreEnglish').value) || null;
    const scoreElective1 = parseInt(document.getElementById('scoreElective1').value) || null;
    const scoreElective2 = parseInt(document.getElementById('scoreElective2').value) || null;
    const scoreElective3 = parseInt(document.getElementById('scoreElective3').value) || null;

    return {
        score, rank, subjects, category, cityPref, batch, interest,
        subjectScores: {
            chinese: scoreChinese,
            math: scoreMath,
            english: scoreEnglish,
            elective1: scoreElective1,
            elective2: scoreElective2,
            elective3: scoreElective3
        }
    };
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

    const sc = data.subjectScores;
    if (sc.chinese !== null && (sc.chinese < 0 || sc.chinese > 150)) {
        return '语文分数需在0-150之间';
    }
    if (sc.math !== null && (sc.math < 0 || sc.math > 150)) {
        return '数学分数需在0-150之间';
    }
    if (sc.english !== null && (sc.english < 0 || sc.english > 150)) {
        return '英语分数需在0-150之间';
    }
    if (sc.elective1 !== null && (sc.elective1 < 0 || sc.elective1 > 100)) {
        return '选考1分数需在0-100之间';
    }
    if (sc.elective2 !== null && (sc.elective2 < 0 || sc.elective2 > 100)) {
        return '选考2分数需在0-100之间';
    }
    if (sc.elective3 !== null && (sc.elective3 < 0 || sc.elective3 > 100)) {
        return '选考3分数需在0-100之间';
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

    // 按位次排序（位次越小越难进 → 从难到易）
    candidates.sort((a, b) => a.avgRank - b.avgRank);

    // 按学校去重：每所学校只保留位次最接近考生的一个专业
    const uniqueBySchool = dedupeBySchool(candidates, rank);

    // 重新按位次排序（从难到易）
    uniqueBySchool.sort((a, b) => a.avgRank - b.avgRank);

    // 从去重后的列表中分配冲3 + 稳5 + 保3
    const { chong, wen, bao } = distributeTiers(uniqueBySchool, rank);

    // 生成专业选择建议
    const advice = generateAdvice(candidates, subjects, formData.interest, formData.subjectScores);

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
// ratio = majorRank / studentRank：
//   ratio < 1 → 专业位次比学生好（更靠前）→ 难考 → 概率低
//   ratio ≈ 1 → 位次接近 → 稳妥
//   ratio > 1 → 专业位次比学生差（更靠后）→ 易考 → 概率高
function calculateProbability(studentRank, majorRank) {
    if (majorRank <= 0 || studentRank <= 0) return 0;

    const ratio = majorRank / studentRank;

    if (ratio < 0.3) return 5;
    if (ratio < 0.5) return 15;
    if (ratio < 0.7) return 30;
    if (ratio < 0.85) return 45;
    if (ratio < 0.95) return 60;
    if (ratio < 1.05) return 75;
    if (ratio < 1.15) return 85;
    if (ratio < 1.30) return 92;
    if (ratio < 1.50) return 96;
    return 98;
}

// 判断冲稳保类别
// ratio = majorRank / studentRank：
//   ratio < 0.9 → 专业远好于学生 → 冲刺（难考）
//   0.9 ≤ ratio < 1.2 → 位次接近 → 稳妥
//   ratio ≥ 1.2 → 专业比学生差 → 保底（易考）
function determineTier(studentRank, majorRank) {
    const ratio = majorRank / studentRank;

    if (ratio < 0.9) return 'chong';

    if (ratio >= 0.9 && ratio < 1.2) return 'wen';

    return 'bao';
}

// 按学校去重：每所学校只保留与考生位次最接近的一个专业
function dedupeBySchool(candidates, studentRank) {
    const schoolMap = new Map();

    candidates.forEach(c => {
        const key = c.schoolId;
        if (!schoolMap.has(key)) {
            schoolMap.set(key, c);
        } else {
            const existing = schoolMap.get(key);
            const existingDiff = Math.abs(existing.avgRank - studentRank);
            const currentDiff = Math.abs(c.avgRank - studentRank);
            // 保留位次更接近考生的那个专业
            if (currentDiff < existingDiff) {
                schoolMap.set(key, c);
            }
        }
    });

    return Array.from(schoolMap.values());
}

// 分配冲稳保档位（基于学生位次的相对位置，无重叠）
// 策略（按位次从好到差排序）：
//   稳妥wen：位次最接近学生的5所（滑动窗口找平均差最小的）
//   冲刺chong：稳妥之上紧邻的3所（比学生好）
//   保底bao：稳妥之下紧邻的3所（比学生差）
//   三者互不重叠，呈 chong(3) → wen(5) → bao(3) 连续分布
function distributeTiers(uniqueCandidates, studentRank) {
    const total = uniqueCandidates.length;

    let wenStart = 0;
    let minDiff = Infinity;

    for (let i = 0; i <= total - 5; i++) {
        const window = uniqueCandidates.slice(i, i + 5);
        const avgDiff = window.reduce((sum, c) => sum + Math.abs(c.avgRank - studentRank), 0) / 5;
        if (avgDiff < minDiff) {
            minDiff = avgDiff;
            wenStart = i;
        }
    }

    let wen = uniqueCandidates.slice(wenStart, wenStart + 5);

    let chongEnd = wenStart;
    let chongStart = Math.max(0, chongEnd - 3);
    let chong = uniqueCandidates.slice(chongStart, chongEnd);

    let baoStartIdx = wenStart + 5;
    let baoEnd = Math.min(total, baoStartIdx + 3);
    let bao = uniqueCandidates.slice(baoStartIdx, baoEnd);

    if (chong.length < 3) {
        const need = 3 - chong.length;
        const extraWenStart = wenStart + 5;
        const extraWenEnd = Math.min(extraWenStart + need, total);
        const extra = uniqueCandidates.slice(extraWenStart, extraWenEnd);
        wen = wen.concat(extra);
        const newBaoStart = extraWenEnd;
        const newBaoEnd = Math.min(total, newBaoStart + 3);
        bao = uniqueCandidates.slice(newBaoStart, newBaoEnd);
    }

    if (bao.length < 3) {
        const need = 3 - bao.length;
        const extraWenEnd = wenStart;
        const extraWenStart = Math.max(0, extraWenEnd - need);
        const extra = uniqueCandidates.slice(extraWenStart, extraWenEnd);
        wen = extra.concat(wen);
        const newChongEnd = extraWenStart;
        const newChongStart = Math.max(0, newChongEnd - 3);
        chong = uniqueCandidates.slice(newChongStart, newChongEnd);
    }

    chong.forEach(c => c.tier = 'chong');
    wen.forEach(c => c.tier = 'wen');
    bao.forEach(c => c.tier = 'bao');

    return { chong, wen, bao };
}

// 生成推荐理由
function generateReason(school, major, majorRank, studentRank, prob) {
    const ratio = majorRank / studentRank;
    const yearInfo = major.scores.map(s => `${s.year}年最低位次${s.min_rank}`).join('，');

    let tierDesc = '';
    if (ratio < 0.9) {
        tierDesc = `该专业近3年平均录取位次为${majorRank}名，你的位次为${studentRank}名，专业要求更高，有一定冲刺难度，录取概率约${prob}%。`;
    } else if (ratio < 1.2) {
        tierDesc = `该专业近3年平均录取位次为${majorRank}名，与你的位次${studentRank}名相当，录取概率约${prob}%，较为稳妥。`;
    } else {
        tierDesc = `该专业近3年平均录取位次为${majorRank}名，低于你的位次${studentRank}名，录取概率约${prob}%，可作为保底选择。`;
    }

    const tagInfo = school.tags.length > 0 ? `【${school.tags.join('/')}】` : '';
    return `${tagInfo}${school.city}的${school.name}${major.name}专业，${tierDesc}（${yearInfo}）`;
}

// 分析单科优势与劣势，给出专业适配建议
function analyzeSubjectStrengths(scores, subjects) {
    if (!scores) return null;

    const subjectsWithRates = [];

    if (scores.chinese !== null) {
        subjectsWithRates.push({ name: '语文', score: scores.chinese, full: 150, rate: scores.chinese / 150 });
    }
    if (scores.math !== null) {
        subjectsWithRates.push({ name: '数学', score: scores.math, full: 150, rate: scores.math / 150 });
    }
    if (scores.english !== null) {
        subjectsWithRates.push({ name: '英语', score: scores.english, full: 150, rate: scores.english / 150 });
    }

    const electiveScores = [scores.elective1, scores.elective2, scores.elective3].filter(s => s !== null);
    if (electiveScores.length > 0 && subjects.length === 3) {
        subjects.forEach((subj, i) => {
            if (electiveScores[i] !== undefined) {
                subjectsWithRates.push({
                    name: subj,
                    score: electiveScores[i],
                    full: 100,
                    rate: electiveScores[i] / 100
                });
            }
        });
    }

    if (subjectsWithRates.length < 2) return null;

    const avgRate = subjectsWithRates.reduce((s, x) => s + x.rate, 0) / subjectsWithRates.length;

    const strong = subjectsWithRates.filter(s => s.rate >= avgRate + 0.05).sort((a, b) => b.rate - a.rate);
    const weak = subjectsWithRates.filter(s => s.rate <= avgRate - 0.05).sort((a, b) => a.rate - b.rate);

    const subjectMap = {
        '数学': {
            strong: [
                { name: '计算机科学与技术', reason: '数学是编程与算法的基础，数学强的学生逻辑思维突出' },
                { name: '人工智能/数据科学', reason: '机器学习、深度学习核心是线性代数与概率统计' },
                { name: '金融学/金融工程', reason: '量化金融、衍生品定价高度依赖数学建模' },
                { name: '电子信息工程', reason: '信号处理、通信原理需要扎实的数学功底' }
            ],
            weak: [
                { name: '计算机/软件工程', reason: '算法设计与数据结构对数学要求较高，可能学习吃力' },
                { name: '金融工程/量化金融', reason: '高度依赖数学建模，数学薄弱会很困难' }
            ]
        },
        '物理': {
            strong: [
                { name: '机械工程/车辆工程', reason: '力学是机械设计的核心，物理基础扎实优势大' },
                { name: '电气工程及其自动化', reason: '电磁学、电路分析是核心课程' },
                { name: '土木工程/建筑', reason: '结构力学、材料力学离不开物理基础' },
                { name: '航空航天工程', reason: '空气动力学、热力学都以物理为根基' }
            ],
            weak: [
                { name: '工科类专业', reason: '大学物理、工程力学等课程可能成为学习障碍' },
                { name: '电子信息/通信', reason: '电路分析、电磁场等课程物理基础要求高' }
            ]
        },
        '化学': {
            strong: [
                { name: '化学工程与工艺', reason: '有机化学、物理化学是核心，化学优势明显' },
                { name: '药学/药物制剂', reason: '药物化学、药剂学以化学为基础' },
                { name: '材料科学与工程', reason: '材料合成、表征都需要化学知识' },
                { name: '生物工程/生物技术', reason: '分子生物学、生化反应离不开化学' }
            ],
            weak: [
                { name: '化学/化工类', reason: '四大化学（有机/无机/物化/分析）难度较大' },
                { name: '药学/医学技术类', reason: '药物化学等课程对化学基础要求高' }
            ]
        },
        '生物': {
            strong: [
                { name: '临床医学/口腔医学', reason: '生理学、病理学、药理学都以生物为基础' },
                { name: '生物科学/生物技术', reason: '分子生物学、遗传学是核心' },
                { name: '农学/园艺', reason: '植物学、动物学、微生物学为主干课程' },
                { name: '生态学/环境科学', reason: '生态系统分析、环境监测依赖生物知识' }
            ],
            weak: [
                { name: '医学/生物类专业', reason: '生物化学、分子生物学等课程难度较大' }
            ]
        },
        '语文': {
            strong: [
                { name: '汉语言文学/中国语言文学', reason: '语言文字功底是核心竞争力' },
                { name: '新闻传播学/网络与新媒体', reason: '内容创作、文案写作是基本功' },
                { name: '法学', reason: '法律条文解读、文书写作对语文要求高' },
                { name: '教育学（文科方向）', reason: '教育研究、文字表达能力很重要' }
            ],
            weak: []
        },
        '英语': {
            strong: [
                { name: '英语/翻译/商务英语', reason: '语言优势明显，就业面广' },
                { name: '国际经济与贸易', reason: '外贸沟通、跨境商务需要良好英语' },
                { name: '外交学/国际关系', reason: '外语能力是核心竞争力' },
                { name: '计算机（涉外方向）', reason: '阅读英文文献、参与开源项目有优势' }
            ],
            weak: [
                { name: '涉外专业/中外合作办学', reason: '全英文授课可能跟不上' }
            ]
        },
        '历史': {
            strong: [
                { name: '历史学/考古学', reason: '历史思维与史料分析能力突出' },
                { name: '法学', reason: '法制史、比较法研究有思维优势' },
                { name: '新闻传播学', reason: '深度报道、非虚构写作有底蕴优势' },
                { name: '公共管理/政治学', reason: '政治制度史、国际政治有知识积累' }
            ],
            weak: []
        },
        '地理': {
            strong: [
                { name: '地理信息科学/GIS', reason: '空间思维与地图学基础好' },
                { name: '城乡规划', reason: '区域分析、空间规划有优势' },
                { name: '环境科学与工程', reason: '自然地理、生态系统分析基础扎实' },
                { name: '旅游管理', reason: '人文地理与区域认知有优势' }
            ],
            weak: []
        },
        '政治': {
            strong: [
                { name: '法学', reason: '政治理论与法律体系有相通之处' },
                { name: '公共管理/行政管理', reason: '政治制度、公共政策理解深' },
                { name: '马克思主义理论/思想政治教育', reason: '专业匹配度高' },
                { name: '新闻传播学', reason: '时政新闻、政策解读有优势' }
            ],
            weak: []
        },
        '技术': {
            strong: [
                { name: '计算机科学与技术', reason: '信息技术基础好，编程入门快' },
                { name: '软件工程/网络工程', reason: '动手实践能力强，适合工程方向' },
                { name: '数字媒体技术', reason: '技术+艺术复合，创意与技术结合' },
                { name: '电子信息工程', reason: '电路设计、单片机实践有基础' }
            ],
            weak: []
        }
    };

    const strongRecs = [];
    const weakRecs = [];

    strong.forEach(s => {
        if (subjectMap[s.name]) {
            subjectMap[s.name].strong.forEach(r => {
                if (!strongRecs.find(x => x.name === r.name)) {
                    strongRecs.push({ ...r, subject: s.name, rate: s.rate });
                }
            });
        }
    });

    weak.forEach(s => {
        if (subjectMap[s.name]) {
            subjectMap[s.name].weak.forEach(r => {
                if (!weakRecs.find(x => x.name === r.name)) {
                    weakRecs.push({ ...r, subject: s.name, rate: s.rate });
                }
            });
        }
    });

    const sortedByRate = [...subjectsWithRates].sort((a, b) => b.rate - a.rate);
    const topSubjects = sortedByRate.slice(0, Math.min(2, sortedByRate.length));
    const bottomSubjects = [...sortedByRate].sort((a, b) => a.rate - b.rate).slice(0, Math.min(2, sortedByRate.length));

    const summary =
        `已分析你提供的${subjectsWithRates.length}科成绩：` +
        `最强的是${topSubjects.map(s => `${s.name}（${Math.round(s.rate * 100)}%得分率）`).join('、')}；` +
        (bottomSubjects.length > 0 && bottomSubjects[0].rate < avgRate - 0.05
            ? `相对薄弱的是${bottomSubjects.map(s => `${s.name}（${Math.round(s.rate * 100)}%得分率）`).join('、')}。`
            : `各科发展均衡。`);

    const strongText = strongRecs.length > 0
        ? `基于你的优势学科（${strong.map(s => s.name).join('、')}），以下专业方向你可能更有学习优势：` +
          strongRecs.slice(0, 6).map(r => `${r.name}（${r.reason}）`).join('；') + '。'
        : '';

    const weakText = weakRecs.length > 0
        ? `以下专业方向对${weak.map(s => s.name).join('、')}基础要求较高，你当前得分率偏低，报考时需谨慎考虑可能的学习难度：` +
          weakRecs.slice(0, 5).map(r => `${r.name}（${r.reason}）`).join('；') + '。建议结合个人兴趣和学习毅力综合判断。'
        : '';

    return { summary, strongRecs, weakRecs, strongText, weakText };
}

// 生成专业选择建议（三方向：政策/就业/兴趣 + 概览 + 单科分析）
function generateAdvice(candidates, subjects, userInterest, subjectScores) {
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

    // ===== 单科优势分析（基于各科得分率） =====
    const subjectAnalysis = analyzeSubjectStrengths(subjectScores, subjects);
    if (subjectAnalysis) {
        overview.push({
            title: '单科优势分析',
            content: subjectAnalysis.summary
        });

        if (subjectAnalysis.strongRecs.length > 0) {
            overview.push({
                title: '优势学科适配专业',
                content: subjectAnalysis.strongText
            });
        }

        if (subjectAnalysis.weakRecs.length > 0) {
            overview.push({
                title: '需谨慎选择的专业',
                content: subjectAnalysis.weakText
            });
        }
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

    // ===== 方向三：兴趣导向 =====
    let interestTrack = '';
    let interestDesc = '';
    let interestRecommendations = [];
    let isUserSelected = false;

    const interestMap = {
        it: {
            track: '信息技术方向',
            desc: '你选择了信息技术/编程方向，适合对软件开发、人工智能、网络安全、数据分析有浓厚兴趣的考生。建议结合数理基础，选择技术壁垒高、成长空间大的方向。',
            recs: [
                { name: '人工智能', reason: '前沿技术，AI for Science 新范式，国家战略急需' },
                { name: '软件工程', reason: '系统化构建数字产品，就业面广，创业门槛低' },
                { name: '计算机科学与技术', reason: '基础扎实，算法/开发/研究全方向通吃' },
                { name: '网络空间安全', reason: '数字时代守护者，国家战略急需，人才缺口大' },
                { name: '数据科学与大数据技术', reason: '数据驱动决策，各行各业都需要' }
            ]
        },
        medicine: {
            track: '医学/生命科学方向',
            desc: '你选择了医学/生命科学方向，适合对生命现象、疾病诊疗、科学探究有强烈兴趣的考生。医学专业学习周期长、壁垒高，但社会需求刚性、职业成就感强。',
            recs: [
                { name: '临床医学', reason: '直接救死扶伤，专业壁垒高，社会需求刚性' },
                { name: '口腔医学', reason: '工作节奏可控，自主创业空间大，收入稳定' },
                { name: '药学', reason: '医药产业人才缺口大，研发方向薪资优' },
                { name: '生物医学工程', reason: '医工交叉，医疗器械/影像/AI医疗方向' },
                { name: '预防医学', reason: '公共卫生领域，后疫情时代持续受重视' }
            ]
        },
        engineering: {
            track: '工程制造方向',
            desc: '你选择了工程制造/机械方向，适合对动手实践、机械结构、工业制造、智能装备感兴趣的考生。制造业是实体经济根基，高端制造人才需求旺盛。',
            recs: [
                { name: '机械工程', reason: '工业之母，智能制造升级核心方向' },
                { name: '电气工程及其自动化', reason: '近5年4次绿牌专业，电网/能源稳定就业' },
                { name: '机械电子工程', reason: '机电一体化，近5年3次绿牌' },
                { name: '机器人工程', reason: '近5年首入绿牌，工业机器人普及' },
                { name: '车辆工程', reason: '近5年首次绿牌，新能源汽车产业爆发' }
            ]
        },
        finance: {
            track: '金融/经济方向',
            desc: '你选择了金融/经济方向，适合对数字敏感、对资本市场和商业运作有兴趣的考生。金融行业薪资水平高，但竞争激烈，建议结合数学基础和行业证书规划。',
            recs: [
                { name: '金融学', reason: '金融核心专业，银行/证券/基金/保险全覆盖' },
                { name: '经济学', reason: '理论基础扎实，适合深造或政策研究' },
                { name: '会计学', reason: '商业通用语言，就业稳定，考证路径清晰' },
                { name: '金融工程', reason: '量化金融方向，数学+编程+金融复合人才' },
                { name: '国际经济与贸易', reason: '外向型经济，外贸/跨境电商方向' }
            ]
        },
        design: {
            track: '设计/创意方向',
            desc: '你选择了设计/创意方向，适合有艺术感知力、喜欢创造视觉作品的考生。设计行业覆盖面广，从传统平面设计到数字创意、产品设计均有需求。',
            recs: [
                { name: '数字媒体技术', reason: '技术+艺术，游戏/影视/交互设计方向' },
                { name: '工业设计', reason: '产品外观与体验设计，制造业升级刚需' },
                { name: '视觉传达设计', reason: '平面/品牌/UI设计，就业面广' },
                { name: '建筑学', reason: '空间设计，技术+艺术+人文复合' },
                { name: '广告学', reason: '创意+商业，互联网营销需求旺盛' }
            ]
        },
        humanities: {
            track: '人文/社科方向',
            desc: '你选择了人文/社科方向，适合对社会、文化、历史、治理有深度兴趣的考生。建议选择就业面较广的专业，并通过实习和技能拓展增强竞争力。',
            recs: [
                { name: '汉语言文学', reason: '文科基础专业，教育/传媒/文秘通吃' },
                { name: '新闻传播学', reason: '信息时代的内容创造者与传播者' },
                { name: '法学', reason: '逻辑与正义结合，司法考试是关键门槛（注意：近5年红牌，需谨慎）' },
                { name: '翻译', reason: '语言+专业复合人才，涉外领域有需求' },
                { name: '社会学', reason: '理解社会运行，适合做调研与政策研究' }
            ]
        },
        education: {
            track: '教育/心理方向',
            desc: '你选择了教育/心理方向，适合对人的成长、教育规律、心理健康有兴趣的考生。教育行业稳定，心理领域需求增长快，但需注意专业认证和实践积累。',
            recs: [
                { name: '教育学', reason: '热爱教育事业，师范类首选' },
                { name: '心理学', reason: '理解人心，咨询/HR/用户体验皆可' },
                { name: '学前教育', reason: '低龄教育，耐心与创意并重' },
                { name: '小学教育', reason: '基础教育，教师编制竞争相对温和' },
                { name: '应用心理学', reason: '应用导向，企业EAP/用户研究方向' }
            ]
        },
        energy: {
            track: '新能源/环境方向',
            desc: '你选择了新能源/环境方向，适合对可持续发展、清洁能源、生态保护有热情的考生。双碳目标下，新能源与环保产业高速增长，政策支持力度大。',
            recs: [
                { name: '新能源科学与工程', reason: '近5年首入绿牌，双碳目标核心驱动' },
                { name: '储能科学与工程', reason: '新型储能战略产业，宁德时代/比亚迪等企业高薪抢人' },
                { name: '环境科学与工程', reason: '污染防治与生态修复，环保产业持续升温' },
                { name: '碳中和科学与工程', reason: '教育部2025年新增专业，双碳战略急需' },
                { name: '能源与动力工程', reason: '能源转型主力，近5年3次绿牌' }
            ]
        },
        business: {
            track: '管理/创业方向',
            desc: '你选择了管理/创业方向，适合对商业运营、组织管理、创业创新有兴趣的考生。管理类专业建议结合具体行业知识，避免"泛而不专"。',
            recs: [
                { name: '工商管理', reason: '商业通用知识体系，适合多元兴趣' },
                { name: '市场营销', reason: '企业核心职能，数字营销方向需求大' },
                { name: '人力资源管理', reason: '组织发展核心，各行业均有需求' },
                { name: '供应链管理', reason: '物流/电商/制造业刚需，数字化升级' },
                { name: '创业管理', reason: '适合有创业意愿，或进入创新型企业' }
            ]
        }
    };

    if (userInterest && interestMap[userInterest]) {
        isUserSelected = true;
        const info = interestMap[userInterest];
        interestTrack = info.track;
        interestDesc = info.desc;
        interestRecommendations = info.recs;
    } else {
        if (hasPhysics && hasChemistry && hasBio) {
            interestTrack = '医学/科研方向（选科推导）';
            interestDesc = '你的选科（物+化+生）是医学和生命科学的标准配置，适合对生命现象、疾病诊疗、科学探究有强烈兴趣的考生。你也可以在上方选择具体的兴趣方向，获得更精准的建议。';
            interestRecommendations = [
                { name: '临床医学', reason: '直接救死扶伤，专业壁垒高，社会需求刚性' },
                { name: '口腔医学', reason: '工作节奏可控，自主创业空间大' },
                { name: '生物科学', reason: '科研导向，可深造读博进入高校或研究所' },
                { name: '药学', reason: '医药产业人才缺口大，研发方向薪资优' }
            ];
        } else if (hasPhysics && hasChemistry) {
            interestTrack = '理工科方向（选科推导）';
            interestDesc = '你的选科（含物+化）是理工科的万能钥匙，专业选择面广。建议结合自身兴趣进一步缩小范围——你可以在上方选择具体的兴趣方向。';
            interestRecommendations = [
                { name: '机械工程', reason: '工业之母，智能制造升级核心' },
                { name: '电气工程及其自动化', reason: '近5年4次绿牌，电网/能源稳定就业' },
                { name: '计算机科学与技术', reason: '就业面广，薪资水平高' },
                { name: '材料科学与工程', reason: '一切制造的根基' }
            ];
        } else if (hasPhysics) {
            interestTrack = '工科方向（选科推导）';
            interestDesc = '你选考了物理，可报考大部分理工科专业。建议结合兴趣进一步明确方向——信息技术、工程制造、新能源等都是不错的选择。';
            interestRecommendations = [
                { name: '计算机科学与技术', reason: '逻辑思维导向，创造数字产品' },
                { name: '机械工程', reason: '工业之母，就业稳定' },
                { name: '土木工程', reason: '基础设施建设刚需' }
            ];
        } else if (hasHistory) {
            interestTrack = '文史方向（选科推导）';
            interestDesc = '你选考了历史，适合报考文史类、法学、新闻传播、教育学等专业。建议结合就业前景和个人兴趣理性选择。';
            interestRecommendations = [
                { name: '汉语言文学', reason: '文科基础专业，就业面相对广' },
                { name: '新闻学', reason: '内容创作能力迁移性强' },
                { name: '教育学', reason: '师范类稳定就业方向' }
            ];
        } else {
            interestTrack = '综合方向（选科推导）';
            interestDesc = '根据你的选科组合，建议结合自身兴趣与就业前景综合考量。在上方选择你感兴趣的方向，获得更有针对性的专业推荐。';
            interestRecommendations = [
                { name: '数据科学与大数据技术', reason: '跨学科热门，各行各业需要' },
                { name: '工商管理', reason: '商业通用，适合多元兴趣' }
            ];
        }
    }

    const interest = {
        title: '跟随个人兴趣 · 兴趣导向',
        icon: 'interest',
        track: interestTrack,
        description: interestDesc,
        source: isUserSelected
            ? '用户兴趣选择 + 霍兰德职业兴趣理论 + 教育部学科专业目录'
            : '霍兰德职业兴趣理论 + 教育部学科认知指南（选科-专业对应关系）',
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
