/**
 * ===== detail.js - 案件详情页重构版 =====
 */

// 1. 立即执行：强制注入按钮样式 (防止 CSS 加载失败导致按钮难看)
(function injectStyles() {
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
        }
        .back-btn:hover {
            background: #5ab4ff !important;
            color: #fff !important;
            box-shadow: 0 0 15px rgba(90, 180, 255, 0.6) !important;
        }
    `;
    document.head.appendChild(style);
})();

// 2. 核心逻辑：页面加载
document.addEventListener('DOMContentLoaded', async () => {
    const params = new URLSearchParams(window.location.search);
    const caseId = params.get('id');
    const fromKwd = params.get('fromKwd'); // 从 URL 获取带过来的搜索词

    // --- 绑定返回按钮逻辑 ---
    const backBtn = document.getElementById('backBtn');
    if (backBtn) {
        backBtn.addEventListener('click', () => {
            const params = new URLSearchParams(window.location.search);
            const fromKwd = params.get('fromKwd'); // 这里是关键：必须能拿到参数

            if (fromKwd) {
                // 成功拿到关键词，跳回搜索页
                window.location.href = `/search-results?keyword=${encodeURIComponent(fromKwd)}`;
            } else if (document.referrer && document.referrer.indexOf(window.location.host) !== -1) {
                // 没有关键词但有来源页，使用历史回退
                window.history.back();
            } else {
                // 两个都失败，进入你看到的“回到 index”逻辑
                window.location.href = '/';
            }
        });
    }

    // --- 加载详情数据 ---
    if (!caseId) {
        showError('未提供案件ID');
        return;
    }

    try {
        const response = await fetch(`/case/api/detail/${caseId}`);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const data = await response.json();

        console.log("【详情页后端返回数据】:", data);

        renderDetail(data);
    } catch (err) {
        console.error('详情加载失败:', err);
        showError('数据加载失败，请检查后端服务');
    }
});

/**
 * 渲染详情页面内容
 */
function renderDetail(data) {
    // 基础信息
    document.getElementById('caseNum').innerText = data.caseNumber || '—';
    document.getElementById('caseName').innerText = data.caseName || '—';
    document.getElementById('courtName').innerText = data.courtName || '—';
    document.getElementById('acceptDate').innerText = data.acceptanceDate || '未记录';

    // 1. 原有的案件类型标签
    const typeTag = document.getElementById('caseTypeTag');
    if(typeTag) typeTag.innerText = data.caseType || '未分类';

    // 2. 新增：案由标签赋值
    const causeTag = document.getElementById('causeTag');
    if(causeTag) {
        // 优先使用后端返回的 causeOfAction，如果没有则尝试从 content 中截取（针对你之前的后端数据）
        let causeText = data.causeOfAction;

        if (!causeText && data.content && data.content.includes("案由：")) {
            causeText = data.content.split("。")[0].replace("案由：", "");
        }

        causeTag.innerText = causeText || '通用案由';
    }

    // 数字化信息
    const totalPages = document.getElementById('totalPages');
    if(totalPages) totalPages.innerText = (data.totalPages || 0) + ' 页';

    const docTypes = document.getElementById('docTypes');
    if(docTypes) docTypes.innerText = data.documentTypes || '其他';

    // 当事人列表
    const partiesContainer = document.getElementById('partiesContainer');
    if (partiesContainer) {
        if (data.parties && data.parties.length) {
            partiesContainer.innerHTML = data.parties.map(p => `
                <div class="party-list-item" style="padding:10px; border-bottom:1px solid rgba(255,255,255,0.1)">
                    <strong>${escapeHtml(p.partyName)}</strong>
                    <span style="color:#6a8caa; margin-left:10px;">(${escapeHtml(p.nationality || '中国')})</span>
                    <div style="font-size:12px; margin-top:5px; color:#5ab4ff;">类型：${escapeHtml(p.partyType)}</div>
                </div>
            `).join('');
        } else {
            partiesContainer.innerHTML = '<p class="item-lbl">暂无当事人数据</p>';
        }
    }

    // 法律监督评价
    const supervisionBox = document.getElementById('supervisionBox');
    if (supervisionBox) {
        if (data.supervisionComment) {
            supervisionBox.innerHTML = `<p class="item-val">${escapeHtml(data.supervisionComment)}</p>`;
        } else {
            supervisionBox.innerHTML = '<p class="item-lbl">暂未生成监督评价报告</p>';
        }
    }
}

/**
 * 错误显示
 */
function showError(msg) {
    const wrapper = document.querySelector('.detail-wrapper');
    if (wrapper) {
        wrapper.innerHTML = `<div style="color:#ff4d4d; padding:50px; text-align:center;">❌ ${escapeHtml(msg)}</div>`;
    }
}

/**
 * 防XSS
 */
function escapeHtml(str) {
    if (!str) return '';
    const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' };
    return String(str).replace(/[&<>"']/g, m => map[m]);
}