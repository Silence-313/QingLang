// ===== detail.js - 案件详情页动态渲染 =====
document.addEventListener('DOMContentLoaded', async () => {
    const params = new URLSearchParams(window.location.search);
    const caseId = params.get('id');

    if (!caseId) {
        showError('未提供案件ID，即将返回首页');
        setTimeout(() => { location.href = '/'; }, 2000);
        return;
    }

    try {
        const response = await fetch(`/case/api/detail/${caseId}`);
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }
        const data = await response.json();
        renderDetail(data);
    } catch (err) {
        console.error('详情加载失败:', err);
        showError('数据加载失败，请检查后端服务或网络连接');
    }
});

function renderDetail(data) {
    // 基础信息
    document.getElementById('caseNum').innerText = data.caseNumber || '—';
    document.getElementById('caseName').innerText = data.caseName || '—';
    document.getElementById('courtName').innerText = data.courtName || '—';
    document.getElementById('acceptDate').innerText = data.acceptanceDate || '未记录';
    document.getElementById('caseTypeTag').innerText = data.caseType || '未分类';
    document.getElementById('totalPages').innerText = (data.totalPages || 0) + ' 页';
    document.getElementById('docTypes').innerText = data.documentTypes || '其他';

    // 当事人列表
    const partiesContainer = document.getElementById('partiesContainer');
    if (data.parties && data.parties.length) {
        partiesContainer.innerHTML = data.parties.map(p => `
            <div class="party-list-item">
                <strong>${escapeHtml(p.partyName)}</strong>
                <span style="color:#6a8caa; margin-left:10px;">(${escapeHtml(p.nationality || '中国')})</span>
                <div style="font-size:12px; margin-top:5px; color:#5ab4ff;">类型：${escapeHtml(p.partyType)}</div>
            </div>
        `).join('');
    } else {
        partiesContainer.innerHTML = '<p class="item-lbl">暂无当事人数据</p>';
    }

    // 法律监督评价（示例，可根据后端字段扩展）
    const supervisionBox = document.getElementById('supervisionBox');
    if (data.supervisionComment) {
        supervisionBox.innerHTML = `<p class="item-val">${escapeHtml(data.supervisionComment)}</p>`;
    } else {
        supervisionBox.innerHTML = '<p class="item-lbl">暂未生成监督评价报告</p>';
    }
}

function showError(msg) {
    const wrapper = document.querySelector('.detail-wrapper');
    if (wrapper) {
        wrapper.innerHTML = `<div class="error-message">❌ ${escapeHtml(msg)}</div>`;
    } else {
        alert(msg);
    }
}

// 简单的防XSS工具
function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/[&<>]/g, function(m) {
        if (m === '&') return '&amp;';
        if (m === '<') return '&lt;';
        if (m === '>') return '&gt;';
        return m;
    });
}