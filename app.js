/**
 * 公众号排版器 - 主应用逻辑
 * 深色编辑器工作台风格
 */

// ========================================
// 全局状态管理
// ========================================
const AppState = {
    currentTheme: 'default',
    editorContent: '',
    history: [],
    maxHistory: 20,
    db: null,
    isThemeMenuOpen: false
};

// 主题名称映射
const THEME_NAMES = {
    default: '默认风格',
    latepost: '晚点风格',
    tech: '技术风格',
    elegant: '优雅简约',
    deep: '深度阅读',
    ft: '金融时报',
    nyt: '纽约时报',
    guardian: '卫报',
    nikkei: '日经',
    lemonde: '世界报',
    claude: 'Claude',
    medium: 'Medium',
    apple: 'Apple',
    jonyive: 'Jony Ive',
    kenya: '原研哉',
    hische: '编辑部',
    ando: '安藤',
    gaudi: '高迪',
    burnt: '焦橙'
};

// 默认示例内容
const DEFAULT_CONTENT = `# 欢迎使用公众号排版器

这是一款专为**微信公众号**设计的 Markdown 编辑器，采用深色沉浸式工作台设计。

## 核心功能

### 1. 智能图片处理

- **粘贴即用**：支持从任何地方复制粘贴图片
- **自动压缩**：图片自动压缩，平均压缩 50%-80%
- **本地存储**：使用 IndexedDB 持久化，刷新不丢失

### 2. 18 种精美样式

1. **经典公众号**：默认、晚点、技术、优雅、深度
2. **传统媒体**：FT、NYT、卫报、日经、世界报
3. **现代数字**：Claude、Medium、Apple、Jony Ive
4. **设计师风格**：原研哉、编辑部、安藤、高迪、焦橙

### 3. 一键复制到公众号

点击「复制到公众号」按钮，直接粘贴到公众号后台，格式完美保留！

## 代码示例

\`\`\`javascript
// 图片自动压缩并存储
const compressed = await ImageCompressor.compress(file);
await ImageStore.saveImage(imgId, compressed);
\`\`\`

## 引用样式

> 这是一段引用文字，展示编辑器的引用样式效果。
> 
> 不同的样式主题会有不同的引用样式，试试切换样式看看效果！

## 表格支持

| 功能 | 支持情况 | 说明 |
|------|----------|------|
| 图片粘贴 | ✅ | 100% 成功率 |
| 刷新保留 | ✅ | IndexedDB 存储 |
| 样式主题 | ✅ | 18 种精选样式 |
| 代码高亮 | ✅ | 多语言支持 |

---

**如果觉得有用，欢迎分享给朋友！**
`;

// ========================================
// IndexedDB 图片存储
// ========================================
const ImageStore = {
    DB_NAME: 'WechatEditorDB',
    DB_VERSION: 1,
    STORE_NAME: 'images',

    async init() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.DB_NAME, this.DB_VERSION);
            
            request.onerror = () => reject(request.error);
            request.onsuccess = () => {
                AppState.db = request.result;
                resolve(request.result);
            };
            
            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                if (!db.objectStoreNames.contains(this.STORE_NAME)) {
                    db.createObjectStore(this.STORE_NAME, { keyPath: 'id' });
                }
            };
        });
    },

    async saveImage(id, blob) {
        return new Promise((resolve, reject) => {
            const transaction = AppState.db.transaction([this.STORE_NAME], 'readwrite');
            const store = transaction.objectStore(this.STORE_NAME);
            const request = store.put({ id, blob, timestamp: Date.now() });
            
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    },

    async getImage(id) {
        return new Promise((resolve, reject) => {
            const transaction = AppState.db.transaction([this.STORE_NAME], 'readonly');
            const store = transaction.objectStore(this.STORE_NAME);
            const request = store.get(id);
            
            request.onsuccess = () => resolve(request.result?.blob);
            request.onerror = () => reject(request.error);
        });
    },

    async clearOldImages(maxAge = 7 * 24 * 60 * 60 * 1000) {
        return new Promise((resolve, reject) => {
            const transaction = AppState.db.transaction([this.STORE_NAME], 'readwrite');
            const store = transaction.objectStore(this.STORE_NAME);
            const request = store.openCursor();
            const now = Date.now();
            
            request.onsuccess = (event) => {
                const cursor = event.target.result;
                if (cursor) {
                    if (now - cursor.value.timestamp > maxAge) {
                        store.delete(cursor.key);
                    }
                    cursor.continue();
                } else {
                    resolve();
                }
            };
            request.onerror = () => reject(request.error);
        });
    }
};

// ========================================
// 图片压缩工具
// ========================================
const ImageCompressor = {
    async compress(file, options = {}) {
        const {
            maxWidth = 1200,
            maxHeight = 1200,
            quality = 0.8,
            type = 'image/jpeg'
        } = options;

        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                const img = new Image();
                img.onload = () => {
                    let { width, height } = img;
                    
                    if (width > maxWidth || height > maxHeight) {
                        const ratio = Math.min(maxWidth / width, maxHeight / height);
                        width *= ratio;
                        height *= ratio;
                    }
                    
                    const canvas = document.createElement('canvas');
                    canvas.width = width;
                    canvas.height = height;
                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(img, 0, 0, width, height);
                    
                    canvas.toBlob((blob) => {
                        resolve(blob);
                    }, type, quality);
                };
                img.onerror = reject;
                img.src = e.target.result;
            };
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    },

    generateId() {
        return 'img_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }
};

// ========================================
// Markdown 处理器
// ========================================
const MarkdownProcessor = {
    init() {
        marked.setOptions({
            breaks: true,
            gfm: true,
            headerIds: false,
            mangle: false
        });

        const renderer = new marked.Renderer();
        renderer.image = (href, title, text) => {
            if (href && href.startsWith('img://')) {
                const imgId = href.replace('img://', '');
                return `<img src="" data-img-id="${imgId}" alt="${text}" title="${title || ''}" class="pending-image">`;
            }
            return `<img src="${href}" alt="${text}" title="${title || ''}">`;
        };

        marked.use({ renderer });
    },

    async render(content) {
        let processedContent = this.processImageGrid(content);
        const html = marked.parse(processedContent);
        return html;
    },

    processImageGrid(content) {
        const imagePattern = /(!\[[^\]]*\]\([^)]+\)\s*){2,}/g;
        return content.replace(imagePattern, (match) => {
            const singleImagePattern = /!\[([^\]]*)\]\(([^)]+)\)/g;
            const images = [];
            let m;
            while ((m = singleImagePattern.exec(match)) !== null) {
                images.push({ alt: m[1], src: m[2] });
            }
            
            if (images.length < 2) return match;
            
            const count = images.length;
            const gridClass = count === 2 ? 'image-grid-2' : 'image-grid-3';
            const gridHtml = images.map(img => `![${img.alt}](${img.src})`).join('\n');
            
            return '<div class="image-grid ' + gridClass + '">\n' + gridHtml + '\n</div>';
        });
    }
};

// ========================================
// 历史记录管理
// ========================================
const HistoryManager = {
    STORAGE_KEY: 'wechat_editor_history_v2',

    load() {
        try {
            const data = localStorage.getItem(this.STORAGE_KEY);
            AppState.history = data ? JSON.parse(data) : [];
        } catch (e) {
            AppState.history = [];
        }
        this.render();
    },

    save() {
        try {
            localStorage.setItem(this.STORAGE_KEY, JSON.stringify(AppState.history));
        } catch (e) {
            console.error('Failed to save history:', e);
        }
        this.render();
    },

    add(content) {
        if (!content || content.trim().length < 10) return;
        
        const title = content.split('\n')[0].replace(/^#+\s*/, '').substring(0, 30) || '无标题';
        
        const existingIndex = AppState.history.findIndex(h => h.content === content);
        if (existingIndex !== -1) {
            AppState.history.splice(existingIndex, 1);
        }
        
        AppState.history.unshift({
            id: Date.now(),
            title,
            content,
            timestamp: Date.now()
        });
        
        if (AppState.history.length > AppState.maxHistory) {
            AppState.history = AppState.history.slice(0, AppState.maxHistory);
        }
        
        this.save();
    },

    render() {
        const listEl = document.getElementById('historyList');
        const countEl = document.getElementById('historyCount');
        
        if (countEl) countEl.textContent = AppState.history.length;
        
        if (!listEl) return;
        
        if (AppState.history.length === 0) {
            listEl.innerHTML = `
                <div class="empty-state">
                    <div class="empty-icon">
                        <svg width="48" height="48" viewBox="0 0 48 48">
                            <circle cx="24" cy="24" r="20" stroke="currentColor" stroke-width="1.5" fill="none" stroke-dasharray="4 4"/>
                            <path d="M24 16V24L30 28" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
                        </svg>
                    </div>
                    <p class="empty-title">暂无历史记录</p>
                    <p class="empty-desc">编辑内容后将自动保存</p>
                </div>
            `;
            return;
        }
        
        listEl.innerHTML = AppState.history.map(item => {
            const date = new Date(item.timestamp);
            const timeStr = `${date.getMonth() + 1}/${date.getDate()} ${date.getHours()}:${String(date.getMinutes()).padStart(2, '0')}`;
            
            return `
                <div class="history-item" data-id="${item.id}">
                    <div class="history-item-title">${this.escapeHtml(item.title)}</div>
                    <div class="history-item-meta">${timeStr} · ${item.content.length} 字符</div>
                </div>
            `;
        }).join('');
        
        listEl.querySelectorAll('.history-item').forEach(item => {
            item.addEventListener('click', () => {
                const id = parseInt(item.dataset.id);
                const historyItem = AppState.history.find(h => h.id === id);
                if (historyItem) {
                    Editor.setContent(historyItem.content);
                    showToast('已恢复历史版本');
                    DrawerManager.close();
                }
            });
        });
    },

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
};

// ========================================
// 编辑器模块
// ========================================
const Editor = {
    el: null,
    previewEl: null,
    lineNumbersEl: null,
    saveTimeout: null,

    init() {
        this.el = document.getElementById('editor');
        this.previewEl = document.getElementById('preview');
        this.lineNumbersEl = document.getElementById('lineNumbers');
        
        const saved = localStorage.getItem('wechat_editor_content_v2');
        this.setContent(saved || DEFAULT_CONTENT);
        
        this.el.addEventListener('input', () => this.onInput());
        this.el.addEventListener('paste', (e) => this.onPaste(e));
        this.el.addEventListener('keydown', (e) => this.onKeyDown(e));
        this.el.addEventListener('scroll', () => this.syncScroll());
        
        this.updatePreview();
        this.updateLineNumbers();
    },

    onInput() {
        AppState.editorContent = this.el.value;
        this.updateCharCount();
        this.updatePreview();
        this.updateLineNumbers();
        
        clearTimeout(this.saveTimeout);
        this.saveTimeout = setTimeout(() => {
            this.autoSave();
        }, 2000);
    },

    onPaste(e) {
        const items = e.clipboardData.items;
        
        for (let item of items) {
            if (item.type.indexOf('image') !== -1) {
                e.preventDefault();
                const file = item.getAsFile();
                this.handleImagePaste(file);
                return;
            }
        }
        
        const html = e.clipboardData.getData('text/html');
        if (html) {
            e.preventDefault();
            const text = this.htmlToMarkdown(html);
            this.insertText(text);
        }
    },

    async handleImagePaste(file) {
        try {
            showToast('正在处理图片...', 'loading');
            
            const compressed = await ImageCompressor.compress(file);
            const imgId = ImageCompressor.generateId();
            await ImageStore.saveImage(imgId, compressed);
            
            const markdown = `![图片](img://${imgId})`;
            this.insertText(markdown);
            
            showToast('图片已插入');
        } catch (err) {
            console.error('Image paste failed:', err);
            showToast('图片处理失败', 'error');
        }
    },

    onKeyDown(e) {
        if (e.key === 'Tab') {
            e.preventDefault();
            this.insertText('  ');
        }
        
        if ((e.ctrlKey || e.metaKey) && e.key === 's') {
            e.preventDefault();
            this.autoSave();
            showToast('已保存');
        }
    },

    insertText(text) {
        const start = this.el.selectionStart;
        const end = this.el.selectionEnd;
        const value = this.el.value;
        
        this.el.value = value.substring(0, start) + text + value.substring(end);
        this.el.selectionStart = this.el.selectionEnd = start + text.length;
        this.el.focus();
        
        this.onInput();
    },

    htmlToMarkdown(html) {
        const temp = document.createElement('div');
        temp.innerHTML = html;
        
        let md = '';
        
        const processNode = (node, depth = 0) => {
            if (node.nodeType === Node.TEXT_NODE) {
                return node.textContent;
            }
            
            if (node.nodeType !== Node.ELEMENT_NODE) {
                return '';
            }
            
            const tag = node.tagName.toLowerCase();
            let content = '';
            
            for (const child of node.childNodes) {
                content += processNode(child, depth + 1);
            }
            
            switch (tag) {
                case 'h1': return `# ${content}\n\n`;
                case 'h2': return `## ${content}\n\n`;
                case 'h3': return `### ${content}\n\n`;
                case 'h4': return `#### ${content}\n\n`;
                case 'h5': return `##### ${content}\n\n`;
                case 'h6': return `###### ${content}\n\n`;
                case 'strong':
                case 'b': return `**${content}**`;
                case 'em':
                case 'i': return `*${content}*`;
                case 'a': return `[${content}](${node.getAttribute('href') || ''})`;
                case 'img': return `![${node.getAttribute('alt') || ''}](${node.getAttribute('src') || ''})`;
                case 'p': return `${content}\n\n`;
                case 'br': return '\n';
                case 'hr': return '---\n\n';
                case 'ul': return `${content}\n`;
                case 'ol': return `${content}\n`;
                case 'li': return `- ${content}\n`;
                case 'blockquote': return `> ${content.trim().replace(/\n/g, '\n> ')}\n\n`;
                case 'pre': return content;
                case 'code': 
                    if (node.parentElement?.tagName.toLowerCase() === 'pre') {
                        const lang = node.className?.replace('language-', '') || '';
                        return `\`\`\`${lang}\n${content}\n\`\`\`\n\n`;
                    }
                    return `\`${content}\``;
                case 'div': return content;
                case 'span': return content;
                case 'table': return content;
                case 'thead': return content;
                case 'tbody': return content;
                case 'tr': return content + '\n';
                case 'th': return `| ${content} `;
                case 'td': return `| ${content} `;
                default: return content;
            }
        };
        
        for (const child of temp.childNodes) {
            md += processNode(child);
        }
        
        return md.trim();
    },

    async updatePreview() {
        const html = await MarkdownProcessor.render(this.el.value);
        this.previewEl.innerHTML = html;
        
        this.loadPendingImages();
        
        this.previewEl.querySelectorAll('pre code').forEach((block) => {
            hljs.highlightElement(block);
        });
    },

    async loadPendingImages() {
        const pendingImages = this.previewEl.querySelectorAll('img.pending-image');
        
        for (const img of pendingImages) {
            const imgId = img.dataset.imgId;
            try {
                const blob = await ImageStore.getImage(imgId);
                if (blob) {
                    const url = URL.createObjectURL(blob);
                    img.src = url;
                    img.classList.remove('pending-image');
                }
            } catch (err) {
                console.error('Failed to load image:', err);
            }
        }
    },

    updateLineNumbers() {
        if (!this.lineNumbersEl) return;
        const lines = this.el.value.split('\n').length;
        this.lineNumbersEl.innerHTML = Array.from({ length: lines }, (_, i) => i + 1).join('<br>');
    },

    syncScroll() {
        if (this.lineNumbersEl) {
            this.lineNumbersEl.scrollTop = this.el.scrollTop;
        }
    },

    updateCharCount() {
        const countEl = document.getElementById('charCount');
        if (countEl) countEl.textContent = this.el.value.length.toLocaleString();
    },

    autoSave() {
        localStorage.setItem('wechat_editor_content_v2', this.el.value);
        HistoryManager.add(this.el.value);
        
        const statusEl = document.getElementById('saveStatus');
        if (statusEl) {
            statusEl.textContent = '已保存';
            setTimeout(() => {
                statusEl.textContent = '就绪';
            }, 2000);
        }
    },

    setContent(content) {
        this.el.value = content;
        AppState.editorContent = content;
        this.updateCharCount();
        this.updateLineNumbers();
        this.updatePreview();
    },

    clear() {
        if (confirm('确定要清空编辑器吗？')) {
            this.setContent('');
            localStorage.removeItem('wechat_editor_content_v2');
        }
    },

    getContent() {
        return this.el.value;
    }
};

// ========================================
// 主题管理器
// ========================================
const ThemeManager = {
    init() {
        const trigger = document.getElementById('themeTrigger');
        const menu = document.getElementById('themeMenu');
        
        if (!trigger || !menu) return;
        
        trigger.addEventListener('click', (e) => {
            e.stopPropagation();
            AppState.isThemeMenuOpen = !AppState.isThemeMenuOpen;
            menu.classList.toggle('show', AppState.isThemeMenuOpen);
            trigger.classList.toggle('active', AppState.isThemeMenuOpen);
        });
        
        menu.querySelectorAll('.theme-chip').forEach(chip => {
            chip.addEventListener('click', () => {
                const theme = chip.dataset.theme;
                const name = chip.dataset.name;
                this.setTheme(theme);
                
                menu.querySelectorAll('.theme-chip').forEach(c => c.classList.remove('active'));
                chip.classList.add('active');
                
                menu.classList.remove('show');
                trigger.classList.remove('active');
                AppState.isThemeMenuOpen = false;
                
                document.getElementById('currentThemeName').textContent = name;
            });
        });
        
        document.addEventListener('click', (e) => {
            if (!menu.contains(e.target) && !trigger.contains(e.target)) {
                menu.classList.remove('show');
                trigger.classList.remove('active');
                AppState.isThemeMenuOpen = false;
            }
        });
    },

    setTheme(theme) {
        AppState.currentTheme = theme;
        const previewEl = document.getElementById('preview');
        
        previewEl.className = previewEl.className.replace(/theme-\w+/g, '');
        previewEl.classList.add(`theme-${theme}`);
        
        localStorage.setItem('wechat_editor_theme_v2', theme);
    },

    loadSavedTheme() {
        const saved = localStorage.getItem('wechat_editor_theme_v2') || 'default';
        this.setTheme(saved);
        
        const chip = document.querySelector(`.theme-chip[data-theme="${saved}"]`);
        if (chip) {
            document.querySelectorAll('.theme-chip').forEach(c => c.classList.remove('active'));
            chip.classList.add('active');
            document.getElementById('currentThemeName').textContent = chip.dataset.name;
        }
    }
};

// ========================================
// 复制功能
// ========================================
const CopyManager = {
    // 需要内联的关键 CSS 属性列表（微信公众号支持的属性）
    // 注意：letter-spacing 被排除，因为微信解析会导致字间距异常
    INLINE_PROPS: [
        'font-family', 'font-size', 'font-weight', 'font-style',
        'line-height', 'text-align', 'text-decoration',
        'color', 'background-color', 'background', 'background-image',
        'margin', 'margin-top', 'margin-right', 'margin-bottom', 'margin-left',
        'padding', 'padding-top', 'padding-right', 'padding-bottom', 'padding-left',
        'border', 'border-top', 'border-right', 'border-bottom', 'border-left',
        'border-left-width', 'border-left-style', 'border-left-color',
        'border-radius', 'border-collapse',
        'width', 'max-width',
        'display', 'vertical-align',
        'word-break', 'white-space', 'overflow-wrap',
    ],

    /**
     * 将 DOM 节点的计算样式内联到 style 属性
     * 只内联与默认样式有差异的关键属性，避免臃肿
     * 特别处理背景色，确保深色主题正确显示
     */
    inlineStyles(rootEl, themeBgColor) {
        // 克隆节点，不污染预览区
        const clone = rootEl.cloneNode(true);

        // 创建一个临时"基准"元素，用于对比默认样式
        const baseline = {};
        const tempDiv = document.createElement('div');
        document.body.appendChild(tempDiv);
        const baseStyle = window.getComputedStyle(tempDiv);
        this.INLINE_PROPS.forEach(prop => {
            baseline[prop] = baseStyle.getPropertyValue(prop);
        });
        document.body.removeChild(tempDiv);

        // 遍历克隆节点中的所有元素
        const elements = clone.querySelectorAll('*');
        // 同时也处理根元素对应的真实 DOM（拿计算样式），克隆节点拿结构
        const realElements = rootEl.querySelectorAll('*');

        // 处理根元素本身
        this._inlineElement(rootEl, clone, baseline, themeBgColor);

        realElements.forEach((realEl, i) => {
            const cloneEl = elements[i];
            if (cloneEl) {
                this._inlineElement(realEl, cloneEl, baseline, themeBgColor);
            }
        });

        // 为克隆的根元素显式设置背景色（如果提供了主题背景色）
        if (themeBgColor) {
            const existingStyle = clone.getAttribute('style') || '';
            if (!existingStyle.includes('background-color')) {
                clone.setAttribute('style', existingStyle + `;background-color:${themeBgColor}`);
            }
        }

        return clone;
    },

    _inlineElement(realEl, cloneEl, baseline, themeBgColor) {
        const computed = window.getComputedStyle(realEl);
        const inlineStyles = [];

        this.INLINE_PROPS.forEach(prop => {
            const val = computed.getPropertyValue(prop);
            // 只写入非默认值，且过滤掉 inherit/initial/unset 等无意义值
            if (val && val !== baseline[prop] && val !== 'initial' && val !== 'unset') {
                inlineStyles.push(`${prop}:${val}`);
            }
        });

        // 特殊处理：确保关键排版属性始终写入
        const tagName = realEl.tagName ? realEl.tagName.toLowerCase() : '';
        const forceProps = ['font-size', 'color', 'line-height', 'font-weight'];
        if (['p', 'h1', 'h2', 'h3', 'h4', 'li', 'td', 'th', 'blockquote', 'span', 'strong', 'em'].includes(tagName)) {
            forceProps.forEach(prop => {
                const val = computed.getPropertyValue(prop);
                if (val && !inlineStyles.some(s => s.startsWith(prop + ':'))) {
                    inlineStyles.push(`${prop}:${val}`);
                }
            });
        }

        // 标题特殊处理：强制不换行，避免被微信拆分成多行
        if (['h1', 'h2', 'h3'].includes(tagName)) {
            inlineStyles.push('white-space:nowrap');
            inlineStyles.push('overflow-wrap:normal');
        }

        // 背景色特殊处理：确保深色主题的背景色正确传递
        const bgColor = computed.getPropertyValue('background-color');
        const isRootElement = realEl.id === 'preview';
        
        if (isRootElement && themeBgColor) {
            // 根元素使用主题背景色
            inlineStyles.push(`background-color:${themeBgColor}`);
        } else if (bgColor === 'transparent' || bgColor === 'rgba(0, 0, 0, 0)') {
            // 如果元素背景是透明的，显式设置为透明，避免微信添加默认白色背景
            if (!inlineStyles.some(s => s.startsWith('background-color:'))) {
                inlineStyles.push('background-color:transparent');
            }
        }

        if (inlineStyles.length > 0) {
            // 合并已有 style（不覆盖图片等行内样式）
            const existing = cloneEl.getAttribute('style') || '';
            cloneEl.setAttribute('style', (existing ? existing + ';' : '') + inlineStyles.join(';'));
        }

        // 移除 class 属性（微信不需要，保持干净）
        cloneEl.removeAttribute('class');
    },

    /**
     * 获取当前主题的背景色
     * 从 CSS 变量或主题类中读取
     */
    getThemeBackgroundColor() {
        const previewEl = document.getElementById('preview');
        const themeClass = Array.from(previewEl.classList).find(c => c.startsWith('theme-'));
        
        // 主题背景色映射表
        const themeBackgrounds = {
            'theme-default': '#ffffff',
            'theme-latepost': '#faf9f7',
            'theme-tech': '#0F172A',
            'theme-elegant': '#ffffff',
            'theme-deep': '#1a1a1a',
            'theme-ft': '#fffbf5',
            'theme-nyt': '#ffffff',
            'theme-guardian': '#f6f6f6',
            'theme-nikkei': '#ffffff',
            'theme-lemonde': '#fafafa',
            'theme-claude': '#faf8f5',
            'theme-medium': '#ffffff',
            'theme-apple': '#f5f5f7',
            'theme-jonyive': '#fafafa',
            'theme-kenya': '#fefefe',
            'theme-hische': '#fffbf0',
            'theme-ando': '#f5f5f3',
            'theme-gaudi': '#faf8f5',
            'theme-burnt': '#FDF8F3',
        };
        
        if (themeClass && themeBackgrounds[themeClass]) {
            return themeBackgrounds[themeClass];
        }
        
        // 回退：尝试从计算样式读取
        const cs = window.getComputedStyle(previewEl);
        let bgColor = cs.getPropertyValue('background-color');
        
        if (!bgColor || bgColor === 'transparent' || bgColor === 'rgba(0, 0, 0, 0)') {
            // 尝试从 background 简写中提取
            const bgValue = cs.getPropertyValue('background');
            const bgMatch = bgValue.match(/(rgb|rgba|#)[^\s,)]+/);
            if (bgMatch) {
                bgColor = bgMatch[0];
            }
        }
        
        return bgColor && bgColor !== 'transparent' && bgColor !== 'rgba(0, 0, 0, 0)' 
            ? bgColor 
            : '#ffffff';
    },

    /**
     * 生成适合微信公众号的 HTML
     * - 包装容器带基础字体/颜色
     * - 所有子元素样式内联
     * - 背景色处理：使用 table 布局确保微信兼容性
     */
    buildWechatHtml() {
        const previewEl = document.getElementById('preview');

        // 获取主题背景色（优先从映射表读取，确保深色主题正确）
        const bgColor = this.getThemeBackgroundColor();
        
        // 内联样式，传入主题背景色
        const inlined = this.inlineStyles(previewEl, bgColor);

        // 获取容器自身的计算样式作为包装器基础样式
        const cs = window.getComputedStyle(previewEl);
        
        // 方案1：使用 table 布局（微信兼容性最好）
        // table 的背景色在微信编辑器中通常能正确显示
        const tableStyle = [
            'width:100%',
            'max-width:677px',
            `background-color:${bgColor}`,
            'border-collapse:collapse',
            'margin:0 auto',
        ].join(';');
        
        const cellStyle = [
            `font-family:${cs.getPropertyValue('font-family')}`,
            `font-size:${cs.getPropertyValue('font-size')}`,
            `color:${cs.getPropertyValue('color')}`,
            `line-height:${cs.getPropertyValue('line-height')}`,
            'padding:24px',
            'word-break:break-word',
        ].join(';');

        // 方案：将十六进制颜色转换为 RGB 格式（微信兼容性更好）
        const hexToRgb = (hex) => {
            const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
            return result ? `rgb(${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)})` : hex;
        };
        
        const rgbBgColor = hexToRgb(bgColor);
        
        const wrapperStyle = `display:block;width:100%;max-width:677px;margin:0 auto;padding:24px;font-family:${cs.getPropertyValue('font-family')};font-size:${cs.getPropertyValue('font-size')};color:${cs.getPropertyValue('color')};line-height:${cs.getPropertyValue('line-height')};word-break:break-word;background-color:${rgbBgColor};`;
        
        // 获取内联后的内容
        let contentHtml = inlined.innerHTML;
        
        // 为所有元素添加背景色
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = contentHtml;
        
        const addBgToAll = (element) => {
            if (element.nodeType === Node.ELEMENT_NODE) {
                const currentStyle = element.getAttribute('style') || '';
                const cleanStyle = currentStyle.replace(/background-color:[^;]+;?/gi, '');
                element.setAttribute('style', `background-color:${rgbBgColor};${cleanStyle}`);
                Array.from(element.children).forEach(addBgToAll);
            }
        };
        
        Array.from(tempDiv.children).forEach(addBgToAll);
        contentHtml = tempDiv.innerHTML;
        
        return `<div style="${wrapperStyle}">${contentHtml}</div>`;
    },

    async copyToWechat() {
        showToast('正在处理样式...', 'loading');

        // 给浏览器一帧时间显示 toast
        await new Promise(r => setTimeout(r, 50));

        try {
            const html = this.buildWechatHtml();

            await navigator.clipboard.write([
                new ClipboardItem({
                    'text/html': new Blob([html], { type: 'text/html' }),
                    'text/plain': new Blob([document.getElementById('preview').innerText], { type: 'text/plain' })
                })
            ]);
            showToast('✅ 已复制！直接粘贴到公众号后台即可');
        } catch (err) {
            console.error('clipboard.write 失败，尝试备用方法', err);
            this.fallbackCopyHtml(this.buildWechatHtml());
        }
    },

    async copyMarkdown() {
        const content = Editor.getContent();
        try {
            await navigator.clipboard.writeText(content);
            showToast('Markdown 已复制');
        } catch (err) {
            showToast('复制失败', 'error');
        }
    },

    fallbackCopyHtml(html) {
        // 用隐藏的 contenteditable div 写入 HTML 到剪贴板
        const div = document.createElement('div');
        div.contentEditable = 'true';
        div.style.cssText = 'position:fixed;top:-9999px;left:-9999px;opacity:0;';
        div.innerHTML = html;
        document.body.appendChild(div);

        const range = document.createRange();
        range.selectNodeContents(div);
        const sel = window.getSelection();
        sel.removeAllRanges();
        sel.addRange(range);

        try {
            const ok = document.execCommand('copy');
            if (ok) {
                showToast('✅ 已复制！直接粘贴到公众号后台即可');
            } else {
                showToast('复制失败，请手动复制', 'error');
            }
        } catch (err) {
            showToast('复制失败，请手动复制', 'error');
        } finally {
            sel.removeAllRanges();
            document.body.removeChild(div);
        }
    },

    fallbackCopy(html) {
        this.fallbackCopyHtml(html);
    }
};

// ========================================
// 文件管理
// ========================================
const FileManager = {
    init() {
        const fileInput = document.getElementById('fileInput');
        const uploadBtn = document.getElementById('uploadBtn');
        
        if (uploadBtn && fileInput) {
            uploadBtn.addEventListener('click', () => fileInput.click());
            
            fileInput.addEventListener('change', (e) => {
                const file = e.target.files[0];
                if (file) this.loadFile(file);
                fileInput.value = '';
            });
        }
        
        const downloadBtn = document.getElementById('downloadBtn');
        if (downloadBtn) {
            downloadBtn.addEventListener('click', () => this.downloadHtml());
        }
    },

    loadFile(file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            Editor.setContent(e.target.result);
            showToast('文件已加载');
        };
        reader.onerror = () => showToast('文件读取失败', 'error');
        reader.readAsText(file);
    },

    downloadHtml() {
        const previewEl = document.getElementById('preview');
        const theme = AppState.currentTheme;
        
        const html = `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>公众号文章</title>
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/highlight.js@11.9.0/styles/github.min.css">
    <style>
        body { max-width: 800px; margin: 0 auto; padding: 40px; font-family: -apple-system, BlinkMacSystemFont, sans-serif; }
    </style>
</head>
<body>
    <div class="theme-${theme}">${previewEl.innerHTML}</div>
</body>
</html>`;
        
        const blob = new Blob([html], { type: 'text/html' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `article_${Date.now()}.html`;
        a.click();
        URL.revokeObjectURL(url);
        
        showToast('HTML 已下载');
    }
};

// ========================================
// 抽屉管理
// ========================================
const DrawerManager = {
    init() {
        const historyBtn = document.getElementById('historyBtn');
        const drawer = document.getElementById('historyDrawer');
        const closeBtn = document.getElementById('closeDrawer');
        const backdrop = document.getElementById('backdrop');
        
        if (historyBtn) {
            historyBtn.addEventListener('click', () => this.open());
        }
        
        if (closeBtn) {
            closeBtn.addEventListener('click', () => this.close());
        }
        
        if (backdrop) {
            backdrop.addEventListener('click', () => this.closeAll());
        }
    },

    open() {
        const drawer = document.getElementById('historyDrawer');
        const backdrop = document.getElementById('backdrop');
        if (drawer) drawer.classList.add('show');
        if (backdrop) backdrop.classList.add('show');
    },

    close() {
        const drawer = document.getElementById('historyDrawer');
        const backdrop = document.getElementById('backdrop');
        if (drawer) drawer.classList.remove('show');
        if (backdrop) backdrop.classList.remove('show');
    },

    closeAll() {
        document.querySelectorAll('.drawer').forEach(d => d.classList.remove('show'));
        const backdrop = document.getElementById('backdrop');
        if (backdrop) backdrop.classList.remove('show');
    }
};

// ========================================
// 自定义主题管理器
// ========================================
const CustomizeManager = {
    STORAGE_KEY: 'wechat_editor_custom_theme_v2',
    
    defaults: {
        h1Color: '#1a1a1a',
        h2Color: '#333333',
        textColor: '#333333',
        accentColor: '#07C160',
        bgColor: '#ffffff',
        quoteBgColor: '#F5F6F7',
        bodyFont: 'system',
        bodySize: '16',
        lineHeight: '1.8',
        paragraphSpacing: '1.8',
        contentWidth: 'normal',
        contentAlign: 'justify'
    },

    current: {},

    init() {
        this.current = { ...this.defaults };
        this.loadSaved();

        // 打开面板按钮
        const customizeBtn = document.getElementById('customizeBtn');
        const drawer = document.getElementById('customizeDrawer');
        const closeBtn = document.getElementById('closeCustomize');
        const backdrop = document.getElementById('backdrop');

        if (customizeBtn) {
            customizeBtn.addEventListener('click', () => {
                drawer.classList.add('show');
                backdrop.classList.add('show');
            });
        }

        if (closeBtn) {
            closeBtn.addEventListener('click', () => {
                drawer.classList.remove('show');
                backdrop.classList.remove('show');
            });
        }

        // 颜色拾取器 — 实时预览
        const colorInputs = [
            { id: 'h1Color', valueId: 'h1ColorValue', cssVar: '--custom-h1-color' },
            { id: 'h2Color', valueId: 'h2ColorValue', cssVar: '--custom-h2-color' },
            { id: 'textColor', valueId: 'textColorValue', cssVar: '--custom-text-color' },
            { id: 'accentColor', valueId: 'accentColorValue', cssVar: '--custom-accent-color' },
            { id: 'bgColor', valueId: 'bgColorValue', cssVar: '--custom-bg-color' },
            { id: 'quoteBgColor', valueId: 'quoteBgColorValue', cssVar: '--custom-quote-bg' },
        ];

        colorInputs.forEach(({ id, valueId, cssVar }) => {
            const input = document.getElementById(id);
            const valueEl = document.getElementById(valueId);
            if (!input) return;

            // 初始化当前值
            input.value = this.current[id];
            if (valueEl) valueEl.textContent = this.current[id];
            document.documentElement.style.setProperty(cssVar, this.current[id]);

            input.addEventListener('input', () => {
                this.current[id] = input.value;
                if (valueEl) valueEl.textContent = input.value;
                document.documentElement.style.setProperty(cssVar, input.value);
                this.applyCustomVars();
            });
        });

        // 字体选择
        const bodyFontEl = document.getElementById('bodyFont');
        if (bodyFontEl) {
            bodyFontEl.value = this.current.bodyFont;
            bodyFontEl.addEventListener('change', () => {
                this.current.bodyFont = bodyFontEl.value;
                this.applyCustomVars();
            });
        }

        // 字号选项按钮
        document.querySelectorAll('[data-size]').forEach(btn => {
            if (btn.dataset.size === this.current.bodySize) btn.classList.add('active');
            btn.addEventListener('click', () => {
                document.querySelectorAll('[data-size]').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.current.bodySize = btn.dataset.size;
                this.applyCustomVars();
            });
        });

        // 行高滑块
        const lineHeightEl = document.getElementById('lineHeight');
        const lineHeightValueEl = document.getElementById('lineHeightValue');
        if (lineHeightEl) {
            lineHeightEl.value = this.current.lineHeight;
            if (lineHeightValueEl) lineHeightValueEl.textContent = this.current.lineHeight;
            lineHeightEl.addEventListener('input', () => {
                this.current.lineHeight = lineHeightEl.value;
                if (lineHeightValueEl) lineHeightValueEl.textContent = lineHeightEl.value;
                this.applyCustomVars();
            });
        }

        // 段落间距滑块
        const paraSpacingEl = document.getElementById('paragraphSpacing');
        const paraSpacingValueEl = document.getElementById('paragraphSpacingValue');
        if (paraSpacingEl) {
            paraSpacingEl.value = this.current.paragraphSpacing;
            if (paraSpacingValueEl) paraSpacingValueEl.textContent = this.current.paragraphSpacing;
            paraSpacingEl.addEventListener('input', () => {
                this.current.paragraphSpacing = paraSpacingEl.value;
                if (paraSpacingValueEl) paraSpacingValueEl.textContent = paraSpacingEl.value;
                this.applyCustomVars();
            });
        }

        // 内容宽度
        document.querySelectorAll('[data-width]').forEach(btn => {
            if (btn.dataset.width === this.current.contentWidth) btn.classList.add('active');
            btn.addEventListener('click', () => {
                document.querySelectorAll('[data-width]').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.current.contentWidth = btn.dataset.width;
                this.applyLayout();
            });
        });

        // 内容对齐
        document.querySelectorAll('[data-align]').forEach(btn => {
            if (btn.dataset.align === this.current.contentAlign) btn.classList.add('active');
            btn.addEventListener('click', () => {
                document.querySelectorAll('[data-align]').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.current.contentAlign = btn.dataset.align;
                this.applyCustomVars();
            });
        });

        // 重置 & 应用按钮
        const resetBtn = document.getElementById('resetCustomize');
        const applyBtn = document.getElementById('applyCustomize');

        if (resetBtn) {
            resetBtn.addEventListener('click', () => {
                this.current = { ...this.defaults };
                this.syncUIFromCurrent();
                this.applyCustomVars();
                this.applyLayout();
                showToast('已重置为默认设置');
            });
        }

        if (applyBtn) {
            applyBtn.addEventListener('click', () => {
                // 切换到自定义主题
                ThemeManager.setTheme('custom');
                document.querySelectorAll('.theme-chip').forEach(c => c.classList.remove('active'));
                const customChip = document.querySelector('.theme-chip[data-theme="custom"]');
                if (customChip) customChip.classList.add('active');
                document.getElementById('currentThemeName').textContent = '自定义';
                this.saveSettings();
                showToast('自定义主题已应用');
                document.getElementById('customizeDrawer').classList.remove('show');
                document.getElementById('backdrop').classList.remove('show');
            });
        }

        // 初始应用
        this.applyCustomVars();
        this.applyLayout();
    },

    applyCustomVars() {
        const root = document.documentElement;
        const fontMap = {
            'system': "-apple-system, BlinkMacSystemFont, 'PingFang SC', sans-serif",
            'serif': "Georgia, 'Noto Serif SC', serif",
            'noto': "'Noto Serif SC', serif",
            'crimson': "'Crimson Pro', Georgia, serif"
        };

        root.style.setProperty('--custom-font', fontMap[this.current.bodyFont] || fontMap['system']);
        root.style.setProperty('--custom-body-size', this.current.bodySize + 'px');
        root.style.setProperty('--custom-line-height', this.current.lineHeight);
        root.style.setProperty('--custom-para-spacing', (parseFloat(this.current.paragraphSpacing) * 10) + 'px');
        root.style.setProperty('--custom-align', this.current.contentAlign);
        root.style.setProperty('--custom-h1-color', this.current.h1Color);
        root.style.setProperty('--custom-h2-color', this.current.h2Color);
        root.style.setProperty('--custom-text-color', this.current.textColor);
        root.style.setProperty('--custom-accent-color', this.current.accentColor);
        root.style.setProperty('--custom-bg-color', this.current.bgColor);
        root.style.setProperty('--custom-quote-bg', this.current.quoteBgColor);
    },

    applyLayout() {
        const frame = document.getElementById('previewFrame');
        if (!frame) return;
        frame.classList.remove('narrow', 'wide');
        if (this.current.contentWidth !== 'normal') {
            frame.classList.add(this.current.contentWidth);
        }
    },

    syncUIFromCurrent() {
        // 同步颜色输入
        ['h1Color', 'h2Color', 'textColor', 'accentColor', 'bgColor', 'quoteBgColor'].forEach(id => {
            const input = document.getElementById(id);
            const valueEl = document.getElementById(id + 'Value');
            if (input) input.value = this.current[id];
            if (valueEl) valueEl.textContent = this.current[id];
        });

        // 字体
        const bodyFontEl = document.getElementById('bodyFont');
        if (bodyFontEl) bodyFontEl.value = this.current.bodyFont;

        // 字号
        document.querySelectorAll('[data-size]').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.size === this.current.bodySize);
        });

        // 行高
        const lineHeightEl = document.getElementById('lineHeight');
        const lineHeightValueEl = document.getElementById('lineHeightValue');
        if (lineHeightEl) lineHeightEl.value = this.current.lineHeight;
        if (lineHeightValueEl) lineHeightValueEl.textContent = this.current.lineHeight;

        // 段落间距
        const paraSpacingEl = document.getElementById('paragraphSpacing');
        const paraSpacingValueEl = document.getElementById('paragraphSpacingValue');
        if (paraSpacingEl) paraSpacingEl.value = this.current.paragraphSpacing;
        if (paraSpacingValueEl) paraSpacingValueEl.textContent = this.current.paragraphSpacing;

        // 宽度
        document.querySelectorAll('[data-width]').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.width === this.current.contentWidth);
        });

        // 对齐
        document.querySelectorAll('[data-align]').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.align === this.current.contentAlign);
        });
    },

    saveSettings() {
        try {
            localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.current));
        } catch (e) {
            console.error('Failed to save custom settings:', e);
        }
    },

    loadSaved() {
        try {
            const saved = localStorage.getItem(this.STORAGE_KEY);
            if (saved) {
                this.current = { ...this.defaults, ...JSON.parse(saved) };
            }
        } catch (e) {
            this.current = { ...this.defaults };
        }
    }
};

// ========================================
// Toast 提示
// ========================================
function showToast(message, type = 'success') {
    const toast = document.getElementById('toast');
    const iconEl = document.getElementById('toastIcon');
    const messageEl = document.getElementById('toastMessage');
    
    if (!toast || !messageEl) return;
    
    messageEl.textContent = message;
    
    if (iconEl) {
        iconEl.textContent = type === 'error' ? '✕' : type === 'loading' ? '◌' : '✓';
        iconEl.style.background = type === 'error' ? '#EF4444' : type === 'loading' ? '#F59E0B' : '#22C55E';
    }
    
    toast.classList.add('show');
    
    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}

// ========================================
// 应用初始化
// ========================================
async function initApp() {
    await ImageStore.init();
    await ImageStore.clearOldImages();
    
    MarkdownProcessor.init();
    
    Editor.init();
    ThemeManager.init();
    ThemeManager.loadSavedTheme();
    HistoryManager.load();
    FileManager.init();
    DrawerManager.init();
    
    const clearBtn = document.getElementById('clearBtn');
    const copyWechatBtn = document.getElementById('copyWechatBtn');
    const copyMarkdownBtn = document.getElementById('copyMarkdownBtn');
    
    if (clearBtn) clearBtn.addEventListener('click', () => Editor.clear());
    if (copyWechatBtn) copyWechatBtn.addEventListener('click', () => CopyManager.copyToWechat());
    if (copyMarkdownBtn) copyMarkdownBtn.addEventListener('click', () => CopyManager.copyMarkdown());
    
    // 初始化自定义主题面板
    CustomizeManager.init();
    
    console.log('公众号排版器已加载完成 🚀');
}

// 启动应用
document.addEventListener('DOMContentLoaded', initApp);

// 页面卸载前保存
window.addEventListener('beforeunload', () => {
    Editor.autoSave();
});
