# 志愿智选 — 想法验证与MVP规划

## 目标陈述

对"志愿智选 — 高考志愿智能规划系统"进行系统化的想法验证，并基于The Minimalist Entrepreneur框架规划最小可行产品(MVP)，确保在投入大量开发资源前验证市场需求。

## 阶段（修订版：跳过手动验证，直接产品化）

### Phase 1: 信息收集与问题定义 ✅
- 从原报告提取志愿智选核心信息

### Phase 2: 想法验证 ✅
- validate-idea框架分析完成

### Phase 3: MVP规划 ✅
- 三阶段路线图设计完成

### Phase 4: MVP技术方案讨论与设计 ✅
### Phase 5: MVP开发实现（模拟数据）✅

### Phase 6: 数据真实化 ✅ 完成
- **目标**: 将模拟数据替换为真实录取数据
- **背景**: 用户指出模拟数据影响考生填报决策，风险重大，必须更换
- **决策（2026-06-30 用户确认）**：
  - 数据方案：A+B组合 — 主用浙江省考试院官方XLS（2025权威投档线），补充掌上高考API抓取2023-2024历史数据
  - 执行方式：AI子代理一站式完成（下载XLS→Python解析→抓取历史→生成JSON→替换→验证）
  - 设计时机：数据优先，设计后做
- **数据源A**：浙江省教育考试院官方XLS
  - 2025年第一段：https://www.zjzs.net/attach/0/8d8d48bdfabe4347b73ccc6009f328e4.xls
  - 2025年第二段：https://gaokao.chsi.com.cn 发布
  - 来源页：https://www.zjzs.net/art/2025/7/21/art_3_11454.html
- **数据源B**：掌上高考API
  - 学校列表：https://static-data.gaokao.cn/www/2.0/school/school_code.json
  - 专业分数：https://static-data.gaokao.cn/www/2.0/schoolspecialscore/{school_id}/{year}/{prov_id}.json
  - prov_id for 浙江: 33
- **JSON结构约束**：必须与现有 js/app.js 完全兼容（schools/majors/scores 字段不变）
- **验收标准**：
  1. 数据来源 100% 可追溯（每个数字可对应到官方XLS或API）
  2. 浙江省学校数量 ≥ 60 所（与模拟数据相当或更多）
  3. 2023-2025 三年数据完整
  4. 与 js/app.js 完全兼容，无需改前端代码

### Phase 7: HTML设计优化（参考frontend-slides）✅ 完成
- **目标**: 参考 frontend-slides 设计风格优化UI
- **选定风格**: Blue Professional（咨询级专业感，适合教育数据产品）
- **设计要点**：
  - 色彩：奶油画布 #fdfae7 + 钴蓝主色 #1e2bfa
  - 字体：Space Grotesk (标题/数字) + Inter (正文) + Noto Sans SC (中文)
  - 卡片：4%钴蓝填充 + 20%钴蓝1.5px边框 + 14px圆角，无投影
  - 印刷品级专业感，符合教育数据产品的信任需求
  - 保留所有现有功能，只优化视觉层
- **完成情况**：
  - CSS 完全重写（731行 → 1037行），应用 Blue Professional 设计系统
  - 移除所有 box-shadow 和渐变 header
  - 文本更新：FAQ/页脚/免责声明改为真实数据来源描述
  - 34个DOM ID全部保留，js/app.js 无需修改
  - HTTP 测试通过，所有资源 200 OK

### Phase 8: 专业建议三方向增强 ✅ 完成
- **状态**: complete
- **目标**: 在专业选择建议中融入三个方向：政策导向/就业导向/兴趣导向
- **数据来源（可查可验证）**：
  - **政策方向**：
    - 教育部《普通高等学校本科专业目录（2025年）》845种专业，2025年新增29种、2026年新增38种
    - 国家战略性新兴产业9大方向（新一代信息技术/高端装备/新材料/生物/新能源汽车/新能源/节能环保/数字创意/相关服务）
    - 6大未来产业：未来制造/信息/材料/能源/空间/健康
    - 工信部直属7所高校2026年增设74个本科专业（低空经济、具身智能、量子信息、集成电路等）
    - 来源：教育部、工信部、国家发改委官网
  - **就业方向**：
    - 麦可思《2025年中国本科生就业报告》（2024届毕业生数据）
    - 2025绿牌专业：电气工程及其自动化、微电子科学与工程、机械电子工程、新能源科学与工程、车辆工程、机器人工程
    - 2025红牌专业：公共事业管理、音乐表演、绘画、法学、美术学
    - 2025届高薪Top10：微电子(7814元)、电子科学(7752)、自动化(7573)、信息安全、光电信息(7525)、采矿工程(7448)、机械工程(7401)、测控(7348)、材料科学(7304)、通信工程(7249)
  - **兴趣方向**：
    - 基于选科组合推导兴趣倾向（霍兰德职业兴趣理论+教育部学科认知）
- **实现完成**：
  - 重写 `js/app.js` 的 `generateAdvice()` 返回 `{overview, policy, employment, interest}` 对象
  - 重写 `renderAdvice()` + 新增 `renderPolicyCard/renderEmploymentCard/renderInterestCard` 三个渲染函数
  - `css/style.css` 新增 ~270 行：`.advice-grid`（3列响应式网格）+ `.advice-card` + `.emp-tag-item` 等
  - 修复 CSS 类名冲突：`.emp-salary` → `.emp-highsalary`（容器）+ `.emp-salary-value`（子元素）
  - index.html 无需修改（renderAdvice 动态生成内容）

### Phase 9: GitHub 仓库部署上线 ✅ 完成
- **状态**: complete
- **目标**: 初始化 git、连接 GitHub 仓库、推送代码
- **环境**：git 已装(2.49.0)，gh CLI 未装（改用原生 git 命令）
- **执行步骤**：
  1. ✅ 创建 `.gitignore`（排除 data/raw/、mock备份、Python缓存、OS/编辑器临时文件）
  2. ✅ `git init` 初始化本地仓库
  3. ✅ 仓库级 git 配置（不影响全局）：user.name=cannotcodetao, user.email=892452605@qq.com
  4. ✅ `git add .` → 14个文件，60942行插入
  5. ✅ `git commit -F .git/COMMIT_MSG.txt`（PowerShell 不支持 heredoc，改用文件方式）
  6. ✅ `git branch -M main` 重命名分支匹配 GitHub 默认
  7. ✅ `git remote add origin https://github.com/cannotcodetao/zhiyuanzhushou.git`
  8. ✅ 首次 push 被拒（远程有 GitHub 自动生成的 README）
  9. ✅ `git pull origin main --allow-unrelated-histories -X ours` 自动用本地 README 解决冲突
  10. ✅ `git push -u origin main` 成功推送 130.94 KiB（git 压缩后）
- **代码仓库**：https://github.com/cannotcodetao/zhiyuanzhushou

### Phase 10: GitHub Pages 上线 ⬅️ 当前
- **状态**: in_progress（等待用户在 GitHub 网页端开启）
- **目标**: 启用 GitHub Pages，网站正式上线
- **用户操作步骤**：
  1. 访问 https://github.com/cannotcodetao/zhiyuanzhushou/settings/pages
  2. Source 选择 `Deploy from a branch`
  3. Branch 选择 `main` / `/ (root)`
  4. 点击 Save，等待 1-3 分钟
- **预期上线地址**：https://cannotcodetao.github.io/zhiyuanzhushou/

## 关键决策点（修订）

1. 数据源：25万条录取数据从哪来？如何存储为JSON？
2. 推荐算法：冲稳保的判定标准是什么？
3. PDF生成：用什么前端技术？
4. 功能范围：除职业性格测试外的功能是否都要在V1实现？

## 已知约束

- 时间窗口：每年6-7月是高考志愿填报季，有明显的季节性
- 数据依赖：需要准确的录取数据
- 责任风险：志愿填报决策影响重大，需要免责声明
- 竞争格局：已有优志愿、蝶变志愿等成熟产品

## 错误记录

| 错误 | 尝试 | 解决方案 |
|------|------|----------|
| (暂无) | - | - |
