/**
 * ===== search.js - 搜索结果页重构版 =====
 * 1. 自动读取 URL 参数并回填
 * 2. 支持顶部输入框二次检索
 * 3. 左右两侧数据同步渲染（列表+画像）
 */

// 在 search.js 开头或 DOMContentLoaded 回调中加入
(function injectBtnStyles() {
    const style = document.createElement('style');
    style.innerHTML = `
        .back-btn {
            background: rgba(90, 180, 255, 0.2) !important;
            border: 1px solid #5ab4ff !important;
            color: #5ab4ff !important;
            padding: 8px 18px !important;
            border-radius: 4px !important;
            cursor: pointer !important;
            font-weight: bold !important;
            transition: all 0.3s !important;
            margin-left: 20px;
        }
        .back-btn:hover {
            background: #5ab4ff !important;
            color: #fff !important;
            box-shadow: 0 0 15px rgba(90, 180, 255, 0.6) !important;
        }
    `;
    document.head.appendChild(style);
})();

document.addEventListener('DOMContentLoaded', async () => {
    // --- 1. 初始化 DOM 元素 ---
    const keywordInput = document.getElementById('keywordInput');
    const reSearchBtn = document.getElementById('reSearchBtn');
    const resultsGrid = document.getElementById('resultsGrid');
    const applyFilterBtn = document.getElementById('applyFilterBtn');

    await initFilters();

    // --- 2. 初始搜索逻辑 ---
    const params = new URLSearchParams(window.location.search);
    const keyword = params.get('keyword');

    if (keyword) {
        const decodedKeyword = decodeURIComponent(keyword);
        keywordInput.value = decodedKeyword; // 回填输入框
        executeSearch(decodedKeyword);       // 执行搜索
    } else {
        resultsGrid.innerHTML = '<div class="empty-state">⚠️ 未提供搜索关键词</div>';
    }

    // --- 3. 绑定交互事件 ---
    // 点击搜索图标
    reSearchBtn.addEventListener('click', handleNewSearch);

    // 输入框回车
    keywordInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') handleNewSearch();
    });

    function handleNewSearch() {
        const newKwd = keywordInput.value.trim();
        if (newKwd) {
            // 通过修改 URL 触发刷新，保持状态可追溯
            window.location.href = `/search-results?keyword=${encodeURIComponent(newKwd)}`;
        }
    }

    // 绑定新返回按钮
    const backBtn = document.getElementById('backToMainBtn');
    if (backBtn) {
        backBtn.addEventListener('click', () => {
            window.location.href = '/main'; // 明确跳回指挥中心
        });
    }

    // 监听筛选按钮点击
    applyFilterBtn.addEventListener('click', () => {
        const type = document.getElementById('filterType').value;
        const reason = document.getElementById('filterReason').value;
        const keyword = keywordInput.value.trim();

        // 执行带有筛选条件的搜索
        executeFilteredSearch(keyword, type, reason);
    });
});

async function executeFilteredSearch(keyword, type, reason) {
    const grid = document.getElementById('resultsGrid');
    grid.innerHTML = '<div class="loading-state">⏳ 正在按条件过滤数据...</div>';

    try {
        // 构建带有 Query 参数的 URL
        let url = `/api/cases/search?keyword=${encodeURIComponent(keyword)}`;
        if (type) url += `&caseType=${encodeURIComponent(type)}`;
        if (reason) url += `&caseReason=${encodeURIComponent(reason)}`;

        const response = await fetch(url);
        const cases = await response.json();

        if (!cases || cases.length === 0) {
            grid.innerHTML = `<div class="empty-state">📭 该分类下未找到相关案件</div>`;
            return;
        }

        renderCaseCards(cases); // 重新渲染右侧列表
        renderSidebarStats(cases);
        // 注意：筛选后通常不需要重新渲染左侧统计图，或者根据筛选结果更新统计
    } catch (error) {
        grid.innerHTML = `<div class="error-state">❌ 过滤失败: ${error.message}</div>`;
    }
}

/**
 * 核心搜索执行函数
 */
async function executeSearch(keyword) {
    const grid = document.getElementById('resultsGrid');

    // 显示加载状态
    grid.innerHTML = '<div class="loading-state">⏳ 正在检索案件数据，请稍候...</div>';

    try {
        const response = await fetch(`/api/cases/search?keyword=${encodeURIComponent(keyword)}`);

        if (!response.ok) {
            throw new Error(`HTTP 错误: ${response.status}`);
        }

        const cases = await response.json();
        console.log("🔍 搜索结果第一条数据详情:", cases[0]);

        if (!cases || cases.length === 0) {
            grid.innerHTML = `<div class="empty-state">📭 未找到与“${escapeHtml(keyword)}”相关的案件</div>`;
            return;
        }

        // --- 同步渲染两侧内容 ---
        renderCaseCards(cases);      // 右侧：列表
        renderSidebarStats(cases);   // 左侧：画像

    } catch (error) {
        console.error('搜索流程异常:', error);
        grid.innerHTML = `<div class="error-state">❌ 搜索失败: ${escapeHtml(error.message)}</div>`;
    }

    try {
        const response = await fetch(`/api/cases/search?keyword=${encodeURIComponent(keyword)}`);
        const cases = await response.json();

        // --- 核心调试代码 ---
        console.log('【后端原始数据】:', cases);
        // ------------------

        renderCaseCards(cases);
    } catch (error) {
        console.error('搜索异常:', error);
    }
}

/**
 * 渲染右侧案件列表 (采用左侧同款 UI)
 */
function renderCaseCards(cases) {
    const grid = document.getElementById('resultsGrid');
    const currentKwd = new URLSearchParams(window.location.search).get('keyword') || '';

    grid.innerHTML = cases.map(c => {
        // 1. 案由解析：从 content 字符串中提取“案由：xxx。”
        let displayType = "刑事案件";
        if (c.content && c.content.includes("案由：")) {
            displayType = c.content.split("。")[0].replace("案由：", "");
        }

        // 2. 详情摘要：截取 content 的后续部分
        let summary = "暂无详情信息";
        if (c.content) {
            summary = c.content.split("。").slice(1).join("。");
        }

        return `
        <div class="case-card" onclick="window.location.href='/case/detail?id=${c.caseId}&fromKwd=${encodeURIComponent(currentKwd)}'">
            <div class="card-title">${escapeHtml(c.title || '未知案件')}</div>
            <div class="card-body">
                <strong>核心摘要：</strong><span style="color: #a0c4e8;">${escapeHtml(summary)}</span><br>
                <small style="color: #ffd166;">类型：${escapeHtml(displayType)}</small>
            </div>
            <div class="card-footer">
                <span>📍 北京市检察院 (由案号推断)</span>
                <span>📅 ${extractYear(c.title)}年</span>
            </div>
        </div>
        `;
    }).join('');
}

/**
 * 渲染左侧画像统计数据 & 提取动态筛选项
 */
function renderSidebarStats(cases) {
    const geoMap = {"北京": 0, "其他": 0};
    const yearMap = {};
    const reasonSet = new Set();
    const typeSet = new Set();

    cases.forEach(c => {
        if (!c) return; // 安全检查：防止数组项本身为空

        // --- 1. 案件类型提取 (增加空值保护) ---
        let typeValue = (c.caseType && c.caseType.trim()) ? c.caseType : null;

        // 仅当 content 存在时才进行 match
        if (!typeValue && c.content) {
            if (c.content.includes("刑事") || c.content.includes("罪")) typeValue = "刑事案件";
            else if (c.content.includes("民事") || c.content.includes("纠纷")) typeValue = "民事案件";
            else if (c.content.includes("公益诉讼")) typeValue = "公益诉讼";
            else if (c.content.includes("行政")) typeValue = "行政案件";
        }
        typeSet.add(typeValue || "其他类型");

        // --- 2. 案由提取 (修复 match 报错位置) ---
        let reasonValue = c.caseReason;

        // 关键点：必须先判断 c.content 是否存在，再调用 .match()
        if (!reasonValue && c.content) {
            const match = c.content.match(/案由：(.*?)[。]/);
            reasonValue = match ? match[1] : null;
        }
        if (reasonValue) reasonSet.add(reasonValue);

        // --- 3. 统计年份和地区 (增加标题空值保护) ---
        if (c.title) {
            const year = extractYear(c.title);
            yearMap[year] = (yearMap[year] || 0) + 1;
            if (c.title.includes("京")) geoMap["北京"]++;
            else if (c.title.includes("沪")) geoMap["上海"]++;
            else geoMap["其他"]++;
        }
    });

    // 渲染 UI（保持不变）
    updateStatsUI(yearMap, geoMap);

    updateDropdown('filterReason', reasonSet, '全部案由');
}

async function initFilters() {
    try {
        const [typesRes, reasonsRes] = await Promise.all([
            fetch('/api/cases/types'),
            fetch('/api/cases/reasons')
        ]);
        const types = await typesRes.json();
        const reasons = await reasonsRes.json();
        updateDropdown('filterType', new Set(types), '全部类型');
        updateDropdown('filterReason', new Set(reasons), '全部案由');
    } catch (err) {
        console.error('加载筛选项失败', err);
    }
}

/**
 * 通用的下拉框更新函数
 * @param {string} elementId - select 元素的 ID
 * @param {Set} dataSet - 去重后的数据集合
 * @param {string} defaultText - 默认选中的提示文字
 */
function updateDropdown(elementId, dataSet, defaultText) {
    const select = document.getElementById(elementId);
    if (!select) return;

    // 清空并设置默认项
    select.innerHTML = `<option value="">${defaultText}</option>`;

    // 填充动态内容
    Array.from(dataSet).sort().forEach(item => {
        const opt = document.createElement('option');
        opt.value = item;
        opt.textContent = item;
        select.appendChild(opt);
    });

    // 增加视觉反馈
    select.style.borderColor = "#00f2fe";
    setTimeout(() => {
        select.style.borderColor = "rgba(80, 160, 255, 0.3)";
    }, 800);
}

// 辅助函数：将原有的渲染逻辑抽离
function updateStatsUI(yearMap, geoMap) {
    const yearBox = document.getElementById('yearTrend');
    yearBox.innerHTML = `<ul>${Object.entries(yearMap).map(([y, count]) =>
        `<li><span>${y}年</span><strong>${count} 件</strong></li>`).join('')}</ul>`;

    const geoBox = document.getElementById('geoDistribution');
    geoBox.innerHTML = `<ul>${Object.entries(geoMap).filter(e => e[1] > 0).map(([n, count]) =>
        `<li><span>${n}地区</span><strong>${count} 件</strong></li>`).join('')}</ul>`;
}

function extractYear(str) {
    const match = str.match(/20\d{2}/);
    return match ? match[0] : "未知";
}

/**
 * 防 XSS 注入辅助函数
 */
function escapeHtml(str) {
    if (!str) return '';
    const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' };
    return String(str).replace(/[&<>"']/g, m => map[m]);
}