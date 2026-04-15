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