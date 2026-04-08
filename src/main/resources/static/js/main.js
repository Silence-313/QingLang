// ===== main.js - 3D地图指挥中心核心逻辑 =====
(function() {
    // ---------- 全国所有省份列表（确保地图完整展示）----------
    const ALL_PROVINCES = [
        '北京', '天津', '上海', '重庆', '河北', '河南', '云南', '辽宁', '黑龙江', '湖南',
        '安徽', '山东', '新疆', '江苏', '浙江', '江西', '湖北', '广西', '甘肃', '山西',
        '内蒙古', '陕西', '吉林', '福建', '贵州', '广东', '青海', '西藏', '四川', '宁夏',
        '海南', '台湾', '香港', '澳门'
    ];

    // 数据存储
    let RAW = [];           // { name, value, level }
    let dataMap = {};
    let totalCases = 0;
    let maxValue = 1;

    // 获取 echarts 实例
    const chartDom = document.getElementById('map');
    let chart = null;

    // 颜色插值 (白 -> 深蓝)
    const colorStops = [
        [0,   [210, 235, 255]],
        [0.2, [130, 190, 245]],
        [0.5, [ 50, 125, 210]],
        [0.8, [ 18,  65, 155]],
        [1.0, [  5,  28,  85]]
    ];
    function getColorByValue(ratio) {
        let t = Math.max(0, Math.min(1, ratio));
        for (let i = 0; i < colorStops.length - 1; i++) {
            if (t <= colorStops[i+1][0]) {
                const s = (t - colorStops[i][0]) / (colorStops[i+1][0] - colorStops[i][0]);
                const c = (j) => Math.round(colorStops[i][1][j] + s * (colorStops[i+1][1][j] - colorStops[i][1][j]));
                return `rgb(${c(0)}, ${c(1)}, ${c(2)})`;
            }
        }
        return `rgb(5,28,85)`;
    }

    // 构建地图配置 (hovered 为当前悬停省份名)
    function buildMapOption(hoveredName = null) {
        const seriesData = RAW.map(item => {
            const ratio = maxValue > 0 ? item.value / maxValue : 0;
            const isHover = (hoveredName === item.name);
            // 动态强调样式 - 解决 hover 变色问题
            const emphasisStyle = isHover ? {
                itemStyle: {
                    areaColor: '#ffd166',
                    borderColor: 'rgba(255,245,180,0.9)',
                    borderWidth: 1.5,
                },
                label: {
                    show: true,
                    textStyle: {
                        color: '#fff',
                        fontSize: 12,
                        fontWeight: 'bold',
                        textBorderColor: '#7a4e00',
                        textBorderWidth: 2,
                    }
                }
            } : {};

            return {
                name: item.name,
                value: item.value,
                height: isHover ? 3 : 2,
                itemStyle: {
                    areaColor: getColorByValue(ratio),
                    borderColor: 'rgba(160,205,255,0.4)',
                    borderWidth: 0.7,
                },
                emphasis: emphasisStyle
            };
        });

        return {
            tooltip: { show: false }, // 使用自定义面板
            series: [{
                type: 'map3D',
                map: 'china',
                shading: 'lambert',
                regionHeight: 2,
                viewControl: {
                    alpha: 45,
                    beta: 0,
                    distance: 115,
                    rotateSensitivity: 1,
                    zoomSensitivity: 1,
                    minDistance: 70,
                    maxDistance: 220,
                    maxAlpha: 90,
                    minAlpha: 10,
                },
                itemStyle: {
                    areaColor: getColorByValue(0.05),
                    borderColor: 'rgba(160,205,255,0.4)',
                    borderWidth: 0.7,
                    opacity: 1,
                },
                label: {
                    show: true,
                    textStyle: {
                        color: '#0d2560',
                        fontSize: 10,
                        textBorderColor: 'rgba(255,255,255,0.85)',
                        textBorderWidth: 2,
                    }
                },
                emphasis: {
                    itemStyle: {
                        areaColor: '#ffca4d',
                        borderColor: 'rgba(255,245,180,0.9)',
                        borderWidth: 1.2,
                    }
                },
                light: {
                    main: {
                        intensity: 2.2,
                        shadow: true,
                        shadowQuality: 'high',
                        alpha: 38,
                        beta: 110,
                    },
                    ambient: { intensity: 0.4 }
                },
                data: seriesData,
            }]
        };
    }

    // 更新右侧面板
    function updateInfoPanel(provinceName) {
        const pNameEl = document.getElementById('pName');
        const pCasesEl = document.getElementById('pCases');
        const pLevelEl = document.getElementById('pLevel');
        const pRatioEl = document.getElementById('pRatio');
        if (!pNameEl) return;

        const provinceData = dataMap[provinceName];
        if (provinceData && provinceData.value > 0) {
            pNameEl.innerText = provinceName;
            pCasesEl.innerText = provinceData.value + ' 件';
            pLevelEl.innerText = provinceData.level || (provinceData.value > 50 ? '高' : (provinceData.value > 10 ? '中' : '低'));
            const ratio = totalCases > 0 ? (provinceData.value / totalCases * 100).toFixed(1) : '0';
            pRatioEl.innerText = ratio + '%';
        } else {
            pNameEl.innerText = provinceName || '全国概览';
            pCasesEl.innerText = provinceData ? (provinceData.value + ' 件') : '0 件';
            pLevelEl.innerText = provinceData ? (provinceData.level || '无风险') : '无风险';
            pRatioEl.innerText = totalCases > 0 && provinceData ? ((provinceData.value / totalCases) * 100).toFixed(1) + '%' : '0%';
        }
    }

    // 重置为全国概览
    function resetToOverview() {
        document.getElementById('pName').innerText = '全国概览';
        document.getElementById('pCases').innerText = totalCases + ' 件';
        document.getElementById('pLevel').innerText = '——';
        document.getElementById('pRatio').innerText = '100%';
    }

    // 加载后端数据并初始化地图
    async function initDashboard() {
        try {
            const response = await fetch('/api/map/stats');
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }
            const dbData = await response.json();

            // 构建 provinceName -> 数据映射
            const dbMap = new Map();
            if (Array.isArray(dbData)) {
                dbData.forEach(item => {
                    dbMap.set(item.provinceName, { caseCount: item.caseCount || 0, riskLevel: item.riskLevel || '低' });
                });
            }

            // 生成完整的 RAW 数据
            RAW = ALL_PROVINCES.map(prov => {
                const backend = dbMap.get(prov);
                const value = backend ? backend.caseCount : 0;
                let level = backend ? backend.riskLevel : '低';
                if (value === 0) level = '无风险';
                else if (value > 100) level = '极高';
                else if (value > 50) level = '高';
                else if (value > 10) level = '中';
                else level = '低';
                return { name: prov, value: value, level: level };
            });

            // 更新全局变量
            dataMap = {};
            RAW.forEach(d => { dataMap[d.name] = d; });
            totalCases = RAW.reduce((sum, d) => sum + d.value, 0);
            maxValue = Math.max(...RAW.map(d => d.value), 1);

            // 初始化图表
            if (!chart) {
                chart = echarts.init(chartDom);
            }
            chart.setOption(buildMapOption(null));
            resetToOverview();

            // 绑定鼠标悬停事件 (已去重，只保留一个)
            chart.off('mouseover'); // 移除旧事件避免重复
            chart.on('mouseover', (params) => {
                if (params && params.name) {
                    const province = params.name;
                    // 更新图表高亮
                    chart.setOption(buildMapOption(province), { replaceMerge: false });
                    updateInfoPanel(province);
                }
            });
            chart.on('mouseout', () => {
                // 恢复全国视图
                chart.setOption(buildMapOption(null), { replaceMerge: false });
                resetToOverview();
            });

            // 窗口自适应
            window.addEventListener('resize', () => chart && chart.resize());
        } catch (error) {
            console.error('数据加载失败，使用模拟默认数据:', error);
            // 降级模拟数据（保证地图显示）
            RAW = ALL_PROVINCES.map(prov => {
                let mockVal = 0;
                let mockLevel = '低';
                if (prov === '广东') mockVal = 245;
                else if (prov === '上海') mockVal = 178;
                else if (prov === '北京') mockVal = 162;
                else if (prov === '浙江') mockVal = 98;
                else if (prov === '江苏') mockVal = 112;
                else mockVal = Math.floor(Math.random() * 30);
                if (mockVal > 100) mockLevel = '极高';
                else if (mockVal > 50) mockLevel = '高';
                else if (mockVal > 10) mockLevel = '中';
                return { name: prov, value: mockVal, level: mockLevel };
            });
            dataMap = {};
            RAW.forEach(d => { dataMap[d.name] = d; });
            totalCases = RAW.reduce((s, d) => s + d.value, 0);
            maxValue = Math.max(...RAW.map(d => d.value), 1);
            if (!chart) chart = echarts.init(chartDom);
            chart.setOption(buildMapOption(null));
            resetToOverview();
            chart.off('mouseover');
            chart.on('mouseover', (params) => {
                if (params && params.name) {
                    chart.setOption(buildMapOption(params.name), { replaceMerge: false });
                    updateInfoPanel(params.name);
                }
            });
            chart.on('mouseout', () => {
                chart.setOption(buildMapOption(null), { replaceMerge: false });
                resetToOverview();
            });
        }
    }

    // 启动应用
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initDashboard);
    } else {
        initDashboard();
    }
})();