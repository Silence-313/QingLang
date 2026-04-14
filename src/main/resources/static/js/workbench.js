/**
 * ===== workbench.js - 工作台交互逻辑（完善会话管理）=====
 */

(function() {
    'use strict';

    // 状态管理
    let currentCase = null;
    let ws = null;
    let currentAssistantMessage = null;
    let currentAIResponse = '';
    let currentConversationId = null;   // 当前会话ID
    let chatHistory = [];               // 当前会话消息列表
    let isFirstMessageInConversation = true;   // 当前会话是否尚未发送过用户消息

    // DOM 元素
    const pendingListEl = document.getElementById('pendingCaseList');
    const caseEditContainer = document.getElementById('caseEditContainer');
    const saveBtn = document.getElementById('saveCaseBtn');
    const cancelBtn = document.getElementById('cancelEditBtn');
    const chatMessages = document.getElementById('chatMessages');
    const chatInput = document.getElementById('chatInput');
    const sendChatBtn = document.getElementById('sendChatBtn');
    const chatStatus = document.getElementById('chatStatus');
    const showDialogBtn = document.getElementById('showPendingDialogBtn');
    const pendingDialog = document.getElementById('pendingDialog');
    const closeDialogBtn = document.getElementById('closePendingDialogBtn');
    const cancelDialogBtn = document.getElementById('cancelPendingDialogBtn');
    const confirmDialogBtn = document.getElementById('confirmPendingDialogBtn');

    const toggleHistoryBtn = document.getElementById('toggleHistoryBtn');
    const closeHistoryBtn = document.getElementById('closeHistoryBtn');
    const historySidebar = document.getElementById('historySidebar');
    const sidebarOverlay = document.getElementById('sidebarOverlay');
    const historyList = document.getElementById('historyList');
    const newChatBtn = document.getElementById('newChatBtn');
    const caseDescInput = document.getElementById('caseDescriptionInput');
    const extractStatus = document.getElementById('extractStatus');

    const backBtn = document.getElementById('backToMainBtn');
    if (backBtn) {
        backBtn.addEventListener('click', () => {
            window.location.href = '/main';
        });
    }

    // 配置 marked 选项
    marked.setOptions({
        breaks: true,        // 支持 GitHub 风格的换行
        gfm: true,           // 启用 GitHub 风格 Markdown
        sanitize: false,     // marked 4.x 已移除 sanitize，改用 DOMPurify（可选）
        smartLists: true,
        smartypants: true
    });

    // ---------- 初始化 ----------
    async function init() {
        await loadPendingCases();
        await ensureActiveConversation();   // 确保存在当前会话
        initWebSocket();
        bindEvents();
    }

    // ---------- 会话相关 ----------
    // 原函数：尝试获取已有会话，存在则使用第一个
// 修改为：始终创建新会话
    async function ensureActiveConversation() {
        try {
            // 直接创建新会话，标题为"新对话"
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
        isFirstMessageInConversation = true;   // 新会话，尚未发送消息
        await loadConversationList();
    }

    function resetChatUI() {
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
            // 根据消息数量判断是否已有用户消息
            isFirstMessageInConversation = messages.filter(m => m.role === 'user').length === 0;
        } catch (err) {
            console.error(err);
        }
    }

    function renderConversationMessages(messages) {
        resetChatUI();
        messages.forEach(msg => {
            const msgDiv = document.createElement('div');
            msgDiv.className = `chat-message ${msg.role}`;
            if (msg.role === 'assistant') {
                msgDiv.innerHTML = `<div class="message-content markdown-body">${marked.parse(msg.content)}</div>`;
            } else {
                // 用户消息一般不需要 Markdown，保持纯文本
                msgDiv.innerHTML = `<div class="message-content">${escapeHtml(msg.content)}</div>`;
            }
            chatMessages.appendChild(msgDiv);
        });
        scrollToBottom();
    }

    // ---------- 侧边栏历史列表 ----------
    async function openHistorySidebar() {
        historySidebar.classList.add('open');
        sidebarOverlay.classList.add('show');
        await loadConversationList();
    }

    function closeHistorySidebar() {
        historySidebar.classList.remove('open');
        sidebarOverlay.classList.remove('show');
    }

    async function loadConversationList() {
        try {
            const convs = await fetchConversations();
            renderConversationList(convs);
        } catch (err) {
            historyList.innerHTML = '<div class="empty-placeholder">加载失败</div>';
        }
    }

    function renderConversationList(convs) {
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

    // 新对话按钮处理
    async function handleNewChat() {
        await createNewConversation('新对话');
    }

    // ---------- 消息发送与保存 ----------
    async function sendChatMessage() {
        const message = chatInput.value.trim();
        if (!message) return;

        if (!ws || ws.readyState !== WebSocket.OPEN) {
            alert('WebSocket 未连接，请刷新页面重试');
            return;
        }

        // 如果是当前会话的第一条用户消息，更新会话标题
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

    // 新增函数：更新会话标题
    async function updateConversationTitle(title) {
        try {
            await fetch(`/api/chat/conversation/${currentConversationId}/title`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ title })
            });
            // 如果侧边栏当前打开，刷新列表
            if (historySidebar.classList.contains('open')) {
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
            chatMessages.appendChild(currentAssistantMessage);
        }
        const contentDiv = currentAssistantMessage.querySelector('.message-content');
        // 将 Markdown 转换为 HTML 并设置
        contentDiv.innerHTML = marked.parse(currentAIResponse);
        scrollToBottom();
    }

    function finishAssistantMessage() {
        if (currentAIResponse) {
            saveMessageToHistory('assistant', currentAIResponse);
        }
        currentAIResponse = '';
        currentAssistantMessage = null;
        sendChatBtn.disabled = false;
        chatStatus.textContent = '● 在线';
        chatStatus.style.color = '#27ae60';
    }

    function scrollToBottom() {
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }

    // ---------- WebSocket ----------
    function initWebSocket() {
        if (ws && ws.readyState === WebSocket.OPEN) return;
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const host = window.location.host;
        ws = new WebSocket(`${protocol}//${host}/ws/chat`);

        ws.onopen = () => {
            chatStatus.textContent = '● 在线';
            chatStatus.style.color = '#27ae60';
        };
        ws.onmessage = (event) => {
            const data = event.data;
            if (data === '[DONE]') finishAssistantMessage();
            else if (data.startsWith('[ERROR]')) {
                chatStatus.textContent = '⚠️ ' + data.substring(7);
                finishAssistantMessage();
            } else appendToAssistantMessage(data);
        };
        ws.onclose = () => {
            chatStatus.textContent = '○ 离线';
            chatStatus.style.color = '#6a8caa';
        };
        ws.onerror = () => {
            chatStatus.textContent = '⚠️ 连接错误';
            chatStatus.style.color = '#e74c3c';
        };
    }

    // ---------- 待办案件相关（保持不变） ----------
    async function loadPendingCases() {
        try {
            const res = await fetch('/api/workbench/pending-cases', { credentials: 'include' });
            const cases = await res.json();
            renderPendingList(cases);
        } catch (err) {
            pendingListEl.innerHTML = '<div class="empty-placeholder">加载失败</div>';
        }
    }

    function renderPendingList(tasks) {
        if (!tasks || tasks.length === 0) {
            pendingListEl.innerHTML = '<div class="empty-placeholder">暂无待办案件</div>';
            return;
        }
        pendingListEl.innerHTML = tasks.map(t => {
            const priorityClass = `priority-${t.priority.toLowerCase()}`;
            const statusText = t.taskStatus === 'PENDING' ? '待处理' : (t.taskStatus === 'IN_PROGRESS' ? '进行中' : '已完成');
            const dueDate = t.dueDate ? `📅 ${t.dueDate}` : '';
            return `
            <div class="pending-item" data-case-id="${t.caseId}" data-task-id="${t.taskId}">
                <div class="case-title">${escapeHtml(t.taskTitle || t.caseName)}</div>
                <div class="case-meta">${escapeHtml(t.caseNumber)} · ${escapeHtml(t.caseType || '未分类')}</div>
                <div class="task-tags">
                    <span class="task-status ${t.taskStatus.toLowerCase()}">${statusText}</span>
                    <span class="task-priority ${priorityClass}">${t.priority}</span>
                </div>
                <div class="task-due">${dueDate}</div>
            </div>
        `;
        }).join('');

        pendingListEl.querySelectorAll('.pending-item').forEach(item => {
            item.addEventListener('click', () => {
                const caseId = item.dataset.caseId;
                loadCaseForEdit(caseId);
                pendingListEl.querySelectorAll('.pending-item').forEach(i => i.classList.remove('active'));
                item.classList.add('active');
            });
        });
    }

    async function loadCaseForEdit(caseId) {
        try {
            const res = await fetch(`/api/workbench/case/${caseId}`, { credentials: 'include' });
            const caseData = await res.json();
            currentCase = caseData;
            renderEditForm(caseData);
        } catch (err) {
            caseEditContainer.innerHTML = '<div class="empty-placeholder">加载案件详情失败</div>';
        }
    }

    function renderEditForm(caseData) {
        caseEditContainer.innerHTML = `
            <div class="edit-field">
                <label>案件编号</label>
                <input type="text" id="edit-caseNumber" value="${escapeHtml(caseData.caseNumber || '')}" />
            </div>
            <div class="edit-field">
                <label>案件名称</label>
                <input type="text" id="edit-caseName" value="${escapeHtml(caseData.caseName || '')}" />
            </div>
            <div class="edit-field">
                <label>审理法院</label>
                <input type="text" id="edit-courtName" value="${escapeHtml(caseData.courtName || '')}" />
            </div>
            <div class="edit-field">
                <label>案件类型</label>
                <input type="text" id="edit-caseType" value="${escapeHtml(caseData.caseType || '')}" />
            </div>
            <div class="edit-field">
                <label>受理日期</label>
                <input type="date" id="edit-acceptanceDate" value="${caseData.acceptanceDate || ''}" />
            </div>
            <div class="edit-field">
                <label>卷宗总页数</label>
                <input type="number" id="edit-totalPages" value="${caseData.totalPages || ''}" />
            </div>
        `;
    }

    async function saveCurrentCase() {
        if (!currentCase) {
            alert('请先选择一个案件');
            return;
        }
        const updatedData = {
            ...currentCase,
            caseNumber: document.getElementById('edit-caseNumber')?.value,
            caseName: document.getElementById('edit-caseName')?.value,
            courtName: document.getElementById('edit-courtName')?.value,
            caseType: document.getElementById('edit-caseType')?.value,
            acceptanceDate: document.getElementById('edit-acceptanceDate')?.value,
            totalPages: parseInt(document.getElementById('edit-totalPages')?.value) || 0
        };
        try {
            const res = await fetch('/api/workbench/case/save', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updatedData)
            });
            if (res.ok) {
                alert('保存成功');
                currentCase = updatedData;
            } else {
                alert('保存失败');
            }
        } catch (err) {
            alert('保存失败: ' + err.message);
        }
    }

    function openPendingDialog() {
        if (pendingDialog) {
            pendingDialog.style.display = 'flex';
            caseDescInput.value = '';
            caseDescInput.disabled = false;
            extractStatus.textContent = '';
            confirmDialogBtn.disabled = false;
        }
    }

    // 弹窗函数（占位）
    function closePendingDialog() { if (pendingDialog) pendingDialog.style.display = 'none'; }
    // 修改 confirmPendingAction 函数
    async function confirmPendingAction() {
        const text = caseDescInput.value.trim();
        if (!text) {
            alert('请输入案件描述文本');
            return;
        }

        caseDescInput.disabled = true;
        extractStatus.textContent = '⏳ AI 正在分析文本，请稍候...';
        confirmDialogBtn.disabled = true;

        try {
            const res = await fetch('/api/workbench/extract-case', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ text })
            });

            if (!res.ok) {
                const err = await res.text();
                throw new Error(err || '提取失败');
            }

            const result = await res.json();
            extractStatus.textContent = `✅ 提取成功！案件编号：${result.caseNumber}`;
            setTimeout(() => {
                closePendingDialog();
                loadPendingCases();
            }, 2000);
        } catch (err) {
            extractStatus.textContent = '❌ 提取失败：' + err.message;
        } finally {
            caseDescInput.disabled = false;
            confirmDialogBtn.disabled = false;
        }
    }

    // ---------- 事件绑定 ----------
    function bindEvents() {
        saveBtn.addEventListener('click', saveCurrentCase);
        cancelBtn.addEventListener('click', () => {
            if (currentCase) loadCaseForEdit(currentCase.caseId);
        });
        sendChatBtn.addEventListener('click', sendChatMessage);
        chatInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') sendChatMessage(); });

        if (showDialogBtn) showDialogBtn.addEventListener('click', openPendingDialog);
        if (closeDialogBtn) closeDialogBtn.addEventListener('click', closePendingDialog);
        if (cancelDialogBtn) cancelDialogBtn.addEventListener('click', closePendingDialog);
        if (confirmDialogBtn) confirmDialogBtn.addEventListener('click', confirmPendingAction);
        if (pendingDialog) pendingDialog.addEventListener('click', (e) => { if (e.target === pendingDialog) closePendingDialog(); });

        if (toggleHistoryBtn) toggleHistoryBtn.addEventListener('click', openHistorySidebar);
        if (closeHistoryBtn) closeHistoryBtn.addEventListener('click', closeHistorySidebar);
        if (sidebarOverlay) sidebarOverlay.addEventListener('click', closeHistorySidebar);
        if (newChatBtn) newChatBtn.addEventListener('click', handleNewChat);

        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && historySidebar?.classList.contains('open')) closeHistorySidebar();
            if (e.key === 'Escape' && pendingDialog?.style.display === 'flex') closePendingDialog();
        });
    }

    function escapeHtml(str) {
        if (!str) return '';
        const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' };
        return String(str).replace(/[&<>"']/g, m => map[m]);
    }

    // 启动
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();