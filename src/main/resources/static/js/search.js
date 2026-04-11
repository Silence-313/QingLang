/**
 * ===== search.js - 搜索结果页重构版 (修复词云注册问题) =====
 */

(function injectBtnStyles() {
    const style = document.createElement('style');
    style.innerHTML = `
        .back-btn { background: rgba(90, 180, 255, 0.2) !important; border: 1px solid #5ab4ff !important; color: #5ab4ff !important; padding: 8px 18px !important; border-radius: 4px !important; cursor: pointer !important; font-weight: bold !important; transition: all 0.3s !important; margin-left: 20px; }
        .back-btn:hover { background: #5ab4ff !important; color: #fff !important; box-shadow: 0 0 15px rgba(90, 180, 255, 0.6) !important; }
        .chart-box { height: 220px !important; padding: 15px 5px; margin-top: 10px; width: 100%; }
        .empty-chart { color: #666; text-align: center; line-height: 200px; font-size: 0.9em; }
        .case-card { cursor: pointer; }
    `;
    document.head.appendChild(style);
})();

// 全局图表实例
let charts = { wordCloud: null, yearLine: null, geoBar: null };

// ---------- 词云插件主动保障 ----------
function ensureWordCloudRegistered() {
    return new Promise((resolve) => {
        // 如果已经注册了 wordCloud 系列，直接返回
        if (echarts && echarts.ChartViewClass && echarts.ChartViewClass._classMap) {
            const classMap = echarts.ChartViewClass._classMap;
            if (classMap && classMap.wordCloud) {
                resolve();
                return;
            }
        }
        // 否则等待脚本执行完成（最多等待 2 秒）
        let attempts = 0;
        const maxAttempts = 20;
        const interval = setInterval(() => {
            attempts++;
            if (echarts && echarts.ChartViewClass && echarts.ChartViewClass._classMap) {
                const classMap = echarts.ChartViewClass._classMap;
                if (classMap && classMap.wordCloud) {
                    clearInterval(interval);
                    resolve();
                }
            }
            if (attempts >= maxAttempts) {
                clearInterval(interval);
                console.warn('词云插件未成功注册，将使用降级显示');
                resolve(); // 仍继续执行，但显示错误信息
            }
        }, 100);
    });
}

// 安全销毁图表实例
function safeDispose(chartInstance) {
    if (!chartInstance) return;
    try {
        if (!chartInstance.isDisposed()) {
            chartInstance.dispose();
        }
    } catch (e) {
        console.warn('图表销毁时出现可忽略的错误:', e.message);
    }
}

// 清空容器内子元素，恢复默认类
function clearChartContainer(domId) {
    const dom = document.getElementById(domId);
    if (!dom) return;
    while (dom.firstChild) {
        dom.removeChild(dom.firstChild);
    }
    dom.style.cssText = '';
    dom.className = 'chart-box';
}

// 显示空数据占位
function showEmptyMessage(domId, message) {
    const dom = document.getElementById(domId);
    if (!dom) return;
    clearChartContainer(domId);
    const p = document.createElement('p');
    p.textContent = message;
    p.style.color = '#666';
    p.style.textAlign = 'center';
    p.style.lineHeight = '200px';
    p.style.margin = '0';
    dom.appendChild(p);
}

// ---------- 页面初始化 ----------
document.addEventListener('DOMContentLoaded', async () => {
    const keywordInput = document.getElementById('keywordInput');
    const reSearchBtn = document.getElementById('reSearchBtn');
    const resultsGrid = document.getElementById('resultsGrid');
    const applyFilterBtn = document.getElementById('applyFilterBtn');

    await initFilters();

    const params = new URLSearchParams(window.location.search);
    const keyword = params.get('keyword');

    if (keyword) {
        const decodedKeyword = decodeURIComponent(keyword);
        keywordInput.value = decodedKeyword;
        executeSearch(decodedKeyword);
    } else {
        resultsGrid.innerHTML = '<div class="empty-state">⚠️ 未提供搜索关键词</div>';
    }

    reSearchBtn.addEventListener('click', handleNewSearch);
    keywordInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') handleNewSearch(); });

    function handleNewSearch() {
        const newKwd = keywordInput.value.trim();
        if (newKwd) window.location.href = `/search-results?keyword=${encodeURIComponent(newKwd)}`;
    }

    const backBtn = document.getElementById('backToMainBtn');
    if (backBtn) backBtn.addEventListener('click', () => { window.location.href = '/main'; });

    applyFilterBtn.addEventListener('click', () => {
        const type = document.getElementById('filterType').value;
        const reason = document.getElementById('filterReason').value;
        const keyword = keywordInput.value.trim();
        executeFilteredSearch(keyword, type, reason);
    });
});

// ---------- 搜索与筛选 ----------
async function executeSearch(keyword) {
    const grid = document.getElementById('resultsGrid');
    grid.innerHTML = '<div class="loading-state">⏳ 正在检索案件数据...</div>';
    try {
        const response = await fetch(`/api/cases/search?keyword=${encodeURIComponent(keyword)}`);
        const cases = await response.json();
        if (!cases || cases.length === 0) {
            grid.innerHTML = `<div class="empty-state">📭 未找到相关案件</div>`;
            return;
        }
        renderCaseCards(cases, keyword);
        renderSidebarStats(cases);
        updateReasonFilterFromCases(cases);
    } catch (error) {
        grid.innerHTML = `<div class="error-state">❌ 搜索失败: ${error.message}</div>`;
    }
}

async function executeFilteredSearch(keyword, type, reason) {
    const grid = document.getElementById('resultsGrid');
    grid.innerHTML = '<div class="loading-state">⏳ 正在过滤数据...</div>';
    try {
        let url = `/api/cases/search?keyword=${encodeURIComponent(keyword)}`;
        if (type) url += `&caseType=${encodeURIComponent(type)}`;
        if (reason) url += `&caseReason=${encodeURIComponent(reason)}`;
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        const cases = await response.json();
        renderCaseCards(cases, keyword);
        renderSidebarStats(cases);
        updateReasonFilterFromCases(cases);
    } catch (error) {
        console.error('筛选请求失败:', error);
        grid.innerHTML = `<div class="error-state">❌ 过滤失败: ${error.message}</div>`;
    }
}

// ---------- 卡片渲染 ----------
function renderCaseCards(cases, keyword) {
    const grid = document.getElementById('resultsGrid');
    if (!cases || cases.length === 0) {
        grid.innerHTML = '<div class="empty-state">📭 没有符合条件的案件</div>';
        return;
    }

    grid.innerHTML = cases.map(c => {
        const prosecutor = extractProsecutor(c.courtName || c.title);
        const summary = c.content ? c.content.split('。')[1] || c.content : "暂无摘要";
        const caseId = c.caseId || '';
        return `
            <div class="case-card" onclick="window.location.href='/case/detail?id=${caseId}&fromKwd=${encodeURIComponent(keyword || '')}'">
                <div class="card-title">${escapeHtml(c.title || '无标题')}</div>
                <div class="card-body">
                    <strong>案件内容：</strong><span style="color: #a0c4e8;">${escapeHtml(summary)}</span><br>
                    <small style="color: #ffd166;">案由：${escapeHtml(c.caseReason || '涉外案件')}</small>
                </div>
                <div class="card-footer">
                    <span>📍 ${escapeHtml(prosecutor)}</span>
                    <span>📅 ${c.endDate ? c.endDate.substring(0, 4) : '进行中'}</span>
                </div>
            </div>`;
    }).join('');
}

// ---------- 侧边栏统计与图表 ----------
function renderSidebarStats(cases) {
    // 销毁所有旧图表
    Object.keys(charts).forEach(key => {
        safeDispose(charts[key]);
        charts[key] = null;
    });

    const yearMap = {};
    const geoStats = {};
    const totalSearchCount = cases.length;

    cases.forEach(c => {
        // 年份
        let year = '未知';
        if (c.endDate && c.endDate.length >= 4) {
            year = c.endDate.substring(0, 4);
        } else if (c.content) {
            const match = c.content.match(/20\d{2}/);
            year = match ? match[0] : '未知';
        }
        if (year !== '未知') yearMap[year] = (yearMap[year] || 0) + 1;

        // 地区
        const province = extractProvinceFromCourt(c.courtName || '');
        if (!geoStats[province]) geoStats[province] = { closed: 0 };
        if (c.endDate) geoStats[province].closed++;
    });

    // 词云需要等待插件注册
    // ensureWordCloudRegistered().then(() => {
    //     initWordCloud(cases);
    // });
    initYearLineChart(yearMap);
    initGeoBarChart(geoStats, totalSearchCount);
}

function updateReasonFilterFromCases(cases) {
    const reasonSet = new Set();
    cases.forEach(c => {
        if (c.caseReason && c.caseReason !== '未知案由') {
            reasonSet.add(c.caseReason);
        }
    });
    updateDropdown('filterReason', reasonSet, '全部案由');
}

// ---------- 图表初始化函数 ----------
function initWordCloud(cases) {
    const dom = document.getElementById('geoDistribution');
    if (!dom) return;

    // 清空旧内容
    clearChartContainer('geoDistribution');

    // 统计案由
    const counts = {};
    cases.forEach(c => {
        let reason = c.caseReason || c.causeOfAction || '';
        if (reason && reason.trim() !== '' && reason !== '未知案由' && reason !== '涉外案件') {
            counts[reason] = (counts[reason] || 0) + 1;
        }
    });

    const data = Object.entries(counts).map(([name, value]) => ({
        name: name,
        value: value * 20
    }));

    if (data.length === 0) {
        showEmptyMessage('geoDistribution', '暂无有效案由数据');
        return;
    }

    // 尝试初始化，若系列未注册则降级显示
    try {
        charts.wordCloud = echarts.init(dom);
        const option = {
            series: [{
                type: 'wordCloud',
                shape: 'circle',
                sizeRange: [14, 35],
                rotationRange: [0, 0],
                gridSize: 8,
                drawOutOfBound: false,
                layoutAnimation: true,
                textStyle: {
                    fontFamily: 'Microsoft YaHei, sans-serif',
                    fontWeight: 'normal',
                    color: function () {
                        return `rgb(${Math.round(Math.random() * 160 + 90)}, ${Math.round(Math.random() * 160 + 90)}, 255)`;
                    }
                },
                emphasis: {
                    textStyle: {
                        fontWeight: 'bold',
                        color: '#ffd166'
                    }
                },
                data: data
            }]
        };
        charts.wordCloud.setOption(option);
        setTimeout(() => {
            if (charts.wordCloud && !charts.wordCloud.isDisposed()) {
                charts.wordCloud.resize();
            }
        }, 100);
    } catch (e) {
        console.error('词云渲染失败:', e);
        showEmptyMessage('geoDistribution', '词云组件加载失败');
    }
}

function initYearLineChart(yearMap) {
    const domId = 'yearTrend';
    const dom = document.getElementById(domId);
    if (!dom) return;

    safeDispose(charts.yearLine);
    charts.yearLine = null;

    const years = Object.keys(yearMap).sort();
    if (years.length === 0) {
        showEmptyMessage(domId, '暂无趋势数据');
        return;
    }

    clearChartContainer(domId);
    charts.yearLine = echarts.init(dom);
    charts.yearLine.setOption({
        // title: { text: '📈 案件年度趋势', textStyle: { color: '#00f2fe', fontSize: 13 }, left: 'center' },
        tooltip: { trigger: 'axis' },
        xAxis: { type: 'category', data: years, axisLabel: { color: '#a0c4e8' } },
        yAxis: { type: 'value', minInterval: 1, splitLine: { lineStyle: { color: '#333' } }, axisLabel: { color: '#a0c4e8' } },
        series: [{
            data: years.map(y => yearMap[y]),
            type: 'line',
            smooth: true,
            areaStyle: { color: 'rgba(0, 242, 254, 0.2)' },
            itemStyle: { color: '#00f2fe' }
        }]
    });
}

function initGeoBarChart(geoStats, totalSearchCount) {
    const domId = 'resultAnalysis';
    const dom = document.getElementById(domId);
    if (!dom) return;

    safeDispose(charts.geoBar);
    charts.geoBar = null;

    const names = Object.keys(geoStats);
    if (names.length === 0) {
        showEmptyMessage(domId, '暂无地区数据');
        return;
    }

    const rates = names.map(n => {
        return totalSearchCount > 0
            ? ((geoStats[n].closed / totalSearchCount) * 100).toFixed(1)
            : 0;
    });

    clearChartContainer(domId);
    charts.geoBar = echarts.init(dom);
    charts.geoBar.setOption({
        // title: {
        //     text: '📊 地区结案贡献率 (基于搜索总量)',
        //     textStyle: { color: '#00f2fe', fontSize: 13 },
        //     left: 'center'
        // },
        tooltip: {
            trigger: 'axis',
            formatter: function(params) {
                const i = params[0].dataIndex;
                const name = names[i];
                const count = geoStats[name].closed;
                return `${name}<br/>结案数：${count} 件<br/>占搜索总量：${params[0].value}%`;
            }
        },
        xAxis: {
            type: 'category',
            data: names,
            axisLabel: { color: '#a0c4e8' }
        },
        yAxis: {
            type: 'value',
            max: 100,
            axisLabel: {
                color: '#a0c4e8',
                formatter: '{value}%'
            },
            splitLine: { lineStyle: { color: '#333' } }
        },
        series: [{
            name: '占比',
            data: rates,
            type: 'bar',
            barWidth: '40%',
            label: {
                show: true,
                position: 'top',
                formatter: '{c}%',
                color: '#00f2fe'
            },
            itemStyle: {
                color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                    { offset: 0, color: '#00f2fe' },
                    { offset: 1, color: '#5ab4ff' }
                ])
            }
        }]
    });
}

// ---------- 辅助函数 ----------
function extractProvinceFromCourt(courtName) {
    if (!courtName) return '其他';
    const cn = courtName;

    if (cn.includes('北京') || cn.includes('京')) return '北京';
    if (cn.includes('上海') || cn.includes('沪')) return '上海';
    if (cn.includes('天津') || cn.includes('津')) return '天津';
    if (cn.includes('重庆') || cn.includes('渝')) return '重庆';

    const provinces = [
        '河北','山西','辽宁','吉林','黑龙江','江苏','浙江','安徽','福建','江西','山东',
        '河南','湖北','湖南','广东','海南','四川','贵州','云南','陕西','甘肃','青海',
        '台湾','内蒙古','广西','西藏','宁夏','新疆','香港','澳门'
    ];
    for (let p of provinces) {
        if (cn.includes(p)) return p;
    }

    if (cn.includes('西安') || cn.includes('陕')) return '陕西';
    if (cn.includes('广州') || cn.includes('深圳') || cn.includes('粤')) return '广东';
    if (cn.includes('杭州') || cn.includes('宁波') || cn.includes('浙')) return '浙江';
    if (cn.includes('南京') || cn.includes('苏州') || cn.includes('苏')) return '江苏';
    if (cn.includes('武汉') || cn.includes('鄂')) return '湖北';
    if (cn.includes('成都') || cn.includes('川')) return '四川';
    if (cn.includes('最高人民法院')) return '北京';

    return '其他';
}

async function initFilters() {
    try {
        const tRes = await fetch('/api/cases/types');
        updateDropdown('filterType', new Set(await tRes.json()), '全部类型');
        updateDropdown('filterReason', new Set(), '请先搜索');
    } catch (e) { console.error("初始化筛选失败"); }
}

function updateDropdown(id, dataSet, defaultText) {
    const s = document.getElementById(id);
    if (!s) return;
    s.innerHTML = `<option value="">${defaultText}</option>`;
    Array.from(dataSet).sort().forEach(item => {
        const o = document.createElement('option');
        o.value = o.textContent = item;
        s.appendChild(o);
    });
}

function extractProsecutor(text) {
    if (!text) return "北京市检察院";
    const m = text.match(/([^：\/\s\n]+检察院)/);
    if (m) return m[1].trim();
    const c = text.match(/([^：\/\s\n]+法院)/);
    return c ? c[1].replace("法院", "检察院") : "北京市检察院";
}

function escapeHtml(s) {
    if (!s) return '';
    const m = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' };
    return String(s).replace(/[&<>"']/g, k => m[k]);
}

window.addEventListener('resize', () => {
    Object.values(charts).forEach(c => c && c.resize());
});