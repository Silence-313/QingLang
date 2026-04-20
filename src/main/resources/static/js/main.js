// ===== main.js - 3D地图指挥中心核心逻辑（完整版，含案由筛选） =====
(function() {
    const ALL_PROVINCES = [
        '北京', '天津', '上海', '重庆', '河北', '河南', '云南', '辽宁', '黑龙江', '湖南',
        '安徽', '山东', '新疆', '江苏', '浙江', '江西', '湖北', '广西', '甘肃', '山西',
        '内蒙古', '陕西', '吉林', '福建', '贵州', '广东', '青海', '西藏', '四川', '宁夏',
        '海南', '台湾', '香港', '澳门'
    ];

    const PROVINCE_NAME_MAP = {
        '新疆维吾尔自治区': '新疆', '内蒙古自治区': '内蒙古', '广西壮族自治区': '广西',
        '西藏自治区': '西藏', '宁夏回族自治区': '宁夏', '北京市': '北京', '天津市': '天津',
        '上海市': '上海', '重庆市': '重庆', '香港特别行政区': '香港', '澳门特别行政区': '澳门',
        '台湾省': '台湾'
    };

    const SMALL_PROVINCES = ['北京', '天津', '香港', '澳门'];

    // 智能助手相关全局变量
    let ws = null;
    let currentAssistantMessage = null;
    let currentAIResponse = '';
    let currentConversationId = null;
    let isFirstMessageInConversation = true;

    let RAW = [], dataMap = {}, totalCases = 0, maxValue = 1;
    let lockedProvince = null, isLocked = false;
    let isOverviewActive = false;

    let currentSelectedReason = '';
    const searchInput = document.getElementById('caseSearchInput');
    const suggestionsBox = document.getElementById('searchSuggestions');
    let debounceTimer;

    // ---------- 搜索提示词 ----------
    searchInput.addEventListener('input', (e) => {
        const keyword = e.target.value.trim();
        clearTimeout(debounceTimer);
        if (!keyword) { suggestionsBox.style.display = 'none'; return; }
        debounceTimer = setTimeout(() => fetchSuggestions(keyword), 300);
    });

    async function fetchSuggestions(keyword) {
        try {
            const response = await fetch(`/api/cases/search?keyword=${encodeURIComponent(keyword)}`);
            const cases = await response.json();
            cases && cases.length > 0 ? renderSuggestions(cases.slice(0, 8)) : (suggestionsBox.style.display = 'none');
        } catch (err) { console.error("提示词加载失败", err); }
    }

    function renderSuggestions(list) {
        suggestionsBox.innerHTML = '';
        if (!list || list.length === 0) { suggestionsBox.style.display = 'none'; return; }
        suggestionsBox.innerHTML = list.map(item => `
            <div class="suggestion-item" data-id="${item.caseId}" style="padding:10px;border-bottom:1px solid #444;cursor:pointer;">
                <div class="item-title" style="font-weight:bold;color:#fff;font-size:14px;">${escapeHtml(item.title)}</div>
                <div class="item-desc" style="font-size:12px;color:#aaa;margin-top:4px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${escapeHtml(item.content)}</div>
            </div>
        `).join('');
        suggestionsBox.style.display = 'block';
        const currentInputKwd = searchInput.value.trim();
        suggestionsBox.querySelectorAll('.suggestion-item').forEach(el => {
            el.onclick = function() {
                window.location.href = `/case/detail?id=${this.getAttribute('data-id')}&fromKwd=${encodeURIComponent(currentInputKwd)}`;
            };
        });
    }

    document.addEventListener('click', (e) => {
        if (e.target !== searchInput) suggestionsBox.style.display = 'none';
    });

    function escapeHtml(str) {
        if (!str) return '';
        return String(str).replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'})[m]);
    }

    // ---------- 地图初始化 ----------
    const chartDom = document.getElementById('map');
    let chart = null;

    const colorStops = [
        [0,   [210, 235, 255]], [0.2, [130, 190, 245]], [0.5, [50, 125, 210]],
        [0.8, [18,  65,  155]], [1.0, [5,   28,   85]]
    ];

    function getColorByValue(ratio) {
        let t = Math.max(0, Math.min(1, ratio));
        for (let i = 0; i < colorStops.length - 1; i++) {
            if (t <= colorStops[i+1][0]) {
                const s = (t - colorStops[i][0]) / (colorStops[i+1][0] - colorStops[i][0]);
                const c = (j) => Math.round(colorStops[i][1][j] + s * (colorStops[i+1][1][j] - colorStops[i][1][j]));
                return `rgb(${c(0)},${c(1)},${c(2)})`;
            }
        }
        return `rgb(5,28,85)`;
    }

    function buildMapOption(hoveredName = null) {
        const seriesData = RAW.map(item => ({
            name: item.name,
            value: item.riskScore || 0
        }));

        return {
            tooltip: { show: false },
            visualMap: {
                min: 0,
                max: maxValue,
                calculable: true,
                inRange: {
                    color: ['#d2ebff', '#82bef5', '#327dd2', '#12419b', '#051c55']
                },
                seriesIndex: 0,
                show: true,
                left: 'left',
                top: 'bottom'
            },
            series: [{
                type: 'map3D',
                map: 'china',
                shading: 'color',
                regionHeight: 2,
                viewControl: {
                    alpha: 45, beta: 0, distance: 115,
                    rotateSensitivity: 1, zoomSensitivity: 1,
                    minDistance: 70, maxDistance: 220, maxAlpha: 90, minAlpha: 10,
                },
                itemStyle: {
                    borderColor: 'rgba(160,205,255,0.4)',
                    borderWidth: 0.7,
                    opacity: 1,
                },
                label: {
                    show: true,
                    textStyle: { color: '#0d2560', fontSize: 10, textBorderColor: 'rgba(255,255,255,0.85)', textBorderWidth: 2 }
                },
                emphasis: {
                    itemStyle: { areaColor: '#ffca4d', borderColor: 'rgba(255,245,180,0.9)', borderWidth: 1.2 }
                },
                light: {
                    main: { intensity: 1.5, shadow: false },
                    ambient: { intensity: 0.5 }
                },
                data: seriesData,
            }]
        };
    }

    // 确保四种案件类型都存在，缺失的补0
    function ensureAllCaseTypes(typeStats) {
        const allTypes = ['刑事', '民事', '行政', '公益诉讼'];
        const map = new Map(typeStats.map(it => [it.name, it.count]));
        return allTypes.map(name => ({ name, count: map.get(name) || 0 }));
    }

    // 更新案件类型按钮上的数量
    function updateCaseTypeButtonsCount(typeCounts) {
        const typeMap = {
            '刑事': '⚖️ 刑事案件',
            '民事': '📄 民事案件',
            '行政': '🏛️ 行政案件',
            '公益诉讼': '🌿 公益诉讼'
        };
        document.querySelectorAll('.case-type-btn').forEach(btn => {
            const type = btn.getAttribute('data-type');
            const count = typeCounts[type] || 0;
            const baseText = typeMap[type] || type;
            btn.textContent = `${baseText} (${count})`;
        });
    }

    // ---------- 地区对比弹窗逻辑 ----------
    let comparisonCharts = {};

    async function initComparisonModal() {
        const provinceASelect = document.getElementById('provinceASelect');
        const provinceBSelect = document.getElementById('provinceBSelect');
        const compareBtn = document.getElementById('compareBtn');

        // 加载可用省份列表
        try {
            const res = await fetch('/api/comparison/available-provinces');
            const provinces = await res.json();
            populateProvinceSelect(provinceASelect, provinces);
            populateProvinceSelect(provinceBSelect, provinces);
        } catch (err) {
            console.error('加载省份列表失败', err);
        }

        compareBtn.addEventListener('click', performComparison);

        document.getElementById('applyFilterBtn').addEventListener('click', applyFilter);
        document.getElementById('resetFilterBtn').addEventListener('click', resetFilter);
        document.getElementById('backToChartBtn').addEventListener('click', showChartView);
    }

    function populateProvinceSelect(selectEl, provinces) {
        selectEl.innerHTML = '<option value="">-- 请选择 --</option>';
        provinces.forEach(p => {
            const option = document.createElement('option');
            option.value = p;
            option.textContent = p;
            selectEl.appendChild(option);
        });
    }

    async function performComparison() {
        const provinceA = document.getElementById('provinceASelect').value;
        const provinceB = document.getElementById('provinceBSelect').value;

        if (!provinceA || !provinceB) {
            alert('请选择两个地区');
            return;
        }
        if (provinceA === provinceB) {
            alert('请选择不同的地区进行对比');
            return;
        }

        // 显示加载状态
        document.getElementById('comparisonResult').style.display = 'block';
        // 可添加 loading 效果

        try {
            const res = await fetch(`/api/comparison/provinces?provinceA=${provinceA}&provinceB=${provinceB}`);
            const data = await res.json();

            renderComparison(data.provinceA, data.provinceB);

            // 加载年份下拉框选项（基于两个地区的数据）
            await loadYearOptions(provinceA, provinceB);

            // 显示筛选栏和图表区域，隐藏列表
            document.getElementById('filterBar').style.display = 'flex';
            document.getElementById('comparisonResult').style.display = 'block';
            document.getElementById('caseListContainer').style.display = 'none';
        } catch (err) {
            console.error('对比失败', err);
            alert('数据加载失败');
        }


    }

    // 加载年份选项
    async function loadYearOptions(provinceA, provinceB) {
        try {
            // 直接使用一次请求获取两个省份的数据（复用已有的数据）
            const res = await fetch(`/api/comparison/provinces?provinceA=${provinceA}&provinceB=${provinceB}`);
            const data = await res.json();
            const years = new Set();

            const yearlyA = data.provinceA?.yearlyCases || {};
            const yearlyB = data.provinceB?.yearlyCases || {};

            Object.keys(yearlyA).forEach(y => years.add(y));
            Object.keys(yearlyB).forEach(y => years.add(y));

            const sortedYears = Array.from(years).filter(y => !isNaN(y)).sort();
            const select = document.getElementById('yearFilter');
            select.innerHTML = '<option value="">全部年份</option>';
            sortedYears.forEach(y => {
                const opt = document.createElement('option');
                opt.value = y;
                opt.textContent = y;
                select.appendChild(opt);
            });
        } catch (e) {
            console.error('加载年份失败', e);
        }
    }

// 应用筛选
    async function applyFilter() {
        const provinceA = document.getElementById('provinceASelect').value;
        const provinceB = document.getElementById('provinceBSelect').value;
        const year = document.getElementById('yearFilter').value;
        const caseType = document.getElementById('typeFilter').value;

        if (!provinceA || !provinceB) return;

        try {
            const url = `/api/comparison/cases?provinceA=${provinceA}&provinceB=${provinceB}&year=${year}&caseType=${caseType}`;
            const res = await fetch(url);
            const cases = await res.json();
            renderCaseList(cases);

            // 切换到列表视图
            document.getElementById('comparisonResult').style.display = 'none';
            document.getElementById('caseListContainer').style.display = 'block';
        } catch (err) {
            console.error('筛选失败', err);
        }
    }

// 重置筛选
    function resetFilter() {
        document.getElementById('yearFilter').value = '';
        document.getElementById('typeFilter').value = '';
        // 恢复图表视图
        showChartView();
    }

// 显示图表视图
    function showChartView() {
        document.getElementById('comparisonResult').style.display = 'block';
        document.getElementById('caseListContainer').style.display = 'none';
    }

// 渲染案件列表
    function renderCaseList(cases) {
        const container = document.getElementById('caseListContent');
        if (!cases || cases.length === 0) {
            container.innerHTML = '<div class="empty-placeholder">暂无符合条件的案件</div>';
            return;
        }
        container.innerHTML = cases.map(c => `
        <div class="list-case-item" onclick="window.location.href='/case/detail?id=${c.caseId}'">
            <div class="list-case-title">${escapeHtml(c.caseName)}</div>
            <div class="list-case-meta">
                <span>${escapeHtml(c.caseNumber)}</span>
                <span>${escapeHtml(c.caseType || '未分类')}</span>
                <span>${c.acceptanceDate || '日期未知'}</span>
                <span>${escapeHtml(c.caseReason || '')}</span>
            </div>
        </div>
    `).join('');
    }

    function renderComparison(dataA, dataB) {
        // 更新卡片 KPI
        document.getElementById('provinceAName').textContent = dataA.name;
        document.getElementById('provinceBName').textContent = dataB.name;
        document.getElementById('aTotalCases').textContent = dataA.totalCases;
        document.getElementById('aTotalPages').textContent = dataA.totalPages;
        document.getElementById('aSupervision').textContent = dataA.supervisionCount;
        document.getElementById('aRiskScore').textContent = dataA.avgRiskScore.toFixed(1);
        document.getElementById('bTotalCases').textContent = dataB.totalCases;
        document.getElementById('bTotalPages').textContent = dataB.totalPages;
        document.getElementById('bSupervision').textContent = dataB.supervisionCount;
        document.getElementById('bRiskScore').textContent = dataB.avgRiskScore.toFixed(1);

        // 渲染图表
        renderTypeChart(dataA, dataB);
        renderReasonChart(dataA, dataB);
        renderNationalityChart(dataA, dataB);
        renderLawChart(dataA, dataB);
    }

    function renderTypeChart(dataA, dataB) {
        const dom = document.getElementById('typeChart');
        if (comparisonCharts.typeChart) comparisonCharts.typeChart.dispose();
        const chart = echarts.init(dom);
        comparisonCharts.typeChart = chart;

        const types = ['刑事', '民事', '行政', '公益诉讼'];
        const seriesA = types.map(t => dataA.typeDistribution[t] || 0);
        const seriesB = types.map(t => dataB.typeDistribution[t] || 0);

        chart.setOption({
            tooltip: { trigger: 'axis' },
            legend: { data: [dataA.name, dataB.name], textStyle: { color: '#a0c8f8' } },
            xAxis: { type: 'category', data: types, axisLabel: { color: '#a0c8f8' } },
            yAxis: { type: 'value', axisLabel: { color: '#a0c8f8' } },
            series: [
                { name: dataA.name, type: 'bar', data: seriesA, itemStyle: { color: '#5ab4ff' } },
                { name: dataB.name, type: 'bar', data: seriesB, itemStyle: { color: '#ffd166' } }
            ],
            grid: { containLabel: true, top: 30, bottom: 20 }
        });
    }

    function renderReasonChart(dataA, dataB) {
        const dom = document.getElementById('reasonChart');
        if (comparisonCharts.reasonChart) comparisonCharts.reasonChart.dispose();
        const chart = echarts.init(dom);
        comparisonCharts.reasonChart = chart;

        const reasonsA = dataA.topReasons || [];
        const reasonsB = dataB.topReasons || [];

        const pieDataA = reasonsA.map(r => ({ name: r.name, value: r.count }));
        const pieDataB = reasonsB.map(r => ({ name: r.name, value: r.count }));

        if (pieDataA.length === 0 && pieDataB.length === 0) {
            chart.setOption({
                title: { text: '暂无案由数据', textStyle: { color: '#a0c8f8' }, left: 'center', top: 'center' }
            });
            return;
        }

        chart.setOption({
            tooltip: { trigger: 'item', formatter: '{b}: {c} ({d}%)' },
            // 关键修改：图例隐藏
            legend: { show: false },
            series: [
                {
                    name: dataA.name,
                    type: 'pie',
                    radius: ['20%', '45%'],
                    center: ['25%', '55%'],
                    label: { show: false },  // 也可关闭标签，仅靠悬浮
                    emphasis: { scale: true },
                    data: pieDataA,
                    itemStyle: { borderRadius: 6, borderColor: '#060e1f', borderWidth: 1 }
                },
                {
                    name: dataB.name,
                    type: 'pie',
                    radius: ['20%', '45%'],
                    center: ['75%', '55%'],
                    label: { show: false },
                    emphasis: { scale: true },
                    data: pieDataB,
                    itemStyle: { borderRadius: 6, borderColor: '#060e1f', borderWidth: 1 }
                }
            ],
            graphic: [
                { type: 'text', left: '25%', top: 20, style: { text: dataA.name, fill: '#5ab4ff', fontSize: 13 } },
                { type: 'text', left: '75%', top: 20, style: { text: dataB.name, fill: '#ffd166', fontSize: 13 } }
            ]
        });
    }

    function renderNationalityChart(dataA, dataB) {
        const dom = document.getElementById('nationalityChart');
        if (comparisonCharts.nationalityChart) comparisonCharts.nationalityChart.dispose();
        const chart = echarts.init(dom);
        comparisonCharts.nationalityChart = chart;

        // 合并两地区国籍数据，展示对比条形图
        const nationsA = dataA.topNationalities || [];
        const nationsB = dataB.topNationalities || [];
        const allNations = [...new Set([...nationsA.map(n => n.name), ...nationsB.map(n => n.name)])].slice(0, 6);

        const seriesA = allNations.map(n => nationsA.find(item => item.name === n)?.count || 0);
        const seriesB = allNations.map(n => nationsB.find(item => item.name === n)?.count || 0);

        chart.setOption({
            tooltip: { trigger: 'axis' },
            legend: { data: [dataA.name, dataB.name], textStyle: { color: '#a0c8f8' } },
            xAxis: { type: 'category', data: allNations, axisLabel: { color: '#a0c8f8' } },
            yAxis: { type: 'value', axisLabel: { color: '#a0c8f8' } },
            series: [
                { name: dataA.name, type: 'bar', data: seriesA, itemStyle: { color: '#5ab4ff' } },
                { name: dataB.name, type: 'bar', data: seriesB, itemStyle: { color: '#ffd166' } }
            ],
            grid: { containLabel: true, top: 30 }
        });
    }

    function renderLawChart(dataA, dataB) {
        const dom = document.getElementById('lawChart');
        if (comparisonCharts.lawChart) comparisonCharts.lawChart.dispose();
        const chart = echarts.init(dom);
        comparisonCharts.lawChart = chart;

        const yearlyA = dataA.yearlyCases || {};
        const yearlyB = dataB.yearlyCases || {};

        // 收集所有年份并排序
        const allYears = new Set([...Object.keys(yearlyA), ...Object.keys(yearlyB)]);
        const sortedYears = Array.from(allYears).filter(y => !isNaN(y)).sort();

        if (sortedYears.length === 0) {
            chart.setOption({
                title: { text: '暂无年度数据', textStyle: { color: '#a0c8f8' }, left: 'center', top: 'center' }
            });
            return;
        }

        const seriesAData = sortedYears.map(y => yearlyA[y] || 0);
        const seriesBData = sortedYears.map(y => yearlyB[y] || 0);

        chart.setOption({
            tooltip: { trigger: 'axis' },
            legend: { data: [dataA.name, dataB.name], textStyle: { color: '#a0c8f8' }, top: 0 },
            grid: { left: '10%', right: '5%', top: '20%', bottom: '10%', containLabel: true },
            xAxis: {
                type: 'category',
                data: sortedYears,
                axisLabel: { color: '#a0c8f8' },
                axisLine: { lineStyle: { color: '#2c5a8c' } }
            },
            yAxis: {
                type: 'value',
                name: '案件数量',
                nameTextStyle: { color: '#a0c8f8' },
                axisLabel: { color: '#a0c8f8' },
                splitLine: { lineStyle: { color: '#1a2f4a', type: 'dashed' } }
            },
            series: [
                {
                    name: dataA.name,
                    type: 'line',
                    data: seriesAData,
                    smooth: true,
                    lineStyle: { color: '#5ab4ff', width: 2 },
                    areaStyle: { color: 'rgba(90,180,255,0.2)' },
                    symbol: 'circle',
                    symbolSize: 6
                },
                {
                    name: dataB.name,
                    type: 'line',
                    data: seriesBData,
                    smooth: true,
                    lineStyle: { color: '#ffd166', width: 2 },
                    areaStyle: { color: 'rgba(255,209,102,0.2)' },
                    symbol: 'diamond',
                    symbolSize: 6
                }
            ]
        });
    }

// 在 bindModalEvents 函数中增加初始化调用
    const originalBindModalEvents = bindModalEvents;
    bindModalEvents = function() {
        originalBindModalEvents();
        // 当弹窗打开时初始化下拉框（也可以提前初始化）
        initComparisonModal();
    };

    /**
     * 获取并渲染 info-panel 的详细统计数据
     * @param {string|null} province 省份简称，null 表示全国
     */
    async function fetchAndRenderPanelStats(province) {
        try {
            const url = province
                ? `/api/stats/panel?province=${encodeURIComponent(province)}`
                : '/api/stats/panel';
            const res = await fetch(url);
            if (!res.ok) throw new Error('获取统计数据失败');
            const data = await res.json();

            // 更新案件总数
            if (data.totalCases !== undefined) {
                document.getElementById('pTotalCases').innerText = data.totalCases + ' 件';
            } else {
                document.getElementById('pTotalCases').innerText = (province ? (dataMap[province]?.caseCount || 0) : totalCases) + ' 件';
            }

            // 渲染类型占比（保证四种类型）
            const typeStats = ensureAllCaseTypes(data.typeStats || []);
            renderStatsList('pTypeStats', typeStats);

            // 渲染案由占比（前4）
            const reasonStats = data.reasonStats || [];
            renderStatsList('pReasonStats', reasonStats.slice(0, 4));

            // 更新按钮上的数量
            if (data.typeCounts) {
                updateCaseTypeButtonsCount(data.typeCounts);
            } else {
                // 若后端未返回 typeCounts，则从前端计算
                const typeCounts = {};
                typeStats.forEach(t => { typeCounts[t.name] = t.count; });
                updateCaseTypeButtonsCount(typeCounts);
            }

        } catch (err) {
            console.error('加载面板统计数据失败', err);
            document.getElementById('pTotalCases').innerText = (province ? (dataMap[province]?.caseCount || 0) : totalCases) + ' 件';
            document.getElementById('pTypeStats').innerHTML = '<div class="stat-item">暂无数据</div>';
            document.getElementById('pReasonStats').innerHTML = '<div class="stat-item">暂无数据</div>';
            // 出错时清空按钮数量
            updateCaseTypeButtonsCount({});
        }
    }

    function renderStatsList(containerId, items) {
        const container = document.getElementById(containerId);
        if (!items || items.length === 0) {
            container.innerHTML = '<div class="stat-item">暂无数据</div>';
            return;
        }

        const total = items.reduce((sum, it) => sum + it.count, 0);

        container.innerHTML = items.map(item => {
            const percent = total > 0 ? ((item.count / total) * 100).toFixed(1) : '0.0';
            return `
            <div class="stat-item">
                <span class="stat-name">${escapeHtml(item.name)}</span>
                <div class="stat-bar-bg">
                    <div class="stat-bar-fill" style="width: ${percent}%;"></div>
                </div>
                <span class="stat-percent">${percent}%</span>
            </div>
        `;
        }).join('');
    }

    function updateInfoPanel(provinceName, showLockIcon = false) {
        const shortName = PROVINCE_NAME_MAP[provinceName] || provinceName;
        const pNameEl = document.getElementById('pName');
        const provinceData = dataMap[shortName];
        const lockIcon = showLockIcon ? ' 🔒' : '';

        if (provinceData && provinceData.caseCount > 0) {
            pNameEl.innerText = provinceName + lockIcon;
        } else {
            pNameEl.innerText = provinceName + lockIcon;
            document.getElementById('pTotalCases').innerText = '0 件';
        }

        fetchAndRenderPanelStats(shortName);
        renderLeftPanelData(shortName);
        updateSmallProvinceButtons();
    }

    function resetToOverview() {
        document.getElementById('pName').innerText = '全国概览';
        fetchAndRenderPanelStats(null);
        updateSmallProvinceButtons();
        renderLeftPanelData(null);
    }

    function clearLock() {
        isLocked = false;
        lockedProvince = null;
    }

    function updateSmallProvinceButtons() {
        const overviewBtn = document.getElementById('sp-btn-overview');
        if (overviewBtn) {
            if (isOverviewActive) {
                overviewBtn.style.background = '#7de0a8';
                overviewBtn.style.color = '#0a2e18';
                overviewBtn.style.borderColor = '#7de0a8';
            } else {
                overviewBtn.style.background = 'rgba(15,60,35,0.7)';
                overviewBtn.style.color = '#7de0a8';
                overviewBtn.style.borderColor = 'rgba(100,200,140,0.5)';
            }
        }

        SMALL_PROVINCES.forEach(name => {
            const btn = document.getElementById(`sp-btn-${name}`);
            if (!btn) return;
            isOverviewActive = false;
            if (isLocked && lockedProvince === name) {
                btn.style.background = '#ffd166';
                btn.style.color = '#3a2800';
                btn.style.borderColor = '#ffd166';
            } else {
                btn.style.background = 'rgba(20,50,100,0.7)';
                btn.style.color = '#a0c8f8';
                btn.style.borderColor = 'rgba(100,160,220,0.4)';
            }
        });
    }

    function simulateProvinceClick(shortName) {
        if (!chart) return;
        if (isLocked && lockedProvince === shortName) {
            clearLock();
            chart.setOption(buildMapOption(null), { replaceMerge: false });
            resetToOverview();
        } else {
            isLocked = true;
            lockedProvince = shortName;
            chart.setOption(buildMapOption(shortName), { replaceMerge: false });
            updateInfoPanel(shortName, true);
        }
    }
    window.simulateProvinceClick = simulateProvinceClick;

    function injectSmallProvincePanel() {
        const mapEl = document.getElementById('map');
        if (!mapEl || document.getElementById('small-province-panel')) return;

        const panel = document.createElement('div');
        panel.id = 'small-province-panel';
        panel.style.cssText = `
            position: absolute;
            bottom: 24px;
            right: 16px;
            display: flex;
            flex-direction: column;
            gap: 6px;
            z-index: 10;
            pointer-events: auto;
        `;

        const label = document.createElement('div');
        label.style.cssText = 'font-size:10px;color:rgba(160,200,255,0.6);text-align:center;margin-bottom:2px;';
        label.innerText = '小区域快捷';
        panel.appendChild(label);

        const overviewBtn = document.createElement('button');
        overviewBtn.id = 'sp-btn-overview';
        overviewBtn.innerText = '🌐 全国概览';
        overviewBtn.onclick = (e) => {
            e.stopPropagation();
            isOverviewActive = true;
            clearLock();
            chart.setOption(buildMapOption(null), { replaceMerge: false });
            resetToOverview();
        };
        overviewBtn.style.cssText = `
            padding: 5px 10px;
            font-size: 12px;
            font-family: inherit;
            border-radius: 6px;
            border: 1px solid rgba(100,200,140,0.5);
            background: rgba(15,60,35,0.7);
            color: #7de0a8;
            cursor: pointer;
            text-align: center;
            transition: background 0.2s, color 0.2s;
            white-space: nowrap;
        `;
        panel.appendChild(overviewBtn);

        const divider = document.createElement('div');
        divider.style.cssText = 'height:1px;background:rgba(100,160,220,0.2);margin:2px 0;';
        panel.appendChild(divider);

        SMALL_PROVINCES.forEach(name => {
            const count = (dataMap[name] && dataMap[name].caseCount) || 0;
            const btn = document.createElement('button');
            btn.id = `sp-btn-${name}`;
            btn.innerText = `${name}  ${count}件`;
            btn.onclick = (e) => {
                e.stopPropagation();
                simulateProvinceClick(name);
            };
            btn.style.cssText = `
                padding: 5px 10px;
                font-size: 12px;
                font-family: inherit;
                border-radius: 6px;
                border: 1px solid rgba(100,160,220,0.4);
                background: rgba(20,50,100,0.7);
                color: #a0c8f8;
                cursor: pointer;
                text-align: left;
                transition: background 0.2s, color 0.2s;
                white-space: nowrap;
            `;
            panel.appendChild(btn);
        });

        const mapParent = mapEl.parentElement;
        if (getComputedStyle(mapParent).position === 'static') {
            mapParent.style.position = 'relative';
        }
        mapParent.appendChild(panel);
    }

    function bindChartEvents() {
        chart.off('mouseover');
        chart.off('globalout');
        chart.off('click');

        chart.on('mouseover', (params) => {
            if (isLocked) return;
            if (params && params.name) {
                isOverviewActive = false;
                const shortName = PROVINCE_NAME_MAP[params.name] || params.name;
                chart.setOption(buildMapOption(shortName), { replaceMerge: false });
                updateInfoPanel(params.name, false);
            }
        });

        chart.on('click', (params) => {
            isOverviewActive = false;
            if (!params || !params.name) {
                if (isLocked) {
                    clearLock();
                    chart.setOption(buildMapOption(null), { replaceMerge: false });
                    resetToOverview();
                }
                return;
            }
            const clickedShortName = PROVINCE_NAME_MAP[params.name] || params.name;
            if (isLocked && lockedProvince === clickedShortName) {
                clearLock();
                chart.setOption(buildMapOption(null), { replaceMerge: false });
                resetToOverview();
            } else {
                isLocked = true;
                lockedProvince = clickedShortName;
                chart.setOption(buildMapOption(clickedShortName), { replaceMerge: false });
                updateInfoPanel(params.name, true);
            }
        });

        chart.on('globalout', () => {
            if (isLocked) return;
            chart.setOption(buildMapOption(null), { replaceMerge: false });
            resetToOverview();
        });
    }

    // 在 main.js 的合适位置（例如 initDashboard 函数内部，或者一个独立的 bindModalEvents 函数）
    // 定义函数（放在 initDashboard 之后或文件末尾均可）
    function bindModalEvents() {
        const openBtn = document.getElementById('openFullscreenModalBtn');
        const modal = document.getElementById('fullscreenModal');
        const closeBtn = document.getElementById('closeFullscreenModalBtn');

        if (!openBtn || !modal || !closeBtn) {
            console.warn('弹窗相关元素未找到，请检查 HTML 结构');
            return;
        }

        openBtn.addEventListener('click', () => {
            modal.style.display = 'flex';
        });

        closeBtn.addEventListener('click', () => {
            modal.style.display = 'none';
            resetFilter();
            document.getElementById('filterBar').style.display = 'none';
        });

        // 点击遮罩关闭
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.style.display = 'none';
            }
        });

        // ESC 关闭
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && modal.style.display === 'flex') {
                modal.style.display = 'none';
            }
        });
    }

    function bindCaseTypeButtons() {
        document.querySelectorAll('.case-type-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const type = btn.getAttribute('data-type');
                window.location.href = `/analysis?type=${encodeURIComponent(type)}`;
            });
        });
    }

    document.addEventListener('click', (e) => {
        if (!isLocked) return;
        const panel = document.getElementById('small-province-panel');
        if (!chartDom.contains(e.target) && !(panel && panel.contains(e.target))) {
            clearLock();
            if (chart) {
                chart.setOption(buildMapOption(null), { replaceMerge: false });
                resetToOverview();
            }
        }
    }, true);

    // ---------- 初始化 Dashboard ----------
    async function initDashboard() {
        try {
            const response = await fetch('/api/map/stats');
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            const dbData = await response.json();

            const dbMap = new Map();
            if (Array.isArray(dbData)) {
                dbData.forEach(item => {
                    dbMap.set(item.provinceName, {
                        caseCount: item.caseCount || 0,
                        riskLevel: item.riskLevel || '低',
                        riskScore: item.riskScore || 0
                    });
                });
            }

            RAW = ALL_PROVINCES.map(prov => {
                const backend = dbMap.get(prov);
                const caseCount = backend ? backend.caseCount : 0;
                const riskScore = backend ? backend.riskScore : 0;
                let level = caseCount === 0 ? '无风险' : caseCount > 100 ? '极高' : caseCount > 50 ? '高' : caseCount > 10 ? '中' : '低';
                return {
                    name: prov,
                    caseCount: caseCount,
                    riskScore: riskScore,
                    level: level
                };
            });

            totalCases = RAW.reduce((sum, d) => sum + d.caseCount, 0);
            maxValue = Math.max(...RAW.map(d => d.riskScore || 0), 0.01);
            dataMap = {};
            RAW.forEach(d => { dataMap[d.name] = d; });

            if (!chart) chart = echarts.init(chartDom);
            chart.setOption(buildMapOption(null));
            await renderLeftPanelData();
            resetToOverview();
            bindChartEvents();
            injectSmallProvincePanel();
            window.addEventListener('resize', () => chart && chart.resize());
            bindModalEvents();
            bindCaseTypeButtons();
            initAssistant();
        } catch (error) {
            console.error('数据加载失败，使用模拟默认数据:', error);
            // 模拟数据
            RAW = ALL_PROVINCES.map(prov => {
                const mockVals = { '广东': 245, '上海': 178, '北京': 162, '浙江': 98, '江苏': 112 };
                const mockCaseCount = mockVals[prov] ?? Math.floor(Math.random() * 30);
                const mockRiskScore = mockCaseCount * 0.5;
                const level = mockCaseCount > 100 ? '极高' : mockCaseCount > 50 ? '高' : mockCaseCount > 10 ? '中' : '低';
                return { name: prov, caseCount: mockCaseCount, riskScore: mockRiskScore, level };
            });
            dataMap = {};
            RAW.forEach(d => { dataMap[d.name] = d; });
            totalCases = RAW.reduce((s, d) => s + d.caseCount, 0);
            maxValue = Math.max(...RAW.map(d => d.riskScore), 1);
            if (!chart) chart = echarts.init(chartDom);
            chart.setOption(buildMapOption(null));
            resetToOverview();
            bindChartEvents();
            injectSmallProvincePanel();
        }
    }

    async function initAssistant() {
        marked.setOptions({
            breaks: true,
            gfm: true,
            smartLists: true,
            smartypants: true
        });
        await ensureActiveConversation();
        initWebSocket();
        bindAssistantEvents();
    }

    async function ensureActiveConversation() {
        try {
            await createNewConversation('新对话');
        } catch (err) {
            console.error('创建新会话失败', err);
        }
    }

    async function fetchConversations() {
        const res = await fetch('/api/chat/conversations', { credentials: 'include' });
        if (!res.ok) throw new Error('获取会话列表失败');
        return await res.json();
    }

    async function createNewConversation(title = '新对话') {
        const res = await fetch('/api/chat/conversation', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ title })
        });
        if (!res.ok) throw new Error('创建会话失败');
        const data = await res.json();
        currentConversationId = data.conversationId;
        resetChatUI();
        isFirstMessageInConversation = true;
        await loadConversationList();
    }

    function resetChatUI() {
        const chatMessages = document.getElementById('chatMessages');
        chatMessages.innerHTML = `
        <div class="chat-message assistant">
            <div class="message-content markdown-body">${marked.parse('你好！我是青朗法治智能助手，可以回答涉外案件相关的法律问题。请问有什么可以帮助你的？')}</div>
        </div>
    `;
        currentAIResponse = '';
        if (currentAssistantMessage) currentAssistantMessage = null;
    }

    async function loadConversationMessages(convId) {
        try {
            const res = await fetch(`/api/chat/conversation/${convId}/messages`, { credentials: 'include' });
            if (!res.ok) throw new Error('获取消息失败');
            const messages = await res.json();
            renderConversationMessages(messages);
            isFirstMessageInConversation = messages.filter(m => m.role === 'user').length === 0;
        } catch (err) {
            console.error(err);
        }
    }

    function renderConversationMessages(messages) {
        const chatMessages = document.getElementById('chatMessages');
        resetChatUI();
        messages.forEach(msg => {
            const msgDiv = document.createElement('div');
            msgDiv.className = `chat-message ${msg.role}`;
            if (msg.role === 'assistant') {
                msgDiv.innerHTML = `<div class="message-content markdown-body">${marked.parse(msg.content)}</div>`;
            } else {
                msgDiv.innerHTML = `<div class="message-content">${escapeHtml(msg.content)}</div>`;
            }
            chatMessages.appendChild(msgDiv);
        });
        scrollToBottom();
    }

    async function openHistorySidebar() {
        const historySidebar = document.getElementById('historySidebar');
        const sidebarOverlay = document.getElementById('sidebarOverlay');
        historySidebar.classList.add('open');
        sidebarOverlay.classList.add('show');
        await loadConversationList();
    }

    function closeHistorySidebar() {
        document.getElementById('historySidebar').classList.remove('open');
        document.getElementById('sidebarOverlay').classList.remove('show');
    }

    async function loadConversationList() {
        const historyList = document.getElementById('historyList');
        try {
            const convs = await fetchConversations();
            renderConversationList(convs);
        } catch (err) {
            historyList.innerHTML = '<div class="empty-placeholder">加载失败</div>';
        }
    }

    function renderConversationList(convs) {
        const historyList = document.getElementById('historyList');
        if (!convs || convs.length === 0) {
            historyList.innerHTML = '<div class="empty-placeholder">暂无历史会话</div>';
            return;
        }
        historyList.innerHTML = convs.map(conv => {
            const time = conv.updatedAt ? new Date(conv.updatedAt).toLocaleString('zh-CN', {
                month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit'
            }) : '';
            return `
            <div class="history-item" data-conv-id="${conv.conversationId}">
                <div class="history-preview">${escapeHtml(conv.title)}</div>
                <div class="history-meta">
                    <span>💬 会话</span>
                    <span>${time}</span>
                </div>
            </div>
        `;
        }).join('');

        historyList.querySelectorAll('.history-item').forEach(item => {
            item.addEventListener('click', async () => {
                const convId = parseInt(item.dataset.convId);
                currentConversationId = convId;
                await loadConversationMessages(convId);
                closeHistorySidebar();
            });
        });
    }

    async function handleNewChat() {
        await createNewConversation('新对话');
    }

    async function sendChatMessage() {
        const chatInput = document.getElementById('chatInput');
        const sendChatBtn = document.getElementById('sendChatBtn');
        const chatStatus = document.getElementById('chatStatus');
        const message = chatInput.value.trim();
        if (!message) return;

        if (!ws || ws.readyState !== WebSocket.OPEN) {
            alert('WebSocket 未连接，请刷新页面重试');
            return;
        }

        if (isFirstMessageInConversation) {
            await updateConversationTitle(message.substring(0, 30));
            isFirstMessageInConversation = false;
        }

        await saveMessageToHistory('user', message);
        addUserMessage(message);
        chatInput.value = '';
        sendChatBtn.disabled = true;
        chatStatus.textContent = '⏳ AI 正在思考...';
        currentAIResponse = '';

        ws.send(message);
    }

    async function updateConversationTitle(title) {
        try {
            await fetch(`/api/chat/conversation/${currentConversationId}/title`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ title })
            });
            if (document.getElementById('historySidebar').classList.contains('open')) {
                await loadConversationList();
            }
        } catch (err) {
            console.error('更新会话标题失败', err);
        }
    }

    async function saveMessageToHistory(role, content) {
        try {
            await fetch('/api/chat/message', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ role, content, conversationId: currentConversationId })
            });
        } catch (err) {
            console.error('保存消息失败:', err);
        }
    }

    function addUserMessage(content) {
        const chatMessages = document.getElementById('chatMessages');
        const msgDiv = document.createElement('div');
        msgDiv.className = 'chat-message user';
        msgDiv.innerHTML = `<div class="message-content">${escapeHtml(content)}</div>`;
        chatMessages.appendChild(msgDiv);
        scrollToBottom();
    }

    function appendToAssistantMessage(chunk) {
        currentAIResponse += chunk;
        if (!currentAssistantMessage) {
            currentAssistantMessage = document.createElement('div');
            currentAssistantMessage.className = 'chat-message assistant';
            currentAssistantMessage.innerHTML = '<div class="message-content markdown-body"></div>';
            document.getElementById('chatMessages').appendChild(currentAssistantMessage);
        }
        const contentDiv = currentAssistantMessage.querySelector('.message-content');
        contentDiv.innerHTML = marked.parse(currentAIResponse);
        scrollToBottom();
    }

    function finishAssistantMessage() {
        if (currentAIResponse) {
            saveMessageToHistory('assistant', currentAIResponse);
        }
        currentAIResponse = '';
        currentAssistantMessage = null;
        document.getElementById('sendChatBtn').disabled = false;
        const chatStatus = document.getElementById('chatStatus');
        chatStatus.textContent = '● 在线';
        chatStatus.style.color = '#27ae60';
    }

    function scrollToBottom() {
        const chatMessages = document.getElementById('chatMessages');
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }

    function initWebSocket() {
        if (ws && ws.readyState === WebSocket.OPEN) return;
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const host = window.location.host;
        ws = new WebSocket(`${protocol}//${host}/ws/chat`);

        ws.onopen = () => {
            const chatStatus = document.getElementById('chatStatus');
            chatStatus.textContent = '● 在线';
            chatStatus.style.color = '#27ae60';
        };
        ws.onmessage = (event) => {
            const data = event.data;
            if (data === '[DONE]') finishAssistantMessage();
            else if (data.startsWith('[ERROR]')) {
                document.getElementById('chatStatus').textContent = '⚠️ ' + data.substring(7);
                finishAssistantMessage();
            } else appendToAssistantMessage(data);
        };
        ws.onclose = () => {
            const chatStatus = document.getElementById('chatStatus');
            chatStatus.textContent = '○ 离线';
            chatStatus.style.color = '#6a8caa';
        };
        ws.onerror = () => {
            const chatStatus = document.getElementById('chatStatus');
            chatStatus.textContent = '⚠️ 连接错误';
            chatStatus.style.color = '#e74c3c';
        };
    }

    function bindAssistantEvents() {
        document.getElementById('sendChatBtn').addEventListener('click', sendChatMessage);
        document.getElementById('chatInput').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') sendChatMessage();
        });
        document.getElementById('toggleHistoryBtn').addEventListener('click', openHistorySidebar);
        document.getElementById('closeHistoryBtn').addEventListener('click', closeHistorySidebar);
        document.getElementById('sidebarOverlay').addEventListener('click', closeHistorySidebar);
        document.getElementById('newChatBtn').addEventListener('click', handleNewChat);

        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && document.getElementById('historySidebar').classList.contains('open')) {
                closeHistorySidebar();
            }
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initDashboard);
    } else {
        initDashboard();
    }

    // ---------- 底部案件列表 ----------
    async function loadReasonOptions() {
        try {
            const res = await fetch('/api/cases/reasons');
            const reasons = await res.json();
            const buttonsContainer = document.getElementById('reasonButtons');
            if (!buttonsContainer) return;

            buttonsContainer.innerHTML = '';
            const allBtn = document.createElement('span');
            allBtn.className = 'reason-btn all-btn' + (currentSelectedReason === '' ? ' active' : '');
            allBtn.textContent = '全部案由';
            allBtn.dataset.reason = '';
            allBtn.onclick = () => selectReason('');
            buttonsContainer.appendChild(allBtn);

            reasons.sort().forEach(reason => {
                const btn = document.createElement('span');
                btn.className = 'reason-btn' + (currentSelectedReason === reason ? ' active' : '');
                btn.textContent = reason;
                btn.dataset.reason = reason;
                btn.onclick = () => selectReason(reason);
                buttonsContainer.appendChild(btn);
            });
        } catch (err) {
            console.error('加载案由列表失败', err);
        }
    }

    async function loadCaseDetails(caseReason = '') {
        try {
            let url = '/api/cases/grouped';
            if (caseReason) {
                url = `/api/cases/grouped-by-reason?caseReason=${encodeURIComponent(caseReason)}`;
            }
            const response = await fetch(url);
            const groupedData = await response.json();

            const types = ['刑事', '民事', '行政', '公益诉讼'];
            types.forEach(type => {
                const listContainer = document.getElementById(`list-${type}`);
                if (!listContainer) return;
                const cases = groupedData[type] || [];
                listContainer.innerHTML = cases.length > 0
                    ? cases.map(c => `
                    <div class="case-item" onclick="window.location.href='/case/detail?id=${c.caseId}&fromKwd=${encodeURIComponent(c.caseName)}'">
                        <div class="case-title">${escapeHtml(c.caseName)}</div>
                    </div>`).join('')
                    : '<div class="no-data">暂无数据</div>';
            });
        } catch (error) {
            console.error("加载明细失败:", error);
        }
    }

    function selectReason(reason) {
        currentSelectedReason = reason;
        document.querySelectorAll('.reason-btn').forEach(btn => {
            const btnReason = btn.dataset.reason;
            if (btnReason === reason) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        });
        loadCaseDetails(reason);
    }

    document.addEventListener('DOMContentLoaded', () => {
        const reasonSelect = document.getElementById('reasonFilterSelect');
        if (reasonSelect) {
            reasonSelect.addEventListener('change', (e) => {
                loadCaseDetails(e.target.value);
            });
        }

        const si = document.getElementById('caseSearchInput') || document.getElementById('searchInput');
        if (si) si.onkeypress = (e) => { if (e.key === 'Enter') performNavigationSearch(); };
    });

    window.performNavigationSearch = function() {
        const inputEl = document.getElementById('caseSearchInput') || document.getElementById('searchInput');
        if (!inputEl) return;
        window.location.href = `/search-results?keyword=${encodeURIComponent(inputEl.value.trim())}`;
    };

})();

// ===== 左侧面板数据渲染 =====
async function renderLeftPanelData(province = null) {
    try {
        let url = '/api/dashboard/left-stats';
        if (province) {
            url += `?province=${encodeURIComponent(province)}`;
        }
        const res = await fetch(url);
        const data = await res.json();

        document.getElementById('total-case-count').innerText = data.totalCases;
        document.getElementById('total-page-count').innerText = data.totalPages;

        const lawChartDom = document.getElementById('law-distribution-chart');
        let lawChart = echarts.getInstanceByDom(lawChartDom);
        if (!lawChart) {
            lawChart = echarts.init(lawChartDom);
        }
        lawChart.setOption({
            tooltip: { trigger: 'item' },
            series: [{
                type: 'pie',
                radius: ['40%', '70%'],
                avoidLabelOverlap: false,
                itemStyle: { borderRadius: 10, borderColor: '#060e1f', borderWidth: 2 },
                label: { show: false },
                data: data.lawData
            }]
        });

        const rankContainer = document.getElementById('country-rank-list');
        rankContainer.innerHTML = data.nationalityData.map(item => `
            <div class="rank-wrapper">
                <div class="rank-item">
                    <span>${item.country}</span>
                    <span>${item.count}件</span>
                </div>
                <div class="rank-bar-bg"><div class="rank-bar-fill" style="width: ${item.percent}%"></div></div>
            </div>
        `).join('');

    } catch (err) {
        console.error("左侧面板数据加载失败", err);
    }
}