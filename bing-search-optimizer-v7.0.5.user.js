// ==UserScript==
// @name         必应搜索优化器 v7.0.5
// @namespace    http://tampermonkey.net/
// @version      7.0.5
// @description  优化必应搜索结果界面 - 双列布局、圆角、浅蓝主题、自定义背景、拖拽设置、深浅色切换（优化同步必应原生）、宽度自适应、元素屏蔽
// @author       MiniMax Agent
// @match        https://*.bing.com/*
// @match        https://bing.com/*
// @match        https://cn.bing.com/*
// @match        https://*.bing.com/search*
// @grant        GM_setValue
// @grant        GM_getValue
// @run-at       document-end
// ==/UserScript==

(function() {
    'use strict';

    // 配置选项
    const CONFIG = {
        enabled: true,
        columnGap: 40,
        maxWidth: 1400,
        padding: 30,
        animation: true,
        debug: false,
        customBackground: null,
        preserveHeader: true,
        preserveSearchBox: true,
        preserveCategories: true,
        scrollTopPosition: 'right',
        currentTheme: 'light'
    };

    // SVG图标定义
    const SVG_ICONS = {
        scrollTop: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 15l-6-6-6 6"/></svg>`,
        close: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`,
        settings: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>`,
        apply: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20,6 9,17 4,12"/></svg>`,
        clear: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="23,4 23,10 17,10"/><polyline points="1,20 1,14 7,14"/><path d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 0 1 3.51 15"/></svg>`,
        presets: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21,15 16,10 5,21"/></svg>`
    };

    // 拖拽状态
    const dragState = {
        isDragging: false,
        startX: 0,
        startY: 0,
        buttonX: 20,
        buttonY: 20
    };

    // 日志函数
    function log(message, type = 'info') {
        if (CONFIG.debug) {
            const prefix = '[必应优化器]';
            switch(type) {
                case 'error': console.error(prefix, message); break;
                case 'warn': console.warn(prefix, message); break;
                case 'success': console.log('%c' + prefix + ' ' + message, 'color: #4CAF50'); break;
                default: console.log(prefix, message);
            }
        }
    }

    // 检查是否为搜索结果页面
    function isSearchPage() {
        const isBing = window.location.hostname.includes('bing.com');
        const hasResults = document.querySelector('#b_results, .b_results, .b_algo, .b_sritem, .b_result');
        const isSearchPage = window.location.search.includes('q=');
        return isBing && hasResults && isSearchPage;
    }

    // 等待元素出现
    function waitForElement(selector, timeout = 10000) {
        return new Promise((resolve, reject) => {
            const element = document.querySelector(selector);
            if (element) {
                resolve(element);
                return;
            }

            const observer = new MutationObserver((mutations) => {
                const element = document.querySelector(selector);
                if (element) {
                    observer.disconnect();
                    resolve(element);
                }
            });

            observer.observe(document.body, {
                childList: true,
                subtree: true
            });

            setTimeout(() => {
                observer.disconnect();
                reject(new Error(`元素 ${selector} 未在 ${timeout}ms 内出现`));
            }, timeout);
        });
    }

    // 加载用户设置
    function loadUserSettings() {
        try {
            const savedBg = GM_getValue('customBackground', null);
            if (savedBg) {
                CONFIG.customBackground = savedBg;
            }
            
            const savedTheme = GM_getValue('theme', 'light');
            CONFIG.currentTheme = savedTheme;
            
            const savedPosition = GM_getValue('settingsButtonPosition', null);
            if (savedPosition) {
                dragState.buttonX = savedPosition.x;
                dragState.buttonY = savedPosition.y;
            }
            
            log('用户设置已加载');
        } catch (error) {
            log('加载用户设置失败: ' + error.message, 'error');
        }
    }

    // 保存用户设置
    function saveUserSettings() {
        try {
            if (CONFIG.customBackground) {
                GM_setValue('customBackground', CONFIG.customBackground);
            }
            GM_setValue('theme', CONFIG.currentTheme);
            GM_setValue('settingsButtonPosition', { 
                x: dragState.buttonX, 
                y: dragState.buttonY 
            });
        } catch (error) {
            log('保存用户设置失败: ' + error.message, 'error');
        }
    }

    // 隐藏干扰元素（保护重要功能）
    function hideInterferingElements() {
        const hideSelectors = [
            '.b_adBlock',
            '.b_socialSidebar', 
            '.b_featuredAds',
            '.b_relatedSearches',
            '.b_peopleAlsoAsk',
            '.b_trending',
            '.b_topStories',
            '.salink',
            '.mmkifsa'
        ];

        hideSelectors.forEach(selector => {
            document.querySelectorAll(selector).forEach(element => {
                element.style.display = 'none';
            });
        });

        log('干扰元素清理完成，已保护重要功能');
    }

    // 设置自定义背景图
    function setCustomBackground() {
        const oldStyle = document.getElementById('bing-optimizer-background');
        if (oldStyle) {
            oldStyle.remove();
        }

        if (!CONFIG.customBackground) {
            log('无自定义背景图');
            return;
        }

        try {
            const style = document.createElement('style');
            style.id = 'bing-optimizer-background';
            style.textContent = `
                body {
                    background-image: url("${CONFIG.customBackground}") !important;
                    background-size: cover !important;
                    background-position: center !important;
                    background-repeat: no-repeat !important;
                    background-attachment: fixed !important;
                }
                
                #b_content, .b_content {
                    background: rgba(255, 255, 255, 0.95) !important;
                    backdrop-filter: blur(10px) !important;
                    border-radius: 20px !important;
                    margin: 20px auto !important;
                }
                
                #b_results, .b_results {
                    background: rgba(255, 255, 255, 0.9) !important;
                    backdrop-filter: blur(5px) !important;
                }
                
                .b_algo, .b_sritem, .b_result {
                    background: rgba(255, 255, 255, 0.95) !important;
                    backdrop-filter: blur(8px) !important;
                    border: 1px solid rgba(255, 255, 255, 0.2) !important;
                }
            `;
            
            document.head.appendChild(style);
            log('自定义背景图已应用: ' + CONFIG.customBackground, 'success');
        } catch (error) {
            log('设置自定义背景图失败: ' + error.message, 'error');
        }
    }

    // 创建设置按钮拖拽功能
    function createDraggableButton() {
        const button = document.querySelector('.bing-optimizer-settings-btn');
        if (!button) return;

        // 设置按钮位置
        if (dragState.buttonX || dragState.buttonY) {
            button.style.left = dragState.buttonX + 'px';
            button.style.top = dragState.buttonY + 'px';
            button.style.right = 'auto';
        }

        // 开始拖拽
        function startDrag(e) {
            e.preventDefault();
            dragState.isDragging = true;
            dragState.startX = e.clientX || e.touches[0].clientX;
            dragState.startY = e.clientY || e.touches[0].clientY;
            
            button.classList.add('dragging');
            document.addEventListener('mousemove', drag);
            document.addEventListener('mouseup', stopDrag);
            document.addEventListener('touchmove', drag);
            document.addEventListener('touchend', stopDrag);
        }

        // 拖拽中
        function drag(e) {
            if (!dragState.isDragging) return;
            
            e.preventDefault();
            const currentX = e.clientX || e.touches[0].clientX;
            const currentY = e.clientY || e.touches[0].clientY;
            
            const deltaX = currentX - dragState.startX;
            const deltaY = currentY - dragState.startY;
            
            const newX = dragState.buttonX + deltaX;
            const newY = dragState.buttonY + deltaY;
            
            // 限制在视窗内
            const maxX = window.innerWidth - 56;
            const maxY = window.innerHeight - 56;
            
            const clampedX = Math.max(0, Math.min(newX, maxX));
            const clampedY = Math.max(0, Math.min(newY, maxY));
            
            button.style.left = clampedX + 'px';
            button.style.top = clampedY + 'px';
            button.style.right = 'auto';
        }

        // 停止拖拽
        function stopDrag(e) {
            if (!dragState.isDragging) return;
            
            dragState.isDragging = false;
            button.classList.remove('dragging');
            
            // 保存位置
            const rect = button.getBoundingClientRect();
            dragState.buttonX = rect.left;
            dragState.buttonY = rect.top;
            saveUserSettings();
            
            document.removeEventListener('mousemove', drag);
            document.removeEventListener('mouseup', stopDrag);
            document.removeEventListener('touchmove', drag);
            document.removeEventListener('touchend', stopDrag);
        }

        button.addEventListener('mousedown', startDrag);
        button.addEventListener('touchstart', startDrag);
    }

    // 创建优化样式（包含主题系统）
    function createOptimizedStyles() {
        const style = document.createElement('style');
        style.id = 'bing-optimizer-styles';
        style.textContent = `
            :root {
                --primary-bg: #f8f9fa;
                --secondary-bg: #ffffff;
                --text-color: #212529;
                --border-color: #dee2e6;
                --accent-color: #4a9eff;
                --success-color: #28a745;
                --warning-color: #ffc107;
                --shadow: 0 4px 20px rgba(74, 158, 255, 0.08);
            }

            [data-theme="dark"] {
                --primary-bg: #1a1a1a;
                --secondary-bg: #2d2d2d;
                --text-color: #e0e0e0;
                --border-color: #404040;
                --accent-color: #4a9eff;
                --success-color: #4caf50;
                --warning-color: #ff9800;
                --shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
            }

            body {
                background-color: var(--primary-bg) !important;
                color: var(--text-color) !important;
                transition: all 0.3s ease !important;
            }

            #b_content, .b_content {
                max-width: ${CONFIG.maxWidth}px !important;
                margin: 0 auto !important;
                padding: ${CONFIG.padding}px !important;
                background: transparent !important;
                position: relative !important;
                left: 0 !important;
                right: 0 !important;
            }

            #b_results, .b_results {
                display: grid !important;
                grid-template-columns: repeat(2, 1fr) !important;
                gap: ${CONFIG.columnGap}px !important;
                margin: 0 auto !important;
                padding: ${CONFIG.padding}px !important;
                background: transparent !important;
                width: 100% !important;
                max-width: 100% !important;
                position: relative !important;
                left: 0 !important;
                right: 0 !important;
            }

            .b_algo, .b_sritem, .b_result {
                background: var(--secondary-bg) !important;
                border-radius: 16px !important;
                border: 1px solid var(--border-color) !important;
                box-shadow: var(--shadow) !important;
                padding: 24px !important;
                margin: 0 !important;
                transition: all 0.3s ease !important;
                position: relative !important;
                left: 0 !important;
                right: 0 !important;
            }

            .b_algo:hover, .b_sritem:hover, .b_result:hover {
                transform: translateY(-2px) !important;
                box-shadow: 0 8px 32px rgba(74, 158, 255, 0.15) !important;
            }

            .b_algo h2 a {
                color: var(--accent-color) !important;
                text-decoration: none !important;
                transition: color 0.3s ease !important;
            }

            .b_algo h2 a:hover {
                color: var(--text-color) !important;
            }

            .b_caption {
                background-color: var(--primary-bg) !important;
                border-radius: 6px !important;
                padding: 12px !important;
                margin-top: 12px !important;
            }

            /* 大元素单列显示 */
            .b_top, .b_mop, .b_weather, .b_knowledge,
            .b_ai, .b_aiChat, .b_aiSummary, .ai-chat,
            .b_chat, .b_copilot, .copilot, .ai-assistant,
            .b_aiAnswers, .ai-answers, .b_trending {
                grid-column: span 2 !important;
            }

 
            /* 图像轮播和引用区域宽度调整 */
            .acfImgAns, .iaheader, .gs_cit_wrapper, .cit_exp_cont {
                width: 100% !important;
                max-width: 100% !important;
                box-sizing: border-box !important;
            }

            /* 删除底部冗余空间 */
            body {
                min-height: 100vh !important;
                max-height: 100vh !important;
                overflow-y: auto !important;
            }

            #b_footer, .b_footer {
                margin-bottom: 0 !important;
                padding-bottom: 20px !important;
            }

            /* 屏蔽salink和mmkifsa */
            .salink, .mmkifsa {
                display: none !important;
                visibility: hidden !important;
            }

            /* 主题切换开关 */
            .theme-toggle {
                display: flex !important;
                align-items: center !important;
                gap: 10px !important;
                margin: 16px 0 !important;
            }

            .theme-switch {
                position: relative !important;
                width: 50px !important;
                height: 24px !important;
                background-color: var(--border-color) !important;
                border-radius: 12px !important;
                cursor: pointer !important;
                transition: background-color 0.3s ease !important;
            }

            .theme-switch.active {
                background-color: var(--accent-color) !important;
            }

            .theme-slider {
                position: absolute !important;
                top: 2px !important;
                left: 2px !important;
                width: 20px !important;
                height: 20px !important;
                background-color: white !important;
                border-radius: 50% !important;
                transition: transform 0.3s ease !important;
                box-shadow: 0 2px 4px rgba(0,0,0,0.2) !important;
            }

            .theme-slider.active {
                transform: translateX(26px) !important;
            }

            /* 回到顶部按钮 */
            .bing-optimizer-scroll-top {
                position: fixed !important;
                bottom: 30px !important;
                width: 56px !important;
                height: 56px !important;
                background: var(--accent-color) !important;
                color: white !important;
                border: none !important;
                border-radius: 50% !important;
                cursor: pointer !important;
                display: flex !important;
                align-items: center !important;
                justify-content: center !important;
                box-shadow: 0 4px 20px rgba(74, 158, 255, 0.3) !important;
                transition: all 0.3s ease !important;
                z-index: 10000 !important;
                opacity: 0 !important;
                visibility: hidden !important;
                transform: translateY(20px) !important;
            }

            .bing-optimizer-scroll-top.show {
                opacity: 1 !important;
                visibility: visible !important;
                transform: translateY(0) !important;
            }

            .bing-optimizer-scroll-top:hover {
                background: #2d7dd2 !important;
                transform: translateY(-2px) !important;
                box-shadow: 0 8px 32px rgba(74, 158, 255, 0.4) !important;
            }

            ${CONFIG.scrollTopPosition === 'center' ? 
                '.bing-optimizer-scroll-top { left: 50% !important; transform: translateX(-50%) translateY(20px) !important; }' : 
                '.bing-optimizer-scroll-top { right: 30px !important; }'
            }

            /* 设置面板 */
            .bing-optimizer-settings {
                position: fixed !important;
                top: 50% !important;
                left: 50% !important;
                transform: translate(-50%, -50%) !important;
                background: var(--secondary-bg) !important;
                border: 1px solid var(--border-color) !important;
                border-radius: 16px !important;
                box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3) !important;
                padding: 0 !important;
                z-index: 10001 !important;
                min-width: 400px !important;
                max-width: 500px !important;
                display: none !important;
                color: var(--text-color) !important;
                ${CONFIG.animation ? 'animation: slideInUp 0.3s ease !important;' : ''}
            }

            .bing-optimizer-settings.show {
                display: block !important;
            }

            .settings-header {
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%) !important;
                color: white !important;
                padding: 16px 20px !important;
                border-radius: 16px 16px 0 0 !important;
                display: flex !important;
                justify-content: space-between !important;
                align-items: center !important;
                font-weight: bold !important;
            }

            .settings-close {
                background: none !important;
                border: none !important;
                color: white !important;
                cursor: pointer !important;
                padding: 4px !important;
                border-radius: 4px !important;
                display: flex !important;
                align-items: center !important;
                justify-content: center !important;
                font-size: 18px !important;
                width: 24px !important;
                height: 24px !important;
            }

            .settings-close:hover {
                background: rgba(255, 255, 255, 0.2) !important;
            }

            .settings-body {
                padding: 20px !important;
                color: var(--text-color) !important;
            }

            .settings-input {
                width: 100% !important;
                padding: 12px 16px !important;
                border: 2px solid var(--border-color) !important;
                border-radius: 8px !important;
                font-size: 14px !important;
                outline: none !important;
                transition: border-color 0.3s ease !important;
                box-sizing: border-box !important;
                background: var(--primary-bg) !important;
                color: var(--text-color) !important;
            }

            .settings-input:focus {
                border-color: var(--accent-color) !important;
                box-shadow: 0 0 0 3px rgba(74, 158, 255, 0.1) !important;
            }

            .settings-buttons {
                display: flex !important;
                gap: 8px !important;
                margin-top: 16px !important;
                flex-wrap: wrap !important;
            }

            .settings-btn {
                background: var(--accent-color) !important;
                color: white !important;
                border: none !important;
                border-radius: 6px !important;
                padding: 8px 12px !important;
                cursor: pointer !important;
                font-size: 13px !important;
                display: flex !important;
                align-items: center !important;
                gap: 4px !important;
                transition: all 0.3s ease !important;
            }

            .settings-btn:hover {
                background: #2d7dd2 !important;
                transform: translateY(-1px) !important;
            }

            .settings-btn.secondary {
                background: #6c757d !important;
            }

            .settings-btn.secondary:hover {
                background: #5a6268 !important;
            }

            .settings-btn.success {
                background: var(--success-color) !important;
            }

            .settings-btn.success:hover {
                background: #218838 !important;
            }

            /* 设置按钮 */
            .bing-optimizer-settings-btn {
                position: fixed !important;
                bottom: 20px !important;
                right: 20px !important;
                background: var(--accent-color) !important;
                color: white !important;
                border: none !important;
                border-radius: 50% !important;
                width: 56px !important;
                height: 56px !important;
                cursor: pointer !important;
                display: flex !important;
                align-items: center !important;
                justify-content: center !important;
                box-shadow: 0 4px 20px rgba(102, 126, 234, 0.3) !important;
                transition: all 0.3s ease !important;
                z-index: 9999 !important;
                user-select: none !important;
            }

            .bing-optimizer-settings-btn:hover {
                background: #5a67d8 !important;
                transform: translateY(-2px) !important;
                box-shadow: 0 8px 32px rgba(102, 126, 234, 0.4) !important;
            }

            .bing-optimizer-settings-btn:active {
                transform: translateY(0px) !important;
                box-shadow: 0 4px 20px rgba(102, 126, 234, 0.3) !important;
            }

            .bing-optimizer-settings-btn.dragging {
                transform: scale(1.1) !important;
                cursor: grabbing !important;
            }



            /* 成功提示 */
            .success-toast {
                position: fixed !important;
                top: 80px !important;
                right: 20px !important;
                background: var(--success-color) !important;
                color: white !important;
                padding: 12px 20px !important;
                border-radius: 6px !important;
                box-shadow: var(--shadow) !important;
                z-index: 10003 !important;
                animation: slideIn 0.3s ease !important;
            }

            @keyframes slideIn {
                from { transform: translateX(100%); opacity: 0; }
                to { transform: translateX(0); opacity: 1; }
            }

            /* 动画定义 */
            ${CONFIG.animation ? `
            @keyframes fadeInUp {
                from {
                    opacity: 0;
                    transform: translateY(30px);
                }
                to {
                    opacity: 1;
                    transform: translateY(0);
                }
            }

            @keyframes slideInUp {
                from {
                    opacity: 0;
                    transform: translate(-50%, -50%) translateY(50px);
                }
                to {
                    opacity: 1;
                    transform: translate(-50%, -50%) translateY(0);
                }
            }

            .b_algo, .b_sritem, .b_result {
                opacity: 0;
                animation: fadeInUp 0.6s ease forwards;
            }

            .b_algo:nth-child(1) { animation-delay: 0.1s; }
            .b_algo:nth-child(2) { animation-delay: 0.15s; }
            .b_algo:nth-child(3) { animation-delay: 0.2s; }
            .b_algo:nth-child(4) { animation-delay: 0.25s; }
            .b_algo:nth-child(5) { animation-delay: 0.3s; }
            .b_algo:nth-child(6) { animation-delay: 0.35s; }
            .b_algo:nth-child(7) { animation-delay: 0.4s; }
            .b_algo:nth-child(8) { animation-delay: 0.45s; }
            ` : ''}

            /* 响应式设计 */
            @media screen and (max-width: 1024px) {
                #b_results, .b_results {
                    grid-template-columns: 1fr !important;
                    gap: ${CONFIG.columnGap * 0.75}px !important;
                    margin: 15px auto !important;
                    padding: ${CONFIG.padding * 0.75}px !important;
                }
                
                .b_top, .b_mop, .b_weather, .b_knowledge,
                .b_ai, .b_aiChat, .b_aiSummary, .ai-chat,
                .b_chat, .b_copilot, .copilot, .ai-assistant,
                .b_aiAnswers, .ai-answers {
                    grid-column: span 1 !important;
                }

                /* 移动端内容宽度调整 */
                .gs_temp_content, .gs_temp_with_iv, .gs_temp_with_largeqna,
                .acfImgAns, .iaheader, .gs_cit_wrapper, .cit_exp_cont {
                    width: 100% !important;
                    max-width: 100% !important;
                }

                .bing-optimizer-settings {
                    ${CONFIG.scrollTopPosition === 'center' ? 
                        'left: 10px !important; right: 10px !important; transform: none !important;' : 
                        'right: 20px !important;'
                    }
                    min-width: auto !important;
                    width: ${CONFIG.scrollTopPosition === 'center' ? 'calc(100% - 20px)' : '300px'} !important;
                    top: 50% !important;
                    left: 50% !important;
                    transform: translate(-50%, -50%) !important;
                }
            }

            @media screen and (max-width: 768px) {
                #b_content, .b_content {
                    padding: 15px !important;
                }
                
                #b_results, .b_results {
                    gap: ${CONFIG.columnGap * 0.5}px !important;
                    padding: ${CONFIG.padding * 0.5}px !important;
                    border-radius: 12px !important;
                }
                
                .b_algo, .b_sritem, .b_result {
                    padding: 16px !important;
                    border-radius: 12px !important;
                }
                
                .b_algo h2, .b_algo h3, .b_sritem h2, .b_sritem h3 {
                    font-size: 16px !important;
                }
                
                .bing-optimizer-scroll-top {
                    width: 48px !important;
                    height: 48px !important;
                    bottom: 20px !important;
                    ${CONFIG.scrollTopPosition === 'center' ? 'left: 50% !important;' : 'right: 20px !important;'}
                }

                .bing-optimizer-settings-btn {
                    width: 48px !important;
                    height: 48px !important;
                    bottom: 15px !important;
                    right: 15px !important;
                }

                .bing-optimizer-settings {
                    min-width: auto !important;
                    width: calc(100% - 40px) !important;
                    max-width: none !important;
                }
            }

            /* 调试模式 */
            ${CONFIG.debug ? `
            .bing-optimizer-debug {
                position: fixed !important;
                top: 100px !important;
                right: 20px !important;
                background: rgba(0, 0, 0, 0.8) !important;
                color: white !important;
                padding: 10px !important;
                border-radius: 5px !important;
                font-size: 12px !important;
                z-index: 10001 !important;
                max-width: 300px !important;
            }
            ` : ''}

            /* 深色主题 - 必应原生元素样式 */
            [data-theme="dark"] .b_mrs {
                background: var(--secondary-bg) !important;
                border: 1px solid var(--border-color) !important;
                color: var(--text-color) !important;
            }

            [data-theme="dark"] .b_mrs h2 {
                color: var(--text-color) !important;
            }

            [data-theme="dark"] .b_vList li a {
                background: var(--primary-bg) !important;
                color: var(--text-color) !important;
                border: 1px solid var(--border-color) !important;
            }

            [data-theme="dark"] .b_vList li a:hover {
                background: var(--border-color) !important;
                color: var(--text-color) !important;
            }

            [data-theme="dark"] .b_dynamicMrsSuggestionText {
                color: var(--text-color) !important;
            }

            [data-theme="dark"] .b_dynamicMrsSuggestionText strong {
                color: var(--accent-color) !important;
            }
        `;

        document.head.appendChild(style);
        log('优化样式已注入', 'success');
    }

    // 设置主题（与必应原生同步）
    function setTheme(theme) {
        CONFIG.currentTheme = theme;
        document.documentElement.setAttribute('data-theme', theme);
        saveUserSettings();
        
        // 与必应原生深色模式同步
        syncWithBingTheme(theme);
        
        const themeSlider = document.querySelector('.theme-slider');
        const themeSwitch = document.querySelector('.theme-switch');
        if (themeSlider && themeSwitch) {
            if (theme === 'dark') {
                themeSlider.classList.add('active');
                themeSwitch.classList.add('active');
            } else {
                themeSlider.classList.remove('active');
                themeSwitch.classList.remove('active');
            }
        }
        
        log('主题已切换到: ' + theme);
    }

    // 与必应原生深色模式同步
    function syncWithBingTheme(theme) {
        try {
            // 多种方式查找必应主题切换按钮
            const themeSelectors = [
                // 直接通过name和value查找
                theme === 'dark' ? 'input[name="dm_rdio"][value="1"]' : 'input[name="dm_rdio"][value="0"]',
                // 通过value查找
                theme === 'dark' ? 'input[type="radio"][value="1"]' : 'input[type="radio"][value="0"]',
                // 通过标签文本查找
                theme === 'dark' ? 'input[aria-label*="深色"]' : 'input[aria-label*="浅色"]',
                // 通过ID查找
                theme === 'dark' ? 'input#rdiDark' : 'input#rdiLight',
                // 通过href查找
                'a[role="menuitemradio"][href="#"]'
            ];

            let themeButton = null;
            
            // 尝试所有选择器
            for (const selector of themeSelectors) {
                themeButton = document.querySelector(selector);
                if (themeButton) break;
            }

            // 如果找不到特定按钮，尝试通过所有radio按钮
            if (!themeButton) {
                const allRadios = document.querySelectorAll('input[type="radio"][name="dm_rdio"]');
                if (allRadios.length > 0) {
                    // 假设第一个是浅色，第二个是深色
                    const targetIndex = theme === 'dark' ? 1 : 0;
                    themeButton = allRadios[targetIndex] || allRadios[0];
                }
            }

            if (themeButton) {
                // 设置radio按钮状态
                themeButton.checked = true;
                
                // 触发change事件
                const changeEvent = new Event('change', { bubbles: true, cancelable: true });
                themeButton.dispatchEvent(changeEvent);
                
                // 同时触发click事件确保必应能响应
                const clickEvent = new MouseEvent('click', { bubbles: true, cancelable: true });
                themeButton.dispatchEvent(clickEvent);
                
                // 如果有父元素是主题切换菜单，尝试点击它
                const parentMenu = themeButton.closest('a[role="menuitemradio"]');
                if (parentMenu) {
                    parentMenu.click();
                }
                
                // 尝试查找并点击主题菜单项
                const themeMenuItems = document.querySelectorAll('a[role="menuitemradio"]');
                themeMenuItems.forEach(item => {
                    const isDark = item.textContent.includes('深色') || item.textContent.includes('Dark');
                    const isLight = item.textContent.includes('浅色') || item.textContent.includes('Light');
                    
                    if ((theme === 'dark' && isDark) || (theme === 'light' && isLight)) {
                        item.click();
                    }
                });
                
                log(`已同步必应原生${theme === 'dark' ? '深色' : '浅色'}模式`, 'success');
            } else {
                log('未找到必应原生主题切换按钮', 'warn');
                // 作为备用方案，直接设置HTML的data-theme属性
                document.documentElement.setAttribute('data-theme', theme);
            }
        } catch (error) {
            log('同步必应原生主题失败: ' + error.message, 'warn');
            // 备用方案：直接设置HTML的data-theme属性
            document.documentElement.setAttribute('data-theme', theme);
        }
    }

    // 初始化主题
    function initTheme() {
        const savedTheme = GM_getValue('theme', 'light');
        setTheme(savedTheme);
    }

    // 创建回到顶部按钮
    function createScrollToTop() {
        if (document.querySelector('.bing-optimizer-scroll-top')) {
            return;
        }

        const button = document.createElement('div');
        button.className = 'bing-optimizer-scroll-top';
        button.innerHTML = SVG_ICONS.scrollTop;
        button.title = '回到顶部';
        
        button.addEventListener('click', () => {
            window.scrollTo({ top: 0, behavior: 'smooth' });
        });

        document.body.appendChild(button);

        // 监听滚动显示/隐藏按钮
        window.addEventListener('scroll', () => {
            if (window.scrollY > 300) {
                button.classList.add('show');
            } else {
                button.classList.remove('show');
            }
        });

        log('回到顶部按钮已创建');
    }

    // 创建设置按钮
    function createSettingsButton() {
        if (document.querySelector('.bing-optimizer-settings-btn')) {
            return;
        }

        const button = document.createElement('div');
        button.className = 'bing-optimizer-settings-btn';
        button.innerHTML = SVG_ICONS.settings;
        button.title = '必应搜索优化器设置';
        
        button.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            toggleSettingsPanel();
        });

        document.body.appendChild(button);
        
        // 添加拖拽功能
        createDraggableButton();
        log('设置按钮已创建');
    }

    // 切换设置面板显示
    function toggleSettingsPanel() {
        const panel = document.querySelector('.bing-optimizer-settings');
        if (panel) {
            panel.classList.toggle('show');
        }
    }

    // 关闭设置面板
    function closeSettingsPanel() {
        const panel = document.querySelector('.bing-optimizer-settings');
        if (panel) {
            panel.classList.remove('show');
        }
    }

    // 显示提示消息
    function showToast(message, type = 'success') {
        // 移除现有toast
        const existingToast = document.querySelector('.success-toast');
        if (existingToast) {
            existingToast.remove();
        }
        
        const toast = document.createElement('div');
        toast.className = 'success-toast';
        toast.textContent = message;
        
        document.body.appendChild(toast);
        
        // 3秒后自动移除
        setTimeout(() => {
            if (toast.parentNode) {
                toast.remove();
            }
        }, 3000);
    }

    // 创建设置面板
    function createSettingsPanel() {
        if (document.querySelector('.bing-optimizer-settings')) {
            return;
        }

        const panel = document.createElement('div');
        panel.className = 'bing-optimizer-settings';
        panel.innerHTML = `
            <div class="settings-header">
                <span>🎨 必应搜索优化器设置</span>
                <button class="settings-close" type="button">${SVG_ICONS.close}</button>
            </div>
            <div class="settings-body">
                <h4 style="margin: 0 0 16px 0; color: var(--text-color);">自定义背景图</h4>
                <input type="text" class="settings-input" placeholder="输入图片URL..." value="${CONFIG.customBackground || ''}">
                <div class="settings-buttons">
                    <button class="settings-btn" type="button" onclick="applyBackground()">
                        ${SVG_ICONS.apply} 应用
                    </button>
                    <button class="settings-btn secondary" type="button" onclick="clearBackground()">
                        ${SVG_ICONS.clear} 清除
                    </button>
                    <button class="settings-btn success" type="button" onclick="showPresets()">
                        ${SVG_ICONS.presets} 预设
                    </button>
                </div>
                
                <h4 style="margin: 20px 0 16px 0; color: var(--text-color);">主题设置</h4>
                <div class="theme-toggle">
                    <span>浅色</span>
                    <div class="theme-switch" id="theme-switch">
                        <div class="theme-slider" id="theme-slider"></div>
                    </div>
                    <span>深色</span>
                </div>
            </div>
        `;

        // 添加关闭事件监听器
        const closeBtn = panel.querySelector('.settings-close');
        closeBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            closeSettingsPanel();
        });

        // 添加ESC键关闭功能
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                closeSettingsPanel();
            }
        });

        // 点击面板外部关闭
        panel.addEventListener('click', (e) => {
            if (e.target === panel) {
                closeSettingsPanel();
            }
        });

        // 主题切换事件
        const themeSwitch = panel.querySelector('#theme-switch');
        const themeSlider = panel.querySelector('#theme-slider');
        themeSwitch.addEventListener('click', () => {
            if (CONFIG.currentTheme === 'light') {
                setTheme('dark');
            } else {
                setTheme('light');
            }
        });

        document.body.appendChild(panel);
        log('设置面板已创建');
    }

    // 应用背景图
    function applyBackground() {
        const input = document.querySelector('.bing-optimizer-settings .settings-input');
        if (!input) return;
        
        const url = input.value.trim();
        if (url) {
            CONFIG.customBackground = url;
            setCustomBackground();
            saveUserSettings();
            showToast('✓ 已应用', 'success');
            log('背景图已应用: ' + url, 'success');
        } else {
            showToast('请输入有效的图片URL', 'error');
        }
    }

    // 清除背景图
    function clearBackground() {
        CONFIG.customBackground = null;
        const bgStyle = document.getElementById('bing-optimizer-background');
        if (bgStyle) bgStyle.remove();
        const input = document.querySelector('.bing-optimizer-settings .settings-input');
        if (input) input.value = '';
        saveUserSettings();
        showToast('背景图已清除', 'success');
        log('背景图已清除', 'success');
    }

    // 显示预设背景图
    function showPresets() {
        const presets = [
            'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1920',
            'https://images.unsplash.com/photo-1518709268805-4e9042af2176?w=1920',
            'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=1920',
            'https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=1920',
            'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?w=1920',
            'https://images.unsplash.com/photo-1518837695005-2083093ee35b?w=1920'
        ];
        
        const input = document.querySelector('.bing-optimizer-settings .settings-input');
        if (!input) return;
        
        const currentValue = input.value.trim();
        let currentIndex = presets.findIndex(preset => preset === currentValue);
        if (currentIndex === -1) currentIndex = -1;
        
        currentIndex = (currentIndex + 1) % presets.length;
        input.value = presets[currentIndex];
        
        showToast(`已选择预设背景图 ${currentIndex + 1}/${presets.length}`, 'success');
        log(`已选择预设背景图 ${currentIndex + 1}/${presets.length}`, 'success');
    }



    // 重新布局搜索结果
    function relayoutSearchResults() {
        const resultsContainer = document.querySelector('#b_results, .b_results');
        if (!resultsContainer) {
            log('未找到搜索结果容器', 'warn');
            return false;
        }

        // 强制应用网格布局并修复位置问题
        resultsContainer.style.display = 'grid';
        resultsContainer.style.gridTemplateColumns = 'repeat(2, 1fr)';
        resultsContainer.style.gap = `${CONFIG.columnGap}px`;
        resultsContainer.style.width = '100%';
        resultsContainer.style.maxWidth = '1200px';
        resultsContainer.style.margin = '0 auto';
        resultsContainer.style.padding = `${CONFIG.padding}px`;
        resultsContainer.style.position = 'relative';
        resultsContainer.style.left = '0';
        resultsContainer.style.right = '0';

        // 找到所有搜索结果项
        const searchResults = resultsContainer.querySelectorAll('.b_algo, .b_sritem, .b_result');
        
        searchResults.forEach((result, index) => {
            // 确保每个结果项都有基本样式并修复位置
            result.style.margin = '0';
            result.style.padding = '24px';
            result.style.background = 'var(--secondary-bg)';
            result.style.borderRadius = '16px';
            result.style.border = '1px solid var(--border-color)';
            result.style.boxShadow = 'var(--shadow)';
            result.style.position = 'relative';
            result.style.left = '0';
            result.style.right = '0';

            // 大元素占满两列（包括AI相关元素）
            if (result.classList.contains('b_top') || 
                result.classList.contains('b_mop') ||
                result.classList.contains('b_weather') ||
                result.classList.contains('b_knowledge') ||
                result.classList.contains('b_ai') ||
                result.classList.contains('b_aiChat') ||
                result.classList.contains('b_aiSummary') ||
                result.classList.contains('ai-chat') ||
                result.classList.contains('b_chat') ||
                result.classList.contains('b_copilot') ||
                result.classList.contains('copilot') ||
                result.classList.contains('ai-assistant') ||
                result.classList.contains('b_aiAnswers') ||
                result.classList.contains('ai-answers')) {
                result.style.gridColumn = 'span 2';
            }
        });

        log(`重新布局了 ${searchResults.length} 个搜索结果项`, 'success');
        return true;
    }

    // 主优化函数
    async function applyOptimizations() {
        if (!CONFIG.enabled) {
            log('优化已禁用');
            return;
        }

        try {
            log('开始应用必应搜索优化...');
            
            // 检查是否为搜索结果页面
            if (!isSearchPage()) {
                log('非搜索结果页面，跳过优化');
                return;
            }

            // 加载用户设置
            loadUserSettings();

            // 精确隐藏干扰元素（保护重要功能）
            hideInterferingElements();

            // 创建优化样式
            createOptimizedStyles();

            // 初始化主题
            initTheme();

            // 设置自定义背景
            setCustomBackground();

            // 等待搜索结果容器出现
            await waitForElement('#b_results, .b_results');

            // 重新布局搜索结果
            const success = relayoutSearchResults();

            if (success) {
                // 创建UI元素
                createScrollToTop();
                createSettingsButton();
                createSettingsPanel();

                log('必应搜索优化应用完成！', 'success');
            } else {
                log('布局重排失败', 'error');
            }

        } catch (error) {
            log(`优化过程中发生错误: ${error.message}`, 'error');
            console.error('必应搜索优化器错误:', error);
        }
    }

    // 监听页面变化
    function setupMutationObserver() {
        const observer = new MutationObserver((mutations) => {
            let shouldReoptimize = false;

            mutations.forEach((mutation) => {
                if (mutation.addedNodes.length > 0) {
                    for (let node of mutation.addedNodes) {
                        if (node.nodeType === Node.ELEMENT_NODE) {
                            // 检查是否添加了新的搜索结果
                            if (node.querySelector && 
                                (node.querySelector('.b_algo') || 
                                 node.querySelector('.b_sritem') || 
                                 node.querySelector('.b_result') ||
                                 node.querySelector('.b_ai') ||
                                 node.querySelector('.b_copilot'))) {
                                shouldReoptimize = true;
                                break;
                            }
                        }
                    }
                }
            });

            if (shouldReoptimize) {
                log('检测到页面内容变化，重新优化...');
                setTimeout(() => {
                    applyOptimizations();
                }, 500);
            }
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true
        });

        log('MutationObserver 已设置');
    }

    // 监听页面加载
    function setupPageListeners() {
        // 页面首次加载
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', applyOptimizations);
        } else {
            // 页面已加载完成
            applyOptimizations();
        }

        // 监听页面导航
        let lastUrl = location.href;
        new MutationObserver(() => {
            const url = location.href;
            if (url !== lastUrl) {
                lastUrl = url;
                log('检测到页面导航，重新初始化...');
                setTimeout(applyOptimizations, 1000);
            }
        }).observe(document, { subtree: true, childList: true });

        // 监听滚动事件用于回到顶部按钮
        window.addEventListener('scroll', () => {
            const button = document.querySelector('.bing-optimizer-scroll-top');
            if (button) {
                if (window.scrollY > 300) {
                    button.classList.add('show');
                } else {
                    button.classList.remove('show');
                }
            }
        });
    }

    // 初始化脚本
    function initialize() {
        log('必应搜索优化器 v7.0.5 启动...', 'success');
        
        setupPageListeners();
        setupMutationObserver();
        
        // 如果是搜索结果页面，立即应用优化
        if (isSearchPage()) {
            setTimeout(applyOptimizations, 500);
        }
    }

    // 启动脚本
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initialize);
    } else {
        initialize();
    }

})();