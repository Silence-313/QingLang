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
        const seriesData = RAW.map(item => {
            const ratio = maxValue > 0 ? item.value / maxValue : 0;
            const isHover = (hoveredName === item.name);
            return {
                name: item.name,
                value: item.value,
                height: isHover ? 3 : 2,
                itemStyle: {
                    areaColor: getColorByValue(ratio),
                    borderColor: 'rgba(160,205,255,0.4)',
                    borderWidth: 0.7,
                },
                emphasis: isHover ? {
                    itemStyle: {
                        areaColor: '#ffd166',
                        borderColor: 'rgba(255,245,180,0.9)',
                        borderWidth: 1.5,
                    },
                    label: {
                        show: true,
                        textStyle: { color: '#fff', fontSize: 12, fontWeight: 'bold', textBorderColor: '#7a4e00', textBorderWidth: 2 }
                    }
                } : {}
            };
        });

        return {
            tooltip: { show: false },
            series: [{
                type: 'map3D', map: 'china', shading: 'lambert', regionHeight: 2,
                viewControl: {
                    alpha: 45, beta: 0, distance: 115,
                    rotateSensitivity: 1, zoomSensitivity: 1,
                    minDistance: 70, maxDistance: 220, maxAlpha: 90, minAlpha: 10,
                },
                itemStyle: {
                    areaColor: getColorByValue(0.05),
                    borderColor: 'rgba(160,205,255,0.4)',
                    borderWidth: 0.7, opacity: 1,
                },
                label: {
                    show: true,
                    textStyle: { color: '#0d2560', fontSize: 10, textBorderColor: 'rgba(255,255,255,0.85)', textBorderWidth: 2 }
                },
                emphasis: {
                    itemStyle: { areaColor: '#ffca4d', borderColor: 'rgba(255,245,180,0.9)', borderWidth: 1.2 }
                },
                light: {
                    main: { intensity: 2.2, shadow: true, shadowQuality: 'high', alpha: 38, beta: 110 },
                    ambient: { intensity: 0.4 }
                },
                data: seriesData,
            }]
        };
    }

    function updateInfoPanel(provinceName, showLockIcon = false) {
        const shortName = PROVINCE_NAME_MAP[provinceName] || provinceName;
        const pNameEl = document.getElementById('pName');
        const pCasesEl = document.getElementById('pCases');
        const pLevelEl = document.getElementById('pLevel');
        const pRatioEl = document.getElementById('pRatio');
        if (!pNameEl) return;
        const provinceData = dataMap[shortName];
        const lockIcon = showLockIcon ? ' 🔒' : '';
        if (provinceData && provinceData.value > 0) {
            pNameEl.innerText = provinceName + lockIcon;
            pCasesEl.innerText = provinceData.value + ' 件';
            pLevelEl.innerText = provinceData.level || (provinceData.value > 50 ? '高' : (provinceData.value > 10 ? '中' : '低'));
            pRatioEl.innerText = (totalCases > 0 ? (provinceData.value / totalCases * 100).toFixed(1) : '0') + '%';
        } else {
            pNameEl.innerText = provinceName + lockIcon;
            pCasesEl.innerText = '0 件';
            pLevelEl.innerText = '无风险';
            pRatioEl.innerText = '0%';
        }

        renderLeftPanelData(shortName);
        updateSmallProvinceButtons();
    }

    function resetToOverview() {
        document.getElementById('pName').innerText = '全国概览';
        document.getElementById('pCases').innerText = totalCases + ' 件';
        document.getElementById('pLevel').innerText = '——';
        document.getElementById('pRatio').innerText = '100%';
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
            const count = (dataMap[name] && dataMap[name].value) || 0;
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
                    dbMap.set(item.provinceName, { caseCount: item.caseCount || 0, riskLevel: item.riskLevel || '低' });
                });
            }

            RAW = ALL_PROVINCES.map(prov => {
                const backend = dbMap.get(prov);
                const value = backend ? backend.caseCount : 0;
                let level = value === 0 ? '无风险' : value > 100 ? '极高' : value > 50 ? '高' : value > 10 ? '中' : '低';
                return { name: prov, value, level };
            });

            dataMap = {};
            RAW.forEach(d => { dataMap[d.name] = d; });
            totalCases = RAW.reduce((sum, d) => sum + d.value, 0);
            maxValue = Math.max(...RAW.map(d => d.value), 1);

            if (!chart) chart = echarts.init(chartDom);
            chart.setOption(buildMapOption(null));
            await renderLeftPanelData();
            resetToOverview();
            bindChartEvents();
            injectSmallProvincePanel();
            window.addEventListener('resize', () => chart && chart.resize());

            // 初始化案由筛选器
            await loadReasonOptions();
            // 加载底部案件列表（默认全部）
            loadCaseDetails();

        } catch (error) {
            console.error('数据加载失败，使用模拟默认数据:', error);

            RAW = ALL_PROVINCES.map(prov => {
                const mockVals = { '广东': 245, '上海': 178, '北京': 162, '浙江': 98, '江苏': 112 };
                const mockVal = mockVals[prov] ?? Math.floor(Math.random() * 30);
                const level = mockVal > 100 ? '极高' : mockVal > 50 ? '高' : mockVal > 10 ? '中' : '低';
                return { name: prov, value: mockVal, level };
            });

            dataMap = {};
            RAW.forEach(d => { dataMap[d.name] = d; });
            totalCases = RAW.reduce((s, d) => s + d.value, 0);
            maxValue = Math.max(...RAW.map(d => d.value), 1);

            if (!chart) chart = echarts.init(chartDom);
            chart.setOption(buildMapOption(null));
            resetToOverview();
            bindChartEvents();
            injectSmallProvincePanel();
            await loadReasonOptions();
            loadCaseDetails();
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initDashboard);
    } else {
        initDashboard();
    }

    // ---------- 底部案件列表（支持案由筛选） ----------
    // 加载案由按钮（横向滚动方块）
    async function loadReasonOptions() {
        try {
            const res = await fetch('/api/cases/reasons');
            const reasons = await res.json();
            const buttonsContainer = document.getElementById('reasonButtons');
            if (!buttonsContainer) return;

            // 清空并添加“全部案由”按钮
            buttonsContainer.innerHTML = '';
            const allBtn = document.createElement('span');
            allBtn.className = 'reason-btn all-btn' + (currentSelectedReason === '' ? ' active' : '');
            allBtn.textContent = '全部案由';
            allBtn.dataset.reason = '';
            allBtn.onclick = () => selectReason('');
            buttonsContainer.appendChild(allBtn);

            // 添加各个案由按钮
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

    // 加载案件列表（支持案由过滤）
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

    // 选中某个案由时的处理
    function selectReason(reason) {
        currentSelectedReason = reason;

        // 更新按钮高亮样式
        document.querySelectorAll('.reason-btn').forEach(btn => {
            const btnReason = btn.dataset.reason;
            if (btnReason === reason) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        });

        // 刷新底部案件列表
        loadCaseDetails(reason);
    }

    // 绑定案由筛选事件
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

// ===== 左侧面板数据渲染（独立函数） =====
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