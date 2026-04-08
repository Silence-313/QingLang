// ===== index.js - 统一认证交互与API逻辑 =====

// DOM 元素
const loginPanel = document.getElementById('loginPanel');
const registerPanel = document.getElementById('registerPanel');
const loginIdInput = document.getElementById('loginId');
const loginPwdInput = document.getElementById('loginPwd');
const loginBtn = document.getElementById('loginBtn');
const regUserInput = document.getElementById('regUser');
const regEmailInput = document.getElementById('regEmail');
const regPhoneInput = document.getElementById('regPhone');
const regPwdInput = document.getElementById('regPwd');
const registerBtn = document.getElementById('registerBtn');
const switchToRegisterLink = document.getElementById('switchToRegister');
const switchToLoginLink = document.getElementById('switchToLogin');
const loginMsgDiv = document.getElementById('loginMsg');
const regMsgDiv = document.getElementById('regMsg');

// 辅助函数：显示消息
function showMsg(element, text, isError = true) {
    if (!element) return;
    element.innerText = text;
    element.style.display = 'block';
    element.style.backgroundColor = isError ? '#f8d7da' : '#d4edda';
    element.style.color = isError ? '#721c24' : '#155724';
    // 3秒后自动隐藏消息（仅成功消息自动隐藏，错误保留较长但也可以）
    if (!isError) {
        setTimeout(() => {
            if (element.style.display === 'block') {
                element.style.display = 'none';
            }
        }, 3000);
    }
}

// 清除消息
function clearMsg(element) {
    if (element) {
        element.style.display = 'none';
        element.innerText = '';
    }
}

// 切换面板
function togglePanel(target) {
    clearMsg(loginMsgDiv);
    clearMsg(regMsgDiv);
    if (target === 'register') {
        loginPanel.classList.add('hidden');
        registerPanel.classList.remove('hidden');
        // 清空注册表单
        regUserInput.value = '';
        regEmailInput.value = '';
        regPhoneInput.value = '';
        regPwdInput.value = '';
    } else {
        registerPanel.classList.add('hidden');
        loginPanel.classList.remove('hidden');
        // 清空登录表单
        loginIdInput.value = '';
        loginPwdInput.value = '';
    }
}

// 登录逻辑
async function doLogin() {
    const identifier = loginIdInput.value.trim();
    const password = loginPwdInput.value.trim();

    if (!identifier || !password) {
        showMsg(loginMsgDiv, '请输入账号和密码', true);
        return;
    }

    // 显示加载状态
    loginBtn.disabled = true;
    loginBtn.textContent = '登录中...';

    try {
        // 后端接口预期 POST /api/auth/login 携带 application/x-www-form-urlencoded 或 JSON
        // 根据原始设计使用 query string 方式，但为了规范，使用 JSON 格式（同时兼容原后端，根据需求调整）
        // 原代码使用 /api/auth/login?identifier=...&password=... POST，这里改用 JSON 更标准，同时保留原风格扩展
        // 若后端期望表单，可调整，但一般前后端分离项目常用 JSON。为了稳健，同时尝试两种？不，我们假设后端接受 JSON。
        // 根据原始代码中的 fetch 写法，它是 POST + query 参数，可能后端读取的是 req.query。此处保持和原逻辑完全一致：
        const url = `/api/auth/login?identifier=${encodeURIComponent(identifier)}&password=${encodeURIComponent(password)}`;
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            }
        });
        const result = await response.text();

        if (response.ok) {
            showMsg(loginMsgDiv, '登录成功，正在进入系统...', false);
            setTimeout(() => {
                window.location.href = "/main";
            }, 1000);
        } else {
            showMsg(loginMsgDiv, result || '登录失败，请检查账号或密码', true);
        }
    } catch (error) {
        console.error('登录请求异常:', error);
        showMsg(loginMsgDiv, '后端服务未启动或网络错误', true);
    } finally {
        loginBtn.disabled = false;
        loginBtn.textContent = '登 录';
    }
}

// 注册逻辑（完善原有缺失的 fetch 实现）
async function doRegister() {
    const username = regUserInput.value.trim();
    const email = regEmailInput.value.trim();
    const phone = regPhoneInput.value.trim();
    const password = regPwdInput.value.trim();

    // 1. 非空校验
    if (!username || !email || !phone || !password) {
        showMsg(regMsgDiv, '所有字段均为必填项', true);
        return;
    }
    // 2. 用户名格式（字母数字开头，允许字母数字组合，长度3-20）
    const userRegex = /^[a-zA-Z0-9]{3,20}$/;
    if (!userRegex.test(username)) {
        showMsg(regMsgDiv, '用户名须为3-20位字母或数字', true);
        return;
    }
    // 3. 邮箱格式
    const emailRegex = /^[^\s@]+@([^\s@]+\.)+[^\s@]+$/;
    if (!emailRegex.test(email)) {
        showMsg(regMsgDiv, '邮箱格式不正确', true);
        return;
    }
    // 4. 手机号（中国大陆手机号）
    const phoneRegex = /^1[3-9]\d{9}$/;
    if (!phoneRegex.test(phone)) {
        showMsg(regMsgDiv, '请输入有效的11位手机号', true);
        return;
    }
    // 5. 密码长度
    if (password.length < 6) {
        showMsg(regMsgDiv, '密码长度至少为6位', true);
        return;
    }

    registerBtn.disabled = true;
    registerBtn.textContent = '注册中...';

    try {
        const payload = { username, email, phone, password };
        const response = await fetch('/api/auth/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        const result = await response.text();
        if (response.ok) {
            showMsg(regMsgDiv, '注册成功！请返回登录', false);
            // 清空表单并跳转到登录面板
            setTimeout(() => {
                togglePanel('login');
                // 可选自动填充账号
                loginIdInput.value = username;
            }, 1500);
        } else {
            showMsg(regMsgDiv, result || '注册失败，请稍后重试', true);
        }
    } catch (error) {
        console.error('注册异常:', error);
        showMsg(regMsgDiv, '后端服务未启动或网络错误', true);
    } finally {
        registerBtn.disabled = false;
        registerBtn.textContent = '注 册';
    }
}

// 事件绑定
loginBtn.addEventListener('click', doLogin);
registerBtn.addEventListener('click', doRegister);
switchToRegisterLink.addEventListener('click', (e) => {
    e.preventDefault();
    togglePanel('register');
});
switchToLoginLink.addEventListener('click', (e) => {
    e.preventDefault();
    togglePanel('login');
});

// 支持回车提交
function setupEnterKey() {
    const loginPwd = document.getElementById('loginPwd');
    const regPwd = document.getElementById('regPwd');
    if (loginPwd) {
        loginPwd.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') doLogin();
        });
    }
    if (regPwd) {
        regPwd.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') doRegister();
        });
    }
}
setupEnterKey();

// 页面初始化确保登录面板可见
togglePanel('login');