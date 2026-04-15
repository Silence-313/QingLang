(function() {
    const urlParams = new URLSearchParams(window.location.search);
    const caseType = urlParams.get('type') || '刑事';

    let currentReason = null;             // 当前选中的案由，null表示全部
    let allCases = [];
    let reasonChart = null;
    let yearChart = null;
    let dynamicChart = null;              // 新增：动态图表实例
    let selectedCaseId = null;

    // DOM元素
    const reasonChartDom = document.getElementById('reasonPieChart');
    const yearChartDom = document.getElementById('yearLineChart');
    const caseListContainer = document.getElementById('caseListContainer');
    const caseCountBadge = document.getElementById('caseCountBadge');
    const detailContainer = document.getElementById('caseDetailContainer');
    const dynamicChartDom = document.getElementById('dynamicChart');
    const backBtn = document.getElementById('backToMainBtn');

    backBtn.addEventListener('click', () => window.location.href = '/main');

    // 初始化
    async function init() {
        await loadCases();
        renderReasonPie();
        renderYearLine();
        renderCaseList();
        renderDynamicChart(caseType, null);   // 默认显示全部案件的图表
        window.addEventListener('resize', handleResize);
    }

    function handleResize() {
        if (reasonChart) reasonChart.resize();
        if (yearChart) yearChart.resize();
        if (dynamicChart) dynamicChart.resize();
    }

    // 获取该类型全部案件（含案由）
    async function loadCases() {
        try {
            const res = await fetch(`/api/cases/by-type?type=${encodeURIComponent(caseType)}`);
            if (!res.ok) throw new Error('加载失败');
            allCases = await res.json();
        } catch (err) {
            console.error(err);
            allCases = [];
        }
    }

    // 计算案由统计数据
    function getReasonStats() {
        const map = new Map();
        allCases.forEach(c => {
            const reason = c.caseReason || '未知案由';
            map.set(reason, (map.get(reason) || 0) + 1);
        });
        return Array.from(map.entries()).map(([name, count]) => ({ name, count }));
    }

    // 渲染案由饼图
    function renderReasonPie() {
        if (!reasonChart) reasonChart = echarts.init(reasonChartDom);
        const stats = getReasonStats();
        const option = {
            tooltip: { trigger: 'item' },
            series: [{
                type: 'pie',
                radius: ['40%', '70%'],
                avoidLabelOverlap: true,
                itemStyle: { borderRadius: 8, borderColor: '#060e1f', borderWidth: 2 },
                label: { show: true, formatter: '{b}: {d}%' },
                emphasis: { scale: true },
                data: stats.map(s => ({ name: s.name, value: s.count }))
            }]
        };
        reasonChart.setOption(option);

        // 如果已有选中的案由，恢复高亮状态
        if (currentReason) {
            reasonChart.dispatchAction({ type: 'highlight', seriesIndex: 0, name: currentReason });
        }

        // 点击事件：切换筛选
        reasonChart.off('click');
        reasonChart.on('click', (params) => {
            const clickedReason = params.name;
            if (currentReason === clickedReason) {
                currentReason = null;
                reasonChart.dispatchAction({ type: 'downplay' });
            } else {
                currentReason = clickedReason;
            }
            renderCaseList();
            renderDynamicChart(caseType, currentReason);
        });

        // 双击空白区域：取消筛选
        reasonChart.off('dblclick');
        reasonChart.on('dblclick', () => {
            currentReason = null;
            renderCaseList();
            renderDynamicChart(caseType, null);
            reasonChart.dispatchAction({ type: 'downplay' });
        });
    }

    // 渲染年度折线图（基于全部该类型案件）
    function renderYearLine() {
        if (!yearChart) yearChart = echarts.init(yearChartDom);
        const yearMap = new Map();
        allCases.forEach(c => {
            const year = c.acceptanceDate ? c.acceptanceDate.substring(0,4) : null;
            if (year && !isNaN(year) && year.length === 4) {
                yearMap.set(year, (yearMap.get(year) || 0) + 1);
            }
        });

        // 获取所有有效年份并排序
        const existingYears = Array.from(yearMap.keys()).filter(y => y !== '未知').sort();
        if (existingYears.length === 0) {
            yearChart.setOption({
                title: { text: '暂无年份数据', textStyle: { color: '#a0c8f8' }, left: 'center', top: 'center' }
            });
            return;
        }

        const minYear = parseInt(existingYears[0]);
        const maxYear = parseInt(existingYears[existingYears.length - 1]);
        const allYears = [];
        const counts = [];

        for (let y = minYear; y <= maxYear; y++) {
            const yearStr = y.toString();
            allYears.push(yearStr);
            counts.push(yearMap.get(yearStr) || 0);
        }

        const option = {
            tooltip: { trigger: 'axis' },
            xAxis: {
                type: 'category',
                data: allYears,
                axisLabel: { color: '#a0c8f8' }
            },
            yAxis: {
                type: 'value',
                axisLabel: { color: '#a0c8f8' },
                splitLine: { lineStyle: { color: '#2a3a5a' } }
            },
            series: [{
                data: counts,
                type: 'line',
                smooth: true,
                lineStyle: { color: '#5ab4ff', width: 2 },
                areaStyle: { color: 'rgba(90,180,255,0.2)' },
                symbol: 'circle',
                symbolSize: 6
            }]
        };
        yearChart.setOption(option);
    }

    // 根据 currentReason 过滤案件列表
    function getFilteredCases() {
        if (!currentReason) return allCases;
        return allCases.filter(c => c.caseReason === currentReason);
    }

    // 渲染右侧案件列表
    function renderCaseList() {
        const filtered = getFilteredCases();
        caseCountBadge.textContent = filtered.length;
        if (filtered.length === 0) {
            caseListContainer.innerHTML = '<div class="empty-placeholder">暂无案件</div>';
            return;
        }
        caseListContainer.innerHTML = filtered.map(c => `
            <div class="case-item" data-case-id="${c.caseId}">
                <div class="case-title">${escapeHtml(c.caseName)}</div>
                <div class="case-meta">${escapeHtml(c.caseNumber)} · ${escapeHtml(c.courtName || '未知法院')}</div>
            </div>
        `).join('');

        // 绑定点击事件
        caseListContainer.querySelectorAll('.case-item').forEach(el => {
            el.addEventListener('click', () => {
                const caseId = el.dataset.caseId;
                selectCase(caseId);
                caseListContainer.querySelectorAll('.case-item').forEach(i => i.classList.remove('active'));
                el.classList.add('active');
            });
        });

        // 如果之前有选中案件且仍在列表中，保持高亮
        if (selectedCaseId) {
            const activeEl = caseListContainer.querySelector(`.case-item[data-case-id="${selectedCaseId}"]`);
            if (activeEl) activeEl.classList.add('active');
        }
    }

    // 选中案件，加载详情到中间下半部
    async function selectCase(caseId) {
        selectedCaseId = caseId;
        try {
            const res = await fetch(`/case/api/detail/${caseId}`);
            if (!res.ok) throw new Error('详情加载失败');
            const data = await res.json();
            renderCaseDetail(data);
        } catch (err) {
            detailContainer.innerHTML = '<div class="placeholder">详情加载失败</div>';
        }
    }

    function renderCaseDetail(data) {
        detailContainer.innerHTML = `
            <div style="margin-bottom:12px;"><strong style="color:#5ab4ff;">${escapeHtml(data.caseName)}</strong></div>
            <div style="display:grid; gap:8px; font-size:13px;">
                <div><span style="color:#6a8caa;">案件编号：</span>${escapeHtml(data.caseNumber)}</div>
                <div><span style="color:#6a8caa;">审理法院：</span>${escapeHtml(data.courtName || '—')}</div>
                <div><span style="color:#6a8caa;">案由：</span>${escapeHtml(data.causeOfAction || '—')}</div>
                <div><span style="color:#6a8caa;">受理日期：</span>${escapeHtml(data.acceptanceDate || '—')}</div>
                <div><span style="color:#6a8caa;">结案日期：</span>${escapeHtml(data.closingDate || '—')}</div>
                <div><span style="color:#6a8caa;">卷宗页数：</span>${data.totalPages || 0} 页</div>
            </div>
        `;
    }

    // 渲染中间上半部分图表（根据案件类型和案由）
    function renderDynamicChart(type, reason) {
        if (!dynamicChartDom) return;

        if (type === '刑事') {
            if (!dynamicChart) dynamicChart = echarts.init(dynamicChartDom);

            const filteredCases = getFilteredCases();

            // 刑期分类统计（基于真实判决结果）
            const categories = ['0-5年', '6-10年', '11-15年', '16年以上', '无期徒刑', '其他'];
            const counts = [0, 0, 0, 0, 0, 0];

            filteredCases.forEach(c => {
                const result = c.judgmentResults || '';
                if (result.includes('无期徒刑')) {
                    counts[4]++; // 无期徒刑
                } else {
                    // 提取有期徒刑年数，支持格式：有期徒刑XX年 或 XX年
                    const yearMatch = result.match(/有期徒刑\s*(\d+)\s*年/) || result.match(/(\d+)\s*年/);
                    if (yearMatch) {
                        const years = parseInt(yearMatch[1]);
                        if (years <= 5) counts[0]++;
                        else if (years <= 10) counts[1]++;
                        else if (years <= 15) counts[2]++;
                        else counts[3]++; // 16年以上
                    } else {
                        counts[5]++; // 其他（如“判令侵权人停止侵权”但实际可能不存在）
                    }
                }
            });

            // 过滤掉数量为0的分类
            const displayCategories = [];
            const displayData = [];
            categories.forEach((cat, idx) => {
                if (counts[idx] > 0) {
                    displayCategories.push(cat);
                    displayData.push(counts[idx]);
                }
            });

            // 若所有分类均为0，显示占位提示
            if (displayData.length === 0) {
                dynamicChartDom.innerHTML = '<div class="placeholder">暂无刑期数据</div>';
                dynamicChart = null;
                return;
            }

            const option = {
                title: {
                    text: `「${currentReason || '全部案由'}」刑期分布`,
                    textStyle: { color: '#5ab4ff', fontSize: 14 },
                    left: 'center',
                    top: 5
                },
                tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
                grid: { left: '10%', right: '5%', top: '25%', bottom: '10%', containLabel: true },
                xAxis: {
                    type: 'category',
                    data: displayCategories,
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
                series: [{
                    name: '刑期',
                    type: 'bar',
                    data: displayData,
                    itemStyle: {
                        color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                            { offset: 0, color: '#5ab4ff' },
                            { offset: 1, color: '#1a5cbf' }
                        ]),
                        borderRadius: [4, 4, 0, 0]
                    },
                    label: {
                        show: true,
                        position: 'top',
                        color: '#ffd166',
                        fontSize: 12
                    }
                }]
            };
            dynamicChart.setOption(option);

        } else if (type === '民事') {
            if (!dynamicChart) dynamicChart = echarts.init(dynamicChartDom);

            const filteredCases = getFilteredCases();
            const wordCountMap = new Map();
            // 模拟裁判结果关键词（真实数据可替换）
            const mockWords = ['合同有效', '合同无效', '解除合同', '赔偿损失', '驳回请求', '部分支持', '调解结案'];

            if (filteredCases.length > 0) {
                mockWords.forEach(word => {
                    // 随机模拟频次，实际应替换为真实统计
                    wordCountMap.set(word, Math.floor(Math.random() * filteredCases.length) + 1);
                });
            }

            const nodes = Array.from(wordCountMap.entries())
                .filter(([_, count]) => count > 0)
                .map(([name, count]) => ({
                    name: name,
                    value: count,
                    symbolSize: Math.sqrt(count) * 10 + 20,
                    label: { show: true, formatter: `${name}\n${count}次`, fontSize: 12, color: '#c8e0ff' }
                }));

            if (nodes.length === 0) {
                dynamicChartDom.innerHTML = '<div class="placeholder">暂无裁判结果数据</div>';
                dynamicChart = null;
                return;
            }

            const option = {
                title: {
                    text: `「${reason || '全部案由'}」裁判结果词频`,
                    textStyle: { color: '#5ab4ff', fontSize: 14 },
                    left: 'center',
                    top: 5
                },
                tooltip: { show: false },                     // 关闭悬浮提示
                series: [{
                    type: 'graph',
                    layout: 'force',                           // 力导向布局，自动分散避免重叠
                    force: {
                        repulsion: 200,                        // 节点间斥力，数值越大间距越大
                        edgeLength: 50,
                        gravity: 0.1,
                        friction: 0.1
                    },
                    roam: true,                                // 允许鼠标缩放和平移
                    draggable: true,                           // 允许拖拽节点
                    data: nodes,
                    itemStyle: {
                        color: new echarts.graphic.RadialGradient(0.4, 0.3, 1, [
                            { offset: 0, color: '#5ab4ff' },
                            { offset: 1, color: '#1a5cbf' }
                        ]),
                        borderColor: '#00f2fe',
                        borderWidth: 1
                    },
                    emphasis: {
                        scale: 1.2,
                        label: { fontWeight: 'bold', color: '#ffd166' }
                    },
                    lineStyle: { color: 'transparent' }        // 隐藏节点间连线
                }],
                backgroundColor: 'transparent'
            };
            dynamicChart.setOption(option);
        } else if (type === '行政') {
            if (!dynamicChart) dynamicChart = echarts.init(dynamicChartDom);

            const filteredCases = getFilteredCases();
            const wordCountMap = new Map();
            // 模拟裁判结果关键词（实际应解析 judgmentResults 字段）
            const mockWords = [
                '维持原判', '撤销原判', '确认违法', '驳回起诉',
                '责令重作', '赔偿损失', '程序违法', '证据不足'
            ];

            if (filteredCases.length > 0) {
                mockWords.forEach(word => {
                    wordCountMap.set(word, Math.floor(Math.random() * filteredCases.length) + 1);
                });
            }

            const data = Array.from(wordCountMap.entries())
                .filter(([_, count]) => count > 0)
                .map(([name, value]) => ({ name, value }));

            if (data.length === 0) {
                dynamicChartDom.innerHTML = '<div class="placeholder">暂无裁判结果数据</div>';
                dynamicChart = null;
                return;
            }

            const option = {
                title: {
                    text: `「${reason || '全部案由'}」裁判结果词云`,
                    textStyle: { color: '#5ab4ff', fontSize: 14 },
                    left: 'center',
                    top: 5
                },
                tooltip: { show: false },
                series: [{
                    type: 'wordCloud',
                    shape: 'circle',
                    keepAspect: false,
                    left: 'center',
                    top: 'center',
                    width: '90%',
                    height: '80%',
                    sizeRange: [16, 50],
                    rotationRange: [-45, 45],
                    rotationStep: 15,
                    gridSize: 8,
                    drawOutOfBound: false,
                    layoutAnimation: true,
                    textStyle: {
                        fontFamily: '"Microsoft YaHei", sans-serif',
                        fontWeight: 'normal',
                        color: function () {
                            const colors = ['#5ab4ff', '#82bef5', '#327dd2', '#12419b', '#051c55'];
                            return colors[Math.floor(Math.random() * colors.length)];
                        }
                    },
                    emphasis: {
                        textStyle: {
                            fontWeight: 'bold',
                            color: '#ffd166'
                        }
                    },
                    data: data
                }],
                backgroundColor: 'transparent'
            };
            dynamicChart.setOption(option);
        } else if (type === '公益诉讼') {
            if (!dynamicChart) dynamicChart = echarts.init(dynamicChartDom);

            const filteredCases = getFilteredCases();
            if (filteredCases.length === 0) {
                dynamicChartDom.innerHTML = '<div class="placeholder">暂无公益诉讼案件</div>';
                dynamicChart = null;
                return;
            }

            // 定义公益诉讼领域常见关键词（可根据实际业务扩展）
            const keywordList = [
                '检察建议', '赔偿损失', '公开道歉', '无害化处置', '修复生态',
                '连带赔偿', '环境修复', '停止侵害', '消除危险', '恢复原状',
                '惩罚性赔偿', '替代修复', '海洋生态', '固体废物', '进口食品',
                '检验检疫', '冷链运输', '消费者权益', '跨境监管', '国际公约'
            ];

            const wordCountMap = new Map();
            filteredCases.forEach(c => {
                const result = c.judgmentResults || '';
                if (!result) return;
                keywordList.forEach(keyword => {
                    if (result.includes(keyword)) {
                        wordCountMap.set(keyword, (wordCountMap.get(keyword) || 0) + 1);
                    }
                });
            });

            // 转换为词云所需数据格式
            const data = Array.from(wordCountMap.entries())
                .filter(([_, count]) => count > 0)
                .map(([name, value]) => ({ name, value }));

            if (data.length === 0) {
                dynamicChartDom.innerHTML = '<div class="placeholder">暂无裁判结果关键词</div>';
                dynamicChart = null;
                return;
            }

            const option = {
                title: {
                    text: `「${currentReason || '全部案由'}」公益诉讼关键词`,
                    textStyle: { color: '#5ab4ff', fontSize: 14 },
                    left: 'center',
                    top: 5
                },
                tooltip: { show: true, formatter: '{b}: {c} 次' },
                series: [{
                    type: 'wordCloud',
                    shape: 'circle',
                    keepAspect: false,
                    left: 'center',
                    top: 'center',
                    width: '90%',
                    height: '80%',
                    sizeRange: [18, 50],
                    rotationRange: [-30, 30],
                    rotationStep: 15,
                    gridSize: 8,
                    drawOutOfBound: false,
                    layoutAnimation: true,
                    textStyle: {
                        fontFamily: '"Microsoft YaHei", sans-serif',
                        fontWeight: 'normal',
                        color: function () {
                            const colors = ['#5ab4ff', '#82bef5', '#327dd2', '#12419b', '#051c55', '#7de0a8', '#ffd166'];
                            return colors[Math.floor(Math.random() * colors.length)];
                        }
                    },
                    emphasis: {
                        textStyle: {
                            fontWeight: 'bold',
                            color: '#ffd166'
                        }
                    },
                    data: data
                }],
                backgroundColor: 'transparent'
            };
            dynamicChart.setOption(option);
        } else {
            // 其他类型暂未定义
            dynamicChartDom.innerHTML = `<div class="placeholder">${type}案件图表（待实现）</div>`;
            dynamicChart = null;
        }
    }

    function escapeHtml(str) {
        if (!str) return '';
        const map = { '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;' };
        return String(str).replace(/[&<>"']/g, m => map[m]);
    }

    // 入口
    init();
})();