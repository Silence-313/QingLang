/**
 * ===== search.js - 搜索结果页重构版 =====
 * 1. 自动读取 URL 参数并回填
 * 2. 支持顶部输入框二次检索
 * 3. 左右两侧数据同步渲染（列表+画像）
 */

document.addEventListener('DOMContentLoaded', () => {
    // --- 1. 初始化 DOM 元素 ---
    const keywordInput = document.getElementById('keywordInput');
    const reSearchBtn = document.getElementById('reSearchBtn');
    const resultsGrid = document.getElementById('resultsGrid');

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
});

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
}

/**
 * 渲染右侧案件列表 (采用左侧同款 UI)
 */
function renderCaseCards(cases) {
    const grid = document.getElementById('resultsGrid');
    grid.innerHTML = cases.map(c => `
        <div class="case-card" onclick="window.location.href='/case/detail?id=${c.caseId || c.id}'">
            <div class="card-title">${escapeHtml(c.title || c.caseNumber)}</div>
            <div class="card-body">
                ${c.summary ? escapeHtml(c.summary) : `
                    <strong>当事人：</strong>${escapeHtml(c.partyName || '匿名')}<br>
                    <small>案由：${escapeHtml(c.causeOfAction || '—')}</small>
                `}
            </div>
            <div class="card-footer">
                <span>📍 ${escapeHtml(c.courtName || '未标明')}</span>
                <span>📅 ${escapeHtml(c.publishDate || c.caseYear || '近期')}</span>
            </div>
        </div>
    `).join('');
}

/**
 * 渲染左侧画像统计数据
 */
function renderSidebarStats(cases) {
    const geoMap = {};
    const yearMap = {};

    cases.forEach(c => {
        // 地区统计
        const court = c.courtName || '其他法院';
        geoMap[court] = (geoMap[court] || 0) + 1;

        // 年份统计 (支持多种字段名)
        let year = '未知';
        const rawYear = c.publishDate || c.caseNumber || '';
        const yearMatch = rawYear.match(/20\d{2}/);
        if (yearMatch) year = yearMatch[0];

        yearMap[year] = (yearMap[year] || 0) + 1;
    });

    // 填充地区分布 (取前 5)
    const geoBox = document.getElementById('geoDistribution');
    const geoHtml = Object.entries(geoMap)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([name, count]) => `<li><span>${name}</span><strong>${count} 件</strong></li>`)
        .join('');
    geoBox.innerHTML = `<div style="width:100%"><ul>${geoHtml}</ul></div>`;

    // 填充年份趋势
    const yearBox = document.getElementById('yearTrend');
    const yearHtml = Object.entries(yearMap)
        .sort((a, b) => b[0] - a[0]) // 按年份降序
        .map(([year, count]) => `<li><span>${year}年</span><strong>${count} 件</strong></li>`)
        .join('');
    yearBox.innerHTML = `<div style="width:100%"><ul>${yearHtml}</ul></div>`;

    // 裁判结果对比 (模拟逻辑，可根据实际后端字段调整)
    const resultBox = document.getElementById('resultAnalysis');
    resultBox.innerHTML = `<div style="text-align:center; padding: 10px; color: #5ab4ff;">
        检索到相关条目：${cases.length} 条<br>
        <small style="color: #6a8caa">数据已更新于当前实时库</small>
    </div>`;
}

/**
 * 防 XSS 注入辅助函数
 */
function escapeHtml(str) {
    if (!str) return '';
    const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' };
    return String(str).replace(/[&<>"']/g, m => map[m]);
}