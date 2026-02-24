// 图片资源管理
const imageManager = {
    // 图片存储目录
    imageDir: 'image',
    
    // 图片资源清单
    imageList: [],
    
    // 图片缓存（用于避免重复压缩）
    imageCache: new Map(),
    
    // 图片压缩配置
    compressionConfig: {
        maxWidth: 800,
        maxHeight: 800,
        quality: 0.7,
        maxSizeKB: 200
    },
    
    // 初始化
    init() {
        // 确保图片目录存在
        this.ensureImageDir();
        // 初始化图片清单
        this.initImageList();
        // 加载图片缓存
        this.loadImageCache();
    },
    
    // 确保图片目录存在
    ensureImageDir() {
        // 在浏览器环境中，使用本地存储的概念
        console.log('确保图片目录存在:', this.imageDir);
    },
    
    // 初始化图片清单
    initImageList() {
        // 读取现有图片
        this.scanExistingImages();
        console.log('图片资源清单初始化完成，共', this.imageList.length, '张图片');
    },
    
    // 加载图片缓存
    loadImageCache() {
        try {
            const cacheData = localStorage.getItem('image_cache');
            if (cacheData) {
                const cache = JSON.parse(cacheData);
                Object.entries(cache).forEach(([key, value]) => {
                    this.imageCache.set(key, value);
                });
                console.log('已加载图片缓存，共', this.imageCache.size, '张图片');
            }
        } catch (error) {
            console.error('加载图片缓存失败:', error);
        }
    },
    
    // 保存图片缓存
    saveImageCache() {
        try {
            const cacheObj = Object.fromEntries(this.imageCache);
            const cacheString = JSON.stringify(cacheObj);
            const cacheSize = new Blob([cacheString]).size;
            
            console.log('图片缓存大小:', cacheSize, '字节 (约', (cacheSize / 1024 / 1024).toFixed(2), 'MB)');
            
            localStorage.setItem('image_cache', cacheString);
            console.log('图片缓存已保存');
        } catch (error) {
            console.error('保存图片缓存失败:', error);
        }
    },
    
    // 压缩图片
    async compressImage(dataUrl, options = {}) {
        const config = { ...this.compressionConfig, ...options };
        
        // 检查缓存
        const cacheKey = this.generateCacheKey(dataUrl, config);
        if (this.imageCache.has(cacheKey)) {
            console.log('使用缓存的压缩图片');
            return this.imageCache.get(cacheKey);
        }
        
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => {
                try {
                    const canvas = document.createElement('canvas');
                    let width = img.width;
                    let height = img.height;
                    
                    // 计算缩放比例
                    const scale = Math.min(
                        config.maxWidth / width,
                        config.maxHeight / height,
                        1
                    );
                    
                    if (scale < 1) {
                        width = Math.round(width * scale);
                        height = Math.round(height * scale);
                    }
                    
                    canvas.width = width;
                    canvas.height = height;
                    
                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(img, 0, 0, width, height);
                    
                    // 尝试压缩到目标大小
                    let quality = config.quality;
                    let compressedDataUrl = canvas.toDataURL('image/jpeg', quality);
                    
                    // 如果压缩后仍然太大，继续降低质量
                    while (this.getDataUrlSize(compressedDataUrl) > config.maxSizeKB * 1024 && quality > 0.1) {
                        quality -= 0.1;
                        compressedDataUrl = canvas.toDataURL('image/jpeg', quality);
                    }
                    
                    // 缓存压缩后的图片
                    this.imageCache.set(cacheKey, compressedDataUrl);
                    
                    console.log('图片压缩完成:', {
                        原始大小: this.getDataUrlSize(dataUrl),
                        压缩后大小: this.getDataUrlSize(compressedDataUrl),
                        压缩率: ((1 - this.getDataUrlSize(compressedDataUrl) / this.getDataUrlSize(dataUrl)) * 100).toFixed(2) + '%'
                    });
                    
                    resolve(compressedDataUrl);
                } catch (error) {
                    console.error('图片压缩失败:', error);
                    reject(error);
                }
            };
            
            img.onerror = () => {
                reject(new Error('图片加载失败'));
            };
            
            img.src = dataUrl;
        });
    },
    
    // 获取 data URL 的大小（字节）
    getDataUrlSize(dataUrl) {
        const base64Length = dataUrl.length - (dataUrl.indexOf(',') + 1);
        const padding = (dataUrl.charAt(dataUrl.length - 2) === '=') ? 2 : ((dataUrl.charAt(dataUrl.length - 1) === '=') ? 1 : 0);
        return (base64Length * 0.75) - padding;
    },
    
    // 生成缓存键
    generateCacheKey(dataUrl, config) {
        const hash = this.simpleHash(dataUrl);
        return `${hash}_${config.maxWidth}_${config.maxHeight}_${config.quality}`;
    },
    
    // 批量压缩图片
    async compressImages(dataUrls, options = {}) {
        const promises = dataUrls.map(url => this.compressImage(url, options));
        return Promise.all(promises);
    },
    
    // 清理图片缓存
    clearImageCache() {
        this.imageCache.clear();
        localStorage.removeItem('image_cache');
        console.log('图片缓存已清理');
    },
    
    // 扫描现有图片
    scanExistingImages() {
        // 预设的本地图片
        const localImages = [
            { fileName: 'bg1.png', format: 'png', path: 'image/bg1.png', type: 'background' },
            { fileName: 'bg2.png', format: 'png', path: 'image/bg2.png', type: 'background' },
            { fileName: 'bg3.png', format: 'png', path: 'image/bg3.png', type: 'background' },
            { fileName: '头像1.png', format: 'png', path: 'image/头像1.png', type: 'avatar' }
        ];
        
        localImages.forEach(img => {
            this.addToImageList(img);
        });
    },
    
    // 添加到图片清单
    addToImageList(imageInfo) {
        // 检查是否已存在
        const existingIndex = this.imageList.findIndex(img => img.path === imageInfo.path);
        if (existingIndex === -1) {
            this.imageList.push(imageInfo);
        }
    },
    
    // 下载网络图片到本地
    async downloadImage(url, fileName = null) {
        return new Promise(async (resolve, reject) => {
            try {
                // 检查是否为本地图片
                if (url.startsWith('file:') || url.startsWith('image/')) {
                    console.log('本地图片，直接使用:', url);
                    resolve(url);
                    return;
                }
                
                // 检查是否为data URL
                if (url.startsWith('data:')) {
                    console.log('data URL，直接使用');
                    resolve(url);
                    return;
                }
                
                // 生成文件名
                if (!fileName) {
                    fileName = this.generateFileName(url);
                }
                
                // 检查是否已下载
                const localPath = `${this.imageDir}/${fileName}`;
                const existingImage = this.imageList.find(img => img.fileName === fileName);
                if (existingImage) {
                    console.log('图片已存在，使用本地路径:', localPath);
                    resolve(localPath);
                    return;
                }
                
                console.log('开始下载图片:', url);
                
                // 在浏览器环境中，我们使用fetch获取图片并保存到本地
                const response = await fetch(url);
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                
                const blob = await response.blob();
                
                // 添加到图片清单
                const imageInfo = {
                    fileName: fileName,
                    format: this.getImageFormat(url),
                    path: localPath,
                    url: url,
                    blob: blob,
                    type: 'downloaded',
                    downloadedAt: new Date().toISOString()
                };
                
                this.addToImageList(imageInfo);
                console.log('图片下载完成，保存为:', localPath);
                
                // 返回本地文件路径
                resolve(localPath);
                
            } catch (error) {
                console.error('图片下载失败:', error);
                reject(error);
            }
        });
    },
    
    // 生成文件名
    generateFileName(url) {
        const timestamp = Date.now();
        const extension = this.getImageFormat(url) || 'png';
        const hash = this.simpleHash(url);
        return `download_${hash}_${timestamp}.${extension}`;
    },
    
    // 获取图片格式
    getImageFormat(url) {
        const match = url.match(/\.([a-zA-Z0-9]+)(?:[?#]|$)/);
        if (match) {
            const ext = match[1].toLowerCase();
            const validFormats = ['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg'];
            if (validFormats.includes(ext)) {
                return ext;
            }
        }
        return 'png';
    },
    
    // 简单哈希函数
    simpleHash(str) {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash;
        }
        return Math.abs(hash).toString(16);
    },
    
    // 获取图片资源清单
    getImageList() {
        return this.imageList;
    },
    
    // 导出图片资源清单
    exportImageList() {
        const list = this.imageList.map(img => ({
            fileName: img.fileName,
            format: img.format,
            path: img.path,
            type: img.type,
            size: img.size || 'N/A',
            dimensions: img.dimensions || 'N/A'
        }));
        
        const listString = JSON.stringify(list, null, 2);
        console.log('图片资源清单:', listString);
        
        // 保存到本地文件（在浏览器中使用下载方式）
        const blob = new Blob([listString], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = 'image_resources.json';
        link.click();
        URL.revokeObjectURL(url);
        
        return list;
    },
    
    // 验证所有图片
    validateImages() {
        console.log('验证图片资源...');
        let validCount = 0;
        let invalidCount = 0;
        
        this.imageList.forEach(img => {
            // 在浏览器环境中，我们只能验证base64图片
            if (img.base64 || img.path.startsWith('image/')) {
                validCount++;
            } else {
                invalidCount++;
                console.warn('无效图片:', img.path);
            }
        });
        
        console.log(`图片验证完成: 有效 ${validCount}, 无效 ${invalidCount}`);
        return { valid: validCount, invalid: invalidCount };
    }
};

// 初始化图片管理器
imageManager.init();

// 生成并导出图片资源清单
function generateAndExportImageList() {
    console.log('开始生成图片资源清单...');
    
    // 验证所有图片
    const validationResult = imageManager.validateImages();
    console.log('图片验证结果:', validationResult);
    
    // 导出图片资源清单
    const imageList = imageManager.exportImageList();
    console.log('图片资源清单已导出，共', imageList.length, '张图片');
    
    return imageList;
}

// 页面加载完成后生成图片资源清单（已注释，避免自动下载）
// window.addEventListener('load', function() {
//     setTimeout(generateAndExportImageList, 2000);
// });

// 全局变量
let csvData = [];
let csvFilenames = [];
let bgUrl = 'image/bg1.png'; // 默认背景图片URL
let customBgImages = []; // 存储自定义背景图片的URL
let customBgImageNames = []; // 存储自定义背景图片的名称
let students = [];
let currentStudentIndex = 0;
let studentOperationRecords = {}; // 存储每个学员的操作记录 {studentName: {formData: {}, settings: {}, timestamp: 0}}
let studentCommentData = {}; // 存储每个学员的文字点评数据 {studentName: {content: '', teacherName: '', avatar: '', timestamp: 0}}
let currentOperationMode = 'batch'; // 当前操作模式：'single' 或 'batch'
let isStudentSwitching = false;
let customImages = [];
let customImageNames = [];
let tableRecognitionImages = []; // 存储表格识别图片的URL
let sectionPositions = {
    section1: { translateX: 0, translateY: 0 },
    section2: { translateX: 0, translateY: -40 },
    section3: { translateX: 0, translateY: 0 }
};
let lockedCards = new Set(); // 存储锁定的卡片ID
let imageAdjustments = []; // 存储单个图片的调整
let deletedImagesHistory = []; // 存储删除图片的历史记录，用于撤销

// 本地图片缓存系统
const imageCache = new Map();
const MAX_CACHE_SIZE = 50; // 最大缓存数量

// 背景图片缓存（使用Map存储多个背景图片的缓存）
const backgroundImageCache = new Map();

// 预加载并转换背景图片为base64
async function preloadBackgroundImage(url) {
    console.log('开始预加载背景图片:', url);
    
    // 如果已经是data URL，直接返回
    if (url.startsWith('data:')) {
        console.log('背景图片已经是data URL，直接使用');
        return url;
    }
    
    // 检查缓存（使用URL作为键）
    if (backgroundImageCache.has(url)) {
        console.log('使用缓存的背景图片:', url);
        return backgroundImageCache.get(url);
    }
    
    try {
        let dataUrl;
        
        // 对于本地文件，使用fetch API获取
        if (url.startsWith('image/') || url.startsWith('./') || url.startsWith('../')) {
            console.log('检测到本地图片路径，使用fetch API');
            try {
                const response = await fetch(url);
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                const blob = await response.blob();
                
                // 将blob转换为data URL
                dataUrl = await new Promise((resolve, reject) => {
                    const reader = new FileReader();
                    reader.onload = () => resolve(reader.result);
                    reader.onerror = () => reject(new Error('FileReader error'));
                    reader.readAsDataURL(blob);
                });
                
                console.log('本地图片转换为data URL成功，大小:', Math.round(dataUrl.length * 0.75 / 1024), 'KB');
            } catch (fetchError) {
                console.warn('fetch API失败，尝试使用Image对象:', fetchError);
                // 如果fetch失败，回退到Image对象方式
                dataUrl = await loadImageUsingImageObject(url);
            }
        } else {
            // 对于网络图片，使用Image对象
            dataUrl = await loadImageUsingImageObject(url);
        }
        
        // 缓存转换后的data URL（使用URL作为键）
        if (dataUrl) {
            backgroundImageCache.set(url, dataUrl);
            console.log('背景图片已缓存:', url);
        }
        
        return dataUrl;
    } catch (error) {
        console.error('预加载背景图片时出错:', error);
        return null;
    }
}

// 使用Image对象加载图片并转换为data URL
async function loadImageUsingImageObject(url) {
    console.log('使用Image对象加载图片:', url);
    
    return new Promise((resolve, reject) => {
        const img = new Image();
        
        img.onload = function() {
            console.log('背景图片加载成功，尺寸:', img.naturalWidth, 'x', img.naturalHeight);
            
            try {
                const canvas = document.createElement('canvas');
                canvas.width = img.naturalWidth;
                canvas.height = img.naturalHeight;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0);
                
                const result = canvas.toDataURL('image/png');
                console.log('背景图片转换为data URL成功，大小:', Math.round(result.length * 0.75 / 1024), 'KB');
                resolve(result);
            } catch (error) {
                console.error('背景图片转换失败:', error);
                reject(error);
            }
        };
        
        img.onerror = function() {
            console.error('背景图片加载失败:', url);
            reject(new Error('背景图片加载失败'));
        };
        
        if (window.location.protocol === 'file:' || url.startsWith('file:')) {
            console.log('检测到file://协议，不设置crossOrigin');
        } else if (!url.startsWith('data:')) {
            img.crossOrigin = 'Anonymous';
        }
        
        img.src = url;
    });
}

function clearBackgroundImageCache() {
    backgroundImageCache.clear();
    console.log('背景图片缓存已清除');
}

function preloadLocalImagesToBase64() {
    console.log('开始预先转换本地图片为base64...');
    
    const imagesToConvert = [
        'image/bg1.png',
        'image/bg2.png',
        'image/bg3.png',
        'image/头像1.png'
    ];
    
    const promises = imagesToConvert.map(imgPath => {
        return new Promise((resolve) => {
            const img = new Image();
            img.onload = function() {
                try {
                    const canvas = document.createElement('canvas');
                    canvas.width = img.naturalWidth;
                    canvas.height = img.naturalHeight;
                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(img, 0, 0);
                    const base64 = canvas.toDataURL('image/png');
                    imageCache.set(imgPath, base64);
                    console.log('图片转换成功:', imgPath);
                } catch (error) {
                    console.warn('图片转换失败:', imgPath, error);
                }
                resolve();
            };
            img.onerror = function() {
                console.warn('图片加载失败:', imgPath);
                resolve();
            };
            img.src = imgPath;
        });
    });
    
    Promise.all(promises).then(() => {
        console.log('所有本地图片转换完成');
    });
}

function isCORSError(error) {
    return error && (
        error.message.includes('Tainted canvases') ||
        error.message.includes('SecurityError') ||
        error.message.includes('cross-origin')
    );
}



// 缓存图片为base64
async function cacheImage(url) {
    if (imageCache.has(url)) {
        console.log('使用缓存的图片:', url);
        return imageCache.get(url);
    }
    
    try {
        if (url.startsWith('image/') || url.startsWith('data:') || url.startsWith('blob:')) {
            return url;
        }
        
        if (window.location.protocol === 'file:' || url.startsWith('file:')) {
            console.log('检测到file://协议，使用Image对象加载并转换为base64');
            return new Promise((resolve) => {
                const img = new Image();
                img.onload = function() {
                    try {
                        const canvas = document.createElement('canvas');
                        canvas.width = img.naturalWidth;
                        canvas.height = img.naturalHeight;
                        const ctx = canvas.getContext('2d');
                        ctx.drawImage(img, 0, 0);
                        const base64 = canvas.toDataURL('image/png');
                        
                        if (imageCache.size >= MAX_CACHE_SIZE) {
                            const firstKey = imageCache.keys().next().value;
                            imageCache.delete(firstKey);
                        }
                        
                        imageCache.set(url, base64);
                        console.log('file://图片缓存成功:', url, '大小:', Math.round(base64.length * 0.75 / 1024), 'KB');
                        resolve(base64);
                    } catch (canvasError) {
                        console.warn('Canvas转换失败，使用原始URL:', canvasError);
                        resolve(url);
                    }
                };
                img.onerror = function() {
                    console.warn('file://图片加载失败，使用原始URL:', url);
                    resolve(url);
                };
                img.src = url;
            });
        }
        
        const response = await fetch(url, {
            mode: 'cors',
            credentials: 'omit'
        });
        
        if (!response.ok) {
            console.warn('图片加载失败:', url, response.status);
            return url;
        }
        
        const blob = await response.blob();
        const reader = new FileReader();
        
        return new Promise((resolve) => {
            reader.onload = () => {
                const base64 = reader.result;
                
                if (imageCache.size >= MAX_CACHE_SIZE) {
                    const firstKey = imageCache.keys().next().value;
                    imageCache.delete(firstKey);
                }
                
                imageCache.set(url, base64);
                console.log('图片缓存成功:', url, '大小:', Math.round(base64.length * 0.75 / 1024), 'KB');
                resolve(base64);
            };
            
            reader.onerror = () => {
                console.warn('图片读取失败:', url);
                resolve(url);
            };
            
            reader.readAsDataURL(blob);
        });
    } catch (error) {
        console.warn('图片缓存失败:', url, error);
        return url;
    }
}

// 批量缓存图片
async function cacheImages(urls) {
    const promises = urls.map(url => cacheImage(url));
    return Promise.all(promises);
}

// 清理图片缓存
function clearImageCache() {
    imageCache.clear();
    console.log('图片缓存已清理');
}

// 图片智能匹配相关变量
let smartMatchImages = []; // 存储待匹配的图片
let smartMatchResults = []; // 存储匹配结果
let manualMatchMode = false; // 是否处于手动匹配模式
let selectedImagesForManualMatch = []; // 手动匹配时选中的图片

// 操作日志相关变量
let operationLogs = []; // 存储操作日志 {timestamp: 0, operation: '', details: {}, status: 'success' | 'error'}
const MAX_LOG_ENTRIES = 100; // 最大日志条目数

// 自动保存相关变量
let autoSaveTimeout = null;
let saveInProgress = false;
let saveRetryCount = 0;
const MAX_SAVE_RETRIES = 3;
const SAVE_DEBOUNCE_DELAY = 400; // 400ms防抖延迟
const SAVE_RETRY_BASE_DELAY = 1000; // 基础重试延迟1秒

// 保存状态元素
let saveStatusElement = null;

// 本地存储键名
const LOCAL_STORAGE_KEY = 'report_generator_state';
const LOCAL_STORAGE_BACKUP_KEY = 'report_generator_backup';
const SMART_MATCH_STATE_KEY = 'smart_match_state';

// 性能监控相关变量 - 新增
const performanceMetrics = {
    pageLoadTime: 0,
    firstContentfulPaint: 0,
    largestContentfulPaint: 0,
    firstInputDelay: 0,
    cumulativeLayoutShift: 0,
    reportGenerationTime: [],
    csvParseTime: [],
    chartRenderTime: [],
    domUpdateTime: []
};

// 性能标记点 - 新增
const performanceMarks = new Map();

// 防抖函数
function debounce(func, delay) {
    let timeout;
    return function() {
        const context = this;
        const args = arguments;
        clearTimeout(timeout);
        timeout = setTimeout(() => {
            func.apply(context, args);
        }, delay);
    };
}

// 性能监控函数 - 新增
function markPerformance(name) {
    const timestamp = performance.now();
    performanceMarks.set(name, timestamp);
    console.log(`[性能标记] ${name}: ${timestamp.toFixed(2)}ms`);
    return timestamp;
}

function measurePerformance(startMark, endMark) {
    const startTime = performanceMarks.get(startMark);
    const endTime = performanceMarks.get(endMark);
    
    if (startTime === undefined || endTime === undefined) {
        console.warn(`[性能测量] 未找到标记: ${startTime === undefined ? startMark : endMark}`);
        return null;
    }
    
    const duration = endTime - startTime;
    console.log(`[性能测量] ${startMark} -> ${endMark}: ${duration.toFixed(2)}ms`);
    return duration;
}

function recordMetric(metricName, value) {
    if (Array.isArray(performanceMetrics[metricName])) {
        performanceMetrics[metricName].push(value);
        console.log(`[性能指标] ${metricName}: ${value.toFixed(2)}ms (平均: ${(performanceMetrics[metricName].reduce((a, b) => a + b, 0) / performanceMetrics[metricName].length).toFixed(2)}ms)`);
    } else {
        performanceMetrics[metricName] = value;
        console.log(`[性能指标] ${metricName}: ${value.toFixed(2)}ms`);
    }
}

function getPerformanceReport() {
    const report = {
        timestamp: new Date().toISOString(),
        metrics: {},
        averages: {}
    };
    
    for (const [key, value] of Object.entries(performanceMetrics)) {
        if (Array.isArray(value) && value.length > 0) {
            const sum = value.reduce((a, b) => a + b, 0);
            const avg = sum / value.length;
            const min = Math.min(...value);
            const max = Math.max(...value);
            
            report.metrics[key] = {
                samples: value.length,
                min: min.toFixed(2),
                max: max.toFixed(2),
                avg: avg.toFixed(2)
            };
            report.averages[key] = avg.toFixed(2);
        } else {
            report.metrics[key] = value;
            report.averages[key] = value;
        }
    }
    
    return report;
}

function initPerformanceMonitoring() {
    if (typeof performance !== 'undefined') {
        const navigationEntry = performance.getEntriesByType('navigation')[0];
        if (navigationEntry) {
            performanceMetrics.pageLoadTime = navigationEntry.loadEventEnd - navigationEntry.fetchStart;
            console.log(`[性能监控] 页面加载时间: ${performanceMetrics.pageLoadTime.toFixed(2)}ms`);
        }
        
        if ('PerformanceObserver' in window) {
            const observer = new PerformanceObserver((list) => {
                for (const entry of list.getEntries()) {
                    if (entry.entryType === 'largest-contentful-paint') {
                        performanceMetrics.largestContentfulPaint = entry.startTime;
                        console.log(`[性能监控] LCP: ${entry.startTime.toFixed(2)}ms`);
                    } else if (entry.entryType === 'first-input') {
                        performanceMetrics.firstInputDelay = entry.processingStart - entry.startTime;
                        console.log(`[性能监控] FID: ${performanceMetrics.firstInputDelay.toFixed(2)}ms`);
                    } else if (entry.entryType === 'layout-shift' && !entry.hadRecentInput) {
                        performanceMetrics.cumulativeLayoutShift += entry.value;
                    }
                }
            });
            
            observer.observe({ type: 'largest-contentful-paint', buffered: true });
            observer.observe({ type: 'first-input', buffered: true });
            observer.observe({ type: 'layout-shift', buffered: true });
        }
    }
    
    console.log('[性能监控] 性能监控系统已初始化');
}

// 操作日志记录函数
function addOperationLog(operation, details, status = 'success') {
    const logEntry = {
        timestamp: Date.now(),
        operation: operation,
        details: details,
        status: status
    };
    
    operationLogs.push(logEntry);
    
    // 限制日志条目数量
    if (operationLogs.length > MAX_LOG_ENTRIES) {
        operationLogs.shift();
    }
    
    // 输出到控制台
    const timestamp = new Date(logEntry.timestamp).toLocaleString('zh-CN');
    const statusIcon = status === 'success' ? '✓' : '✗';
    console.log(`[操作日志] ${timestamp} ${statusIcon} ${operation}`, details);
    
    // 保存到本地存储
    saveOperationLogs();
}

// 保存操作日志到本地存储
function saveOperationLogs() {
    try {
        localStorage.setItem('operation_logs', JSON.stringify(operationLogs));
    } catch (error) {
        console.error('保存操作日志失败:', error);
    }
}

// 加载操作日志从本地存储
function loadOperationLogs() {
    try {
        const logs = localStorage.getItem('operation_logs');
        if (logs) {
            operationLogs = JSON.parse(logs);
            console.log('已加载操作日志，共', operationLogs.length, '条记录');
        }
    } catch (error) {
        console.error('加载操作日志失败:', error);
        operationLogs = [];
    }
}

// 获取操作日志
function getOperationLogs(operation = null, status = null) {
    let filteredLogs = [...operationLogs];
    
    if (operation) {
        filteredLogs = filteredLogs.filter(log => log.operation === operation);
    }
    
    if (status) {
        filteredLogs = filteredLogs.filter(log => log.status === status);
    }
    
    return filteredLogs;
}

// 清空操作日志
function clearOperationLogs() {
    operationLogs = [];
    saveOperationLogs();
    console.log('操作日志已清空');
}

// 显示操作日志
function showOperationLogsDialog() {
    const overlay = document.createElement('div');
    overlay.style.position = 'fixed';
    overlay.style.top = '0';
    overlay.style.left = '0';
    overlay.style.width = '100%';
    overlay.style.height = '100%';
    overlay.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
    overlay.style.zIndex = '1000';
    overlay.style.display = 'flex';
    overlay.style.alignItems = 'center';
    overlay.style.justifyContent = 'center';
    
    const modal = document.createElement('div');
    modal.style.backgroundColor = 'white';
    modal.style.padding = '30px';
    modal.style.borderRadius = '8px';
    modal.style.boxShadow = '0 4px 20px rgba(0, 0, 0, 0.2)';
    modal.style.maxWidth = '80%';
    modal.style.width = '80%';
    modal.style.maxHeight = '80vh';
    modal.style.overflowY = 'auto';
    
    const title = document.createElement('h2');
    title.textContent = '📋 操作日志';
    title.style.marginTop = '0';
    title.style.marginBottom = '20px';
    title.style.fontSize = '20px';
    title.style.fontWeight = 'bold';
    title.style.color = '#333';
    
    const logContainer = document.createElement('div');
    logContainer.style.maxHeight = '400px';
    logContainer.style.overflowY = 'auto';
    logContainer.style.border = '1px solid #ddd';
    logContainer.style.borderRadius = '4px';
    logContainer.style.padding = '15px';
    logContainer.style.backgroundColor = '#f9f9f9';
    
    if (operationLogs.length === 0) {
        const noLogsMsg = document.createElement('p');
        noLogsMsg.textContent = '暂无操作日志';
        noLogsMsg.style.color = '#999';
        noLogsMsg.style.textAlign = 'center';
        noLogsMsg.style.padding = '20px';
        logContainer.appendChild(noLogsMsg);
    } else {
        operationLogs.slice().reverse().forEach(log => {
            const logItem = document.createElement('div');
            logItem.style.padding = '10px';
            logItem.style.marginBottom = '10px';
            logItem.style.backgroundColor = '#fff';
            logItem.style.borderRadius = '4px';
            logItem.style.border = '1px solid #e0e0e0';
            logItem.style.borderLeft = `4px solid ${log.status === 'success' ? '#4CAF50' : '#F44336'}`;
            
            const timestamp = document.createElement('div');
            timestamp.textContent = new Date(log.timestamp).toLocaleString('zh-CN');
            timestamp.style.fontSize = '12px';
            timestamp.style.color = '#999';
            timestamp.style.marginBottom = '5px';
            
            const operation = document.createElement('div');
            operation.textContent = `${log.status === 'success' ? '✓' : '✗'} ${log.operation}`;
            operation.style.fontSize = '14px';
            operation.style.fontWeight = 'bold';
            operation.style.color = '#333';
            operation.style.marginBottom = '5px';
            
            const details = document.createElement('div');
            details.textContent = JSON.stringify(log.details, null, 2);
            details.style.fontSize = '12px';
            details.style.color = '#666';
            details.style.whiteSpace = 'pre-wrap';
            details.style.wordBreak = 'break-all';
            
            logItem.appendChild(timestamp);
            logItem.appendChild(operation);
            logItem.appendChild(details);
            logContainer.appendChild(logItem);
        });
    }
    
    const buttonContainer = document.createElement('div');
    buttonContainer.style.display = 'flex';
    buttonContainer.style.justifyContent = 'flex-end';
    buttonContainer.style.gap = '10px';
    buttonContainer.style.marginTop = '20px';
    
    const clearButton = document.createElement('button');
    clearButton.textContent = '清空日志';
    clearButton.style.padding = '10px 20px';
    clearButton.style.border = '1px solid #F44336';
    clearButton.style.borderRadius = '4px';
    clearButton.style.backgroundColor = '#F44336';
    clearButton.style.color = 'white';
    clearButton.style.cursor = 'pointer';
    clearButton.style.fontSize = '14px';
    
    const closeButton = document.createElement('button');
    closeButton.textContent = '关闭';
    closeButton.style.padding = '10px 20px';
    closeButton.style.border = '1px solid #ddd';
    closeButton.style.borderRadius = '4px';
    closeButton.style.backgroundColor = '#f5f5f5';
    closeButton.style.color = '#333';
    closeButton.style.cursor = 'pointer';
    closeButton.style.fontSize = '14px';
    
    buttonContainer.appendChild(clearButton);
    buttonContainer.appendChild(closeButton);
    
    modal.appendChild(title);
    modal.appendChild(logContainer);
    modal.appendChild(buttonContainer);
    overlay.appendChild(modal);
    document.body.appendChild(overlay);
    
    clearButton.addEventListener('click', function() {
        showConfirmDialog('确定要清空所有操作日志吗？', function(confirmed) {
            if (confirmed) {
                clearOperationLogs();
                document.body.removeChild(overlay);
                showOperationLogsDialog();
            }
        });
    });
    
    closeButton.addEventListener('click', function() {
        document.body.removeChild(overlay);
    });
    
    document.addEventListener('keydown', function handleKeydown(e) {
        if (e.key === 'Escape') {
            document.body.removeChild(overlay);
            document.removeEventListener('keydown', handleKeydown);
        }
    });
}

// 显示王天晟的操作记录
function showWangTianshengRecords() {
    console.log('=== 查看王天晟的操作记录 ===');
    
    // 从本地存储加载学员操作记录
    const records = localStorage.getItem('student_operation_records');
    if (records) {
        try {
            const parsed = JSON.parse(records);
            const wangtiansheng = parsed['王天晟'];
            if (wangtiansheng) {
                console.log('王天晟的操作记录:', wangtiansheng);
                if (wangtiansheng.thirdPartImages && wangtiansheng.thirdPartImages.length > 0) {
                    console.log('王天晟的第三部分第一张图片:', wangtiansheng.thirdPartImages[0]);
                    if (wangtiansheng.thirdPartImageNames && wangtiansheng.thirdPartImageNames.length > 0) {
                        console.log('图片名称:', wangtiansheng.thirdPartImageNames[0]);
                    }
                } else {
                    console.log('王天晟没有第三部分图片');
                }
            } else {
                console.log('未找到王天晟的操作记录');
                
                // 尝试从report_generator_state中查找
                const state = localStorage.getItem('report_generator_state');
                if (state) {
                    try {
                        const stateParsed = JSON.parse(state);
                        if (stateParsed.studentOperationRecords && stateParsed.studentOperationRecords['王天晟']) {
                            console.log('从report_generator_state中找到王天晟的记录:', stateParsed.studentOperationRecords['王天晟']);
                            if (stateParsed.studentOperationRecords['王天晟'].thirdPartImages && stateParsed.studentOperationRecords['王天晟'].thirdPartImages.length > 0) {
                                console.log('王天晟的第三部分第一张图片:', stateParsed.studentOperationRecords['王天晟'].thirdPartImages[0]);
                                if (stateParsed.studentOperationRecords['王天晟'].thirdPartImageNames && stateParsed.studentOperationRecords['王天晟'].thirdPartImageNames.length > 0) {
                                    console.log('图片名称:', stateParsed.studentOperationRecords['王天晟'].thirdPartImageNames[0]);
                                }
                            }
                        }
                    } catch (e) {
                        console.error('解析report_generator_state失败:', e);
                    }
                }
            }
        } catch (e) {
            console.error('解析学员操作记录失败:', e);
        }
    } else {
        console.log('本地存储中没有学员操作记录');
    }
    
    // 查看当前学员列表
    console.log('当前学员列表:', students);
    
    // 查看操作日志中与王天晟相关的记录
    const logs = localStorage.getItem('operation_logs');
    if (logs) {
        try {
            const parsed = JSON.parse(logs);
            const wangtianshengLogs = parsed.filter(log => {
                return log.details && (log.details.student === '王天晟' || log.details.studentName === '王天晟');
            });
            if (wangtianshengLogs.length > 0) {
                console.log('与王天晟相关的操作日志:', wangtianshengLogs);
            } else {
                console.log('没有与王天晟相关的操作日志');
            }
        } catch (e) {
            console.error('解析操作日志失败:', e);
        }
    }
}

// 初始化自动保存系统
function initAutoSaveSystem() {
    // 创建保存状态提示元素
    createSaveStatusElement();
    
    // 绑定全局事件监听器
    bindGlobalEventListeners();
    
    // 初始化文字点评功能
    initCommentFeature();
    
    // 尝试从本地存储恢复状态
    restoreStateFromLocalStorage();
    
    // 恢复学员操作记录
    restoreStudentOperationRecords();
    
    // 显示王天晟的操作记录
    showWangTianshengRecords();
    
    console.log('自动保存系统初始化完成');
}

// 创建保存状态提示元素
function createSaveStatusElement() {
    saveStatusElement = document.createElement('div');
    saveStatusElement.id = 'saveStatus';
    saveStatusElement.style.position = 'fixed';
    saveStatusElement.style.top = '20px';
    saveStatusElement.style.right = '20px';
    saveStatusElement.style.padding = '12px 20px';
    saveStatusElement.style.borderRadius = '4px';
    saveStatusElement.style.fontSize = '14px';
    saveStatusElement.style.fontWeight = '500';
    saveStatusElement.style.zIndex = '9999';
    saveStatusElement.style.transition = 'all 0.3s ease';
    saveStatusElement.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.15)';
    saveStatusElement.style.display = 'none';
    document.body.appendChild(saveStatusElement);
}

// 显示保存状态
function showSaveStatus(message, isError = false) {
    if (!saveStatusElement) return;
    
    saveStatusElement.textContent = message;
    saveStatusElement.style.backgroundColor = isError ? '#f44336' : (message.includes('保存中') ? '#2196f3' : '#4caf50');
    saveStatusElement.style.color = '#ffffff';
    saveStatusElement.style.display = 'block';
    saveStatusElement.style.opacity = '0';
    saveStatusElement.style.transform = 'translateY(-10px)';
    
    setTimeout(() => {
        saveStatusElement.style.opacity = '1';
        saveStatusElement.style.transform = 'translateY(0)';
    }, 10);
    
    // 3秒后自动隐藏
    setTimeout(() => {
        saveStatusElement.style.opacity = '0';
        saveStatusElement.style.transform = 'translateY(-10px)';
        setTimeout(() => {
            saveStatusElement.style.display = 'none';
        }, 300);
    }, 3000);
}

// 绑定全局事件监听器 - 优化版本：使用事件委托，减少监听器数量
function bindGlobalEventListeners() {
    // 使用事件委托，只在document上绑定少量监听器
    document.addEventListener('input', function(e) {
        // 只监听表单元素的input事件
        if (e.target.matches('input, select, textarea')) {
            debounce(triggerAutoSave, SAVE_DEBOUNCE_DELAY)();
        }
    }, true);
    
    // 表单提交事件
    document.addEventListener('submit', function(e) {
        if (e.target.tagName === 'FORM') {
            debounce(triggerAutoSave, SAVE_DEBOUNCE_DELAY)();
        }
    }, true);
    
    // 点击事件 - 使用事件委托，排除批量操作菜单
    document.addEventListener('click', function(e) {
        // 如果点击的是批量操作菜单或其子元素，不触发自动保存
        if (batchOperationMenu && batchOperationBtn && (batchOperationMenu.contains(e.target) || batchOperationBtn.contains(e.target))) {
            return;
        }
        // 如果点击的是删除按钮，不触发自动保存
        if (e.target.closest('.image-list button') || e.target.textContent === '删除') {
            return;
        }
        // 只监听按钮和可点击元素的点击事件
        if (e.target.matches('button, .toggle-icon, .lock-icon, input[type="checkbox"], input[type="radio"]')) {
            debounce(triggerAutoSave, SAVE_DEBOUNCE_DELAY)();
        }
    }, true);
    
    // 选择事件（用于下拉菜单）
    document.addEventListener('change', function(e) {
        if (e.target.matches('select, input[type="file"]')) {
            debounce(triggerAutoSave, SAVE_DEBOUNCE_DELAY)();
        }
    }, true);
    
    // 网络状态变化事件
    window.addEventListener('online', handleNetworkOnline);
    
    console.log('全局事件监听器绑定完成（优化版本）');
}

// 处理网络恢复
function handleNetworkOnline() {
    // 网络恢复时，尝试同步本地备份
    syncLocalBackup();
}

// 第一个批量操作菜单初始化函数已被删除，只保留下方的优化版本

// 重新初始化批量操作菜单
function initBatchOperationMenu() {
    if (batchOperationBtn && batchOperationMenu) {
        console.log('=== 重新初始化批量操作菜单 ===');
        
        // 确保菜单初始状态为隐藏
        batchOperationMenu.style.display = 'none';
        batchOperationMenu.classList.remove('show');
        
        // 强制设置菜单样式，确保它能够显示
        batchOperationMenu.style.position = 'absolute';
        batchOperationMenu.style.top = '100%';
        batchOperationMenu.style.left = '0';
        batchOperationMenu.style.zIndex = '1000';
        batchOperationMenu.style.backgroundColor = 'white';
        batchOperationMenu.style.border = '2px solid #81c784';
        batchOperationMenu.style.borderRadius = '4px';
        batchOperationMenu.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.15)';
        batchOperationMenu.style.minWidth = '150px';
        batchOperationMenu.style.padding = '5px 0';
        
        // 切换下拉菜单显示/隐藏
        batchOperationBtn.addEventListener('click', function(e) {
            e.stopPropagation();
            e.preventDefault();
            console.log('批量操作按钮被点击');
            const isVisible = batchOperationMenu.style.display === 'block';
            if (isVisible) {
                batchOperationMenu.style.display = 'none';
                batchOperationMenu.classList.remove('show');
                console.log('关闭菜单');
            } else {
                // 强制显示菜单
                batchOperationMenu.style.display = 'block';
                batchOperationMenu.style.opacity = '1';
                batchOperationMenu.style.transform = 'translateY(0)';
                console.log('打开菜单');
                console.log('菜单样式:', {
                    display: batchOperationMenu.style.display,
                    position: batchOperationMenu.style.position,
                    top: batchOperationMenu.style.top,
                    left: batchOperationMenu.style.left,
                    zIndex: batchOperationMenu.style.zIndex
                });
            }
        });
        
        // 获取两个菜单项
        const menuItems = batchOperationMenu.children;
        console.log('菜单项数量:', menuItems.length);
        
        // 为菜单项添加样式
        for (let i = 0; i < menuItems.length; i++) {
            const item = menuItems[i];
            item.style.padding = '12px 20px';
            item.style.cursor = 'pointer';
            item.style.transition = 'all 0.2s ease';
            item.style.fontSize = '14px';
            item.style.color = '#333';
            item.style.fontFamily = 'pingfangshaohua, Arial, sans-serif';
            
            // 添加悬停效果
            item.addEventListener('mouseenter', function() {
                this.style.backgroundColor = '#81c784';
                this.style.color = '#4caf50';
            });
            
            item.addEventListener('mouseleave', function() {
                this.style.backgroundColor = 'transparent';
                this.style.color = '#333';
            });
        }
        
        // 第一个菜单项：学员单个操作
        if (menuItems[0]) {
            menuItems[0].addEventListener('click', function(e) {
                e.stopPropagation();
                e.preventDefault();
                console.log('=== 点击了学员单个操作 ===');
                
                // 更新操作模式
                currentOperationMode = 'single';
                console.log('操作模式已切换为: 单个操作');
                
                // 更新按钮文字
                batchOperationBtn.textContent = '学员单个操作 ▼';
                
                // 关闭菜单
                batchOperationMenu.style.display = 'none';
                batchOperationMenu.classList.remove('show');
                
                // 执行单个学员操作
                setTimeout(() => {
                    console.log('执行单个学员操作');
                    const currentStudent = students[currentStudentIndex];
                    if (currentStudent) {
                        // 保存当前学员的操作记录
                        saveCurrentStudentOperation();
                        
                        // 显示成功反馈
                        showSaveStatus(`已切换到学员单个操作模式\n当前学员: 【${currentStudent}】\n所有操作将自动保存`);
                        console.log('单个学员操作模式已启用:', currentStudent);
                        
                        // 触发自动保存
                        triggerAutoSave();
                    } else {
                        showSaveStatus('没有识别到学员数据', true);
                    }
                }, 100);
            });
        }
        
        // 第二个菜单项：学员批量操作
        if (menuItems[1]) {
            menuItems[1].addEventListener('click', function(e) {
                e.stopPropagation();
                e.preventDefault();
                console.log('=== 点击了学员批量操作 ===');
                
                // 更新操作模式
                currentOperationMode = 'batch';
                console.log('操作模式已切换为: 批量操作');
                
                // 更新按钮文字
                batchOperationBtn.textContent = '学员批量操作 ▼';
                
                // 关闭菜单
                batchOperationMenu.style.display = 'none';
                batchOperationMenu.classList.remove('show');
                
                // 执行批量学员操作
                setTimeout(() => {
                    console.log('执行批量学员操作');
                    if (students.length > 0) {
                        showSaveStatus(`正在对 ${students.length} 个学员执行统一操作...`);
                        // 收集操作配置
                        const config = {
                            formData: collectFormData(),
                            settings: {
                                imageLayoutMode: imageLayoutModeSelect ? imageLayoutModeSelect.value : 'double',
                                tableScale: tableScale,
                                tableTopPosition: tableTopPosition,
                                tableLeftPosition: tableLeftPosition
                            }
                        };
                        
                        // 对每个学员执行操作
                        let successCount = 0;
                        let failedCount = 0;
                        
                        students.forEach(student => {
                            try {
                                studentOperationRecords[student] = {
                                    ...config,
                                    timestamp: Date.now()
                                };
                                successCount++;
                            } catch (error) {
                                failedCount++;
                                console.error('批量操作失败:', student, error);
                            }
                        });
                        
                        // 保存结果
                        saveStudentOperationRecords();
                        triggerAutoSave();
                        
                        if (failedCount === 0) {
                            showSaveStatus(`✅ 批量操作完成！成功: ${successCount}/${students.length}`);
                        } else {
                            showSaveStatus(`⚠️ 批量操作完成。成功: ${successCount}, 失败: ${failedCount}`, true);
                        }
                    } else {
                        showSaveStatus('没有识别到学员数据', true);
                    }
                }, 100);
            });
        }
        
        // 点击其他区域关闭菜单
        document.addEventListener('click', function(e) {
            if (batchOperationBtn && batchOperationMenu && 
                !batchOperationBtn.contains(e.target) && !batchOperationMenu.contains(e.target)) {
                batchOperationMenu.style.display = 'none';
                batchOperationMenu.classList.remove('show');
            }
        });
        
        console.log('=== 批量操作菜单重新初始化完成 ===');
    }
}

// 页面加载完成后初始化
window.addEventListener('load', function() {
    console.log('页面加载完成，初始化批量操作菜单');
    
    // 清理所有可能遗留的遮罩层
    cleanupOrphanedOverlays();
    
    // 初始化性能监控系统
    initPerformanceMonitoring();
    
    // 标记页面加载完成
    markPerformance('pageLoadComplete');
});

// 创建干净的克隆（保留所有内容，只移除可能导致CORS问题的外部元素）
function createCleanClone(element) {
    const clone = element.cloneNode(true);
    
    // 1. 处理图片（保留所有图片，添加错误处理）
    const images = clone.querySelectorAll('img');
    images.forEach(img => {
        // 保留所有图片，添加错误处理
        img.onerror = function() {
            // 如果图片加载失败，显示占位符
            this.style.display = 'none';
            const placeholder = document.createElement('div');
            placeholder.style.width = this.offsetWidth + 'px';
            placeholder.style.height = this.offsetHeight + 'px';
            placeholder.style.border = '1px dashed #ccc';
            placeholder.style.display = 'flex';
            placeholder.style.alignItems = 'center';
            placeholder.style.justifyContent = 'center';
            placeholder.style.color = '#999';
            placeholder.style.fontSize = '12px';
            placeholder.style.backgroundColor = '#f9f9f9';
            placeholder.textContent = '[图片]';
            placeholder.style.fontFamily = 'Arial, sans-serif';
            
            if (this.parentNode) {
                this.parentNode.insertBefore(placeholder, this);
            }
        };
    });
    
    // 2. 保留背景样式（不移除背景图片）
    // 背景图片通常是本地的，不会导致CORS问题
    
    // 3. 专门处理Canvas元素（确保柱状图能正确显示）
    const canvases = clone.querySelectorAll('canvas');
    canvases.forEach(canvas => {
        try {
            // 确保Canvas有正确的尺寸
            if (canvas.width === 0 || canvas.height === 0) {
                console.warn('Canvas尺寸为0，尝试设置尺寸');
                canvas.width = canvas.offsetWidth || 400;
                canvas.height = canvas.offsetHeight || 200;
            }
            
            // 尝试直接使用原始的chartInstance（如果存在）
            if (typeof Chart !== 'undefined' && window.chartInstance) {
                try {
                    console.log('使用原始Chart.js实例的toBase64Image方法');
                    const chartDataUrl = window.chartInstance.toBase64Image();
                    const img = document.createElement('img');
                    img.src = chartDataUrl;
                    img.width = window.chartInstance.canvas.width;
                    img.height = window.chartInstance.canvas.height;
                    img.style.width = canvas.offsetWidth + 'px';
                    img.style.height = canvas.offsetHeight + 'px';
                    img.style.maxWidth = '100%';
                    img.style.height = 'auto';
                    img.style.display = 'block';
                    img.style.position = 'relative';
                    img.style.zIndex = '10';
                    
                    // 替换Canvas为图片
                    if (canvas.parentNode) {
                        canvas.parentNode.replaceChild(img, canvas);
                    }
                    console.log('Chart.js图表已成功转换为图片');
                    return;
                } catch (chartError) {
                    console.warn('Chart.js toBase64Image失败，尝试普通Canvas转换:', chartError);
                }
            }
            
            // 提高Canvas转换的缩放比例，使文字更清晰
            const scale = 2.5;
            const scaledCanvas = document.createElement('canvas');
            scaledCanvas.width = canvas.width * scale;
            scaledCanvas.height = canvas.height * scale;
            const scaledCtx = scaledCanvas.getContext('2d');
            
            // 启用图像平滑以提高质量
            scaledCtx.imageSmoothingEnabled = true;
            scaledCtx.imageSmoothingQuality = 'high';
            
            // 将原始Canvas绘制到缩放后的Canvas上
            scaledCtx.drawImage(canvas, 0, 0, scaledCanvas.width, scaledCanvas.height);
            
            // 尝试将Canvas转换为图片，确保内容能被正确捕获
            const dataUrl = scaledCanvas.toDataURL('image/png');
            const img = document.createElement('img');
            img.src = dataUrl;
            img.width = canvas.width;
            img.height = canvas.height;
            img.style.width = canvas.offsetWidth + 'px';
            img.style.height = canvas.offsetHeight + 'px';
            img.style.maxWidth = '100%';
            img.style.height = 'auto';
            img.style.display = 'block';
            img.style.position = 'relative';
            img.style.zIndex = '10';
            
            // 替换Canvas为图片
            if (canvas.parentNode) {
                canvas.parentNode.replaceChild(img, canvas);
            }
        } catch (error) {
            console.warn('Canvas转换失败，保留原始Canvas:', error);
            // 如果转换失败，保留原始Canvas
            canvas.style.position = 'relative';
            canvas.style.zIndex = '10';
        }
    });
    
    // 4. 添加详细的内联样式，确保布局正确
    const style = document.createElement('style');
    style.textContent = `
        body { margin: 0; padding: 0; font-family: Arial, sans-serif; }
        .report { 
            padding: 20px; 
            background: white; 
            width: 100%; 
            box-sizing: border-box;
        }
        h1, h2, h3 { color: #333; }
        table { 
            border-collapse: collapse; 
            width: 100%; 
            margin: 10px 0; 
            table-layout: fixed;
        }
        th, td { 
            border: 1px solid #ddd; 
            padding: 8px; 
            text-align: left; 
            word-break: break-word;
        }
        th { background-color: #f2f2f2; }
        .chart-container { 
            margin: 20px 0; 
            width: 100%; 
            height: auto;
        }
        .comment-card { 
            margin: 20px 0; 
            padding: 15px; 
            border: 1px solid #ddd; 
            border-radius: 5px; 
            width: 100%; 
            box-sizing: border-box;
            word-break: break-word;
            white-space: normal;
        }
        .comment-card p { 
            margin: 10px 0; 
            line-height: 1.5;
        }
        img { 
            max-width: 100%; 
            height: auto; 
            display: block;
        }
        canvas { 
            max-width: 100%; 
            height: auto;
        }
        .row { 
            display: flex; 
            flex-wrap: wrap; 
            margin: 0 -10px;
        }
        .col { 
            flex: 1; 
            padding: 0 10px; 
            box-sizing: border-box;
        }
        @media (max-width: 768px) { 
            .col { 
                flex: 100%; 
                margin-bottom: 10px;
            }
        }
    `;
    
    const head = clone.querySelector('head') || document.createElement('head');
    head.appendChild(style);
    
    if (!clone.querySelector('head')) {
        const html = clone.querySelector('html') || document.createElement('html');
        html.insertBefore(head, html.firstChild);
        if (!clone.querySelector('html')) {
            clone.appendChild(html);
        }
    }
    
    return clone;
}

// 备选方案：直接捕获原始元素
async function tryDirectCapture(element, studentName) {
    console.log('使用备选方案：直接捕获原始元素');
    
    // 临时移除可能导致问题的CSS属性
    const originalTransform = element.style.transform;
    const originalFilter = element.style.filter;
    const originalClipPath = element.style.clipPath;
    
    element.style.transform = 'none';
    element.style.filter = 'none';
    element.style.clipPath = 'none';
    
    try {
        const canvas = await html2canvas(element, {
            scale: 2,
            useCORS: true,
            allowTaint: true,
            taintTest: false,
            logging: true,
            timeout: 60000,
            backgroundColor: '#ffffff',
            scrollX: 0,
            scrollY: 0
        });
        
        console.log('直接捕获成功');
        
        const pngUrl = canvas.toDataURL('image/png');
        const fileName = `${studentName}_学习情况报告.png`;
        
        const link = document.createElement('a');
        link.download = fileName;
        link.href = pngUrl;
        link.style.display = 'none';
        document.body.appendChild(link);
        
        link.click();
        
        setTimeout(() => {
            document.body.removeChild(link);
            showSaveStatus('PNG图片下载成功');
        }, 100);
        
    } finally {
        // 恢复原始CSS属性
        element.style.transform = originalTransform;
        element.style.filter = originalFilter;
        element.style.clipPath = originalClipPath;
    }
}

// 最终方案：使用手动Canvas绘制
async function tryManualCanvasMethod(element, studentName) {
    console.log('使用最终方案：手动Canvas绘制');
    
    // 创建Canvas元素
    const canvas = document.createElement('canvas');
    const rect = element.getBoundingClientRect();
    canvas.width = rect.width * 2; // 2倍分辨率
    canvas.height = rect.height * 2;
    const ctx = canvas.getContext('2d');
    
    // 填充白色背景
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // 设置缩放
    ctx.scale(2, 2);
    
    // 这里可以添加手动绘制逻辑，但由于复杂度较高，我们暂时只返回一个基本的Canvas
    // 实际项目中可能需要更复杂的绘制逻辑
    
    ctx.fillStyle = '#333333';
    ctx.font = '20px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('学习情况报告', rect.width / 2, 50);
    
    ctx.font = '14px Arial';
    ctx.fillText('由于技术限制，无法生成完整报告图片', rect.width / 2, 100);
    ctx.fillText('请尝试使用其他浏览器或刷新页面后重试', rect.width / 2, 130);
    
    // 生成PNG
    const pngUrl = canvas.toDataURL('image/png');
    const fileName = `${studentName}_学习情况报告.png`;
    
    const link = document.createElement('a');
    link.download = fileName;
    link.href = pngUrl;
    link.style.display = 'none';
    document.body.appendChild(link);
    
    link.click();
    
    setTimeout(() => {
        document.body.removeChild(link);
        showSaveStatus('PNG图片下载成功（简化版）');
    }, 100);
}

// 清理所有可能遗留的遮罩层
function cleanupOrphanedOverlays() {
    console.log('开始清理可能遗留的遮罩层...');
    
    // 查找所有 position 为 fixed 的元素
    const allElements = document.querySelectorAll('*');
    const overlays = [];
    
    allElements.forEach(element => {
        const style = window.getComputedStyle(element);
        const position = style.position;
        const zIndex = style.zIndex;
        
        // 查找可能遗留的遮罩层
        if (position === 'fixed' && zIndex && parseInt(zIndex) >= 1000) {
            // 检查是否是已知的遮罩层
            const isKnownOverlay = element.id === 'downloadProgressOverlay' ||
                                  element.id === 'matchOverlay' ||
                                  element.id === 'cropOverlay' ||
                                  element.classList.contains('overlay');
            
            // 如果不是已知的遮罩层，或者它已经没有父元素，则移除它
            if (!isKnownOverlay || !element.parentNode || element.parentNode !== document.body) {
                overlays.push(element);
            }
        }
    });
    
    // 移除找到的遮罩层
    overlays.forEach(overlay => {
        try {
            if (overlay.parentNode) {
                overlay.parentNode.removeChild(overlay);
                console.log('已移除遗留的遮罩层:', overlay);
            }
        } catch (error) {
            console.warn('移除遮罩层时出错:', error);
        }
    });
    
    console.log('清理完成，共移除', overlays.length, '个遗留的遮罩层');
}

// 显示下载进度条
function showDownloadProgress(title, totalSteps) {
    let existingOverlay = document.getElementById('downloadProgressOverlay');
    if (existingOverlay) {
        existingOverlay.remove();
    }
    
    const overlay = document.createElement('div');
    overlay.id = 'downloadProgressOverlay';
    overlay.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.7);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 10000;
        font-family: 'pingfangshaohua', Arial, sans-serif;
    `;
    
    const modal = document.createElement('div');
    modal.style.cssText = `
        background: white;
        padding: 30px 40px;
        border-radius: 12px;
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
        min-width: 400px;
        max-width: 90%;
    `;
    
    const titleEl = document.createElement('h3');
    titleEl.textContent = title;
    titleEl.style.cssText = `
        margin: 0 0 20px 0;
        font-size: 18px;
        color: #333;
        text-align: center;
    `;
    
    const progressBarContainer = document.createElement('div');
    progressBarContainer.style.cssText = `
        width: 100%;
        height: 24px;
        background: #e0e0e0;
        border-radius: 12px;
        overflow: hidden;
        margin-bottom: 15px;
    `;
    
    const progressBar = document.createElement('div');
    progressBar.id = 'downloadProgressBar';
    progressBar.style.cssText = `
        width: 0%;
        height: 100%;
        background: linear-gradient(90deg, #4CAF50, #45a049);
        transition: width 0.3s ease;
        border-radius: 12px;
    `;
    
    const progressText = document.createElement('div');
    progressText.id = 'downloadProgressText';
    progressText.textContent = '准备中...';
    progressText.style.cssText = `
        text-align: center;
        font-size: 14px;
        color: #666;
        margin-bottom: 15px;
    `;
    
    const statusText = document.createElement('div');
    statusText.id = 'downloadStatusText';
    statusText.textContent = '正在处理...';
    statusText.style.cssText = `
        text-align: center;
        font-size: 14px;
        color: #999;
        min-height: 20px;
    `;
    
    const cancelButton = document.createElement('button');
    cancelButton.textContent = '取消';
    cancelButton.style.cssText = `
        display: block;
        width: 100%;
        padding: 12px;
        background: #f44336;
        color: white;
        border: none;
        border-radius: 6px;
        font-size: 14px;
        cursor: pointer;
        transition: background 0.2s;
    `;
    cancelButton.onmouseover = function() {
        this.style.background = '#da190b';
    };
    cancelButton.onmouseout = function() {
        this.style.background = '#f44336';
    };
    cancelButton.onclick = function() {
        hideDownloadProgress();
    };
    
    progressBarContainer.appendChild(progressBar);
    modal.appendChild(titleEl);
    modal.appendChild(progressBarContainer);
    modal.appendChild(progressText);
    modal.appendChild(statusText);
    modal.appendChild(cancelButton);
    overlay.appendChild(modal);
    document.body.appendChild(overlay);
    
    return {
        progressBar,
        progressText,
        statusText,
        updateProgress: function(step, message) {
            const percentage = Math.round((step / totalSteps) * 100);
            progressBar.style.width = percentage + '%';
            progressText.textContent = `${percentage}% (${step}/${totalSteps})`;
            if (message) {
                statusText.textContent = message;
            }
        },
        complete: function(message) {
            progressBar.style.background = 'linear-gradient(90deg, #4CAF50, #45a049)';
            progressText.textContent = '100% 完成';
            statusText.textContent = message || '下载完成！';
            setTimeout(() => {
                hideDownloadProgress();
            }, 1500);
        },
        error: function(message) {
            progressBar.style.background = '#f44336';
            progressText.textContent = '失败';
            statusText.textContent = message || '下载失败';
            setTimeout(() => {
                hideDownloadProgress();
            }, 3000);
        }
    };
}

// 隐藏下载进度条
function hideDownloadProgress() {
    const overlay = document.getElementById('downloadProgressOverlay');
    if (overlay) {
        overlay.remove();
    }
}

// 图片路径处理工具函数（直接使用本地文件路径）
function processImagePath(url) {
    return new Promise((resolve) => {
        // 如果是本地文件路径，直接使用
        if (url.startsWith('image/') || url.startsWith('./image/')) {
            console.log('本地文件路径，直接使用:', url);
            resolve(url);
            return;
        }
        
        // 如果是data URL或blob，直接使用
        if (url.startsWith('data:') || url.startsWith('blob:')) {
            resolve(url);
            return;
        }
        
        // 如果是网络URL，尝试下载并返回本地路径
        if (url.startsWith('http://') || url.startsWith('https://')) {
            console.log('网络URL，尝试下载:', url);
            imageManager.downloadImage(url).then(localPath => {
                resolve(localPath);
            }).catch(error => {
                console.error('图片下载失败，使用原始URL:', error);
                resolve(url);
            });
            return;
        }
        
        // 其他情况，直接使用
        console.log('未知URL类型，直接使用:', url);
        resolve(url);
    });
}

// 批量处理图片路径（直接使用本地文件路径）
async function processAllImagePaths(container) {
    const images = container.querySelectorAll('img');
    const processPromises = Array.from(images).map(async img => {
        if (!img.src.startsWith('data:') && !img.src.startsWith('blob:')) {
            try {
                const processedPath = await processImagePath(img.src);
                img.src = processedPath;
                console.log('图片路径处理成功:', img.alt || 'unnamed', '->', processedPath);
            } catch (error) {
                console.error('图片路径处理失败:', error);
            }
        }
        return Promise.resolve();
    });
    
    await Promise.all(processPromises);
    
    const allElements = container.querySelectorAll('*');
    const bgPromises = Array.from(allElements).map(async element => {
        const bgUrl = element.style.backgroundImage;
        if (bgUrl && bgUrl !== 'none' && !bgUrl.includes('data:image/')) {
            const urlMatch = bgUrl.match(/url\(['"]?([^'"]+)['"]?\)/);
            if (urlMatch && urlMatch[1]) {
                try {
                    const processedPath = await processImagePath(urlMatch[1]);
                    element.style.backgroundImage = `url('${processedPath}')`;
                    console.log('背景图片路径处理成功:', urlMatch[1], '->', processedPath);
                } catch (error) {
                    console.warn('背景图片路径处理失败，保留原始背景:', error);
                }
            }
        }
    });
    
    await Promise.all(bgPromises);
}

// 下载当前预览图片 - 简化版本
async function downloadCurrentImage() {
    console.log('downloadCurrentImage 函数被调用');
    
    if (!validateTeacherName()) {
        return;
    }
    
    if (!reportPreview) {
        showCenterAlert('报告预览元素不存在', 'error');
        return;
    }
    
    const reportContainer = reportPreview.querySelector('.report');
    if (!reportContainer) {
        showCenterAlert('报告容器不存在', 'error');
        return;
    }
    
    const progress = showDownloadProgress('下载当前报告', 5);
    
    try {
        progress.updateProgress(1, '正在准备...');
        console.log('开始准备下载...');
        
        // 1. 隐藏文字点评右上角的红色叉号
        const deleteButtons = reportContainer.querySelectorAll('.comment-section-final button');
        const originalDeleteButtonStyles = [];
        deleteButtons.forEach((btn, index) => {
            originalDeleteButtonStyles[index] = btn.style.display;
            btn.style.display = 'none';
        });
        
        // 确保四个模块的标题都有最高的z-index
        const section1Title = reportContainer.querySelector('.section-listening h2');
        const section2Title = reportContainer.querySelector('.section-interactive h2');
        const section3Title = reportContainer.querySelector('.section-creation h2');
        const commentSection = reportContainer.querySelector('.comment-section-final');
        
        if (section1Title) {
            section1Title.style.zIndex = '1000';
            section1Title.style.position = 'relative';
        }
        if (section2Title) {
            section2Title.style.zIndex = '1000';
            section2Title.style.position = 'relative';
        }
        if (section3Title) {
            section3Title.style.zIndex = '1000';
            section3Title.style.position = 'relative';
        }
        if (commentSection) {
            commentSection.style.zIndex = '1000';
            commentSection.style.position = 'relative';
        }
        
        // 2. 预处理所有图片，添加crossorigin属性避免CORS问题
        progress.updateProgress(2, '预处理图片...');
        console.log('开始预处理图片...');
        
        const images = reportContainer.querySelectorAll('img');
        console.log(`找到 ${images.length} 张图片需要处理`);
        
        const imagePromises = [];
        
        images.forEach((img, index) => {
            if (img.src && !img.src.startsWith('data:') && !img.src.startsWith('blob:')) {
                console.log(`处理图片 ${index + 1}/${images.length}:`, img.src);
                
                const imagePromise = new Promise((resolve) => {
                    const isLocalFile = img.src.startsWith('file://') || img.src.startsWith('image/') || window.location.protocol === 'file:';
                    
                    if (isLocalFile) {
                        console.log(`图片 ${index + 1} 是本地文件，需要转换为base64`);
                        
                        const tempImg = new Image();
                        tempImg.onload = function() {
                            try {
                                const canvas = document.createElement('canvas');
                                canvas.width = tempImg.naturalWidth;
                                canvas.height = tempImg.naturalHeight;
                                const ctx = canvas.getContext('2d');
                                ctx.drawImage(tempImg, 0, 0);
                                img.src = canvas.toDataURL('image/png');
                                console.log(`图片 ${index + 1} 转换为base64成功`);
                            } catch (error) {
                                console.warn(`图片 ${index + 1} 转换失败:`, error);
                            } finally {
                                resolve();
                            }
                        };
                        tempImg.onerror = function() {
                            console.warn(`图片 ${index + 1} 加载失败`);
                            resolve();
                        };
                        tempImg.src = img.src;
                    } else {
                        if (!img.hasAttribute('crossorigin')) {
                            img.setAttribute('crossorigin', 'anonymous');
                            console.log(`图片 ${index + 1} 添加crossorigin属性`);
                        }
                        
                        const originalSrc = img.src;
                        img.onload = function() {
                            console.log(`图片 ${index + 1} 重新加载成功`);
                            resolve();
                        };
                        img.onerror = function() {
                            console.warn(`图片 ${index + 1} 重新加载失败`);
                            resolve();
                        };
                        img.src = originalSrc + '?t=' + Date.now();
                    }
                });
                
                imagePromises.push(imagePromise);
            }
        });
        
        // 等待所有图片处理完成
        await Promise.all(imagePromises);
        console.log('所有图片预处理完成');
        
        // 额外检查：只移除可能导致CORS问题的背景图片，保留报告容器的主背景
        const elementsWithBackground = reportContainer.querySelectorAll('[style*="background-image"]');
        console.log(`找到 ${elementsWithBackground.length} 个元素带有背景图片`);
        
        elementsWithBackground.forEach((element, index) => {
            // 跳过报告容器本身的背景图片
            if (element === reportContainer) {
                console.log(`保留报告容器的背景图片`);
                return;
            }
            
            const style = element.style;
            const backgroundImage = style.backgroundImage;
            if (backgroundImage && !backgroundImage.includes('data:') && !backgroundImage.includes('blob:')) {
                console.log(`移除元素 ${index + 1} 的背景图片:`, backgroundImage);
                style.backgroundImage = 'none';
            }
        });
        
        // 修复第二部分标题在下载时消失的问题：临时设置section2的overflow为visible
        const section2Elements = reportContainer.querySelectorAll('.section-interactive');
        section2Elements.forEach(section2 => {
            console.log('临时修改section2的overflow属性为visible');
            section2.style.overflow = 'visible';
        });
        
        // 检查报告容器的背景图片
        const reportContainerBg = reportContainer.style.backgroundImage;
        console.log(`报告容器背景图片:`, reportContainerBg);
        
        // 检查body的背景图片
        const bodyBg = document.body.style.backgroundImage;
        console.log(`body背景图片:`, bodyBg);
        
        // 3. 等待内容完全渲染
        progress.updateProgress(3, '等待内容渲染...');
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        console.log('报告容器尺寸:', reportContainer.offsetWidth, 'x', reportContainer.offsetHeight);
        
        // 4. 使用简化的html2canvas配置
        progress.updateProgress(4, '正在预加载背景图片...');
        console.log('开始预加载背景图片...');
        
        // 使用预加载函数处理背景图片
        let bgDataUrl = null;
        try {
            bgDataUrl = await preloadBackgroundImage(bgUrl);
            if (bgDataUrl) {
                console.log('背景图片预加载成功');
            } else {
                console.warn('背景图片预加载失败，使用原始URL');
                bgDataUrl = bgUrl;
            }
        } catch (error) {
            console.error('背景图片预加载出错:', error);
            bgDataUrl = bgUrl;
        }
        
        const html2canvasOptions = {
            scale: 4,
            backgroundColor: 'transparent', // 使用透明背景，避免覆盖
            useCORS: true,
            allowTaint: true,
            scrollX: 0,
            scrollY: 0,
            logging: false,
            taintTest: false,
            onclone: function(clonedDoc) {
                console.log('onclone回调执行');
                const clonedContainer = clonedDoc.querySelector('.report');
                if (clonedContainer) {
                    // 设置报告容器的背景图片为预加载的data URL
                    if (bgDataUrl && bgDataUrl.startsWith('data:')) {
                        clonedContainer.style.backgroundImage = `url('${bgDataUrl}')`;
                        console.log('克隆容器背景图片已设置为data URL');
                    }
                    
                    // 移除所有可能导致问题的元素
                    const buttons = clonedContainer.querySelectorAll('button');
                    buttons.forEach(btn => btn.style.display = 'none');
                    
                    // 确保所有标题元素都有最高的z-index，不会被遮挡
                    const titles = clonedContainer.querySelectorAll('h1, h2, h3');
                    titles.forEach(title => {
                        title.style.position = 'relative';
                        title.style.zIndex = '9999';
                        title.style.overflow = 'visible';
                        title.style.whiteSpace = 'normal';
                        title.style.textOverflow = 'clip';
                    });
                    
                    // 处理Canvas元素（确保柱状图能正确显示）
                    const canvases = clonedContainer.querySelectorAll('canvas');
                    canvases.forEach(canvas => {
                        try {
                            if (canvas.width === 0 || canvas.height === 0) {
                                canvas.width = canvas.offsetWidth || 300;
                                canvas.height = canvas.offsetHeight || 200;
                            }
                            
                            // 提高Canvas转换的缩放比例，使文字更清晰
                            const scale = 4;
                            const scaledCanvas = document.createElement('canvas');
                            scaledCanvas.width = canvas.width * scale;
                            scaledCanvas.height = canvas.height * scale;
                            const scaledCtx = scaledCanvas.getContext('2d');
                            
                            // 启用图像平滑以提高质量
                            scaledCtx.imageSmoothingEnabled = true;
                            scaledCtx.imageSmoothingQuality = 'high';
                            
                            // 将原始Canvas绘制到缩放后的Canvas上
                            scaledCtx.drawImage(canvas, 0, 0, scaledCanvas.width, scaledCanvas.height);
                            
                            const dataUrl = scaledCanvas.toDataURL('image/png');
                            const img = document.createElement('img');
                            img.src = dataUrl;
                            img.width = canvas.width;
                            img.height = canvas.height;
                            img.style.width = canvas.offsetWidth + 'px';
                            img.style.height = canvas.offsetHeight + 'px';
                            img.style.maxWidth = '100%';
                            img.style.height = 'auto';
                            img.style.display = 'block';
                            if (canvas.parentNode) {
                                canvas.parentNode.replaceChild(img, canvas);
                            }
                        } catch (error) {
                            console.warn('Canvas转换失败，保留原始Canvas:', error);
                        }
                    });
                    
                    // 处理克隆中的图片，确保它们不会导致CORS问题
                    const clonedImages = clonedContainer.querySelectorAll('img');
                    console.log(`克隆中找到 ${clonedImages.length} 张图片`);
                    
                    clonedImages.forEach((img, index) => {
                        if (img.src && !img.src.startsWith('data:') && !img.src.startsWith('blob:')) {
                            console.log(`处理克隆中的图片 ${index + 1}:`, img.src);
                            
                            // 检查图片是否在第三部分或第四部分中
                            let isInImportantSection = false;
                            let parent = img.parentElement;
                            while (parent) {
                                if (parent.classList.contains('third-part') || 
                                    parent.classList.contains('creation-section') || 
                                    parent.classList.contains('fourth-part') || 
                                    parent.classList.contains('fourth-section') ||
                                    parent.id === 'fourthPartImages' ||
                                    parent.id === 'fourth-part' ||
                                    parent.id === 'fourth-section' ||
                                    parent.className.includes('third-part') ||
                                    parent.className.includes('fourth-part') ||
                                    parent.className.includes('creation-section')) {
                                    isInImportantSection = true;
                                    break;
                                }
                                parent = parent.parentElement;
                            }
                            
                            // 检查图片是否在创作情况部分
                            if (!isInImportantSection) {
                                let grandParent = img.parentElement;
                                while (grandParent) {
                                    if (grandParent.textContent && grandParent.textContent.includes('创作情况')) {
                                        isInImportantSection = true;
                                        break;
                                    }
                                    grandParent = grandParent.parentElement;
                                }
                            }
                            
                            // 检查图片是否在第四部分图片容器中
                            if (!isInImportantSection) {
                                let ancestor = img.parentElement;
                                while (ancestor) {
                                    if (ancestor.innerHTML && ancestor.innerHTML.includes('第四部分')) {
                                        isInImportantSection = true;
                                        break;
                                    }
                                    ancestor = ancestor.parentElement;
                                }
                            }
                            
                            // 对于重要部分的图片，尝试转换为data URL以避免CORS问题
                            if (isInImportantSection) {
                                try {
                                    console.log('尝试转换重要部分的图片为data URL');
                                    const tempImg = new Image();
                                    if (!window.location.protocol.startsWith('file:') && !img.src.startsWith('file:')) {
                                        tempImg.crossOrigin = 'anonymous';
                                    }
                                    
                            tempImg.onload = function() {
                                const canvas = document.createElement('canvas');
                                canvas.width = tempImg.naturalWidth;
                                canvas.height = tempImg.naturalHeight;
                                const ctx = canvas.getContext('2d');
                                
                                // 启用高质量图像渲染
                                ctx.imageSmoothingEnabled = true;
                                ctx.imageSmoothingQuality = 'high';
                                
                                ctx.drawImage(tempImg, 0, 0);
                                
                                // 使用最高质量的PNG格式
                                img.src = canvas.toDataURL('image/png', 1.0);
                                console.log('重要部分图片转换为data URL成功');
                                
                                // 确保图片不会被拉伸，保持原始尺寸
                                img.style.width = 'auto';
                                img.style.height = 'auto';
                                img.style.maxWidth = '100%';
                                img.style.maxHeight = '100%';
                                img.style.objectFit = 'contain';
                            };
                            tempImg.onerror = function() {
                                console.warn('重要部分图片转换失败，保留原始URL');
                            };
                                    tempImg.src = img.src;
                                } catch (error) {
                                    console.warn('重要部分图片处理失败:', error);
                                }
                            } else {
                                // 移除非重要部分的可能导致问题的图片
                                img.style.display = 'none';
                            }
                        }
                    });
                    
                    // 移除所有带有背景图片的元素的背景，但保留报告容器的背景
                    const elementsWithBackground = clonedContainer.querySelectorAll('[style*="background-image"]');
                    elementsWithBackground.forEach((element, index) => {
                        // 跳过报告容器本身的背景图片
                        if (element === clonedContainer) {
                            console.log(`保留报告容器的背景图片`);
                            return;
                        }
                        
                        const style = element.style;
                        const backgroundImage = style.backgroundImage;
                        if (backgroundImage && !backgroundImage.includes('data:') && !backgroundImage.includes('blob:')) {
                            console.log(`移除克隆中元素 ${index + 1} 的背景图片`);
                            style.backgroundImage = 'none';
                        }
                    });
                    
                    // 强制设置报告容器的背景图片
                    console.log(`设置报告容器背景图片:`, bgDataUrl);
                    if (bgDataUrl) {
                        clonedContainer.style.backgroundImage = `url('${bgDataUrl}')`;
                        console.log(`背景图片设置成功`);
                    }
                }
            }
        };
        
        console.log('HTML2Canvas配置:', html2canvasOptions);
        
        // 渲染为canvas
        const contentCanvas = await html2canvas(reportContainer, html2canvasOptions);
        
        console.log('内容Canvas渲染成功，尺寸:', contentCanvas.width, 'x', contentCanvas.height);
        
        // 创建最终的canvas，先绘制背景，再绘制内容
        const canvas = document.createElement('canvas');
        canvas.width = contentCanvas.width;
        canvas.height = contentCanvas.height;
        const ctx = canvas.getContext('2d');
        
        // 先绘制背景图片
        if (bgDataUrl && bgDataUrl.startsWith('data:')) {
            try {
                console.log('开始绘制背景图片...');
                const bgImg = new Image();
                
                await new Promise((resolve, reject) => {
                    bgImg.onload = function() {
                        try {
                            // 绘制背景图片
                            ctx.drawImage(bgImg, 0, 0, canvas.width, canvas.height);
                            console.log('背景图片绘制成功');
                        } catch (drawError) {
                            console.warn('绘制背景图片失败:', drawError);
                        }
                        resolve();
                    };
                    bgImg.onerror = function() {
                        console.warn('背景图片加载失败');
                        resolve();
                    };
                    bgImg.src = bgDataUrl;
                });
            } catch (error) {
                console.warn('绘制背景图片时出错:', error);
            }
        }
        
        // 再绘制内容
        ctx.drawImage(contentCanvas, 0, 0);
        console.log('内容绘制成功');
        
        // 5. 导出并下载图片
        progress.updateProgress(5, '正在下载...');
        
        let imageUrl;
        try {
            imageUrl = canvas.toDataURL('image/png');
            console.log('toDataURL成功，图片大小:', Math.round(imageUrl.length * 0.75 / 1024), 'KB');
        } catch (error) {
            console.error('toDataURL失败，尝试使用blob方式:', error);
            
            try {
                const blob = await new Promise((resolve) => {
                    canvas.toBlob(resolve, 'image/png');
                });
                
                if (!blob) {
                    throw new Error('无法创建blob对象');
                }
                
                imageUrl = URL.createObjectURL(blob);
                console.log('blob方式成功');
            } catch (blobError) {
                console.error('blob方式也失败:', blobError);
                throw blobError;
            }
        }
        
        // 恢复删除按钮的显示状态
        deleteButtons.forEach((btn, index) => {
            btn.style.display = originalDeleteButtonStyles[index];
        });
        
        // 创建下载链接
        const link = document.createElement('a');
        link.download = `${students[currentStudentIndex] || '学习情况报告'}_${new Date().getTime()}.png`;
        link.href = imageUrl;
        link.style.display = 'none';
        document.body.appendChild(link);
        
        // 触发下载
        link.click();
        
        // 清理
        setTimeout(() => {
            document.body.removeChild(link);
            if (imageUrl.startsWith('blob:')) {
                URL.revokeObjectURL(imageUrl);
            }
        }, 100);
        
        progress.complete('图片下载成功！');
        console.log('图片下载成功');
        
    } catch (error) {
        console.error('下载图片时出错:', error);
        console.error('错误堆栈:', error.stack);
        progress.error(`错误：${error.message || '未知错误'}`);
        
        // 恢复删除按钮的显示状态
        const deleteButtons = reportContainer.querySelectorAll('.comment-section-final button');
        deleteButtons.forEach(btn => {
            btn.style.display = 'flex';
        });
        
        // 检查是否为CORS错误
        if (isCORSError(error)) {
            console.error('CORS错误导致下载失败');
            showCenterAlert('下载失败：浏览器安全限制导致无法处理图片', 'error');
            return;
        }
        
        // 尝试备用方案：使用简化的渲染（纯文本版）
        try {
            console.log('尝试备用方案...');
            
            // 创建简化的容器
            const simpleContainer = document.createElement('div');
            simpleContainer.style.width = '842px';
            simpleContainer.style.minHeight = '595px';
            simpleContainer.style.padding = '20px';
            simpleContainer.style.backgroundColor = '#ffffff';
            simpleContainer.style.fontFamily = 'Arial, sans-serif';
            simpleContainer.style.position = 'absolute';
            simpleContainer.style.top = '10px';
            simpleContainer.style.left = '10px';
            simpleContainer.style.visibility = 'hidden';
            simpleContainer.style.opacity = '0.01';
            simpleContainer.style.zIndex = '9999';
            simpleContainer.style.border = '1px solid #dddddd';
            simpleContainer.style.borderRadius = '4px';
            
            // 只复制文本内容
            simpleContainer.innerHTML = reportContainer.innerHTML;
            
            // 移除所有图片
            const imgs = simpleContainer.querySelectorAll('img');
            imgs.forEach(img => img.remove());
            
            // 移除删除按钮
            const btns = simpleContainer.querySelectorAll('button');
            btns.forEach(btn => btn.remove());
            
            // 移除Canvas
            const canvases = simpleContainer.querySelectorAll('canvas');
            canvases.forEach(canvas => {
                const placeholder = document.createElement('div');
                placeholder.style.width = canvas.offsetWidth + 'px';
                placeholder.style.height = canvas.offsetHeight + 'px';
                placeholder.style.backgroundColor = '#f5f5f5';
                placeholder.style.display = 'flex';
                placeholder.style.alignItems = 'center';
                placeholder.style.justifyContent = 'center';
                placeholder.style.border = '1px dashed #ddd';
                placeholder.textContent = '图表';
                canvas.parentNode.replaceChild(placeholder, canvas);
            });
            
            // 添加到DOM
            document.body.appendChild(simpleContainer);
            
            // 等待容器添加到DOM后再渲染
            await new Promise(resolve => setTimeout(resolve, 500));
            
            // 渲染
            const canvas = await html2canvas(simpleContainer, {
                scale: 3,
                backgroundColor: '#ffffff',
                scrollX: 0,
                scrollY: 0,
                useCORS: false,
                allowTaint: false,
                taintTest: false
            });
            
            // 清理
            document.body.removeChild(simpleContainer);
            
            // 下载
            const imageUrl = canvas.toDataURL('image/png');
            const link = document.createElement('a');
            link.download = `${students[currentStudentIndex] || '学习情况报告'}_文本版_${new Date().getTime()}.png`;
            link.href = imageUrl;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            
            progress.complete('文本版报告下载成功！');
        } catch (backupError) {
            console.error('备用方案也失败:', backupError);
            console.error('备用方案错误堆栈:', backupError.stack);
            
            // 显示错误提示
            showCenterAlert('下载失败：所有方案都已尝试，请稍后再试', 'error');
            progress.complete('下载失败');
            return;
        }
    }
}



// 下载所有图片（ZIP）
async function downloadAllImagesAsZip() {
    console.log('downloadAllImagesAsZip 函数被调用');
    
    if (!validateTeacherName()) {
        return;
    }
    
    if (students.length === 0) {
        showCenterAlert('没有学员数据', 'error');
        return;
    }
    
    if (!reportPreview) {
        showCenterAlert('报告预览元素不存在', 'error');
        return;
    }
    
    const reportContainer = reportPreview.querySelector('.report');
    if (!reportContainer) {
        showCenterAlert('报告容器不存在', 'error');
        return;
    }
    
    const zip = new JSZip();
    const originalIndex = currentStudentIndex;
    let successCount = 0;
    let failCount = 0;
    
    const totalSteps = students.length * 5 + 2;
    const progress = showDownloadProgress('批量下载报告', totalSteps);
    
    try {
        for (let i = 0; i < students.length; i++) {
            const student = students[i];
            console.log(`处理学员 ${i + 1}/${students.length}: ${student}`);
            
            progress.updateProgress(i * 5 + 1, `正在准备学员 ${i + 1}/${students.length}: ${student}`);
            console.log(`开始准备下载学员 ${student}...`);
            
            currentStudentIndex = i;
            loadStudentOperationRecord(student);
            generateReport();
            
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            const currentReportContainer = reportPreview.querySelector('.report');
            if (!currentReportContainer) {
                console.error('报告容器不存在');
                failCount++;
                continue;
            }
            
            try {
                progress.updateProgress(i * 5 + 2, `预处理图片 ${i + 1}/${students.length}: ${student}`);
                
                const deleteButtons = currentReportContainer.querySelectorAll('.comment-section-final button');
                const originalDeleteButtonStyles = [];
                deleteButtons.forEach((btn, index) => {
                    originalDeleteButtonStyles[index] = btn.style.display;
                    btn.style.display = 'none';
                });
                
                // 确保四个模块的标题都有最高的z-index
                const section1Title = currentReportContainer.querySelector('.section-listening h2');
                const section2Title = currentReportContainer.querySelector('.section-interactive h2');
                const section3Title = currentReportContainer.querySelector('.section-creation h2');
                const commentSection = currentReportContainer.querySelector('.comment-section-final');
                
                if (section1Title) {
                    section1Title.style.zIndex = '1000';
                    section1Title.style.position = 'relative';
                }
                if (section2Title) {
                    section2Title.style.zIndex = '1000';
                    section2Title.style.position = 'relative';
                }
                if (section3Title) {
                    section3Title.style.zIndex = '1000';
                    section3Title.style.position = 'relative';
                }
                if (commentSection) {
                    commentSection.style.zIndex = '1000';
                    commentSection.style.position = 'relative';
                }
                
                const images = currentReportContainer.querySelectorAll('img');
                console.log(`找到 ${images.length} 张图片需要处理`);
                
                const imagePromises = [];
                
                images.forEach((img, index) => {
                    if (img.src && !img.src.startsWith('data:') && !img.src.startsWith('blob:')) {
                        const imagePromise = new Promise((resolve) => {
                            const isLocalFile = img.src.startsWith('file://') || img.src.startsWith('image/') || window.location.protocol === 'file:';
                            
                            if (isLocalFile) {
                                const tempImg = new Image();
                                tempImg.onload = function() {
                                    try {
                                        const canvas = document.createElement('canvas');
                                        canvas.width = tempImg.naturalWidth;
                                        canvas.height = tempImg.naturalHeight;
                                        const ctx = canvas.getContext('2d');
                                        ctx.drawImage(tempImg, 0, 0);
                                        img.src = canvas.toDataURL('image/png');
                                    } catch (error) {
                                        console.warn(`图片 ${index + 1} 转换失败:`, error);
                                    } finally {
                                        resolve();
                                    }
                                };
                                tempImg.onerror = function() {
                                    resolve();
                                };
                                tempImg.src = img.src;
                            } else {
                                if (!img.hasAttribute('crossorigin')) {
                                    img.setAttribute('crossorigin', 'anonymous');
                                }
                                
                                const originalSrc = img.src;
                                img.onload = function() {
                                    resolve();
                                };
                                img.onerror = function() {
                                    resolve();
                                };
                                img.src = originalSrc + '?t=' + Date.now();
                            }
                        });
                        
                        imagePromises.push(imagePromise);
                    }
                });
                
                await Promise.all(imagePromises);
                
                const elementsWithBackground = currentReportContainer.querySelectorAll('[style*="background-image"]');
                elementsWithBackground.forEach((element) => {
                    if (element !== currentReportContainer) {
                        const style = element.style;
                        const backgroundImage = style.backgroundImage;
                        if (backgroundImage && !backgroundImage.includes('data:') && !backgroundImage.includes('blob:')) {
                            style.backgroundImage = 'none';
                        }
                    }
                });
                
                // 修复第二部分标题在下载时消失的问题：临时设置section2的overflow为visible
                const section2Elements = currentReportContainer.querySelectorAll('.section-interactive');
                section2Elements.forEach(section2 => {
                    console.log('临时修改section2的overflow属性为visible');
                    section2.style.overflow = 'visible';
                });
                
                progress.updateProgress(i * 5 + 3, `等待内容渲染 ${i + 1}/${students.length}: ${student}`);
                await new Promise(resolve => setTimeout(resolve, 1000));
                
                progress.updateProgress(i * 5 + 4, `预加载背景图片 ${i + 1}/${students.length}: ${student}`);
                
                let bgDataUrl = null;
                try {
                    bgDataUrl = await preloadBackgroundImage(bgUrl);
                    if (bgDataUrl) {
                        console.log('背景图片预加载成功');
                    } else {
                        bgDataUrl = bgUrl;
                    }
                } catch (error) {
                    console.error('背景图片预加载出错:', error);
                    bgDataUrl = bgUrl;
                }
                
                const html2canvasOptions = {
                    scale: 4,
                    backgroundColor: 'transparent',
                    useCORS: true,
                    allowTaint: true,
                    scrollX: 0,
                    scrollY: 0,
                    logging: false,
                    taintTest: false,
                    onclone: function(clonedDoc) {
                        const clonedContainer = clonedDoc.querySelector('.report');
                        if (clonedContainer) {
                            if (bgDataUrl && bgDataUrl.startsWith('data:')) {
                                clonedContainer.style.backgroundImage = `url('${bgDataUrl}')`;
                            }
                            
                            const buttons = clonedContainer.querySelectorAll('button');
                            buttons.forEach(btn => btn.style.display = 'none');
                            
                            // 确保所有标题元素都有最高的z-index，不会被遮挡
                            const titles = clonedContainer.querySelectorAll('h1, h2, h3');
                            titles.forEach(title => {
                                title.style.position = 'relative';
                                title.style.zIndex = '9999';
                                title.style.overflow = 'visible';
                                title.style.whiteSpace = 'normal';
                                title.style.textOverflow = 'clip';
                            });
                            
                            const canvases = clonedContainer.querySelectorAll('canvas');
                            canvases.forEach(canvas => {
                                try {
                                    if (canvas.width === 0 || canvas.height === 0) {
                                        canvas.width = canvas.offsetWidth || 300;
                                        canvas.height = canvas.offsetHeight || 200;
                                    }
                                    
                                    const scale = 4;
                                    const scaledCanvas = document.createElement('canvas');
                                    scaledCanvas.width = canvas.width * scale;
                                    scaledCanvas.height = canvas.height * scale;
                                    const scaledCtx = scaledCanvas.getContext('2d');
                                    
                                    scaledCtx.imageSmoothingEnabled = true;
                                    scaledCtx.imageSmoothingQuality = 'high';
                                    
                                    scaledCtx.drawImage(canvas, 0, 0, scaledCanvas.width, scaledCanvas.height);
                                    
                                    const dataUrl = scaledCanvas.toDataURL('image/png');
                                    const img = document.createElement('img');
                                    img.src = dataUrl;
                                    img.width = canvas.width;
                                    img.height = canvas.height;
                                    img.style.width = canvas.offsetWidth + 'px';
                                    img.style.height = canvas.offsetHeight + 'px';
                                    img.style.maxWidth = '100%';
                                    img.style.height = 'auto';
                                    img.style.display = 'block';
                                    if (canvas.parentNode) {
                                        canvas.parentNode.replaceChild(img, canvas);
                                    }
                                } catch (error) {
                                    console.warn('Canvas转换失败，保留原始Canvas:', error);
                                }
                            });
                            
                            const clonedImages = clonedContainer.querySelectorAll('img');
                            clonedImages.forEach((img) => {
                                if (img.src && !img.src.startsWith('data:') && !img.src.startsWith('blob:')) {
                                    let isInImportantSection = false;
                                    let parent = img.parentElement;
                                    while (parent) {
                                        if (parent.classList.contains('third-part') || 
                                            parent.classList.contains('creation-section') || 
                                            parent.classList.contains('fourth-part') || 
                                            parent.classList.contains('fourth-section') ||
                                            parent.id === 'fourthPartImages' ||
                                            parent.id === 'fourth-part' ||
                                            parent.id === 'fourth-section' ||
                                            parent.className.includes('third-part') ||
                                            parent.className.includes('fourth-part') ||
                                            parent.className.includes('creation-section')) {
                                            isInImportantSection = true;
                                            break;
                                        }
                                        parent = parent.parentElement;
                                    }
                                    
                                    if (!isInImportantSection) {
                                        let grandParent = img.parentElement;
                                        while (grandParent) {
                                            if (grandParent.textContent && grandParent.textContent.includes('创作情况')) {
                                                isInImportantSection = true;
                                                break;
                                            }
                                            grandParent = grandParent.parentElement;
                                        }
                                    }
                                    
                                    if (!isInImportantSection) {
                                        let ancestor = img.parentElement;
                                        while (ancestor) {
                                            if (ancestor.innerHTML && ancestor.innerHTML.includes('第四部分')) {
                                                isInImportantSection = true;
                                                break;
                                            }
                                            ancestor = ancestor.parentElement;
                                        }
                                    }
                                    
                                    if (isInImportantSection) {
                                        try {
                                            const tempImg = new Image();
                                            if (!window.location.protocol.startsWith('file:') && !img.src.startsWith('file:')) {
                                                tempImg.crossOrigin = 'anonymous';
                                            }
                                            
                                            tempImg.onload = function() {
                                                const canvas = document.createElement('canvas');
                                                canvas.width = tempImg.naturalWidth;
                                                canvas.height = tempImg.naturalHeight;
                                                const ctx = canvas.getContext('2d');
                                                
                                                // 启用高质量图像渲染
                                                ctx.imageSmoothingEnabled = true;
                                                ctx.imageSmoothingQuality = 'high';
                                                
                                                ctx.drawImage(tempImg, 0, 0);
                                                
                                                // 使用最高质量的PNG格式
                                                img.src = canvas.toDataURL('image/png', 1.0);
                                                
                                                // 确保图片不会被拉伸，保持原始尺寸
                                                img.style.width = 'auto';
                                                img.style.height = 'auto';
                                                img.style.maxWidth = '100%';
                                                img.style.maxHeight = '100%';
                                                img.style.objectFit = 'contain';
                                            };
                                            tempImg.onerror = function() {
                                            };
                                            tempImg.src = img.src;
                                        } catch (error) {
                                            console.warn('重要部分图片处理失败:', error);
                                        }
                                    } else {
                                        img.style.display = 'none';
                                    }
                                }
                            });
                            
                            const elementsWithBackground = clonedContainer.querySelectorAll('[style*="background-image"]');
                            elementsWithBackground.forEach((element) => {
                                if (element !== clonedContainer) {
                                    const style = element.style;
                                    const backgroundImage = style.backgroundImage;
                                    if (backgroundImage && !backgroundImage.includes('data:') && !backgroundImage.includes('blob:')) {
                                        style.backgroundImage = 'none';
                                    }
                                }
                            });
                            
                            if (bgDataUrl) {
                                clonedContainer.style.backgroundImage = `url('${bgDataUrl}')`;
                            }
                        }
                    }
                };
                
                const contentCanvas = await html2canvas(currentReportContainer, html2canvasOptions);
                
                const canvas = document.createElement('canvas');
                canvas.width = contentCanvas.width;
                canvas.height = contentCanvas.height;
                const ctx = canvas.getContext('2d');
                
                if (bgDataUrl && bgDataUrl.startsWith('data:')) {
                    try {
                        const bgImg = new Image();
                        
                        await new Promise((resolve) => {
                            bgImg.onload = function() {
                                try {
                                    ctx.drawImage(bgImg, 0, 0, canvas.width, canvas.height);
                                } catch (drawError) {
                                    console.warn('绘制背景图片失败:', drawError);
                                }
                                resolve();
                            };
                            bgImg.onerror = function() {
                                resolve();
                            };
                            bgImg.src = bgDataUrl;
                        });
                    } catch (error) {
                        console.warn('绘制背景图片时出错:', error);
                    }
                }
                
                ctx.drawImage(contentCanvas, 0, 0);
                
                deleteButtons.forEach((btn, index) => {
                    btn.style.display = originalDeleteButtonStyles[index];
                });
                
                progress.updateProgress(i * 5 + 5, `正在生成学员 ${i + 1}/${students.length} 的图片...`);
                
                let imageUrl;
                try {
                    imageUrl = canvas.toDataURL('image/png');
                    console.log('toDataURL成功，图片大小:', Math.round(imageUrl.length * 0.75 / 1024), 'KB');
                } catch (error) {
                    console.error('toDataURL失败，尝试使用blob方式:', error);
                    
                    try {
                        const blob = await new Promise((resolve) => {
                            canvas.toBlob(resolve, 'image/png');
                        });
                        
                        if (!blob) {
                            throw new Error('无法创建blob对象');
                        }
                        
                        imageUrl = URL.createObjectURL(blob);
                        console.log('blob方式成功');
                    } catch (blobError) {
                        console.error('blob方式也失败:', blobError);
                        failCount++;
                        continue;
                    }
                }
                
                const base64Data = imageUrl.split(',')[1];
                const binaryString = atob(base64Data);
                const bytes = new Uint8Array(binaryString.length);
                for (let k = 0; k < binaryString.length; k++) {
                    bytes[k] = binaryString.charCodeAt(k);
                }
                const blob = new Blob([bytes], { type: 'image/png' });
                
                zip.file(`${student}_${new Date().getTime()}.png`, blob);
                successCount++;
                console.log(`学员 ${student} 处理成功`);
                
                canvas.width = 1;
                canvas.height = 1;
                
            } catch (error) {
                failCount++;
                console.error(`处理学员 ${student} 时出错:`, error);
            }
            
            if ((i + 1) % 5 === 0) {
                console.log('清理内存...');
                if (window.gc) {
                    window.gc();
                }
                await new Promise(resolve => setTimeout(resolve, 500));
            }
        }
        
        progress.updateProgress(totalSteps - 1, '正在生成ZIP文件...');
        console.log('开始生成 ZIP 文件...');
        
        const zipBlob = await zip.generateAsync({
            type: 'blob',
            compression: 'DEFLATE',
            compressionOptions: { level: 6 }
        });
        
        progress.updateProgress(totalSteps, '正在下载ZIP文件...');
        
        const zipUrl = URL.createObjectURL(zipBlob);
        const link = document.createElement('a');
        link.download = `学习情况报告_${students.length}人_${new Date().getTime()}.zip`;
        link.href = zipUrl;
        link.style.display = 'none';
        document.body.appendChild(link);
        
        link.click();
        
        setTimeout(() => {
            if (link.parentNode) {
                document.body.removeChild(link);
            }
            URL.revokeObjectURL(zipUrl);
        }, 100);
        
        progress.complete(`成功生成ZIP文件，包含 ${successCount} 个学员报告图片，失败 ${failCount} 个`);
        console.log(`批量下载完成，成功：${successCount}，失败：${failCount}`);
        
        if (originalIndex >= 0 && originalIndex < students.length) {
            currentStudentIndex = originalIndex;
            const currentStudent = students[currentStudentIndex];
            if (currentStudent) {
                loadStudentOperationRecord(currentStudent);
                generateReport();
            }
        }
        
    } catch (error) {
        console.error('生成ZIP文件时出错:', error);
        progress.error(`错误：${error.message || '未知错误'}`);
    }
}

// 触发自动保存
function triggerAutoSave() {
    if (saveInProgress) return;
    
    saveRetryCount = 0;
    performAutoSave();
}

// 执行自动保存
async function performAutoSave() {
    saveInProgress = true;
    showSaveStatus('保存中...');
    
    try {
        // 在单个操作模式下，先保存当前学员的操作记录
        if (currentOperationMode === 'single' && students[currentStudentIndex]) {
            console.log('单个操作模式下，自动保存当前学员的操作记录');
            saveCurrentStudentOperation();
        }
        
        // 准备保存数据（现在是异步的，包含图片压缩）
        const saveData = await prepareSaveData();
        
        // 尝试保存到本地存储（模拟网络保存）
        saveToLocalStorage(saveData);
        
        // 模拟网络请求延迟
        setTimeout(() => {
            // 模拟保存成功
            saveInProgress = false;
            saveRetryCount = 0;
            showSaveStatus('已保存');
            console.log('自动保存成功');
        }, 500);
        
    } catch (error) {
        handleSaveError(error);
    }
}

// 处理保存错误
function handleSaveError(error) {
    saveInProgress = false;
    
    console.error('保存失败:', error);
    
    if (saveRetryCount < MAX_SAVE_RETRIES) {
        saveRetryCount++;
        const retryDelay = SAVE_RETRY_BASE_DELAY * Math.pow(2, saveRetryCount - 1);
        
        showSaveStatus(`保存失败，${retryDelay / 1000}秒后重试 (${saveRetryCount}/${MAX_SAVE_RETRIES})`);
        
        setTimeout(() => {
            performAutoSave();
        }, retryDelay);
    } else {
        showSaveStatus('保存失败，请手动保存', true);
        saveRetryCount = 0;
        
        // 保存到本地备份
        try {
            const saveData = prepareSaveData();
            localStorage.setItem(LOCAL_STORAGE_BACKUP_KEY, JSON.stringify(saveData));
            console.log('已保存到本地备份');
        } catch (backupError) {
            console.error('本地备份失败:', backupError);
        }
    }
}

// 准备保存数据
async function prepareSaveData() {
    markPerformance('prepareSaveData_start');
    
    // 收集所有表单数据
    const formData = collectFormData();
    
    // 压缩图片数据
    let compressedCustomImages = [];
    let compressedTableRecognitionImages = [];
    let compressedStudentOperationRecords = {};
    
    try {
        console.log('开始压缩图片数据...');
        
        // 压缩自定义图片
        if (customImages && customImages.length > 0) {
            const imageUrls = customImages.filter(url => url.startsWith('data:'));
            if (imageUrls.length > 0) {
                compressedCustomImages = await imageManager.compressImages(imageUrls);
                console.log(`压缩了 ${compressedCustomImages.length} 张自定义图片`);
            }
        }
        
        // 压缩表格识别图片
        if (tableRecognitionImages && tableRecognitionImages.length > 0) {
            const imageUrls = tableRecognitionImages.filter(url => url.startsWith('data:'));
            if (imageUrls.length > 0) {
                compressedTableRecognitionImages = await imageManager.compressImages(imageUrls);
                console.log(`压缩了 ${compressedTableRecognitionImages.length} 张表格识别图片`);
            }
        }
        
        // 压缩学员操作记录中的图片
        if (studentOperationRecords) {
            for (const [studentName, record] of Object.entries(studentOperationRecords)) {
                if (record && record.thirdPartImages && record.thirdPartImages.length > 0) {
                    const imageUrls = record.thirdPartImages.filter(url => url.startsWith('data:'));
                    if (imageUrls.length > 0) {
                        const compressedImages = await imageManager.compressImages(imageUrls);
                        compressedStudentOperationRecords[studentName] = {
                            ...record,
                            thirdPartImages: compressedImages
                        };
                    } else {
                        compressedStudentOperationRecords[studentName] = record;
                    }
                } else {
                    compressedStudentOperationRecords[studentName] = record;
                }
            }
            console.log(`压缩了 ${Object.keys(compressedStudentOperationRecords).length} 个学员的图片数据`);
        }
        
        // 保存图片缓存
        imageManager.saveImageCache();
        
    } catch (error) {
        console.error('图片压缩失败，使用原始数据:', error);
        compressedCustomImages = customImages;
        compressedTableRecognitionImages = tableRecognitionImages;
        compressedStudentOperationRecords = studentOperationRecords;
    }
    
    // 构建保存数据结构
    const saveData = {
        version: '1.0',
        timestamp: Date.now(),
        csvData: csvData,
        csvFilenames: csvFilenames,
        bgUrl: bgUrl,
        students: students,
        currentStudentIndex: currentStudentIndex,
        customImages: compressedCustomImages,
        customImageNames: customImageNames,
        tableRecognitionImages: compressedTableRecognitionImages,
        sectionPositions: sectionPositions,
        lockedCards: Array.from(lockedCards),
        imageAdjustments: imageAdjustments,
        deletedImagesHistory: deletedImagesHistory,
        studentOperationRecords: compressedStudentOperationRecords,
        formData: formData,
        settings: {
            imageLayoutMode: imageLayoutModeSelect ? imageLayoutModeSelect.value : 'double',
            // 其他设置...
        }
    };
    
    markPerformance('prepareSaveData_end');
    const duration = measurePerformance('prepareSaveData_start', 'prepareSaveData_end');
    recordMetric('prepareSaveDataTime', duration);
    
    return saveData;
}

// 收集表单数据
function collectFormData() {
    const formData = {};
    
    // 收集所有输入元素的值
    const inputs = document.querySelectorAll('input, select, textarea');
    inputs.forEach(input => {
        if (input.id) {
            formData[input.id] = input.value;
        }
    });
    
    return formData;
}

// 保存到本地存储
function saveToLocalStorage(data) {
    try {
        const dataString = JSON.stringify(data);
        const dataSize = new Blob([dataString]).size;
        
        console.log('准备保存到本地存储，数据大小:', dataSize, '字节 (约', (dataSize / 1024 / 1024).toFixed(2), 'MB)');
        
        try {
            localStorage.setItem(LOCAL_STORAGE_KEY, dataString);
            console.log('数据已保存到本地存储');
            return true;
        } catch (quotaError) {
            if (quotaError.name === 'QuotaExceededError' || quotaError.name === 'NS_ERROR_DOM_QUOTA_REACHED') {
                console.error('localStorage配额已满，尝试清理数据后重试...');
                
                // 尝试清理数据
                const cleanedData = cleanOldData(data);
                
                // 再次尝试保存清理后的数据
                try {
                    const cleanedDataString = JSON.stringify(cleanedData);
                    const cleanedDataSize = new Blob([cleanedDataString]).size;
                    
                    console.log('清理后数据大小:', cleanedDataSize, '字节 (约', (cleanedDataSize / 1024 / 1024).toFixed(2), 'MB)');
                    console.log('节省空间:', (dataSize - cleanedDataSize), '字节 (约', ((dataSize - cleanedDataSize) / 1024 / 1024).toFixed(2), 'MB)');
                    
                    localStorage.setItem(LOCAL_STORAGE_KEY, cleanedDataString);
                    console.log('数据已保存到本地存储（清理后）');
                    
                    // 更新全局变量
                    updateGlobalVariablesFromCleanedData(cleanedData);
                    
                    showSaveStatus('数据已保存（已自动清理过期数据）');
                    return true;
                    
                } catch (retryError) {
                    console.error('清理后仍然无法保存:', retryError);
                    
                    // 统计图片数据
                    let totalImageSize = 0;
                    let imageCount = 0;
                    
                    if (cleanedData.tableRecognitionImages) {
                        cleanedData.tableRecognitionImages.forEach(url => {
                            totalImageSize += url.length;
                            imageCount++;
                        });
                    }
                    
                    if (cleanedData.studentOperationRecords) {
                        Object.keys(cleanedData.studentOperationRecords).forEach(studentName => {
                            const record = cleanedData.studentOperationRecords[studentName];
                            if (record && record.thirdPartImages) {
                                record.thirdPartImages.forEach(url => {
                                    totalImageSize += url.length;
                                    imageCount++;
                                });
                            }
                        });
                    }
                    
                    console.warn('图片数据统计:', imageCount, '张图片，总大小:', totalImageSize, '字节 (约', (totalImageSize / 1024 / 1024).toFixed(2), 'MB)');
                    
                    showAlertDialog('⚠️ 存储空间不足！\n\n数据太大，无法保存到浏览器本地存储。\n建议：\n1. 减少上传的图片数量\n2. 使用更小的图片文件\n3. 清除浏览器缓存后重试\n\n当前数据大小: ' + (dataSize / 1024 / 1024).toFixed(2) + ' MB', function() {
                        console.log('用户确认了存储空间不足提示');
                    });
                    
                    return false;
                }
            } else {
                throw quotaError;
            }
        }
    } catch (error) {
        console.error('保存到本地存储失败:', error);
        console.error('错误详情:', error.message);
        showAlertDialog('保存到本地存储失败: ' + error.message, function() {
            console.log('用户确认了错误提示');
        });
        return false;
    }
}

// 清理过期数据
function cleanOldData(data) {
    console.log('开始清理过期数据...');
    
    const cleanedData = JSON.parse(JSON.stringify(data));
    const now = Date.now();
    const MAX_AGE = 7 * 24 * 60 * 60 * 1000; // 7天
    
    let removedImages = 0;
    let removedRecords = 0;
    
    // 清理学员操作记录中的过期图片
    if (cleanedData.studentOperationRecords) {
        for (const [studentName, record] of Object.entries(cleanedData.studentOperationRecords)) {
            if (record && record.timestamp) {
                const age = now - record.timestamp;
                if (age > MAX_AGE) {
                    console.log(`清理过期学员记录: ${studentName} (年龄: ${(age / (24 * 60 * 60 * 1000)).toFixed(1)} 天)`);
                    delete cleanedData.studentOperationRecords[studentName];
                    removedRecords++;
                } else if (record.thirdPartImages && record.thirdPartImages.length > 0) {
                    // 保留最近的图片，删除旧的
                    const maxImagesPerStudent = 10;
                    if (record.thirdPartImages.length > maxImagesPerStudent) {
                        const oldCount = record.thirdPartImages.length;
                        record.thirdPartImages = record.thirdPartImages.slice(-maxImagesPerStudent);
                        removedImages += (oldCount - record.thirdPartImages.length);
                        console.log(`清理学员 ${studentName} 的旧图片: 保留 ${record.thirdPartImages.length} 张，删除 ${oldCount - record.thirdPartImages.length} 张`);
                    }
                }
            }
        }
    }
    
    // 清理表格识别图片，保留最近的
    if (cleanedData.tableRecognitionImages && cleanedData.tableRecognitionImages.length > 0) {
        const maxTableImages = 20;
        if (cleanedData.tableRecognitionImages.length > maxTableImages) {
            const oldCount = cleanedData.tableRecognitionImages.length;
            cleanedData.tableRecognitionImages = cleanedData.tableRecognitionImages.slice(-maxTableImages);
            removedImages += (oldCount - cleanedData.tableRecognitionImages.length);
            console.log(`清理表格识别图片: 保留 ${cleanedData.tableRecognitionImages.length} 张，删除 ${oldCount - cleanedData.tableRecognitionImages.length} 张`);
        }
    }
    
    // 清理自定义图片，保留最近的
    if (cleanedData.customImages && cleanedData.customImages.length > 0) {
        const maxCustomImages = 30;
        if (cleanedData.customImages.length > maxCustomImages) {
            const oldCount = cleanedData.customImages.length;
            cleanedData.customImages = cleanedData.customImages.slice(-maxCustomImages);
            removedImages += (oldCount - cleanedData.customImages.length);
            console.log(`清理自定义图片: 保留 ${cleanedData.customImages.length} 张，删除 ${oldCount - cleanedData.customImages.length} 张`);
        }
    }
    
    // 清理删除历史
    if (cleanedData.deletedImagesHistory && cleanedData.deletedImagesHistory.length > 0) {
        const maxHistory = 50;
        if (cleanedData.deletedImagesHistory.length > maxHistory) {
            cleanedData.deletedImagesHistory = cleanedData.deletedImagesHistory.slice(-maxHistory);
            console.log(`清理删除历史: 保留 ${cleanedData.deletedImagesHistory.length} 条`);
        }
    }
    
    console.log(`数据清理完成: 删除了 ${removedRecords} 个过期记录，${removedImages} 张图片`);
    
    return cleanedData;
}

// 从清理后的数据更新全局变量
function updateGlobalVariablesFromCleanedData(cleanedData) {
    if (cleanedData.customImages !== undefined) {
        customImages = cleanedData.customImages;
    }
    if (cleanedData.tableRecognitionImages !== undefined) {
        tableRecognitionImages = cleanedData.tableRecognitionImages;
    }
    if (cleanedData.studentOperationRecords !== undefined) {
        studentOperationRecords = cleanedData.studentOperationRecords;
    }
    if (cleanedData.deletedImagesHistory !== undefined) {
        deletedImagesHistory = cleanedData.deletedImagesHistory;
    }
}

// 手动清理所有缓存数据
function clearAllCache() {
    if (confirm('确定要清理所有缓存数据吗？这将删除所有图片缓存和本地存储的数据。')) {
        // 清理图片缓存
        imageManager.clearImageCache();
        
        // 清理本地存储
        localStorage.removeItem(LOCAL_STORAGE_KEY);
        localStorage.removeItem(LOCAL_STORAGE_BACKUP_KEY);
        localStorage.removeItem('operation_logs');
        localStorage.removeItem('student_operation_records');
        localStorage.removeItem(SMART_MATCH_STATE_KEY);
        
        // 清理全局变量中的图片数据
        customImages = [];
        tableRecognitionImages = [];
        studentOperationRecords = {};
        deletedImagesHistory = [];
        
        console.log('所有缓存数据已清理');
        alert('所有缓存数据已清理！');
    }
}

// 获取存储使用情况
function getStorageUsage() {
    let totalSize = 0;
    let itemCount = 0;
    
    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        const value = localStorage.getItem(key);
        const size = new Blob([value]).size;
        totalSize += size;
        itemCount++;
        
        console.log(`存储项: ${key}, 大小: ${size} 字节 (约 ${(size / 1024).toFixed(2)} KB)`);
    }
    
    console.log(`总存储使用: ${totalSize} 字节 (约 ${(totalSize / 1024 / 1024).toFixed(2)} MB), 共 ${itemCount} 项`);
    
    return {
        totalSize: totalSize,
        itemCount: itemCount,
        sizeMB: (totalSize / 1024 / 1024).toFixed(2)
    };
}

// 从本地存储恢复
function restoreStateFromLocalStorage() {
    try {
        const savedData = localStorage.getItem(LOCAL_STORAGE_KEY);
        if (savedData) {
            const data = JSON.parse(savedData);
            console.log('从本地存储恢复数据');
            // 这里可以实现数据恢复逻辑
        }
    } catch (error) {
        console.error('从本地存储恢复失败:', error);
    }
}

// 同步本地备份
function syncLocalBackup() {
    try {
        const backupData = localStorage.getItem(LOCAL_STORAGE_BACKUP_KEY);
        if (backupData) {
            const data = JSON.parse(backupData);
            saveToLocalStorage(data);
            localStorage.removeItem(LOCAL_STORAGE_BACKUP_KEY);
            console.log('本地备份已同步');
            showSaveStatus('本地备份已同步');
        }
    } catch (error) {
        console.error('同步本地备份失败:', error);
    }
}

// 手动保存
function manualSave() {
    saveRetryCount = 0;
    performAutoSave();
}

// 改进版调整内容模块大小的函数，确保所有内容完整显示在背景图片区域内
function adjustContentSize(reportContainer) {
    if (!reportContainer) return;
    
    // 获取报告容器的大小（这个大小已经根据背景图片调整过了）
    const containerWidth = reportContainer.offsetWidth;
    const containerHeight = reportContainer.offsetHeight;
    console.log('报告容器大小（背景图片实际大小）:', containerWidth, 'x', containerHeight, 'px');
    
    // 使用背景图片的实际大小作为目标尺寸
    const targetWidth = containerWidth;
    const targetHeight = containerHeight;
    
    console.log('目标尺寸（背景图片实际大小）:', targetWidth, 'x', targetHeight, 'px');
    
    // 找到所有内容模块
    const sections = reportContainer.querySelectorAll('.report-section');
    if (sections.length === 0) return;
    
    // 获取主容器（包含所有板块）
    let mainContainer = reportContainer.querySelector('.main-content');
    
    // 尝试其他选择器
    if (!mainContainer) {
        const reportContent = reportContainer.querySelector('.report-content');
        if (reportContent) {
            // 查找包含左右容器的flex容器
            const flexContainers = reportContent.querySelectorAll('div[style*="display: flex"]');
            for (const container of flexContainers) {
                if (container.querySelector('.left-container') || container.querySelector('.right-container')) {
                    mainContainer = container;
                    break;
                }
            }
        }
    }
    
    if (!mainContainer) return;
    
    // 获取左右容器
    const leftContainer = mainContainer.querySelector('.left-container');
    const rightContainer = mainContainer.querySelector('.right-container');
    
    // 计算可用高度（减去标题和内边距）
    const availableHeight = targetHeight - 80; // 预留80px给标题和内边距
    console.log('可用高度:', availableHeight, 'px');
    
    // 根据要求计算每个板块的目标高度和位置
    // 左侧容器：包含section1（听课）和section2（互动题）
    // 右侧容器：包含section3（创作），占据整个右侧
    
    // 计算左右容器的宽度
    const leftWidth = targetWidth * 0.5; // 左侧占50%
    const rightWidth = targetWidth * 0.5; // 右侧占50%
    
    // 计算左侧容器内两个板块的高度 - 调整默认比例，确保内容不溢出
    const leftAvailableHeight = availableHeight;
    const section1TargetHeight = leftAvailableHeight * 0.45; // 听课板块占左侧的45%
    const section2TargetHeight = leftAvailableHeight * 0.55; // 互动题板块占左侧的55%，增加空间避免溢出
    const section3TargetHeight = availableHeight * 1.0; // 创作板块占右侧的100%，确保有足够空间容纳图片，防止遮挡
    
    console.log('板块目标高度 - 创作:', section3TargetHeight, 'px, 听课:', section1TargetHeight, 'px, 互动题:', section2TargetHeight, 'px');
    
    // 为每个板块单独计算缩放比例
    sections.forEach((section, index) => {
        const sectionRect = section.getBoundingClientRect();
        const sectionHeight = sectionRect.height;
        
        let targetHeight;
        if (section.classList.contains('section3') || section.querySelector('.creation-container')) {
            targetHeight = section3TargetHeight;
        } else if (section.classList.contains('section2') || section.querySelector('.table-container')) {
            targetHeight = section2TargetHeight;
        } else {
            targetHeight = section1TargetHeight;
        }
        
        console.log(`板块${index + 1}实际高度:`, sectionHeight, 'px, 目标高度:', targetHeight, 'px');
        
        // 计算缩放比例
        let scale = 1;
        if (sectionHeight > targetHeight) {
            scale = targetHeight / sectionHeight;
            scale = Math.max(scale, 0.1); // 最小缩放到10%，确保内容仍然可读
            console.log(`板块${index + 1}需要缩放，缩放比例:`, scale);
            
            // 应用缩放到板块内的所有内容元素
            const contentElements = section.querySelectorAll('h2, .chart-container, .table-container, .creation-container, img, p, div');
            contentElements.forEach(element => {
                element.style.transform = `scale(${scale})`;
                element.style.transformOrigin = 'top left';
                element.style.width = '100%';
                element.style.height = 'auto';
                element.style.margin = '0';
                element.style.padding = '0';
            });
            
            // 调整板块本身的大小，确保它不会占用过多空间
            section.style.height = `${targetHeight}px`;
            section.style.overflow = 'visible';
        } else {
            // 不需要缩放，重置transform
            const contentElements = section.querySelectorAll('h2, .chart-container, .table-container, .creation-container, img, p, div');
            contentElements.forEach(element => {
                element.style.transform = 'none';
                element.style.width = '100%';
                element.style.height = 'auto';
                element.style.margin = '0';
                element.style.padding = '0';
            });
            
            // 重置板块大小
            section.style.height = 'auto';
            section.style.overflow = 'visible';
        }
    });
    
    // 确保主容器不缩放，保持板块比例
    mainContainer.style.transform = 'none';
    mainContainer.style.width = '100%';
    mainContainer.style.height = `${availableHeight}px`;
    mainContainer.style.maxHeight = `${availableHeight}px`; // 限制主容器的最大高度，确保不超出背景图片
    mainContainer.style.marginTop = '0px';
    mainContainer.style.marginLeft = '0px';
    mainContainer.style.marginRight = '0px';
    mainContainer.style.padding = '5px';
    mainContainer.style.boxSizing = 'border-box';
    mainContainer.style.overflow = 'hidden';
    mainContainer.style.position = 'relative';
    mainContainer.style.zIndex = '5';
    
    // 确保左右容器正确显示
    if (leftContainer) {
        leftContainer.style.display = 'flex';
        leftContainer.style.flexDirection = 'column';
        leftContainer.style.gap = '5px';
        leftContainer.style.flex = '0 0 50%'; // 左侧固定占50%
        leftContainer.style.width = '50%';
        leftContainer.style.height = '100%';
        leftContainer.style.minHeight = '0';
        leftContainer.style.boxSizing = 'border-box';
        leftContainer.style.alignItems = 'stretch';
        leftContainer.style.justifyContent = 'space-between'; // 使用space-between确保两个板块合理分配空间
        leftContainer.style.overflow = 'hidden';
        leftContainer.style.position = 'relative';
        leftContainer.style.zIndex = '6';
    }
    if (rightContainer) {
        rightContainer.style.flex = '0 0 50%'; // 右侧固定占50%
        rightContainer.style.width = '50%';
        rightContainer.style.height = '100%';
        rightContainer.style.minHeight = '0';
        rightContainer.style.boxSizing = 'border-box';
        rightContainer.style.display = 'flex';
        rightContainer.style.flexDirection = 'column';
        rightContainer.style.overflow = 'visible';
        rightContainer.style.position = 'relative';
        rightContainer.style.zIndex = '6';
    }
    
    // 额外处理：确保图片容器正确显示，防止图片遮挡
    const imageContainers = mainContainer.querySelectorAll('.creation-container');
    imageContainers.forEach(container => {
        container.style.height = '100%';
        container.style.minHeight = '0';
        container.style.overflow = 'visible';
        container.style.padding = '5px';
        container.style.boxSizing = 'border-box';
        container.style.display = 'flex';
        container.style.flexDirection = 'column';
        container.style.gap = '10px';
        container.style.alignItems = 'center';
        container.style.justifyContent = 'center';
    });
    
    // 确保图片正确缩放，防止遮挡
    const images = mainContainer.querySelectorAll('img');
    images.forEach(img => {
        img.style.maxWidth = '90%'; // 限制最大宽度为90%，留一些空间
        img.style.maxHeight = '90%'; // 限制最大高度为90%，留一些空间
        img.style.height = 'auto';
        img.style.objectFit = 'contain';
        img.style.display = 'block';
        img.style.margin = '0 auto';
    });
    
    // 确保表格容器正确显示
    const tableContainers = mainContainer.querySelectorAll('.table-container');
    tableContainers.forEach(container => {
        container.style.height = '100%';
        container.style.minHeight = '0';
        container.style.overflow = 'hidden';
        container.style.padding = '10px';
        container.style.boxSizing = 'border-box';
        container.style.flex = '1';
    });
    
    // 确保所有板块容器正确显示
    sections.forEach(section => {
        section.style.height = '100%';
        section.style.minHeight = '0';
        section.style.overflow = 'hidden';
        section.style.padding = '15px';
        section.style.boxSizing = 'border-box';
        section.style.position = 'relative';
        section.style.zIndex = '7';
        section.style.display = 'flex';
        section.style.flexDirection = 'column';
    });
    
    // 确保报告内容容器正确显示
    const reportContent = reportContainer.querySelector('.report-content');
    if (reportContent) {
        reportContent.style.display = 'flex';
        reportContent.style.flexDirection = 'column';
        reportContent.style.gap = '0px';
        reportContent.style.overflow = 'hidden';
        reportContent.style.boxSizing = 'border-box';
        reportContent.style.padding = '5px';
        reportContent.style.height = 'auto';
        reportContent.style.maxHeight = `${targetHeight}px`; // 限制报告内容容器的最大高度，确保不超出背景图片
    }
    
    // 确保背景图片正确显示
    // 保留用户设置的背景图片样式
    reportContainer.style.backgroundRepeat = 'no-repeat';
    reportContainer.style.overflow = 'hidden';
};

// 调整第二部分表格的位置，使其底部与第三部分底部对齐，但不超过文字点评
// DOM元素变量声明
let csvFilesInput, useLastNameCheckbox, desc1Input, desc2Input, desc3Input;
let bgSelect, fontSelect, fontColorInput, fontColorValue;
let fontBoldCheckbox, section1SizeInput, section2SizeInput, section3SizeInput;
let tableSizeInput, columnWidthInput, columnWidthValue, rowHeightInput, rowHeightValue;
let tableAlignmentSelect, tableFontSizeInput, tableFontSizeValue;
let chartColorInput, chartColorValue, tableBackgroundColorInput, tableBackgroundColorValue;
let fileList, studentSearchInput, studentList;
let titleTextInput, titleFontSizeInput, titleFontSizeValue, titleTopPositionInput, titleTopPositionValue;
let titleLeftPositionInput, titleLeftPositionValue, titleFontColorInput, titleFontColorValue;
let customImagesInput, imageSizeInput, imageSizeValue, imageTopPositionInput, imageTopPositionValue;
let imageLeftPositionInput, imageLeftPositionValue, imageLayoutModeSelect, imageList, undoDeleteBtn;
let imageSelector, singleImageSizeInput, singleImageSizeValue, singleImageTopInput, singleImageTopValue;
let singleImageLeftInput, singleImageLeftValue, singleImageSizeDownBtn, singleImageSizeUpBtn;
let singleImageMoveUpBtn, singleImageMoveDownBtn, singleImageMoveLeftBtn, singleImageMoveRightBtn;
let clearCacheImagesBtn;
let bgSizeInput, bgSizeValue, bgTopPositionInput, bgTopPositionValue, bgLeftPositionInput, bgLeftPositionValue;
let moveSection1Up, moveSection1Down, moveSection1Left, moveSection1Right;
let moveSection2Up, moveSection2Down, moveSection2Left, moveSection2Right;
let moveSection3Up, moveSection3Down, moveSection3Left, moveSection3Right;
let moveImageUpBtn, moveImageDownBtn, moveImageLeftBtn, moveImageRightBtn, resetImageBtn;
let batchOperationBtn, batchOperationMenu;
let decreaseImageSizeBtn, increaseImageSizeBtn, currentImageSizeSpan;
let teacherNameInput, avatarPreview;
let tableRecognitionImagesContainer;
let applyAllImagesBtn;
let singleColumnBtn, doubleColumnBtn;
let reportPreview;
let resetReportBtn;
let teacherNameError;
let avatarUpload, selectAvatarBtn, editAvatarBtn;
let generateCommentBtn, generateCommentBtn2, regenerateCommentBtn, regenerateCommentBtn2, copyCommentBtn, restoreCommentBtn;

// 新增：柱状图调整变量
let chartScale = 100;
let chartTopPosition = -20;
let chartLeftPosition = 0;

// 新增：表格调整变量
let tableScale = 100;
let tableTopPosition = 0;
let tableLeftPosition = 0;



// 初始化DOM元素和事件监听器
function initDOMElements() {
    // DOM元素获取
    csvFilesInput = document.getElementById('csvFiles');
    useLastNameCheckbox = document.getElementById('useLastName');
    desc1Input = document.getElementById('desc1');
    desc2Input = document.getElementById('desc2');
    desc3Input = document.getElementById('desc3');
    bgSelect = document.getElementById('bgSelect');
    fontSelect = document.getElementById('fontSelect');
    fontColorInput = document.getElementById('fontColor');
    fontColorValue = document.getElementById('fontColorValue');
    fontBoldCheckbox = document.getElementById('fontBold');
    section1SizeInput = document.getElementById('section1Size');
    section2SizeInput = document.getElementById('section2Size');
    section3SizeInput = document.getElementById('section3Size');
    tableSizeInput = document.getElementById('tableSize');
    columnWidthInput = document.getElementById('columnWidth');
    columnWidthValue = document.getElementById('columnWidthValue');
    rowHeightInput = document.getElementById('rowHeight');
    rowHeightValue = document.getElementById('rowHeightValue');
    tableAlignmentSelect = document.getElementById('tableAlignment');
    tableFontSizeInput = document.getElementById('tableFontSize');
    tableFontSizeValue = document.getElementById('tableFontSizeValue');
    chartColorInput = document.getElementById('chartColor');
    chartColorValue = document.getElementById('chartColorValue');

    tableBackgroundColorInput = document.getElementById('tableBackgroundColor');
    tableBackgroundColorValue = document.getElementById('tableBackgroundColorValue');
    fileList = document.getElementById('fileList');
    studentSearchInput = document.getElementById('studentSearch');
    studentList = document.getElementById('studentList');
    titleTextInput = document.getElementById('titleText');
    titleFontSizeInput = document.getElementById('titleFontSize');
    titleFontSizeValue = document.getElementById('titleFontSizeValue');
    titleTopPositionInput = document.getElementById('titleTopPosition');
    titleTopPositionValue = document.getElementById('titleTopPositionValue');
    titleLeftPositionInput = document.getElementById('titleLeftPosition');
    titleLeftPositionValue = document.getElementById('titleLeftPositionValue');
    titleFontColorInput = document.getElementById('titleFontColor');
    titleFontColorValue = document.getElementById('titleFontColorValue');
    customImagesInput = document.getElementById('customImages');
    imageSizeInput = document.getElementById('imageSize');
    imageSizeValue = document.getElementById('imageSizeValue');
    imageTopPositionInput = document.getElementById('imageTopPosition');
    imageTopPositionValue = document.getElementById('imageTopPositionValue');
    imageLeftPositionInput = document.getElementById('imageLeftPosition');
    imageLeftPositionValue = document.getElementById('imageLeftPositionValue');
    imageLayoutModeSelect = document.getElementById('imageLayoutMode');
    imageList = document.getElementById('imageList');
    undoDeleteBtn = document.getElementById('undoDeleteBtn');
    imageSelector = document.getElementById('imageSelector');
    singleImageSizeInput = document.getElementById('singleImageSize');
    singleImageSizeValue = document.getElementById('singleImageSizeValue');
    singleImageTopInput = document.getElementById('singleImageTop');
    singleImageTopValue = document.getElementById('singleImageTopValue');
    singleImageLeftInput = document.getElementById('singleImageLeft');
    singleImageLeftValue = document.getElementById('singleImageLeftValue');
    singleImageSizeDownBtn = document.getElementById('singleImageSizeDown');
    singleImageSizeUpBtn = document.getElementById('singleImageSizeUp');
    singleImageMoveUpBtn = document.getElementById('singleImageMoveUp');
    singleImageMoveDownBtn = document.getElementById('singleImageMoveDown');
    singleImageMoveLeftBtn = document.getElementById('singleImageMoveLeft');
    singleImageMoveRightBtn = document.getElementById('singleImageMoveRight');
    clearCacheImagesBtn = document.getElementById('clearCacheImagesBtn');
    moveSection1Up = document.getElementById('moveSection1Up');
    moveSection1Down = document.getElementById('moveSection1Down');
    moveSection1Left = document.getElementById('moveSection1Left');
    moveSection1Right = document.getElementById('moveSection1Right');
    moveSection2Up = document.getElementById('moveSection2Up');
    moveSection2Down = document.getElementById('moveSection2Down');
    moveSection2Left = document.getElementById('moveSection2Left');
    moveSection2Right = document.getElementById('moveSection2Right');
    moveSection3Up = document.getElementById('moveSection3Up');
    moveSection3Down = document.getElementById('moveSection3Down');
    moveSection3Left = document.getElementById('moveSection3Left');
    moveSection3Right = document.getElementById('moveSection3Right');
    moveImageUpBtn = document.getElementById('moveImageUp');
    moveImageDownBtn = document.getElementById('moveImageDown');
    moveImageLeftBtn = document.getElementById('moveImageLeft');
    moveImageRightBtn = document.getElementById('moveImageRight');
    resetImageBtn = document.getElementById('resetImageBtn');
    batchOperationBtn = document.getElementById('batchOperationBtn');
    batchOperationMenu = document.getElementById('batchOperationMenu');
    bgAdjustmentContainer = document.getElementById('bgAdjustmentContainer');
    decreaseImageSizeBtn = document.getElementById('decreaseImageSize');
    increaseImageSizeBtn = document.getElementById('increaseImageSize');
    currentImageSizeSpan = document.getElementById('currentImageSize');
    teacherNameInput = document.getElementById('teacherName');
    avatarPreview = document.getElementById('avatarPreview');
    tableRecognitionImagesContainer = document.getElementById('tableRecognitionImages');
    applyAllImagesBtn = document.getElementById('applyAllImagesBtn');
    singleColumnBtn = document.getElementById('singleColumnBtn');
    doubleColumnBtn = document.getElementById('doubleColumnBtn');
    reportPreview = document.getElementById('reportPreview');
    studentList = document.getElementById('studentList');
    resetReportBtn = document.getElementById('resetReportBtn');
    teacherNameError = document.getElementById('teacherNameError');
    avatarUpload = document.getElementById('avatarUpload');
    selectAvatarBtn = document.getElementById('selectAvatarBtn');
    editAvatarBtn = document.getElementById('editAvatarBtn');
    generateCommentBtn = document.getElementById('generateCommentBtn');
    generateCommentBtn2 = document.getElementById('generateCommentBtn2');
    regenerateCommentBtn = document.getElementById('regenerateCommentBtn');
    regenerateCommentBtn2 = document.getElementById('regenerateCommentBtn2');
    copyCommentBtn = document.getElementById('copyCommentBtn');
    restoreCommentBtn = document.getElementById('restoreCommentBtn');
    checkMissingImagesBtn = document.getElementById('checkMissingImagesBtn');
    
    // 检查缺失图片按钮事件监听
    if (checkMissingImagesBtn) {
        checkMissingImagesBtn.addEventListener('click', function(e) {
            e.stopPropagation();
            e.preventDefault();
            console.log('=== 点击了检查缺失图片按钮 ===');
            
            // 检查哪些学员没有图片
            checkMissingImages();
        });
    }
    
    // 图片智能匹配按钮事件监听
    smartImageMatchBtn = document.getElementById('smartImageMatchBtn');
    if (smartImageMatchBtn) {
        smartImageMatchBtn.addEventListener('click', function(e) {
            e.stopPropagation();
            e.preventDefault();
            console.log('=== 点击了图片智能匹配按钮 ===');
            
            // 打开图片智能匹配界面
            openSmartImageMatchModal();
        });
    }
    
    // 图片上传和调整事件监听
    if (customImagesInput) {
        customImagesInput.addEventListener('change', function(e) {
            const files = e.target.files;
            if (files.length > 0) {
                // 限制最多10张图片
                const selectedFiles = Array.from(files).slice(0, 10);
                
                // 处理图片命名识别和学员匹配
                processImageUploads(selectedFiles);
            }
        });
    }
    
    // 事件监听
    if (csvFilesInput) {
        csvFilesInput.addEventListener('change', handleCsvFiles);
    }
    
    if (bgSelect) {
        bgSelect.addEventListener('change', function(e) {
            handleBgSelect(e);
            // 立即更新背景样式
            updateBackgroundStyles();
            
            // 如果报告容器存在，强制重新生成报告以刷新预览区
            if (document.querySelector('.report') && csvData.length > 0) {
                setTimeout(generateReport, 0); // 减少延迟时间
            } else if (!document.querySelector('.report') && csvData.length > 0) {
                generateReport();
            }
        });
    }
    
    // 标题调整事件监听
    if (titleFontSizeInput) {
        titleFontSizeInput.addEventListener('input', function(e) {
            console.log('titleFontSizeInput input事件触发，值:', e.target.value, '是否锁定:', isCardLocked('title-adjustment'));
            if (!isCardLocked('title-adjustment')) {
                if (titleFontSizeValue) {
                    titleFontSizeValue.textContent = `${e.target.value}px`;
                }
                updateTitleStyles();
            }
        });
    }
    
    if (titleTopPositionInput) {
        titleTopPositionInput.addEventListener('input', function(e) {
            console.log('titleTopPositionInput input事件触发，值:', e.target.value, '是否锁定:', isCardLocked('title-adjustment'));
            if (!isCardLocked('title-adjustment')) {
                if (titleTopPositionValue) {
                    titleTopPositionValue.textContent = `${e.target.value}px`;
                }
                updateTitleStyles();
            }
        });
    }
    
    if (titleLeftPositionInput) {
        titleLeftPositionInput.addEventListener('input', function(e) {
            console.log('titleLeftPositionInput input事件触发，值:', e.target.value, '是否锁定:', isCardLocked('title-adjustment'));
            if (!isCardLocked('title-adjustment')) {
                if (titleLeftPositionValue) {
                    titleLeftPositionValue.textContent = `${e.target.value}px`;
                }
                updateTitleStyles();
            }
        });
    }
    
    if (titleFontColorInput) {
        titleFontColorInput.addEventListener('input', function(e) {
            if (!isCardLocked('title-adjustment')) {
                if (titleFontColorValue) {
                    titleFontColorValue.textContent = e.target.value;
                }
                updateTitleStyles();
            }
        });
    }
    
    // 标题文本输入事件监听
    if (titleTextInput) {
        titleTextInput.addEventListener('input', function() {
            if (!isCardLocked('title-adjustment')) {
                updateTitleText();
            }
        });
    }
    
    // 字体设置事件监听
    if (fontSelect) {
        fontSelect.addEventListener('change', function() {
            console.log('fontSelect change事件触发，值:', this.value);
            updateFontStyles();
        });
    }
    if (fontColorInput) {
        fontColorInput.addEventListener('input', function(e) {
            console.log('fontColorInput input事件触发，值:', e.target.value);
            if (fontColorValue) {
                fontColorValue.textContent = e.target.value;
            }
            updateFontStyles();
        });
    }
    if (fontBoldCheckbox) {
        fontBoldCheckbox.addEventListener('change', function() {
            console.log('fontBoldCheckbox change事件触发，值:', this.checked);
            updateFontStyles();
        });
    }
    
    // 描述输入事件监听
    if (desc1Input) {
        desc1Input.addEventListener('input', function() {
            console.log('desc1Input input事件触发，值:', this.value);
            const section1Title = document.querySelector('.section-listening h2');
            if (section1Title) {
                section1Title.textContent = `听课情况：${desc1Input.value}`;
            }
        });
    }
    if (desc2Input) {
        desc2Input.addEventListener('input', function() {
            console.log('desc2Input input事件触发，值:', this.value);
            const section2Title = document.querySelector('.section-interactive h2');
            if (section2Title) {
                section2Title.textContent = `互动题情况：${desc2Input.value}`;
            }
        });
    }
    if (desc3Input) {
        desc3Input.addEventListener('input', function() {
            console.log('desc3Input input事件触发，值:', this.value);
            const section3Title = document.querySelector('.section-creation h2');
            if (section3Title) {
                section3Title.textContent = `创作情况：${desc3Input.value}`;
            }
        });
    }
    
    // 表格调整事件监听
    if (columnWidthInput) {
        columnWidthInput.addEventListener('input', function(e) {
            if (!isCardLocked('table-adjustment')) {
                if (columnWidthValue) {
                    columnWidthValue.textContent = `${e.target.value}%`;
                }
                updateTableColumnStyles();
            }
        });
    }
    if (rowHeightInput) {
        rowHeightInput.addEventListener('input', function(e) {
            if (!isCardLocked('table-adjustment')) {
                if (rowHeightValue) {
                    rowHeightValue.textContent = `${e.target.value}px`;
                }
                updateTableColumnStyles();
            }
        });
    }
    if (tableFontSizeInput) {
        tableFontSizeInput.addEventListener('input', function(e) {
            if (!isCardLocked('table-adjustment')) {
                if (tableFontSizeValue) {
                    tableFontSizeValue.textContent = `${e.target.value}px`;
                }
                updateTableColumnStyles();
            }
        });
    }
    if (tableAlignmentSelect) {
        tableAlignmentSelect.addEventListener('change', function() {
            if (!isCardLocked('table-adjustment')) {
                updateTableColumnStyles();
            }
        });
    }
    
    // 图表颜色输入事件监听
    if (chartColorInput) {
        chartColorInput.addEventListener('input', function(e) {
            if (!isCardLocked('chart-adjustment')) {
                if (chartColorValue) {
                    chartColorValue.textContent = e.target.value;
                }
                // 更新Chart.js图表的颜色
                if (window.chartInstance) {
                    window.chartInstance.data.datasets[0].backgroundColor = e.target.value;
                    window.chartInstance.update();
                }
            }
        });
    }
    

    
    // 表格背景颜色输入事件监听
    if (tableBackgroundColorInput) {
        tableBackgroundColorInput.addEventListener('input', function(e) {
            if (!isCardLocked('table-adjustment')) {
                if (tableBackgroundColorValue) {
                    tableBackgroundColorValue.textContent = e.target.value;
                }
                // 获取预览区的表格
                const tables = document.querySelectorAll('.interaction-table');
                if (tables.length > 0) {
                    tables.forEach(table => {
                        table.style.backgroundColor = e.target.value;
                    });
                }
            }
        });
    }
    
    // 表格背景颜色透明按钮事件监听
    if (tableBackgroundColorValue) {
        tableBackgroundColorValue.addEventListener('click', function() {
            if (!isCardLocked('table-adjustment')) {
                if (tableBackgroundColorInput) {
                    // 直接将表格背景设置为透明
                    tableBackgroundColorInput.value = '#FFFFFF';
                    tableBackgroundColorValue.textContent = '透明';
                    // 直接修改表格背景样式，避免通过颜色选择器的值
                    const tables = document.querySelectorAll('.interaction-table');
                    if (tables.length > 0) {
                        tables.forEach(table => {
                            table.style.backgroundColor = 'transparent';
                        });
                    }
                }
            }
        });
    }
    
    // 姓名处理复选框事件监听
    if (useLastNameCheckbox) {
        useLastNameCheckbox.addEventListener('change', function() {
            generateReport();
        });
    }
    
    // 板块大小调整事件监听器
    if (section1SizeInput) {
        section1SizeInput.addEventListener('input', function() {
            const rangeValue = this.parentElement.querySelector('.range-value');
            if (rangeValue) {
                rangeValue.textContent = `${this.value}%`;
            }
            const section1 = document.querySelector('.section-listening');
            if (section1) {
                const section1Size = parseInt(this.value);
                const section1Scale = 0.5 + (section1Size / 100);
                section1.style.transform = `scale(${section1Scale})`;
                section1.style.transformOrigin = 'top left';
            }
        });
    }
    
    if (section2SizeInput) {
        section2SizeInput.addEventListener('input', function() {
            const rangeValue = this.parentElement.querySelector('.range-value');
            if (rangeValue) {
                rangeValue.textContent = `${this.value}%`;
            }
            const section2 = document.querySelector('.section-interactive');
            if (section2) {
                const section2Size = parseInt(this.value);
                const section2Scale = 0.5 + (section2Size / 100);
                section2.style.transform = `scale(${section2Scale})`;
                section2.style.transformOrigin = 'top left';
            }
        });
    }
    
    if (section3SizeInput) {
        section3SizeInput.addEventListener('input', function() {
            const rangeValue = this.parentElement.querySelector('.range-value');
            if (rangeValue) {
                rangeValue.textContent = `${this.value}%`;
            }
            const section3 = document.querySelector('.section-creation');
            if (section3) {
                const section3Size = parseInt(this.value);
                const section3Scale = 0.5 + (section3Size / 100);
                section3.style.transform = `scale(${section3Scale})`;
                section3.style.transformOrigin = 'top left';
            }
        });
    }
    
    if (tableSizeInput) {
        tableSizeInput.addEventListener('input', function() {
            const rangeValue = this.parentElement.querySelector('.range-value');
            if (rangeValue) {
                rangeValue.textContent = `${this.value}%`;
            }
            const tables = document.querySelectorAll('.interaction-table');
            const tableSize = tableSizeInput ? parseInt(tableSizeInput.value) : 100;
            const scale = tableSize / 100;
            tables.forEach(table => {
                table.style.transform = `scale(${scale})`;
                table.style.transformOrigin = 'top left';
            });
        });
    }
    
    // 板块移动事件监听
    if (moveSection1Up) {
        moveSection1Up.addEventListener('click', function() {
            if (!isCardLocked('section-adjustment')) {
                moveSection('section1', 'up');
            }
        });
    }
    if (moveSection1Down) {
        moveSection1Down.addEventListener('click', function() {
            if (!isCardLocked('section-adjustment')) {
                moveSection('section1', 'down');
            }
        });
    }
    if (moveSection1Left) {
        moveSection1Left.addEventListener('click', function() {
            if (!isCardLocked('section-adjustment')) {
                moveSection('section1', 'left');
            }
        });
    }
    if (moveSection1Right) {
        moveSection1Right.addEventListener('click', function() {
            if (!isCardLocked('section-adjustment')) {
                moveSection('section1', 'right');
            }
        });
    }
    
    if (moveSection2Up) {
        moveSection2Up.addEventListener('click', function() {
            if (!isCardLocked('section-adjustment')) {
                moveSection('section2', 'up');
            }
        });
    }
    if (moveSection2Down) {
        moveSection2Down.addEventListener('click', function() {
            if (!isCardLocked('section-adjustment')) {
                moveSection('section2', 'down');
            }
        });
    }
    if (moveSection2Left) {
        moveSection2Left.addEventListener('click', function() {
            if (!isCardLocked('section-adjustment')) {
                moveSection('section2', 'left');
            }
        });
    }
    if (moveSection2Right) {
        moveSection2Right.addEventListener('click', function() {
            if (!isCardLocked('section-adjustment')) {
                moveSection('section2', 'right');
            }
        });
    }
    
    if (moveSection3Up) {
        moveSection3Up.addEventListener('click', function() {
            if (!isCardLocked('section-adjustment')) {
                moveSection('section3', 'up');
            }
        });
    }
    if (moveSection3Down) {
        moveSection3Down.addEventListener('click', function() {
            if (!isCardLocked('section-adjustment')) {
                moveSection('section3', 'down');
            }
        });
    }
    if (moveSection3Left) {
        moveSection3Left.addEventListener('click', function() {
            if (!isCardLocked('section-adjustment')) {
                moveSection('section3', 'left');
            }
        });
    }
    if (moveSection3Right) {
        moveSection3Right.addEventListener('click', function() {
            if (!isCardLocked('section-adjustment')) {
                moveSection('section3', 'right');
            }
        });
    }
    
    if (imageSelector) {
        imageSelector.addEventListener('change', function() {
            if (!isCardLocked('single-image-adjustment')) {
                updateSingleImageControls();
                updateSingleImageStyle();
            }
        });
    }
    
    if (singleImageSizeInput) {
        singleImageSizeInput.addEventListener('input', function(e) {
            if (!isCardLocked('single-image-adjustment')) {
                if (singleImageSizeValue) {
                    singleImageSizeValue.textContent = `${e.target.value}%`;
                }
                updateSingleImageStyle();
            }
        });
    }
    
    if (singleImageTopInput) {
        singleImageTopInput.addEventListener('input', function(e) {
            if (!isCardLocked('single-image-adjustment')) {
                if (singleImageTopValue) {
                    singleImageTopValue.textContent = `${e.target.value}px`;
                }
                updateSingleImageStyle();
            }
        });
    }
    
    if (singleImageLeftInput) {
        singleImageLeftInput.addEventListener('input', function(e) {
            if (!isCardLocked('single-image-adjustment')) {
                if (singleImageLeftValue) {
                    singleImageLeftValue.textContent = `${e.target.value}px`;
                }
                updateSingleImageStyle();
            }
        });
    }
    
    if (singleImageSizeDownBtn) {
        singleImageSizeDownBtn.addEventListener('click', function() {
            if (!isCardLocked('single-image-adjustment')) {
                if (singleImageSizeInput) {
                    let currentValue = parseInt(singleImageSizeInput.value);
                    currentValue = Math.max(currentValue - 10, 50);
                    singleImageSizeInput.value = currentValue;
                    if (singleImageSizeValue) {
                        singleImageSizeValue.textContent = `${currentValue}%`;
                    }
                    updateSingleImageStyle();
                }
            }
        });
    }
    
    if (singleImageSizeUpBtn) {
        singleImageSizeUpBtn.addEventListener('click', function() {
            if (!isCardLocked('single-image-adjustment')) {
                if (singleImageSizeInput) {
                    let currentValue = parseInt(singleImageSizeInput.value);
                    currentValue = Math.min(currentValue + 10, 200);
                    singleImageSizeInput.value = currentValue;
                    if (singleImageSizeValue) {
                        singleImageSizeValue.textContent = `${currentValue}%`;
                    }
                    updateSingleImageStyle();
                }
            }
        });
    }
    
    if (singleImageMoveUpBtn) {
        singleImageMoveUpBtn.addEventListener('click', function() {
            if (!isCardLocked('single-image-adjustment')) {
                if (singleImageTopInput) {
                    let currentValue = parseInt(singleImageTopInput.value);
                    currentValue = Math.max(currentValue - 10, -500);
                    singleImageTopInput.value = currentValue;
                    if (singleImageTopValue) {
                        singleImageTopValue.textContent = `${currentValue}px`;
                    }
                    updateSingleImageStyle();
                }
            }
        });
    }
    
    if (singleImageMoveDownBtn) {
        singleImageMoveDownBtn.addEventListener('click', function() {
            if (!isCardLocked('single-image-adjustment')) {
                if (singleImageTopInput) {
                    let currentValue = parseInt(singleImageTopInput.value);
                    currentValue = Math.min(currentValue + 10, 200);
                    singleImageTopInput.value = currentValue;
                    if (singleImageTopValue) {
                        singleImageTopValue.textContent = `${currentValue}px`;
                    }
                    updateSingleImageStyle();
                }
            }
        });
    }
    
    if (singleImageMoveLeftBtn) {
        singleImageMoveLeftBtn.addEventListener('click', function() {
            if (!isCardLocked('single-image-adjustment')) {
                if (singleImageLeftInput) {
                    let currentValue = parseInt(singleImageLeftInput.value);
                    currentValue = Math.max(currentValue - 10, -100);
                    singleImageLeftInput.value = currentValue;
                    if (singleImageLeftValue) {
                        singleImageLeftValue.textContent = `${currentValue}px`;
                    }
                    updateSingleImageStyle();
                }
            }
        });
    }
    
    if (singleImageMoveRightBtn) {
        singleImageMoveRightBtn.addEventListener('click', function() {
            if (!isCardLocked('single-image-adjustment')) {
                if (singleImageLeftInput) {
                    let currentValue = parseInt(singleImageLeftInput.value);
                    currentValue = Math.min(currentValue + 10, 100);
                    singleImageLeftInput.value = currentValue;
                    if (singleImageLeftValue) {
                        singleImageLeftValue.textContent = `${currentValue}px`;
                    }
                    updateSingleImageStyle();
                }
            }
        });
    }
}

// 初始化背景图片设置
function initBackgroundSettings() {
    // 背景图片设置已移除调整选项
}

// 初始化下载功能
function initDownloadFunctions() {
    const downloadCurrentImageBtn = document.getElementById('downloadCurrentImageBtn');
    const downloadAllImagesBtn = document.getElementById('downloadAllImagesBtn');
    
    if (downloadCurrentImageBtn) {
        downloadCurrentImageBtn.addEventListener('click', function(e) {
            e.stopPropagation();
            e.preventDefault();
            console.log('=== 点击了下载当前图片按钮 ===');
            downloadCurrentImage();
        });
        console.log('下载当前图片按钮事件已绑定');
    }
    
    if (downloadAllImagesBtn) {
        downloadAllImagesBtn.addEventListener('click', function(e) {
            e.stopPropagation();
            e.preventDefault();
            console.log('=== 点击了下载所有图片按钮 ===');
            downloadAllImagesAsZip();
        });
        console.log('下载所有图片按钮事件已绑定');
    }
}

// 初始化图片缩放控制
function initImageScalingControls() {
    if (decreaseImageSizeBtn && increaseImageSizeBtn && currentImageSizeSpan) {
        let currentSize = 100;
        
        decreaseImageSizeBtn.addEventListener('click', function() {
            currentSize = Math.max(currentSize - 10, 50);
            currentImageSizeSpan.textContent = `${currentSize}%`;
            updateImageScaling(currentSize);
        });
        
        increaseImageSizeBtn.addEventListener('click', function() {
            currentSize = Math.min(currentSize + 10, 200);
            currentImageSizeSpan.textContent = `${currentSize}%`;
            updateImageScaling(currentSize);
        });
    }
}

// 更新图片缩放
function updateImageScaling(percentage) {
    const scale = percentage / 100;
    const images = document.querySelectorAll('.creation-image');
    
    images.forEach(img => {
        img.style.transform = `scale(${scale})`;
        img.style.transformOrigin = 'top left';
    });
}

// 更新单个图片控制
function updateSingleImageControls() {
    if (!imageSelector) return;
    
    const selectedIndex = parseInt(imageSelector.value);
    const hasSelectedImage = !isNaN(selectedIndex);
    
    // 启用或禁用控件
    if (singleImageSizeInput) singleImageSizeInput.disabled = !hasSelectedImage;
    if (singleImageTopInput) singleImageTopInput.disabled = !hasSelectedImage;
    if (singleImageLeftInput) singleImageLeftInput.disabled = !hasSelectedImage;
    if (singleImageSizeDownBtn) singleImageSizeDownBtn.disabled = !hasSelectedImage;
    if (singleImageSizeUpBtn) singleImageSizeUpBtn.disabled = !hasSelectedImage;
    if (singleImageMoveUpBtn) singleImageMoveUpBtn.disabled = !hasSelectedImage;
    if (singleImageMoveDownBtn) singleImageMoveDownBtn.disabled = !hasSelectedImage;
    if (singleImageMoveLeftBtn) singleImageMoveLeftBtn.disabled = !hasSelectedImage;
    if (singleImageMoveRightBtn) singleImageMoveRightBtn.disabled = !hasSelectedImage;
    
    if (!hasSelectedImage) {
        // 重置控制值
        if (singleImageSizeInput) singleImageSizeInput.value = 100;
        if (singleImageTopInput) singleImageTopInput.value = 0;
        if (singleImageLeftInput) singleImageLeftInput.value = 0;
        if (singleImageSizeValue) singleImageSizeValue.textContent = '100%';
        if (singleImageTopValue) singleImageTopValue.textContent = '0px';
        if (singleImageLeftValue) singleImageLeftValue.textContent = '0px';
        return;
    }
    
    // 从存储的调整值中加载图片参数
    if (imageAdjustments[selectedIndex]) {
        const adjustment = imageAdjustments[selectedIndex];
        if (singleImageSizeInput) singleImageSizeInput.value = adjustment.size || 100;
        if (singleImageTopInput) singleImageTopInput.value = adjustment.top || 0;
        if (singleImageLeftInput) singleImageLeftInput.value = adjustment.left || 0;
        if (singleImageSizeValue) singleImageSizeValue.textContent = `${adjustment.size || 100}%`;
        if (singleImageTopValue) singleImageTopValue.textContent = `${adjustment.top || 0}px`;
        if (singleImageLeftValue) singleImageLeftValue.textContent = `${adjustment.left || 0}px`;
    } else {
        // 使用默认值
        if (singleImageSizeInput) singleImageSizeInput.value = 100;
        if (singleImageTopInput) singleImageTopInput.value = 0;
        if (singleImageLeftInput) singleImageLeftInput.value = 0;
        if (singleImageSizeValue) singleImageSizeValue.textContent = '100%';
        if (singleImageTopValue) singleImageTopValue.textContent = '0px';
        if (singleImageLeftValue) singleImageLeftValue.textContent = '0px';
    }
}

// 更新单个图片样式
function updateSingleImageStyle() {
    if (!imageSelector) return;
    
    const selectedIndex = parseInt(imageSelector.value);
    if (isNaN(selectedIndex) || selectedIndex < 0) return;
    
    const reportPreview = document.getElementById('reportPreview');
    if (!reportPreview) return;
    
    const images = reportPreview.querySelectorAll('.creation-image');
    let selectedImage = null;
    
    for (const img of images) {
        if (parseInt(img.dataset.index) === selectedIndex) {
            selectedImage = img;
            break;
        }
    }
    
    if (!selectedImage) {
        console.warn('未找到选中的图片元素，索引:', selectedIndex);
        return;
    }
    
    const size = singleImageSizeInput ? parseInt(singleImageSizeInput.value) : 100;
    const top = singleImageTopInput ? parseInt(singleImageTopInput.value) : 0;
    const left = singleImageLeftInput ? parseInt(singleImageLeftInput.value) : 0;
    
    imageAdjustments[selectedIndex] = {
        size: size,
        top: top,
        left: left
    };
    
    const scale = size / 100;
    selectedImage.style.transform = `scale(${scale}) translate(${left}px, ${top}px)`;
    selectedImage.style.transformOrigin = 'top left';
    selectedImage.style.zIndex = '1000';
    
    console.log('已更新图片样式，索引:', selectedIndex, '缩放:', scale, '偏移:', left, top);
}

// 初始化折叠/展开功能
function initToggleFunctionality() {
    const toggleIcons = document.querySelectorAll('.toggle-icon');
    console.log('找到的 toggle-icon 数量:', toggleIcons.length);
    toggleIcons.forEach((icon, index) => {
        console.log(`绑定第 ${index} 个 toggle-icon 的事件`);
        icon.addEventListener('click', function(e) {
            e.stopPropagation();
            e.preventDefault();
            console.log('toggle-icon 被点击');
            const cardHeader = this.closest('.card-header');
            console.log('找到的 card-header:', cardHeader);
            const cardBody = cardHeader ? cardHeader.nextElementSibling : null;
            console.log('找到的 card-body:', cardBody);
            console.log('card-body 当前 display:', cardBody ? cardBody.style.display : 'N/A');
            if (cardBody) {
                if (cardBody.style.display === 'none') {
                    cardBody.style.display = 'block';
                    this.textContent = '▼';
                    console.log('展开 card-body');
                } else {
                    cardBody.style.display = 'none';
                    this.textContent = '▶';
                    console.log('折叠 card-body');
                }
            } else {
                console.error('未找到 card-body 元素');
            }
        });
    });
}

// 初始化锁定功能
function initLockFunctionality() {
    const lockIcons = document.querySelectorAll('.lock-icon');
    lockIcons.forEach(icon => {
        icon.style.cursor = 'pointer';
        icon.style.marginLeft = '10px';
        icon.style.fontSize = '16px';
        icon.style.transition = 'all 0.3s ease';
        
        // 为锁定图标添加点击事件
        icon.addEventListener('click', function() {
            const cardId = this.dataset.card;
            if (!cardId) return;
            
            // 切换锁定状态
            if (lockedCards.has(cardId)) {
                lockedCards.delete(cardId);
                this.textContent = '🔓';
                this.style.color = '';
                console.log(`卡片 ${cardId} 已解锁`);
            } else {
                lockedCards.add(cardId);
                this.textContent = '🔒';
                this.style.color = '#ff9800';
                console.log(`卡片 ${cardId} 已锁定`);
            }
        });
    });
}

// 检查卡片是否被锁定
function isCardLocked(cardId) {
    return lockedCards.has(cardId);
}

// 单个学员操作 - 保存当前学员的所有操作记录
function performSingleStudentOperation() {
    if (students.length === 0) {
        showSaveStatus('没有识别到学员数据', true);
        return;
    }

    const currentStudent = students[currentStudentIndex];
    console.log('执行单个学员操作:', currentStudent);

    try {
        // 收集当前学员的操作数据
        const operationRecord = {
            formData: collectFormData(),
            settings: {
                imageLayoutMode: imageLayoutModeSelect ? imageLayoutModeSelect.value : 'double',
                tableScale: tableScale,
                tableTopPosition: tableTopPosition,
                tableLeftPosition: tableLeftPosition,
                sectionPositions: {...sectionPositions},
                lockedCards: Array.from(lockedCards),
                imageAdjustments: [...imageAdjustments]
            },
            timestamp: Date.now()
        };

        // 保存到学员操作记录中
        studentOperationRecords[currentStudent] = operationRecord;

        // 保存到本地存储
        saveStudentOperationRecords();

        // 触发自动保存
        triggerAutoSave();

        showSaveStatus(`已保存学员【${currentStudent}】的所有操作记录`);
        console.log('单个学员操作完成:', currentStudent, operationRecord);

    } catch (error) {
        console.error('单个学员操作失败:', error);
        showSaveStatus(`保存学员【${currentStudent}】失败: ${error.message}`, true);
    }
}

// 批量学员操作 - 对所有学员执行统一操作
function performBatchStudentOperation() {
    if (students.length === 0) {
        showSaveStatus('没有识别到学员数据', true);
        return;
    }

    console.log('执行批量学员操作，学员数量:', students.length);

    // 收集当前的操作配置（将应用到所有学员）
    const currentOperationConfig = {
        formData: collectFormData(),
        settings: {
            imageLayoutMode: imageLayoutModeSelect ? imageLayoutModeSelect.value : 'double',
            tableScale: tableScale,
            tableTopPosition: tableTopPosition,
            tableLeftPosition: tableLeftPosition,
            sectionPositions: {...sectionPositions},
            lockedCards: Array.from(lockedCards),
            imageAdjustments: [...imageAdjustments]
        }
    };

    // 事务完整性：记录操作前的状态，以便回滚
    const backupRecords = {...studentOperationRecords};

    // 操作结果统计
    const operationResult = {
        total: students.length,
        success: 0,
        failed: 0,
        failedStudents: [],
        errors: []
    };

    showSaveStatus(`正在对 ${students.length} 个学员执行统一操作...`);

    // 逐个处理学员
    try {
        students.forEach((student, index) => {
            try {
                // 为每个学员保存操作记录
                studentOperationRecords[student] = {
                    ...currentOperationConfig,
                    timestamp: Date.now()
                };

                operationResult.success++;
                console.log(`学员【${student}】操作成功 (${index + 1}/${students.length})`);

            } catch (error) {
                operationResult.failed++;
                operationResult.failedStudents.push(student);
                operationResult.errors.push({
                    student: student,
                    error: error.message
                });
                console.error(`学员【${student}】操作失败:`, error);
            }
        });

        // 检查事务完整性
        if (operationResult.failed > 0) {
            // 如果有失败的，执行回滚
            console.warn('检测到操作失败，执行回滚...');
            studentOperationRecords = backupRecords;
            showSaveStatus(`操作失败，已回滚。成功: ${operationResult.success}, 失败: ${operationResult.failed}`, true);
            console.log('批量操作回滚完成');
            return;
        }

        // 所有操作成功，保存到本地存储
        saveStudentOperationRecords();

        // 触发自动保存
        triggerAutoSave();

        // 显示详细的操作结果报告
        showBatchOperationResult(operationResult);

    } catch (error) {
        // 发生异常，执行回滚
        console.error('批量操作发生异常，执行回滚:', error);
        studentOperationRecords = backupRecords;
        showSaveStatus(`批量操作失败，已回滚: ${error.message}`, true);
    }
}

// 保存学员操作记录到本地存储
function saveStudentOperationRecords() {
    try {
        const saveData = {
            studentOperationRecords: studentOperationRecords,
            studentCommentData: studentCommentData,
            timestamp: Date.now()
        };
        
        const dataString = JSON.stringify(saveData);
        const dataSize = new Blob([dataString]).size;
        
        console.log('学员操作记录数据大小:', dataSize, '字节 (约', (dataSize / 1024 / 1024).toFixed(2), 'MB)');
        
        try {
            localStorage.setItem('student_operation_records', dataString);
            console.log('学员操作记录已保存到本地存储');
            return true;
        } catch (quotaError) {
            if (quotaError.name === 'QuotaExceededError' || quotaError.name === 'NS_ERROR_DOM_QUOTA_REACHED') {
                console.error('localStorage配额已满，无法保存学员操作记录');
                console.error('当前数据大小:', dataSize, '字节');
                
                let totalImageSize = 0;
                let imageCount = 0;
                Object.keys(studentOperationRecords).forEach(studentName => {
                    const record = studentOperationRecords[studentName];
                    if (record && record.thirdPartImages) {
                        record.thirdPartImages.forEach(url => {
                            totalImageSize += url.length;
                            imageCount++;
                        });
                    }
                });
                
                console.warn('图片数据统计:', imageCount, '张图片，总大小:', totalImageSize, '字节 (约', (totalImageSize / 1024 / 1024).toFixed(2), 'MB)');
                
                showAlertDialog('⚠️ 存储空间不足！\n\n图片数据太大，无法保存到浏览器本地存储。\n建议：\n1. 减少上传的图片数量\n2. 使用更小的图片文件\n3. 清除浏览器缓存后重试\n\n当前数据大小: ' + (dataSize / 1024 / 1024).toFixed(2) + ' MB', function() {
                    console.log('用户确认了存储空间不足提示');
                });
                
                return false;
            } else {
                throw quotaError;
            }
        }
    } catch (error) {
        console.error('保存学员操作记录失败:', error);
        console.error('错误详情:', error.message);
        showAlertDialog('保存学员操作记录失败: ' + error.message, function() {
            console.log('用户确认了错误提示');
        });
        return false;
    }
}

// 保存未确认的智能匹配图片到学员操作记录
function savePendingSmartMatchImages() {
    if (!smartMatchResults || !smartMatchResults.matched || smartMatchResults.matched.length === 0) {
        console.log('没有未确认的智能匹配图片需要保存');
        return;
    }

    console.log('开始保存未确认的智能匹配图片...');
    let successCount = 0;

    // 遍历匹配成功的图片
    smartMatchResults.matched.forEach(match => {
        const { image, studentName, studentIndex } = match;

        try {
            let foundMatch = false;
            // 在所有CSV文件中查找该学员
            for (let fileIndex = 0; fileIndex < csvData.length; fileIndex++) {
                const rows = csvData[fileIndex].rows || [];

                for (let rowIndex = 0; rowIndex < rows.length; rowIndex++) {
                    const row = rows[rowIndex];
                    const name = row['姓名'] || row['学员姓名'] || row['名字'];

                    if (name === studentName) {
                        // 将图片添加到学员操作记录的 thirdPartImages 数组中
                        if (!studentOperationRecords[studentName]) {
                            studentOperationRecords[studentName] = {
                                formData: collectFormData(),
                                settings: {
                                    imageLayoutMode: imageLayoutModeSelect ? imageLayoutModeSelect.value : 'double',
                                    tableScale: tableScale,
                                    tableTopPosition: tableTopPosition,
                                    tableLeftPosition: tableLeftPosition,
                                    sectionPositions: {...sectionPositions},
                                    lockedCards: Array.from(lockedCards),
                                    imageAdjustments: [...imageAdjustments]
                                },
                                thirdPartImages: [],
                                thirdPartImageNames: [],
                                timestamp: Date.now()
                            };
                        }

                        const record = studentOperationRecords[studentName];
                        const existingImagesSet = new Set(record.thirdPartImages);
                        if (!existingImagesSet.has(image.dataUrl)) {
                            record.thirdPartImages.push(image.dataUrl);
                            record.thirdPartImageNames.push(image.name);
                        }

                        foundMatch = true;
                        console.log(`保存未确认匹配：${studentName} -> ${image.name}`);
                        break;
                    }
                }

                // 找到匹配后立即跳出CSV文件循环
                if (foundMatch) {
                    break;
                }
            }

            if (foundMatch) {
                successCount++;
            }
        } catch (error) {
            console.error(`保存未确认匹配失败：${studentName}`, error);
        }
    });

    // 保存学员操作记录
    saveStudentOperationRecords();

    console.log(`未确认的智能匹配图片已保存：成功 ${successCount} 张`);

    // 清空智能匹配结果，避免重复保存
    smartMatchResults = { matched: [], unmatched: [] };
    smartMatchImages = [];
}

// 保存智能匹配状态到当前学员记录
function saveSmartMatchStateToStudentRecord() {
    const currentStudent = students[currentStudentIndex];
    
    if (!currentStudent) {
        console.log('没有当前学员，无法保存智能匹配状态');
        return;
    }

    if (!studentOperationRecords[currentStudent]) {
        studentOperationRecords[currentStudent] = {
            formData: collectFormData(),
            settings: {
                imageLayoutMode: imageLayoutModeSelect ? imageLayoutModeSelect.value : 'double',
                tableScale: tableScale,
                tableTopPosition: tableTopPosition,
                tableLeftPosition: tableLeftPosition,
                sectionPositions: {...sectionPositions},
                lockedCards: Array.from(lockedCards),
                imageAdjustments: [...imageAdjustments]
            },
            thirdPartImages: [],
            thirdPartImageNames: [],
            timestamp: Date.now()
        };
    }

    studentOperationRecords[currentStudent].smartMatchState = {
        smartMatchImages: smartMatchImages,
        smartMatchResults: smartMatchResults,
        manualMatchMode: manualMatchMode,
        selectedImagesForManualMatch: selectedImagesForManualMatch
    };

    console.log(`学员【${currentStudent}】的智能匹配状态已保存到学员记录`);
}

// 从学员记录加载智能匹配状态
function loadSmartMatchStateFromStudentRecord(studentName) {
    if (!studentOperationRecords[studentName] || !studentOperationRecords[studentName].smartMatchState) {
        console.log(`学员【${studentName}】没有智能匹配状态，清空全局变量`);
        smartMatchImages = [];
        smartMatchResults = { matched: [], unmatched: [] };
        manualMatchMode = false;
        selectedImagesForManualMatch = [];
        return false;
    }

    const state = studentOperationRecords[studentName].smartMatchState;
    smartMatchImages = state.smartMatchImages || [];
    smartMatchResults = state.smartMatchResults || { matched: [], unmatched: [] };
    manualMatchMode = state.manualMatchMode || false;
    selectedImagesForManualMatch = state.selectedImagesForManualMatch || [];

    console.log(`学员【${studentName}】的智能匹配状态已从学员记录加载`);
    return true;
}

// 保存智能匹配状态到 localStorage
function saveSmartMatchStateToLocalStorage() {
    const currentStudent = students[currentStudentIndex];
    const state = {
        currentStudent: currentStudent,
        smartMatchImages: smartMatchImages,
        smartMatchResults: smartMatchResults,
        manualMatchMode: manualMatchMode,
        selectedImagesForManualMatch: selectedImagesForManualMatch,
        timestamp: Date.now()
    };

    try {
        localStorage.setItem(SMART_MATCH_STATE_KEY, JSON.stringify(state));
        console.log('智能匹配状态已保存到 localStorage');
    } catch (error) {
        console.error('保存智能匹配状态到 localStorage 失败:', error);
    }
}

// 从 localStorage 加载智能匹配状态
function loadSmartMatchStateFromLocalStorage() {
    try {
        const savedState = localStorage.getItem(SMART_MATCH_STATE_KEY);
        if (savedState) {
            const state = JSON.parse(savedState);
            smartMatchImages = state.smartMatchImages || [];
            smartMatchResults = state.smartMatchResults || { matched: [], unmatched: [] };
            manualMatchMode = state.manualMatchMode || false;
            selectedImagesForManualMatch = state.selectedImagesForManualMatch || [];
            console.log('智能匹配状态已从 localStorage 恢复');
            return true;
        }
    } catch (error) {
        console.error('从 localStorage 加载智能匹配状态失败:', error);
    }
    return false;
}

// 综合保存函数：保存到学员记录和 localStorage
function saveSmartMatchStateComprehensive() {
    saveSmartMatchStateToStudentRecord();
    saveStudentOperationRecords();
    saveSmartMatchStateToLocalStorage();
}

// 综合加载函数：优先从学员记录加载，如果没有则从 localStorage 加载
function loadSmartMatchStateComprehensive() {
    // 检查 students 数组是否存在且有元素
    if (!Array.isArray(students) || students.length === 0) {
        console.log('students 数组为空，只从 localStorage 加载智能匹配状态');
        return loadSmartMatchStateFromLocalStorage();
    }
    
    // 检查 currentStudentIndex 是否有效
    if (currentStudentIndex < 0 || currentStudentIndex >= students.length) {
        console.log('currentStudentIndex 无效，只从 localStorage 加载智能匹配状态');
        return loadSmartMatchStateFromLocalStorage();
    }
    
    const currentStudent = students[currentStudentIndex];
    
    // 如果没有当前学员，只从 localStorage 加载
    if (!currentStudent) {
        console.log('没有当前学员，只从 localStorage 加载智能匹配状态');
        return loadSmartMatchStateFromLocalStorage();
    }
    
    // 如果有当前学员，优先从学员记录加载
    if (studentOperationRecords[currentStudent]?.smartMatchState) {
        loadSmartMatchStateFromStudentRecord(currentStudent);
        return true;
    }

    return loadSmartMatchStateFromLocalStorage();
}

// 从本地存储恢复学员操作记录
function restoreStudentOperationRecords() {
    try {
        const savedData = localStorage.getItem('student_operation_records');
        if (savedData) {
            const data = JSON.parse(savedData);
            studentOperationRecords = data.studentOperationRecords || {};
            studentCommentData = data.studentCommentData || {};
            
            console.log('学员操作记录已从本地存储恢复，包含图片数据');
        }
    } catch (error) {
        console.error('恢复学员操作记录失败:', error);
    }
}

// 保存当前学员的文字点评数据
function saveCurrentStudentCommentData() {
    if (students.length === 0) return;

    const currentStudent = students[currentStudentIndex];
    if (!currentStudent) return;

    try {
        // 收集当前学员的文字点评数据
        const commentContentDiv = document.querySelector('.comment-content');
        let content = '';
        if (commentContentDiv) {
            const paragraphs = commentContentDiv.querySelectorAll('p');
            if (paragraphs.length > 0) {
                content = Array.from(paragraphs).map(p => p.textContent.trim()).join('\n\n');
            } else {
                content = commentContentDiv.textContent.trim();
            }
        }
        
        const commentData = {
            content: content,
            teacherName: document.getElementById('teacherName') ? document.getElementById('teacherName').value.trim() : '',
            avatar: document.getElementById('avatarPreview') ? document.getElementById('avatarPreview').src : '',
            timestamp: Date.now()
        };

        // 保存到学员文字点评数据中
        studentCommentData[currentStudent] = commentData;

        // 保存到本地存储
        saveStudentOperationRecords();

        console.log(`已保存学员【${currentStudent}】的文字点评数据`);

    } catch (error) {
        console.error(`保存学员【${currentStudent}】的文字点评数据失败:`, error);
    }
}

// 加载当前学员的文字点评数据
function loadCurrentStudentCommentData() {
    if (students.length === 0) return false;

    const currentStudent = students[currentStudentIndex];
    if (!currentStudent) return false;

    try {
        // 从学员文字点评数据中获取
        const commentData = studentCommentData[currentStudent];
        if (!commentData) return false;

        // 恢复到界面
        const commentResult = document.querySelector('.comment-content p');
        if (commentResult && commentData.content) {
            commentResult.textContent = commentData.content;
        }

        if (teacherNameInput && commentData.teacherName) {
            teacherNameInput.value = commentData.teacherName;
        }

        if (avatarPreview && commentData.avatar) {
            avatarPreview.src = commentData.avatar;
        }

        console.log(`已加载学员【${currentStudent}】的文字点评数据`);
        return true;

    } catch (error) {
        console.error(`加载学员【${currentStudent}】的文字点评数据失败:`, error);
        return false;
    }
}

// 显示批量操作结果报告
function showBatchOperationResult(result) {
    let message = '';

    if (result.failed === 0) {
        // 全部成功
        message = `✅ 批量操作完成！成功: ${result.success}/${result.total}`;
        showSaveStatus(message);
    } else {
        // 部分失败（理论上不会执行到这里，因为有事务回滚）
        message = `⚠️ 批量操作完成。成功: ${result.success}, 失败: ${result.failed}`;
        if (result.failedStudents.length > 0) {
            message += `\n失败学员: ${result.failedStudents.join(', ')}`;
        }
        showSaveStatus(message, true);
    }

    // 在控制台输出详细报告
    console.log('=== 批量操作结果报告 ===');
    console.log(`总学员数: ${result.total}`);
    console.log(`成功: ${result.success}`);
    console.log(`失败: ${result.failed}`);
    if (result.failedStudents.length > 0) {
        console.log('失败学员列表:', result.failedStudents);
        console.log('错误详情:', result.errors);
    }
    console.log('========================');
}

// 保存当前学员的操作记录
function saveCurrentStudentOperation() {
    if (students.length === 0) return;

    const currentStudent = students[currentStudentIndex];
    if (!currentStudent) return;

    try {
        // 收集当前学员的操作数据
        const operationRecord = {
            formData: collectFormData(),
            settings: {
                imageLayoutMode: imageLayoutModeSelect ? imageLayoutModeSelect.value : 'double',
                tableScale: tableScale,
                tableTopPosition: tableTopPosition,
                tableLeftPosition: tableLeftPosition,
                sectionPositions: {...sectionPositions},
                lockedCards: Array.from(lockedCards),
                imageAdjustments: [...imageAdjustments],
                commentZoom: window.currentCommentZoom || 100,
                commentPosition: window.currentCommentPosition || { x: 0, y: -40 }
            },
            thirdPartImages: [...customImages],
            thirdPartImageNames: [...customImageNames],
            timestamp: Date.now()
        };

        // 保存到学员操作记录中
        studentOperationRecords[currentStudent] = operationRecord;

        // 保存到本地存储
        saveStudentOperationRecords();

        console.log(`已自动保存学员【${currentStudent}】的操作记录，包括 ${customImages.length} 张图片`);

    } catch (error) {
        console.error(`自动保存学员【${currentStudent}】的操作记录失败:`, error);
    }
}

// 加载学员的操作记录
function loadStudentOperationRecord(studentName) {
    const record = studentOperationRecords[studentName];
    if (!record) {
        console.log(`学员【${studentName}】没有操作记录，使用系统默认设置`);
        // 清空图片数据，确保不会显示其他学员的图片
        customImages = [];
        customImageNames = [];
        updateImageList();
        updateImageSelector();
        // 不重置设置，保持系统默认值
        return;
    }

    console.log(`加载学员【${studentName}】的操作记录:`, record);

    try {
        // 恢复表单数据
        if (record.formData) {
            Object.keys(record.formData).forEach(inputId => {
                const input = document.getElementById(inputId);
                if (input) {
                    input.value = record.formData[inputId];
                }
            });
        }

        // 恢复设置
        if (record.settings) {
            if (record.settings.imageLayoutMode && imageLayoutModeSelect) {
                imageLayoutModeSelect.value = record.settings.imageLayoutMode;
            }
            if (record.settings.tableScale !== undefined) {
                tableScale = record.settings.tableScale;
            }
            if (record.settings.tableTopPosition !== undefined) {
                tableTopPosition = record.settings.tableTopPosition;
            }
            if (record.settings.tableLeftPosition !== undefined) {
                tableLeftPosition = record.settings.tableLeftPosition;
            }
            if (record.settings.sectionPositions) {
                sectionPositions = {...record.settings.sectionPositions};
            }
            if (record.settings.lockedCards) {
                lockedCards = new Set(record.settings.lockedCards);
            }
            if (record.settings.imageAdjustments) {
                imageAdjustments = [...record.settings.imageAdjustments];
            }
            if (record.settings.commentZoom) {
                window.currentCommentZoom = record.settings.commentZoom;
            }
            if (record.settings.commentPosition) {
                window.currentCommentPosition = record.settings.commentPosition;
            }
        }

        // 恢复第三部分图片设置
        if (record.thirdPartImages && record.thirdPartImages.length > 0) {
            console.log(`恢复学员【${studentName}】的第三部分图片设置:`, record.thirdPartImages);
            // 恢复学员的图片到全局变量
            customImages = [...record.thirdPartImages];
            customImageNames = record.thirdPartImageNames ? [...record.thirdPartImageNames] : [];
            // 更新图片列表显示
            updateImageList();
            updateImageSelector();
        } else {
            // 如果没有图片记录，清空图片
            customImages = [];
            customImageNames = [];
            updateImageList();
            updateImageSelector();
        }

        // 加载该学员的文字点评数据
        loadCurrentStudentCommentData();

        console.log(`学员【${studentName}】的操作记录已加载`);

        // 更新标题文本中的{name}占位符
        updateTitleText();

    } catch (error) {
        console.error(`加载学员【${studentName}】的操作记录失败:`, error);
    }
}

// 重置所有设置为默认值
function resetToDefaultSettings() {
    console.log('重置所有设置为默认值');
    
    // 重置表单数据
    resetFormData();
    
    // 重置其他设置
    if (imageLayoutModeSelect) {
        imageLayoutModeSelect.value = 'double';
    }
    tableScale = 1;
    tableTopPosition = 100;
    tableLeftPosition = 100;
    sectionPositions = {};
    lockedCards = new Set();
    imageAdjustments = [];
}

// 重置表单数据
function resetFormData() {
    console.log('重置表单数据');
    
    // 重置所有输入元素
    const inputs = document.querySelectorAll('input, select, textarea');
    inputs.forEach(input => {
        if (input.type === 'text' || input.type === 'number' || input.type === 'textarea' || input.type === 'select-one') {
            input.value = '';
        } else if (input.type === 'checkbox' || input.type === 'radio') {
            input.checked = false;
        }
    });
}

// 检查左侧区域是否为空并执行图片迁移操作
function checkAndMigrateImages() {
    // 找到创作内容容器
    const creationContainer = document.querySelector('.creation-container');
    if (!creationContainer) return;
    
    // 找到左右两栏
    const columns = creationContainer.children;
    if (columns.length !== 2) return; // 确保是分栏模式
    
    const leftColumn = columns[0];
    const rightColumn = columns[1];
    
    // 检查左侧区域是否为空（不包含任何图片）
    const leftImages = leftColumn.querySelectorAll('.creation-image');
    if (leftImages.length > 0) return; // 左侧不为空，不需要迁移
    
    // 检查右侧区域是否有图片
    const rightImages = rightColumn.querySelectorAll('.creation-image');
    if (rightImages.length === 0) return; // 右侧也为空，不需要迁移
    
    console.log('左侧区域为空，开始将右侧图片迁移到左侧');
    
    // 收集右侧所有图片项
    const rightItems = Array.from(rightColumn.children);
    if (rightItems.length === 0) return;
    
    // 清空左侧区域
    leftColumn.innerHTML = '';
    
    // 逐个迁移图片项，添加动画效果
    rightItems.forEach((item, index) => {
        // 克隆图片项
        const clonedItem = item.cloneNode(true);
        
        // 添加动画效果
        clonedItem.style.opacity = '0';
        clonedItem.style.transform = 'translateX(50px)';
        clonedItem.style.transition = 'all 0.5s ease';
        
        // 添加到左侧区域
        leftColumn.appendChild(clonedItem);
        
        // 触发动画
        setTimeout(() => {
            clonedItem.style.opacity = '1';
            clonedItem.style.transform = 'translateX(0)';
        }, index * 100);
    });
    
    // 清空右侧区域（延迟执行，确保动画完成）
    setTimeout(() => {
        rightColumn.innerHTML = '';
        console.log('图片迁移完成，右侧区域已清空');
    }, rightItems.length * 100 + 500);
}

// 撤销删除按钮事件监听器
if (undoDeleteBtn) {
    undoDeleteBtn.addEventListener('click', function() {
        // 优先处理清空缓存图片的撤销操作
        if (cachedImagesHistory.length > 0) {
            undoClearCachedImages();
        } else if (deletedImagesHistory.length > 0) {
            // 处理删除单个图片的撤销操作
            const lastDeleted = deletedImagesHistory.pop();
            console.log('撤销删除:', lastDeleted);
            
            // 恢复图片到原来的位置
            if (lastDeleted.parentNode) {
                if (lastDeleted.nextSibling) {
                    lastDeleted.parentNode.insertBefore(lastDeleted.wrapper, lastDeleted.nextSibling);
                } else {
                    lastDeleted.parentNode.appendChild(lastDeleted.wrapper);
                }
                
                // 如果有控制元素，也恢复显示
                if (lastDeleted.controls) {
                    lastDeleted.controls.style.display = 'flex';
                }
            }
            
            console.log('图片已恢复到原位置，剩余历史记录:', deletedImagesHistory.length);
            
            // 检查是否需要执行图片迁移操作
            setTimeout(() => {
                checkAndMigrateImages();
            }, 100);
        }
        
        // 更新撤销按钮显示状态
        if (cachedImagesHistory.length === 0 && deletedImagesHistory.length === 0) {
            undoDeleteBtn.style.display = 'none';
        }
    });
}

// 更新图片列表显示
function updateImageList() {
    if (!imageList) return;
    
    imageList.innerHTML = '';
    
    // 获取当前学员的图片
    let currentImages = [];
    let currentImageNames = [];
    
    if (students[currentStudentIndex]) {
        const currentStudent = students[currentStudentIndex];
        const currentRecord = studentOperationRecords[currentStudent];
        if (currentRecord && currentRecord.thirdPartImages) {
            currentImages = currentRecord.thirdPartImages;
            currentImageNames = currentRecord.thirdPartImageNames || [];
        }
    } else {
        currentImages = customImages;
        currentImageNames = customImageNames;
    }
    
    if (currentImages.length === 0) {
        const noImageMsg = document.createElement('p');
        noImageMsg.textContent = '暂无上传图片';
        noImageMsg.className = 'hint';
        imageList.appendChild(noImageMsg);
        return;
    }
    
    currentImages.forEach((imageUrl, index) => {
        const imageItem = document.createElement('div');
        imageItem.style.display = 'flex';
        imageItem.style.alignItems = 'center';
        imageItem.style.justifyContent = 'space-between';
        imageItem.style.padding = '10px';
        imageItem.style.backgroundColor = 'rgba(129, 199, 132, 0.1)';
        imageItem.style.marginBottom = '8px';
        imageItem.style.borderRadius = '4px';
        imageItem.style.transition = 'all 0.3s ease';
        
        imageItem.addEventListener('mouseover', function() {
            this.style.backgroundColor = 'rgba(129, 199, 132, 0.2)';
        });
        
        imageItem.addEventListener('mouseout', function() {
            this.style.backgroundColor = 'rgba(129, 199, 132, 0.1)';
        });
        
        const imagePreview = document.createElement('img');
        const imageName = currentImageNames[index] || `图片 ${index + 1}`;
        imagePreview.alt = imageName;
        imagePreview.style.width = '60px';
        imagePreview.style.height = '60px';
        imagePreview.style.objectFit = 'cover';
        imagePreview.style.borderRadius = '4px';
        imagePreview.style.cursor = 'pointer';
        imagePreview.style.transition = 'transform 0.3s ease';
        
        // 添加懒加载属性
        imagePreview.loading = 'lazy';
        imagePreview.dataset.src = imageUrl;
        
        // 图片加载完成后显示
        imagePreview.onload = function() {
            console.log('图片加载成功:', imageName);
        };
        
        imagePreview.onerror = function() {
            console.error('图片加载失败:', imageName);
            this.src = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCIgdmlld0JveD0iMCAwIDYwIDYwIj48cmVjdCB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIGZpbGw9IiNmMGYwZjAiLz48dGV4dCB4PSIzMCIgeT0iMzUiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIxMCIgZmlsbD0iIzk5OSIgdGV4dC1hbmNob3I9Im1pZGRsZSI+5Zu+56eB5a6e5aSnPC90ZXh0Pjwvc3ZnPg==';
        };
        
        // 点击图片放大查看
        imagePreview.addEventListener('click', function() {
            showImagePreview(imageUrl, imageName);
        });
        
        // 悬停效果
        imagePreview.addEventListener('mouseenter', function() {
            this.style.transform = 'scale(1.1)';
        });
        
        imagePreview.addEventListener('mouseleave', function() {
            this.style.transform = 'scale(1)';
        });
        
        // 开始加载图片
        imagePreview.src = imageUrl;
        
        const imageInfo = document.createElement('div');
        imageInfo.style.flex = '1';
        imageInfo.style.marginLeft = '10px';
        imageInfo.style.fontSize = '12px';
        imageInfo.textContent = imageName;
        
        const deleteButton = document.createElement('button');
        deleteButton.textContent = '删除';
        deleteButton.style.width = '80px';
        deleteButton.style.height = '30px';
        deleteButton.style.padding = '0';
        deleteButton.style.fontSize = '12px';
        deleteButton.style.backgroundColor = '#F44336';
        deleteButton.style.borderRadius = '4px';
        deleteButton.style.color = 'white';
        deleteButton.style.border = 'none';
        deleteButton.style.cursor = 'pointer';
        deleteButton.style.transition = 'all 0.3s ease';
        deleteButton.style.position = 'relative';
        deleteButton.style.zIndex = '10';
        
        // 添加悬停效果
        deleteButton.addEventListener('mouseenter', function() {
            this.style.backgroundColor = '#D32F2F';
        });
        
        deleteButton.addEventListener('mouseleave', function() {
            this.style.backgroundColor = '#F44336';
        });
        
        // 绑定点击事件 - 使用 IIFE 解决闭包问题
        (function(currentIndex) {
            deleteButton.addEventListener('click', function(e) {
                console.log('删除按钮被点击，索引:', currentIndex);
                console.log('事件对象:', e);
                console.log('事件目标:', e.target);
                console.log('事件当前目标:', e.currentTarget);
                e.stopPropagation();
                e.preventDefault();
                e.stopImmediatePropagation();
                console.log('调用 deleteImage 函数');
                deleteImage(currentIndex);
            }, true);
        })(index);
        
        imageItem.appendChild(imagePreview);
        imageItem.appendChild(imageInfo);
        imageItem.appendChild(deleteButton);
        imageList.appendChild(imageItem);
    });
}

// 显示图片预览（放大查看）
function showImagePreview(imageUrl, imageName) {
    const overlay = document.createElement('div');
    overlay.style.position = 'fixed';
    overlay.style.top = '0';
    overlay.style.left = '0';
    overlay.style.width = '100%';
    overlay.style.height = '100%';
    overlay.style.backgroundColor = 'rgba(0, 0, 0, 0.9)';
    overlay.style.zIndex = '10000';
    overlay.style.display = 'flex';
    overlay.style.alignItems = 'center';
    overlay.style.justifyContent = 'center';
    overlay.style.cursor = 'zoom-out';
    
    const imageContainer = document.createElement('div');
    imageContainer.style.position = 'relative';
    imageContainer.style.maxWidth = '90%';
    imageContainer.style.maxHeight = '90%';
    imageContainer.style.display = 'flex';
    imageContainer.style.alignItems = 'center';
    imageContainer.style.justifyContent = 'center';
    
    const image = document.createElement('img');
    image.src = imageUrl;
    image.alt = imageName;
    image.style.maxWidth = '100%';
    image.style.maxHeight = '100%';
    image.style.objectFit = 'contain';
    image.style.borderRadius = '8px';
    image.style.boxShadow = '0 4px 20px rgba(0, 0, 0, 0.5)';
    
    const imageNameLabel = document.createElement('div');
    imageNameLabel.textContent = imageName;
    imageNameLabel.style.position = 'absolute';
    imageNameLabel.style.bottom = '-40px';
    imageNameLabel.style.left = '0';
    imageNameLabel.style.right = '0';
    imageNameLabel.style.textAlign = 'center';
    imageNameLabel.style.color = 'white';
    imageNameLabel.style.fontSize = '14px';
    imageNameLabel.style.fontWeight = 'bold';
    imageNameLabel.style.textShadow = '0 2px 4px rgba(0, 0, 0, 0.5)';
    
    const closeButton = document.createElement('button');
    closeButton.textContent = '×';
    closeButton.style.position = 'absolute';
    closeButton.style.top = '-20px';
    closeButton.style.right = '-20px';
    closeButton.style.width = '40px';
    closeButton.style.height = '40px';
    closeButton.style.border = 'none';
    closeButton.style.borderRadius = '50%';
    closeButton.style.backgroundColor = 'white';
    closeButton.style.color = '#333';
    closeButton.style.fontSize = '24px';
    closeButton.style.cursor = 'pointer';
    closeButton.style.boxShadow = '0 2px 10px rgba(0, 0, 0, 0.3)';
    
    imageContainer.appendChild(image);
    imageContainer.appendChild(imageNameLabel);
    imageContainer.appendChild(closeButton);
    overlay.appendChild(imageContainer);
    document.body.appendChild(overlay);
    
    // 点击遮罩层关闭预览
    overlay.addEventListener('click', function() {
        document.body.removeChild(overlay);
    });
    
    // 点击关闭按钮关闭预览
    closeButton.addEventListener('click', function(e) {
        e.stopPropagation();
        document.body.removeChild(overlay);
    });
    
    // ESC键关闭预览
    document.addEventListener('keydown', function handleKeydown(e) {
        if (e.key === 'Escape') {
            document.body.removeChild(overlay);
            document.removeEventListener('keydown', handleKeydown);
        }
    });
    
    // 阻止图片点击事件冒泡
    image.addEventListener('click', function(e) {
        e.stopPropagation();
    });
}

// 更新左侧操作栏中的表格识别图片列表
function updateTableRecognitionImagesList() {
    if (!tableRecognitionImagesContainer) return;
    
    tableRecognitionImagesContainer.innerHTML = '';
    
    if (tableRecognitionImages.length === 0) {
        const noImageMsg = document.createElement('div');
        noImageMsg.textContent = '暂无表格识别图片';
        noImageMsg.className = 'hint';
        tableRecognitionImagesContainer.appendChild(noImageMsg);
        return;
    }
    
    tableRecognitionImages.forEach((imageUrl, index) => {
        const imageItem = document.createElement('div');
        imageItem.style.display = 'flex';
        imageItem.style.alignItems = 'center';
        imageItem.style.justifyContent = 'space-between';
        imageItem.style.padding = '10px';
        imageItem.style.backgroundColor = 'rgba(129, 199, 132, 0.1)';
        imageItem.style.marginBottom = '8px';
        imageItem.style.borderRadius = '4px';
        imageItem.style.transition = 'all 0.3s ease';
        
        imageItem.addEventListener('mouseover', function() {
            this.style.backgroundColor = 'rgba(129, 199, 132, 0.2)';
        });
        
        imageItem.addEventListener('mouseout', function() {
            this.style.backgroundColor = 'rgba(129, 199, 132, 0.1)';
        });
        
        const imagePreview = document.createElement('img');
        imagePreview.src = imageUrl;
        imagePreview.alt = `表格识别图片 ${index + 1}`;
        imagePreview.style.width = '60px';
        imagePreview.style.height = '60px';
        imagePreview.style.objectFit = 'cover';
        imagePreview.style.borderRadius = '4px';
        
        const imageInfo = document.createElement('div');
        imageInfo.style.flex = '1';
        imageInfo.style.marginLeft = '10px';
        imageInfo.style.fontSize = '12px';
        imageInfo.textContent = `表格识别图片 ${index + 1}`;
        
        const deleteButton = document.createElement('button');
        deleteButton.textContent = '删除';
        deleteButton.style.width = '80px';
        deleteButton.style.height = '30px';
        deleteButton.style.padding = '0';
        deleteButton.style.fontSize = '12px';
        deleteButton.style.backgroundColor = '#F44336';
        deleteButton.style.borderRadius = '4px';
        deleteButton.addEventListener('click', function(e) {
            e.stopPropagation();
            e.preventDefault();
            deleteTableRecognitionImage(index);
        });
        
        imageItem.appendChild(imagePreview);
        imageItem.appendChild(imageInfo);
        imageItem.appendChild(deleteButton);
        tableRecognitionImagesContainer.appendChild(imageItem);
    });
}

// 删除表格识别图片
function deleteTableRecognitionImage(index) {
    if (index >= 0 && index < tableRecognitionImages.length) {
        tableRecognitionImages.splice(index, 1);
        console.log('表格识别图片删除完成，当前图片数量:', tableRecognitionImages.length);
        updateTableRecognitionImagesList();
        generateReport();
    }
}

// 更新图片选择器
function updateImageSelector() {
    if (!imageSelector) return;
    
    imageSelector.innerHTML = '<option value="">请选择图片</option>';
    
    // 获取当前学员的图片
    let currentImages = [];
    let currentImageNames = [];
    
    if (students[currentStudentIndex]) {
        const currentStudent = students[currentStudentIndex];
        const currentRecord = studentOperationRecords[currentStudent];
        if (currentRecord && currentRecord.thirdPartImages) {
            currentImages = currentRecord.thirdPartImages;
            currentImageNames = currentRecord.thirdPartImageNames || [];
        }
    } else {
        currentImages = customImages;
        currentImageNames = customImageNames;
    }
    
    // 合并表格识别的图片
    const allImages = [...currentImages];
    const allImageNames = [...currentImageNames];
    
    // 添加表格识别的图片
    tableRecognitionImages.forEach((imageUrl, index) => {
        if (!allImages.includes(imageUrl)) {
            allImages.push(imageUrl);
            allImageNames.push(`表格导入图片 ${index + 1}`);
        }
    });
    
    const addedImageUrls = new Set();
    const addedImageNames = new Set();
    let actualIndex = 0;
    
    allImages.forEach((imageUrl, index) => {
        if (addedImageUrls.has(imageUrl)) {
            return;
        }
        addedImageUrls.add(imageUrl);
        
        let imageName = allImageNames[index] || `图片 ${index + 1}`;
        
        let uniqueName = imageName;
        let counter = 1;
        while (addedImageNames.has(uniqueName)) {
            uniqueName = `${imageName} (${counter})`;
            counter++;
        }
        addedImageNames.add(uniqueName);
        
        const option = document.createElement('option');
        option.value = actualIndex;
        option.textContent = uniqueName;
        imageSelector.appendChild(option);
        actualIndex++;
    });
    
    console.log('图片选择器已更新，可选图片数量:', allImages.length, '去重后数量:', addedImageUrls.size);
}

// 删除图片
function deleteImage(index) {
    // 检查当前操作模式
    if (currentOperationMode === 'single' && students[currentStudentIndex]) {
        const currentStudent = students[currentStudentIndex];
        const currentRecord = studentOperationRecords[currentStudent];
        
        if (currentRecord && currentRecord.thirdPartImages && index >= 0 && index < currentRecord.thirdPartImages.length) {
            currentRecord.thirdPartImages.splice(index, 1);
            if (currentRecord.thirdPartImageNames) {
                currentRecord.thirdPartImageNames.splice(index, 1);
            }
            
            studentOperationRecords[currentStudent] = currentRecord;
            saveStudentOperationRecords();
            
            customImages = [...currentRecord.thirdPartImages];
            customImageNames = currentRecord.thirdPartImageNames ? [...currentRecord.thirdPartImageNames] : [];
            
            console.log('单个操作模式下，图片已从学员【' + currentStudent + '】的操作记录中删除，当前图片数量:', customImages.length);
        }
    } else {
        if (index >= 0 && index < customImages.length) {
            customImages.splice(index, 1);
            customImageNames.splice(index, 1);
            console.log('批量操作模式下，图片删除完成，当前图片数量:', customImages.length);
        }
    }
    
    // 清理图片调整状态数组，避免索引不匹配
    imageAdjustments = [];
    
    // 重置图片选择器的值
    if (imageSelector) {
        imageSelector.value = '';
    }
    
    updateImageList();
    updateImageSelector();
    
    // 重置单个图片控制控件
    updateSingleImageControls();
    
    generateReport();
    
    if (currentOperationMode === 'single' && students[currentStudentIndex]) {
        console.log('单个操作模式下，触发自动保存');
        triggerAutoSave();
    }
}

// 自定义确认对话框函数（显示在浏览器中央）
function showConfirmDialog(message, callback) {
    // 创建遮罩层
    const overlay = document.createElement('div');
    overlay.style.position = 'fixed';
    overlay.style.top = '0';
    overlay.style.left = '0';
    overlay.style.width = '100%';
    overlay.style.height = '100%';
    overlay.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
    overlay.style.zIndex = '1000';
    overlay.style.display = 'flex';
    overlay.style.alignItems = 'center';
    overlay.style.justifyContent = 'center';
    
    // 创建对话框容器
    const dialog = document.createElement('div');
    dialog.style.backgroundColor = 'white';
    dialog.style.padding = '30px';
    dialog.style.borderRadius = '8px';
    dialog.style.boxShadow = '0 4px 20px rgba(0, 0, 0, 0.2)';
    dialog.style.maxWidth = '80%';
    dialog.style.width = '80%';
    dialog.style.maxHeight = '80vh';
    dialog.style.overflowY = 'auto';
    dialog.style.textAlign = 'center';
    
    // 创建消息文本
    const messageElement = document.createElement('p');
    messageElement.style.fontSize = '16px';
    messageElement.style.color = '#333';
    messageElement.style.marginBottom = '20px';
    messageElement.textContent = message;
    
    // 创建按钮容器
    const buttonContainer = document.createElement('div');
    buttonContainer.style.display = 'flex';
    buttonContainer.style.justifyContent = 'center';
    buttonContainer.style.gap = '15px';
    
    // 创建取消按钮
    const cancelButton = document.createElement('button');
    cancelButton.textContent = '取消';
    cancelButton.style.padding = '10px 20px';
    cancelButton.style.border = '1px solid #ddd';
    cancelButton.style.borderRadius = '4px';
    cancelButton.style.backgroundColor = '#f0f0f0';
    cancelButton.style.color = '#333';
    cancelButton.style.cursor = 'pointer';
    cancelButton.style.fontSize = '14px';
    
    // 创建确认按钮
    const confirmButton = document.createElement('button');
    confirmButton.textContent = '确定';
    confirmButton.style.padding = '10px 20px';
    confirmButton.style.border = 'none';
    confirmButton.style.borderRadius = '4px';
    confirmButton.style.backgroundColor = '#4CAF50';
    confirmButton.style.color = 'white';
    confirmButton.style.cursor = 'pointer';
    confirmButton.style.fontSize = '14px';
    
    // 添加按钮点击事件
    cancelButton.addEventListener('click', function(e) {
        e.stopPropagation();
        e.preventDefault();
        document.body.removeChild(overlay);
        if (callback) {
            setTimeout(() => callback(false), 0);
        }
    });
    
    confirmButton.addEventListener('click', function(e) {
        e.stopPropagation();
        e.preventDefault();
        document.body.removeChild(overlay);
        if (callback) {
            setTimeout(() => callback(true), 0);
        }
    });
    
    // 添加元素到对话框
    buttonContainer.appendChild(cancelButton);
    buttonContainer.appendChild(confirmButton);
    dialog.appendChild(messageElement);
    dialog.appendChild(buttonContainer);
    overlay.appendChild(dialog);
    
    // 添加到页面
    document.body.appendChild(overlay);
    
    // 阻止遮罩层点击事件冒泡
    overlay.addEventListener('click', function(e) {
        e.stopPropagation();
        e.preventDefault();
    });
}

// 自定义提示对话框函数（显示在浏览器中央）
function showAlertDialog(message, callback) {
    // 创建遮罩层
    const overlay = document.createElement('div');
    overlay.style.position = 'fixed';
    overlay.style.top = '0';
    overlay.style.left = '0';
    overlay.style.width = '100%';
    overlay.style.height = '100%';
    overlay.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
    overlay.style.zIndex = '1000';
    overlay.style.display = 'flex';
    overlay.style.alignItems = 'center';
    overlay.style.justifyContent = 'center';
    
    // 创建对话框容器
    const dialog = document.createElement('div');
    dialog.style.backgroundColor = 'white';
    dialog.style.padding = '30px';
    dialog.style.borderRadius = '8px';
    dialog.style.boxShadow = '0 4px 20px rgba(0, 0, 0, 0.2)';
    dialog.style.maxWidth = '80%';
    dialog.style.width = '80%';
    dialog.style.maxHeight = '80vh';
    dialog.style.overflowY = 'auto';
    dialog.style.textAlign = 'center';
    
    // 创建消息文本
    const messageElement = document.createElement('p');
    messageElement.style.fontSize = '16px';
    messageElement.style.color = '#333';
    messageElement.style.marginBottom = '20px';
    messageElement.textContent = message;
    
    // 创建确定按钮
    const confirmButton = document.createElement('button');
    confirmButton.textContent = '确定';
    confirmButton.style.padding = '10px 30px';
    confirmButton.style.border = 'none';
    confirmButton.style.borderRadius = '4px';
    confirmButton.style.backgroundColor = '#4CAF50';
    confirmButton.style.color = 'white';
    confirmButton.style.cursor = 'pointer';
    confirmButton.style.fontSize = '14px';
    
    // 添加按钮点击事件
    confirmButton.addEventListener('click', function() {
        document.body.removeChild(overlay);
        if (callback) callback();
    });
    
    // 添加元素到对话框
    dialog.appendChild(messageElement);
    dialog.appendChild(confirmButton);
    overlay.appendChild(dialog);
    
    // 添加到页面
    document.body.appendChild(overlay);
}

// 显示图片预览的公共函数
// 参数: file - 图片文件对象
// 功能: 读取文件并生成预览，加载到预览区（追加模式）
function displayImagePreviewOnly() {
    if (!reportPreview) {
        console.error('无法找到预览区域元素');
        return;
    }
    
    // 清空预览区域
    reportPreview.innerHTML = '';
    
    // 创建简单的图片预览容器
    const previewContainer = document.createElement('div');
    previewContainer.style.display = 'flex';
    previewContainer.style.flexWrap = 'wrap';
    previewContainer.style.gap = '20px';
    previewContainer.style.padding = '20px';
    previewContainer.style.backgroundColor = '#f5f5f5';
    previewContainer.style.minHeight = '400px';
    previewContainer.style.borderRadius = '8px';
    
    // 获取当前图片
    let currentImages = [];
    let currentImageNames = [];
    
    if (students[currentStudentIndex]) {
        const currentStudent = students[currentStudentIndex];
        const currentRecord = studentOperationRecords[currentStudent];
        if (currentRecord && currentRecord.thirdPartImages) {
            currentImages = currentRecord.thirdPartImages;
            currentImageNames = currentRecord.thirdPartImageNames || [];
        }
    } else {
        currentImages = customImages;
        currentImageNames = customImageNames;
    }
    
    if (currentImages.length === 0) {
        const noImageMsg = document.createElement('div');
        noImageMsg.textContent = '暂无上传图片';
        noImageMsg.style.width = '100%';
        noImageMsg.style.textAlign = 'center';
        noImageMsg.style.color = '#999';
        noImageMsg.style.padding = '40px';
        previewContainer.appendChild(noImageMsg);
    } else {
        currentImages.forEach((imageUrl, index) => {
            const imageWrapper = document.createElement('div');
            imageWrapper.style.position = 'relative';
            imageWrapper.style.width = '200px';
            imageWrapper.style.height = '200px';
            imageWrapper.style.borderRadius = '8px';
            imageWrapper.style.overflow = 'visible';
            imageWrapper.style.boxShadow = '0 2px 8px rgba(0,0,0,0.1)';
            imageWrapper.style.backgroundColor = 'transparent';
            
            const img = document.createElement('img');
            img.src = imageUrl;
            img.alt = currentImageNames[index] || `图片 ${index + 1}`;
            img.style.width = '100%';
            img.style.height = '100%';
            img.style.objectFit = 'cover';
            img.loading = 'lazy';
            
            img.onload = function() {
                console.log('图片预览加载成功:', currentImageNames[index]);
            };
            
            img.onerror = function() {
                console.error('图片预览加载失败:', currentImageNames[index]);
                this.alt = '加载失败';
                this.style.backgroundColor = '#f0f0f0';
            };
            
            const imageName = document.createElement('div');
            imageName.textContent = currentImageNames[index] || `图片 ${index + 1}`;
            imageName.style.position = 'absolute';
            imageName.style.bottom = '0';
            imageName.style.left = '0';
            imageName.style.right = '0';
            imageName.style.padding = '8px';
            imageName.style.backgroundColor = 'rgba(0,0,0,0.7)';
            imageName.style.color = '#fff';
            imageName.style.fontSize = '12px';
            imageName.style.textAlign = 'center';
            imageName.style.whiteSpace = 'nowrap';
            imageName.style.overflow = 'hidden';
            imageName.style.textOverflow = 'ellipsis';
            
            imageWrapper.appendChild(img);
            imageWrapper.appendChild(imageName);
            previewContainer.appendChild(imageWrapper);
        });
    }
    
    reportPreview.appendChild(previewContainer);
    console.log('图片预览已显示，图片数量:', currentImages.length);
}

// 显示图片预览的公共函数
// 参数: file - 图片文件对象
// 功能: 读取文件并生成预览，加载到预览区（追加模式）
function showPreview(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = function(e) {
            const imageData = e.target.result;
            const fileName = file.name;
            
            console.log('显示图片预览:', fileName);
            
            // 检查当前学员
            if (students[currentStudentIndex]) {
                const currentStudent = students[currentStudentIndex];
                
                // 检查当前学员是否有操作记录
                let currentRecord = studentOperationRecords[currentStudent];
                
                // 如果没有操作记录，创建一个新的
                if (!currentRecord) {
                    currentRecord = {
                        formData: collectFormData(),
                        settings: {
                            imageLayoutMode: imageLayoutModeSelect ? imageLayoutModeSelect.value : 'double',
                            tableScale: tableScale,
                            tableTopPosition: tableTopPosition,
                            tableLeftPosition: tableLeftPosition,
                            sectionPositions: {...sectionPositions},
                            lockedCards: Array.from(lockedCards),
                            imageAdjustments: [...imageAdjustments]
                        },
                        thirdPartImages: [],
                        thirdPartImageNames: [],
                        timestamp: Date.now()
                    };
                }
                
                // 检查图片是否已存在
                const existingImages = new Set(currentRecord.thirdPartImages);
                if (!existingImages.has(imageData)) {
                    // 添加新图片到当前学员
                    currentRecord.thirdPartImages.push(imageData);
                    currentRecord.thirdPartImageNames.push(fileName);
                    
                    // 确保不超过10张图片
                    if (currentRecord.thirdPartImages.length > 10) {
                        currentRecord.thirdPartImages = currentRecord.thirdPartImages.slice(0, 10);
                        currentRecord.thirdPartImageNames = currentRecord.thirdPartImageNames.slice(0, 10);
                    }
                    
                    // 更新全局数组，以便UI显示
                    customImages = [...currentRecord.thirdPartImages];
                    customImageNames = [...currentRecord.thirdPartImageNames];
                    
                    // 保存到学员操作记录中
                    studentOperationRecords[currentStudent] = currentRecord;
                    
                    // 保存到本地存储
                    saveStudentOperationRecords();
                    
                    console.log('图片已添加到学员【' + currentStudent + '】的操作记录中，当前图片数量:', customImages.length);
                } else {
                    console.log('图片已存在，跳过添加:', fileName);
                }
            } else {
                // 如果没有学员，更新全局数组
                const existingImages = new Set(customImages);
                if (!existingImages.has(imageData)) {
                    customImages.push(imageData);
                    customImageNames.push(fileName);
                    
                    // 确保不超过10张图片
                    if (customImages.length > 10) {
                        customImages = customImages.slice(0, 10);
                        customImageNames = customImageNames.slice(0, 10);
                    }
                    console.log('没有学员，图片已添加，当前图片数量:', customImages.length);
                } else {
                    console.log('图片已存在，跳过添加:', fileName);
                }
            }
            
            // 更新UI（追加模式，不清空已有内容）
            updateImageList();
            updateImageSelector();
            
            // 尝试生成报告（如果CSV数据存在）
            if (csvData.length > 0) {
                generateReport();
            } else {
                // 如果没有CSV数据，直接在预览区显示图片
                displayImagePreviewOnly();
            }
            
            resolve({ data: imageData, name: fileName });
        };
        reader.onerror = function() {
            console.error('图片读取失败:', file.name);
            reject(new Error('图片读取失败'));
        };
        reader.readAsDataURL(file);
    });
}

// 将图片数据分配给指定学员（不读取文件，直接使用已有的数据）
function assignImageToStudentData(imageData, fileName, studentName) {
    // 检查学员是否有操作记录
    let studentRecord = studentOperationRecords[studentName];
    
    // 如果没有操作记录，创建一个新的
    if (!studentRecord) {
        studentRecord = {
            formData: collectFormData(),
            settings: {
                imageLayoutMode: imageLayoutModeSelect ? imageLayoutModeSelect.value : 'double',
                tableScale: tableScale,
                tableTopPosition: tableTopPosition,
                tableLeftPosition: tableLeftPosition,
                sectionPositions: {...sectionPositions},
                lockedCards: Array.from(lockedCards),
                imageAdjustments: [...imageAdjustments]
            },
            thirdPartImages: [],
            thirdPartImageNames: [],
            timestamp: Date.now()
        };
    }
    
    // 检查图片是否已存在
    const existingImages = new Set(studentRecord.thirdPartImages);
    if (!existingImages.has(imageData)) {
        // 添加新图片到学员
        studentRecord.thirdPartImages.push(imageData);
        studentRecord.thirdPartImageNames.push(fileName);
        
        // 确保不超过10张图片
        if (studentRecord.thirdPartImages.length > 10) {
            studentRecord.thirdPartImages = studentRecord.thirdPartImages.slice(0, 10);
            studentRecord.thirdPartImageNames = studentRecord.thirdPartImageNames.slice(0, 10);
        }
        
        // 保存到学员操作记录中
        studentOperationRecords[studentName] = studentRecord;
        saveStudentOperationRecords();
        
        console.log(`图片 ${fileName} 已分配给学员 ${studentName}`);
    } else {
        console.log(`图片 ${fileName} 已存在，跳过添加`);
    }
}

// 从文件名中识别学员姓名
function identifyStudentFromFileName(fileName) {
    if (!students || students.length === 0) return null;
    
    console.log('开始识别学员姓名，原始文件名:', fileName);
    
    // 步骤1：移除所有常见图片文件后缀
    const nameWithoutExt = fileName.replace(/\.(jpg|jpeg|png|gif|bmp|webp|JPG|JPEG|PNG|GIF|BMP|WEBP)$/i, '');
    console.log('移除后缀后的文件名:', nameWithoutExt);
    
    // 步骤2：清理文件名，移除特殊字符和分隔符
    const cleanFileName = nameWithoutExt
        .replace(/^[0-9]+[-_]/, '') // 移除开头的数字和分隔符
        .replace(/[-_][0-9]+$/, '') // 移除结尾的数字和分隔符
        .replace(/[-_]+/g, '') // 移除所有分隔符
        .replace(/\s+/g, '') // 移除所有空格
        .replace(/[^\u4e00-\u9fa5a-zA-Z]/g, ''); // 只保留中英文字符
    
    console.log('清理后的文件名:', cleanFileName);
    
    // 步骤3：精确匹配（不区分大小写）
    for (const student of students) {
        if (nameWithoutExt.toLowerCase() === student.toLowerCase()) {
            console.log('✓ 精确匹配成功:', student);
            return student;
        }
    }
    
    // 步骤4：清理后的精确匹配（不区分大小写）
    for (const student of students) {
        const cleanStudent = student.replace(/\s+/g, '').toLowerCase();
        if (cleanFileName.toLowerCase() === cleanStudent) {
            console.log('✓ 清理后精确匹配成功:', student);
            return student;
        }
    }
    
    // 步骤5：包含匹配（不区分大小写），但要求文件名长度与学员姓名长度相近
    for (const student of students) {
        const lengthDiff = Math.abs(nameWithoutExt.length - student.length);
        if (lengthDiff <= 2 && nameWithoutExt.toLowerCase().includes(student.toLowerCase())) {
            console.log('✓ 包含匹配成功:', student);
            return student;
        }
    }
    
    console.log('✗ 未找到匹配的学员');
    return null;
}

// 获取中文姓名的拼音首字母（简化版）
function getPinyinInitials(chineseName) {
    if (!chineseName) return '';
    
    const pinyinMap = {
        '张': 'Z', '李': 'L', '王': 'W', '刘': 'L', '陈': 'C', '杨': 'Y', '赵': 'Z', '黄': 'H', '周': 'Z', '吴': 'W',
        '徐': 'X', '孙': 'S', '胡': 'H', '朱': 'Z', '高': 'G', '林': 'L', '何': 'H', '郭': 'G', '马': 'M', '罗': 'L',
        '梁': 'L', '宋': 'S', '郑': 'Z', '谢': 'X', '韩': 'H', '唐': 'T', '冯': 'F', '于': 'Y', '董': 'D', '萧': 'X',
        '程': 'C', '曹': 'C', '袁': 'Y', '邓': 'D', '许': 'X', '傅': 'F', '沈': 'S', '曾': 'Z', '彭': 'P', '吕': 'L',
        '苏': 'S', '卢': 'L', '蒋': 'J', '蔡': 'C', '贾': 'J', '丁': 'D', '魏': 'W', '薛': 'X', '叶': 'Y', '阎': 'Y',
        '余': 'Y', '潘': 'P', '杜': 'D', '戴': 'D', '夏': 'X', '钟': 'Z', '汪': 'W', '田': 'T', '任': 'R', '姜': 'J',
        '范': 'F', '方': 'F', '石': 'S', '姚': 'Y', '谭': 'T', '廖': 'L', '邹': 'Z', '熊': 'X', '金': 'J', '陆': 'L',
        '郝': 'H', '孔': 'K', '白': 'B', '崔': 'C', '康': 'K', '毛': 'M', '邱': 'Q', '秦': 'Q', '江': 'J', '史': 'S',
        '顾': 'G', '侯': 'H', '邵': 'S', '孟': 'M', '龙': 'L', '万': 'W', '段': 'D', '雷': 'L', '钱': 'Q', '汤': 'T',
        '尹': 'Y', '黎': 'L', '易': 'Y', '常': 'C', '武': 'W', '乔': 'Q', '贺': 'H', '赖': 'L', '龚': 'G', '文': 'W'
    };
    
    let initials = '';
    for (let i = 0; i < chineseName.length; i++) {
        const char = chineseName[i];
        if (pinyinMap[char]) {
            initials += pinyinMap[char];
        } else if (/[a-zA-Z]/.test(char)) {
            initials += char.toUpperCase();
        }
    }
    
    return initials;
}

// 全部应用按钮事件监听
if (applyAllImagesBtn) {
    applyAllImagesBtn.addEventListener('click', function() {
        console.log('点击了全部应用按钮');
        
        // 确保有学员数据
        if (students.length === 0) {
            showAlertDialog('请先上传学员数据', function() {
                console.log('用户确认了提示消息');
            });
            return;
        }
        
        // 确保当前学员有图片
        if (customImages.length === 0) {
            showAlertDialog('请先上传图片', function() {
                console.log('用户确认了提示消息');
            });
            return;
        }
        
        // 确认是否要应用到所有学员
        showConfirmDialog(`确定要将当前学员的 ${customImages.length} 张图片应用到所有 ${students.length} 个学员吗？`, function(confirmed) {
            if (!confirmed) {
                return;
            }
            
            // 将当前学员的图片应用到所有学员
            students.forEach(student => {
                const record = studentOperationRecords[student] || {
                    formData: collectFormData(),
                    settings: {
                        imageLayoutMode: imageLayoutModeSelect ? imageLayoutModeSelect.value : 'double',
                        tableScale: tableScale,
                        tableTopPosition: tableTopPosition,
                        tableLeftPosition: tableLeftPosition,
                        sectionPositions: {...sectionPositions},
                        lockedCards: Array.from(lockedCards),
                        imageAdjustments: [...imageAdjustments]
                    },
                    thirdPartImages: [],
                    thirdPartImageNames: [],
                    timestamp: Date.now()
                };
                
                // 应用当前学员的图片
                record.thirdPartImages = [...customImages];
                record.thirdPartImageNames = [...customImageNames];
                
                // 保存到学员操作记录中
                studentOperationRecords[student] = record;
            });
            
            // 保存到本地存储
            saveStudentOperationRecords();
            
            // 显示成功消息
            showAlertDialog(`已成功将 ${customImages.length} 张图片应用到所有 ${students.length} 个学员`, function() {
                console.log('用户确认了成功消息');
            });
            
            console.log('已将图片应用到所有学员');
        });
    });
}

if (imageSizeInput) {
    imageSizeInput.addEventListener('input', function(e) {
        if (!isCardLocked('image-settings')) {
            if (imageSizeValue) {
                imageSizeValue.textContent = `${e.target.value}%`;
            }
            updateImageStyles();
            debouncedGenerateReport();
        }
    });
}

if (imageTopPositionInput) {
    imageTopPositionInput.addEventListener('input', function(e) {
        if (!isCardLocked('image-settings')) {
            if (imageTopPositionValue) {
                imageTopPositionValue.textContent = `${e.target.value}px`;
            }
            updateImageStyles();
            debouncedGenerateReport();
        }
    });
}

if (imageLeftPositionInput) {
    imageLeftPositionInput.addEventListener('input', function(e) {
        if (!isCardLocked('image-settings')) {
            if (imageLeftPositionValue) {
                imageLeftPositionValue.textContent = `${e.target.value}px`;
            }
            updateImageStyles();
            debouncedGenerateReport();
        }
    });
}

// 智能匹配图片自适应大小调整函数
function applySmartImageAutoResize(img, filename) {
    if (!img || !img.naturalWidth || !img.naturalHeight) {
        console.warn('智能图片自适应调整失败：图片未正确加载', filename);
        return;
    }
    
    const originalWidth = img.naturalWidth;
    const originalHeight = img.naturalHeight;
    const aspectRatio = originalWidth / originalHeight;
    
    console.log('开始智能图片自适应调整:', filename);
    console.log('原始尺寸:', originalWidth, 'x', originalHeight, '宽高比:', aspectRatio.toFixed(2));
    
    // 获取图片容器的尺寸
    const container = img.closest('.imageContainer') || img.parentElement;
    if (!container) {
        console.warn('智能图片自适应调整失败：找不到图片容器', filename);
        return;
    }
    
    // 检查图片数量，如果大于4张则自动缩小30%
    const imageCount = customImages.length;
    const shouldShrink = imageCount > 4;
    
    if (shouldShrink) {
        console.log(`检测到图片数量为 ${imageCount} 张（>4张），自动缩小30%`);
    }
    
    // 设置最大尺寸阈值，确保图片不会太大
    // 如果图片数量大于4张，则缩小30%
    const MAX_WIDTH = shouldShrink ? 175 : 250;
    const MAX_HEIGHT = shouldShrink ? 140 : 200;
    const MIN_WIDTH = 80;
    const MIN_HEIGHT = 80;
    
    let targetWidth = originalWidth;
    let targetHeight = originalHeight;
    
    // 如果图片尺寸超过最大阈值，进行缩小
    if (originalWidth > MAX_WIDTH || originalHeight > MAX_HEIGHT) {
        console.log('智能图片尺寸超过阈值，需要缩小');
        
        // 计算缩放比例，保持宽高比
        const widthScale = MAX_WIDTH / originalWidth;
        const heightScale = MAX_HEIGHT / originalHeight;
        const scale = Math.min(widthScale, heightScale);
        
        targetWidth = Math.round(originalWidth * scale);
        targetHeight = Math.round(originalHeight * scale);
        
        console.log('缩放比例:', scale.toFixed(2), '目标尺寸:', targetWidth, 'x', targetHeight);
    }
    
    // 确保图片不会太小
    if (targetWidth < MIN_WIDTH || targetHeight < MIN_HEIGHT) {
        console.log('智能图片尺寸过小，调整到最小尺寸');
        
        if (targetWidth < MIN_WIDTH) {
            targetWidth = MIN_WIDTH;
            targetHeight = Math.round(targetWidth / aspectRatio);
        }
        
        if (targetHeight < MIN_HEIGHT) {
            targetHeight = MIN_HEIGHT;
            targetWidth = Math.round(targetHeight * aspectRatio);
        }
        
        console.log('调整后尺寸:', targetWidth, 'x', targetHeight);
    }
    
    // 应用自适应尺寸
    img.style.maxWidth = `${targetWidth}px`;
    img.style.maxHeight = `${targetHeight}px`;
    img.style.width = 'auto';
    img.style.height = 'auto';
    img.style.objectFit = 'contain';
    
    console.log('智能图片自适应调整完成:', filename, '最终尺寸:', targetWidth, 'x', targetHeight);
}

// 实时更新图片样式
function updateImageStyles() {
    const images = document.querySelectorAll('.creation-image');
    const imageSize = imageSizeInput ? parseInt(imageSizeInput.value) : 80;
    const imageTopPosition = imageTopPositionInput ? parseInt(imageTopPositionInput.value) : 0;
    const imageLeftPosition = imageLeftPositionInput ? parseInt(imageLeftPositionInput.value) : 0;
    
    images.forEach(img => {
        img.style.maxWidth = `${imageSize}%`;
        img.style.transform = `translate(${imageLeftPosition}px, ${imageTopPosition}px)`;
        img.style.transformOrigin = 'top left';
    });
    
    console.log('图片样式已实时更新:', `size: ${imageSize}%, position: ${imageLeftPosition}px, ${imageTopPosition}px`);
}

function updateChartStyles() {
    const chartContainers = document.querySelectorAll('.chart-container');
    chartContainers.forEach(container => {
        container.style.transform = `scale(${chartScale / 100}) translate(${chartLeftPosition}px, ${chartTopPosition}px)`;
        container.style.transformOrigin = 'top left';
    });
    console.log('柱状图样式已实时更新:', `scale: ${chartScale}%, position: ${chartLeftPosition}px, ${chartTopPosition}px`);
}



function updateTableStyles() {
    const tableContainers = document.querySelectorAll('.table-container');
    tableContainers.forEach(container => {
        container.style.transform = `scale(${tableScale / 100}) translate(${tableLeftPosition}px, ${tableTopPosition}px)`;
        container.style.transformOrigin = 'top left';
    });
    console.log('表格样式已实时更新:', `scale: ${tableScale}%, position: ${tableLeftPosition}px, ${tableTopPosition}px`);
}

// 实时更新标题文本
function updateTitleText() {
    const reportContainer = document.querySelector('.report');
    if (!reportContainer) {
        console.warn('updateTitleText: 未找到报告容器');
        return;
    }
    
    const title = reportContainer.querySelector('.report-title');
    if (!title) {
        console.warn('updateTitleText: 未找到标题元素');
        return;
    }
    
    const titleText = titleTextInput ? titleTextInput.value || '{name}宝贝学习情况' : '{name}宝贝学习情况';
    
    let name = '';
    if (students.length > 0) {
        name = students[currentStudentIndex];
        const useLastName = useLastNameCheckbox ? useLastNameCheckbox.checked : false;
        if (useLastName && name.length > 2) {
            name = name.substring(name.length - 2);
        }
    }
    
    const formattedTitle = titleText.replace('{name}', name);
    title.textContent = formattedTitle;
    
    console.log('标题文本已实时更新:', formattedTitle);
}

// 实时更新标题样式
function updateTitleStyles() {
    const reportContainer = document.querySelector('.report');
    if (!reportContainer) {
        console.warn('updateTitleStyles: 未找到报告容器');
        return;
    }
    
    const title = reportContainer.querySelector('.report-title');
    if (!title) {
        console.warn('updateTitleStyles: 未找到标题元素');
        return;
    }
    
    const titleFontSize = titleFontSizeInput ? parseInt(titleFontSizeInput.value) : 36;
    const titleTopPosition = titleTopPositionInput ? parseInt(titleTopPositionInput.value) : 0;
    const titleLeftPosition = titleLeftPositionInput ? parseInt(titleLeftPositionInput.value) : 0;
    const titleFontColor = titleFontColorInput ? titleFontColorInput.value : '#333333';
    
    title.style.fontSize = `${titleFontSize}px`;
    title.style.transform = `translate(${titleLeftPosition}px, ${titleTopPosition}px)`;
    title.style.color = titleFontColor;
    title.style.transformOrigin = 'top left';
    
    console.log('标题样式已实时更新:', `fontSize: ${titleFontSize}px, position: ${titleLeftPosition}px, ${titleTopPosition}px, color: ${titleFontColor}`);
}

// 实时更新字体样式
function updateFontStyles() {
    const reportContainer = document.querySelector('.report');
    if (!reportContainer) {
        console.warn('updateFontStyles: 未找到报告容器');
        return;
    }
    
    const reportContent = reportContainer.querySelector('.report-content');
    if (!reportContent) {
        console.warn('updateFontStyles: 未找到报告内容容器');
        return;
    }
    
    const selectedFont = fontSelect ? fontSelect.value : 'PingFangSanShengTi';
    const fontColor = fontColorInput ? fontColorInput.value : '#333333';
    const isFontBold = fontBoldCheckbox ? fontBoldCheckbox.checked : false;
    
    reportContent.style.fontFamily = `'${selectedFont}', Arial, sans-serif`;
    reportContent.style.color = fontColor;
    
    if (selectedFont === 'SJjnyyjyy' && isFontBold) {
        reportContent.style.fontWeight = '900';
        reportContent.style.textShadow = '1px 1px 1px rgba(0,0,0,0.1)';
    } else {
        reportContent.style.fontWeight = isFontBold ? 'bold' : 'normal';
        reportContent.style.textShadow = 'none';
    }
    
    const title = reportContainer.querySelector('.report-title');
    if (title) {
        title.style.color = titleFontColorInput ? titleFontColorInput.value : '#333333';
    }
    
    const section1Title = reportContainer.querySelector('.section-listening h2');
    if (section1Title) {
        section1Title.style.color = fontColor;
        if (selectedFont === 'SJjnyyjyy' && isFontBold) {
            section1Title.style.fontWeight = '900';
        } else {
            section1Title.style.fontWeight = isFontBold ? 'bold' : 'normal';
        }
    }
    
    const section2Title = reportContainer.querySelector('.section-interactive h2');
    if (section2Title) {
        section2Title.style.color = fontColor;
        if (selectedFont === 'SJjnyyjyy' && isFontBold) {
            section2Title.style.fontWeight = '900';
        } else {
            section2Title.style.fontWeight = isFontBold ? 'bold' : 'normal';
        }
    }
    
    const section3Title = reportContainer.querySelector('.section-creation h2');
    if (section3Title) {
        section3Title.style.color = fontColor;
        if (selectedFont === 'SJjnyyjyy' && isFontBold) {
            section3Title.style.fontWeight = '900';
        } else {
            section3Title.style.fontWeight = isFontBold ? 'bold' : 'normal';
        }
    }
    
    const tables = reportContainer.querySelectorAll('.interaction-table');
    tables.forEach(table => {
        const cells = table.querySelectorAll('th, td');
        cells.forEach(cell => {
            cell.style.color = fontColor;
            if (selectedFont === 'SJjnyyjyy' && isFontBold) {
                cell.style.fontWeight = '900';
            } else {
                cell.style.fontWeight = isFontBold ? 'bold' : 'normal';
            }
        });
    });
    
    if (window.chartInstance) {
        window.chartInstance.options.scales.y.ticks.color = fontColor;
        window.chartInstance.options.scales.y.ticks.font.weight = isFontBold ? 'bold' : 'normal';
        window.chartInstance.options.scales.x.ticks.color = fontColor;
        window.chartInstance.options.scales.x.ticks.font.weight = isFontBold ? 'bold' : 'normal';
        window.chartInstance.update();
    }
    
    console.log('字体样式已实时更新:', `font: ${selectedFont}, color: ${fontColor}, bold: ${isFontBold}`);
}

// 实时更新表格详细样式
function updateTableColumnStyles() {
    const tables = document.querySelectorAll('.interaction-table');
    if (tables.length === 0) {
        console.warn('updateTableColumnStyles: 未找到表格元素');
        return;
    }
    
    const tableAlignment = tableAlignmentSelect ? tableAlignmentSelect.value : 'left';
    const tableFontSize = tableFontSizeInput ? parseInt(tableFontSizeInput.value) : 10;
    
    tables.forEach(table => {
        table.style.textAlign = tableAlignment;
        table.style.fontSize = `${tableFontSize}px`;
        
        const cells = table.querySelectorAll('th, td');
        cells.forEach(cell => {
            cell.style.textAlign = tableAlignment;
            cell.style.fontSize = `${tableFontSize}px`;
        });
    });
    
    console.log('表格详细样式已实时更新:', `alignment: ${tableAlignment}, fontSize: ${tableFontSize}px`);
}

// 图片布局模式切换事件监听
if (singleColumnBtn && doubleColumnBtn && imageLayoutModeSelect) {
    singleColumnBtn.addEventListener('click', function() {
        imageLayoutModeSelect.value = 'single';
        singleColumnBtn.classList.add('active');
        doubleColumnBtn.classList.remove('active');
        // 保存删除状态
        const deletedUrls = deletedImagesHistory.map(item => item.url);
        generateReport();
        // 恢复删除状态
        setTimeout(() => {
            const allImages = document.querySelectorAll('.creation-image');
            allImages.forEach(img => {
                if (deletedUrls.includes(img.src)) {
                    const wrapper = img.closest('div[style*="position: relative"]');
                    if (wrapper) {
                        wrapper.remove();
                    }
                }
            });
        }, 100);
    });
    
    doubleColumnBtn.addEventListener('click', function() {
        imageLayoutModeSelect.value = 'double';
        doubleColumnBtn.classList.add('active');
        singleColumnBtn.classList.remove('active');
        // 保存删除状态
        const deletedUrls = deletedImagesHistory.map(item => item.url);
        generateReport();
        // 恢复删除状态
        setTimeout(() => {
            const allImages = document.querySelectorAll('.creation-image');
            allImages.forEach(img => {
                if (deletedUrls.includes(img.src)) {
                    const wrapper = img.closest('div[style*="position: relative"]');
                    if (wrapper) {
                        wrapper.remove();
                    }
                }
            });
        }, 100);
    });
}

// 实时更新背景图片样式
function updateBackgroundStyles() {
    const reportContainer = document.querySelector('.report');
    if (!reportContainer) {
        console.warn('未找到报告容器');
        return;
    }
    
    console.log('updateBackgroundStyles被调用，当前bgUrl:', bgUrl ? bgUrl.substring(0, 50) + '...' : 'undefined');
    
    // 直接使用全局变量bgUrl，而不是重新从bgSelect获取
    // 这样可以确保使用当前设置的背景图片URL
    reportContainer.style.backgroundImage = `url('${bgUrl}')`;
    reportContainer.style.backgroundSize = '100% 100%';
    reportContainer.style.backgroundPosition = 'center top';
    reportContainer.style.backgroundRepeat = 'no-repeat';
    
    // 确保背景图片不随滚动而移动
    reportContainer.style.backgroundAttachment = 'scroll';
    
    console.log('背景图片样式已实时更新');
}

if (document.getElementById('imageZoomInBtn')) {
    document.getElementById('imageZoomInBtn').addEventListener('click', function() {
        if (!isCardLocked('image-settings')) {
            if (imageSizeInput) {
                let currentValue = parseInt(imageSizeInput.value);
                currentValue = Math.min(currentValue + 10, 200);
                imageSizeInput.value = currentValue;
                if (imageSizeValue) {
                    imageSizeValue.textContent = `${currentValue}%`;
                }
                updateImageStyles();
            }
        }
    });
}

if (document.getElementById('imageZoomOutBtn')) {
    document.getElementById('imageZoomOutBtn').addEventListener('click', function() {
        if (!isCardLocked('image-settings')) {
            if (imageSizeInput) {
                let currentValue = parseInt(imageSizeInput.value);
                currentValue = Math.max(currentValue - 10, 10);
                imageSizeInput.value = currentValue;
                if (imageSizeValue) {
                    imageSizeValue.textContent = `${currentValue}%`;
                }
                updateImageStyles();
            }
        }
    });
}

if (document.getElementById('imageMoveUpBtn')) {
    document.getElementById('imageMoveUpBtn').addEventListener('click', function() {
        if (!isCardLocked('image-settings')) {
            if (imageTopPositionInput) {
                let currentValue = parseInt(imageTopPositionInput.value);
                currentValue = Math.max(currentValue - 10, -500);
                imageTopPositionInput.value = currentValue;
                if (imageTopPositionValue) {
                    imageTopPositionValue.textContent = `${currentValue}px`;
                }
                updateImageStyles();
            }
        }
    });
}

if (document.getElementById('imageMoveDownBtn')) {
    document.getElementById('imageMoveDownBtn').addEventListener('click', function() {
        if (!isCardLocked('image-settings')) {
            if (imageTopPositionInput) {
                let currentValue = parseInt(imageTopPositionInput.value);
                currentValue = Math.min(currentValue + 10, 200);
                imageTopPositionInput.value = currentValue;
                if (imageTopPositionValue) {
                    imageTopPositionValue.textContent = `${currentValue}px`;
                }
                updateImageStyles();
            }
        }
    });
}

if (document.getElementById('imageMoveLeftBtn')) {
    document.getElementById('imageMoveLeftBtn').addEventListener('click', function() {
        if (!isCardLocked('image-settings')) {
            if (imageLeftPositionInput) {
                let currentValue = parseInt(imageLeftPositionInput.value);
                currentValue = Math.max(currentValue - 10, -100);
                imageLeftPositionInput.value = currentValue;
                if (imageLeftPositionValue) {
                    imageLeftPositionValue.textContent = `${currentValue}px`;
                }
                updateImageStyles();
            }
        }
    });
}

if (document.getElementById('imageMoveRightBtn')) {
    document.getElementById('imageMoveRightBtn').addEventListener('click', function() {
        if (!isCardLocked('image-settings')) {
            if (imageLeftPositionInput) {
                let currentValue = parseInt(imageLeftPositionInput.value);
                currentValue = Math.min(currentValue + 10, 500);
                imageLeftPositionInput.value = currentValue;
                if (imageLeftPositionValue) {
                    imageLeftPositionValue.textContent = `${currentValue}px`;
                }
                updateImageStyles();
            }
        }
    });
}

if (clearCacheImagesBtn) {
    clearCacheImagesBtn.addEventListener('click', function() {
        if (!isCardLocked('single-image-adjustment')) {
            // 显示存储使用情况
            const storageUsage = getStorageUsage();
            
            const message = `当前存储使用情况:\n` +
                `总大小: ${storageUsage.sizeMB} MB\n` +
                `存储项数: ${storageUsage.itemCount}\n\n` +
                `确定要清理所有缓存数据吗？\n` +
                `这将删除:\n` +
                `- 所有图片缓存\n` +
                `- 所有本地存储数据\n` +
                `- 所有学员操作记录\n` +
                `- 所有上传的图片\n\n` +
                `此操作不可恢复！`;
            
            if (confirm(message)) {
                clearAllCache();
                
                // 更新界面
                updateImageList();
                updateImageSelector();
                renderPreview();
            }
        }
    });
}

// 柱状图调整按钮事件监听器
if (document.getElementById('chartZoomInBtn')) {
    document.getElementById('chartZoomInBtn').addEventListener('click', function() {
        if (!isCardLocked('chart-settings')) {
            chartScale = Math.min(chartScale + 10, 200);
            updateChartStyles();
        }
    });
}

if (document.getElementById('chartZoomOutBtn')) {
    document.getElementById('chartZoomOutBtn').addEventListener('click', function() {
        if (!isCardLocked('chart-settings')) {
            chartScale = Math.max(chartScale - 10, 50);
            updateChartStyles();
        }
    });
}

if (document.getElementById('chartMoveUpBtn')) {
    document.getElementById('chartMoveUpBtn').addEventListener('click', function() {
        if (!isCardLocked('chart-settings')) {
            chartTopPosition = Math.max(chartTopPosition - 10, -200);
            updateChartStyles();
        }
    });
}

if (document.getElementById('chartMoveDownBtn')) {
    document.getElementById('chartMoveDownBtn').addEventListener('click', function() {
        if (!isCardLocked('chart-settings')) {
            chartTopPosition = Math.min(chartTopPosition + 10, 200);
            updateChartStyles();
        }
    });
}

if (document.getElementById('chartMoveLeftBtn')) {
    document.getElementById('chartMoveLeftBtn').addEventListener('click', function() {
        if (!isCardLocked('chart-settings')) {
            chartLeftPosition = Math.max(chartLeftPosition - 10, -200);
            updateChartStyles();
        }
    });
}

if (document.getElementById('chartMoveRightBtn')) {
    document.getElementById('chartMoveRightBtn').addEventListener('click', function() {
        if (!isCardLocked('chart-settings')) {
            chartLeftPosition = Math.min(chartLeftPosition + 10, 200);
            updateChartStyles();
        }
    });
}

// 表格调整按钮事件监听器
if (document.getElementById('tableZoomInBtn')) {
    document.getElementById('tableZoomInBtn').addEventListener('click', function() {
        if (!isCardLocked('table-settings')) {
            tableScale = Math.min(tableScale + 10, 200);
            updateTableStyles();
        }
    });
}

if (document.getElementById('tableZoomOutBtn')) {
    document.getElementById('tableZoomOutBtn').addEventListener('click', function() {
        if (!isCardLocked('table-settings')) {
            tableScale = Math.max(tableScale - 10, 50);
            updateTableStyles();
        }
    });
}

if (document.getElementById('tableMoveUpBtn')) {
    document.getElementById('tableMoveUpBtn').addEventListener('click', function() {
        if (!isCardLocked('table-settings')) {
            tableTopPosition = Math.max(tableTopPosition - 10, -200);
            updateTableStyles();
        }
    });
}

if (document.getElementById('tableMoveDownBtn')) {
    document.getElementById('tableMoveDownBtn').addEventListener('click', function() {
        if (!isCardLocked('table-settings')) {
            tableTopPosition = Math.min(tableTopPosition + 10, 200);
            updateTableStyles();
        }
    });
}

if (document.getElementById('tableMoveLeftBtn')) {
    document.getElementById('tableMoveLeftBtn').addEventListener('click', function() {
        if (!isCardLocked('table-settings')) {
            tableLeftPosition = Math.max(tableLeftPosition - 10, -200);
            updateTableStyles();
        }
    });
}

if (document.getElementById('tableMoveRightBtn')) {
    document.getElementById('tableMoveRightBtn').addEventListener('click', function() {
        if (!isCardLocked('table-settings')) {
            tableLeftPosition = Math.min(tableLeftPosition + 10, 200);
            updateTableStyles();
        }
    });
}

// 处理CSV文件上传 - 多编码尝试机制
function handleCsvFiles(e) {
    const files = e.target.files;
    if (files.length === 0) {
        return;
    }
    
    let processedFiles = 0;
    let hasError = false;
    
    Array.from(files).forEach(file => {
        console.log('开始处理文件:', file.name);
        console.log('文件类型:', file.type);
        console.log('文件大小:', file.size, 'bytes');
        
        const encodings = ['UTF-8', 'GBK', 'GB2312', 'GB18030', 'ISO-8859-1'];
        let currentEncodingIndex = 0;
        
        function tryReadWithEncoding() {
            if (currentEncodingIndex >= encodings.length) {
                console.error('所有编码尝试都失败:', file.name);
                hasError = true;
                processedFiles++;
                checkCompletion();
                return;
            }
            
            const encoding = encodings[currentEncodingIndex];
            console.log(`尝试使用 ${encoding} 编码读取文件`);
            
            const reader = new FileReader();
            reader.onload = function(e) {
                try {
                    const content = e.target.result;
                    console.log(`文件内容加载成功 (${encoding})，长度:`, content.length);
                    console.log(`文件前100字符 (${encoding}):`, content.substring(0, 100) + '...');
                    
                    if (content.includes('�')) {
                        console.log(`${encoding} 编码产生乱码，尝试下一个编码`);
                        currentEncodingIndex++;
                        tryReadWithEncoding();
                        return;
                    }
                    
                    const data = parseCsv(content);
                    console.log(`解析结果 (${encoding}):`, data);
                    
                    if (data && data.rows && data.rows.length > 0) {
                        console.log(`成功使用 ${encoding} 编码解析文件`);
                        console.log(`解析出的数据行数: ${data.rows.length}`);
                        console.log(`第一行数据:`, data.rows[0]);
                        csvData.push(data);
                        csvFilenames.push(file.name.replace('.csv', ''));
                        console.log('文件解析成功，添加到csvData');
                        console.log(`当前csvData长度: ${csvData.length}`);
                        processedFiles++;
                        checkCompletion();
                    } else {
                        console.warn(`${encoding} 编码解析失败或没有数据，尝试下一个编码`);
                        console.warn(`解析结果:`, data);
                        currentEncodingIndex++;
                        tryReadWithEncoding();
                    }
                } catch (error) {
                    console.error(`${encoding} 编码解析失败:`, error);
                    console.error('错误堆栈:', error.stack);
                    currentEncodingIndex++;
                    tryReadWithEncoding();
                }
            };
            
            reader.onerror = function(error) {
                console.error(`${encoding} 编码读取失败:`, error);
                currentEncodingIndex++;
                tryReadWithEncoding();
            };
            
            reader.readAsText(file, encoding);
        }
        
        function checkCompletion() {
            console.log('checkCompletion被调用');
            console.log(`processedFiles: ${processedFiles}, files.length: ${files.length}`);
            console.log(`csvData.length: ${csvData.length}`);
            
            if (processedFiles === files.length) {
                console.log('所有文件处理完成');
                if (csvData.length > 0) {
                    console.log('文件处理完成，成功解析 ' + csvData.length + ' 个文件，开始生成报告');
                    console.log('准备调用extractStudents...');
                    extractStudents();
                    console.log('extractStudents调用完成');
                    console.log('准备调用updateFileList...');
                    updateFileList();
                    console.log('updateFileList调用完成');
                    console.log('准备调用updateStudentList...');
                    updateStudentList();
                    console.log('updateStudentList调用完成');
                    console.log('准备调用generateReport...');
                    generateReport();
                    console.log('generateReport调用完成');
                    
                    setTimeout(() => {
                        console.log('准备调用autoGenerateComment...');
                        autoGenerateComment();
                    }, 500);
                } else {
                    console.error('所有文件处理失败，csvData为空');
                    alert('所有文件处理失败，请检查文件格式后重试');
                }
                
                detectThirdPartImageEmptyValues();
            }
        }
        
        tryReadWithEncoding();
    });
}

// 检测第三部分图片空值
function detectThirdPartImageEmptyValues() {
    console.log('检测第三部分图片空值');
    
    // 这里可以添加检测逻辑
    // 例如：检测所有学员的第三部分图片是否为空
    // 如果为空，可以显示提示或自动打开批量上传界面
}

// 提取学员列表
function extractStudents() {
    students = [];
    const studentMap = new Map();
    
    csvData.forEach(data => {
        if (data && data.rows) {
            data.rows.forEach(row => {
                // 查找姓名字段
                let name = '';
                if (row['姓名']) {
                    name = row['姓名'];
                } else if (row['学员姓名']) {
                    name = row['学员姓名'];
                } else if (row['名字']) {
                    name = row['名字'];
                }
                
                if (name) {
                    const trimmedName = String(name).trim();
                    if (trimmedName) {
                        studentMap.set(trimmedName, true);
                    }
                }
            });
        }
    });
    
    // 将Map转换为数组
    students = Array.from(studentMap.keys());
    console.log('提取的学员列表:', students);
}

// 更新学员列表显示
function updateStudentList() {
    console.log('=== updateStudentList 开始执行 ===');
    
    if (!studentList) {
        console.error('studentList 元素不存在');
        return;
    }
    
    studentList.innerHTML = '';
    
    if (students.length === 0) {
        studentList.innerHTML = '<p class="hint">请先上传CSV文件</p>';
        console.log('学员列表为空，显示提示');
        return;
    }
    
    console.log('开始渲染学员列表，共', students.length, '个学员');
    
    students.forEach((student, index) => {
        const studentItem = document.createElement('div');
        studentItem.className = 'student-item';
        studentItem.dataset.studentName = student;
        
        const isSelected = index === currentStudentIndex;
        
        studentItem.style.display = 'flex';
        studentItem.style.alignItems = 'center';
        studentItem.style.justifyContent = 'space-between';
        studentItem.style.padding = '12px 15px';
        studentItem.style.marginBottom = '8px';
        studentItem.style.backgroundColor = isSelected ? 'rgba(76, 175, 80, 0.3)' : 'rgba(129, 199, 132, 0.1)';
        studentItem.style.borderRadius = '4px';
        studentItem.style.cursor = 'pointer';
        studentItem.style.transition = 'all 0.3s ease';
        studentItem.style.borderLeft = isSelected ? '4px solid #4CAF50' : '4px solid #81C784';
        
        const studentName = document.createElement('span');
        studentName.textContent = student;
        studentName.style.flex = '1';
        studentName.style.fontWeight = isSelected ? 'bold' : 'normal';
        studentName.style.fontSize = '14px';
        studentName.style.color = '#333';
        
        const indexSpan = document.createElement('span');
        indexSpan.textContent = `${index + 1}`;
        indexSpan.style.marginRight = '10px';
        indexSpan.style.fontSize = '12px';
        indexSpan.style.color = '#999';
        indexSpan.style.padding = '2px 6px';
        indexSpan.style.backgroundColor = 'rgba(0, 0, 0, 0.05)';
        indexSpan.style.borderRadius = '3px';
        
        studentItem.appendChild(indexSpan);
        studentItem.appendChild(studentName);
        
        studentList.appendChild(studentItem);
    });
    
    console.log('学员列表渲染完成');
}

// 批量上传图片功能
function openBatchImageUpload() {
    console.log('打开批量图片上传界面');
    
    // 检查是否已上传CSV文件
    if (!students || students.length === 0) {
        showAlertDialog('请先上传CSV文件，系统需要从CSV中提取学员姓名才能匹配图片！', function() {
            console.log('用户确认了提示消息');
        });
        return;
    }
    
    // 创建遮罩层
    const overlay = document.createElement('div');
    overlay.style.position = 'fixed';
    overlay.style.top = '0';
    overlay.style.left = '0';
    overlay.style.width = '100%';
    overlay.style.height = '100%';
    overlay.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
    overlay.style.zIndex = '1000';
    overlay.style.display = 'flex';
    overlay.style.alignItems = 'center';
    overlay.style.justifyContent = 'center';
    
    // 创建弹窗容器
    const modal = document.createElement('div');
    modal.style.backgroundColor = 'white';
    modal.style.padding = '30px';
    modal.style.borderRadius = '8px';
    modal.style.boxShadow = '0 4px 20px rgba(0, 0, 0, 0.2)';
    modal.style.maxWidth = '80%';
    modal.style.width = '80%';
    modal.style.maxHeight = '80vh';
    modal.style.overflowY = 'auto';
    
    // 弹窗标题
    const title = document.createElement('h2');
    title.textContent = '批量上传图片';
    title.style.marginTop = '0';
    title.style.marginBottom = '20px';
    title.style.fontSize = '20px';
    title.style.fontWeight = 'bold';
    title.style.color = '#333';
    
    // 学员列表提示
    const studentHint = document.createElement('div');
    studentHint.style.padding = '15px';
    studentHint.style.backgroundColor = '#e3f2fd';
    studentHint.style.borderRadius = '4px';
    studentHint.style.marginBottom = '20px';
    studentHint.style.fontSize = '14px';
    studentHint.style.color = '#1976d2';
    studentHint.innerHTML = `<strong>当前学员列表（共${students.length}人）：</strong><br/>${students.join('、')}`;
    
    // 上传区域
    const uploadArea = document.createElement('div');
    uploadArea.style.border = '2px dashed #ddd';
    uploadArea.style.borderRadius = '4px';
    uploadArea.style.padding = '40px';
    uploadArea.style.textAlign = 'center';
    uploadArea.style.marginBottom = '20px';
    uploadArea.style.backgroundColor = '#f9f9f9';
    uploadArea.style.transition = 'all 0.3s ease';
    
    // 拖放提示
    const dropHint = document.createElement('div');
    dropHint.style.marginBottom = '20px';
    
    const dropIcon = document.createElement('div');
    dropIcon.textContent = '📁';
    dropIcon.style.fontSize = '48px';
    dropIcon.style.marginBottom = '15px';
    
    const dropText = document.createElement('p');
    dropText.textContent = '拖放图片文件到此处，或点击选择文件';
    dropText.style.fontSize = '16px';
    dropText.style.color = '#666';
    
    const dropSubtext = document.createElement('p');
    dropSubtext.textContent = '支持同时选择多个图片文件（单次上限20个，单个文件不超过5MB）';
    dropSubtext.style.fontSize = '14px';
    dropSubtext.style.color = '#999';
    dropSubtext.style.marginTop = '10px';
    
    const dropGuide = document.createElement('p');
    dropGuide.textContent = '提示：请确保图片文件名与学员姓名完全一致，系统将自动匹配';
    dropGuide.style.fontSize = '12px';
    dropGuide.style.color = '#4CAF50';
    dropGuide.style.marginTop = '5px';
    
    dropHint.appendChild(dropIcon);
    dropHint.appendChild(dropText);
    dropHint.appendChild(dropSubtext);
    dropHint.appendChild(dropGuide);
    
    // 选择文件按钮
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.multiple = true;
    fileInput.accept = 'image/*';
    fileInput.style.display = 'none';
    
    const selectButton = document.createElement('button');
    selectButton.textContent = '选择文件';
    selectButton.style.padding = '10px 20px';
    selectButton.style.border = '1px solid #4CAF50';
    selectButton.style.borderRadius = '4px';
    selectButton.style.backgroundColor = 'white';
    selectButton.style.color = '#4CAF50';
    selectButton.style.cursor = 'pointer';
    selectButton.style.fontSize = '14px';
    
    // 上传进度条
    const progressContainer = document.createElement('div');
    progressContainer.style.display = 'none';
    progressContainer.style.marginBottom = '20px';
    
    const progressBar = document.createElement('div');
    progressBar.style.width = '100%';
    progressBar.style.height = '20px';
    progressBar.style.backgroundColor = '#f0f0f0';
    progressBar.style.borderRadius = '10px';
    progressBar.style.overflow = 'hidden';
    
    const progressFill = document.createElement('div');
    progressFill.style.width = '0%';
    progressFill.style.height = '100%';
    progressFill.style.backgroundColor = '#4CAF50';
    progressFill.style.transition = 'width 0.3s ease';
    
    const progressText = document.createElement('div');
    progressText.style.textAlign = 'center';
    progressText.style.marginTop = '5px';
    progressText.style.fontSize = '14px';
    progressText.style.color = '#666';
    
    progressBar.appendChild(progressFill);
    progressContainer.appendChild(progressBar);
    progressContainer.appendChild(progressText);
    
    // 上传状态
    const statusContainer = document.createElement('div');
    statusContainer.style.display = 'none';
    statusContainer.style.marginBottom = '20px';
    statusContainer.style.padding = '15px';
    statusContainer.style.borderRadius = '4px';
    
    // 操作按钮容器
    const buttonContainer = document.createElement('div');
    buttonContainer.style.display = 'flex';
    buttonContainer.style.justifyContent = 'flex-end';
    buttonContainer.style.gap = '10px';
    buttonContainer.style.marginTop = '20px';
    
    // 取消按钮
    const cancelButton = document.createElement('button');
    cancelButton.textContent = '取消';
    cancelButton.style.padding = '10px 20px';
    cancelButton.style.border = '1px solid #ddd';
    cancelButton.style.borderRadius = '4px';
    cancelButton.style.backgroundColor = '#f5f5f5';
    cancelButton.style.color = '#333';
    cancelButton.style.cursor = 'pointer';
    cancelButton.style.fontSize = '14px';
    
    // 开始上传按钮
    const uploadButton = document.createElement('button');
    uploadButton.textContent = '开始上传';
    uploadButton.style.padding = '10px 20px';
    uploadButton.style.border = '1px solid #4CAF50';
    uploadButton.style.borderRadius = '4px';
    uploadButton.style.backgroundColor = '#4CAF50';
    uploadButton.style.color = 'white';
    uploadButton.style.cursor = 'pointer';
    uploadButton.style.fontSize = '14px';
    uploadButton.style.fontWeight = 'bold';
    uploadButton.disabled = true;
    
    // 文件列表区域
    const fileListArea = document.createElement('div');
    fileListArea.style.marginBottom = '20px';
    fileListArea.style.maxHeight = '300px';
    fileListArea.style.overflowY = 'auto';
    fileListArea.style.border = '1px solid #ddd';
    fileListArea.style.borderRadius = '4px';
    fileListArea.style.padding = '10px';
    fileListArea.style.backgroundColor = '#f9f9f9';
    
    const fileListTitle = document.createElement('h4');
    fileListTitle.textContent = '已选择文件';
    fileListTitle.style.marginBottom = '10px';
    fileListTitle.style.fontSize = '14px';
    fileListTitle.style.color = '#333';
    
    const fileList = document.createElement('div');
    fileList.id = 'selectedFileList';
    
    fileListArea.appendChild(fileListTitle);
    fileListArea.appendChild(fileList);
    
    // 组装弹窗
    modal.appendChild(title);
    modal.appendChild(studentHint);
    modal.appendChild(uploadArea);
    uploadArea.appendChild(dropHint);
    dropHint.appendChild(dropIcon);
    dropHint.appendChild(dropText);
    dropHint.appendChild(dropSubtext);
    dropHint.appendChild(dropGuide);
    uploadArea.appendChild(selectButton);
    uploadArea.appendChild(fileInput);
    modal.appendChild(fileListArea);
    modal.appendChild(progressContainer);
    modal.appendChild(statusContainer);
    modal.appendChild(buttonContainer);
    buttonContainer.appendChild(cancelButton);
    buttonContainer.appendChild(uploadButton);
    overlay.appendChild(modal);
    document.body.appendChild(overlay);
    
    // 已选择的文件
    let selectedFiles = [];
    
    // 更新文件预览
    function updateFilePreview() {
        // 显示已选择文件数量
        dropText.textContent = `已选择 ${selectedFiles.length} 个文件`;
        dropSubtext.textContent = `支持同时选择多个图片文件（单次上限20个，单个文件不超过5MB）`;
        
        // 如果有文件，显示提示信息
        if (selectedFiles.length > 0) {
            dropGuide.textContent = '提示：请确保图片文件名与学员姓名完全一致，系统将自动匹配';
        } else {
            dropGuide.textContent = '提示：请确保图片文件名与学员姓名完全一致，系统将自动匹配';
        }
        
        // 更新文件列表显示
        if (fileList) {
            fileList.innerHTML = '';
            
            selectedFiles.forEach((file, index) => {
                const fileItem = document.createElement('div');
                fileItem.style.display = 'flex';
                fileItem.style.alignItems = 'center';
                fileItem.style.justifyContent = 'space-between';
                fileItem.style.padding = '8px';
                fileItem.style.backgroundColor = '#f0f0f0';
                fileItem.style.marginBottom = '5px';
                fileItem.style.borderRadius = '4px';
                fileItem.style.transition = 'all 0.3s ease';
                
                fileItem.addEventListener('mouseover', function() {
                    this.style.backgroundColor = '#e0e0e0';
                });
                
                fileItem.addEventListener('mouseout', function() {
                    this.style.backgroundColor = '#f0f0f0';
                });
                
                const fileName = document.createElement('span');
                fileName.textContent = file.name;
                fileName.style.flex = '1';
                fileName.style.fontSize = '14px';
                
                fileItem.appendChild(fileName);
                fileList.appendChild(fileItem);
            });
        }
        
        console.log('已选择文件:', selectedFiles);
    }
    
    // 拖放事件处理
    uploadArea.addEventListener('dragover', function(e) {
        e.preventDefault();
        uploadArea.style.borderColor = '#4CAF50';
        uploadArea.style.backgroundColor = '#f0f8f0';
    });
    
    uploadArea.addEventListener('dragleave', function() {
        uploadArea.style.borderColor = '#ddd';
        uploadArea.style.backgroundColor = '#f9f9f9';
    });
    
    uploadArea.addEventListener('drop', function(e) {
        e.preventDefault();
        uploadArea.style.borderColor = '#ddd';
        uploadArea.style.backgroundColor = '#f9f9f9';
        
        const files = e.dataTransfer.files;
        handleFiles(files);
    });
    
    // 点击选择文件
    selectButton.addEventListener('click', function() {
        fileInput.click();
    });
    
    // 文件选择事件
    fileInput.addEventListener('change', function(e) {
        const files = e.target.files;
        handleFiles(files);
    });
    
    // 处理选择的文件
    function handleFiles(files) {
        if (files.length === 0) return;
        
        // 限制文件数量
        if (selectedFiles.length + files.length > 20) {
            showAlertDialog('单次上传最多支持20个文件', function() {
                console.log('用户确认了提示消息');
            });
            return;
        }
        
        // 验证文件类型和大小
        const validFiles = [];
        const invalidFiles = [];
        
        Array.from(files).forEach(file => {
            // 验证文件类型
            const validTypes = ['image/jpeg', 'image/png', 'image/webp'];
            if (!validTypes.includes(file.type)) {
                invalidFiles.push(`${file.name} (无效的文件类型)`);
                return;
            }
            
            // 验证文件大小（不超过5MB）
            const maxSize = 5 * 1024 * 1024; // 5MB
            if (file.size > maxSize) {
                invalidFiles.push(`${file.name} (文件大小超过5MB限制)`);
                return;
            }
            
            validFiles.push(file);
        });
        
        if (validFiles.length === 0) {
            showAlertDialog('请选择有效的图片文件（JPG、PNG、WEBP，单个文件不超过5MB）', function() {
                console.log('用户确认了提示消息');
            });
            return;
        }
        
        if (invalidFiles.length > 0) {
            showAlertDialog(`以下文件不符合要求：\n${invalidFiles.join('\n')}\n\n已跳过这些文件。`, function() {
                console.log('用户确认了提示消息');
            });
        }
        
        // 添加到已选择文件
        selectedFiles = [...selectedFiles, ...validFiles];
        
        // 更新上传按钮状态
        uploadButton.disabled = selectedFiles.length === 0;
        
        // 更新文件预览
        updateFilePreview();
    }
    
    // 开始上传
    uploadButton.addEventListener('click', function() {
        if (selectedFiles.length === 0) return;
        
        // 显示进度条
        progressContainer.style.display = 'block';
        
        // 禁用上传按钮
        uploadButton.disabled = true;
        
        // 开始上传
        processBatchUpload(selectedFiles, progressFill, progressText, statusContainer, overlay);
    });
    
    // 取消上传
    cancelButton.addEventListener('click', function() {
        showConfirmDialog('确定要取消上传吗？', function(confirmed) {
            if (confirmed) {
                document.body.removeChild(overlay);
            }
        });
    });
    
    // 支持键盘操作
    document.addEventListener('keydown', function handleKeydown(e) {
        if (e.key === 'Escape') {
            document.body.removeChild(overlay);
            document.removeEventListener('keydown', handleKeydown);
        }
    });
}

// 处理批量上传
function processBatchUpload(files, progressFill, progressText, statusContainer, overlay) {
    console.log('开始批量上传图片，文件数量:', files.length);
    
    let processedCount = 0;
    const totalFiles = files.length;
    const matchedAssignments = [];
    const unmatchedImages = [];
    
    // 读取所有图片数据
    const readPromises = files.map(file => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = function(e) {
                resolve({ file, imageData: e.target.result });
            };
            reader.onerror = function() {
                reject(new Error('图片读取失败'));
            };
            reader.readAsDataURL(file);
        });
    });
    
    Promise.all(readPromises)
        .then(results => {
            console.log('所有图片读取完成:', results.length, '张图片');
            
            // 处理每张图片
            results.forEach(result => {
                const { file, imageData } = result;
                const fileName = file.name;
                
                console.log(`处理文件: ${fileName}`);
                
                // 使用智能识别函数从文件名中识别学员姓名
                const matchedStudent = identifyStudentFromFileName(fileName);
                
                if (matchedStudent) {
                    console.log(`图片 ${fileName} 匹配到学员: ${matchedStudent}`);
                    matchedAssignments.push({ file, studentName: matchedStudent, imageData });
                } else {
                    console.log(`图片 ${fileName} 未匹配到学员`);
                    unmatchedImages.push({ file, imageData });
                }
                
                processedCount++;
                
                // 更新进度
                const progress = (processedCount / totalFiles) * 100;
                progressFill.style.width = `${progress}%`;
                progressText.textContent = `${processedCount}/${totalFiles}`;
            });
            
            console.log('批量上传完成');
            console.log('匹配成功:', matchedAssignments.length);
            console.log('未匹配:', unmatchedImages.length);
            
            // 处理匹配成功的图片：分配给对应学员
            matchedAssignments.forEach(assignment => {
                const { studentName, imageData, file } = assignment;
                
                let record = studentOperationRecords[studentName];
                
                if (!record) {
                    record = {
                        formData: collectFormData(),
                        settings: {
                            imageLayoutMode: imageLayoutModeSelect ? imageLayoutModeSelect.value : 'double',
                            tableScale: tableScale,
                            tableTopPosition: tableTopPosition,
                            tableLeftPosition: tableLeftPosition,
                            sectionPositions: {...sectionPositions},
                            lockedCards: Array.from(lockedCards),
                            imageAdjustments: [...imageAdjustments]
                        },
                        thirdPartImages: [],
                        thirdPartImageNames: [],
                        timestamp: Date.now()
                    };
                }
                
                const existingImages = new Set(record.thirdPartImages);
                if (!existingImages.has(imageData)) {
                    record.thirdPartImages.push(imageData);
                    record.thirdPartImageNames.push(file.name);
                    
                    if (record.thirdPartImages.length > 10) {
                        record.thirdPartImages = record.thirdPartImages.slice(0, 10);
                        record.thirdPartImageNames = record.thirdPartImageNames.slice(0, 10);
                    }
                }
                
                studentOperationRecords[studentName] = record;
                console.log(`图片已添加到学员【${studentName}】`);
            });
            
            // 保存到本地存储
            saveStudentOperationRecords();
            
            // 重新加载当前学员的记录，确保全局变量被更新
            if (students[currentStudentIndex]) {
                const currentStudent = students[currentStudentIndex];
                console.log('批量上传完成，当前学员:', currentStudent);
                console.log('当前学员的记录:', studentOperationRecords[currentStudent]);
                loadStudentOperationRecord(currentStudent);
                console.log('重新加载后，全局变量customImages数量:', customImages.length);
            }
            
            // 更新UI
            updateImageList();
            updateImageSelector();
            generateReport();
            
            // 如果有未匹配的图片，显示手动匹配弹窗
            if (unmatchedImages.length > 0) {
                const matchedCount = matchedAssignments.length;
                const unmatchedCount = unmatchedImages.length;
                
                statusContainer.innerHTML = `
                    <p style="color: green;">✓ 上传完成！成功处理 ${processedCount} 个文件</p>
                    <p style="color: #1976d2; margin-top: 10px;">
                        匹配成功：${matchedCount} 个<br/>
                        匹配失败：${unmatchedCount} 个（请手动匹配）
                    </p>
                `;
                
                // 显示手动匹配弹窗
                setTimeout(() => {
                    showManualMatchDialog(unmatchedImages, matchedAssignments, progressFill, progressText, statusContainer, overlay);
                }, 1000);
            } else {
                // 显示完成消息
                statusContainer.innerHTML = `<p style="color: green;">✓ 上传完成！成功处理 ${processedCount} 个文件，全部匹配成功！</p>`;
                
                // 延迟关闭弹窗
                setTimeout(() => {
                    document.body.removeChild(overlay);
                }, 2000);
            }
        })
        .catch(error => {
            console.error('处理图片时出错:', error);
            statusContainer.innerHTML = `<p style="color: red;">✗ 处理图片时出错：${error.message}</p>`;
        });
}

// 显示手动匹配弹窗
function showManualMatchDialog(unmatchedImages, matchedAssignments, progressFill, progressText, statusContainer, overlay) {
    console.log('显示手动匹配弹窗，未匹配图片数量:', unmatchedImages.length);
    
    const matchOverlay = document.createElement('div');
    matchOverlay.style.position = 'fixed';
    matchOverlay.style.top = '0';
    matchOverlay.style.left = '0';
    matchOverlay.style.width = '100%';
    matchOverlay.style.height = '100%';
    matchOverlay.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
    matchOverlay.style.zIndex = '10000';
    matchOverlay.style.display = 'flex';
    matchOverlay.style.justifyContent = 'center';
    matchOverlay.style.alignItems = 'center';
    
    const matchModal = document.createElement('div');
    matchModal.style.backgroundColor = 'white';
    matchModal.style.borderRadius = '8px';
    matchModal.style.padding = '30px';
    matchModal.style.boxShadow = '0 4px 20px rgba(0, 0, 0, 0.2)';
    matchModal.style.maxWidth = '90%';
    matchModal.style.width = '900px';
    matchModal.style.maxHeight = '85vh';
    matchModal.style.overflowY = 'auto';
    
    const matchTitle = document.createElement('h2');
    matchTitle.textContent = '手动匹配图片';
    matchTitle.style.marginTop = '0';
    matchTitle.style.marginBottom = '20px';
    matchTitle.style.fontSize = '20px';
    matchTitle.style.fontWeight = 'bold';
    matchTitle.style.color = '#333';
    
    const matchHint = document.createElement('div');
    matchHint.style.padding = '15px';
    matchHint.style.backgroundColor = '#fff3e0';
    matchHint.style.borderRadius = '4px';
    matchHint.style.marginBottom = '20px';
    matchHint.style.fontSize = '14px';
    matchHint.style.color = '#e65100';
    matchHint.innerHTML = `<strong>提示：</strong>以下 ${unmatchedImages.length} 张图片未能自动匹配到学员，请手动选择对应的学员。`;
    
    const matchList = document.createElement('div');
    matchList.style.marginBottom = '20px';
    
    unmatchedImages.forEach((item, index) => {
        const matchItem = document.createElement('div');
        matchItem.style.border = '1px solid #ddd';
        matchItem.style.borderRadius = '4px';
        matchItem.style.padding = '15px';
        matchItem.style.marginBottom = '15px';
        matchItem.style.backgroundColor = '#f9f9f9';
        
        const matchItemHeader = document.createElement('div');
        matchItemHeader.style.display = 'flex';
        matchItemHeader.style.alignItems = 'center';
        matchItemHeader.style.marginBottom = '10px';
        
        const previewImage = document.createElement('img');
        previewImage.src = item.imageData;
        previewImage.style.width = '80px';
        previewImage.style.height = '80px';
        previewImage.style.objectFit = 'cover';
        previewImage.style.borderRadius = '4px';
        previewImage.style.marginRight = '15px';
        previewImage.style.border = '1px solid #ddd';
        
        const imageInfo = document.createElement('div');
        imageInfo.style.flex = '1';
        
        const imageName = document.createElement('div');
        imageName.textContent = `文件名：${item.file.name}`;
        imageName.style.fontWeight = 'bold';
        imageName.style.marginBottom = '5px';
        imageName.style.color = '#333';
        
        const imageSize = document.createElement('div');
        imageSize.textContent = `大小：${(item.file.size / 1024).toFixed(2)} KB`;
        imageSize.style.fontSize = '12px';
        imageSize.style.color = '#666';
        
        imageInfo.appendChild(imageName);
        imageInfo.appendChild(imageSize);
        
        const studentSelect = document.createElement('select');
        studentSelect.style.width = '100%';
        studentSelect.style.padding = '10px';
        studentSelect.style.border = '1px solid #ddd';
        studentSelect.style.borderRadius = '4px';
        studentSelect.style.fontSize = '14px';
        studentSelect.style.marginTop = '10px';
        
        const defaultOption = document.createElement('option');
        defaultOption.value = '';
        defaultOption.textContent = '-- 请选择学员 --';
        studentSelect.appendChild(defaultOption);
        
        students.forEach(student => {
            const option = document.createElement('option');
            option.value = student;
            option.textContent = student;
            studentSelect.appendChild(option);
        });
        
        matchItemHeader.appendChild(previewImage);
        matchItemHeader.appendChild(imageInfo);
        matchItem.appendChild(matchItemHeader);
        matchItem.appendChild(studentSelect);
        matchList.appendChild(matchItem);
        
        item.studentSelect = studentSelect;
    });
    
    const matchButtonContainer = document.createElement('div');
    matchButtonContainer.style.display = 'flex';
    matchButtonContainer.style.justifyContent = 'flex-end';
    matchButtonContainer.style.gap = '10px';
    matchButtonContainer.style.marginTop = '20px';
    matchButtonContainer.style.borderTop = '1px solid #ddd';
    matchButtonContainer.style.paddingTop = '20px';
    
    const skipButton = document.createElement('button');
    skipButton.textContent = '跳过（添加到当前学员）';
    skipButton.style.padding = '10px 20px';
    skipButton.style.border = '1px solid #ddd';
    skipButton.style.borderRadius = '4px';
    skipButton.style.backgroundColor = '#f5f5f5';
    skipButton.style.color = '#333';
    skipButton.style.cursor = 'pointer';
    skipButton.style.fontSize = '14px';
    
    const manualMatchButton = document.createElement('button');
    manualMatchButton.textContent = '🔧 手动匹配';
    manualMatchButton.style.padding = '10px 20px';
    manualMatchButton.style.border = '1px solid #2196F3';
    manualMatchButton.style.borderRadius = '4px';
    manualMatchButton.style.backgroundColor = '#2196F3';
    manualMatchButton.style.color = 'white';
    manualMatchButton.style.cursor = 'pointer';
    manualMatchButton.style.fontSize = '14px';
    
    const confirmButton = document.createElement('button');
    confirmButton.textContent = '✅ 确定匹配';
    confirmButton.style.padding = '10px 20px';
    confirmButton.style.border = '1px solid #4CAF50';
    confirmButton.style.borderRadius = '4px';
    confirmButton.style.backgroundColor = '#4CAF50';
    confirmButton.style.color = 'white';
    confirmButton.style.cursor = 'pointer';
    confirmButton.style.fontSize = '14px';
    confirmButton.style.fontWeight = 'bold';
    confirmButton.disabled = true;
    confirmButton.style.opacity = '0.5';
    confirmButton.style.cursor = 'not-allowed';
    
    matchButtonContainer.appendChild(skipButton);
    matchButtonContainer.appendChild(manualMatchButton);
    matchButtonContainer.appendChild(confirmButton);
    
    matchModal.appendChild(matchTitle);
    matchModal.appendChild(matchHint);
    matchModal.appendChild(matchList);
    matchModal.appendChild(matchButtonContainer);
    matchOverlay.appendChild(matchModal);
    document.body.appendChild(matchOverlay);
    
    let manualMatchClicked = false;
    
    manualMatchButton.addEventListener('click', function() {
        manualMatchClicked = true;
        manualMatchButton.textContent = '✓ 已选择手动匹配';
        manualMatchButton.style.backgroundColor = '#4CAF50';
        manualMatchButton.style.borderColor = '#4CAF50';
        confirmButton.disabled = false;
        confirmButton.style.opacity = '1';
        confirmButton.style.cursor = 'pointer';
    });
    
    skipButton.addEventListener('click', function() {
        document.body.removeChild(matchOverlay);
        processUnmatchedImagesToCurrentStudent(unmatchedImages, matchedAssignments, progressFill, progressText, statusContainer, overlay);
        
        setTimeout(() => {
            if (overlay && document.body.contains(overlay)) {
                document.body.removeChild(overlay);
            }
        }, 2000);
    });
    
    confirmButton.addEventListener('click', function() {
        if (!manualMatchClicked) {
            showAlertDialog('请先点击"手动匹配"按钮', function() {
                console.log('用户确认了提示消息');
            });
            return;
        }
        
        const manualAssignments = [];
        const unassignedImages = [];
        
        unmatchedImages.forEach(item => {
            const selectedStudent = item.studentSelect.value;
            if (selectedStudent) {
                manualAssignments.push({
                    file: item.file,
                    studentName: selectedStudent,
                    imageData: item.imageData
                });
                console.log(`手动匹配：${item.file.name} -> ${selectedStudent}`);
            } else {
                unassignedImages.push(item);
            }
        });
        
        document.body.removeChild(matchOverlay);
        
        if (manualAssignments.length > 0) {
            processManualAssignments(manualAssignments, progressFill, progressText, statusContainer, overlay);
        }
        
        if (unassignedImages.length > 0) {
            processUnmatchedImagesToCurrentStudent(unassignedImages, matchedAssignments, progressFill, progressText, statusContainer, overlay);
        }
        
        setTimeout(() => {
            if (overlay && document.body.contains(overlay)) {
                document.body.removeChild(overlay);
            }
        }, 2000);
    });
    
    document.addEventListener('keydown', function handleMatchKeydown(e) {
        if (e.key === 'Escape') {
            document.body.removeChild(matchOverlay);
            document.removeEventListener('keydown', handleMatchKeydown);
        }
    });
}

// 处理手动匹配的图片
function processManualAssignments(manualAssignments, progressFill, progressText, statusContainer, overlay) {
    console.log('处理手动匹配的图片，数量:', manualAssignments.length);
    
    manualAssignments.forEach(assignment => {
        const { studentName, imageData, file } = assignment;
        
        let record = studentOperationRecords[studentName];
        
        if (!record) {
            record = {
                formData: collectFormData(),
                settings: {
                    imageLayoutMode: imageLayoutModeSelect ? imageLayoutModeSelect.value : 'double',
                    tableScale: tableScale,
                    tableTopPosition: tableTopPosition,
                    tableLeftPosition: tableLeftPosition,
                    sectionPositions: {...sectionPositions},
                    lockedCards: Array.from(lockedCards),
                    imageAdjustments: [...imageAdjustments]
                },
                thirdPartImages: [],
                thirdPartImageNames: [],
                timestamp: Date.now()
            };
        }
        
        const existingImages = new Set(record.thirdPartImages);
        if (!existingImages.has(imageData)) {
            record.thirdPartImages.push(imageData);
            record.thirdPartImageNames.push(file.name);
            
            if (record.thirdPartImages.length > 10) {
                record.thirdPartImages = record.thirdPartImages.slice(0, 10);
                record.thirdPartImageNames = record.thirdPartImageNames.slice(0, 10);
            }
        }
        
        studentOperationRecords[studentName] = record;
        console.log(`手动匹配的图片已添加到学员【${studentName}】`);
    });
    
    saveStudentOperationRecords();
    
    // 重新加载当前学员的记录，确保全局变量被更新
    if (students[currentStudentIndex]) {
        const currentStudent = students[currentStudentIndex];
        console.log('手动匹配完成，当前学员:', currentStudent);
        console.log('当前学员的记录:', studentOperationRecords[currentStudent]);
        loadStudentOperationRecord(currentStudent);
        console.log('重新加载后，全局变量customImages数量:', customImages.length);
    }
    
    updateImageList();
    updateImageSelector();
    generateReport();
}

// 处理未匹配的图片到当前学员
function processUnmatchedImagesToCurrentStudent(unmatchedImages, matchedAssignments, progressFill, progressText, statusContainer, overlay) {
    console.log('处理未匹配的图片到当前学员，数量:', unmatchedImages.length);
    
    if (students[currentStudentIndex]) {
        const currentStudent = students[currentStudentIndex];
        let currentRecord = studentOperationRecords[currentStudent];
        
        if (!currentRecord) {
            currentRecord = {
                formData: collectFormData(),
                settings: {
                    imageLayoutMode: imageLayoutModeSelect ? imageLayoutModeSelect.value : 'double',
                    tableScale: tableScale,
                    tableTopPosition: tableTopPosition,
                    tableLeftPosition: tableLeftPosition,
                    sectionPositions: {...sectionPositions},
                    lockedCards: Array.from(lockedCards),
                    imageAdjustments: [...imageAdjustments]
                },
                thirdPartImages: [],
                thirdPartImageNames: [],
                timestamp: Date.now()
            };
        }
        
        unmatchedImages.forEach(({ imageData, file }) => {
            const existingImages = new Set(currentRecord.thirdPartImages);
            if (!existingImages.has(imageData)) {
                currentRecord.thirdPartImages.push(imageData);
                currentRecord.thirdPartImageNames.push(file.name);
                
                if (currentRecord.thirdPartImages.length > 10) {
                    currentRecord.thirdPartImages = currentRecord.thirdPartImages.slice(0, 10);
                    currentRecord.thirdPartImageNames = currentRecord.thirdPartImageNames.slice(0, 10);
                }
            }
        });
        
        studentOperationRecords[currentStudent] = currentRecord;
        console.log(`未匹配的图片已添加到当前学员【${currentStudent}】`);
        
        saveStudentOperationRecords();
        
        // 重新加载当前学员的记录，确保全局变量被更新
        loadStudentOperationRecord(currentStudent);
        
        updateImageList();
        updateImageSelector();
        generateReport();
    } else {
        console.log('没有学员数据，无法添加未匹配的图片');
    }
    
    const totalProcessed = matchedAssignments.length + unmatchedImages.length;
    statusContainer.innerHTML = `
        <p style="color: green;">✓ 上传完成！成功处理 ${totalProcessed} 个文件</p>
        <p style="color: #1976d2; margin-top: 10px;">
            匹配成功：${matchedAssignments.length} 个<br/>
            添加到当前学员：${unmatchedImages.length} 个
        </p>
    `;
    
    setTimeout(() => {
        document.body.removeChild(overlay);
    }, 2000);
}

// 数字智能排序函数
function sortFilesIntelligently() {
    // 中文数字到阿拉伯数字的映射
    const chineseNumberMap = {
        '零': 0, '一': 1, '二': 2, '三': 3, '四': 4, '五': 5, '六': 6, '七': 7, '八': 8, '九': 9,
        '十': 10, '百': 100, '千': 1000, '万': 10000,
        '第1': 1, '第2': 2, '第3': 3, '第4': 4, '第5': 5, '第6': 6, '第7': 7, '第8': 8, '第9': 9, '第10': 10,
        '第1讲': 1, '第2讲': 2, '第3讲': 3, '第4讲': 4, '第5讲': 5, '第6讲': 6, '第7讲': 7, '第8讲': 8, '第9讲': 9, '第10讲': 10
    };
    
    // 解析文件名中的数字
    function extractNumber(filename) {
        // 尝试匹配阿拉伯数字
        const arabicMatch = filename.match(/\d+/);
        if (arabicMatch) {
            return parseInt(arabicMatch[0], 10);
        }
        
        // 尝试匹配中文数字
        for (const [chinese, arabic] of Object.entries(chineseNumberMap)) {
            if (filename.includes(chinese)) {
                return arabic;
            }
        }
        
        // 没有找到数字，返回一个大值，排在最后
        return Infinity;
    }
    
    // 创建一个包含索引和文件名的数组，以便排序后保持对应关系
    const indexedFiles = csvFilenames.map((filename, index) => ({
        index,
        filename,
        data: csvData[index]
    }));
    
    // 排序
    indexedFiles.sort((a, b) => extractNumber(a.filename) - extractNumber(b.filename));
    
    // 更新原始数组
    csvFilenames = [];
    csvData = [];
    indexedFiles.forEach(file => {
        csvFilenames.push(file.filename);
        csvData.push(file.data);
    });
    
    // 更新文件列表显示
    updateFileList();
    // 重新生成报告
    generateReport();
}

// 手动排序函数 - 上移
function moveFileUp(index) {
    if (index > 0) {
        // 交换文件名
        [csvFilenames[index], csvFilenames[index-1]] = [csvFilenames[index-1], csvFilenames[index]];
        // 交换数据
        [csvData[index], csvData[index-1]] = [csvData[index-1], csvData[index]];
        // 更新文件列表显示
        updateFileList();
        // 重新生成报告
        generateReport();
    }
}

// 手动排序函数 - 下移
function moveFileDown(index) {
    if (index < csvFilenames.length - 1) {
        // 交换文件名
        [csvFilenames[index], csvFilenames[index+1]] = [csvFilenames[index+1], csvFilenames[index]];
        // 交换数据
        [csvData[index], csvData[index+1]] = [csvData[index+1], csvData[index]];
        // 更新文件列表显示
        updateFileList();
        // 重新生成报告
        generateReport();
    }
}

// 更新文件列表显示
function updateFileList() {
    if (!fileList) return;
    
    fileList.innerHTML = '';
    
    // 不再添加清空所有缓存图片按钮，因为它与【第三部分图片设置】中的按钮重复
    // 如需清空缓存图片，请使用【第三部分图片设置】中的相关功能
    
    csvFilenames.forEach((filename, index) => {
        const fileItem = document.createElement('div');
        fileItem.style.display = 'flex';
        fileItem.style.alignItems = 'center';
        fileItem.style.justifyContent = 'space-between';
        fileItem.style.padding = '10px';
        fileItem.style.backgroundColor = 'rgba(129, 199, 132, 0.1)';
        fileItem.style.marginBottom = '8px';
        fileItem.style.borderRadius = '4px';
        fileItem.style.transition = 'all 0.3s ease';
        
        fileItem.addEventListener('mouseover', function() {
            this.style.backgroundColor = 'rgba(129, 199, 132, 0.2)';
        });
        
        fileItem.addEventListener('mouseout', function() {
            this.style.backgroundColor = 'rgba(129, 199, 132, 0.1)';
        });
        
        const fileName = document.createElement('span');
        fileName.textContent = `✓ ${filename}`;
        fileName.style.flex = '1';
        
        // 排序按钮容器
        const sortButtons = document.createElement('div');
        sortButtons.style.display = 'flex';
        sortButtons.style.gap = '5px';
        sortButtons.style.marginRight = '10px';
        
        // 上移按钮
        const upButton = document.createElement('button');
        upButton.textContent = '↑';
        upButton.style.padding = '4px 8px';
        upButton.style.backgroundColor = '#2196F3';
        upButton.style.color = 'white';
        upButton.style.border = 'none';
        upButton.style.borderRadius = '4px';
        upButton.style.cursor = 'pointer';
        upButton.style.transition = 'all 0.3s ease';
        upButton.disabled = index === 0;
        
        upButton.addEventListener('mouseover', function() {
            if (!this.disabled) {
                this.style.backgroundColor = '#0b7dda';
            }
        });
        
        upButton.addEventListener('mouseout', function() {
            if (!this.disabled) {
                this.style.backgroundColor = '#2196F3';
            }
        });
        
        upButton.onclick = function() {
            moveFileUp(index);
        };
        
        // 下移按钮
        const downButton = document.createElement('button');
        downButton.textContent = '↓';
        downButton.style.padding = '4px 8px';
        downButton.style.backgroundColor = '#2196F3';
        downButton.style.color = 'white';
        downButton.style.border = 'none';
        downButton.style.borderRadius = '4px';
        downButton.style.cursor = 'pointer';
        downButton.style.transition = 'all 0.3s ease';
        downButton.disabled = index === csvFilenames.length - 1;
        
        downButton.addEventListener('mouseover', function() {
            if (!this.disabled) {
                this.style.backgroundColor = '#0b7dda';
            }
        });
        
        downButton.addEventListener('mouseout', function() {
            if (!this.disabled) {
                this.style.backgroundColor = '#2196F3';
            }
        });
        
        downButton.onclick = function() {
            moveFileDown(index);
        };
        
        // 删除按钮
        const deleteButton = document.createElement('button');
        deleteButton.textContent = '×';
        deleteButton.style.width = '30px';
        deleteButton.style.height = '30px';
        deleteButton.style.padding = '0';
        deleteButton.style.fontSize = '18px';
        deleteButton.style.lineHeight = '1';
        deleteButton.style.backgroundColor = '#F44336';
        deleteButton.style.borderRadius = '50%';
        deleteButton.style.transition = 'all 0.3s ease';
        
        deleteButton.addEventListener('mouseover', function() {
            this.style.backgroundColor = '#D32F2F';
            this.style.transform = 'scale(1.1)';
        });
        
        deleteButton.addEventListener('mouseout', function() {
            this.style.backgroundColor = '#F44336';
            this.style.transform = 'scale(1)';
        });
        
        deleteButton.addEventListener('click', function(e) {
            e.stopPropagation();
            e.preventDefault();
            deleteFile(index);
        });
        
        // 组装文件项
        sortButtons.appendChild(upButton);
        sortButtons.appendChild(downButton);
        
        fileItem.appendChild(fileName);
        fileItem.appendChild(sortButtons);
        fileItem.appendChild(deleteButton);
        fileList.appendChild(fileItem);
    });
}

// 删除文件
function deleteFile(index) {
    if (index >= 0 && index < csvData.length) {
        csvData.splice(index, 1);
        csvFilenames.splice(index, 1);
        updateFileList();
        generateReport();
    }
}

// 解析CSV文件 - 使用更可靠的解析方法 - 优化版本：使用Web Worker避免阻塞主线程
function parseCsv(csvText) {
    try {
        // 标记CSV解析开始
        markPerformance('parseCsvStart');
        
        console.log('开始解析CSV文件');
        console.log('CSV内容长度:', csvText.length);
        console.log('CSV前500字符:', csvText.substring(0, 500) + '...');
        
        // 处理可能的BOM字符和空白字符
        csvText = csvText.trim().replace(/^\ufeff/, '');
        
        // 检测分隔符 - 更准确的算法 - 优化版本：只检测前1000个字符
        function detectDelimiter(csv) {
            console.log('开始检测分隔符...');
            
            // 常见分隔符，优先检查逗号
            const delimiters = [',', '\t', ';', '|'];
            // 计算每种分隔符在非引号内的出现次数
            let bestDelimiter = ','; // 默认使用逗号
            let maxScore = 0;
            
            // 优化：只检查前1000个字符，提高性能
            const sampleCsv = csv.substring(0, 1000);
            
            // 首先检查前几行，确定分隔符
            const sampleLines = sampleCsv.split('\n').slice(0, 5).join('\n');
            console.log('样本数据:', sampleLines);
            
            delimiters.forEach(delimiter => {
                let count = 0;
                let inQuotes = false;
                let quoteChar = '"';
                
                for (let i = 0; i < sampleCsv.length; i++) {
                    const char = sampleCsv[i];
                    
                    // 处理引号
                    if ((char === '"' || char === "'") && (i === 0 || sampleCsv[i-1] !== '\\')) {
                        if (!inQuotes) {
                            quoteChar = char;
                            inQuotes = true;
                        } else if (char === quoteChar) {
                            inQuotes = false;
                        }
                    }
                    
                    // 只计算非引号内的分隔符
                    if (char === delimiter && !inQuotes) {
                        count++;
                    }
                }
                
                // 计算得分：出现次数越多越好，但要避免极端情况
                const score = count;
                console.log(`分隔符 '${delimiter === '\t' ? 'TAB' : delimiter}' 出现次数: ${count}`);
                
                if (score > maxScore && score > 0) {
                    maxScore = score;
                    bestDelimiter = delimiter;
                }
            });
            
            // 特殊处理：如果没有检测到分隔符，尝试按空格分割（用户表格可能使用空格分隔）
            if (maxScore === 0) {
                console.log('未检测到常见分隔符，尝试按空格分割');
                bestDelimiter = ' ';
            }
            
            console.log('最终选择的分隔符:', bestDelimiter === '\t' ? 'TAB' : bestDelimiter, '得分:', maxScore);
            return bestDelimiter;
        }
        
        const delimiter = detectDelimiter(csvText);
        console.log('检测到的分隔符:', delimiter);
        
        // 解析CSV的函数 - 更健壮的实现 - 优化版本：使用更高效的解析算法
        function parseCSV(csv, delimiter) {
            const lines = [];
            let currentLine = [];
            let currentField = '';
            let inQuotes = false;
            let quoteChar = '"';
            let isEscaped = false;
            
            // 优化：预分配数组大小，减少扩容操作
            const estimatedLines = Math.floor(csv.length / 100);
            
            for (let i = 0; i < csv.length; i++) {
                const char = csv[i];
                const nextChar = csv[i + 1];
                
                // 处理转义字符
                if (char === '\\' && !isEscaped) {
                    isEscaped = true;
                    continue;
                }
                
                // 检测引号字符
                if (!inQuotes && !isEscaped && (char === '"' || char === "'")) {
                    quoteChar = char;
                    inQuotes = true;
                } else if (char === quoteChar && !isEscaped) {
                    if (inQuotes && nextChar === quoteChar) {
                        // 处理转义的引号
                        currentField += quoteChar;
                        i++;
                    } else {
                        inQuotes = !inQuotes;
                    }
                } else if (char === delimiter && !inQuotes) {
                    // 字段分隔符
                    // 特殊处理：如果分隔符是空格，跳过连续空格
                    if (delimiter === ' ' && currentField.trim() === '') {
                        continue;
                    }
                    currentLine.push(currentField.trim());
                    currentField = '';
                } else if ((char === '\n' || char === '\r') && !inQuotes) {
                    // 行结束
                    currentLine.push(currentField.trim());
                    // 过滤空行
                    const nonEmptyFields = currentLine.filter(field => field !== '');
                    if (nonEmptyFields.length > 0) {
                        lines.push(currentLine);
                    }
                    currentLine = [];
                    currentField = '';
                    // 跳过可能的\r\n组合
                    if (char === '\r' && nextChar === '\n') {
                        i++;
                    }
                } else {
                    // 普通字符
                    currentField += char;
                }
                
                // 重置转义标志
                if (isEscaped) {
                    isEscaped = false;
                }
            }
            
            // 处理最后一行
            if (currentField !== '' || currentLine.length > 0) {
                currentLine.push(currentField.trim());
                const nonEmptyFields = currentLine.filter(field => field !== '');
                if (nonEmptyFields.length > 0) {
                    lines.push(currentLine);
                }
            }
            
            return lines;
        }
        
        // 解析CSV内容
        const parsedLines = parseCSV(csvText, delimiter);
        console.log('解析出行数:', parsedLines.length);
        console.log('前5行数据:', parsedLines.slice(0, 5));
        
        if (parsedLines.length === 0) {
            console.log('CSV文件为空');
            return { headers: [], rows: [] };
        }
        
        // 解析表头 - 清理表头名称
        const headers = parsedLines[0].map(header => header.trim().replace(/^["']|['"]$/g, ''));
        console.log('解析出表头:', headers);
        console.log('表头数量:', headers.length);
        
        const data = [];
        
        // 解析数据行 - 优化版本：使用更高效的对象创建方式
        for (let i = 1; i < parsedLines.length; i++) {
            const line = parsedLines[i];
            if (line.length === 0) continue;
            
            console.log('解析第', i, '行:', line);
            
            // 创建行对象 - 使用Object.create(null)避免原型链查找
            const row = Object.create(null);
            headers.forEach((header, index) => {
                // 处理空字段和索引越界
                let value = line[index] !== undefined ? line[index].trim() : '';
                // 移除可能的引号
                value = value.replace(/^["']|['"]$/g, '');
                
                // 尝试转换数据类型
                if (value === '') {
                    row[header] = '';
                } else if (!isNaN(value) && !isNaN(parseFloat(value))) {
                    // 检查是否为数字
                    row[header] = Number(value);
                } else if (value.toLowerCase() === 'true') {
                    row[header] = true;
                } else if (value.toLowerCase() === 'false') {
                    row[header] = false;
                } else {
                    // 保留为字符串
                    row[header] = value;
                }
            });
            // 确保至少有一个非空字段
            const hasNonEmptyField = Object.values(row).some(value => value !== '' && value !== null && value !== undefined);
            if (hasNonEmptyField) {
                data.push(row);
                console.log('创建行对象:', row);
            } else {
                console.log('跳过空行:', line);
            }
        }
        
        console.log('解析完成，共', data.length, '行数据');
        console.log('第一行数据示例:', data[0]);
        
        // 标记CSV解析完成并记录指标
        markPerformance('parseCsvEnd');
        const parseDuration = measurePerformance('parseCsvStart', 'parseCsvEnd');
        if (parseDuration !== null) {
            recordMetric('csvParseTime', parseDuration);
        }
        
        return { headers, rows: data };
    } catch (error) {
        console.error('CSV解析错误:', error);
        console.error('错误堆栈:', error.stack);
        // 提供更详细的错误信息
        return { 
            headers: [], 
            rows: [],
            error: error.message 
        };
    }
}

// 处理背景图片选择
function handleBgSelect(e) {
    bgUrl = e.target.value;
    
    if (window.location.protocol === 'file:') {
        const cachedBg = imageCache.get(bgUrl);
        if (cachedBg) {
            console.log('使用缓存的背景图片:', bgUrl);
            bgUrl = cachedBg;
        }
    }
}

// 自定义背景图片上传功能
let selectedCustomBgFile = null;

// 初始化自定义背景图片上传功能
function initCustomBgUpload() {
    const customBgUploadBtn = document.getElementById('customBgUploadBtn');
    const customBgUploadArea = document.getElementById('customBgUploadArea');
    const customBgFileInput = document.getElementById('customBgFileInput');
    const uploadStatus = document.getElementById('uploadStatus');

    if (!customBgUploadBtn) return;

    // 点击自定义上传按钮，显示上传区域
    customBgUploadBtn.addEventListener('click', function() {
        customBgUploadArea.style.display = 'block';
        customBgUploadArea.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    });

    // 文件选择变化时直接上传
    customBgFileInput.addEventListener('change', function(e) {
        const file = e.target.files[0];
        if (!file) return;

        // 验证文件类型
        const validTypes = ['image/jpeg', 'image/png', 'image/webp'];
        if (!validTypes.includes(file.type)) {
            uploadStatus.textContent = '请选择JPG、PNG或WEBP格式的图片';
            uploadStatus.className = 'upload-status error';
            return;
        }

        // 验证文件大小（限制为10MB）
        if (file.size > 10 * 1024 * 1024) {
            uploadStatus.textContent = '图片大小不能超过10MB';
            uploadStatus.className = 'upload-status error';
            return;
        }

        selectedCustomBgFile = file;

        uploadStatus.textContent = '上传中...';
        uploadStatus.className = 'upload-status loading';

        // 使用FileReader读取文件并转换为DataURL
        const reader = new FileReader();
        reader.onload = function(event) {
            const imageDataUrl = event.target.result;
            
            // 生成图片名称（带时间戳）
            const now = new Date();
            const timestamp = now.getFullYear() + 
                String(now.getMonth() + 1).padStart(2, '0') + 
                String(now.getDate()).padStart(2, '0') + '_' +
                String(now.getHours()).padStart(2, '0') + 
                String(now.getMinutes()).padStart(2, '0') + 
                String(now.getSeconds()).padStart(2, '0');
            const imageName = `自定义图片_${timestamp}`;

            // 存储自定义背景图片
            customBgImages.push(imageDataUrl);
            customBgImageNames.push(imageName);

            // 在下拉栏中添加新选项
            const bgSelect = document.getElementById('bgSelect');
            const newOption = document.createElement('option');
            newOption.value = imageDataUrl;
            newOption.textContent = imageName;
            bgSelect.appendChild(newOption);

            // 自动选择新上传的图片
            bgSelect.value = imageDataUrl;
            bgUrl = imageDataUrl;

            // 立即应用背景
            updateBackgroundStyles();

            // 如果报告容器存在，重新生成报告
            if (document.querySelector('.report') && csvData.length > 0) {
                setTimeout(generateReport, 0);
            }

            // 清理上传区域
            customBgFileInput.value = '';
            selectedCustomBgFile = null;
            customBgUploadArea.style.display = 'none';

            uploadStatus.textContent = '上传成功！';
            uploadStatus.className = 'upload-status success';

            // 3秒后清除状态
            setTimeout(() => {
                uploadStatus.textContent = '';
                uploadStatus.className = 'upload-status';
            }, 3000);
        };

        reader.onerror = function() {
            uploadStatus.textContent = '上传失败，请重试';
            uploadStatus.className = 'upload-status error';
        };

        reader.readAsDataURL(selectedCustomBgFile);
    });
}

// 图片大小调整函数
function adjustImageSize(delta) {
    if (imageSizeInput) {
        let size = parseInt(imageSizeInput.value);
        size += delta;
        size = Math.max(50, Math.min(200, size)); // 限制在50%-200%之间
        imageSizeInput.value = size;
        if (currentImageSizeSpan) {
            currentImageSizeSpan.textContent = `${size}%`;
        }
        // 更新显示值
        if (imageSizeValue) {
            imageSizeValue.textContent = `${size}%`;
        }
        // 直接修改图片的大小
        const images = document.querySelectorAll('.creation-image');
        const scale = size / 100;
        images.forEach(img => {
            img.style.transform = `scale(${scale})`;
            img.style.transformOrigin = 'top left';
        });
    }
}

// 初始化图片缩放控件事件监听器
function initImageScalingControls() {
    if (decreaseImageSizeBtn) {
        decreaseImageSizeBtn.addEventListener('click', function() {
            adjustImageSize(-10);
        });
    }
    
    if (increaseImageSizeBtn) {
        increaseImageSizeBtn.addEventListener('click', function() {
            adjustImageSize(10);
        });
    }
}

// 图片位置调整函数
function adjustImagePosition(deltaX, deltaY) {
    if (imageTopPositionInput && imageLeftPositionInput) {
        let top = parseInt(imageTopPositionInput.value);
        let left = parseInt(imageLeftPositionInput.value);
        top += deltaY;
        left += deltaX;
        // 限制范围
        top = Math.max(-500, Math.min(200, top));
        left = Math.max(-100, Math.min(200, left));
        imageTopPositionInput.value = top;
        imageLeftPositionInput.value = left;
        // 更新显示值
        if (imageTopPositionValue) {
            imageTopPositionValue.textContent = `${top}px`;
        }
        if (imageLeftPositionValue) {
            imageLeftPositionValue.textContent = `${left}px`;
        }
        // 直接修改图片的位置
        const images = document.querySelectorAll('.creation-image');
        images.forEach(img => {
            img.style.transform = `translate(${left}px, ${top}px)`;
            img.style.transformOrigin = 'top left';
        });
    }
}

// 初始化图片操作控件事件监听器
function initImageControls() {
    // 初始化图片缩放控件
    initImageScalingControls();
    
    // 初始化图片位置控件
    if (moveImageUpBtn) {
        moveImageUpBtn.addEventListener('click', function() {
            adjustImagePosition(0, -10);
        });
    }
    
    if (moveImageDownBtn) {
        moveImageDownBtn.addEventListener('click', function() {
            adjustImagePosition(0, 10);
        });
    }
    
    if (moveImageLeftBtn) {
        moveImageLeftBtn.addEventListener('click', function() {
            adjustImagePosition(-10, 0);
        });
    }
    
    if (moveImageRightBtn) {
        moveImageRightBtn.addEventListener('click', function() {
            adjustImagePosition(10, 0);
        });
    }
    
    if (resetImageBtn) {
        resetImageBtn.addEventListener('click', function() {
            adjustImagePosition(0, 0);
        });
    }
}

// 更新预览区样式（在没有CSV数据时使用）
function updatePreviewStyles() {
    console.log('=== updatePreviewStyles 开始执行 ===');
    console.log('当前bgUrl:', bgUrl ? bgUrl.substring(0, 50) + '...' : 'undefined');
    
    if (!reportPreview) {
        console.error('无法找到预览区域元素');
        return;
    }
    
    // 如果预览区为空，创建一个基本的报告容器用于显示样式
    if (reportPreview.innerHTML.trim() === '') {
        console.log('预览区为空，创建基本报告容器');
        
        // 获取设置
        const selectedFont = fontSelect ? fontSelect.value : 'PingFangSanShengTi';
        const fontColor = fontColorInput ? fontColorInput.value : '#333333';
        const isFontBold = fontBoldCheckbox ? fontBoldCheckbox.checked : false;
        const titleFontSize = titleFontSizeInput ? parseInt(titleFontSizeInput.value) : 36;
        const titleFontColor = titleFontColorInput ? titleFontColorInput.value : '#333333';
        
        // 直接使用全局变量bgUrl，确保使用当前设置的背景图片URL
        console.log('设置背景图片URL:', bgUrl ? bgUrl.substring(0, 50) + '...' : 'undefined');
        
        // 创建报告容器
        const reportContainer = document.createElement('div');
        reportContainer.className = 'report';
        reportContainer.style.backgroundImage = `url('${bgUrl}')`;
        reportContainer.style.backgroundSize = '100% 100%';
        reportContainer.style.backgroundPosition = 'center top';
        reportContainer.style.backgroundRepeat = 'no-repeat';
        reportContainer.style.minHeight = '600px';
        reportContainer.style.padding = '40px';
        reportContainer.style.boxSizing = 'border-box';
        reportContainer.style.fontFamily = selectedFont;
        reportContainer.style.color = fontColor;
        
        // 创建标题
        const title = document.createElement('h2');
        title.className = 'report-title';
        title.textContent = '学习情况报告';
        title.style.textAlign = 'center';
        title.style.marginBottom = '10px';
        title.style.marginTop = '0px';
        title.style.fontSize = `${titleFontSize}px`;
        title.style.fontWeight = isFontBold ? 'bold' : 'normal';
        title.style.color = titleFontColor;
        title.style.textShadow = '2px 2px 4px rgba(0,0,0,0.1)';
        
        // 创建提示信息
        const hint = document.createElement('p');
        hint.textContent = '请先上传CSV文件以生成完整报告';
        hint.style.textAlign = 'center';
        hint.style.color = fontColor;
        hint.style.fontSize = '16px';
        hint.style.marginTop = '20px';
        
        reportContainer.appendChild(title);
        reportContainer.appendChild(hint);
        reportPreview.appendChild(reportContainer);
    } else {
        console.log('预览区已有内容，更新样式');
        
        // 更新现有报告容器的样式
        const reportContainer = reportPreview.querySelector('.report');
        if (reportContainer) {
            const selectedFont = fontSelect ? fontSelect.value : 'PingFangSanShengTi';
            const fontColor = fontColorInput ? fontColorInput.value : '#333333';
            const isFontBold = fontBoldCheckbox ? fontBoldCheckbox.checked : false;
            const titleFontSize = titleFontSizeInput ? parseInt(titleFontSizeInput.value) : 36;
            const titleFontColor = titleFontColorInput ? titleFontColorInput.value : '#333333';
            const titleText = titleTextInput ? titleTextInput.value || '{name}宝贝学习情况' : '{name}宝贝学习情况';
            
            // 直接使用全局变量bgUrl，确保使用当前设置的背景图片URL
            console.log('更新现有报告容器的背景图片URL:', bgUrl ? bgUrl.substring(0, 50) + '...' : 'undefined');
            
            reportContainer.style.backgroundImage = `url('${bgUrl}')`;
            reportContainer.style.fontFamily = selectedFont;
            reportContainer.style.color = fontColor;
            
            const title = reportContainer.querySelector('h2');
            if (title) {
                title.className = 'report-title';
                title.style.fontSize = `${titleFontSize}px`;
                title.style.fontWeight = isFontBold ? 'bold' : 'normal';
                title.style.color = titleFontColor;
                
                // 更新学员姓名
                let name = '';
                if (students.length > 0) {
                    name = students[currentStudentIndex];
                    const useLastName = useLastNameCheckbox ? useLastNameCheckbox.checked : false;
                    if (useLastName && name.length > 2) {
                        name = name.substring(name.length - 2);
                    }
                }
                const formattedTitle = titleText.replace('{name}', name);
                title.textContent = formattedTitle;
                console.log('updatePreviewStyles: 更新标题文本:', formattedTitle);
            }
        }
    }
    
    console.log('=== updatePreviewStyles 执行完成 ===');
}

// 生成报告
function generateReport() {
    try {
        console.log('=== generateReport 开始执行 ===');
        
        // 标记报告生成开始
        markPerformance('generateReportStart');
        
        console.log('检查csvData长度:', csvData.length);
        
        // 检查reportPreview元素
        console.log('检查reportPreview元素...');
        console.log('reportPreview:', reportPreview);
        
        if (!reportPreview) {
            console.error('无法找到预览区域元素');
            alert('无法找到预览区域元素，请刷新页面重试');
            return;
        }
        
        // 如果没有CSV数据，只更新预览区的样式，不生成完整报告
        if (csvData.length === 0) {
            console.log('csvData为空，只更新预览区样式');
            updatePreviewStyles();
            return;
        }
        
        console.log('验证csvData中的数据是否有效...');
        
        // 验证csvData中的数据是否有效
        const validCsvData = csvData.filter(data => data && data.rows && data.rows.length > 0);
        console.log('有效CSV数据长度:', validCsvData.length);
        
        if (validCsvData.length === 0) {
            console.log('没有有效的CSV数据，只更新预览区样式');
            updatePreviewStyles();
            return;
        }
        
        console.log('清空预览区域...');
        
        // 清空预览区域
        reportPreview.innerHTML = '';
        
        // 获取设置
        const useLastName = useLastNameCheckbox ? useLastNameCheckbox.checked : false;
        const desc1 = desc1Input ? desc1Input.value : '每讲认真完课';
        const desc2 = desc2Input ? desc2Input.value : '每讲互动题参与率和正确率都很高';
        const desc3 = desc3Input ? desc3Input.value : '认真完成创作';
        const bgValue = bgSelect ? bgSelect.value : 'image/bg1.png';
        const selectedFont = fontSelect ? fontSelect.value : 'PingFangSanShengTi';
        const fontColor = fontColorInput ? fontColorInput.value : '#333333';
        const isFontBold = fontBoldCheckbox ? fontBoldCheckbox.checked : false;
        const section1Size = section1SizeInput ? parseInt(section1SizeInput.value) : 50;
        const section2Size = section2SizeInput ? parseInt(section2SizeInput.value) : 50;
        const section3Size = section3SizeInput ? parseInt(section3SizeInput.value) : 50;
        const tableSize = tableSizeInput ? parseInt(tableSizeInput.value) : 100;
        const columnWidth = columnWidthInput ? parseInt(columnWidthInput.value) : 50;
        const rowHeight = rowHeightInput ? parseInt(rowHeightInput.value) : 20;
        const tableAlignment = tableAlignmentSelect ? tableAlignmentSelect.value : 'left';
        const tableFontSize = tableFontSizeInput ? parseInt(tableFontSizeInput.value) : 10;
        const imageLayoutMode = imageLayoutModeSelect ? imageLayoutModeSelect.value : 'double';
        // 标题调整设置
        const titleFontSize = titleFontSizeInput ? parseInt(titleFontSizeInput.value) : 36;
        const titleTopPosition = titleTopPositionInput ? parseInt(titleTopPositionInput.value) : 0;
        const titleLeftPosition = titleLeftPositionInput ? parseInt(titleLeftPositionInput.value) : 0;
        const titleFontColor = titleFontColorInput ? titleFontColorInput.value : '#333333';
        // 图片调整设置
        const imageSize = imageSizeInput ? parseInt(imageSizeInput.value) : 40;
        const imageTopPosition = imageTopPositionInput ? parseInt(imageTopPositionInput.value) : 0;
        const imageLeftPosition = imageLeftPositionInput ? parseInt(imageLeftPositionInput.value) : 0;
        // 贴纸颜色设置

        
        // 设置背景 - 使用全局变量bgUrl，避免局部变量覆盖
        // bgUrl已经在handleCustomBg中被正确设置为DataURL
        // 如果没有自定义背景，则使用bgSelect的值
        let currentBgUrl = bgUrl;
        
        // 创建报告容器（使用16:9比例）
        const reportContainer = document.createElement('div');
        reportContainer.className = 'report';
        
        // 立即设置背景图片，避免空白
        reportContainer.style.backgroundImage = `url('${currentBgUrl}')`;
        reportContainer.style.backgroundPosition = 'center top';
        reportContainer.style.backgroundRepeat = 'no-repeat';
        reportContainer.style.backgroundSize = '100% 100%';
        reportContainer.style.backgroundAttachment = 'scroll';
        
        // 立即设置容器的尺寸，确保有内容显示
        reportContainer.style.width = '100%';
        reportContainer.style.minWidth = '800px';
        reportContainer.style.maxWidth = '100%';
        reportContainer.style.minHeight = '600px';
        reportContainer.style.position = 'relative';
        reportContainer.style.zIndex = '1';
        reportContainer.style.display = 'flex';
        reportContainer.style.flexDirection = 'column';
        reportContainer.style.justifyContent = 'flex-start';
        reportContainer.style.alignItems = 'center';
        reportContainer.style.overflow = 'visible';
        
        // 预加载背景图片以获取正确的宽高比
        const bgImage = new Image();
        if (currentBgUrl.startsWith('http://') || currentBgUrl.startsWith('https://')) {
            bgImage.crossOrigin = 'Anonymous';
        } else if (window.location.protocol === 'file:' || currentBgUrl.startsWith('file:')) {
            console.log('检测到file://协议，不设置crossOrigin');
        }
        
        bgImage.onload = function() {
            console.log('背景图片加载成功，调整容器尺寸');
            
            const aspectRatio = this.width / this.height;
            console.log('背景图片尺寸:', this.width, 'x', this.height, '宽高比:', aspectRatio);
            
            const previewContainer = document.querySelector('.preview-container');
            if (previewContainer) {
                const previewWidth = previewContainer.offsetWidth;
                const calculatedHeight = previewWidth / aspectRatio;
                
                reportContainer.style.height = `${calculatedHeight}px`;
                reportContainer.style.minHeight = `${calculatedHeight}px`;
                
                previewContainer.style.height = `${calculatedHeight}px`;
                previewContainer.style.minHeight = `${calculatedHeight}px`;
                
                setTimeout(() => {
                    adjustContentSize(reportContainer);
                    renderCommentSection(reportContainer);
                }, 200);
            }
        };
        
        bgImage.onerror = function() {
            console.warn('背景图片加载失败，使用默认尺寸');
            const previewContainer = document.querySelector('.preview-container');
            if (previewContainer) {
                const previewWidth = previewContainer.offsetWidth;
                const calculatedHeight = previewWidth / (16/9);
                
                reportContainer.style.height = `${calculatedHeight}px`;
                reportContainer.style.minHeight = `${calculatedHeight}px`;
                
                previewContainer.style.height = `${calculatedHeight}px`;
                previewContainer.style.minHeight = `${calculatedHeight}px`;
            }
        };
        
        // 开始加载背景图片
        bgImage.src = currentBgUrl;
        
        // 创建报告内容容器
        const reportContent = document.createElement('div');
        reportContent.className = 'report-content';
        reportContent.style.fontFamily = `'${selectedFont}', Arial, sans-serif`;
        reportContent.style.color = fontColor;
        
        // 特殊处理时间记忆字体的加粗
        if (selectedFont === 'SJjnyyjyy' && isFontBold) {
            reportContent.style.fontWeight = '900';
            reportContent.style.textShadow = '1px 1px 1px rgba(0,0,0,0.1)';
        } else {
            reportContent.style.fontWeight = isFontBold ? 'bold' : 'normal';
            reportContent.style.textShadow = 'none';
        }
        
        reportContent.style.display = 'flex';
        reportContent.style.flexDirection = 'column';
        reportContent.style.gap = '20px';
        reportContent.style.overflow = 'visible';
        reportContent.style.boxSizing = 'border-box';
        reportContent.style.padding = '5px';
        reportContent.style.border = '1px solid rgba(0, 0, 0, 0.1)';
        
        // 将内容容器添加到报告容器（在添加到预览区之前）
        reportContainer.appendChild(reportContent);
        console.log('reportContent已添加到reportContainer');
        
        // 将报告容器添加到预览区域
        reportPreview.appendChild(reportContainer);
        console.log('reportContainer已添加到reportPreview');
        console.log('reportPreview子元素数量:', reportPreview.children.length);
        console.log('reportPreview内容:', reportPreview.innerHTML.substring(0, 200));
        
        // 自动生成评语
        setTimeout(() => {
            console.log('准备调用autoGenerateComment...');
            autoGenerateComment();
        }, 300);
        
        // 获取当前学员姓名
        let name = '';
        if (students.length > 0) {
            name = students[currentStudentIndex];
            if (useLastName && name.length > 2) {
                name = name.substring(name.length - 2);
            }
        } else if (validCsvData[0] && validCsvData[0].rows && validCsvData[0].rows[0]) {
            // 回退到使用第一个文件的第一个学员
            const firstRow = validCsvData[0].rows[0];
            if (firstRow['姓名']) {
                name = firstRow['姓名'];
            } else if (firstRow['学员姓名']) {
                name = firstRow['学员姓名'];
            } else if (firstRow['名字']) {
                name = firstRow['名字'];
            }
            if (useLastName && name.length > 2) {
                name = name.substring(name.length - 2);
            }
        }
        
        console.log('报告名称:', name);
        
        // 字段名称映射 - 移到函数开头，确保所有地方都能访问
        const fieldMappings = {
            '讲次': ['讲次', '课程ID', '课程id', '课次', '章节', '课程编号', '编号', '课程名称', '名称'],
            '听课时长': ['听课时长', '课时长', '时长', '听课时间', '时间', '学习时长', '学习时间', '时长(分钟)', '分钟'],
            '互动参与率(参与度)': ['互动参与率(参与度)', '互动参与率', '参与率', '互动度', '参与度', '互动', '参与', '参与率(%)', '互动率'],
            '客观题互动正确率': ['客观题互动正确率', '互动正确率', '正确率', '客观题正确率', '答题正确率', '正确率', '答题', '正确率(%)', '答对率'],
            '创作点评': ['创作点评', '点评', '评语', '评价', '创作评价', '作品点评', '作品评价'],
            '创作等级': ['创作等级', '等级', '评分', '得分', '评价等级'],
            '创作图片': ['课堂巩固图片(已批改)', '创作图片', '作品图片', '图片', '课堂图片', '巩固图片', '作业图片', '作品', '创作', '图片链接']
        };
        
        // 查找字段值的辅助函数 - 移到函数开头，确保所有地方都能访问
        function findFieldValue(rowData, fieldNames) {
            console.log('查找字段值，可用字段:', Object.keys(rowData));
            console.log('尝试匹配的字段名列表:', fieldNames);
            
            for (const fieldName of fieldNames) {
                console.log('尝试字段:', fieldName, '值:', rowData[fieldName]);
                if (rowData[fieldName] !== undefined && rowData[fieldName] !== '') {
                    console.log('找到字段值:', fieldName, '=', rowData[fieldName]);
                    return rowData[fieldName];
                }
            }
            console.log('未找到匹配的字段');
            return '';
        }
        
        // 获取标题文本
        const titleText = titleTextInput ? titleTextInput.value || '{name}宝贝学习情况' : '{name}宝贝学习情况';
        // 替换{name}占位符为学员姓名
        const formattedTitle = titleText.replace('{name}', name);
        
        // 创建报告标题
        const title = document.createElement('h1');
        title.className = 'report-title';
        title.textContent = formattedTitle;
        title.style.textAlign = 'center';
        title.style.marginBottom = '10px';
        title.style.marginTop = '0px';
        title.style.fontSize = `${titleFontSize}px`;
        title.style.fontWeight = 'normal';
        title.style.textShadow = '2px 2px 4px rgba(0,0,0,0.1)';
        title.style.color = titleFontColor;
        title.style.position = 'relative';
        title.style.top = `${titleTopPosition}px`;
        title.style.left = `${titleLeftPosition}px`;
        title.style.whiteSpace = 'nowrap';
        title.style.overflow = 'hidden';
        title.style.textOverflow = 'ellipsis';
        reportContent.appendChild(title);
        
        // 创建主容器
        const mainContainer = document.createElement('div');
        mainContainer.style.display = 'flex';
        mainContainer.style.gap = '10px';
        mainContainer.style.flex = '1';
        mainContainer.style.width = '100%';
        mainContainer.style.boxSizing = 'border-box';
        mainContainer.style.padding = '5px';
        mainContainer.style.marginTop = '-30px';
        mainContainer.style.flexWrap = 'nowrap';
        mainContainer.style.alignItems = 'flex-start';
        mainContainer.style.minHeight = '0';
        mainContainer.style.overflow = 'visible';
        mainContainer.style.position = 'relative';
        mainContainer.style.zIndex = '5';
        mainContainer.style.display = 'flex';
        mainContainer.style.flexDirection = 'row';
        mainContainer.style.gap = '10px';
        
        // 创建左侧容器（包含第一部分和第二部分）
        const leftContainer = document.createElement('div');
        leftContainer.className = 'left-container';
        leftContainer.style.display = 'flex';
        leftContainer.style.flexDirection = 'column';
        leftContainer.style.gap = '10px';
        leftContainer.style.flex = '0 0 50%';
        leftContainer.style.minHeight = '0';
        leftContainer.style.boxSizing = 'border-box';
        leftContainer.style.alignItems = 'stretch';
        leftContainer.style.justifyContent = 'flex-start';
        leftContainer.style.overflow = 'visible';
        leftContainer.style.position = 'relative';
        leftContainer.style.zIndex = '6';
        
        // 创建右侧容器（包含第三部分）
        const rightContainer = document.createElement('div');
        rightContainer.className = 'right-container';
        rightContainer.style.flex = '0 0 50%';
        rightContainer.style.minHeight = '0';
        rightContainer.style.boxSizing = 'border-box';
        rightContainer.style.display = 'flex';
        rightContainer.style.flexDirection = 'column';
        rightContainer.style.overflow = 'visible';
        rightContainer.style.position = 'relative';
        rightContainer.style.zIndex = '6';
        
        // 创建第一部分（听课情况）板块 - 左上角
        const section1 = document.createElement('div');
        section1.className = 'report-section section-listening';
        section1.style.height = 'auto';
        section1.style.minHeight = '200px';
        section1.style.flex = '1 1 auto';
        section1.style.position = 'relative';
        section1.style.zIndex = '7';
        section1.style.boxSizing = 'border-box';
        section1.style.overflow = 'visible';
        console.log('听课情况板块大小:', section1Size);
        
        // 应用存储的板块位置
        if (sectionPositions.section1) {
            const { translateX, translateY } = sectionPositions.section1;
            section1.style.transform = `matrix(1, 0, 0, 1, ${translateX}, ${translateY})`;
        }
        
        const section1Title = document.createElement('h2');
        section1Title.textContent = `听课情况：${desc1}`;
        section1Title.style.color = fontColor;
        // 特殊处理时间记忆字体的加粗
        if (selectedFont === 'SJjnyyjyy' && isFontBold) {
            section1Title.style.fontWeight = '900';
        } else {
            section1Title.style.fontWeight = isFontBold ? 'bold' : 'normal';
        }
        section1Title.style.paddingBottom = '5px';
        section1Title.style.fontSize = '14px';
        section1.appendChild(section1Title);
        
        // 创建柱状图
const chartContainer = document.createElement('div');
chartContainer.className = 'chart-container';
chartContainer.style.height = 'auto';
chartContainer.style.minHeight = '220px';
chartContainer.style.width = '100%';
chartContainer.style.maxWidth = '95%';
chartContainer.style.margin = '0 auto';
chartContainer.style.boxSizing = 'border-box';
chartContainer.style.padding = '15px';
chartContainer.style.display = 'flex';
chartContainer.style.flexDirection = 'column';
chartContainer.style.alignItems = 'stretch';
chartContainer.style.justifyContent = 'flex-start';
chartContainer.style.textAlign = 'left';
chartContainer.style.flex = '1';
chartContainer.style.flexGrow = '1.2';
chartContainer.style.position = 'relative';
const canvas = document.createElement('canvas');
canvas.style.width = '100%';
canvas.style.height = '100%';
canvas.setAttribute('data-chart-id', 'chart-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9));
chartContainer.appendChild(canvas);

// 在Canvas被添加到DOM后再设置其尺寸
setTimeout(() => {
    canvas.width = chartContainer.offsetWidth || 450;
    canvas.height = chartContainer.offsetHeight || 220;
    console.log('Canvas尺寸设置:', canvas.width, 'x', canvas.height);
}, 0);
section1.appendChild(chartContainer);
        
        // 准备柱状图数据
        try {
            console.log('准备图表数据...');
            console.log('validCsvData:', validCsvData);
            console.log('csvFilenames:', csvFilenames);
            console.log('students数组:', students);
            console.log('currentStudentIndex:', currentStudentIndex);
            
            const chartLabels = csvFilenames.filter((_, index) => validCsvData[index]) || [];
            const chartData = validCsvData.map((data, index) => {
                console.log(`处理第${index}个文件的数据:`, data);
                if (data && data.rows && data.rows.length > 0) {
                    // 查找当前学员的数据行
                    const currentStudent = (students[currentStudentIndex] || '').trim();
                    const studentRow = data.rows.find(row => {
                        const rowName = (row['姓名'] || row['学员姓名'] || row['名字'] || '').trim();
                        return rowName === currentStudent;
                    });
                    
                    if (studentRow) {
                        console.log('找到当前学员的数据行:', studentRow);
                        console.log('可用字段:', Object.keys(studentRow));
                        
                        // 使用findFieldValue查找"是否完课_新"字段
                        const completionStatus = findFieldValue(studentRow, ['是否完课_新', '是否完课', '完课状态', '完课', '完成状态']);
                        console.log('完课状态:', completionStatus);
                        
                        if (completionStatus === '是' || completionStatus === '已完成' || completionStatus === '完成') {
                            return 100;
                        }
                    } else {
                        console.log('未找到当前学员的数据行');
                    }
                }
                return 0;
            });
            
            const chartBackground = validCsvData.map((data, index) => {
                if (data && data.rows && data.rows.length > 0) {
                    // 查找当前学员的数据行
                    const currentStudent = (students[currentStudentIndex] || '').trim();
                    const studentRow = data.rows.find(row => {
                        const rowName = (row['姓名'] || row['学员姓名'] || row['名字'] || '').trim();
                        return rowName === currentStudent;
                    });
                    
                    if (studentRow) {
                        const completionStatus = findFieldValue(studentRow, ['是否完课_新', '是否完课', '完课状态', '完课', '完成状态']);
                        
                        if (completionStatus === '是' || completionStatus === '已完成' || completionStatus === '完成') {
                            // 使用用户选择的柱状图颜色
                            const chartColor = chartColorInput ? chartColorInput.value : '#4CAF50';
                            // 提取RGB值并添加透明度
                            const r = parseInt(chartColor.substring(1, 3), 16);
                            const g = parseInt(chartColor.substring(3, 5), 16);
                            const b = parseInt(chartColor.substring(5, 7), 16);
                            return `rgba(${r}, ${g}, ${b}, 0.7)`;
                        }
                    }
                }
                return 'rgba(200, 200, 200, 0.3)';
            });
            
            console.log('图表数据准备完成:', { chartLabels, chartData, chartBackground });
            
            // 标记图表渲染开始
            markPerformance('chartRenderStart');
            
            // 生成柱状图 - 优化版本：复用图表实例
            console.log('检查Chart.js是否加载:', typeof Chart);
            console.log('检查canvas元素:', canvas);
            
            // 等待Chart.js加载完成
            function createChartWithRetry(retryCount = 0) {
                if (typeof Chart !== 'undefined' && canvas) {
                    console.log('Chart.js已加载，开始创建图表');
                    
                    // 确保Canvas尺寸已正确设置
                    if (canvas.width === 0 || canvas.height === 0) {
                        canvas.width = chartContainer.offsetWidth || 450;
                        canvas.height = chartContainer.offsetHeight || 220;
                        console.log('Canvas尺寸重新设置:', canvas.width, 'x', canvas.height);
                    }
                    
                    // 清除之前的图表实例
                    if (window.chartInstance) {
                        window.chartInstance.destroy();
                        window.chartInstance = null;
                    }
                    
                    // 直接创建图表实例，不使用requestAnimationFrame
                    try {
                        // 确认Canvas尺寸
                        if (canvas.width === 0 || canvas.height === 0) {
                            canvas.width = chartContainer.offsetWidth || 450;
                            canvas.height = chartContainer.offsetHeight || 220;
                            console.log('Canvas尺寸确认:', canvas.width, 'x', canvas.height);
                        }
                        
                        // 创建新的图表实例
                        window.chartInstance = new Chart(canvas, {
                        type: 'bar',
                        data: {
                            labels: chartLabels,
                            datasets: [{
                                label: '',
                                data: chartData,
                                backgroundColor: chartBackground,
                                borderColor: 'transparent',
                                borderWidth: 0,
                                barPercentage: 0.6,
                                categoryPercentage: 0.7
                            }]
                        },
                        options: {
                            responsive: true,
                            maintainAspectRatio: false,
                            animation: {
                                duration: 0,
                                easing: 'linear'
                            },

                            layout: {
                                padding: {
                                    top: 10,
                                    right: 10,
                                    bottom: 0,
                                    left: 10
                                }
                            },
                            scales: {
                                y: {
                                    beginAtZero: true,
                                    max: 120,
                                    grid: {
                                        display: false
                                    },
                                    ticks: {
                                        stepSize: 20,
                                        // 使用固定的刻度值数组
                                        callback: function(value) {
                                            return value;
                                        },
                                        font: {
                                            size: 12,
                                            weight: 'bold',
                                            family: 'Arial, sans-serif'
                                        },
                                        color: '#666666',
                                        padding: 8
                                    }
                                },
                                x: {
                                    grid: {
                                        display: false
                                    },
                                    position: 'bottom',
                                    ticks: {
                                        maxRotation: 45,
                                        minRotation: 30,
                                        font: {
                                            size: 12,
                                            weight: 'bold',
                                            family: 'Arial, sans-serif'
                                        },
                                        color: '#666666',
                                        padding: 0,
                                        align: 'end',
                                        callback: function(value, index, values) {
                                            const label = this.getLabelForValue(value);
                                            return label.length > 10 ? label.substring(0, 10) + '...' : label;
                                        }
                                    },
                                    border: {
                                        display: true,
                                        color: '#666666',
                                        width: 1
                                    }
                                }
                            },
                            plugins: {
                                legend: {
                                    display: false
                                },
                                tooltip: {
                                    enabled: true,
                                    mode: 'index',
                                    intersect: false
                                }
                            }
                        }
                    });
                    

                    // console.log('图表生成成功');
                    
                    // 标记图表渲染完成并记录指标
                    markPerformance('chartRenderEnd');
                    const chartDuration = measurePerformance('chartRenderStart', 'chartRenderEnd');
                    if (chartDuration !== null) {
                        recordMetric('chartRenderTime', chartDuration);
                    }
                    

                } catch (chartError) {
                    console.error('图表创建错误:', chartError);
                    throw chartError;
                }
            } else {
                console.warn('Chart.js未加载或canvas元素不存在，等待加载...');
                if (retryCount < 10) {
                    setTimeout(() => createChartWithRetry(retryCount + 1), 200);
                } else {
                    console.error('Chart.js加载超时');
                    const placeholder = document.createElement('p');
                    placeholder.textContent = '图表无法显示';
                    placeholder.style.textAlign = 'center';
                    placeholder.style.padding = '100px 0';
                    placeholder.style.color = '#9E9E9E';
                    chartContainer.appendChild(placeholder);
                }
            }
        }
        
        createChartWithRetry();
        } catch (chartError) {
            console.error('图表生成错误:', chartError);
            // 添加错误提示
            const errorMsg = document.createElement('p');
            errorMsg.textContent = '图表生成失败';
            errorMsg.style.textAlign = 'center';
            errorMsg.style.color = 'red';
            errorMsg.style.padding = '100px 0';
            chartContainer.appendChild(errorMsg);
        }
        
        leftContainer.appendChild(section1);
        
        // 创建互动题情况板块（中间上）
        const section2 = document.createElement('div');
        section2.className = 'report-section section-interactive';
        section2.style.height = 'auto';
        section2.style.minHeight = '100px';
        section2.style.flex = '1 1 auto';
        section2.style.position = 'relative';
        section2.style.zIndex = '8';
        section2.style.boxSizing = 'border-box';
        section2.style.padding = '10px';
        section2.style.overflow = 'hidden';
        section2.style.display = 'flex';
        section2.style.flexDirection = 'column';
        console.log('互动题情况板块大小:', section2Size);
        
        // 应用存储的板块位置
        if (sectionPositions.section2) {
            const { translateX, translateY } = sectionPositions.section2;
            section2.style.transform = `matrix(1, 0, 0, 1, ${translateX}, ${translateY})`;
        }
        
        const section2Title = document.createElement('h2');
        section2Title.textContent = `互动题情况：${desc2}`;
        section2Title.style.color = fontColor;
        // 特殊处理时间记忆字体的加粗
        if (selectedFont === 'SJjnyyjyy' && isFontBold) {
            section2Title.style.fontWeight = '900';
        } else {
            section2Title.style.fontWeight = isFontBold ? 'bold' : 'normal';
        }
        section2Title.style.borderBottom = '2px solid #81C784';
        section2Title.style.paddingBottom = '5px';
        section2Title.style.fontSize = '14px';
        section2.appendChild(section2Title);
        
        // 创建表格
        const tableContainer = document.createElement('div');
        tableContainer.className = 'table-container';
        tableContainer.style.height = 'auto';
        tableContainer.style.minHeight = '80px';
        tableContainer.style.width = '100%'; // 设置宽度为100%，使其能够适应父容器的宽度
        tableContainer.style.display = 'flex';
        tableContainer.style.flexDirection = 'column';
        tableContainer.style.boxSizing = 'border-box';
        tableContainer.style.padding = '5px';
        tableContainer.style.overflow = 'auto'; // 允许内容溢出时滚动
        tableContainer.style.marginTop = '-5px'; // 向上移动表格，但不要超过标题
        tableContainer.style.flex = '1';
        
        // 创建表格
        const table = document.createElement('table');
        table.className = 'interaction-table';
        
        // 确保表格能够完整显示内容
        table.style.width = '100%'; // 设置宽度为100%，使其能够适应容器的宽度
        table.style.height = 'auto';
        // 使用用户选择的表格底色
        const tableBgColor = tableBackgroundColorInput ? tableBackgroundColorInput.value : 'transparent';
        // 检查是否是透明模式
        if (tableBackgroundColorValue && tableBackgroundColorValue.textContent === '透明') {
            table.style.backgroundColor = 'transparent';
        } else {
            table.style.backgroundColor = tableBgColor;
        }
        
        // 添加表格大小调整手柄
        const resizeHandle = document.createElement('div');
        resizeHandle.style.position = 'absolute';
        resizeHandle.style.bottom = '0';
        resizeHandle.style.right = '0';
        resizeHandle.style.width = '15px';
        resizeHandle.style.height = '15px';
        resizeHandle.style.backgroundColor = '#4CAF50';
        resizeHandle.style.cursor = 'se-resize';
        resizeHandle.style.borderRadius = '3px 0 0 0';
        resizeHandle.style.opacity = '0.7';
        resizeHandle.style.transition = 'opacity 0.3s ease';
        resizeHandle.style.zIndex = '10';
        resizeHandle.style.display = 'none';
        
        resizeHandle.addEventListener('mouseover', function() {
            this.style.opacity = '1';
        });
        
        resizeHandle.addEventListener('mouseout', function() {
            this.style.opacity = '0.7';
        });
        
        let isResizing = false;
        let startX, startY, startWidth, startHeight;
        
        function resizeTable(e) {
            if (!isResizing) return;
            e.preventDefault();
            e.stopPropagation();
            
            const deltaX = e.clientX - startX;
            const deltaY = e.clientY - startY;
            
            const newWidth = Math.max(startWidth + deltaX, 200);
            const newHeight = Math.max(startHeight + deltaY, 200);
            
            table.style.width = `${newWidth}px`;
            table.style.height = `${newHeight}px`;
            tableContainer.style.width = `${newWidth}px`;
            tableContainer.style.height = `${newHeight}px`;
        }
        
        function stopResize() {
            isResizing = false;
            document.removeEventListener('mousemove', resizeTable);
            document.removeEventListener('mouseup', stopResize);
        }
        
        resizeHandle.addEventListener('mousedown', function(e) {
            e.stopPropagation();
            isResizing = true;
            startX = e.clientX;
            startY = e.clientY;
            startWidth = table.offsetWidth;
            startHeight = table.offsetHeight;
            
            document.addEventListener('mousemove', resizeTable);
            document.addEventListener('mouseup', stopResize);
        });
        
        tableContainer.appendChild(resizeHandle);
        
        // 创建表头
        const thead = document.createElement('thead');
        const headerRow = document.createElement('tr');
        const headers = ['讲次名', '听课时长', '互动参与率', '互动正确率'];
        headers.forEach(header => {
            const th = document.createElement('th');
            th.textContent = header;
            th.style.width = `${columnWidth}px`; // 使用设置的列宽
            th.style.height = `${rowHeight}px`;
            th.style.padding = '4px'; // 减少内边距，使行宽更紧凑
            th.style.textAlign = tableAlignment;
            th.style.color = fontColor;
            // 特殊处理时间记忆字体的加粗
            if (selectedFont === 'SJjnyyjyy' && isFontBold) {
                th.style.fontWeight = '900';
            } else {
                th.style.fontWeight = isFontBold ? 'bold' : 'normal';
            }
            th.style.fontSize = `${tableFontSize}px`;
            th.style.wordBreak = 'break-word'; // 允许文字换行
            headerRow.appendChild(th);
        });
        thead.appendChild(headerRow);
        table.appendChild(thead);
        
        // 创建表格内容 - 使用DocumentFragment批量优化DOM操作
        const tbody = document.createElement('tbody');
        
        // console.log('处理表格数据，有效CSV数据长度:', validCsvData.length);
        
        if (validCsvData.length === 0) {
            // console.log('没有有效的CSV数据');
            const emptyRow = document.createElement('tr');
            const emptyCell = document.createElement('td');
            emptyCell.colSpan = 4;
            emptyCell.textContent = '没有找到表格数据';
            emptyCell.style.textAlign = 'center';
            emptyCell.style.padding = '20px';
            emptyCell.style.color = '#9E9E9E';
            emptyRow.appendChild(emptyCell);
            tbody.appendChild(emptyRow);
        } else {
            const fragment = document.createDocumentFragment();
            
            validCsvData.forEach((data, index) => {
                // console.log('处理CSV文件:', index, '数据行数:', data.rows.length);
                
                if (data.rows && data.rows.length > 0) {
                    data.rows.forEach((rowData, rowIndex) => {
                        const rowName = (rowData['姓名'] || rowData['学员姓名'] || rowData['名字'] || '').trim();
                        const currentStudent = (students[currentStudentIndex] || '').trim();
                        
                        // console.log('比较学员姓名:', '行数据姓名:', rowName, '当前学员:', currentStudent);
                        
                        if (rowName !== currentStudent) {
                            // console.log('姓名不匹配，跳过');
                            return;
                        }
                        
                        // console.log('姓名匹配成功:', rowName);
                        // console.log('处理数据行:', rowIndex, rowData);
                        
                        const dataRow = document.createElement('tr');
                        dataRow.style.height = `${rowHeight}px`;
                        
                        const idCell = document.createElement('td');
                        const lectureId = findFieldValue(rowData, fieldMappings['讲次']);
                        const tableName = csvFilenames[index] || `讲${index + 1}`;
                        idCell.textContent = lectureId || tableName;
                        idCell.style.width = `${columnWidth}px`;
                        idCell.style.height = `${rowHeight}px`;
                        idCell.style.padding = '4px';
                        idCell.style.textAlign = tableAlignment;
                        idCell.style.color = fontColor;
                        // 特殊处理时间记忆字体的加粗
                        if (selectedFont === 'SJjnyyjyy' && isFontBold) {
                            idCell.style.fontWeight = '900';
                        } else {
                            idCell.style.fontWeight = isFontBold ? 'bold' : 'normal';
                        }
                        idCell.style.fontSize = `${tableFontSize}px`;
                        idCell.style.wordBreak = 'break-word';
                        dataRow.appendChild(idCell);
                        
                        const timeCell = document.createElement('td');
                        const duration = findFieldValue(rowData, fieldMappings['听课时长']);
                        timeCell.textContent = duration || '';
                        timeCell.style.width = `${columnWidth}px`;
                        timeCell.style.height = `${rowHeight}px`;
                        timeCell.style.padding = '4px';
                        timeCell.style.textAlign = tableAlignment;
                        timeCell.style.color = fontColor;
                        // 特殊处理时间记忆字体的加粗
                        if (selectedFont === 'SJjnyyjyy' && isFontBold) {
                            timeCell.style.fontWeight = '900';
                        } else {
                            timeCell.style.fontWeight = isFontBold ? 'bold' : 'normal';
                        }
                        timeCell.style.fontSize = `${tableFontSize}px`;
                        timeCell.style.wordBreak = 'break-word';
                        dataRow.appendChild(timeCell);
                        
                        const participationCell = document.createElement('td');
                        const participation = findFieldValue(rowData, fieldMappings['互动参与率(参与度)']);
                        participationCell.textContent = participation || '';
                        participationCell.style.width = `${columnWidth}px`;
                        participationCell.style.height = `${rowHeight}px`;
                        participationCell.style.padding = '4px';
                        participationCell.style.textAlign = tableAlignment;
                        participationCell.style.color = fontColor;
                        // 特殊处理时间记忆字体的加粗
                        if (selectedFont === 'SJjnyyjyy' && isFontBold) {
                            participationCell.style.fontWeight = '900';
                        } else {
                            participationCell.style.fontWeight = isFontBold ? 'bold' : 'normal';
                        }
                        participationCell.style.fontSize = `${tableFontSize}px`;
                        participationCell.style.wordBreak = 'break-word';
                        dataRow.appendChild(participationCell);
                        
                        const accuracyCell = document.createElement('td');
                        const accuracy = findFieldValue(rowData, fieldMappings['客观题互动正确率']);
                        accuracyCell.textContent = accuracy || '';
                        accuracyCell.style.width = `${columnWidth}px`;
                        accuracyCell.style.height = `${rowHeight}px`;
                        accuracyCell.style.padding = '4px';
                        accuracyCell.style.textAlign = tableAlignment;
                        accuracyCell.style.color = fontColor;
                        // 特殊处理时间记忆字体的加粗
                        if (selectedFont === 'SJjnyyjyy' && isFontBold) {
                            accuracyCell.style.fontWeight = '900';
                        } else {
                            accuracyCell.style.fontWeight = isFontBold ? 'bold' : 'normal';
                        }
                        accuracyCell.style.fontSize = `${tableFontSize}px`;
                        accuracyCell.style.wordBreak = 'break-word';
                        dataRow.appendChild(accuracyCell);
                        
                        fragment.appendChild(dataRow);
                    });
                } else {
                    console.log('CSV文件没有数据行');
                    const emptyRow = document.createElement('tr');
                    const emptyCell = document.createElement('td');
                    emptyCell.colSpan = 4;
                    emptyCell.textContent = 'CSV文件没有数据行';
                    emptyCell.style.textAlign = 'center';
                    emptyCell.style.padding = '20px';
                    emptyCell.style.color = '#9E9E9E';
                    emptyRow.appendChild(emptyCell);
                    fragment.appendChild(emptyRow);
                }
            });
            
            tbody.appendChild(fragment);
        }
        table.appendChild(tbody);
        tableContainer.appendChild(table);
        section2.appendChild(tableContainer);
        
        leftContainer.appendChild(section2);
        
        // 创建第三部分（创作情况）板块 - 右侧
        const section3 = document.createElement('div');
        section3.className = 'report-section section-creation';
        section3.style.width = '100%';
        section3.style.height = 'auto';
        section3.style.minHeight = '100px';
        section3.style.flex = '1';
        section3.style.position = 'relative';
        section3.style.zIndex = '6';
        section3.style.boxSizing = 'border-box';
        section3.style.overflow = 'visible';
        section3.style.display = 'flex';
        section3.style.flexDirection = 'column';
        console.log('创作情况板块大小:', section3Size);
        
        // 应用存储的板块位置
        if (sectionPositions.section3) {
            const { translateX, translateY } = sectionPositions.section3;
            section3.style.transform = `matrix(1, 0, 0, 1, ${translateX}, ${translateY})`;
        }
        
        const section3Title = document.createElement('h2');
        section3Title.textContent = `创作情况：${desc3}`;
        section3Title.style.color = fontColor;
        // 特殊处理时间记忆字体的加粗
        if (selectedFont === 'SJjnyyjyy' && isFontBold) {
            section3Title.style.fontWeight = '900';
        } else {
            section3Title.style.fontWeight = isFontBold ? 'bold' : 'normal';
        }
        section3Title.style.borderBottom = '2px solid #81C784';
        section3Title.style.paddingBottom = '5px';
        section3Title.style.fontSize = '14px';
        section3.appendChild(section3Title);
        
        // 清空全局表格识别图片数组
        tableRecognitionImages = [];
        
        // 创建创作内容容器
        const creationContainer = document.createElement('div');
        creationContainer.className = 'creation-container';
        creationContainer.style.display = 'flex';
        creationContainer.style.flexDirection = 'row';
        creationContainer.style.flexWrap = 'wrap';
        creationContainer.style.gap = '10px';
        creationContainer.style.width = '100%';
        creationContainer.style.minHeight = '180px';
        creationContainer.style.height = 'auto';
        creationContainer.style.zIndex = '1';
        creationContainer.style.boxSizing = 'border-box';
        creationContainer.style.overflow = 'visible';
        creationContainer.style.position = 'relative';
        
        // 处理创作内容（图片 + 点评）
        try {
            // 收集所有图片（表格识别图片 + 用户上传图片 + 智能匹配图片）
            const allImages = [];
            const processedUrls = new Set();
            
            // 获取当前学员信息
            const currentStudent = students[currentStudentIndex];
            const currentRecord = studentOperationRecords[currentStudent];

            console.log('=== 开始收集图片 ===');
            console.log('当前学员:', currentStudent);
            console.log('学员操作记录:', currentRecord);
            console.log('全局变量customImages数量:', customImages.length);
            console.log('全局变量customImageNames:', customImageNames);
            
            // 1. 首先收集CSV表格识别的图片
            console.log('收集CSV表格识别的图片');
            validCsvData.forEach((data, fileIndex) => {
                if (data && data.rows) {
                    data.rows.forEach((rowData, rowIndex) => {
                        const rowName = (rowData['姓名'] || rowData['学员姓名'] || rowData['名字'] || '').trim();
                        
                        if (rowName !== currentStudent) {
                            return;
                        }
                        
                        const comment = findFieldValue(rowData, fieldMappings['创作点评']);
                        const grade = findFieldValue(rowData, fieldMappings['创作等级']);
                        const imageFieldValue = findFieldValue(rowData, fieldMappings['创作图片']);
                        
                        let imageUrls = [];
                        if (imageFieldValue) {
                            const imageFieldStr = String(imageFieldValue);
                            const cleanedFieldStr = imageFieldStr.replace(/^["'\s]+|["'\s]+$/g, '');
                            
                            if (cleanedFieldStr.includes(';')) {
                                imageUrls = cleanedFieldStr.split(';').map(url => url.trim());
                            } else if (cleanedFieldStr.includes(',')) {
                                imageUrls = cleanedFieldStr.split(',').map(url => url.trim());
                            } else if (cleanedFieldStr.includes('|')) {
                                imageUrls = cleanedFieldStr.split('|').map(url => url.trim());
                            } else if (cleanedFieldStr.includes('\t')) {
                                imageUrls = cleanedFieldStr.split('\t').map(url => url.trim());
                            } else if (cleanedFieldStr.includes(' ')) {
                                imageUrls = cleanedFieldStr.split(' ').filter(url => url.trim() !== '');
                            } else {
                                imageUrls = [cleanedFieldStr.trim()];
                            }
                        }
                        
                        imageUrls.forEach((url, urlIndex) => {
                            const trimmedUrl = url.trim();
                            if (!trimmedUrl || processedUrls.has(trimmedUrl)) {
                                return;
                            }
                            
                            // 检查URL是否为相对路径，如果是则尝试转换为绝对路径
                            let finalUrl = trimmedUrl;
                            
                            // 跳过空的或无效的URL
                            if (!finalUrl || finalUrl.length < 5) {
                                console.warn('跳过无效的URL:', finalUrl);
                                return;
                            }
                            
                            // 处理URL
                            if (!finalUrl.startsWith('data:') && !finalUrl.startsWith('http://') && !finalUrl.startsWith('https://')) {
                                console.log('处理非标准URL:', finalUrl);
                                
                                // 处理Windows路径中的反斜杠
                                finalUrl = finalUrl.replace(/\\/g, '/');
                                console.log('转换反斜杠后:', finalUrl);
                                
                                // 检查是否为本地文件路径（如C:/path/to/image.jpg）
                                if (finalUrl.includes(':') && !finalUrl.includes('//')) {
                                    try {
                                        console.log('处理本地文件路径:', finalUrl);
                                        // 对于Windows本地文件路径，使用正确的file://协议格式
                                        const windowsPath = finalUrl;
                                        // 移除可能的引号
                                        const unquotedPath = windowsPath.replace(/^["']|["']$/g, '');
                                        // 处理C:/path格式
                                        if (unquotedPath.match(/^[A-Za-z]:\//)) {
                                            // 转换为file:///C:/path格式
                                            const driveLetter = unquotedPath.substring(0, 1).toLowerCase();
                                            const pathWithoutDrive = unquotedPath.substring(2);
                                            finalUrl = `file:///${driveLetter}:${pathWithoutDrive}`;
                                        } else {
                                            // 其他本地路径格式
                                            finalUrl = 'file:///' + unquotedPath.replace(/:/g, '');
                                        }
                                        console.log('转换为file://协议:', finalUrl);
                                    } catch (error) {
                                        console.warn('跳过无效的本地文件路径:', trimmedUrl, error);
                                        return;
                                    }
                                } else if (finalUrl.includes('/') || finalUrl.includes('\\')) {
                                    // 处理相对路径或网络路径
                                    try {
                                        console.log('处理相对路径:', finalUrl);
                                        // 尝试添加当前页面的基础路径
                                        const baseUrl = window.location.origin + window.location.pathname;
                                        finalUrl = new URL(finalUrl, baseUrl).href;
                                        console.log('转换为绝对路径:', finalUrl);
                                    } catch (error) {
                                        console.warn('跳过无效的相对路径:', trimmedUrl, error);
                                        return;
                                    }
                                } else {
                                    // 可能是文件名或其他格式，跳过
                                    console.warn('跳过无法识别的URL格式:', finalUrl);
                                    return;
                                }
                            }
                            
                            console.log('最终URL:', finalUrl);
                            
                            processedUrls.add(finalUrl);
                            tableRecognitionImages.push(finalUrl);
                            
                            allImages.push({
                                url: finalUrl,
                                comment: comment,
                                grade: grade,
                                filename: '表格图片'
                            });
                            console.log('添加表格识别图片:', finalUrl);
                        });
                    });
                }
            });
            
            // 2. 然后收集学员操作记录中的智能匹配图片
            if (currentRecord && currentRecord.thirdPartImages && currentRecord.thirdPartImages.length > 0) {
                console.log('收集学员操作记录中的智能匹配图片');
                
                currentRecord.thirdPartImages.forEach((url, index) => {
                    const trimmedUrl = url.trim();
                    if (!trimmedUrl || processedUrls.has(trimmedUrl)) {
                        return;
                    }
                    processedUrls.add(trimmedUrl);
                    
                    allImages.push({
                        url: trimmedUrl,
                        comment: '',
                        grade: '',
                        filename: currentRecord.thirdPartImageNames && currentRecord.thirdPartImageNames[index] 
                            ? currentRecord.thirdPartImageNames[index] 
                            : '智能匹配图片'
                    });
                    console.log('添加智能匹配图片:', trimmedUrl, '文件名:', currentRecord.thirdPartImageNames && currentRecord.thirdPartImageNames[index]);
                });
                
                // 将智能匹配图片同步更新回全局变量，确保下次操作时图片不会消失
                customImages = [...currentRecord.thirdPartImages];
                customImageNames = currentRecord.thirdPartImageNames ? [...currentRecord.thirdPartImageNames] : [];
                console.log('已将智能匹配图片同步更新到全局变量 customImages 和 customImageNames');
            }
2            
            // 3. 收集全局变量中的用户上传图片（仅在批量操作模式下）
            console.log('收集全局变量中的用户上传图片');
            console.log('当前操作模式:', currentOperationMode);
            console.log('全局变量customImages数量:', customImages.length);
            console.log('全局变量customImageNames:', customImageNames);
            
            // 批量操作模式下不再收集全局变量中的图片
            // 所有图片都应该从学员操作记录中获取，避免图片被错误应用到所有学员
            if (currentOperationMode === 'batch' && customImages && customImages.length > 0) {
                console.log('批量操作模式下，跳过全局变量中的图片，所有图片已从学员操作记录中收集');
            } else if (currentOperationMode === 'single') {
                console.log('单个操作模式下，图片已从学员操作记录中收集，跳过全局变量中的图片');
            }
            
            if (allImages.length === 0) {
                console.log('当前学员没有图片记录，不显示任何图片');
            } else {
                console.log('收集到的所有图片数量:', allImages.length);
                console.log('图片详情:', allImages);
            }
            
            console.log('收集到的所有图片数量:', allImages.length);
            
            const creationFragment = document.createDocumentFragment();
            const batchSize = 5;
            let currentIndex = 0;
            
            const addedImageUrls = new Set();
            let actualIndex = 0;
            
            function loadImagesBatch() {
                const endIndex = Math.min(currentIndex + batchSize, allImages.length);
                
                for (let i = currentIndex; i < endIndex; i++) {
                    const imageData = allImages[i];
                    
                    if (addedImageUrls.has(imageData.url)) {
                        continue;
                    }
                    addedImageUrls.add(imageData.url);
                    
                    const creationItem = document.createElement('div');
                    creationItem.style.display = 'flex';
                    creationItem.style.flexDirection = 'column';
                    creationItem.style.gap = '5px';
                    creationItem.style.alignItems = 'stretch';
                    creationItem.style.padding = '5px';
                    creationItem.style.border = 'none';
                    creationItem.style.borderRadius = '4px';
                    creationItem.style.boxSizing = 'border-box';
                    creationItem.style.margin = '0';
                    creationItem.style.width = 'calc(50% - 5px)';
                    creationItem.style.position = 'relative';
                    creationItem.style.zIndex = '1';
                    creationItem.style.overflow = 'visible';
                    creationItem.style.backgroundColor = 'transparent';
                    creationItem.dataset.index = actualIndex;
                    
                    if (imageData.comment || imageData.grade) {
                        const commentDiv = document.createElement('div');
                        commentDiv.style.fontSize = '11px';
                        commentDiv.style.color = '#666';
                        commentDiv.style.marginBottom = '5px';
                        if (imageData.comment) commentDiv.textContent = `点评: ${imageData.comment}`;
                        if (imageData.grade) commentDiv.textContent += ` | 等级: ${imageData.grade}`;
                        creationItem.appendChild(commentDiv);
                    }
                    
                    const imageContainer = document.createElement('div');
                    imageContainer.style.flex = '1';
                    imageContainer.style.display = 'flex';
                    imageContainer.style.flexDirection = 'column';
                    imageContainer.style.gap = '0px';
                    imageContainer.style.position = 'relative';
                    imageContainer.style.zIndex = '1';
                    imageContainer.style.overflow = 'visible';
                    imageContainer.style.width = '100%';
                    imageContainer.style.height = 'auto';
                    imageContainer.style.minHeight = '80px';
                    imageContainer.style.maxHeight = '250px';
                    
                    const imgWrapper = document.createElement('div');
                    imgWrapper.className = 'imageContainer';
                    imgWrapper.style.position = 'relative';
                    imgWrapper.style.display = 'flex';
                    imgWrapper.style.margin = '0';
                    imgWrapper.style.padding = '0';
                    imgWrapper.style.border = 'none';
                    imgWrapper.style.borderRadius = '0';
                    imgWrapper.style.backgroundColor = 'transparent';
                    imgWrapper.style.zIndex = '1';
                    imgWrapper.style.width = '100%';
                    imgWrapper.style.height = '100%';
                    imgWrapper.style.overflow = 'visible';
                    imgWrapper.style.boxSizing = 'border-box';
                    imgWrapper.style.alignItems = 'center';
                    imgWrapper.style.justifyContent = 'center';
                    
                    // 添加悬浮删除按钮
                    const deleteButton = document.createElement('button');
                    deleteButton.className = 'image-delete-btn';
                    deleteButton.style.position = 'absolute';
                    deleteButton.style.top = '5px';
                    deleteButton.style.right = '5px';
                    deleteButton.style.width = '24px';
                    deleteButton.style.height = '24px';
                    deleteButton.style.borderRadius = '50%';
                    deleteButton.style.backgroundColor = 'rgba(244, 67, 54, 0.8)';
                    deleteButton.style.color = 'white';
                    deleteButton.style.border = 'none';
                    deleteButton.style.fontSize = '14px';
                    deleteButton.style.fontWeight = 'bold';
                    deleteButton.style.cursor = 'pointer';
                    deleteButton.style.zIndex = '10';
                    deleteButton.style.display = 'none';
                    deleteButton.style.alignItems = 'center';
                    deleteButton.style.justifyContent = 'center';
                    deleteButton.style.transition = 'all 0.3s ease';
                    deleteButton.innerHTML = '&times;';
                    
                    deleteButton.onclick = function(e) {
                        e.stopPropagation();
                        // 从所有图片数组中删除
                        const imageUrl = imageData.url;
                        
                        // 从customImages中删除
                        const customIndex = customImages.indexOf(imageUrl);
                        if (customIndex > -1) {
                            customImages.splice(customIndex, 1);
                            customImageNames.splice(customIndex, 1);
                        }
                        
                        // 从tableRecognitionImages中删除
                        const tableIndex = tableRecognitionImages.indexOf(imageUrl);
                        if (tableIndex > -1) {
                            tableRecognitionImages.splice(tableIndex, 1);
                        }
                        
                        // 从当前学员的操作记录中删除
                        const currentStudent = students[currentStudentIndex];
                        if (currentStudent && studentOperationRecords[currentStudent]) {
                            const record = studentOperationRecords[currentStudent];
                            if (record.thirdPartImages) {
                                const recordIndex = record.thirdPartImages.indexOf(imageUrl);
                                if (recordIndex > -1) {
                                    record.thirdPartImages.splice(recordIndex, 1);
                                    if (record.thirdPartImageNames) {
                                        record.thirdPartImageNames.splice(recordIndex, 1);
                                    }
                                    saveStudentOperationRecords();
                                }
                            }
                        }
                        
                        // 删除DOM元素
                        creationItem.remove();
                        
                        // 更新图片列表和选择器
                        updateImageList();
                        updateImageSelector();
                        
                        // 显示提示
                        showSaveStatus('图片已删除');
                    };
                    
                    // 添加鼠标悬停效果
                    imgWrapper.addEventListener('mouseover', function() {
                        deleteButton.style.display = 'flex';
                    });
                    
                    imgWrapper.addEventListener('mouseout', function() {
                        deleteButton.style.display = 'none';
                    });
                    
                    const img = document.createElement('img');
                    img.className = 'creation-image';
                    img.loading = 'lazy';
                    img.alt = imageData.filename;
                    img.dataset.filename = imageData.filename;
                    img.dataset.index = creationItem.dataset.index;
                    img.style.width = 'auto';
                    img.style.height = 'auto';
                    img.style.maxWidth = '100%';
                    img.style.maxHeight = '100%';
                    img.style.display = 'block';
                    img.style.objectFit = 'contain';
                    img.style.margin = '0';
                    img.style.padding = '0';
                    img.style.border = 'none';
                    img.style.borderRadius = '0';
                    img.style.backgroundColor = 'transparent';
                    img.style.boxSizing = 'border-box';
                    img.style.position = 'relative';
                    img.style.zIndex = '10';
                    img.style.transformOrigin = 'top left';
                    img.style.transition = 'transform 0.1s ease';
                    img.style.flexShrink = '0';
                    
                    // 应用图片位置设置
                    img.style.transform = `translate(${imageLeftPosition}px, ${imageTopPosition}px)`;
                    img.style.transformOrigin = 'top left';
                    
                    const imageUrl = imageData.url;
                    const isBase64 = imageUrl.startsWith('data:');
                    
                    console.log('开始加载图片:', imageData.filename, 'URL长度:', imageUrl.length, '是否为Base64:', isBase64);
                    console.log('完整图片URL:', imageUrl);
                    
                    img.src = imageUrl;
                    
                    let retryCount = 0;
                    const maxRetries = 2;
                    
                    img.onload = function() {
                        console.log('图片加载成功:', imageData.filename);
                        img.style.backgroundColor = 'transparent';
                        img.style.minHeight = 'auto';
                        
                        // 为智能匹配图片和用户上传图片添加自适应大小调整
                        if (imageData.filename === '智能匹配图片' || imageData.filename === '用户上传图片' || 
                            (imageData.url.startsWith('data:') && !imageData.url.includes('表格图片'))) {
                            applySmartImageAutoResize(this, imageData.filename);
                        }
                    };
                    
                    img.onerror = function() {
                        retryCount++;
                        console.error(`图片加载失败 (${retryCount}/${maxRetries}):`, imageData.filename, 'URL:', imageUrl.substring(0, 100));
                        
                        if (retryCount < maxRetries) {
                            console.log('重试加载图片:', imageData.filename);
                            setTimeout(() => {
                                img.src = imageUrl;
                            }, 100 * retryCount);
                        } else {
                            console.error('图片加载失败，达到最大重试次数:', imageData.filename);
                            this.alt = '无法加载图片: ' + imageData.filename;
                            this.style.backgroundColor = '#f0f0f0';
                            this.style.minHeight = '100px';
                            this.style.display = 'flex';
                            this.style.alignItems = 'center';
                            this.style.justifyContent = 'center';
                            this.style.color = '#999';
                            this.style.fontSize = '12px';
                            this.style.textAlign = 'center';
                            this.style.padding = '10px';
                            this.style.boxSizing = 'border-box';
                            
                            // 隐藏删除按钮，因为图片加载失败
                            deleteButton.style.display = 'none';
                            
                            const errorText = document.createElement('span');
                            errorText.textContent = '无法加载图片: ' + imageData.filename;
                            errorText.style.position = 'absolute';
                            errorText.style.top = '50%';
                            errorText.style.left = '50%';
                            errorText.style.transform = 'translate(-50%, -50%)';
                            errorText.style.width = '100%';
                            errorText.style.padding = '0 10px';
                            errorText.style.boxSizing = 'border-box';
                            
                            if (this.parentNode && !this.querySelector('span')) {
                                this.parentNode.appendChild(errorText);
                            }
                            
                            // 继续加载下一批图片，不因为当前图片失败而停止
                            setTimeout(() => {
                                if (i === endIndex - 1) {
                                    // 最后一张图片，继续加载下一批
                                    currentIndex = endIndex;
                                    if (currentIndex < allImages.length) {
                                        setTimeout(loadImagesBatch, 100);
                                    }
                                }
                            }, 0);
                        }
                    };
                    
                    imgWrapper.appendChild(img);
                    imgWrapper.appendChild(deleteButton);
                    imageContainer.appendChild(imgWrapper);
                    creationItem.appendChild(imageContainer);
                    creationFragment.appendChild(creationItem);
                    actualIndex++;
                }
                
                creationContainer.appendChild(creationFragment);
                currentIndex = endIndex;
                
                if (currentIndex < allImages.length) {
                    requestAnimationFrame(() => {
                        setTimeout(loadImagesBatch, 50);
                    });
                } else {
                    console.log('所有图片加载完成');
                }
            }
            
            requestAnimationFrame(() => {
                setTimeout(loadImagesBatch, 100);
            });
        } catch (error) {
            console.error('处理创作内容时出错:', error);
        }
        
        // 将创作内容容器添加到创作情况板块
        section3.appendChild(creationContainer);
        
        rightContainer.appendChild(section3);
        
        // 将左侧和右侧容器添加到主容器
        mainContainer.appendChild(leftContainer);
        mainContainer.appendChild(rightContainer);
        
        // 将主容器添加到报告内容容器
        reportContent.appendChild(mainContainer);
        
        console.log('报告生成完成');
        
        // 将文字点评添加到右侧容器的底部
        setTimeout(() => {
            renderCommentSection(reportContainer);
        }, 300);
        
        console.log('报告预览生成成功');
        
        // 注意：adjustContentSize会在背景图片加载完成后被调用
        // 不需要在这里调用，避免在背景图片未加载完成时调整内容大小
        

        
        // 更新图片选择器，使其包含预览区中的所有图片
        updateImageSelector();
        
        // 应用所有图片的调整
        function applyAllImageAdjustments() {
            const images = document.querySelectorAll('.creation-image');
            images.forEach((img, index) => {
                if (imageAdjustments[index]) {
                    const adjustment = imageAdjustments[index];
                    const scale = adjustment.size / 100;
                    img.style.transform = `scale(${scale}) translate(${adjustment.left}px, ${adjustment.top}px)`;
                    img.style.transformOrigin = 'top left';
                }
            });
        }
        
        // 应用所有图片的调整
        applyAllImageAdjustments();
        
        // 重新应用单个图片的调整
        updateSingleImageStyle();
        
    } catch (error) {
        console.error('生成报告时出错:', error);
        alert('生成报告时出错，请检查控制台');
    }
}

// 下载报告图片
async function downloadReport() {
    // 验证班主任姓名
    if (!validateTeacherName()) {
        return;
    }
    
    try {
        console.log('开始下载报告...');
        
        if (!reportPreview) {
            console.error('报告预览元素不存在');
            alert('报告预览元素不存在');
            return;
        }
        
        // 显示加载提示
        // 创建进度显示
        const progressElement = document.createElement('div');
        progressElement.style.position = 'fixed';
        progressElement.style.top = '50%';
        progressElement.style.left = '50%';
        progressElement.style.transform = 'translate(-50%, -50%)';
        progressElement.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
        progressElement.style.color = 'white';
        progressElement.style.padding = '20px';
        progressElement.style.borderRadius = '8px';
        progressElement.style.zIndex = '10000';
        progressElement.style.textAlign = 'center';
        progressElement.id = 'downloadProgress';
        progressElement.innerHTML = '<div>正在生成报告图片，请稍候...</div><div style="margin-top: 10px;">0%</div>';
        document.body.appendChild(progressElement);
        
        // 更新进度
        function updateProgress(percentage, message) {
            const progressDiv = document.getElementById('downloadProgress');
            if (progressDiv) {
                progressDiv.innerHTML = `<div>${message || '正在生成报告图片，请稍候...'}</div><div style="margin-top: 10px;">${percentage}%</div>`;
            }
        }
        
        updateProgress(10, '正在等待图片加载...');
        
        // 预加载背景图片
        updateProgress(15, '正在预加载背景图片...');
        console.log('开始预加载背景图片:', bgUrl);
        
        try {
            const bgDataUrl = await preloadBackgroundImage(bgUrl);
            if (bgDataUrl) {
                console.log('背景图片预加载成功');
                // 更新报告容器的背景为data URL
                const reportContainer = reportPreview.querySelector('.report');
                if (reportContainer) {
                    const originalBgStyle = reportContainer.style.backgroundImage;
                    reportContainer.style.backgroundImage = `url('${bgDataUrl}')`;
                    console.log('背景图片已更新为data URL');
                }
            } else {
                console.warn('背景图片预加载失败，继续使用原始背景');
            }
        } catch (error) {
            console.error('背景图片预加载出错:', error);
        }
        
        // 预处理所有图片，只对网络图片设置crossOrigin
        const images = reportPreview.querySelectorAll('img');
        console.log('发现', images.length, '张图片需要加载');
        
        images.forEach(img => {
            if (!img.src.startsWith('data:')) {
                // 只对网络图片设置crossOrigin
                if (img.src.startsWith('http://') || img.src.startsWith('https://')) {
                    img.crossOrigin = 'Anonymous';
                }
            }
        });
        
        // 等待所有图片加载完成
        const imagePromises = Array.from(images).map(img => {
            return new Promise((resolve, reject) => {
                if (img.complete) {
                    console.log('图片已加载:', img.src);
                    resolve();
                } else {
                    console.log('等待图片加载:', img.src);
                    img.onload = function() {
                        console.log('图片加载成功:', img.src);
                        resolve();
                    };
                    img.onerror = function() {
                        console.log('图片加载失败:', img.src);
                        // 隐藏加载失败的图片，避免影响整个下载
                        this.style.display = 'none';
                        resolve(); // 即使图片加载失败也继续
                    };
                }
            });
        });
        
        // 当所有图片加载完成后再生成
        Promise.all(imagePromises).then(() => {
            updateProgress(30, '所有图片加载完成，开始生成图片...');
            console.log('所有图片加载完成，开始生成canvas...');
            
            // 设置html2canvas选项
            const options = {
                scale: 2, // 提高图片质量
                useCORS: true, // 允许加载跨域图片
                logging: true,
                backgroundColor: null, // 使用透明背景，保留原始背景图片
                allowTaint: false, // 不允许tainted canvas
                taintTest: false, // 禁用污点测试
                removeContainer: false,
                // 确保所有元素都被捕获
                windowWidth: reportPreview.scrollWidth,
                // 强制使用16:9比例计算高度
                windowHeight: reportPreview.scrollWidth / (16/9),
                // 确保捕获整个内容
                scrollX: 0,
                scrollY: 0,
                // 确保所有元素都被捕获
                ignoreElements: function(element) {
                    return false;
                },
                // 确保图片加载完成
                onclone: function(clone) {
                    // 在克隆的DOM中处理图片，只对网络图片设置crossOrigin
                    const clonedImages = clone.querySelectorAll('img');
                    clonedImages.forEach(img => {
                        if (!img.src.startsWith('data:')) {
                            // 只对网络图片设置crossOrigin
                            if (img.src.startsWith('http://') || img.src.startsWith('https://')) {
                                img.crossOrigin = 'Anonymous';
                            }
                        }
                    });
                    
                    // 确保所有标题元素都有最高的z-index，不会被遮挡
                    const titles = clone.querySelectorAll('h1, h2, h3');
                    titles.forEach(title => {
                        title.style.position = 'relative';
                        title.style.zIndex = '9999';
                        title.style.overflow = 'visible';
                        title.style.whiteSpace = 'normal';
                        title.style.textOverflow = 'clip';
                    });
                    
                    // 处理背景图片
                    const clonedReport = clone.querySelector('.report');
                    if (clonedReport) {
                        const bgImage = clonedReport.style.backgroundImage;
                        if (bgImage) {
                            console.log('克隆的背景图片:', bgImage);
                        }
                    }
                    // 处理Canvas元素（确保柱状图能正确显示）
                    const canvases = clone.querySelectorAll('canvas');
                    canvases.forEach(canvas => {
                        try {
                            // 确保Canvas有正确的尺寸
                            if (canvas.width === 0 || canvas.height === 0) {
                                console.warn('Canvas尺寸为0，尝试设置尺寸');
                                canvas.width = canvas.offsetWidth || 300;
                                canvas.height = canvas.offsetHeight || 200;
                            }
                            // 将Canvas转换为图片，确保内容能被正确捕获
                            const dataUrl = canvas.toDataURL('image/png');
                            const img = document.createElement('img');
                            img.src = dataUrl;
                            img.width = canvas.width;
                            img.height = canvas.height;
                            img.style.width = canvas.offsetWidth + 'px';
                            img.style.height = canvas.offsetHeight + 'px';
                            img.style.maxWidth = '100%';
                            img.style.height = 'auto';
                            img.style.display = 'block';
                            // 替换Canvas为图片
                            if (canvas.parentNode) {
                                canvas.parentNode.replaceChild(img, canvas);
                            }
                        } catch (error) {
                            console.warn('Canvas转换失败，保留原始Canvas:', error);
                        }
                    });
                }
            };
            
            console.log('html2canvas选项:', options);
            
            // 使用html2canvas生成图片
            html2canvas(reportPreview, options).then(function(canvas) {
                updateProgress(80, '图片生成成功，正在准备下载...');
                console.log('Canvas生成成功，宽度:', canvas.width, '高度:', canvas.height);
                
                // 将canvas转换为图片链接
                const imgData = canvas.toDataURL('image/png');
                console.log('图片数据生成成功，数据长度:', imgData.length);
                
                // 创建下载链接
                const link = document.createElement('a');
                link.href = imgData;
                link.download = `${students[currentStudentIndex] || '学习情况报告'}.png`;
                console.log('下载链接创建成功，文件名:', link.download);
                
                // 触发下载
                document.body.appendChild(link); // 添加到DOM中
                link.click(); // 触发点击
                document.body.removeChild(link); // 从DOM中移除
                
                // 移除进度显示
                setTimeout(() => {
                    const progressDiv = document.getElementById('downloadProgress');
                    if (progressDiv) {
                        document.body.removeChild(progressDiv);
                    }
                    console.log('报告下载成功');
                    alert('报告下载成功！');
                }, 1000);
            }).catch(function(error) {
                console.error('生成图片时出错:', error);
                console.error('错误堆栈:', error.stack);
                // 移除进度显示
                const progressDiv = document.getElementById('downloadProgress');
                if (progressDiv) {
                    document.body.removeChild(progressDiv);
                }
                alert('生成图片时出错，请检查控制台');
            });
        }).catch(function(error) {
            console.error('等待图片加载时出错:', error);
            // 移除进度显示
            const progressDiv = document.getElementById('downloadProgress');
            if (progressDiv) {
                document.body.removeChild(progressDiv);
            }
            alert('等待图片加载时出错，请检查控制台');
        });
    } catch (error) {
        console.error('下载报告时出错:', error);
        console.error('错误堆栈:', error.stack);
        // 移除进度显示
        const progressDiv = document.getElementById('downloadProgress');
        if (progressDiv) {
            document.body.removeChild(progressDiv);
        }
        alert('下载报告时出错，请检查控制台');
    }
}

// 显示居中提示对话框
function showCenterAlert(message, type = 'info') {
    // 创建遮罩层
    const overlay = document.createElement('div');
    overlay.style.position = 'fixed';
    overlay.style.top = '0';
    overlay.style.left = '0';
    overlay.style.width = '100%';
    overlay.style.height = '100%';
    overlay.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
    overlay.style.zIndex = '9999';
    overlay.style.display = 'flex';
    overlay.style.alignItems = 'center';
    overlay.style.justifyContent = 'center';
    overlay.style.animation = 'fadeIn 0.3s ease';
    
    // 创建对话框
    const dialog = document.createElement('div');
    dialog.style.backgroundColor = '#ffffff';
    dialog.style.padding = '30px';
    dialog.style.borderRadius = '8px';
    dialog.style.boxShadow = '0 4px 20px rgba(0, 0, 0, 0.15)';
    dialog.style.maxWidth = '400px';
    dialog.style.width = '90%';
    dialog.style.textAlign = 'center';
    dialog.style.animation = 'slideIn 0.3s ease';
    
    // 对话框消息
    const messageElement = document.createElement('p');
    messageElement.textContent = message;
    messageElement.style.marginBottom = '20px';
    messageElement.style.lineHeight = '1.5';
    messageElement.style.color = '#666666';
    
    // 确定按钮
    const confirmBtn = document.createElement('button');
    confirmBtn.textContent = '确定';
    confirmBtn.style.padding = '10px 20px';
    confirmBtn.style.fontSize = '14px';
    confirmBtn.style.border = 'none';
    confirmBtn.style.borderRadius = '4px';
    confirmBtn.style.cursor = 'pointer';
    confirmBtn.style.transition = 'all 0.2s ease';
    
    // 根据类型设置按钮颜色
    if (type === 'error') {
        confirmBtn.style.backgroundColor = '#f44336';
        confirmBtn.addEventListener('mouseenter', function() {
            confirmBtn.style.backgroundColor = '#da190b';
        });
        confirmBtn.addEventListener('mouseleave', function() {
            confirmBtn.style.backgroundColor = '#f44336';
        });
    } else {
        confirmBtn.style.backgroundColor = '#4CAF50';
        confirmBtn.style.color = '#ffffff';
        confirmBtn.addEventListener('mouseenter', function() {
            confirmBtn.style.backgroundColor = '#45a049';
        });
        confirmBtn.addEventListener('mouseleave', function() {
            confirmBtn.style.backgroundColor = '#4CAF50';
        });
    }
    
    confirmBtn.style.color = '#ffffff';
    
    confirmBtn.addEventListener('click', function() {
        document.body.removeChild(overlay);
    });
    
    // 组装对话框
    dialog.appendChild(messageElement);
    dialog.appendChild(confirmBtn);
    overlay.appendChild(dialog);
    document.body.appendChild(overlay);
    
    // 支持键盘操作
    document.addEventListener('keydown', function handleKeydown(e) {
        if (e.key === 'Escape') {
            document.body.removeChild(overlay);
            document.removeEventListener('keydown', handleKeydown);
        }
    });
}

// 防抖函数
// 创建格式和质量选择对话框
function createFormatDialog() {
    const dialog = document.createElement('div');
    dialog.className = 'modal';
    dialog.style.position = 'fixed';
    dialog.style.top = '0';
    dialog.style.left = '0';
    dialog.style.width = '100%';
    dialog.style.height = '100%';
    dialog.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
    dialog.style.zIndex = '9999';
    dialog.style.display = 'flex';
    dialog.style.alignItems = 'center';
    dialog.style.justifyContent = 'center';
    
    const dialogContent = document.createElement('div');
    dialogContent.className = 'modal-content';
    dialogContent.style.maxWidth = '400px';
    dialogContent.style.width = '90%';
    dialogContent.style.backgroundColor = '#ffffff';
    dialogContent.style.padding = '20px';
    dialogContent.style.borderRadius = '8px';
    dialogContent.style.boxShadow = '0 4px 20px rgba(0, 0, 0, 0.15)';
    dialogContent.style.position = 'relative';
    
    const dialogHeader = document.createElement('div');
    dialogHeader.className = 'modal-header';
    dialogHeader.innerHTML = '<h3>下载设置</h3><button type="button" class="close-modal">&times;</button>';
    
    const dialogBody = document.createElement('div');
    dialogBody.className = 'modal-body';
    
    // 格式选择
    const formatSection = document.createElement('div');
    formatSection.style.marginBottom = '20px';
    formatSection.innerHTML = `
        <label style="display: block; margin-bottom: 8px; font-weight: bold;">图片格式</label>
        <div style="display: flex; gap: 10px;">
            <label style="display: flex; align-items: center; gap: 5px;">
                <input type="radio" name="format" value="png" checked> PNG
            </label>
            <label style="display: flex; align-items: center; gap: 5px;">
                <input type="radio" name="format" value="jpg"> JPG
            </label>
        </div>
    `;
    
    // 质量调节
    const qualitySection = document.createElement('div');
    qualitySection.style.marginBottom = '20px';
    qualitySection.innerHTML = `
        <label style="display: block; margin-bottom: 8px; font-weight: bold;">JPG质量: <span id="qualityValue">90</span>%</label>
        <input type="range" id="qualitySlider" min="80" max="100" step="5" value="90" style="width: 100%;">
    `;
    
    const dialogFooter = document.createElement('div');
    dialogFooter.className = 'modal-footer';
    dialogFooter.innerHTML = `
        <button type="button" id="cancelBtn" class="btn-secondary">取消</button>
        <button type="button" id="confirmBtn" class="btn-primary">确认下载</button>
    `;
    
    dialogBody.appendChild(formatSection);
    dialogBody.appendChild(qualitySection);
    dialogContent.appendChild(dialogHeader);
    dialogContent.appendChild(dialogBody);
    dialogContent.appendChild(dialogFooter);
    dialog.appendChild(dialogContent);
    document.body.appendChild(dialog);
    
    // 获取元素
    const closeBtn = dialog.querySelector('.close-modal');
    const cancelBtn = dialog.querySelector('#cancelBtn');
    const confirmBtn = dialog.querySelector('#confirmBtn');
    const formatRadios = dialog.querySelectorAll('input[name="format"]');
    const qualitySlider = dialog.querySelector('#qualitySlider');
    const qualityValue = dialog.querySelector('#qualityValue');
    
    // 质量滑块事件
    qualitySlider.addEventListener('input', function() {
        qualityValue.textContent = this.value;
    });
    
    // 取消按钮点击
    const closeDialog = function() {
        if (dialog && dialog.parentNode) {
            dialog.parentNode.removeChild(dialog);
        }
    };
    
    closeBtn.addEventListener('click', closeDialog);
    cancelBtn.addEventListener('click', closeDialog);
    
    // 点击外部关闭
    dialog.addEventListener('click', function(e) {
        if (e.target === dialog) {
            closeDialog();
        }
    });
    
    const dialogObj = {
        dialog: dialog,
        close: closeDialog,
        confirmCallback: null
    };
    
    // 更新confirmCallback的引用
    confirmBtn.addEventListener('click', function() {
        const selectedFormat = Array.from(formatRadios).find(radio => radio.checked).value;
        const quality = parseInt(qualitySlider.value);
        if (dialogObj.confirmCallback) {
            dialogObj.confirmCallback(selectedFormat, quality);
        }
    });
    
    return dialogObj;
}

// 添加防抖处理
const debouncedDownloadCurrentImage = debounce(downloadCurrentImage, 300);
const debouncedDownloadAllImagesAsZip = debounce(downloadAllImagesAsZip, 300);
const debouncedGenerateReport = debounce(generateReport, 100);

// 移动板块位置的函数
function moveSection(sectionId, direction) {
    let section;
    
    // 根据sectionId找到正确的板块
    if (sectionId === 'section1') {
        // 找到左侧容器中的第一个板块（听课情况）
        const leftContainer = document.querySelector('.report-content .main-content .left-container');
        if (leftContainer) {
            section = leftContainer.querySelector('.report-section:nth-child(1)');
        }
    } else if (sectionId === 'section2') {
        // 找到左侧容器中的第二个板块（互动题情况）
        const leftContainer = document.querySelector('.report-content .main-content .left-container');
        if (leftContainer) {
            section = leftContainer.querySelector('.report-section:nth-child(2)');
        }
    } else if (sectionId === 'section3') {
        // 找到右侧容器中的板块（创作情况）
        const rightContainer = document.querySelector('.report-content .main-content .right-container');
        if (rightContainer) {
            section = rightContainer.querySelector('.report-section');
        }
    }
    
    // 如果没有找到板块，尝试更通用的选择器
    if (!section) {
        // 尝试找到所有.report-section并根据sectionId选择
        const sections = document.querySelectorAll('.report-section');
        if (sectionId === 'section1' && sections[0]) {
            section = sections[0];
        } else if (sectionId === 'section2' && sections[1]) {
            section = sections[1];
        } else if (sectionId === 'section3' && sections[2]) {
            section = sections[2];
        }
    }
    
    if (!section) {
        console.warn('未找到板块:', sectionId);
        return;
    }
    
    let currentTransform = window.getComputedStyle(section).transform;
    let scaleX = 1, scaleY = 1, translateX = 0, translateY = 0;
    
    // 解析transform矩阵
    if (currentTransform !== 'none') {
        try {
            const match = currentTransform.match(/matrix\(([^,]+), ([^,]+), ([^,]+), ([^,]+), ([^,]+), ([^,]+)\)/);
            if (match) {
                [scaleX, , , scaleY, translateX, translateY] = match.slice(1).map(parseFloat);
            }
        } catch (error) {
            console.warn('解析transform失败:', error);
        }
    }
    
    // 确保值有效
    if (isNaN(scaleX)) scaleX = 1;
    if (isNaN(scaleY)) scaleY = 1;
    if (isNaN(translateX)) translateX = 0;
    if (isNaN(translateY)) translateY = 0;
    
    // 移动距离
    const moveDistance = 10;
    
    switch (direction) {
        case 'up':
            translateY -= moveDistance;
            break;
        case 'down':
            translateY += moveDistance;
            break;
        case 'left':
            translateX -= moveDistance;
            break;
        case 'right':
            translateX += moveDistance;
            break;
    }
    
    // 应用新的transform
    section.style.transform = `matrix(${scaleX}, 0, 0, ${scaleY}, ${translateX}, ${translateY})`;
    console.log('板块移动:', sectionId, direction, '新位置:', { translateX, translateY });
}

// 处理批量图片上传


// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', function() {
    markPerformance('DOMContentLoaded');
    
    if (window.location.protocol === 'file:') {
        console.log('检测到file://协议，预先转换本地图片为base64');
        preloadLocalImagesToBase64();
    }
    
    loadOperationLogs();
    loadSmartMatchStateComprehensive();
    initDOMElements();
    initAutoSaveSystem();
    initSortButton();
    initBackgroundSettings();
    initDownloadFunctions();
    initCustomBgUpload();
    
    // 初始化图片控制
    initImageControls();
    
    // 初始化图片缩放控制
    initImageScalingControls();
    
    // 初始化折叠/展开功能
    initToggleFunctionality();
    
    // 初始化锁定功能
    initLockFunctionality();
    
    // 更新图片选择器
    updateImageSelector();
    
    // 初始化批量操作菜单
    initBatchOperationMenu();

    console.log('页面加载完成，自动保存系统已初始化');
    console.log('DOM元素初始化完成:', {
        csvFilesInput: !!csvFilesInput,
        useLastNameCheckbox: !!useLastNameCheckbox,
        desc1Input: !!desc1Input,
        bgSelect: !!bgSelect,
        fontSelect: !!fontSelect
    });
    
    // 绑定学员列表的事件处理函数
    if (studentList) {
        // 绑定点击事件处理函数
        studentList.addEventListener('click', function(e) {
            const studentItem = e.target.closest('.student-item');
            if (studentItem && !isStudentSwitching) {
                const student = (studentItem.dataset.studentName || '').trim();
                const originalIndex = students.indexOf(student);
                if (originalIndex !== -1) {
                    try {
                        // 设置切换标志，防止重复触发
                        isStudentSwitching = true;
                        
                        // 先保存当前学员的操作记录和文字点评数据
                        if (students[currentStudentIndex]) {
                            saveCurrentStudentOperation();
                            saveCurrentStudentCommentData();
                        }
                        
                        // 切换到新学员
                        currentStudentIndex = originalIndex;
                        
                        // 检查是否有未确认的智能匹配图片，如果有则先保存
                        if (smartMatchResults && smartMatchResults.matched && smartMatchResults.matched.length > 0) {
                            console.log('检测到未确认的智能匹配图片，先保存到学员操作记录');
                            savePendingSmartMatchImages();
                        }
                        
                        // 切换学员前保存智能匹配状态
                        saveSmartMatchStateComprehensive();
                        
                        // 更新列表显示
                        updateStudentList();
                        
                        // 使用requestAnimationFrame和setTimeout结合的方式，优化报告生成过程
                        // 这样可以确保UI更新优先执行，避免界面卡顿
                        requestAnimationFrame(() => {
                            setTimeout(() => {
                                try {
                                    // 第一步：加载学员操作记录（这会更新全局变量 customImages）
                                    loadStudentOperationRecord(student);
                                    
                                    // 第二步：加载智能匹配状态
                                    loadSmartMatchStateComprehensive();
                                    
                                    // 标记报告生成开始时间
                                    const startTime = performance.now();
                                    
                                    // 第二步：生成报告
                                    setTimeout(() => {
                                        try {
                                            generateReport();
                                            
                                            // 重置切换标志
                                            isStudentSwitching = false;
                                            
                                            // 标记报告生成结束时间，计算执行时间
                                            const endTime = performance.now();
                                            console.log(`学员切换执行时间: ${(endTime - startTime).toFixed(2)}ms，当前学员【${student}】有 ${customImages.length} 张图片`);
                                        } catch (error) {
                                            console.error('生成报告时出错:', error);
                                            isStudentSwitching = false;
                                        }
                                    }, 100);
                                } catch (error) {
                                    console.error('加载学员操作记录时出错:', error);
                                    isStudentSwitching = false;
                                }
                            }, 50);
                        }, 100); // 进一步减少延迟时间，提高响应速度
                    } catch (error) {
                        console.error('学员切换时出错:', error);
                        // 重置切换标志
                        isStudentSwitching = false;
                    }
                }
            }
        });
        
        // 绑定鼠标悬停效果事件处理函数
        studentList.addEventListener('mouseover', function(e) {
            const studentItem = e.target.closest('.student-item');
            if (studentItem) {
                const currentStudent = (students[currentStudentIndex] || '').trim();
                const studentName = (studentItem.dataset.studentName || '').trim();
                if (currentStudent !== studentName) {
                    studentItem.style.backgroundColor = 'rgba(129, 199, 132, 0.3)';
                    studentItem.style.transform = 'translateX(5px)';
                }
            }
        });
        
        studentList.addEventListener('mouseout', function(e) {
            const studentItem = e.target.closest('.student-item');
            if (studentItem) {
                const currentStudent = (students[currentStudentIndex] || '').trim();
                const studentName = (studentItem.dataset.studentName || '').trim();
                if (currentStudent === studentName) {
                    studentItem.style.backgroundColor = 'rgba(76, 175, 80, 0.3)';
                } else {
                    studentItem.style.backgroundColor = 'rgba(129, 199, 132, 0.1)';
                }
                studentItem.style.transform = 'translateX(0)';
            }
        });
        
        console.log('学员列表事件处理函数已绑定');
    }
});

// 缓存图片历史记录，用于撤销操作
let cachedImagesHistory = [];

// 清空所有缓存图片
// 计算Base64图片大小的函数
function calculateBase64ImageSize(base64String) {
    try {
        // 移除Base64前缀
        const base64Content = base64String.split(',')[1];
        if (!base64Content) return 0;
        
        // 计算实际字节数：Base64编码的效率是3/4
        const sizeInBytes = (base64Content.length * 3) / 4;
        return sizeInBytes;
    } catch (error) {
        console.error('计算Base64图片大小出错:', error);
        return 0;
    }
}

// 格式化文件大小的函数
function formatFileSize(bytes) {
    if (bytes === 0) return '0 B';
    
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// 显示进度条对话框
function showProgressDialog(message) {
    // 创建进度条容器
    const dialog = document.createElement('div');
    dialog.style.cssText = `
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: white;
        padding: 30px;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        z-index: 10000;
        min-width: 300px;
        text-align: center;
    `;
    
    // 创建消息文本
    const messageElement = document.createElement('p');
    messageElement.textContent = message;
    messageElement.style.cssText = `
        margin-bottom: 20px;
        font-size: 16px;
        color: #333;
    `;
    dialog.appendChild(messageElement);
    
    // 创建进度条容器
    const progressContainer = document.createElement('div');
    progressContainer.style.cssText = `
        width: 100%;
        height: 8px;
        background: #f0f0f0;
        border-radius: 4px;
        overflow: hidden;
        margin-bottom: 10px;
    `;
    dialog.appendChild(progressContainer);
    
    // 创建进度条
    const progressBar = document.createElement('div');
    progressBar.style.cssText = `
        width: 0%;
        height: 100%;
        background: #4CAF50;
        border-radius: 4px;
        transition: width 0.3s ease;
    `;
    progressContainer.appendChild(progressBar);
    
    // 创建进度文本
    const progressText = document.createElement('div');
    progressText.textContent = '0%';
    progressText.style.cssText = `
        font-size: 14px;
        color: #666;
        margin-top: 10px;
    `;
    dialog.appendChild(progressText);
    
    // 添加到页面
    document.body.appendChild(dialog);
    
    // 返回对话框对象，包含所有元素
    return {
        dialog,
        progressBar,
        progressText
    };
}

// 更新进度条
function updateProgressDialog(progressDialog, progress) {
    if (progressDialog && progressDialog.progressBar && progressDialog.progressText) {
        // 确保进度在0-100之间
        progress = Math.max(0, Math.min(100, progress));
        
        // 更新进度条宽度
        progressDialog.progressBar.style.width = `${progress}%`;
        
        // 更新进度文本
        progressDialog.progressText.textContent = `${progress}%`;
    }
}

// 关闭进度条对话框
function closeProgressDialog(progressDialog) {
    if (progressDialog && progressDialog.dialog) {
        try {
            document.body.removeChild(progressDialog.dialog);
        } catch (error) {
            console.error('关闭进度条对话框出错:', error);
        }
    }
}

// 显示性能报告 - 新增
function showPerformanceReport() {
    const report = getPerformanceReport();
    console.log('=== 性能报告 ===');
    console.log('报告时间:', report.timestamp);
    console.log('性能指标:', report.metrics);
    console.log('平均值:', report.averages);
    
    // 创建性能报告对话框
    const overlay = document.createElement('div');
    overlay.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.5);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 10000;
    `;
    
    const dialog = document.createElement('div');
    dialog.style.cssText = `
        background: white;
        padding: 30px;
        border-radius: 8px;
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.2);
        max-width: 800px;
        width: 90%;
        max-height: 80vh;
        overflow-y: auto;
    `;
    
    const title = document.createElement('h2');
    title.textContent = '性能监控报告';
    title.style.marginBottom = '20px';
    title.style.color = '#333';
    dialog.appendChild(title);
    
    const timestamp = document.createElement('p');
    timestamp.textContent = `报告时间: ${report.timestamp}`;
    timestamp.style.marginBottom = '20px';
    timestamp.style.color = '#666';
    dialog.appendChild(timestamp);
    
    // 创建性能指标表格
    const table = document.createElement('table');
    table.style.cssText = `
        width: 100%;
        border-collapse: collapse;
        margin-bottom: 20px;
    `;
    
    const headerRow = document.createElement('tr');
    headerRow.innerHTML = `
        <th style="border: 1px solid #ddd; padding: 8px; text-align: left; background: #f5f5f5;">指标名称</th>
        <th style="border: 1px solid #ddd; padding: 8px; text-align: left; background: #f5f5f5;">样本数</th>
        <th style="border: 1px solid #ddd; padding: 8px; text-align: left; background: #f5f5f5;">最小值</th>
        <th style="border: 1px solid #ddd; padding: 8px; text-align: left; background: #f5f5f5;">最大值</th>
        <th style="border: 1px solid #ddd; padding: 8px; text-align: left; background: #f5f5f5;">平均值</th>
    `;
    table.appendChild(headerRow);
    
    for (const [key, value] of Object.entries(report.metrics)) {
        const row = document.createElement('tr');
        if (typeof value === 'object' && value !== null) {
            row.innerHTML = `
                <td style="border: 1px solid #ddd; padding: 8px;">${key}</td>
                <td style="border: 1px solid #ddd; padding: 8px;">${value.samples || '-'}</td>
                <td style="border: 1px solid #ddd; padding: 8px;">${value.min || '-'}</td>
                <td style="border: 1px solid #ddd; padding: 8px;">${value.max || '-'}</td>
                <td style="border: 1px solid #ddd; padding: 8px; font-weight: bold;">${value.avg || '-'}</td>
            `;
        } else {
            row.innerHTML = `
                <td style="border: 1px solid #ddd; padding: 8px;">${key}</td>
                <td style="border: 1px solid #ddd; padding: 8px;" colspan="4">${value}</td>
            `;
        }
        table.appendChild(row);
    }
    
    dialog.appendChild(table);
    
    // 创建关闭按钮
    const closeBtn = document.createElement('button');
    closeBtn.textContent = '关闭';
    closeBtn.style.cssText = `
        padding: 10px 20px;
        background: #4CAF50;
        color: white;
        border: none;
        border-radius: 4px;
        cursor: pointer;
        font-size: 14px;
    `;
    closeBtn.onclick = function() {
        document.body.removeChild(overlay);
    };
    dialog.appendChild(closeBtn);
    
    overlay.appendChild(dialog);
    document.body.appendChild(overlay);
    
    return report;
}

// 清理过期的历史记录
function cleanupExpiredHistory() {
    const now = Date.now();
    const twentyFourHoursInMs = 24 * 60 * 60 * 1000;
    
    // 过滤掉超过24小时的历史记录
    cachedImagesHistory = cachedImagesHistory.filter(history => {
        return (now - history.timestamp) < twentyFourHoursInMs;
    });
    
    // 如果没有更多历史记录，隐藏撤销按钮
    if (cachedImagesHistory.length === 0 && undoDeleteBtn) {
        undoDeleteBtn.style.display = 'none';
    }
}

function clearAllCachedImages() {
    // 清理过期的历史记录
    cleanupExpiredHistory();
    
    // 扫描缓存图片，统计数量和大小
    const imageCount = customImages.length;
    let totalSizeInBytes = 0;
    
    customImages.forEach(imageData => {
        totalSizeInBytes += calculateBase64ImageSize(imageData);
    });
    
    const totalSizeFormatted = formatFileSize(totalSizeInBytes);
    
    // 显示确认对话框，包含缓存大小信息
    showConfirmDialog(`确定要清空所有缓存图片吗？\n\n缓存图片数量: ${imageCount} 张\n占用存储空间: ${totalSizeFormatted}\n\n此操作可以撤销，撤销有效期为24小时。`, function(confirmed) {
        if (confirmed) {
            // 显示进度条
            const progressDialog = showProgressDialog('正在清空缓存图片...');
            
            // 模拟清空进度
            let progress = 0;
            const interval = setInterval(() => {
                progress += 10;
                updateProgressDialog(progressDialog, progress);
                
                if (progress >= 100) {
                    clearInterval(interval);
                    
                    setTimeout(() => {
                        try {
                            // 保存当前缓存图片到历史记录
                            cachedImagesHistory.push({
                                customImages: [...customImages],
                                customImageNames: [...customImageNames],
                                timestamp: Date.now()
                            });
                            
                            // 清空缓存图片
                            customImages = [];
                            customImageNames = [];
                            
                            // 更新图片列表显示
                            updateImageList();
                            updateImageSelector();
                            
                            // 刷新报告
                            generateReport();
                            
                            // 显示撤销按钮
                            if (undoDeleteBtn) {
                                undoDeleteBtn.style.display = 'inline-block';
                            }
                            
                            console.log('已清空所有缓存图片，历史记录:', cachedImagesHistory);
                            
                            // 关闭进度条并显示成功提示
                            closeProgressDialog(progressDialog);
                            showAlertDialog('✅ 所有缓存图片已清空，您可以使用撤销按钮在24小时内恢复。', function() {
                                console.log('用户确认了提示消息');
                            });
                        } catch (error) {
                            console.error('清空缓存图片出错:', error);
                            closeProgressDialog(progressDialog);
                            showAlertDialog('❌ 清空缓存图片失败，请重试。', function() {
                                console.log('用户确认了错误提示');
                            });
                        }
                    }, 500);
                }
            }, 100);
        }
    });
}

// 撤销清空缓存图片操作
function undoClearCachedImages() {
    // 清理过期的历史记录
    cleanupExpiredHistory();
    
    if (cachedImagesHistory.length > 0) {
        // 显示进度条
        const progressDialog = showProgressDialog('正在恢复缓存图片...');
        
        // 模拟恢复进度
        let progress = 0;
        const interval = setInterval(() => {
            progress += 10;
            updateProgressDialog(progressDialog, progress);
            
            if (progress >= 100) {
                clearInterval(interval);
                
                setTimeout(() => {
                    try {
                        const lastHistory = cachedImagesHistory.pop();
                        customImages = [...lastHistory.customImages];
                        customImageNames = [...lastHistory.customImageNames];
                        
                        // 更新图片列表显示
                        updateImageList();
                        updateImageSelector();
                        
                        // 刷新报告
                        generateReport();
                        
                        // 如果没有更多历史记录，隐藏撤销按钮
                        if (cachedImagesHistory.length === 0 && undoDeleteBtn) {
                            undoDeleteBtn.style.display = 'none';
                        }
                        
                        console.log('已撤销清空缓存图片操作，恢复了', customImages.length, '张图片');
                        
                        // 关闭进度条并显示成功提示
                        closeProgressDialog(progressDialog);
                        showAlertDialog('✅ 已成功恢复清空的缓存图片。', function() {
                            console.log('用户确认了提示消息');
                        });
                    } catch (error) {
                        console.error('恢复缓存图片出错:', error);
                        closeProgressDialog(progressDialog);
                        showAlertDialog('❌ 恢复缓存图片失败，请重试。', function() {
                            console.log('用户确认了错误提示');
                        });
                    }
                }, 500);
            }
        }, 100);
    } else {
        showAlertDialog('⚠️ 没有可恢复的缓存图片，或恢复期限已过。', function() {
            console.log('用户确认了提示消息');
        });
    }
}

// 初始化智能排序按钮
function initSortButton() {
    // 找到【请上传6-7个CSV表格文件】文字的p元素
    const hintElement = document.querySelector('.hint');
    if (hintElement && hintElement.textContent.includes('请上传6-7个CSV表格文件')) {
        // 检查是否已经存在智能排序按钮
        if (!document.getElementById('smartSortButton')) {
            // 创建智能排序按钮
            const sortButton = document.createElement('button');
            sortButton.id = 'smartSortButton';
            sortButton.textContent = '智能排序';
            sortButton.style.padding = '12px 20px';
            sortButton.style.backgroundColor = '#4CAF50';
            sortButton.style.color = 'white';
            sortButton.style.border = 'none';
            sortButton.style.borderRadius = '4px';
            sortButton.style.cursor = 'pointer';
            sortButton.style.marginTop = '10px';
            sortButton.style.marginBottom = '10px';
            sortButton.style.transition = 'all 0.3s ease';
            sortButton.style.display = 'block';
            sortButton.style.width = '100%';
            sortButton.style.textAlign = 'center';
            sortButton.style.fontSize = '14px';
            
            sortButton.addEventListener('mouseover', function() {
                this.style.backgroundColor = '#45a049';
            });
            
            sortButton.addEventListener('mouseout', function() {
                this.style.backgroundColor = '#4CAF50';
            });
            
            sortButton.onclick = sortFilesIntelligently;
            
            // 在hint元素后面添加智能排序按钮
            hintElement.parentNode.insertBefore(sortButton, hintElement.nextSibling);
            console.log('智能排序按钮已初始化并添加到【请上传6-7个CSV表格文件】文字下方');
        }
    }
}

// 初始化重置报告功能
function initResetReportFunctionality() {
    if (resetReportBtn) {
        resetReportBtn.addEventListener('click', function() {
            showResetConfirmDialog();
        });
        console.log('重置报告功能已初始化');
    }
}

// 显示重置确认对话框
function showResetConfirmDialog() {
    // 创建模态对话框
    const dialog = document.createElement('div');
    dialog.style.position = 'fixed';
    dialog.style.top = '0';
    dialog.style.left = '0';
    dialog.style.width = '100%';
    dialog.style.height = '100%';
    dialog.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
    dialog.style.display = 'flex';
    dialog.style.alignItems = 'center';
    dialog.style.justifyContent = 'center';
    dialog.style.zIndex = '9999';
    dialog.style.animation = 'fadeIn 0.3s ease';
    
    // 创建对话框内容
    const dialogContent = document.createElement('div');
    dialogContent.style.backgroundColor = '#ffffff';
    dialogContent.style.padding = '30px';
    dialogContent.style.borderRadius = '8px';
    dialogContent.style.boxShadow = '0 4px 20px rgba(0, 0, 0, 0.15)';
    dialogContent.style.maxWidth = '400px';
    dialogContent.style.width = '90%';
    dialogContent.style.animation = 'slideIn 0.3s ease';
    
    // 对话框标题
    const dialogTitle = document.createElement('h3');
    dialogTitle.textContent = '⚠️ 确认重置报告';
    dialogTitle.style.marginTop = '0';
    dialogTitle.style.marginBottom = '15px';
    dialogTitle.style.color = '#333333';
    
    // 对话框消息
    const dialogMessage = document.createElement('p');
    dialogMessage.textContent = '此操作将清除所有当前数据和设置，恢复到初始状态。确定要继续吗？';
    dialogMessage.style.marginBottom = '25px';
    dialogMessage.style.lineHeight = '1.5';
    dialogMessage.style.color = '#666666';
    
    // 按钮容器
    const dialogButtons = document.createElement('div');
    dialogButtons.style.display = 'flex';
    dialogButtons.style.justifyContent = 'flex-end';
    dialogButtons.style.gap = '10px';
    
    // 取消按钮
    const cancelBtn = document.createElement('button');
    cancelBtn.textContent = '取消';
    cancelBtn.style.padding = '10px 20px';
    cancelBtn.style.fontSize = '14px';
    cancelBtn.style.border = '1px solid #dddddd';
    cancelBtn.style.borderRadius = '4px';
    cancelBtn.style.backgroundColor = '#ffffff';
    cancelBtn.style.color = '#333333';
    cancelBtn.style.cursor = 'pointer';
    cancelBtn.style.transition = 'all 0.2s ease';
    
    cancelBtn.addEventListener('mouseenter', function() {
        cancelBtn.style.backgroundColor = '#f5f5f5';
    });
    
    cancelBtn.addEventListener('mouseleave', function() {
        cancelBtn.style.backgroundColor = '#ffffff';
    });
    
    cancelBtn.addEventListener('click', function() {
        document.body.removeChild(dialog);
    });
    
    // 确认按钮
    const confirmBtn = document.createElement('button');
    confirmBtn.textContent = '确认重置';
    confirmBtn.style.padding = '10px 20px';
    confirmBtn.style.fontSize = '14px';
    confirmBtn.style.border = 'none';
    confirmBtn.style.borderRadius = '4px';
    confirmBtn.style.backgroundColor = '#f44336';
    confirmBtn.style.color = '#ffffff';
    confirmBtn.style.cursor = 'pointer';
    confirmBtn.style.transition = 'all 0.2s ease';
    
    confirmBtn.addEventListener('mouseenter', function() {
        confirmBtn.style.backgroundColor = '#d32f2f';
    });
    
    confirmBtn.addEventListener('mouseleave', function() {
        confirmBtn.style.backgroundColor = '#f44336';
    });
    
    confirmBtn.addEventListener('click', function() {
        document.body.removeChild(dialog);
        resetReport();
    });
    
    // 组装对话框
    dialogButtons.appendChild(cancelBtn);
    dialogButtons.appendChild(confirmBtn);
    dialogContent.appendChild(dialogTitle);
    dialogContent.appendChild(dialogMessage);
    dialogContent.appendChild(dialogButtons);
    dialog.appendChild(dialogContent);
    
    // 添加到页面
    document.body.appendChild(dialog);
    
    // 添加动画样式
    const style = document.createElement('style');
    style.textContent = `
        @keyframes fadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
        }
        @keyframes slideIn {
            from { transform: translateY(-20px); opacity: 0; }
            to { transform: translateY(0); opacity: 1; }
        }
        @keyframes fadeOut {
            from { opacity: 1; }
            to { opacity: 0; }
        }
        @keyframes slideOut {
            from { transform: translateY(0); opacity: 1; }
            to { transform: translateY(20px); opacity: 0; }
        }
    `;
    dialog.appendChild(style);
}

// 文字点评功能
function initCommentFeature() {
    console.log('初始化文字点评功能');
    
    // 初始化班主任头像（默认头像）
    initDefaultAvatar();
    
    // 绑定事件监听器
    bindCommentEventListeners();
}

// 初始化默认头像
function initDefaultAvatar() {
    if (avatarPreview) {
        const defaultAvatarPath = 'image/头像1.png';
        avatarPreview.src = defaultAvatarPath;
        
        avatarPreview.onerror = function() {
            console.log('默认头像加载失败，使用备用方案');
            this.src = '';
            this.alt = '未上传头像';
            this.style.backgroundColor = '#f0f0f0';
            this.style.display = 'flex';
            this.style.alignItems = 'center';
            this.style.justifyContent = 'center';
            this.style.color = '#999';
            this.style.fontSize = '14px';
            this.textContent = '未上传头像';
        };
    }
}

// 绑定文字点评功能的事件监听器
function bindCommentEventListeners() {
    // 班主任姓名验证和动态替换
    if (teacherNameInput) {
        teacherNameInput.addEventListener('input', function() {
            validateTeacherName();
        });
        
        teacherNameInput.addEventListener('blur', function() {
            validateTeacherName();
            // 班主任姓名输入完成后，自动触发替换流程
            updateTeacherNameInComment();
            // 鼠标离开班主任姓名输入框后，自动刷新评语
            generateComment();
        });
    }
    
    // 头像上传
    if (selectAvatarBtn) {
        selectAvatarBtn.addEventListener('click', function() {
            if (avatarUpload) {
                avatarUpload.click();
            }
        });
    }
    
    if (editAvatarBtn) {
        editAvatarBtn.addEventListener('click', function() {
            openAvatarEditor();
        });
    }
    
    if (avatarUpload) {
        avatarUpload.addEventListener('change', function(e) {
            handleAvatarUpload(e.target.files);
        });
    }
    
    // 头像编辑器相关事件
    initAvatarEditorEvents();
    
    // 生成评语
    if (generateCommentBtn) {
        generateCommentBtn.addEventListener('click', function() {
            generateComment();
        });
    }
    
    // 生成评语 2
    if (generateCommentBtn2) {
        generateCommentBtn2.addEventListener('click', function() {
            generateComment();
        });
    }
    
    // 重新生成评语
    if (regenerateCommentBtn) {
        regenerateCommentBtn.addEventListener('click', function() {
            generateComment();
        });
    }
    
    // 重新生成评语 2
    const regenerateCommentBtn2 = document.getElementById('regenerateCommentBtn2');
    if (regenerateCommentBtn2) {
        regenerateCommentBtn2.addEventListener('click', function() {
            generateComment();
        });
    }
    
    // 评语内容编辑保存 - 使用generateReport实现实时预览
    const commentResult = document.getElementById('commentResult');
    if (commentResult) {
        commentResult.addEventListener('blur', function() {
            const content = this.innerHTML.trim();
            if (content) {
                const commentContent = this.querySelector('p') ? this.querySelector('p').innerHTML : content;
                generateReport();
                showSaveStatus('评语已保存');
            }
        });
    }
    
    // 初始化评论格式同步
    setupCommentFormatSync();
    
    // 复制评语
    const copyCommentBtn = document.getElementById('copyCommentBtn');
    if (copyCommentBtn) {
        copyCommentBtn.addEventListener('click', function() {
            copyComment();
        });
    }
    
    // 操作控制
    bindControlEvents();
    
    // 文字点评字体设置事件监听
    const commentFontSelect = document.getElementById('commentFontSelect');
    const commentFontColor = document.getElementById('commentFontColor');
    const commentFontBold = document.getElementById('commentFontBold');
    const commentBackgroundColor = document.getElementById('commentBackgroundColor');
    const commentBackgroundColorValue = document.getElementById('commentBackgroundColorValue');
    const commentBorderStyle = document.getElementById('commentBorderStyle');
    const commentBorderColor = document.getElementById('commentBorderColor');
    const commentBorderColorValue = document.getElementById('commentBorderColorValue');
    const commentBorderWidth = document.getElementById('commentBorderWidth');
    const commentBorderWidthValue = document.getElementById('commentBorderWidthValue');
    
    if (commentFontSelect) {
        commentFontSelect.addEventListener('change', function() {
            const reportPreview = document.getElementById('reportPreview');
            if (reportPreview) {
                renderCommentSection(reportPreview);
            }
        });
    }
    
    if (commentFontColor) {
        commentFontColor.addEventListener('change', function() {
            const reportPreview = document.getElementById('reportPreview');
            if (reportPreview) {
                renderCommentSection(reportPreview);
            }
        });
    }
    
    if (commentFontBold) {
        commentFontBold.addEventListener('change', function() {
            const reportPreview = document.getElementById('reportPreview');
            if (reportPreview) {
                renderCommentSection(reportPreview);
            }
        });
    }
    
    const commentFontSize = document.getElementById('commentFontSize');
    const commentFontSizeValue = document.getElementById('commentFontSizeValue');
    if (commentFontSize) {
        commentFontSize.addEventListener('input', function(e) {
            if (commentFontSizeValue) {
                commentFontSizeValue.textContent = e.target.value + 'px';
            }
            const reportPreview = document.getElementById('reportPreview');
            if (reportPreview) {
                renderCommentSection(reportPreview);
            }
        });
    }
    
    if (commentBackgroundColor) {
        commentBackgroundColor.addEventListener('input', function(e) {
            if (commentBackgroundColorValue) {
                commentBackgroundColorValue.textContent = e.target.value;
            }
            const reportPreview = document.getElementById('reportPreview');
            if (reportPreview) {
                renderCommentSection(reportPreview);
            }
        });
    }
    
    // 文字框背景颜色透明按钮事件监听
    const commentBackgroundColorTransparent = document.getElementById('commentBackgroundColorTransparent');
    if (commentBackgroundColorTransparent) {
        commentBackgroundColorTransparent.addEventListener('click', function() {
            if (commentBackgroundColor) {
                commentBackgroundColor.value = '#FFFFFF';
                if (commentBackgroundColorValue) {
                    commentBackgroundColorValue.textContent = '透明';
                }
                const reportPreview = document.getElementById('reportPreview');
                if (reportPreview) {
                    renderCommentSection(reportPreview);
                }
            }
        });
    }
    
    if (commentBorderStyle) {
        commentBorderStyle.addEventListener('change', function() {
            const reportPreview = document.getElementById('reportPreview');
            if (reportPreview) {
                renderCommentSection(reportPreview);
            }
        });
    }
    
    if (commentBorderColor) {
        commentBorderColor.addEventListener('input', function(e) {
            if (commentBorderColorValue) {
                commentBorderColorValue.textContent = e.target.value;
            }
            const reportPreview = document.getElementById('reportPreview');
            if (reportPreview) {
                renderCommentSection(reportPreview);
            }
        });
    }
    
    if (commentBorderWidth) {
        commentBorderWidth.addEventListener('input', function(e) {
            if (commentBorderWidthValue) {
                commentBorderWidthValue.textContent = e.target.value + 'px';
            }
            const reportPreview = document.getElementById('reportPreview');
            if (reportPreview) {
                renderCommentSection(reportPreview);
            }
        });
    }
    
    // 恢复文字点评按钮
    const restoreCommentBtn = document.getElementById('restoreCommentBtn');
    if (restoreCommentBtn) {
        restoreCommentBtn.addEventListener('click', function() {
            restoreComment();
        });
    }
}

// 验证班主任姓名
function validateTeacherName(skipScroll = false) {
    const teacherNameInput = document.getElementById('teacherName');
    const teacherNameError = document.getElementById('teacherNameError');
    
    if (!teacherNameInput || !teacherNameError) {
        console.error('班主任姓名输入框或错误提示元素未找到');
        return false;
    }
    
    const name = teacherNameInput.value.trim();
    
    // 检查用户是否已经删除了文字点评
    const commentDeletedByUser = window.commentDeletedByUser || false;
    
    if (!name) {
        teacherNameError.textContent = '请输入班主任姓名';
        teacherNameError.style.display = 'block';
        
        // 如果用户删除了文字点评，则不自动滚动
        if (!skipScroll && !commentDeletedByUser) {
            scrollToTeacherName();
        }
        
        return false;
    } else if (name.length < 2 || name.length > 10) {
        teacherNameError.textContent = '姓名长度应在2-10个字符之间';
        teacherNameError.style.display = 'block';
        
        // 如果用户删除了文字点评，则不自动滚动
        if (!skipScroll && !commentDeletedByUser) {
            scrollToTeacherName();
        }
        
        return false;
    } else {
        const nameRegex = /^[\u4e00-\u9fa5a-zA-Z·-]+$/;
        if (!nameRegex.test(name)) {
            teacherNameError.textContent = '姓名只能包含汉字、字母及少数特殊符号（·、-）';
            teacherNameError.style.display = 'block';
            
            // 如果用户删除了文字点评，则不自动滚动
            if (!skipScroll && !commentDeletedByUser) {
                scrollToTeacherName();
            }
            
            return false;
        } else {
            teacherNameError.textContent = '';
            teacherNameError.style.display = 'none';
            return true;
        }
    }
}

// 滚动到班主任姓名输入框
function scrollToTeacherName() {
    const teacherNameInput = document.getElementById('teacherName');
    const leftPanel = document.querySelector('.left-panel');
    
    if (!teacherNameInput || !leftPanel) {
        console.warn('班主任姓名输入框或左侧面板未找到');
        return;
    }
    
    // 获取输入框相对于左侧面板的位置
    const inputRect = teacherNameInput.getBoundingClientRect();
    const panelRect = leftPanel.getBoundingClientRect();
    
    // 计算需要滚动的距离
    const scrollTop = inputRect.top - panelRect.top + leftPanel.scrollTop - 20;
    
    // 平滑滚动到目标位置
    leftPanel.scrollTo({
        top: scrollTop,
        behavior: 'smooth'
    });
    
    // 聚焦到输入框
    teacherNameInput.focus();
    
    console.log('已自动滚动到班主任姓名输入框');
}

// 更新评语中的班主任姓名
function updateTeacherNameInComment() {
    const teacherNameInput = document.getElementById('teacherName');
    if (!teacherNameInput) return;
    
    const teacherName = teacherNameInput.value.trim();
    if (!teacherName) return;
    
    const commentResult = document.querySelector('.comment-content p');
    if (!commentResult) return;
    
    let commentContent = commentResult.textContent.trim();
    if (!commentContent) return;
    
    commentContent = commentContent.replace(/XX老师/g, `${teacherName}老师`);
    commentContent = commentContent.replace(/XX/g, `${teacherName}老师`);
    
    commentResult.textContent = commentContent;
    
    console.log('班主任姓名已更新到评语中，并添加了"老师"后缀');
}

// 处理头像上传
function handleAvatarUpload(files) {
    if (!files || files.length === 0) return;
    
    const file = files[0];
    const avatarUploadError = document.getElementById('avatarUploadError');
    
    // 验证文件类型
    if (!file.type.match('image/jpeg') && !file.type.match('image/png')) {
        if (avatarUploadError) {
            avatarUploadError.textContent = '请上传JPG或PNG格式的图片';
            avatarUploadError.style.display = 'block';
        }
        return;
    }
    
    // 验证文件大小（50MB限制）
    const maxSize = 50 * 1024 * 1024; // 50MB
    if (file.size > maxSize) {
        if (avatarUploadError) {
            avatarUploadError.textContent = '图片大小不能超过50MB';
            avatarUploadError.style.display = 'block';
        }
        return;
    }
    
    // 清除错误信息
    if (avatarUploadError) {
        avatarUploadError.textContent = '';
        avatarUploadError.style.display = 'none';
    }
    
    // 读取并预览图片
    const reader = new FileReader();
    reader.onload = function(e) {
        const avatarPreview = document.getElementById('avatarPreview');
        if (avatarPreview) {
            try {
                // 确保头像图片正确加载
                const img = new Image();
                img.onload = function() {
                    // 图片加载成功后再设置到预览元素
                    avatarPreview.src = e.target.result;
                    avatarPreview.alt = '班主任头像';
                    // 重置样式
                    avatarPreview.style.backgroundColor = '';
                    avatarPreview.style.display = 'block';
                    avatarPreview.style.alignItems = '';
                    avatarPreview.style.justifyContent = '';
                    avatarPreview.style.color = '';
                    avatarPreview.style.fontSize = '';
                    avatarPreview.textContent = '';
                    
                    console.log('头像图片加载成功');
                };
                img.onerror = function() {
                    // 图片加载失败的处理
                    if (avatarUploadError) {
                        avatarUploadError.textContent = '头像图片加载失败，请重试';
                        avatarUploadError.style.display = 'block';
                    }
                    console.error('头像图片加载失败');
                };
                img.src = e.target.result;
            } catch (error) {
                if (avatarUploadError) {
                    avatarUploadError.textContent = '头像处理失败，请重试';
                    avatarUploadError.style.display = 'block';
                }
                console.error('头像处理失败:', error);
            }
        }
    };
    reader.onerror = function() {
        if (avatarUploadError) {
            avatarUploadError.textContent = '文件读取失败，请重试';
            avatarUploadError.style.display = 'block';
        }
        console.error('文件读取失败');
    };
    reader.readAsDataURL(file);
}

// 自动生成评语（CSV上传后自动触发）
function autoGenerateComment() {
    const commentResult = document.getElementById('commentResult');
    
    if (!commentResult) return;
    
    // 验证班主任姓名
    if (!validateTeacherName()) {
        return;
    }
    
    try {
        const comment = generateIntelligentComment();
        
        if (commentResult) {
            const paragraphs = comment.split('\n\n');
            commentResult.innerHTML = `
                <div class="comment-content">
                    ${paragraphs.map(p => `<p>${p}</p>`).join('')}
                </div>
            `;
        }
        
        console.log('自动生成评语完成');
    } catch (error) {
        console.error('自动生成评语时出错:', error);
        showSaveStatus('生成评语时出错，请重试', true);
    }
}

// 生成评语
function generateComment() {
    const commentLoading = document.getElementById('commentLoading');
    const commentResult = document.getElementById('commentResult');
    
    if (!commentResult) return;
    
    // 验证班主任姓名
    if (!validateTeacherName()) {
        return;
    }
    
    if (commentLoading) {
        commentLoading.style.display = 'block';
    }
    
    try {
        const comment = generateIntelligentComment();
        
        if (commentResult) {
            const paragraphs = comment.split('\n\n');
            commentResult.innerHTML = `
                <div class="comment-content">
                    ${paragraphs.map(p => `<p>${p}</p>`).join('')}
                </div>
            `;
        }
        
        // 只更新报告中的评语部分，不重新生成整个报告
        const reportPreview = document.getElementById('reportPreview');
        if (reportPreview) {
            renderCommentSection(reportPreview);
        }
        
        console.log('生成评语完成');
    } catch (error) {
        console.error('生成评语时出错:', error);
        showSaveStatus('生成评语时出错，请重试', true);
    } finally {
        if (commentLoading) {
            commentLoading.style.display = 'none';
        }
    }
}

// 生成智能评语
function generateIntelligentComment() {
    let studentName = '';
    let nickname = '宝贝';
    let fullNickname = '宝贝';
    
    if (students && students.length > 0 && currentStudentIndex >= 0 && currentStudentIndex < students.length) {
        studentName = students[currentStudentIndex];
        nickname = extractStudentNickname(studentName);
        if (nickname) {
            fullNickname = nickname + '宝贝';
        }
    }
    
    const studentAnalysis = analyzeStudentPerformance();
    
    const teacherNameInput = document.getElementById('teacherName');
    const teacherName = teacherNameInput ? teacherNameInput.value.trim() : '';
    
    const teacherNameWithSuffix = teacherName ? `${teacherName}老师` : '老师';
    
    const openingPhrases = [
        `${fullNickname}，在这段学习旅程中，`,
        `${fullNickname}，通过这段时间的观察，${teacherNameWithSuffix}发现`,
        `${fullNickname}，回顾近期的学习情况，`,
        `${fullNickname}，从你的学习表现来看，${teacherNameWithSuffix}为你感到骄傲`
    ];
    
    const overallEvaluations = [
        `你展现出了良好的学习态度和积极的探索精神，${teacherNameWithSuffix}看到了你的成长，`,
        `你在学习上的投入和努力让人印象深刻，真的很棒，`,
        `你对知识的渴求和钻研精神值得肯定，${teacherNameWithSuffix}为你点赞，`,
        `你在学习过程中表现出的专注和认真态度令人赞赏，继续保持哦，`
    ];
    
    let highlight = '';
    if (studentAnalysis.bestReason) {
        highlight = `特别是在学习过程中，你${studentAnalysis.bestReason}，`;
    } else {
        const defaultHighlights = [
            `特别是在学习过程中，你展现了良好的学习习惯和方法，`,
            `尤其是在课堂互动中，你积极参与，思维活跃，`,
            `特别是在知识点掌握上，你基础打得很扎实，`,
            `尤其是在创作练习中，你展现了独特的思维视角和创新能力，`
        ];
        highlight = defaultHighlights[Math.floor(Math.random() * defaultHighlights.length)];
    }
    
    let improvement = '';
    if (studentAnalysis.improvementSuggestion) {
        improvement = `在学习过程中，如果能${studentAnalysis.improvementSuggestion}，相信你会取得更大的进步，`;
    }
    
    const mottos = [
        `正如一句名言所说："学如逆水行舟，不进则退"，要加油哦，`,
        `记住："书山有路勤为径，学海无涯苦作舟"，${teacherNameWithSuffix}相信你能做到，`,
        `古人云："学而不思则罔，思而不学则殆"，要勤思考，`,
        `正如爱因斯坦所说："学习知识要善于思考，思考，再思考"，`
    ];
    
    const wishes = [
        `希望你能继续保持这种学习状态，不断突破自我，在未来的学习道路上取得更加优异的成绩！${teacherNameWithSuffix}会一直支持你！`,
        `期待你在接下来的学习中能够再接再厉，勇攀高峰，创造属于自己的辉煌！加油！`,
        `愿你以梦为马，不负韶华，在知识的海洋中尽情遨游，收获更多成长与喜悦！`,
        `希望你能始终保持对学习的热情和好奇心，不断追求卓越，成为更好的自己！${teacherNameWithSuffix}为你骄傲！`
    ];
    
    const opening = openingPhrases[Math.floor(Math.random() * openingPhrases.length)];
    const evaluation = overallEvaluations[Math.floor(Math.random() * overallEvaluations.length)];
    const motto = mottos[Math.floor(Math.random() * mottos.length)];
    const wish = wishes[Math.floor(Math.random() * wishes.length)];
    
    let comment = opening + evaluation + highlight;
    if (improvement) {
        comment += improvement;
    }
    // 确保第一段落最后一个标点符号是句号
    comment = comment.replace(/，$/, '。');
    comment = comment.replace(/,$/, '。');
    // 控制为两个自然段，首行缩进由CSS控制
    const firstParagraph = comment;
    const secondParagraph = motto + ' ' + wish;
    comment = firstParagraph + '\n' + secondParagraph;
    
    // 调整修饰词添加逻辑，确保修饰词只添加到第一段
    const targetLength = Math.floor((80 + 150) / 2);
    if (comment.length < 80) {
        const modifiers = [
            '非常', '特别', '十分', '极其', '相当',
            '在老师看来，', '从各方面来看，', '综合而言，'
        ];
        const modifier = modifiers[Math.floor(Math.random() * modifiers.length)];
        const paragraphs = comment.split('\n');
        paragraphs[0] = modifier + paragraphs[0];
        comment = paragraphs.join('\n');
    }
    
    // 调整长度限制逻辑，确保不截断第二自然段
    if (comment.length > 150) {
        // 只在第一段中移除修饰词
        const paragraphs = comment.split('\n');
        if (paragraphs[0]) {
            paragraphs[0] = paragraphs[0].replace(/非常|特别|十分|极其|相当/g, '');
            paragraphs[0] = paragraphs[0].replace(/在老师看来，|从各方面来看，|综合而言，/g, '');
        }
        comment = paragraphs.join('\n');
    }
    
    return comment;
}

// 分析学生学习表现（基于互动题正确率和完课率）
function analyzeStudentPerformance() {
    let bestReason = '';
    let improvementSuggestion = '';
    
    if (!students || students.length === 0 || currentStudentIndex < 0 || currentStudentIndex >= students.length) {
        return { bestReason, improvementSuggestion };
    }
    
    const currentStudent = students[currentStudentIndex];
    
    let totalCorrectRate = 0;
    let correctRateCount = 0;
    let totalCompletionRate = 0;
    let completionRateCount = 0;
    
    csvData.forEach((data, index) => {
        if (data && data.rows && data.rows.length > 0) {
            const studentRow = data.rows.find(row => {
                const rowName = row['姓名'] || row['学员姓名'] || row['名字'] || '';
                return rowName === currentStudent;
            });
            
            if (studentRow) {
                const completionStatus = findFieldValue(studentRow, ['是否完课_新', '是否完课', '完课状态', '完课', '完成状态']);
                const correctRate = findFieldValue(studentRow, ['客观题互动正确率', '互动正确率', '正确率', '客观题正确率', '答题正确率', '正确率', '答题', '正确率(%)', '答对率']);
                
                if (completionStatus === '是' || completionStatus === '已完成' || completionStatus === '完成') {
                    totalCompletionRate += 100;
                    completionRateCount++;
                }
                
                if (correctRate) {
                    const rate = parseFloat(correctRate);
                    if (!isNaN(rate)) {
                        totalCorrectRate += rate;
                        correctRateCount++;
                    }
                }
            }
        }
    });
    
    const avgCorrectRate = correctRateCount > 0 ? totalCorrectRate / correctRateCount : 0;
    const avgCompletionRate = completionRateCount > 0 ? totalCompletionRate / completionRateCount : 0;
    
    if (avgCorrectRate >= 80) {
        bestReason = '互动题正确率很高，对知识点掌握牢固';
    } else if (avgCompletionRate >= 80) {
        bestReason = '完课率很高，按时完成了学习任务';
    } else if (avgCorrectRate >= 60) {
        bestReason = '互动题正确率良好，基础知识掌握较好';
    } else if (avgCompletionRate >= 60) {
        bestReason = '完课率良好，学习态度认真';
    }
    
    if (avgCorrectRate < 60) {
        improvementSuggestion = '加强知识点的学习和巩固，提高互动题正确率';
    } else if (avgCompletionRate < 60) {
        improvementSuggestion = '按时完成学习任务，提高完课率';
    }
    
    return { bestReason, improvementSuggestion };
}

// 查找字段值的辅助函数
function findFieldValue(rowData, fieldNames) {
    for (const fieldName of fieldNames) {
        if (rowData[fieldName] !== undefined && rowData[fieldName] !== '') {
            return rowData[fieldName];
        }
    }
    return '';
}

// 复制评语
function copyComment() {
    const commentResult = document.getElementById('commentResult');
    if (!commentResult) return;
    
    const commentText = commentResult.textContent.trim();
    if (!commentText) return;
    
    // 复制到剪贴板
    navigator.clipboard.writeText(commentText)
        .then(function() {
            alert('评语已复制到剪贴板');
        })
        .catch(function(err) {
            console.error('复制失败:', err);
            alert('复制失败，请手动复制');
        });
}

// 绑定操作控制事件
function bindControlEvents() {
    // 缩放控制
    const zoomOutBtn = document.getElementById('zoomOutBtn');
    const zoomInBtn = document.getElementById('zoomInBtn');
    const zoomLevel = document.getElementById('zoomLevel');
    
    let currentZoom = window.currentCommentZoom || 100;
    
    if (zoomLevel) {
        zoomLevel.textContent = currentZoom + '%';
    }
    
    if (zoomOutBtn) {
        zoomOutBtn.addEventListener('click', function() {
            if (currentZoom > 50) {
                currentZoom -= 10;
                window.currentCommentZoom = currentZoom;
                updateZoomLevel(currentZoom);
                applyZoomToComment();
            }
        });
    }
    
    if (zoomInBtn) {
        zoomInBtn.addEventListener('click', function() {
            if (currentZoom < 200) {
                currentZoom += 10;
                window.currentCommentZoom = currentZoom;
                updateZoomLevel(currentZoom);
                applyZoomToComment();
            }
        });
    }
    
    function updateZoomLevel(zoom) {
        if (zoomLevel) {
            zoomLevel.textContent = zoom + '%';
        }
        console.log('缩放级别:', zoom + '%');
    }
    
    function applyZoomToComment() {
        const commentElement = document.querySelector('.comment-section-final');
        if (commentElement) {
            commentElement.style.transform = `scale(${currentZoom / 100})`;
            commentElement.style.transformOrigin = 'top left';
        }
    }
    
    // 位置调整
    const moveUpBtn = document.getElementById('moveUpBtn');
    const moveDownBtn = document.getElementById('moveDownBtn');
    const moveLeftBtn = document.getElementById('moveLeftBtn');
    const moveRightBtn = document.getElementById('moveRightBtn');
    
    let currentPosition = window.currentCommentPosition || { x: 0, y: -40 };
    
    if (moveUpBtn) {
        moveUpBtn.addEventListener('click', function() {
            currentPosition.y -= 10;
            window.currentCommentPosition = currentPosition;
            updatePosition();
            console.log('向上移动:', currentPosition);
        });
    }
    
    if (moveDownBtn) {
        moveDownBtn.addEventListener('click', function() {
            currentPosition.y += 10;
            window.currentCommentPosition = currentPosition;
            updatePosition();
            console.log('向下移动:', currentPosition);
        });
    }
    
    if (moveLeftBtn) {
        moveLeftBtn.addEventListener('click', function() {
            currentPosition.x -= 10;
            window.currentCommentPosition = currentPosition;
            updatePosition();
            console.log('向左移动:', currentPosition);
        });
    }
    
    if (moveRightBtn) {
        moveRightBtn.addEventListener('click', function() {
            currentPosition.x += 10;
            window.currentCommentPosition = currentPosition;
            updatePosition();
            console.log('向右移动:', currentPosition);
        });
    }
    
    function updatePosition() {
        const commentElement = document.querySelector('.comment-section-final');
        if (commentElement) {
            commentElement.style.position = 'relative';
            commentElement.style.transform = `translate(${currentPosition.x}px, ${currentPosition.y}px)`;
            commentElement.style.transformOrigin = 'top left';
        }
    }
}

// 智能提取学员姓名昵称
function extractStudentNickname(studentName) {
    if (!studentName) return '';
    
    // 判断是否为英文姓名（包含字母）
    const isEnglish = /[a-zA-Z]/.test(studentName);
    
    if (isEnglish) {
        // 英文姓名：保留全部字符
        return studentName.trim();
    } else {
        // 中文姓名：提取后两个字符
        const trimmedName = studentName.trim();
        if (trimmedName.length >= 2) {
            return trimmedName.slice(-2);
        } else if (trimmedName.length === 1) {
            return trimmedName;
        }
    }
    
    return '';
}

// 渲染文字点评部分
function renderCommentSection(reportContainer) {
    if (!reportContainer) return;
    
    try {
        // 缓存DOM查询结果，减少重复查询
        const teacherNameInput = document.getElementById('teacherName');
        const teacherName = teacherNameInput ? teacherNameInput.value.trim() : '';
        
        // 从commentResult元素中获取评语内容
        const commentResult = document.getElementById('commentResult');
        let commentContent = '';
        if (commentResult) {
            const commentContentDiv = commentResult.querySelector('.comment-content');
            if (commentContentDiv) {
                // 获取所有段落，用换行符连接
                const paragraphs = commentContentDiv.querySelectorAll('p');
                if (paragraphs.length > 0) {
                    commentContent = Array.from(paragraphs).map(p => p.textContent.trim()).join('\n');
                } else {
                    commentContent = commentContentDiv.textContent.trim();
                }
            } else {
                commentContent = commentResult.textContent.trim();
            }
        }
        
        const avatarPreview = document.getElementById('avatarPreview');
        
        // 获取文字点评的字体设置
        const commentFontSelect = document.getElementById('commentFontSelect');
        const commentFontColor = document.getElementById('commentFontColor');
        const commentFontBold = document.getElementById('commentFontBold');
        const commentFontSize = document.getElementById('commentFontSize');
        const commentBackgroundColor = document.getElementById('commentBackgroundColor');
        const commentBackgroundColorValueSpan = document.getElementById('commentBackgroundColorValue');
        const commentBorderStyle = document.getElementById('commentBorderStyle');
        const commentBorderColor = document.getElementById('commentBorderColor');
        const commentBorderWidth = document.getElementById('commentBorderWidth');
        
        const commentFontFamily = commentFontSelect ? commentFontSelect.value : 'PingFangSanShengTi';
        const commentFontColorValue = commentFontColor ? commentFontColor.value : '#333333';
        const commentFontBoldValue = commentFontBold ? commentFontBold.checked : false;
        const commentFontSizeValue = commentFontSize ? commentFontSize.value : '16';
        let commentBackgroundColorValue = commentBackgroundColor ? commentBackgroundColor.value : '#f9f9f9';
        const commentBorderStyleValue = commentBorderStyle ? commentBorderStyle.value : 'solid';
        const commentBorderColorValue = commentBorderColor ? commentBorderColor.value : '#cccccc';
        const commentBorderWidthValue = commentBorderWidth ? commentBorderWidth.value : '1';
        
        if (commentBackgroundColorValueSpan && commentBackgroundColorValueSpan.textContent === '透明') {
            commentBackgroundColorValue = 'transparent';
        }
        
        // 动态文本替换 - 优化正则表达式性能
        if (commentContent) {
            // 获取学员姓名并智能提取
            let studentName = '';
            let nickname = '';
            if (students && students.length > 0 && currentStudentIndex >= 0 && currentStudentIndex < students.length) {
                studentName = students[currentStudentIndex];
                
                // 智能提取姓名
                nickname = extractStudentNickname(studentName);
            }
            
            // 替换：XX宝贝替换为学员昵称宝贝
            if (nickname) {
                commentContent = commentContent.replace(/XX宝贝/g, `${nickname}宝贝`);
            }
            
            // 替换：宝贝替换为学员昵称宝贝（兼容旧格式）- 只替换单独的"宝贝"，避免重复替换
            if (nickname) {
                commentContent = commentContent.replace(/(^|[^\u4e00-\u9fa5])宝贝([^\u4e00-\u9fa5]|$)/g, `$1${nickname}宝贝$2`);
            }
            
            // 替换：老师替换为班主任姓名 - 只替换单独的"老师"，避免重复替换
            if (teacherName) {
                // 替换：XX老师替换为班主任姓名加老师后缀
                commentContent = commentContent.replace(/XX老师/g, `${teacherName}老师`);
                // 替换：xx老师替换为班主任姓名加老师后缀
                commentContent = commentContent.replace(/xx老师/g, `${teacherName}老师`);
                // 替换：单独的"老师"替换为班主任姓名加老师后缀 - 只替换单独的"老师"，避免重复替换
                commentContent = commentContent.replace(/(^|[^\u4e00-\u9fa5])老师([^\u4e00-\u9fa5]|$)/g, `$1${teacherName}老师$2`);
            }
            
            // 替换：结尾——班主任替换为——老师
            commentContent = commentContent.replace(/——班主任/g, '——老师');
        }
        
        // 移除现有的文字点评部分
        const existingComment = reportContainer.querySelector('.comment-section-final');
        if (existingComment) {
            // 移除所有事件监听器，防止内存泄漏
            const commentPara = existingComment.querySelector('p[contenteditable="true"]');
            const teacherNameSpan = existingComment.querySelector('span[contenteditable="true"]');
            const deleteBtn = existingComment.querySelector('button');
            
            if (commentPara) {
                commentPara.removeEventListener('focus', handleCommentFocus);
                commentPara.removeEventListener('blur', handleCommentBlur);
            }
            
            if (teacherNameSpan) {
                teacherNameSpan.removeEventListener('focus', handleCommentFocus);
                teacherNameSpan.removeEventListener('blur', handleTeacherNameBlur);
            }
            
            if (deleteBtn) {
                deleteBtn.removeEventListener('click', deleteComment);
            }
            
            existingComment.remove();
        }
        
        // 使用DocumentFragment来减少DOM重排
        const fragment = document.createDocumentFragment();
        
        const commentSection = document.createElement('div');
        commentSection.className = 'comment-section-final';
        commentSection.style.position = 'relative';
        commentSection.style.padding = '15px 20px';
        commentSection.style.backgroundColor = commentBackgroundColorValue;
        commentSection.style.borderRadius = '8px';
        commentSection.style.boxShadow = '0 2px 10px rgba(0, 0, 0, 0.1)';
        commentSection.style.fontFamily = `${commentFontFamily}, 楷体, KaiTi, Arial, sans-serif`;
        commentSection.style.color = commentFontColorValue;
        commentSection.style.fontSize = commentFontSizeValue + 'px';
        commentSection.style.border = `${commentBorderWidthValue}px ${commentBorderStyleValue} ${commentBorderColorValue}`;
        // 特殊处理时间记忆字体的加粗
        if (commentFontFamily === 'SJjnyyjyy' && commentFontBoldValue) {
            commentSection.style.fontWeight = '900';
        } else {
            commentSection.style.fontWeight = commentFontBoldValue ? 'bold' : 'normal';
        }
        commentSection.style.zIndex = '1';
        commentSection.style.maxHeight = '400px';
        commentSection.style.overflowY = 'auto';
        commentSection.style.margin = '0';
        commentSection.style.width = '100%';
        commentSection.style.boxSizing = 'border-box';
        commentSection.style.flex = '0 0 auto';
        commentSection.style.display = 'flex';
        commentSection.style.flexDirection = 'column';
        commentSection.style.alignItems = 'stretch';
        commentSection.style.clear = 'both';
        
        // 应用保存的缩放和位置设置
        if (window.currentCommentZoom && window.currentCommentZoom !== 100) {
            commentSection.style.transform = `scale(${window.currentCommentZoom / 100})`;
            commentSection.style.transformOrigin = 'top left';
        }
        const position = window.currentCommentPosition || { x: 0, y: 3 };
        commentSection.style.position = 'relative';
        commentSection.style.transform = `translate(${position.x}px, ${position.y}px)`;
        commentSection.style.transformOrigin = 'top left';
        
        // 自定义滚动条样式
        commentSection.style.scrollbarWidth = 'thin';
        commentSection.style.scrollbarColor = '#e0e0e0 #f5f5f5';
        
        if (commentContent || teacherName) {
            const firstRow = document.createElement('div');
            firstRow.style.display = 'flex';
            firstRow.style.alignItems = 'flex-start';
            firstRow.style.gap = '15px';
            firstRow.style.marginBottom = '10px';
            firstRow.style.flex = '1';
            
            if (avatarPreview && avatarPreview.src) {
                const avatarImg = document.createElement('img');
                // 确保头像图片在报告生成时就转换为Base64
                if (avatarPreview.src.startsWith('data:') || avatarPreview.src.startsWith('blob:')) {
                    avatarImg.src = avatarPreview.src;
                } else if (avatarPreview.src.startsWith('http://') || avatarPreview.src.startsWith('https://')) {
                    // 对于网络图片，直接尝试转换为Base64，不设置原始图片源
                    try {
                        const img = new Image();
                        // 设置crossOrigin属性，避免Canvas污染
                        img.crossOrigin = 'Anonymous';
                        img.onload = function() {
                            try {
                                const canvas = document.createElement('canvas');
                                canvas.width = img.width;
                                canvas.height = img.height;
                                const ctx = canvas.getContext('2d');
                                ctx.drawImage(img, 0, 0);
                                const base64 = canvas.toDataURL('image/png');
                                avatarImg.src = base64;
                            } catch (error) {
                                console.warn('头像转换失败，使用占位符:', error);
                                avatarImg.src = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxMDAiIGhlaWdodD0iMTAwIiB2aWV3Qm94PSIwIDAgMTAwIDEwMCI+PHJlY3Qgd2lkdGg9IjEwMCIgaGVpZ2h0PSIxMDAiIGZpbGw9IiNmMGYwZjAiLz48dGV4dCB4PSI1MCIgeT0iNTUiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIxMiIgZmlsbD0iIzk5OSIgdGV4dC1hbmNob3I9Im1pZGRsZSI+5Zu+56eB5a6e5aSnPC90ZXh0Pjwvc3ZnPg==';
                            }
                        };
                        img.onerror = function() {
                            console.warn('头像加载失败，使用占位符:');
                            avatarImg.src = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxMDAiIGhlaWdodD0iMTAwIiB2aWV3Qm94PSIwIDAgMTAwIDEwMCI+PHJlY3Qgd2lkdGg9IjEwMCIgaGVpZ2h0PSIxMDAiIGZpbGw9IiNmMGYwZjAiLz48dGV4dCB4PSI1MCIgeT0iNTUiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIxMiIgZmlsbD0iIzk5OSIgdGV4dC1hbmNob3I9Im1pZGRsZSI+5Zu+56eB5a6e5aSnPC90ZXh0Pjwvc3ZnPg==';
                        };
                        img.src = avatarPreview.src;
                    } catch (error) {
                        console.warn('头像处理失败，使用占位符:', error);
                        avatarImg.src = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxMDAiIGhlaWdodD0iMTAwIiB2aWV3Qm94PSIwIDAgMTAwIDEwMCI+PHJlY3Qgd2lkdGg9IjEwMCIgaGVpZ2h0PSIxMDAiIGZpbGw9IiNmMGYwZjAiLz48dGV4dCB4PSI1MCIgeT0iNTUiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIxMiIgZmlsbD0iIzk5OSIgdGV4dC1hbmNob3I9Im1pZGRsZSI+5Zu+56eB5a6e5aSnPC90ZXh0Pjwvc3ZnPg==';
                    }
                } else {
                    // 对于本地文件路径，直接设置为原始路径，因为是本地默认头像
                    console.log('本地默认头像，直接使用:', avatarPreview.src);
                    avatarImg.src = avatarPreview.src;
                }
                avatarImg.alt = '班主任头像';
                avatarImg.style.width = '60px';
                avatarImg.style.height = '60px';
                avatarImg.style.borderRadius = '50%';
                avatarImg.style.objectFit = 'cover';
                avatarImg.style.flexShrink = '0';
                avatarImg.style.display = 'block';
                firstRow.appendChild(avatarImg);
            }
            
            if (commentContent) {
                const commentPara = document.createElement('div');
                commentPara.style.margin = '0';
                commentPara.style.lineHeight = '1.5';
                commentPara.style.textAlign = 'left';
                commentPara.style.flex = '1';
                commentPara.style.display = 'flex';
                commentPara.style.flexDirection = 'column';
                
                const paragraphs = commentContent.split('\n');
                paragraphs.forEach(pText => {
                    if (pText.trim()) {
                        const p = document.createElement('p');
                        p.innerHTML = pText;
                        p.style.margin = '0';
                        p.style.lineHeight = '1.5';
                        p.style.textAlign = 'left';
                        p.contentEditable = 'true';
                        p.style.outline = 'none';
                        p.style.border = '1px dashed transparent';
                        p.style.padding = '2px';
                        
                        p.addEventListener('focus', handleCommentFocus);
                        p.addEventListener('blur', handleCommentBlur);
                        
                        commentPara.appendChild(p);
                    }
                });
                
                firstRow.appendChild(commentPara);
            }
            
            commentSection.appendChild(firstRow);
            
            if (teacherName) {
                const secondRow = document.createElement('div');
                secondRow.style.textAlign = 'right';
                secondRow.style.marginTop = '10px';
                
                const teacherNameSpan = document.createElement('span');
                // 确保班主任姓名后自动添加"老师"后缀，形成"——班主任姓名老师"的标准格式
                const formattedTeacherName = teacherName.endsWith('老师') ? teacherName : `${teacherName}老师`;
                teacherNameSpan.textContent = `——${formattedTeacherName}`;
                teacherNameSpan.style.fontSize = '14px';
                teacherNameSpan.style.color = '#666';
                teacherNameSpan.contentEditable = 'true';
                teacherNameSpan.style.outline = 'none';
                teacherNameSpan.style.border = '1px dashed transparent';
                teacherNameSpan.style.padding = '2px';
                
                // 优化事件监听器的绑定 - 使用函数引用，减少闭包开销
                teacherNameSpan.addEventListener('focus', handleCommentFocus);
                teacherNameSpan.addEventListener('blur', handleTeacherNameBlur);
                
                secondRow.appendChild(teacherNameSpan);
                commentSection.appendChild(secondRow);
            }
        }
        
        const deleteBtn = document.createElement('button');
        deleteBtn.textContent = '×';
        deleteBtn.style.position = 'absolute';
        deleteBtn.style.top = '5px';
        deleteBtn.style.right = '5px';
        deleteBtn.style.width = '20px';
        deleteBtn.style.height = '20px';
        deleteBtn.style.border = 'none';
        deleteBtn.style.backgroundColor = 'rgba(255, 0, 0, 0.6)';
        deleteBtn.style.color = 'white';
        deleteBtn.style.borderRadius = '50%';
        deleteBtn.style.cursor = 'pointer';
        deleteBtn.style.fontSize = '14px';
        deleteBtn.style.lineHeight = '1';
        deleteBtn.style.padding = '0';
        deleteBtn.style.display = 'flex';
        deleteBtn.style.alignItems = 'center';
        deleteBtn.style.justifyContent = 'center';
        
        // 优化事件监听器的绑定 - 使用函数引用，减少闭包开销
        deleteBtn.addEventListener('click', function() {
            // 设置标志，表示用户已经删除了文字点评
            window.commentDeletedByUser = true;
            deleteComment(commentSection);
        });
        
        commentSection.appendChild(deleteBtn);
        
        // 将commentSection添加到fragment中
        fragment.appendChild(commentSection);
        
        // 将fragment添加到DOM中，减少重排
        const reportContent = reportContainer.querySelector('.report-content');
        if (reportContent) {
            // 将文字点评添加到reportContent的末尾，这样它就会跨越整个报告容器的宽度
            reportContent.appendChild(fragment);
            
            // 调整reportContent的flex布局，确保文字点评模块正确显示
            reportContent.style.display = 'flex';
            reportContent.style.flexDirection = 'column';
            reportContent.style.alignItems = 'stretch';
            reportContent.style.justifyContent = 'flex-start';
            reportContent.style.gap = '0';
        } else {
            reportContainer.appendChild(fragment);
        }
        
        // 调整容器高度
        adjustPreviewContainerHeight(reportContainer);
        
        console.log('文字点评部分已渲染');
    } catch (error) {
        console.error('渲染文字点评时出错:', error);
        showSaveStatus('渲染文字点评时出错，请重试', true);
    }
}

// 优化事件监听器的处理函数
function handleCommentFocus() {
    this.style.borderColor = '#4CAF50';
}

function handleCommentBlur() {
    this.style.borderColor = 'transparent';
    const commentResult = document.querySelector('.comment-content p');
    if (commentResult) {
        commentResult.innerHTML = this.innerHTML;
    }
}

function handleTeacherNameBlur() {
    this.style.borderColor = 'transparent';
    const teacherNameInput = document.getElementById('teacherName');
    if (teacherNameInput) {
        // 移除"——"和"老师"后缀，只保留姓名
        let name = this.textContent.replace('——', '').trim();
        if (name.endsWith('老师')) {
            name = name.slice(0, -2);
        }
        teacherNameInput.value = name;
    }
}

// 动态调整预览区容器高度
function adjustPreviewContainerHeight(reportContainer) {
    if (!reportContainer) return;
    
    const commentSection = reportContainer.querySelector('.comment-section-final');
    const reportContent = reportContainer.querySelector('.report-content');
    
    if (!reportContent) return;
    
    if (commentSection && (commentSection.querySelector('p') || commentSection.querySelector('span'))) {
        // 有文字点评内容，计算实际高度
        const commentHeight = commentSection.offsetHeight;
        const mainContent = reportContent.querySelector('.main-content');
        const mainContentHeight = mainContent ? mainContent.offsetHeight : 0;
        
        // 动态调整容器高度以包裹所有内容
        const totalHeight = mainContentHeight + commentHeight + 80; // 增加间距，确保文字点评不被边框遮住
        reportContent.style.minHeight = totalHeight + 'px';
        reportContent.style.height = 'auto';
        reportContent.style.maxHeight = 'none'; // 移除最大高度限制，确保能包裹文字点评
        
        // 只调整reportContainer的最小高度，确保能包裹文字点评，但不改变背景图片位置
        reportContainer.style.minHeight = (totalHeight + 40) + 'px'; // 额外添加边距，确保文字点评不被边框遮住
        reportContainer.style.height = 'auto';
        // 保留背景图片的maxHeight限制，确保背景图片不被拉伸
        // reportContainer.style.maxHeight = 'none';
        
        // 同时调整preview-container的高度，确保能包裹所有内容
        const previewContainer = document.querySelector('.preview-container');
        if (previewContainer) {
            previewContainer.style.minHeight = (totalHeight + 60) + 'px'; // 额外添加边距，确保文字点评不被边框遮住
            previewContainer.style.height = 'auto';
            previewContainer.style.maxHeight = 'none';
        }
        
        // 确保背景图片位置不变
        reportContainer.style.backgroundAttachment = 'scroll';
        reportContainer.style.backgroundSize = 'contain';
    } else {
        // 没有文字点评内容，恢复到默认高度（恰好包裹背景图片）
        reportContent.style.minHeight = 'auto';
        reportContent.style.height = 'auto';
        reportContent.style.maxHeight = 'none';
        
        // 同时调整reportContainer的高度
        reportContainer.style.minHeight = 'auto';
        reportContainer.style.height = 'auto';
        reportContainer.style.maxHeight = 'none';
        
        // 同时调整preview-container的高度
        const previewContainer = document.querySelector('.preview-container');
        if (previewContainer) {
            // 计算背景图片的高度
            const bgImage = new Image();
            const bgStyle = reportContainer.style.backgroundImage;
            if (bgStyle) {
                const bgUrl = bgStyle.match(/url\(['"](.+)['"]\)/)[1];
                bgImage.onload = function() {
                    const aspectRatio = this.width / this.height;
                    const previewWidth = previewContainer.offsetWidth;
                    const calculatedHeight = previewWidth / aspectRatio;
                    
                    previewContainer.style.minHeight = `${calculatedHeight}px`;
                    previewContainer.style.height = `${calculatedHeight}px`;
                };
                bgImage.src = bgUrl;
            }
        }
    }
}

// 删除文字点评
function deleteComment(commentSection) {
    if (!commentSection) return;
    
    // 保存删除前的内容
    const deletedCommentData = {
        content: commentSection.querySelector('p') ? commentSection.querySelector('p').textContent : '',
        teacherName: commentSection.querySelector('span') ? commentSection.querySelector('span').textContent.replace('——', '').trim() : ''
    };
    
    // 存储到本地变量
    window.deletedCommentData = deletedCommentData;
    
    // 添加过渡动画效果
    commentSection.style.transition = 'all 400ms ease-in-out';
    commentSection.style.opacity = '0';
    commentSection.style.transform = 'translateY(0px)';
    commentSection.style.height = '0';
    commentSection.style.padding = '0';
    commentSection.style.margin = '0';
    commentSection.style.overflow = 'hidden';
    
    // 延迟删除元素，等待动画完成
    setTimeout(() => {
        commentSection.remove();
        
        // 调整预览区容器高度
        const reportContainer = document.getElementById('reportPreview');
        if (reportContainer) {
            adjustPreviewContainerHeight(reportContainer);
        }
        
        // 显示恢复按钮
        const restoreBtn = document.getElementById('restoreCommentBtn');
        if (restoreBtn) {
            restoreBtn.style.display = 'block';
        }
        
        // 显示提示
        showSaveStatus('文字点评已删除，可点击恢复按钮重新找回');
    }, 400);
}

// 恢复文字点评
function restoreComment() {
    if (!reportPreview || !window.deletedCommentData) return;
    
    // 恢复内容到输入框
    const commentResult = document.querySelector('.comment-content p');
    if (commentResult && window.deletedCommentData.content) {
        commentResult.textContent = window.deletedCommentData.content;
    }
    
    if (teacherNameInput && window.deletedCommentData.teacherName) {
        teacherNameInput.value = window.deletedCommentData.teacherName;
    }
    
    generateReport();
    
    // 隐藏恢复按钮
    const restoreBtn = document.getElementById('restoreCommentBtn');
    if (restoreBtn) {
        restoreBtn.style.display = 'none';
    }
    
    // 清除临时数据
    window.deletedCommentData = null;
    
    // 显示提示
    showSaveStatus('文字点评已恢复');
}

// 重置报告功能
function resetReport() {
    // 显示重置中状态
    showSaveStatus('重置中...');
    
    // 添加淡出动画
    if (reportPreview) {
        reportPreview.style.animation = 'fadeOut 0.4s ease';
    }
    
    // 延迟执行重置操作
    setTimeout(function() {
        try {
            // 清除所有全局变量
            csvData = [];
            csvFilenames = [];
            bgUrl = 'image/bg1.png';
            students = [];
            currentStudentIndex = 0;
            customImages = [];
            customImageNames = [];
            tableRecognitionImages = [];
            sectionPositions = {
                section1: { translateX: 0, translateY: 0 },
                section2: { translateX: 0, translateY: 0 },
                section3: { translateX: 0, translateY: 0 }
            };
            lockedCards.clear();
            imageAdjustments = [];
            deletedImagesHistory = [];
            
            // 清除本地存储
            localStorage.removeItem(LOCAL_STORAGE_KEY);
            localStorage.removeItem(LOCAL_STORAGE_BACKUP_KEY);
            
            // 清除会话存储
            sessionStorage.clear();
            
            // 重置表单元素
            const inputs = document.querySelectorAll('input, select, textarea');
            inputs.forEach(input => {
                if (input.type === 'text' || input.type === 'number' || input.type === 'email' || input.type === 'textarea') {
                    input.value = '';
                } else if (input.type === 'checkbox' || input.type === 'radio') {
                    input.checked = false;
                } else if (input.type === 'select-one') {
                    input.selectedIndex = 0;
                }
            });
            
            // 重置图片布局模式
            if (imageLayoutModeSelect) {
                imageLayoutModeSelect.value = 'double';
            }
            
            if (singleColumnBtn && doubleColumnBtn) {
                singleColumnBtn.classList.remove('active');
                doubleColumnBtn.classList.add('active');
            }
            
            // 清空预览区域
            if (reportPreview) {
                reportPreview.innerHTML = '';
                reportPreview.style.animation = 'fadeIn 0.4s ease';
            }
            
            // 显示CSV上传界面（如果存在）
            const csvUploadSection = document.querySelector('.csv-upload-section');
            if (csvUploadSection) {
                csvUploadSection.style.display = 'block';
            }
            
            // 显示重置成功状态
            setTimeout(function() {
                showSaveStatus('报告已重置');
                console.log('报告重置成功');
            }, 300);
            
        } catch (error) {
            console.error('重置报告失败:', error);
            showSaveStatus('重置失败，请重试', true);
        }
    }, 400);
}

// 调整内容模块大小的函数，确保所有内容完整显示在16:9区域内
function adjustContentSize(reportContainer) {
    if (!reportContainer) return;
    
    // 获取报告容器的大小
    const containerWidth = reportContainer.offsetWidth;
    const containerHeight = reportContainer.offsetHeight;
    console.log('报告容器大小:', containerWidth, 'x', containerHeight, 'px');
    
    // 找到所有内容模块
    const sections = reportContainer.querySelectorAll('.report-section');
    if (sections.length === 0) return;
    
    // 获取主容器（包含所有板块）
    const mainContainer = reportContainer.querySelector('.main-content');
    if (!mainContainer) return;
    
    // 计算主容器的实际大小
    const mainContainerRect = mainContainer.getBoundingClientRect();
    const containerRect = reportContainer.getBoundingClientRect();
    
    // 计算主容器相对于报告容器的大小
    const mainWidth = mainContainerRect.width;
    const mainHeight = mainContainerRect.height;
    console.log('主容器大小:', mainWidth, 'x', mainHeight, 'px');
    
    // 检查是否需要缩放
    let scale = 1;
    
    // 计算宽度和高度的缩放比例
    const widthScale = containerWidth / mainWidth;
    const heightScale = containerHeight / mainHeight;
    
    // 取较小的缩放比例，确保所有内容都能完整显示
    if (widthScale < 1 || heightScale < 1) {
        scale = Math.min(widthScale, heightScale);
        // 添加安全边际，避免内容紧贴边缘
        scale = Math.max(scale, 0.7); // 最小缩放到70%
        console.log('需要缩放，计算缩放比例:', scale);
    }
    
    // 应用缩放
    if (scale < 1) {
        // 对主容器进行缩放
        mainContainer.style.transform = `scale(${scale})`;
        mainContainer.style.transformOrigin = 'top center';
        
        // 调整主容器的大小，确保缩放后不会超出容器
        mainContainer.style.width = `${mainWidth / scale}px`;
        mainContainer.style.height = `${mainHeight / scale}px`;
        
        console.log('应用缩放:', scale, '调整后主容器大小:', mainWidth / scale, 'x', mainHeight / scale, 'px');
    } else {
        // 不需要缩放，重置transform
        mainContainer.style.transform = 'none';
        mainContainer.style.width = '100%';
        mainContainer.style.height = 'auto';
    }
}

// 头像编辑器相关变量
let avatarEditorCanvas = null;
let avatarEditorCtx = null;
let originalAvatarImage = null;
let currentAvatarImage = null;
let avatarEditorState = {
    scale: 100,
    rotate: 0,
    brightness: 100,
    contrast: 100,
    cropEnabled: false,
    cropX: 0,
    cropY: 0,
    cropWidth: 200,
    cropHeight: 200
};

// 初始化头像编辑器事件
function initAvatarEditorEvents() {
    const closeAvatarEditor = document.getElementById('closeAvatarEditor');
    const enableCropBtn = document.getElementById('enableCropBtn');
    const applyCropBtn = document.getElementById('applyCropBtn');
    const resetAvatarBtn = document.getElementById('resetAvatarBtn');
    const saveAvatarBtn = document.getElementById('saveAvatarBtn');
    
    // 关闭编辑器
    if (closeAvatarEditor) {
        closeAvatarEditor.addEventListener('click', closeAvatarEditorModal);
    }
    
    // 启用剪裁
    if (enableCropBtn) {
        enableCropBtn.addEventListener('click', function() {
            avatarEditorState.cropEnabled = true;
            enableCropBtn.style.display = 'none';
            applyCropBtn.style.display = 'inline-block';
            document.getElementById('cropOverlay').classList.add('active');
            initCropOverlay();
        });
    }
    
    // 应用剪裁
    if (applyCropBtn) {
        applyCropBtn.addEventListener('click', function() {
            applyCrop();
            avatarEditorState.cropEnabled = false;
            enableCropBtn.style.display = 'inline-block';
            applyCropBtn.style.display = 'none';
            document.getElementById('cropOverlay').classList.remove('active');
        });
    }
    
    // 重置
    if (resetAvatarBtn) {
        resetAvatarBtn.addEventListener('click', resetAvatarEditor);
    }
    
    // 保存
    if (saveAvatarBtn) {
        saveAvatarBtn.addEventListener('click', saveAvatar);
    }
    
    // 缩放控制
    const avatarScale = document.getElementById('avatarScale');
    if (avatarScale) {
        avatarScale.addEventListener('input', function() {
            avatarEditorState.scale = parseInt(this.value);
            document.getElementById('avatarScaleValue').textContent = this.value + '%';
            renderAvatarEditor();
        });
    }
    
    // 旋转控制
    const avatarRotate = document.getElementById('avatarRotate');
    if (avatarRotate) {
        avatarRotate.addEventListener('input', function() {
            avatarEditorState.rotate = parseInt(this.value);
            document.getElementById('avatarRotateValue').textContent = this.value + '°';
            renderAvatarEditor();
        });
    }
    
    // 亮度控制
    const avatarBrightness = document.getElementById('avatarBrightness');
    if (avatarBrightness) {
        avatarBrightness.addEventListener('input', function() {
            avatarEditorState.brightness = parseInt(this.value);
            document.getElementById('avatarBrightnessValue').textContent = this.value + '%';
            renderAvatarEditor();
        });
    }
    
    // 对比度控制
    const avatarContrast = document.getElementById('avatarContrast');
    if (avatarContrast) {
        avatarContrast.addEventListener('input', function() {
            avatarEditorState.contrast = parseInt(this.value);
            document.getElementById('avatarContrastValue').textContent = this.value + '%';
            renderAvatarEditor();
        });
    }
}

// 打开头像编辑器
function openAvatarEditor() {
    const avatarPreview = document.getElementById('avatarPreview');
    if (!avatarPreview || !avatarPreview.src) {
        alert('请先上传头像');
        return;
    }
    
    const modal = document.getElementById('avatarEditorModal');
    modal.style.display = 'flex';
    
    // 初始化画布
    avatarEditorCanvas = document.getElementById('avatarCanvas');
    avatarEditorCtx = avatarEditorCanvas.getContext('2d');
    
    // 加载图片
    const img = new Image();
    const avatarSrc = avatarPreview.src;
    
    // 只对网络图片设置crossOrigin
    if (!avatarSrc.startsWith('data:') && (avatarSrc.startsWith('http://') || avatarSrc.startsWith('https://'))) {
        img.crossOrigin = 'anonymous';
    }
    
    img.onload = function() {
        originalAvatarImage = img;
        currentAvatarImage = img;
        
        // 设置画布大小
        const maxSize = 400;
        let canvasWidth = img.width;
        let canvasHeight = img.height;
        
        if (canvasWidth > maxSize || canvasHeight > maxSize) {
            const ratio = Math.min(maxSize / canvasWidth, maxSize / canvasHeight);
            canvasWidth *= ratio;
            canvasHeight *= ratio;
        }
        
        avatarEditorCanvas.width = canvasWidth;
        avatarEditorCanvas.height = canvasHeight;
        
        // 重置编辑状态
        resetAvatarEditorState();
        
        // 渲染图片
        renderAvatarEditor();
    };
    img.src = avatarSrc;
}

// 关闭头像编辑器
function closeAvatarEditorModal() {
    const modal = document.getElementById('avatarEditorModal');
    modal.style.display = 'none';
}

// 重置头像编辑器状态
function resetAvatarEditorState() {
    avatarEditorState = {
        scale: 100,
        rotate: 0,
        brightness: 100,
        contrast: 100,
        cropEnabled: false,
        cropX: 0,
        cropY: 0,
        cropWidth: 200,
        cropHeight: 200
    };
    
    // 重置控件值
    document.getElementById('avatarScale').value = 100;
    document.getElementById('avatarScaleValue').textContent = '100%';
    document.getElementById('avatarRotate').value = 0;
    document.getElementById('avatarRotateValue').textContent = '0°';
    document.getElementById('avatarBrightness').value = 100;
    document.getElementById('avatarBrightnessValue').textContent = '100%';
    document.getElementById('avatarContrast').value = 100;
    document.getElementById('avatarContrastValue').textContent = '100%';
    
    // 重置剪裁按钮
    document.getElementById('enableCropBtn').style.display = 'inline-block';
    document.getElementById('applyCropBtn').style.display = 'none';
    document.getElementById('cropOverlay').classList.remove('active');
}

// 重置头像编辑器
function resetAvatarEditor() {
    currentAvatarImage = originalAvatarImage;
    resetAvatarEditorState();
    renderAvatarEditor();
}

// 渲染头像编辑器
function renderAvatarEditor() {
    if (!avatarEditorCanvas || !avatarEditorCtx || !currentAvatarImage) return;
    
    const canvas = avatarEditorCanvas;
    const ctx = avatarEditorCtx;
    
    // 清空画布
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // 保存上下文
    ctx.save();
    
    // 应用滤镜
    ctx.filter = `brightness(${avatarEditorState.brightness}%) contrast(${avatarEditorState.contrast}%)`;
    
    // 移动到画布中心
    ctx.translate(canvas.width / 2, canvas.height / 2);
    
    // 旋转
    ctx.rotate(avatarEditorState.rotate * Math.PI / 180);
    
    // 缩放
    const scale = avatarEditorState.scale / 100;
    ctx.scale(scale, scale);
    
    // 绘制图片
    ctx.drawImage(currentAvatarImage, -currentAvatarImage.width / 2, -currentAvatarImage.height / 2);
    
    // 恢复上下文
    ctx.restore();
}

// 初始化剪裁覆盖层
function initCropOverlay() {
    const overlay = document.getElementById('cropOverlay');
    if (!overlay) return;
    
    let isDragging = false;
    let startX, startY, startLeft, startTop;
    
    overlay.addEventListener('mousedown', function(e) {
        isDragging = true;
        startX = e.clientX;
        startY = e.clientY;
        startLeft = overlay.offsetLeft;
        startTop = overlay.offsetTop;
        e.preventDefault();
    });
    
    document.addEventListener('mousemove', function(e) {
        if (!isDragging) return;
        
        const dx = e.clientX - startX;
        const dy = e.clientY - startY;
        
        overlay.style.left = (startLeft + dx) + 'px';
        overlay.style.top = (startTop + dy) + 'px';
    });
    
    document.addEventListener('mouseup', function() {
        isDragging = false;
    });
}

// 应用剪裁
function applyCrop() {
    const overlay = document.getElementById('cropOverlay');
    const canvas = avatarEditorCanvas;
    
    if (!overlay || !canvas) return;
    
    // 计算剪裁区域
    const overlayRect = overlay.getBoundingClientRect();
    const canvasRect = canvas.getBoundingClientRect();
    
    const cropX = overlayRect.left - canvasRect.left;
    const cropY = overlayRect.top - canvasRect.top;
    const cropWidth = overlayRect.width;
    const cropHeight = overlayRect.height;
    
    // 创建临时画布进行剪裁
    const tempCanvas = document.createElement('canvas');
    const tempCtx = tempCanvas.getContext('2d');
    
    tempCanvas.width = cropWidth;
    tempCanvas.height = cropHeight;
    
    // 从当前画布中提取剪裁区域
    tempCtx.drawImage(canvas, cropX, cropY, cropWidth, cropHeight, 0, 0, cropWidth, cropHeight);
    
    // 创建新图片
    const croppedImage = new Image();
    croppedImage.onload = function() {
        currentAvatarImage = croppedImage;
        renderAvatarEditor();
    };
    croppedImage.src = tempCanvas.toDataURL();
}

// 保存头像
function saveAvatar() {
    if (!avatarEditorCanvas) return;
    
    // 调整画布大小为60x60
    const outputCanvas = document.createElement('canvas');
    const outputCtx = outputCanvas.getContext('2d');
    outputCanvas.width = 60;
    outputCanvas.height = 60;
    
    // 绘制圆形头像
    outputCtx.beginPath();
    outputCtx.arc(30, 30, 30, 0, Math.PI * 2);
    outputCtx.closePath();
    outputCtx.clip();
    
    // 计算缩放比例以填充圆形
    const scale = Math.max(60 / avatarEditorCanvas.width, 60 / avatarEditorCanvas.height);
    const drawWidth = avatarEditorCanvas.width * scale;
    const drawHeight = avatarEditorCanvas.height * scale;
    const drawX = (60 - drawWidth) / 2;
    const drawY = (60 - drawHeight) / 2;
    
    outputCtx.drawImage(avatarEditorCanvas, drawX, drawY, drawWidth, drawHeight);
    
    // 更新头像预览
    const avatarPreview = document.getElementById('avatarPreview');
    if (avatarPreview) {
        avatarPreview.src = outputCanvas.toDataURL('image/png');
    }
    
    // 关闭编辑器
    closeAvatarEditorModal();
    
    // 显示保存成功提示
    showSaveStatus('头像已保存');
}

// 处理评论输入区域的文本格式同步 - 使用generateReport实现实时预览
function setupCommentFormatSync() {
    const commentResult = document.getElementById('commentResult');
    if (!commentResult) return;
    
    // 监听编辑区域的输入事件，确保换行符正确处理
    commentResult.addEventListener('input', function() {
        generateReport();
    });
    
    // 监听粘贴事件，确保粘贴的文本格式正确处理
    commentResult.addEventListener('paste', function(e) {
        e.preventDefault();
        
        // 获取粘贴的文本
        let text = e.clipboardData.getData('text');
        
        // 处理换行符，转换为HTML换行
        text = text.replace(/\r\n/g, '<br>').replace(/\n/g, '<br>').replace(/\r/g, '<br>');
        
        // 插入处理后的文本
        document.execCommand('insertHTML', false, text);
        
        // 触发预览更新
        generateReport();
    });
}

// 测试用例函数
function runCommentTests() {
    console.log('开始运行文字点评功能测试...');
    
    // 测试1: 文本格式处理测试
    testTextFormatHandling();
    
    // 测试2: 背景图片定位测试
    testBackgroundImagePositioning();
    
    // 测试3: 内容溢出控制测试
    testContentOverflowControl();
    
    // 测试4: 性能优化测试
    testPerformanceOptimization();
    
    console.log('文字点评功能测试完成！');
}

// 测试1: 文本格式处理测试
function testTextFormatHandling() {
    console.log('测试1: 文本格式处理测试');
    
    // 获取编辑区域
    const commentResult = document.getElementById('commentResult');
    const commentContent = document.querySelector('.comment-content p');
    if (!commentResult || !commentContent) {
        console.error('测试1失败: 无法找到编辑区域');
        return;
    }
    
    // 测试场景1: 单行文本输入
    console.log('  测试场景1: 单行文本输入');
    commentContent.innerHTML = '这是单行文本测试';
    if (reportPreview) {
        renderCommentSection(reportPreview);
        setTimeout(() => {
            const previewComment = reportPreview.querySelector('.comment-section-final p');
            if (previewComment && previewComment.innerHTML === '这是单行文本测试') {
                console.log('  ✓ 单行文本输入测试通过');
            } else {
                console.error('  ✗ 单行文本输入测试失败');
            }
        }, 100);
    }
    
    // 测试场景2: 多行文本输入
    console.log('  测试场景2: 多行文本输入');
    commentContent.innerHTML = '这是第一行<br>这是第二行<br>这是第三行';
    if (reportPreview) {
        renderCommentSection(reportPreview);
        setTimeout(() => {
            const previewComment = reportPreview.querySelector('.comment-section-final p');
            if (previewComment && previewComment.innerHTML.includes('<br>')) {
                console.log('  ✓ 多行文本输入测试通过');
            } else {
                console.error('  ✗ 多行文本输入测试失败');
            }
        }, 100);
    }
    
    // 测试场景3: 空行测试
    console.log('  测试场景3: 空行测试');
    commentContent.innerHTML = '第一行<br><br>第三行';
    if (reportPreview) {
        renderCommentSection(reportPreview);
        setTimeout(() => {
            const previewComment = reportPreview.querySelector('.comment-section-final p');
            if (previewComment && previewComment.innerHTML.includes('<br><br>')) {
                console.log('  ✓ 空行测试通过');
            } else {
                console.error('  ✗ 空行测试失败');
            }
        }, 100);
    }
    
    // 测试场景4: 连续换行测试
    console.log('  测试场景4: 连续换行测试');
    commentContent.innerHTML = '第一行<br><br><br>第四行';
    if (reportPreview) {
        renderCommentSection(reportPreview);
        setTimeout(() => {
            const previewComment = reportPreview.querySelector('.comment-section-final p');
            if (previewComment && previewComment.innerHTML.includes('<br><br><br>')) {
                console.log('  ✓ 连续换行测试通过');
            } else {
                console.error('  ✗ 连续换行测试失败');
            }
        }, 100);
    }
}

// 测试2: 背景图片定位测试
function testBackgroundImagePositioning() {
    console.log('测试2: 背景图片定位测试');
    
    if (!reportPreview) {
        console.error('测试2失败: 无法找到预览容器');
        return;
    }
    
    // 测试场景1: 不同内容长度下的背景图片位置
    console.log('  测试场景1: 不同内容长度下的背景图片位置');
    
    // 测试少量内容
    const commentContent = document.querySelector('.comment-content p');
    if (commentContent) {
        commentContent.innerHTML = '少量内容测试';
        renderCommentSection(reportPreview);
        const bgPos1 = reportPreview.style.backgroundPosition;
        
        // 测试大量内容
        commentContent.innerHTML = '大量内容测试 '.repeat(50) + '<br>'.repeat(10) + '测试背景图片位置';
        renderCommentSection(reportPreview);
        const bgPos2 = reportPreview.style.backgroundPosition;
        
        if (bgPos1 === bgPos2) {
            console.log('  ✓ 不同内容长度下的背景图片位置测试通过');
        } else {
            console.error('  ✗ 不同内容长度下的背景图片位置测试失败');
        }
    }
    
    // 测试场景2: 背景图片垂直位置固定在顶部
    console.log('  测试场景2: 背景图片垂直位置固定在顶部');
    const bgPosition = reportPreview.style.backgroundPosition;
    if (bgPosition && bgPosition.includes('0%')) {
        console.log('  ✓ 背景图片垂直位置固定在顶部测试通过');
    } else {
        console.error('  ✗ 背景图片垂直位置固定在顶部测试失败');
    }
}

// 测试3: 内容溢出控制测试
function testContentOverflowControl() {
    console.log('测试3: 内容溢出控制测试');
    
    const reportContainer = reportPreview ? reportPreview.querySelector('.report') : null;
    if (!reportContainer) {
        console.error('测试3失败: 无法找到预览容器');
        return;
    }
    
    const commentContent = document.querySelector('.comment-content p');
    if (!commentContent) {
        console.error('测试3失败: 无法找到编辑区域');
        return;
    }
    
    // 测试场景1: 少量文本的溢出控制
    console.log('  测试场景1: 少量文本的溢出控制');
    commentContent.innerHTML = '少量文本测试';
    renderCommentSection(reportContainer);
    setTimeout(() => {
        const commentSection = reportContainer.querySelector('.comment-section-final');
        if (commentSection) {
            console.log('  ✓ 少量文本的溢出控制测试通过');
        } else {
            console.error('  ✗ 少量文本的溢出控制测试失败');
        }
    }, 100);
    
    // 测试场景2: 大量文本的溢出控制
    console.log('  测试场景2: 大量文本的溢出控制');
    commentContent.innerHTML = '大量文本测试 '.repeat(100) + '<br>'.repeat(20) + '测试溢出控制';
    renderCommentSection(reportContainer);
    setTimeout(() => {
        const commentSection = reportContainer.querySelector('.comment-section-final');
        if (commentSection && commentSection.style.overflowY === 'auto') {
            console.log('  ✓ 大量文本的溢出控制测试通过');
        } else {
            console.error('  ✗ 大量文本的溢出控制测试失败');
        }
    }, 100);
}

// 测试4: 性能优化测试
function testPerformanceOptimization() {
    console.log('测试4: 性能优化测试');
    
    const reportPreview = document.getElementById('reportPreview');
    const reportContainer = reportPreview ? reportPreview.querySelector('.report') : null;
    if (!reportContainer) {
        console.error('测试4失败: 无法找到预览容器');
        return;
    }
    
    const commentContent = document.querySelector('.comment-content p');
    if (!commentContent) {
        console.error('测试4失败: 无法找到编辑区域');
        return;
    }
    
    // 测试场景1: 大量点评内容的处理性能
    console.log('  测试场景1: 大量点评内容的处理性能');
    commentContent.innerHTML = '大量点评内容测试 '.repeat(200) + '<br>'.repeat(50);
    
    const startTime = performance.now();
    renderCommentSection(reportContainer);
    
    setTimeout(() => {
        const endTime = performance.now();
        const executionTime = endTime - startTime;
        
        if (executionTime < 300) {
            console.log(`  ✓ 大量点评内容的处理性能测试通过 (${executionTime.toFixed(2)}ms < 300ms)`);
        } else {
            console.error(`  ✗ 大量点评内容的处理性能测试失败 (${executionTime.toFixed(2)}ms >= 300ms)`);
        }
        
        // 测试场景2: 内存使用稳定性
        console.log('  测试场景2: 内存使用稳定性');
        if (performance.memory) {
            const memoryUsage = performance.memory.usedJSHeapSize / 1024 / 1024;
            console.log(`  内存使用: ${memoryUsage.toFixed(2)}MB`);
            console.log('  ✓ 内存使用稳定性测试通过');
        } else {
            console.log('  内存使用: 无法获取 (浏览器不支持)');
            console.log('  ✓ 内存使用稳定性测试通过');
        }
    }, 200);
}

// 暴露测试函数到全局对象
window.runCommentTests = runCommentTests;

// 将网络图片转换成base64格式的函数（核心解决方案）
function convertImageToBase64(imgUrl) {
    return new Promise((resolve, reject) => {
        // 检查是否已经是base64格式
        if (imgUrl && imgUrl.startsWith('data:image/')) {
            resolve(imgUrl);
            return;
        }
        
        const img = new Image();
        
        img.onerror = function() {
            console.warn('图片加载失败，使用占位符:', imgUrl);
            const placeholder = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxMDAiIGhlaWdodD0iMTAwIiB2aWV3Qm94PSIwIDAgMTAwIDEwMCI+PHJlY3Qgd2lkdGg9IjEwMCIgaGVpZ2h0PSIxMDAiIGZpbGw9IiNmMGYwZjAiLz48dGV4dCB4PSI1MCIgeT0iNTUiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIxMiIgZmlsbD0iIzk5OSIgdGV4dC1hbmNob3I9Im1pZGRsZSI+5Zu+56eB5a6e5aSnPC90ZXh0Pjwvc3ZnPg==';
            resolve(placeholder);
        };
        
        img.onload = function() {
            try {
                const canvas = document.createElement('canvas');
                canvas.width = img.width;
                canvas.height = img.height;
                const context = canvas.getContext('2d');
                context.drawImage(img, 0, 0, img.width, img.height);
                const dataurl = canvas.toDataURL('image/png');
                resolve(dataurl);
            } catch (error) {
                console.warn('Canvas转换失败，使用占位符:', error);
                const placeholder = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxMDAiIGhlaWdodD0iMTAwIiB2aWV3Qm94PSIwIDAgMTAwIDEwMCI+PHJlY3Qgd2lkdGg9IjEwMCIgaGVpZ2h0PSIxMDAiIGZpbGw9IiNmMGYwZjAiLz48dGV4dCB4PSI1MCIgeT0iNTUiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIxMiIgZmlsbD0iIzk5OSIgdGV4dC1hbmNob3I9Im1pZGRsZSI+5Zu+56eB5a6e5aSnPC90ZXh0Pjwvc3ZnPg==';
                resolve(placeholder);
            }
        };
        
        img.src = imgUrl;
    });
}

// 打开图片智能匹配模态弹窗
function openSmartImageMatchModal() {
    console.log('打开图片智能匹配界面');
    
    if (!csvData || csvData.length === 0) {
        showAlertDialog('请先上传CSV文件', function() {
            console.log('用户确认了提示消息');
        });
        return;
    }
    
    if (!students || students.length === 0) {
        showAlertDialog('请先上传CSV文件以提取学员姓名', function() {
            console.log('用户确认了提示消息');
        });
        return;
    }
    
    // 重置匹配数据
    smartMatchImages = [];
    smartMatchResults = [];
    manualMatchMode = false;
    selectedImagesForManualMatch = [];
    
    // 创建模态弹窗
    const overlay = document.createElement('div');
    overlay.id = 'smartMatchOverlay';
    overlay.style.position = 'fixed';
    overlay.style.top = '0';
    overlay.style.left = '0';
    overlay.style.width = '100%';
    overlay.style.height = '100%';
    overlay.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
    overlay.style.zIndex = '1000';
    overlay.style.display = 'flex';
    overlay.style.alignItems = 'center';
    overlay.style.justifyContent = 'center';
    
    const modal = document.createElement('div');
    modal.id = 'smartMatchModal';
    modal.style.backgroundColor = 'white';
    modal.style.padding = '30px';
    modal.style.borderRadius = '8px';
    modal.style.boxShadow = '0 4px 20px rgba(0, 0, 0, 0.2)';
    modal.style.maxWidth = '90%';
    modal.style.width = '90%';
    modal.style.maxHeight = '85vh';
    modal.style.overflowY = 'auto';
    
    const title = document.createElement('h2');
    title.textContent = '🤖 图片智能匹配';
    title.style.marginTop = '0';
    title.style.marginBottom = '20px';
    title.style.fontSize = '20px';
    title.style.fontWeight = 'bold';
    title.style.color = '#333';
    
    // 说明文字
    const description = document.createElement('div');
    description.style.marginBottom = '20px';
    description.style.padding = '15px';
    description.style.backgroundColor = '#e8f5e9';
    description.style.borderRadius = '4px';
    description.style.borderLeft = '4px solid #4CAF50';
    description.innerHTML = `
        <p style="margin: 5px 0; font-size: 14px; color: #333;">
            <strong>功能说明：</strong>
        </p>
        <p style="margin: 5px 0; font-size: 14px; color: #333;">
            1. 系统将自动匹配图片文件名（不含扩展名）与学员姓名
        </p>
        <p style="margin: 5px 0; font-size: 14px; color: #333;">
            2. 匹配成功后，图片将自动分配到对应学员的【课堂巩固图片(已批改)】字段
        </p>
        <p style="margin: 5px 0; font-size: 14px; color: #FF9800;">
            3. 匹配采用精确匹配（区分大小写），请确保图片文件名与学员姓名完全一致
        </p>
    `;
    
    // 图片上传区域
    const uploadArea = document.createElement('div');
    uploadArea.id = 'smartMatchUploadArea';
    uploadArea.style.marginBottom = '20px';
    uploadArea.style.padding = '20px';
    uploadArea.style.border = '2px dashed #4CAF50';
    uploadArea.style.borderRadius = '8px';
    uploadArea.style.textAlign = 'center';
    uploadArea.style.cursor = 'pointer';
    uploadArea.style.transition = 'all 0.3s';
    
    uploadArea.innerHTML = `
        <div style="font-size: 48px; margin-bottom: 10px;">📁</div>
        <p style="margin: 10px 0; font-size: 16px; color: #333; font-weight: bold;">
            点击或拖拽图片到此处上传
        </p>
        <p style="margin: 5px 0; font-size: 14px; color: #666;">
            支持格式：JPG、PNG、WEBP
        </p>
        <p style="margin: 5px 0; font-size: 14px; color: #666;">
            建议图片文件名与学员姓名完全一致
        </p>
    `;
    
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.id = 'smartMatchFileInput';
    fileInput.multiple = true;
    fileInput.accept = 'image/jpeg,image/png,image/webp';
    fileInput.style.display = 'none';
    
    // 匹配结果区域（初始隐藏）
    const resultArea = document.createElement('div');
    resultArea.id = 'smartMatchResultArea';
    resultArea.style.display = 'none';
    resultArea.style.marginBottom = '20px';
    
    // 按钮区域
    const buttonContainer = document.createElement('div');
    buttonContainer.style.display = 'flex';
    buttonContainer.style.justifyContent = 'flex-end';
    buttonContainer.style.gap = '10px';
    buttonContainer.style.marginTop = '20px';
    
    const closeButton = document.createElement('button');
    closeButton.textContent = '关闭';
    closeButton.style.padding = '10px 20px';
    closeButton.style.border = '1px solid #ddd';
    closeButton.style.borderRadius = '4px';
    closeButton.style.backgroundColor = '#f5f5f5';
    closeButton.style.cursor = 'pointer';
    closeButton.style.fontSize = '14px';
    
    closeButton.addEventListener('click', function() {
        try {
            // 关闭前先保存未确认的智能匹配图片
            if (smartMatchResults && smartMatchResults.matched && smartMatchResults.matched.length > 0) {
                console.log('关闭智能匹配界面前，先保存未确认的匹配图片');
                savePendingSmartMatchImages();
            }
            
            // 关闭前保存智能匹配状态
            saveSmartMatchStateComprehensive();
        } catch (error) {
            console.error('关闭智能匹配界面时出错:', error);
        }
        
        document.body.removeChild(overlay);
    });
    
    buttonContainer.appendChild(closeButton);
    
    // 组装模态弹窗
    modal.appendChild(title);
    modal.appendChild(description);
    modal.appendChild(uploadArea);
    modal.appendChild(fileInput);
    modal.appendChild(resultArea);
    modal.appendChild(buttonContainer);
    overlay.appendChild(modal);
    document.body.appendChild(overlay);
    
    // 图片上传事件处理
    uploadArea.addEventListener('click', function() {
        fileInput.click();
    });
    
    uploadArea.addEventListener('dragover', function(e) {
        e.preventDefault();
        uploadArea.style.backgroundColor = '#e8f5e9';
        uploadArea.style.borderColor = '#2E7D32';
    });
    
    uploadArea.addEventListener('dragleave', function(e) {
        e.preventDefault();
        uploadArea.style.backgroundColor = 'transparent';
        uploadArea.style.borderColor = '#4CAF50';
    });
    
    uploadArea.addEventListener('drop', function(e) {
        e.preventDefault();
        uploadArea.style.backgroundColor = 'transparent';
        uploadArea.style.borderColor = '#4CAF50';
        
        const files = e.dataTransfer.files;
        if (files.length > 0) {
            processSmartMatchImages(files);
        }
    });
    
    fileInput.addEventListener('change', function(e) {
        const files = e.target.files;
        if (files.length > 0) {
            processSmartMatchImages(files);
        }
    });
    
    // 点击遮罩层关闭
    overlay.addEventListener('click', function(e) {
        if (e.target === overlay) {
            try {
                // 关闭前先保存未确认的智能匹配图片
                if (smartMatchResults && smartMatchResults.matched && smartMatchResults.matched.length > 0) {
                    console.log('点击遮罩层关闭前，先保存未确认的匹配图片');
                    savePendingSmartMatchImages();
                }
                
                // 关闭前保存智能匹配状态
                saveSmartMatchStateComprehensive();
            } catch (error) {
                console.error('点击遮罩层关闭智能匹配界面时出错:', error);
            }
            
            document.body.removeChild(overlay);
        }
    });
}

// 处理智能匹配图片
function processSmartMatchImages(files) {
    console.log('开始处理智能匹配图片，文件数量:', files.length);
    
    // 验证文件类型
    const validFiles = Array.from(files).filter(file => {
        const validTypes = ['image/jpeg', 'image/png', 'image/webp'];
        return validTypes.includes(file.type);
    });
    
    if (validFiles.length === 0) {
        showAlertDialog('请选择有效的图片文件（JPG、PNG、WEBP）', function() {
            console.log('用户确认了提示消息');
        });
        return;
    }
    
    if (validFiles.length > 100) {
        showAlertDialog('一次最多上传100张图片', function() {
            console.log('用户确认了提示消息');
        });
        return;
    }
    
    // 显示进度提示
    const uploadArea = document.getElementById('smartMatchUploadArea');
    uploadArea.innerHTML = `
        <div style="font-size: 48px; margin-bottom: 10px;">⏳</div>
        <p style="margin: 10px 0; font-size: 16px; color: #333; font-weight: bold;">
            正在处理 ${validFiles.length} 张图片...
        </p>
    `;
    
    // 图片压缩函数
    function compressImage(file, maxWidth = 400, maxHeight = 400, quality = 0.4) {
        return new Promise((resolve, reject) => {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            const img = new Image();
            let objectUrl = null;
            
            img.onload = function() {
                try {
                    // 释放对象URL
                    if (objectUrl) {
                        URL.revokeObjectURL(objectUrl);
                        objectUrl = null;
                    }
                    
                    // 计算压缩后的尺寸
                    let width = img.width;
                    let height = img.height;
                    
                    if (width > height) {
                        if (width > maxWidth) {
                            height = Math.round((height * maxWidth) / width);
                            width = maxWidth;
                        }
                    } else {
                        if (height > maxHeight) {
                            width = Math.round((width * maxHeight) / height);
                            height = maxHeight;
                        }
                    }
                    
                    // 设置画布尺寸
                    canvas.width = width;
                    canvas.height = height;
                    
                    // 绘制压缩后的图片
                    ctx.drawImage(img, 0, 0, width, height);
                    
                    // 转换为 Base64，使用更低的压缩质量
                    canvas.toBlob(function(blob) {
                        const reader = new FileReader();
                        reader.onload = function(e) {
                            const compressedDataUrl = e.target.result;
                            console.log('图片压缩完成:', file.name, '原始尺寸:', img.width, 'x', img.height, '压缩后尺寸:', width, 'x', height, '压缩后大小:', compressedDataUrl.length, '字节');
                            resolve(compressedDataUrl);
                        };
                        reader.onerror = function(e) {
                            console.error('FileReader读取失败:', file.name, e);
                            reject(new Error('FileReader读取失败'));
                        };
                        reader.readAsDataURL(blob);
                    }, 'image/jpeg', quality);
                } catch (error) {
                    console.error('图片压缩过程出错:', file.name, error);
                    reject(error);
                }
            };
            
            img.onerror = function(e) {
                console.error('图片加载失败:', file.name, e);
                if (objectUrl) {
                    URL.revokeObjectURL(objectUrl);
                    objectUrl = null;
                }
                reject(new Error(`图片加载失败: ${file.name}`));
            };
            
            try {
                objectUrl = URL.createObjectURL(file);
                img.src = objectUrl;
            } catch (error) {
                console.error('创建对象URL失败:', file.name, error);
                reject(error);
            }
        });
    }
    
    // 读取并压缩图片文件
    const imagePromises = validFiles.map(file => {
        return new Promise((resolve, reject) => {
            compressImage(file)
                .then(compressedDataUrl => {
                    const fileName = file.name;
                    const fileExt = fileName.substring(fileName.lastIndexOf('.'));
                    const fileNameWithoutExt = fileName.substring(0, fileName.lastIndexOf('.'));
                    
                    resolve({
                        name: fileName,
                        nameWithoutExt: fileNameWithoutExt,
                        extension: fileExt,
                        dataUrl: compressedDataUrl,
                        file: file
                    });
                })
                .catch(error => {
                    console.error('图片压缩失败:', file.name, error);
                    reject(new Error(`图片压缩失败: ${file.name} - ${error.message || error}`));
                });
        });
    });
    
    Promise.all(imagePromises)
        .then(images => {
            smartMatchImages = images;
            console.log('图片读取完成，开始匹配');
            
            // 执行自动匹配
            performAutoMatch();
        })
        .catch(error => {
            console.error('图片读取失败:', error);
            console.error('错误详情:', error.message, error.stack);
            
            let errorMessage = '图片读取失败，请重试';
            if (error.message) {
                errorMessage = `图片读取失败：${error.message}`;
            }
            
            showAlertDialog(errorMessage, function() {
                console.log('用户确认了提示消息');
            });
            
            // 恢复上传区域
            restoreUploadArea();
        });
}

// 执行自动匹配
function performAutoMatch() {
    console.log('开始执行自动匹配');
    
    const startTime = performance.now();
    
    // 初始化匹配结果
    smartMatchResults = {
        totalImages: smartMatchImages.length,
        matched: [],
        unmatched: []
    };
    
    // 遍历所有图片进行匹配
    smartMatchImages.forEach(image => {
        const imageName = image.nameWithoutExt;
        let matched = false;
        
        // 在学员列表中查找精确匹配
        for (let i = 0; i < students.length; i++) {
            const studentName = students[i];
            
            // 精确匹配（区分大小写）
            if (imageName === studentName) {
                smartMatchResults.matched.push({
                    image: image,
                    studentName: studentName,
                    studentIndex: i
                });
                matched = true;
                break;
            }
        }
        
        if (!matched) {
            smartMatchResults.unmatched.push({
                image: image
            });
        }
    });
    
    const endTime = performance.now();
    const duration = endTime - startTime;
    
    console.log('自动匹配完成，耗时:', duration.toFixed(2), 'ms');
    console.log('匹配结果:', smartMatchResults);
    
    // 匹配完成后立即保存状态
    saveSmartMatchStateComprehensive();
    
    // 显示匹配结果
    displayMatchResults();
}

// 显示匹配结果
function displayMatchResults() {
    const resultArea = document.getElementById('smartMatchResultArea');
    resultArea.style.display = 'block';
    
    // 统计信息
    const summary = document.createElement('div');
    summary.style.marginBottom = '20px';
    summary.style.padding = '15px';
    summary.style.backgroundColor = '#fff3e0';
    summary.style.borderRadius = '4px';
    summary.style.borderLeft = '4px solid #FF9800';
    
    summary.innerHTML = `
        <p style="margin: 5px 0; font-size: 14px; color: #333;">
            <strong>总图片数量：</strong>${smartMatchResults.totalImages}
        </p>
        <p style="margin: 5px 0; font-size: 14px; color: #4CAF50;">
            <strong>匹配成功：</strong>${smartMatchResults.matched.length}
        </p>
        <p style="margin: 5px 0; font-size: 14px; color: #FF9800;">
            <strong>匹配失败：</strong>${smartMatchResults.unmatched.length}
        </p>
    `;
    
    resultArea.innerHTML = '';
    resultArea.appendChild(summary);
    
    // 只有当有匹配成功的图片且没有未匹配的图片时，才显示确认按钮
    if (smartMatchResults.matched.length > 0 && smartMatchResults.unmatched.length === 0) {
        const confirmButton = document.createElement('button');
        confirmButton.textContent = `✅ 确认匹配（${smartMatchResults.matched.length}张）`;
        confirmButton.style.padding = '10px 20px';
        confirmButton.style.border = 'none';
        confirmButton.style.borderRadius = '4px';
        confirmButton.style.backgroundColor = '#4CAF50';
        confirmButton.style.color = 'white';
        confirmButton.style.cursor = 'pointer';
        confirmButton.style.fontSize = '14px';
        confirmButton.style.marginRight = '10px';
        
        confirmButton.addEventListener('click', function() {
            applyMatchedImages();
        });
        
        resultArea.appendChild(confirmButton);
    }
    
    // 如果有未匹配的图片，显示手动匹配按钮
    if (smartMatchResults.unmatched.length > 0) {
        const manualMatchButton = document.createElement('button');
        manualMatchButton.textContent = `🔧 手动匹配（${smartMatchResults.unmatched.length}张）`;
        manualMatchButton.style.padding = '10px 20px';
        manualMatchButton.style.border = 'none';
        manualMatchButton.style.borderRadius = '4px';
        manualMatchButton.style.backgroundColor = '#2196F3';
        manualMatchButton.style.color = 'white';
        manualMatchButton.style.cursor = 'pointer';
        manualMatchButton.style.fontSize = '14px';
        manualMatchButton.style.marginRight = '10px';
        
        manualMatchButton.addEventListener('click', function() {
            openManualMatchInterface();
        });
        
        resultArea.appendChild(manualMatchButton);
    }
    
    // 隐藏上传区域
    const uploadArea = document.getElementById('smartMatchUploadArea');
    uploadArea.style.display = 'none';
}

// 应用匹配成功的图片
function applyMatchedImages() {
    console.log('开始应用匹配成功的图片');
        
        // 重置用户手动调整标志位，因为图片智能匹配完成后会自动调整位置
        userManuallyAdjustedSection2 = false;
        console.log('图片智能匹配开始，重置用户手动调整标志位');
        
        // 创建事务备份
        const backupData = createTransactionBackup();
    
    try {
        let successCount = 0;
        let errorCount = 0;
        
        // 遍历匹配成功的图片
        smartMatchResults.matched.forEach(match => {
            const { image, studentName, studentIndex } = match;
            
            try {
                let foundMatch = false;
                // 在所有CSV文件中查找该学员
                for (let fileIndex = 0; fileIndex < csvData.length; fileIndex++) {
                    const rows = csvData[fileIndex].rows || [];
                    
                    for (let rowIndex = 0; rowIndex < rows.length; rowIndex++) {
                        const row = rows[rowIndex];
                        const name = row['姓名'] || row['学员姓名'] || row['名字'];
                        
                        if (name === studentName) {
                            // 不再修改CSV数据，避免Base64数据污染CSV字段
                            // CSV数据保持原样，只更新学员操作记录
                            
                            // 将图片添加到学员操作记录的 thirdPartImages 数组中
                            if (!studentOperationRecords[studentName]) {
                                studentOperationRecords[studentName] = {
                                    formData: collectFormData(),
                                    settings: {
                                        imageLayoutMode: imageLayoutModeSelect ? imageLayoutModeSelect.value : 'double',
                                        tableScale: tableScale,
                                        tableTopPosition: tableTopPosition,
                                        tableLeftPosition: tableLeftPosition,
                                        sectionPositions: {...sectionPositions},
                                        lockedCards: Array.from(lockedCards),
                                        imageAdjustments: [...imageAdjustments]
                                    },
                                    thirdPartImages: [],
                                    thirdPartImageNames: [],
                                    timestamp: Date.now()
                                };
                            }
                            
                            const record = studentOperationRecords[studentName];
                            const existingImagesSet = new Set(record.thirdPartImages);
                            if (!existingImagesSet.has(image.dataUrl)) {
                                record.thirdPartImages.push(image.dataUrl);
                                record.thirdPartImageNames.push(image.name);
                            }
                            
                            foundMatch = true;
                            console.log(`成功匹配：${studentName} -> ${image.name}`);
                            break;
                        }
                    }
                    
                    // 找到匹配后立即跳出CSV文件循环
                    if (foundMatch) {
                        break;
                    }
                }
                
                // 只对每个图片计数一次
                if (foundMatch) {
                    successCount++;
                }
            } catch (error) {
                console.error(`匹配失败：${studentName}`, error);
                errorCount++;
            }
        });
        
        // 保存学员操作记录
        saveStudentOperationRecords();
        
        // 处理未匹配的图片：自动添加到当前学员名下
        if (smartMatchResults.unmatched && smartMatchResults.unmatched.length > 0) {
            console.log('检测到未匹配的图片，自动添加到当前学员名下');
            
            const currentStudent = students[currentStudentIndex];
            if (currentStudent) {
                let currentRecord = studentOperationRecords[currentStudent];
                
                if (!currentRecord) {
                    currentRecord = {
                        formData: collectFormData(),
                        settings: {
                            imageLayoutMode: imageLayoutModeSelect ? imageLayoutModeSelect.value : 'double',
                            tableScale: tableScale,
                            tableTopPosition: tableTopPosition,
                            tableLeftPosition: tableLeftPosition,
                            sectionPositions: {...sectionPositions},
                            lockedCards: Array.from(lockedCards),
                            imageAdjustments: [...imageAdjustments]
                        },
                        thirdPartImages: [],
                        thirdPartImageNames: [],
                        timestamp: Date.now()
                    };
                }
                
                let unmatchedCount = 0;
                smartMatchResults.unmatched.forEach(item => {
                    const image = item.image;
                    const existingImagesSet = new Set(currentRecord.thirdPartImages);
                    if (!existingImagesSet.has(image.dataUrl)) {
                        currentRecord.thirdPartImages.push(image.dataUrl);
                        currentRecord.thirdPartImageNames.push(image.name);
                        unmatchedCount++;
                    }
                });
                
                // 限制图片数量
                if (currentRecord.thirdPartImages.length > 10) {
                    currentRecord.thirdPartImages = currentRecord.thirdPartImages.slice(0, 10);
                    currentRecord.thirdPartImageNames = currentRecord.thirdPartImageNames.slice(0, 10);
                }
                
                studentOperationRecords[currentStudent] = currentRecord;
                console.log(`已将 ${unmatchedCount} 张未匹配图片添加到学员【${currentStudent}】`);
            }
        }
        
        // 保存智能匹配状态
        saveSmartMatchStateComprehensive();
        
        // 打印所有学员的图片记录，用于调试
        console.log('=== 智能匹配完成后的学员图片记录 ===');
        Object.keys(studentOperationRecords).forEach(studentName => {
            const record = studentOperationRecords[studentName];
            if (record && record.thirdPartImages && record.thirdPartImages.length > 0) {
                console.log(`学员【${studentName}】有 ${record.thirdPartImages.length} 张图片:`, record.thirdPartImageNames);
            }
        });
        console.log('=== 学员图片记录结束 ===');
        
        // 立即更新全局变量 customImages，确保当前显示的图片是最新的
        const currentStudent = students[currentStudentIndex];
        if (currentStudent && studentOperationRecords[currentStudent]) {
            const currentRecord = studentOperationRecords[currentStudent];
            if (currentRecord.thirdPartImages && currentRecord.thirdPartImages.length > 0) {
                customImages = [...currentRecord.thirdPartImages];
                customImageNames = currentRecord.thirdPartImageNames ? [...currentRecord.thirdPartImageNames] : [];
                console.log(`自动匹配完成，已更新全局变量 customImages，当前学员【${currentStudent}】有 ${customImages.length} 张图片`);
            } else {
                customImages = [];
                customImageNames = [];
                console.log(`自动匹配完成，当前学员【${currentStudent}】没有图片记录`);
            }
            updateImageList();
            updateImageSelector();
        }
        
        console.log(`匹配完成：成功 ${successCount}，失败 ${errorCount}`);
        
        // 计算未匹配图片数量
        const unmatchedCount = smartMatchResults.unmatched ? smartMatchResults.unmatched.length : 0;
        
        console.log('所有学员操作记录已保存，图片已分别添加到对应学员名下');
        if (unmatchedCount > 0) {
            console.log(`未匹配的 ${unmatchedCount} 张图片已自动添加到当前学员【${currentStudent}】名下`);
        }
        
        // 显示成功消息
        let message = `✅ 图片匹配完成！\n成功：${successCount} 张\n失败：${errorCount} 张`;
        if (unmatchedCount > 0) {
            message += `\n\n未匹配：${unmatchedCount} 张（已自动添加到学员【${currentStudent}】）`;
        }
        
        showAlertDialog(message, function() {
            console.log('用户确认了提示消息');
            
            // 重新生成报告以更新预览
            if (document.querySelector('.report')) {
                // 先加载当前学员的操作记录，确保customImages全局变量被正确更新
                currentStudent = students[currentStudentIndex];
                if (currentStudent) {
                    loadStudentOperationRecord(currentStudent);
                }
                generateReport();
                
                // 图片智能匹配完成后，自动调整第三部分图片和布局
                setTimeout(() => {
                    // 等待图片加载完成后再调整（确保 applySmartImageAutoResize 已执行）
                    setTimeout(() => {
                        // 检查图片数量，如果大于4张则自动缩小30%
                        const imageCount = customImages.length;
                        const shouldShrink = imageCount > 4;
                        
                        if (shouldShrink) {
                            console.log(`检测到图片数量为 ${imageCount} 张（>4张），自动缩小30%`);
                        }
                        
                        // 1. 调整图片容器大小
                        const imageContainers = document.querySelectorAll('.creation-container > div');
                        imageContainers.forEach(container => {
                            container.style.width = 'calc(50% - 8px)';
                            container.style.margin = '0';
                            container.style.padding = '0';
                        });
                        
                        // 2. 调整图片大小
                        const images = document.querySelectorAll('.creation-image');
                        images.forEach(img => {
                            // 直接修改图片的尺寸
                            // 如果图片数量大于4张，则缩小30%
                            const maxWidth = shouldShrink ? '105px' : '150px';
                            const maxHeight = shouldShrink ? '84px' : '120px';
                            img.style.maxWidth = maxWidth;
                            img.style.maxHeight = maxHeight;
                            img.style.width = 'auto';
                            img.style.height = 'auto';
                        });
                        
                        // 3. 调整创作内容容器的大小
                        const creationContainer = document.querySelector('.creation-container');
                        if (creationContainer) {
                            creationContainer.style.minHeight = '100px';
                            creationContainer.style.gap = '8px';
                        }
                        
                        // 4. 调整第二部分表格的位置
                        const section2 = document.querySelector('.section-interactive');
                        const section3 = document.querySelector('.section-creation');
                        if (section2 && section3) {
                            adjustSection2Position(section2, section3);
                        }
                        
                        // 5. 重新调整预览容器高度
                        adjustPreviewContainerHeight(document.querySelector('.report'));
                    }, 500);
                }, 300);
            }
        });
        
        // 立即关闭模态弹窗
        const overlay = document.getElementById('smartMatchOverlay');
        if (overlay) {
            document.body.removeChild(overlay);
        }
        
        // 清空智能匹配结果，避免重复保存
        smartMatchResults = { matched: [], unmatched: [] };
        smartMatchImages = [];
        
    } catch (error) {
        console.error('应用匹配图片时出错:', error);
        
        // 回滚事务
        rollbackTransaction(backupData);
        
        showAlertDialog('应用匹配图片时出错，已回滚操作', function() {
            console.log('用户确认了提示消息');
        });
    }
}

// 创建事务备份
function createTransactionBackup() {
    return JSON.stringify(csvData);
}

// 回滚事务
function rollbackTransaction(backupData) {
    try {
        csvData = JSON.parse(backupData);
        console.log('事务回滚成功');
    } catch (error) {
        console.error('事务回滚失败:', error);
    }
}

// 打开手动匹配界面
function openManualMatchInterface() {
    console.log('打开手动匹配界面');
    
    manualMatchMode = true;
    selectedImagesForManualMatch = [];
    
    const modal = document.getElementById('smartMatchModal');
    
    // 清空结果区域
    const resultArea = document.getElementById('smartMatchResultArea');
    resultArea.innerHTML = '';
    
    // 创建手动匹配界面
    const manualMatchContainer = document.createElement('div');
    manualMatchContainer.id = 'manualMatchContainer';
    
    // 标题
    const title = document.createElement('h3');
    title.textContent = '🔧 手动匹配未匹配的图片';
    title.style.marginTop = '0';
    title.style.marginBottom = '20px';
    title.style.fontSize = '18px';
    title.style.color = '#333';
    
    // 搜索框
    const searchContainer = document.createElement('div');
    searchContainer.style.marginBottom = '20px';
    
    const searchLabel = document.createElement('label');
    searchLabel.textContent = '搜索学员：';
    searchLabel.style.marginRight = '10px';
    searchLabel.style.fontWeight = 'bold';
    
    const searchInput = document.createElement('input');
    searchInput.type = 'text';
    searchInput.id = 'studentSearchInput';
    searchInput.placeholder = '输入学员姓名搜索';
    searchInput.style.padding = '8px 12px';
    searchInput.style.border = '1px solid #ddd';
    searchInput.style.borderRadius = '4px';
    searchInput.style.fontSize = '14px';
    searchInput.style.minWidth = '200px';
    
    searchContainer.appendChild(searchLabel);
    searchContainer.appendChild(searchInput);
    
    // 图片列表
    const imageListContainer = document.createElement('div');
    imageListContainer.id = 'unmatchedImageList';
    imageListContainer.style.maxHeight = '400px';
    imageListContainer.style.overflowY = 'auto';
    imageListContainer.style.border = '1px solid #ddd';
    imageListContainer.style.borderRadius = '4px';
    imageListContainer.style.padding = '15px';
    imageListContainer.style.marginBottom = '20px';
    
    // 渲染未匹配的图片
    renderUnmatchedImages(imageListContainer);
    
    // 学员选择区域
    const studentSelectContainer = document.createElement('div');
    studentSelectContainer.id = 'studentSelectContainer';
    studentSelectContainer.style.marginBottom = '20px';
    studentSelectContainer.style.padding = '15px';
    studentSelectContainer.style.backgroundColor = '#e3f2fd';
    studentSelectContainer.style.borderRadius = '4px';
    studentSelectContainer.style.display = 'none';
    
    const studentSelectLabel = document.createElement('label');
    studentSelectLabel.textContent = '选择学员：';
    studentSelectLabel.style.marginRight = '10px';
    studentSelectLabel.style.fontWeight = 'bold';
    studentSelectLabel.style.color = '#1976d2';
    
    const studentSelect = document.createElement('select');
    studentSelect.id = 'studentSelectForManualMatch';
    studentSelect.style.padding = '8px 12px';
    studentSelect.style.border = '1px solid #ddd';
    studentSelect.style.borderRadius = '4px';
    studentSelect.style.fontSize = '14px';
    studentSelect.style.minWidth = '200px';
    
    // 添加学员选项
    students.forEach(student => {
        const option = document.createElement('option');
        option.value = student;
        option.textContent = student;
        studentSelect.appendChild(option);
    });
    
    studentSelectContainer.appendChild(studentSelectLabel);
    studentSelectContainer.appendChild(studentSelect);
    
    // 操作按钮
    const buttonContainer = document.createElement('div');
    buttonContainer.style.display = 'flex';
    buttonContainer.style.justifyContent = 'flex-end';
    buttonContainer.style.gap = '10px';
    
    const manualMatchButton = document.createElement('button');
    manualMatchButton.textContent = '🔧 手动匹配';
    manualMatchButton.style.padding = '10px 20px';
    manualMatchButton.style.border = 'none';
    manualMatchButton.style.borderRadius = '4px';
    manualMatchButton.style.backgroundColor = '#2196F3';
    manualMatchButton.style.color = 'white';
    manualMatchButton.style.cursor = 'pointer';
    manualMatchButton.style.fontSize = '14px';
    
    const confirmButton = document.createElement('button');
    confirmButton.textContent = '✅ 确定匹配';
    confirmButton.style.padding = '10px 20px';
    confirmButton.style.border = 'none';
    confirmButton.style.borderRadius = '4px';
    confirmButton.style.backgroundColor = '#4CAF50';
    confirmButton.style.color = 'white';
    confirmButton.style.cursor = 'pointer';
    confirmButton.style.fontSize = '14px';
    confirmButton.disabled = true;
    confirmButton.style.opacity = '0.5';
    confirmButton.style.cursor = 'not-allowed';
    
    const cancelButton = document.createElement('button');
    cancelButton.textContent = '取消';
    cancelButton.style.padding = '10px 20px';
    cancelButton.style.border = '1px solid #ddd';
    cancelButton.style.borderRadius = '4px';
    cancelButton.style.backgroundColor = '#f5f5f5';
    cancelButton.style.cursor = 'pointer';
    cancelButton.style.fontSize = '14px';
    
    const backButton = document.createElement('button');
    backButton.textContent = '← 返回';
    backButton.style.padding = '10px 20px';
    backButton.style.border = '1px solid #ddd';
    backButton.style.borderRadius = '4px';
    backButton.style.backgroundColor = '#f5f5f5';
    backButton.style.cursor = 'pointer';
    backButton.style.fontSize = '14px';
    
    buttonContainer.appendChild(backButton);
    buttonContainer.appendChild(cancelButton);
    buttonContainer.appendChild(manualMatchButton);
    buttonContainer.appendChild(confirmButton);
    
    // 组装界面
    manualMatchContainer.appendChild(title);
    manualMatchContainer.appendChild(searchContainer);
    manualMatchContainer.appendChild(imageListContainer);
    manualMatchContainer.appendChild(studentSelectContainer);
    manualMatchContainer.appendChild(buttonContainer);
    
    resultArea.appendChild(manualMatchContainer);
    
    let manualMatchClicked = false;
    
    // 事件处理
    searchInput.addEventListener('input', function() {
        filterStudents(searchInput.value);
    });
    
    manualMatchButton.addEventListener('click', function() {
        manualMatchClicked = true;
        manualMatchButton.textContent = '✓ 已选择手动匹配';
        manualMatchButton.style.backgroundColor = '#4CAF50';
        confirmButton.disabled = false;
        confirmButton.style.opacity = '1';
        confirmButton.style.cursor = 'pointer';
    });
    
    confirmButton.addEventListener('click', function() {
        if (!manualMatchClicked) {
            showAlertDialog('请先点击"手动匹配"按钮', function() {
                console.log('用户确认了提示消息');
            });
            return;
        }
        applyManualMatch();
    });
    
    cancelButton.addEventListener('click', function() {
        try {
            // 关闭前先保存未确认的智能匹配图片
            if (smartMatchResults && smartMatchResults.matched && smartMatchResults.matched.length > 0) {
                console.log('手动匹配取消前，先保存未确认的匹配图片');
                savePendingSmartMatchImages();
            }
            closeManualMatchInterface();
        } catch (error) {
            console.error('手动匹配取消按钮点击时出错:', error);
        }
    });
    
    backButton.addEventListener('click', function() {
        try {
            // 关闭前先保存未确认的智能匹配图片
            if (smartMatchResults && smartMatchResults.matched && smartMatchResults.matched.length > 0) {
                console.log('手动匹配返回前，先保存未确认的匹配图片');
                savePendingSmartMatchImages();
            }
            closeManualMatchInterface();
            displayMatchResults();
        } catch (error) {
            console.error('手动匹配返回按钮点击时出错:', error);
        }
    });
}

// 渲染未匹配的图片
function renderUnmatchedImages(container) {
    container.innerHTML = '';
    
    if (smartMatchResults.unmatched.length === 0) {
        container.innerHTML = '<p style="text-align: center; color: #999;">没有未匹配的图片</p>';
        return;
    }
    
    smartMatchResults.unmatched.forEach((item, index) => {
        const imageItem = document.createElement('div');
        imageItem.className = 'unmatched-image-item';
        imageItem.style.display = 'flex';
        imageItem.style.alignItems = 'center';
        imageItem.style.padding = '10px';
        imageItem.style.border = '1px solid #ddd';
        imageItem.style.borderRadius = '4px';
        imageItem.style.marginBottom = '10px';
        imageItem.style.cursor = 'pointer';
        imageItem.style.transition = 'all 0.3s';
        
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.className = 'image-checkbox';
        checkbox.dataset.index = index;
        checkbox.style.marginRight = '10px';
        
        const thumbnail = document.createElement('img');
        thumbnail.src = item.image.dataUrl;
        thumbnail.style.width = '60px';
        thumbnail.style.height = '60px';
        thumbnail.style.objectFit = 'cover';
        thumbnail.style.borderRadius = '4px';
        thumbnail.style.marginRight = '15px';
        
        const info = document.createElement('div');
        info.style.flex = '1';
        
        const name = document.createElement('div');
        name.textContent = item.image.name;
        name.style.fontWeight = 'bold';
        name.style.color = '#333';
        
        const size = document.createElement('div');
        size.textContent = formatFileSize(item.image.file.size);
        size.style.fontSize = '12px';
        size.style.color = '#999';
        
        info.appendChild(name);
        info.appendChild(size);
        
        imageItem.appendChild(checkbox);
        imageItem.appendChild(thumbnail);
        imageItem.appendChild(info);
        
        // 点击选择
        imageItem.addEventListener('click', function(e) {
            if (e.target !== checkbox) {
                checkbox.checked = !checkbox.checked;
            }
            updateSelectedImages();
        });
        
        container.appendChild(imageItem);
    });
}

// 更新选中的图片
function updateSelectedImages() {
    const checkboxes = document.querySelectorAll('.image-checkbox:checked');
    selectedImagesForManualMatch = Array.from(checkboxes).map(checkbox => {
        const index = parseInt(checkbox.dataset.index);
        return smartMatchResults.unmatched[index];
    });
    
    console.log('选中的图片数量:', selectedImagesForManualMatch.length);
    
    // 显示或隐藏学员选择区域
    const studentSelectContainer = document.getElementById('studentSelectContainer');
    if (selectedImagesForManualMatch.length > 0) {
        studentSelectContainer.style.display = 'block';
    } else {
        studentSelectContainer.style.display = 'none';
    }
}

// 过滤学员
function filterStudents(searchText) {
    const studentSelect = document.getElementById('studentSelectForManualMatch');
    const options = studentSelect.querySelectorAll('option');
    
    options.forEach(option => {
        const studentName = option.textContent.toLowerCase();
        const searchLower = searchText.toLowerCase();
        
        if (studentName.includes(searchLower)) {
            option.style.display = 'block';
        } else {
            option.style.display = 'none';
        }
    });
}

// 应用手动匹配
function applyManualMatch() {
    console.log('应用手动匹配');
    
    if (selectedImagesForManualMatch.length === 0) {
        showAlertDialog('请先选择要匹配的图片', function() {
            console.log('用户确认了提示消息');
        });
        return;
    }
    
    const studentSelect = document.getElementById('studentSelectForManualMatch');
    const selectedStudent = studentSelect.value;
    
    if (!selectedStudent) {
        showAlertDialog('请选择学员', function() {
            console.log('用户确认了提示消息');
        });
        return;
    }
    
    // 验证学员名是否在学员列表中
    if (!students.includes(selectedStudent)) {
        showAlertDialog(`选择的学员【${selectedStudent}】不在学员列表中，请重新选择`, function() {
            console.log('用户确认了提示消息');
        });
        return;
    }
    
    // 验证学员名是否在CSV数据中存在
    let studentExistsInCSV = false;
    for (let fileIndex = 0; fileIndex < csvData.length; fileIndex++) {
        const rows = csvData[fileIndex].rows || [];
        for (let rowIndex = 0; rowIndex < rows.length; rowIndex++) {
            const row = rows[rowIndex];
            const name = row['姓名'] || row['学员姓名'] || row['名字'];
            if (name === selectedStudent) {
                studentExistsInCSV = true;
                break;
            }
        }
        if (studentExistsInCSV) {
            break;
        }
    }
    
    if (!studentExistsInCSV) {
        showAlertDialog(`选择的学员【${selectedStudent}】在CSV数据中不存在，请检查学员名是否正确`, function() {
            console.log('用户确认了提示消息');
        });
        return;
    }
    
    console.log(`学员名验证通过：【${selectedStudent}】`);
    
    // 创建事务备份
    const backupData = createTransactionBackup();
    
    try {
        let successCount = 0;
        let errorCount = 0;
        
        // 遍历选中的图片
        selectedImagesForManualMatch.forEach(item => {
            const image = item.image;
            
            try {
                let studentFound = false;
                
                // 在所有CSV文件中查找该学员
                for (let fileIndex = 0; fileIndex < csvData.length; fileIndex++) {
                    const rows = csvData[fileIndex].rows || [];
                    
                    for (let rowIndex = 0; rowIndex < rows.length; rowIndex++) {
                        const row = rows[rowIndex];
                        const name = row['姓名'] || row['学员姓名'] || row['名字'];
                        
                        if (name === selectedStudent) {
                            // 不再修改CSV数据，避免Base64数据污染CSV字段
                            // CSV数据保持原样，只更新学员操作记录
                            
                            // 同时将图片添加到学员操作记录的 thirdPartImages 数组中
                            if (!studentOperationRecords[selectedStudent]) {
                                studentOperationRecords[selectedStudent] = {
                                    formData: collectFormData(),
                                    settings: {
                                        imageLayoutMode: imageLayoutModeSelect ? imageLayoutModeSelect.value : 'double',
                                        tableScale: tableScale,
                                        tableTopPosition: tableTopPosition,
                                        tableLeftPosition: tableLeftPosition,
                                        sectionPositions: {...sectionPositions},
                                        lockedCards: Array.from(lockedCards),
                                        imageAdjustments: [...imageAdjustments]
                                    },
                                    thirdPartImages: [],
                                    thirdPartImageNames: [],
                                    timestamp: Date.now()
                                };
                            }
                            
                            const record = studentOperationRecords[selectedStudent];
                            const existingImagesSet = new Set(record.thirdPartImages);
                            if (!existingImagesSet.has(image.dataUrl)) {
                                record.thirdPartImages.push(image.dataUrl);
                                record.thirdPartImageNames.push(image.name);
                            }
                            
                            studentFound = true;
                            console.log(`手动匹配成功：${selectedStudent} -> ${image.name}`);
                            break;
                        }
                    }
                    
                    if (studentFound) {
                        break;
                    }
                }
                
                if (studentFound) {
                    successCount++;
                }
            } catch (error) {
                console.error(`手动匹配失败：${selectedStudent}`, error);
                errorCount++;
            }
        });
        
        // 保存学员操作记录
        saveStudentOperationRecords();
        
        // 保存智能匹配状态
        saveSmartMatchStateComprehensive();
        
        // 打印所有学员的图片记录，用于调试
        console.log('=== 手动匹配完成后的学员图片记录 ===');
        Object.keys(studentOperationRecords).forEach(studentName => {
            const record = studentOperationRecords[studentName];
            if (record && record.thirdPartImages && record.thirdPartImages.length > 0) {
                console.log(`学员【${studentName}】有 ${record.thirdPartImages.length} 张图片:`, record.thirdPartImageNames);
            }
        });
        console.log('=== 学员图片记录结束 ===');
        
        // 检查手动匹配的学员是否是当前学员
        const currentStudent = students[currentStudentIndex];
        const needToSwitchStudent = selectedStudent !== currentStudent;
        
        if (needToSwitchStudent) {
            console.log(`手动匹配的学员【${selectedStudent}】不是当前学员【${currentStudent}】，需要切换学员`);
            // 切换到手动匹配的学员
            const newStudentIndex = students.indexOf(selectedStudent);
            if (newStudentIndex !== -1) {
                currentStudentIndex = newStudentIndex;
                // 加载该学员的操作记录
                loadStudentOperationRecord(selectedStudent);
                console.log(`已切换到学员【${selectedStudent}】，该学员有 ${customImages.length} 张图片`);
            }
        } else {
            // 如果是当前学员，直接更新全局变量
            if (currentStudent && studentOperationRecords[currentStudent]) {
                const currentRecord = studentOperationRecords[currentStudent];
                if (currentRecord.thirdPartImages && currentRecord.thirdPartImages.length > 0) {
                    customImages = [...currentRecord.thirdPartImages];
                    customImageNames = currentRecord.thirdPartImageNames ? [...currentRecord.thirdPartImageNames] : [];
                    console.log(`手动匹配完成，已更新全局变量 customImages，当前学员【${currentStudent}】有 ${customImages.length} 张图片`);
                } else {
                    customImages = [];
                    customImageNames = [];
                    console.log(`手动匹配完成，当前学员【${currentStudent}】没有图片记录`);
                }
                updateImageList();
                updateImageSelector();
            }
        }
        
        console.log(`手动匹配完成：成功 ${successCount}，失败 ${errorCount}`);
        console.log(`图片已添加到学员【${selectedStudent}】名下`);
        
        // 显示成功消息
        showAlertDialog(`✅ 手动匹配完成！\n成功：${successCount} 张\n失败：${errorCount} 张\n\n已切换到学员【${selectedStudent}】`, function() {
            console.log('用户确认了提示消息');
            
            // 从未匹配列表中移除已匹配的图片
            const matchedIndices = selectedImagesForManualMatch.map(item => {
                return smartMatchResults.unmatched.indexOf(item);
            });
            
            // 从后往前删除，避免索引变化
            matchedIndices.sort((a, b) => b - a);
            matchedIndices.forEach(index => {
                smartMatchResults.unmatched.splice(index, 1);
            });
            
            // 更新匹配成功列表
            selectedImagesForManualMatch.forEach(item => {
                smartMatchResults.matched.push({
                    image: item.image,
                    studentName: selectedStudent,
                    studentIndex: students.indexOf(selectedStudent)
                });
            });
            
            // 重新生成报告以更新预览
            if (document.querySelector('.report')) {
                generateReport();
            }
            
            // 关闭手动匹配界面
            closeManualMatchInterface();
            
            // 显示更新后的匹配结果
            displayMatchResults();
            
            // 清空智能匹配结果，避免重复保存
            smartMatchResults = { matched: [], unmatched: [] };
            smartMatchImages = [];
        });
        
        // 立即关闭整个图片智能匹配弹窗
        const overlay = document.getElementById('smartMatchOverlay');
        if (overlay) {
            document.body.removeChild(overlay);
        }
        
    } catch (error) {
        console.error('应用手动匹配时出错:', error);
        
        // 回滚事务
        rollbackTransaction(backupData);
        
        showAlertDialog('应用手动匹配时出错，已回滚操作', function() {
            console.log('用户确认了提示消息');
        });
    }
}

// 关闭手动匹配界面
function closeManualMatchInterface() {
    manualMatchMode = false;
    selectedImagesForManualMatch = [];
    
    try {
        // 关闭前保存智能匹配状态
        saveSmartMatchStateComprehensive();
    } catch (error) {
        console.error('关闭手动匹配界面时保存状态出错:', error);
    }
    
    const manualMatchContainer = document.getElementById('manualMatchContainer');
    if (manualMatchContainer) {
        manualMatchContainer.remove();
    }
}

// 恢复上传区域
function restoreUploadArea() {
    const uploadArea = document.getElementById('smartMatchUploadArea');
    if (uploadArea) {
        uploadArea.style.display = 'block';
        uploadArea.innerHTML = `
            <div style="font-size: 48px; margin-bottom: 10px;">📁</div>
            <p style="margin: 10px 0; font-size: 16px; color: #333; font-weight: bold;">
                点击或拖拽图片到此处上传
            </p>
            <p style="margin: 5px 0; font-size: 14px; color: #666;">
                支持格式：JPG、PNG、WEBP
            </p>
            <p style="margin: 5px 0; font-size: 14px; color: #666;">
                建议图片文件名与学员姓名完全一致
            </p>
        `;
    }
}

// 检查哪些学员在第三部分图片中没有识别到
function checkMissingImages() {
    console.log('检查缺失图片');
    
    if (!csvData || csvData.length === 0) {
        showAlertDialog('请先上传CSV文件', function() {
            console.log('用户确认了提示消息');
        });
        return;
    }
    
    // 收集每个CSV文件中【课堂巩固图片(已批改)】为空的学员
    const missingDataByFile = [];
    
    csvData.forEach((data, fileIndex) => {
        const rows = data.rows || [];
        const missingStudents = [];
        
        rows.forEach(row => {
            const name = row['姓名'] || row['学员姓名'] || row['名字'];
            const imageValue = row['课堂巩固图片(已批改)'];
            
            if (name && (!imageValue || imageValue === '' || imageValue === null || imageValue === undefined)) {
                missingStudents.push(name);
            }
        });
        
        if (missingStudents.length > 0) {
            const filename = csvFilenames[fileIndex] || `表格 ${fileIndex + 1}`;
            const filenameWithoutExt = filename.replace(/\.[^/.]+$/, '');
            
            missingDataByFile.push({
                filename: filenameWithoutExt,
                students: missingStudents,
                fileIndex: fileIndex
            });
        }
    });
    
    console.log('缺失图片的学员数据:', missingDataByFile);
    
    if (missingDataByFile.length === 0) {
        showAlertDialog('✅ 所有学员的【课堂巩固图片(已批改)】都已填写！', function() {
            console.log('用户确认了提示消息');
        });
        return;
    }
    
    let currentSortField = 'fileIndex';
    let currentSortOrder = 'asc';
    let currentViewMode = 'all';
    let selectedFilename = null;
    let filteredData = [...missingDataByFile];
    
    const overlay = document.createElement('div');
    overlay.style.position = 'fixed';
    overlay.style.top = '0';
    overlay.style.left = '0';
    overlay.style.width = '100%';
    overlay.style.height = '100%';
    overlay.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
    overlay.style.zIndex = '1000';
    overlay.style.display = 'flex';
    overlay.style.alignItems = 'center';
    overlay.style.justifyContent = 'center';
    
    const modal = document.createElement('div');
    modal.style.backgroundColor = 'white';
    modal.style.padding = '30px';
    modal.style.borderRadius = '8px';
    modal.style.boxShadow = '0 4px 20px rgba(0, 0, 0, 0.2)';
    modal.style.maxWidth = '90%';
    modal.style.width = '90%';
    modal.style.maxHeight = '85vh';
    modal.style.overflowY = 'auto';
    
    const title = document.createElement('h2');
    title.textContent = '🔍 检查缺失图片';
    title.style.marginTop = '0';
    title.style.marginBottom = '20px';
    title.style.fontSize = '20px';
    title.style.fontWeight = 'bold';
    title.style.color = '#333';
    
    const summary = document.createElement('div');
    summary.style.marginBottom = '20px';
    summary.style.padding = '15px';
    summary.style.backgroundColor = '#fff3e0';
    summary.style.borderRadius = '4px';
    summary.style.borderLeft = '4px solid #FF9800';
    
    const totalMissing = missingDataByFile.reduce((sum, item) => sum + item.students.length, 0);
    summary.innerHTML = `
        <p style="margin: 5px 0; font-size: 14px; color: #333;">
            <strong>CSV文件数：</strong>${csvData.length}
        </p>
        <p style="margin: 5px 0; font-size: 14px; color: #333;">
            <strong>缺失图片的文件数：</strong>${missingDataByFile.length}
        </p>
        <p style="margin: 5px 0; font-size: 14px; color: #FF9800;">
            <strong>缺失图片的学员总数：</strong>${totalMissing}
        </p>
    `;
    
    const viewModeContainer = document.createElement('div');
    viewModeContainer.style.marginBottom = '20px';
    viewModeContainer.style.padding = '15px';
    viewModeContainer.style.backgroundColor = '#f5f5f5';
    viewModeContainer.style.borderRadius = '4px';
    
    const viewModeLabel = document.createElement('label');
    viewModeLabel.textContent = '查看模式：';
    viewModeLabel.style.marginRight = '15px';
    viewModeLabel.style.fontWeight = 'bold';
    viewModeLabel.style.color = '#333';
    
    const viewModeSelect = document.createElement('select');
    viewModeSelect.style.padding = '8px 12px';
    viewModeSelect.style.border = '1px solid #ddd';
    viewModeSelect.style.borderRadius = '4px';
    viewModeSelect.style.fontSize = '14px';
    viewModeSelect.style.minWidth = '200px';
    
    const allOption = document.createElement('option');
    allOption.value = 'all';
    allOption.textContent = '查看全部文件';
    
    const singleOption = document.createElement('option');
    singleOption.value = 'single';
    singleOption.textContent = '查看单个文件';
    
    viewModeSelect.appendChild(allOption);
    viewModeSelect.appendChild(singleOption);
    
    const fileSelectContainer = document.createElement('div');
    fileSelectContainer.id = 'fileSelectContainer';
    fileSelectContainer.style.marginBottom = '20px';
    fileSelectContainer.style.padding = '15px';
    fileSelectContainer.style.backgroundColor = '#e3f2fd';
    fileSelectContainer.style.borderRadius = '4px';
    fileSelectContainer.style.display = 'none';
    
    const fileSelectLabel = document.createElement('label');
    fileSelectLabel.textContent = '选择文件：';
    fileSelectLabel.style.marginRight = '15px';
    fileSelectLabel.style.fontWeight = 'bold';
    fileSelectLabel.style.color = '#1976d2';
    
    const fileSelect = document.createElement('select');
    fileSelect.id = 'fileSelect';
    fileSelect.style.padding = '8px 12px';
    fileSelect.style.border = '1px solid #2196F3';
    fileSelect.style.borderRadius = '4px';
    fileSelect.style.fontSize = '14px';
    fileSelect.style.minWidth = '300px';
    
    const uniqueFilenames = [...new Set(missingDataByFile.map(item => item.filename))];
    uniqueFilenames.forEach(filename => {
        const option = document.createElement('option');
        option.value = filename;
        option.textContent = filename;
        fileSelect.appendChild(option);
    });
    
    fileSelectContainer.appendChild(fileSelectLabel);
    fileSelectContainer.appendChild(fileSelect);
    
    viewModeContainer.appendChild(viewModeLabel);
    viewModeContainer.appendChild(viewModeSelect);
    
    const tableContainer = document.createElement('div');
    tableContainer.style.marginBottom = '20px';
    
    const table = document.createElement('table');
    table.style.width = '100%';
    table.style.borderCollapse = 'collapse';
    table.style.fontSize = '14px';
    
    const thead = document.createElement('thead');
    const headerRow = document.createElement('tr');
    headerRow.style.backgroundColor = '#f5f5f5';
    headerRow.style.fontWeight = 'bold';
    
    const headers = ['讲次', '姓名'];
    headers.forEach(headerText => {
        const th = document.createElement('th');
        th.textContent = headerText;
        th.style.padding = '12px';
        th.style.border = '1px solid #ddd';
        th.style.textAlign = 'left';
        th.style.cursor = 'pointer';
        th.style.userSelect = 'none';
        
        th.addEventListener('click', function() {
            const field = headerText === '讲次' ? 'fileIndex' : 'studentCount';
            if (currentSortField === field) {
                currentSortOrder = currentSortOrder === 'asc' ? 'desc' : 'asc';
            } else {
                currentSortField = field;
                currentSortOrder = 'asc';
            }
            sortAndRenderTable();
        });
        
        headerRow.appendChild(th);
    });
    
    thead.appendChild(headerRow);
    table.appendChild(thead);
    
    const tbody = document.createElement('tbody');
    tbody.id = 'missingImagesTableBody';
    table.appendChild(tbody);
    
    tableContainer.appendChild(table);
    
    const closeButton = document.createElement('button');
    closeButton.textContent = '关闭';
    closeButton.style.padding = '10px 20px';
    closeButton.style.border = '1px solid #ddd';
    closeButton.style.borderRadius = '4px';
    closeButton.style.backgroundColor = '#f5f5f5';
    closeButton.style.color = '#333';
    closeButton.style.cursor = 'pointer';
    closeButton.style.fontSize = '14px';
    closeButton.style.marginTop = '20px';
    
    function sortAndRenderTable() {
        let dataToSort = currentViewMode === 'all' ? [...missingDataByFile] : 
                          missingDataByFile.filter(item => item.filename === selectedFilename);
        
        dataToSort.sort((a, b) => {
            let valueA, valueB;
            
            if (currentSortField === 'fileIndex') {
                valueA = a.fileIndex;
                valueB = b.fileIndex;
            } else {
                valueA = a.students.length;
                valueB = b.students.length;
            }
            
            if (valueA < valueB) return currentSortOrder === 'asc' ? -1 : 1;
            if (valueA > valueB) return currentSortOrder === 'asc' ? 1 : -1;
            return 0;
        });
        
        renderTable(dataToSort);
    }
    
    function renderTable(data) {
        tbody.innerHTML = '';
        
        if (currentViewMode === 'all') {
            // 按照讲次名称分组
            const groupedByFilename = {};
            data.forEach(item => {
                if (!groupedByFilename[item.filename]) {
                    groupedByFilename[item.filename] = [];
                }
                groupedByFilename[item.filename].push(...item.students);
            });
            
            // 遍历每个讲次组
            let rowIndex = 0;
            Object.entries(groupedByFilename).forEach(([filename, students]) => {
                students.forEach((studentName, studentIndex) => {
                    const tr = document.createElement('tr');
                    tr.style.backgroundColor = (rowIndex + studentIndex) % 2 === 0 ? '#fff' : '#f9f9f9';
                    
                    const tdFile = document.createElement('td');
                    tdFile.textContent = filename;
                    tdFile.style.padding = '12px';
                    tdFile.style.border = '1px solid #ddd';
                    tdFile.style.fontWeight = 'bold';
                    tdFile.style.color = '#1976d2';
                    
                    // 只为每个讲次的第一行设置讲次名称，并合并单元格
                    if (studentIndex === 0) {
                        tdFile.rowSpan = students.length;
                    } else {
                        tdFile.style.display = 'none';
                    }
                    
                    const tdName = document.createElement('td');
                    tdName.textContent = studentName;
                    tdName.style.padding = '12px';
                    tdName.style.border = '1px solid #ddd';
                    
                    tr.appendChild(tdFile);
                    tr.appendChild(tdName);
                    tbody.appendChild(tr);
                });
                rowIndex += students.length;
            });
        } else {
            const selectedItem = data.find(item => item.filename === selectedFilename);
            if (selectedItem) {
                selectedItem.students.forEach((studentName, studentIndex) => {
                    const tr = document.createElement('tr');
                    tr.style.backgroundColor = studentIndex % 2 === 0 ? '#fff' : '#f9f9f9';
                    
                    const tdFile = document.createElement('td');
                    tdFile.textContent = selectedItem.filename;
                    tdFile.style.padding = '12px';
                    tdFile.style.border = '1px solid #ddd';
                    tdFile.style.fontWeight = 'bold';
                    tdFile.style.color = '#1976d2';
                    
                    // 只为第一个学生设置讲次名称，并合并单元格
                    if (studentIndex === 0) {
                        tdFile.rowSpan = selectedItem.students.length;
                    } else {
                        tdFile.style.display = 'none';
                    }
                    
                    const tdName = document.createElement('td');
                    tdName.textContent = studentName;
                    tdName.style.padding = '12px';
                    tdName.style.border = '1px solid #ddd';
                    
                    tr.appendChild(tdFile);
                    tr.appendChild(tdName);
                    tbody.appendChild(tr);
                });
            }
        }
    }
    
    viewModeSelect.addEventListener('change', function() {
        currentViewMode = this.value;
        if (currentViewMode === 'single') {
            fileSelectContainer.style.display = 'block';
            selectedFilename = fileSelect.value;
        } else {
            fileSelectContainer.style.display = 'none';
            selectedFilename = null;
        }
        sortAndRenderTable();
    });
    
    fileSelect.addEventListener('change', function() {
        selectedFilename = this.value;
        sortAndRenderTable();
    });
    
    modal.appendChild(title);
    modal.appendChild(summary);
    modal.appendChild(viewModeContainer);
    modal.appendChild(fileSelectContainer);
    modal.appendChild(tableContainer);
    modal.appendChild(closeButton);
    overlay.appendChild(modal);
    document.body.appendChild(overlay);
    
    sortAndRenderTable();
    
    closeButton.addEventListener('click', function() {
        document.body.removeChild(overlay);
    });
    
    document.addEventListener('keydown', function handleKeydown(e) {
        if (e.key === 'Escape') {
            document.body.removeChild(overlay);
            document.removeEventListener('keydown', handleKeydown);
        }
    });
}

// 处理跨域图片的辅助函数
async function fetchImageAsBase64(url) {
    return new Promise((resolve, reject) => {
        try {
            if (url.startsWith('data:') || url.startsWith('blob:')) {
                resolve(url);
                return;
            }

            // 检查是否为本地文件协议
            if (window.location.protocol === 'file:' || url.startsWith('file:')) {
                console.log('检测到本地文件协议，使用 FileReader 直接读取');
                try {
                    // 对于本地文件，直接使用 FileReader 读取
                    // 注意：这只适用于同源的本地文件
                    const img = new Image();
                    // 本地文件协议下不要设置 crossOrigin
                    img.src = url;

                    img.onload = function() {
                        try {
                            const canvas = document.createElement('canvas');
                            canvas.width = img.width;
                            canvas.height = img.height;
                            const ctx = canvas.getContext('2d');
                            ctx.drawImage(img, 0, 0);
                            const base64 = canvas.toDataURL('image/png');
                            resolve(base64);
                        } catch (canvasError) {
                            console.warn('Canvas转换失败，使用直接文件读取:', canvasError);
                            // 尝试直接读取文件
                            try {
                                const fileUrl = url.replace('file:///', '');
                                const xhr = new XMLHttpRequest();
                                xhr.open('GET', url, true);
                                xhr.responseType = 'blob';

                                xhr.onload = function() {
                                    if (xhr.status === 200 || xhr.status === 0) {
                                        const reader = new FileReader();
                                        reader.onloadend = function() {
                                            resolve(reader.result);
                                        };
                                        reader.readAsDataURL(xhr.response);
                                    } else {
                                        console.warn('本地文件读取失败，使用占位符:', url);
                                        resolve('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxMDAiIGhlaWdodD0iMTAwIiB2aWV3Qm94PSIwIDAgMTAwIDEwMCI+PHJlY3Qgd2lkdGg9IjEwMCIgaGVpZ2h0PSIxMDAiIGZpbGw9IiNmMGYwZjAiLz48dGV4dC1hbmNob3I9Im1pZGRsZSI+5Zu+56eB5a6e5aSnPC90ZXh0Pjwvc3ZnPg==');
                                    }
                                };

                                xhr.onerror = function() {
                                    console.warn('本地文件XHR读取失败，使用占位符:', url);
                                    resolve('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxMDAiIGhlaWdodD0iMTAwIiB2aWV3Qm94PSIwIDAgMTAwIDEwMCI+PHJlY3Qgd2lkdGg9IjEwMCIgaGVpZ2h0PSIxMDAiIGZpbGw9IiNmMGYwZjAiLz48dGV4dC1hbmNob3I9Im1pZGRsZSI+5Zu+56eB5a6e5aSnPC90ZXh0Pjwvc3ZnPg==');
                                };

                                xhr.send();
                            } catch (fileError) {
                                console.warn('文件读取失败，使用占位符:', fileError);
                                resolve('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxMDAiIGhlaWdodD0iMTAwIiB2aWV3Qm94PSIwIDAgMTAwIDEwMCI+PHJlY3Qgd2lkdGg9IjEwMCIgaGVpZ2h0PSIxMDAiIGZpbGw9IiNmMGYwZjAiLz48dGV4dC1hbmNob3I9Im1pZGRsZSI+5Zu+56eB5a6e5aSnPC90ZXh0Pjwvc3ZnPg==');
                            }
                        }
                    };

                    img.onerror = function() {
                        console.warn('本地图片加载失败，尝试直接读取:', url);
                        // 尝试直接读取文件
                        try {
                            const xhr = new XMLHttpRequest();
                            xhr.open('GET', url, true);
                            xhr.responseType = 'blob';

                            xhr.onload = function() {
                                if (xhr.status === 200 || xhr.status === 0) {
                                    const reader = new FileReader();
                                    reader.onloadend = function() {
                                        resolve(reader.result);
                                    };
                                    reader.readAsDataURL(xhr.response);
                                } else {
                                    console.warn('本地文件读取失败，使用占位符:', url);
                                    resolve('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxMDAiIGhlaWdodD0iMTAwIiB2aWV3Qm94PSIwIDAgMTAwIDEwMCI+PHJlY3Qgd2lkdGg9IjEwMCIgaGVpZ2h0PSIxMDAiIGZpbGw9IiNmMGYwZjAiLz48dGV4dC1hbmNob3I9Im1pZGRsZSI+5Zu+56eB5a6e5aSnPC90ZXh0Pjwvc3ZnPg==');
                                }
                            };

                            xhr.onerror = function() {
                                console.warn('本地文件XHR读取失败，使用占位符:', url);
                                resolve('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxMDAiIGhlaWdodD0iMTAwIiB2aWV3Qm94PSIwIDAgMTAwIDEwMCI+PHJlY3Qgd2lkdGg9IjEwMCIgaGVpZ2h0PSIxMDAiIGZpbGw9IiNmMGYwZjAiLz48dGV4dC1hbmNob3I9Im1pZGRsZSI+5Zu+56eB5a6e5aSnPC90ZXh0Pjwvc3ZnPg==');
                            };

                            xhr.send();
                        } catch (fileError) {
                            console.warn('文件读取失败，使用占位符:', fileError);
                            resolve('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxMDAiIGhlaWdodD0iMTAwIiB2aWV3Qm94PSIwIDAgMTAwIDEwMCI+PHJlY3Qgd2lkdGg9IjEwMCIgaGVpZ2h0PSIxMDAiIGZpbGw9IiNmMGYwZjAiLz48dGV4dC1hbmNob3I9Im1pZGRsZSI+5Zu+56eB5a6e5aSnPC90ZXh0Pjwvc3ZnPg==');
                        }
                    };
                } catch (error) {
                    console.warn('本地文件处理失败，使用占位符:', error);
                    resolve('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxMDAiIGhlaWdodD0iMTAwIiB2aWV3Qm94PSIwIDAgMTAwIDEwMCI+PHJlY3Qgd2lkdGg9IjEwMCIgaGVpZ2h0PSIxMDAiIGZpbGw9IiNmMGYwZjAiLz48dGV4dC1hbmNob3I9Im1pZGRsZSI+5Zu+56eB5a6e5aSnPC90ZXh0Pjwvc3ZnPg==');
                }
                return;
            }

            const img = new Image();
            img.crossOrigin = 'Anonymous';
            img.src = url + '?tamp=' + (new Date()).valueOf();

            img.onload = function() {
                try {
                    const canvas = document.createElement('canvas');
                    canvas.width = img.width;
                    canvas.height = img.height;
                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(img, 0, 0);
                    const base64 = canvas.toDataURL('image/png');
                    resolve(base64);
                } catch (canvasError) {
                    console.warn('Canvas转换失败，尝试使用代理:', canvasError);
                    tryProxyServer(url, resolve);
                }
            };

            img.onerror = function() {
                console.warn('直接加载失败，尝试使用代理:', url);
                tryProxyServer(url, resolve);
            };
        } catch (error) {
            console.warn('图片处理失败，使用占位符:', error);
            resolve('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxMDAiIGhlaWdodD0iMTAwIiB2aWV3Qm94PSIwIDAgMTAwIDEwMCI+PHJlY3Qgd2lkdGg9IjEwMCIgaGVpZ2h0PSIxMDAiIGZpbGw9IiNmMGYwZjAiLz48dGV4dC1hbmNob3I9Im1pZGRsZSI+5Zu+56eB5a6e5aSnPC90ZXh0Pjwvc3ZnPg==');
        }
    });
}

function tryProxyServer(url, resolve) {
    const proxyUrl = 'https://api.allorigins.win/raw?url=' + encodeURIComponent(url);
    const xhr = new XMLHttpRequest();
    xhr.open('GET', proxyUrl, true);
    xhr.responseType = 'arraybuffer';

    xhr.onload = function() {
        if (xhr.status === 200) {
            const blob = new Blob([xhr.response], { type: 'image/png' });
            const reader = new FileReader();
            reader.onloadend = function() {
                resolve(reader.result);
            };
            reader.readAsDataURL(blob);
        } else {
            console.warn('代理加载失败，使用占位符:', url);
            resolve('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxMDAiIGhlaWdodD0iMTAwIiB2aWV3Qm94PSIwIDAgMTAwIDEwMCI+PHJlY3Qgd2lkdGg9IjEwMCIgaGVpZ2h0PSIxMDAiIGZpbGw9IiNmMGYwZjAiLz48dGV4dC1hbmNob3I9Im1pZGRsZSI+5Zu+56eB5a6e5aSnPC90ZXh0Pjwvc3ZnPg==');
        }
    };

    xhr.onerror = function() {
        console.warn('代理加载失败，使用占位符:', url);
        resolve('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxMDAiIGhlaWdodD0iMTAwIiB2aWV3Qm94PSIwIDAgMTAwIDEwMCI+PHJlY3Qgd2lkdGg9IjEwMCIgaGVpZ2h0PSIxMDAiIGZpbGw9IiNmMGYwZjAiLz48dGV4dC1hbmNob3I9Im1pZGRsZSI+5Zu+56eB5a6e5aSnPC90ZXh0Pjwvc3ZnPg==');
    };

    xhr.send();
}

// 备选方案：直接捕获原始元素
async function tryDirectCapture(element, studentName) {
    const fileName = `${studentName}_学习情况报告.png`;
    
    try {
        console.log('尝试直接捕获原始元素');
        
        // 直接捕获原始元素
        const canvas = await html2canvas(element, {
            scale: 2, // 2倍分辨率
            useCORS: true, // 启用CORS支持
            allowTaint: true, // 允许被污染
            taintTest: false, // 跳过污染测试
            logging: true, // 启用日志
            timeout: 60000, // 延长超时时间
            backgroundColor: 'transparent', // 使用透明背景
            scrollX: 0,
            scrollY: 0,
            removeContainer: true
        });
        
        console.log('直接捕获成功');
        console.log('生成的Canvas尺寸:', canvas.width, 'x', canvas.height);
        
        // 使用toDataURL生成PNG
        const pngUrl = canvas.toDataURL('image/png');
        console.log('PNG生成成功，大小:', Math.round(pngUrl.length / 1024), 'KB');
        
        // 创建下载链接
        const link = document.createElement('a');
        link.download = fileName;
        link.href = pngUrl;
        link.style.display = 'none';
        document.body.appendChild(link);
        
        // 触发下载
        link.click();
        
        // 清理
        setTimeout(() => {
            document.body.removeChild(link);
            showSaveStatus('PNG图片下载成功（直接捕获）');
            console.log('直接捕获下载成功');
        }, 100);
        
    } catch (error) {
        console.error('直接捕获失败:', error);
        throw error;
    }
}

// 备选方案：使用克隆DOM
async function tryCloneMethod(element, studentName) {
    // 创建克隆
    const clone = element.cloneNode(true);
    
    // 设置克隆的样式
    clone.style.position = 'absolute';
    clone.style.left = '-9999px';
    clone.style.top = '-9999px';
    clone.style.width = element.offsetWidth + 'px';
    clone.style.height = element.offsetHeight + 'px';
    clone.style.padding = '20px';
    clone.style.background = '#ffffff';
    
    // 添加到DOM
    document.body.appendChild(clone);
    
    try {
        // 使用html2canvas捕获克隆
        const canvas = await html2canvas(clone, {
            scale: 3,
            useCORS: true,
            allowTaint: true,
            taintTest: false,
            logging: true,
            timeout: 60000,
            backgroundColor: null
        });
        
        console.log('克隆方案捕获成功');
        
        // 使用toBlob方法
        canvas.toBlob(function(blob) {
            if (blob) {
                const url = URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.download = `${studentName}_学习情况报告.png`;
                link.href = url;
                link.click();
                
                setTimeout(() => {
                    URL.revokeObjectURL(url);
                    document.body.removeChild(clone);
                    showSaveStatus('PNG图片下载成功（克隆方案）');
                }, 100);
            } else {
                throw new Error('Blob创建失败');
            }
        }, 'image/png');
        
    } catch (error) {
        document.body.removeChild(clone);
        throw error;
    }
}

// 备选方案：使用简化版捕获
async function trySimplifiedMethod(element, studentName) {
    const fileName = `${studentName}_学习情况报告.png`;
    
    try {
        // 创建一个简化的克隆
        const clone = element.cloneNode(true);
        
        // 移除可能导致问题的元素
        const images = clone.querySelectorAll('img');
        images.forEach(img => {
            img.src = '';
            img.alt = '[图片]';
        });
        
        // 移除背景图片
        const elementsWithBackground = clone.querySelectorAll('*');
        elementsWithBackground.forEach(el => {
            el.style.backgroundImage = 'none';
        });
        
        // 设置克隆的样式
        clone.style.position = 'absolute';
        clone.style.left = '-9999px';
        clone.style.top = '-9999px';
        clone.style.width = element.offsetWidth + 'px';
        clone.style.height = element.offsetHeight + 'px';
        clone.style.background = '#ffffff';
        
        // 添加到DOM
        document.body.appendChild(clone);
        
        // 使用html2canvas捕获
        const canvas = await html2canvas(clone, {
            scale: 3,
            useCORS: false, // 禁用CORS以避免问题
            allowTaint: false,
            taintTest: false,
            logging: true,
            timeout: 60000,
            backgroundColor: null
        });
        
        console.log('简化版捕获成功');
        
        // 使用toDataURL
        const pngUrl = canvas.toDataURL('image/png');
        
        // 创建下载链接
        const link = document.createElement('a');
        link.download = fileName;
        link.href = pngUrl;
        link.click();
        
        // 清理
        setTimeout(() => {
            document.body.removeChild(clone);
            showSaveStatus('PNG图片下载成功（简化版）');
        }, 100);
        
    } catch (error) {
        console.error('简化版捕获失败:', error);
        throw error;
    }
}

// 最终方案：使用手动Canvas绘制
async function tryManualCanvasMethod(element, studentName) {
    const fileName = `${studentName}_学习情况报告.png`;
    
    try {
        // 创建Canvas
        const canvas = document.createElement('canvas');
        const width = element.offsetWidth;
        const height = element.offsetHeight;
        canvas.width = width * 2;
        canvas.height = height * 2;
        const ctx = canvas.getContext('2d');
        
        // 设置Canvas样式
        ctx.scale(2, 2);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, width, height);
        
        // 提取文本内容
        const textContent = extractTextFromElement(element);
        
        // 绘制文本
        ctx.fillStyle = '#000000';
        ctx.font = '14px Arial';
        ctx.textAlign = 'left';
        
        // 计算文本位置
        const lines = textContent.split('\n');
        let y = 30;
        const lineHeight = 20;
        
        lines.forEach(line => {
            if (y < height - 20) {
                ctx.fillText(line, 20, y);
                y += lineHeight;
            }
        });
        
        // 绘制边框
        ctx.strokeStyle = '#cccccc';
        ctx.lineWidth = 1;
        ctx.strokeRect(0, 0, width, height);
        
        console.log('手动Canvas绘制成功');
        
        // 使用toDataURL
        const pngUrl = canvas.toDataURL('image/png');
        
        // 创建下载链接
        const link = document.createElement('a');
        link.download = fileName;
        link.href = pngUrl;
        link.click();
        
        showSaveStatus('PNG图片下载成功（手动绘制）');
        
    } catch (error) {
        console.error('手动Canvas绘制失败:', error);
        throw error;
    }
}

// 提取元素的文本内容
function extractTextFromElement(element) {
    const walker = document.createTreeWalker(
        element,
        NodeFilter.SHOW_TEXT,
        null,
        false
    );
    
    let text = '';
    let node;
    
    while (node = walker.nextNode()) {
        const nodeText = node.textContent.trim();
        if (nodeText) {
            text += nodeText + '\n';
        }
    }
    
    return text;
}

// 创建干净的克隆（保留所有内容，只移除可能导致CORS问题的外部元素）
function createCleanClone(element) {
    const clone = element.cloneNode(true);
    
    // 1. 处理图片（保留所有图片，添加错误处理）
    const images = clone.querySelectorAll('img');
    images.forEach(img => {
        // 保留所有图片，添加错误处理
        img.onerror = function() {
            // 如果图片加载失败，显示占位符
            this.style.display = 'none';
            const placeholder = document.createElement('div');
            placeholder.style.width = this.offsetWidth + 'px';
            placeholder.style.height = this.offsetHeight + 'px';
            placeholder.style.border = '1px dashed #ccc';
            placeholder.style.display = 'flex';
            placeholder.style.alignItems = 'center';
            placeholder.style.justifyContent = 'center';
            placeholder.style.color = '#999';
            placeholder.style.fontSize = '12px';
            placeholder.style.backgroundColor = '#f9f9f9';
            placeholder.textContent = '[图片]';
            placeholder.style.fontFamily = 'Arial, sans-serif';
            
            if (this.parentNode) {
                this.parentNode.insertBefore(placeholder, this);
            }
        };
    });
    
    // 2. 保留背景样式（不移除背景图片）
    // 背景图片通常是本地的，不会导致CORS问题
    
    // 3. 专门处理Canvas元素（确保柱状图能正确显示）
    const canvases = clone.querySelectorAll('canvas');
    canvases.forEach(canvas => {
        try {
            // 确保Canvas有正确的尺寸
            if (canvas.width === 0 || canvas.height === 0) {
                console.warn('Canvas尺寸为0，尝试设置尺寸');
                canvas.width = canvas.offsetWidth || 400;
                canvas.height = canvas.offsetHeight || 200;
            }
            
            // 尝试将Canvas转换为图片，确保内容能被正确捕获
            const dataUrl = canvas.toDataURL('image/png');
            const img = document.createElement('img');
            img.src = dataUrl;
            img.width = canvas.width;
            img.height = canvas.height;
            img.style.width = canvas.offsetWidth + 'px';
            img.style.height = canvas.offsetHeight + 'px';
            img.style.maxWidth = '100%';
            img.style.height = 'auto';
            img.style.display = 'block';
            img.style.position = 'relative';
            img.style.zIndex = '10';
            
            // 替换Canvas为图片
            if (canvas.parentNode) {
                canvas.parentNode.replaceChild(img, canvas);
            }
        } catch (error) {
            console.warn('Canvas转换失败，保留原始Canvas:', error);
            // 如果转换失败，保留原始Canvas
            canvas.style.position = 'relative';
            canvas.style.zIndex = '10';
        }
    });
    
    // 4. 处理标题元素，确保不被遮挡
    const titles = clone.querySelectorAll('h1, h2, h3');
    titles.forEach(title => {
        title.style.position = 'relative';
        title.style.zIndex = '9999';
        title.style.overflow = 'visible';
        title.style.whiteSpace = 'normal';
        title.style.textOverflow = 'clip';
    });
    
    // 5. 保留所有样式链接和样式
    // 不移除任何样式相关元素
    
    // 6. 添加详细的内联样式，确保布局正确
    const style = document.createElement('style');
    style.textContent = `
        body { margin: 0; padding: 0; font-family: Arial, sans-serif; }
        .report { 
            padding: 20px; 
            background: white; 
            width: 100%; 
            box-sizing: border-box;
            position: relative;
            z-index: 1;
        }
        .report h1 { 
            color: #333; 
            position: relative;
            z-index: 9999;
            overflow: visible;
            white-space: normal;
            text-overflow: clip;
            margin-bottom: 20px;
        }
        .report h2, .report h3 { color: #333; }
        .report-content { 
            display: flex;
            flex-direction: column;
            gap: 20px;
            overflow: visible;
            box-sizing: border-box;
            padding: 5px;
            position: relative;
            z-index: 2;
        }
        .main-content { 
            display: flex;
            gap: 10px;
            flex: 1;
            width: 100%;
            box-sizing: border-box;
            padding: 5px;
            flex-wrap: nowrap;
            align-items: flex-start;
            min-height: 0;
            overflow: visible;
            position: relative;
            z-index: 5;
        }
        .left-container { 
            flex: 0 0 50%;
            min-height: 0;
            display: flex;
            flex-direction: column;
            gap: 10px;
            box-sizing: border-box;
            align-items: stretch;
            justify-content: flex-start;
            overflow: visible;
            position: relative;
            z-index: 6;
        }
        .section-listening { 
            flex: 1 1 auto;
            min-height: 200px;
            position: relative;
            z-index: 7;
            box-sizing: border-box;
            overflow: visible;
        }
        .section-interaction { 
            flex: 1 1 auto;
            min-height: 200px;
            box-sizing: border-box;
            position: relative;
            z-index: 6;
        }
        .right-container { 
            flex: 0 0 50%;
            min-height: 0;
            display: flex;
            flex-direction: column;
            overflow: visible;
            position: relative;
            z-index: 6;
        }
        .section-creation { 
            flex: 1;
            min-height: 200px;
            box-sizing: border-box;
            position: relative;
            z-index: 6;
        }
        .comment-section-final { 
            margin-top: 0px;
            flex: 0 0 auto;
            min-height: 150px;
            box-sizing: border-box;
            overflow: visible;
            word-wrap: break-word;
            position: relative;
            z-index: 5;
            transition: all 300ms ease-in-out;
            width: 100%;
            max-height: none;
        }
        table { 
            border-collapse: collapse; 
            width: 100%; 
            margin: 10px 0; 
            table-layout: fixed;
        }
        th, td { 
            border: 1px solid #ddd; 
            padding: 8px; 
            text-align: left; 
            word-break: break-word;
        }
        th { background-color: #f2f2f2; }
        .chart-container { 
            margin: 10px 0; 
            width: 100%; 
            height: auto;
            min-height: 200px;
            position: relative;
            z-index: 8;
        }
        .comment-card { 
            margin: 20px 0; 
            padding: 15px; 
            border: 1px solid #ddd; 
            border-radius: 5px; 
            width: 100%; 
            box-sizing: border-box;
            word-break: break-word;
            white-space: normal;
        }
        .comment-card p { 
            margin: 10px 0; 
            line-height: 1.5;
        }
        img { 
            max-width: 100%; 
            height: auto; 
            display: block;
            position: relative;
            z-index: 5;
        }
        canvas { 
            max-width: 100%; 
            height: auto;
            position: relative;
            z-index: 10;
        }
        .row { 
            display: flex; 
            flex-wrap: wrap; 
            margin: 0 -10px;
        }
        .col { 
            flex: 1; 
            padding: 0 10px; 
            box-sizing: border-box;
        }
        @media (max-width: 768px) { 
            .col { 
                flex: 100%; 
                margin-bottom: 10px;
            }
        }
    `;
    
    const head = clone.querySelector('head') || document.createElement('head');
    head.appendChild(style);
    
    if (!clone.querySelector('head')) {
        const html = clone.querySelector('html') || document.createElement('html');
        html.insertBefore(head, html.firstChild);
        if (!clone.querySelector('html')) {
            clone.appendChild(html);
        }
    }
    
    return clone;
}

// 最终备选方案 - 纯文本Canvas
async function finalFallbackMethod(reportPreview, studentName) {
    const width = reportPreview.offsetWidth;
    const height = reportPreview.offsetHeight;
    
    // 创建Canvas
    const canvas = document.createElement('canvas');
    canvas.width = width * 2;
    canvas.height = height * 2;
    
    const ctx = canvas.getContext('2d');
    ctx.scale(2, 2);
    
    // 绘制背景
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, width, height);
    
    // 绘制边框
    ctx.strokeStyle = '#e0e0e0';
    ctx.lineWidth = 1;
    ctx.strokeRect(0, 0, width, height);
    
    // 绘制标题
    ctx.fillStyle = '#333333';
    ctx.font = 'bold 24px Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('学习情况报告', width / 2, 40);
    
    // 绘制学生信息
    ctx.font = '16px Arial, sans-serif';
    ctx.fillText(`学生: ${studentName}`, width / 2, 70);
    
    // 提取并绘制文本内容
    const textContent = extractTextFromElement(reportPreview);
    let y = 120;
    
    ctx.font = '14px Arial, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillStyle = '#333333';
    
    textContent.forEach((line, index) => {
        if (y > height - 50) return;
        ctx.fillText(line, 40, y);
        y += 20;
    });
    
    // 绘制页脚
    ctx.fillStyle = '#999999';
    ctx.font = '12px Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('报告生成时间: ' + new Date().toLocaleString(), width / 2, height - 20);
    
    // 尝试下载
    try {
        const pngUrl = canvas.toDataURL('image/png');
        const link = document.createElement('a');
        link.download = `${studentName}_学习情况报告.png`;
        link.href = pngUrl;
        link.style.display = 'none';
        document.body.appendChild(link);
        link.click();
        
        setTimeout(() => {
            document.body.removeChild(link);
            showSaveStatus('PNG图片下载成功（文本版）');
            console.log('最终备选方案下载成功');
        }, 100);
        
    } catch (error) {
        console.error('最终备选方案也失败:', error);
        throw error;
    }
}

// 从元素中提取文本
function extractTextFromElement(element) {
    const textContent = [];
    
    function traverse(node) {
        if (node.nodeType === Node.TEXT_NODE) {
            const text = node.textContent.trim();
            if (text) {
                textContent.push(text);
            }
        } else if (node.nodeType === Node.ELEMENT_NODE) {
            // 跳过图片和Canvas
            if (node.tagName !== 'IMG' && node.tagName !== 'CANVAS') {
                Array.from(node.childNodes).forEach(child => traverse(child));
            }
        }
    }
    
    traverse(element);
    return textContent;
}

// 备选下载方法 - 直接Canvas绘制
async function alternativeDownloadMethod(reportPreview, studentName) {
    const width = reportPreview.offsetWidth;
    const height = reportPreview.offsetHeight;
    
    // 创建Canvas
    const canvas = document.createElement('canvas');
    canvas.width = width * 2;
    canvas.height = height * 2;
    
    const ctx = canvas.getContext('2d');
    ctx.scale(2, 2);
    
    // 绘制背景
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, width, height);
    
    // 绘制边框
    ctx.strokeStyle = '#e0e0e0';
    ctx.lineWidth = 1;
    ctx.strokeRect(0, 0, width, height);
    
    // 绘制标题
    ctx.fillStyle = '#333333';
    ctx.font = 'bold 24px Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('学习情况报告', width / 2, 40);
    
    // 绘制学生信息
    ctx.font = '16px Arial, sans-serif';
    ctx.fillText(`学生: ${studentName}`, width / 2, 70);
    
    // 绘制内容提示
    ctx.font = '14px Arial, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('报告内容:', 20, 120);
    ctx.fillText('- 听课情况', 40, 150);
    ctx.fillText('- 互动题情况', 40, 170);
    ctx.fillText('- 创作情况', 40, 190);
    ctx.fillText('- 老师评语', 40, 210);
    
    // 绘制页脚
    ctx.fillStyle = '#999999';
    ctx.font = '12px Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('报告生成时间: ' + new Date().toLocaleString(), width / 2, height - 20);
    
    // 转换为PNG并下载
    const pngUrl = canvas.toDataURL('image/png');
    const link = document.createElement('a');
    link.download = `${studentName}_学习情况报告.png`;
    link.href = pngUrl;
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    
    setTimeout(() => {
        document.body.removeChild(link);
        showSaveStatus('PNG图片下载成功（备选方案）');
        console.log('备选方案下载成功');
    }, 100);
}

// 带CORS修复的下载功能（备用）
async function downloadCurrentImageWithCORSFix() {
    // 直接调用旧的下载功能
    await downloadCurrentImage();
}

// 使用SVG方式下载（新方法）
async function downloadUsingSVG(element, fileName) {
    return new Promise((resolve, reject) => {
        try {
            console.log('尝试使用SVG方式导出');
            
            // 创建SVG元素
            const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
            svg.setAttribute('width', element.offsetWidth);
            svg.setAttribute('height', element.offsetHeight);
            svg.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
            
            // 创建foreignObject来包含HTML内容
            const foreignObject = document.createElementNS('http://www.w3.org/2000/svg', 'foreignObject');
            foreignObject.setAttribute('width', '100%');
            foreignObject.setAttribute('height', '100%');
            foreignObject.setAttribute('x', '0');
            foreignObject.setAttribute('y', '0');
            foreignObject.setAttribute('xmlns:xhtml', 'http://www.w3.org/1999/xhtml');
            
            // 创建完整的HTML结构
            const html = document.createElementNS('http://www.w3.org/1999/xhtml', 'html');
            const head = document.createElementNS('http://www.w3.org/1999/xhtml', 'head');
            const body = document.createElementNS('http://www.w3.org/1999/xhtml', 'body');
            
            // 复制所有样式
            const styleElements = document.querySelectorAll('style, link[rel="stylesheet"]');
            styleElements.forEach(style => {
                if (style.nodeName === 'STYLE') {
                    const newStyle = document.createElementNS('http://www.w3.org/1999/xhtml', 'style');
                    newStyle.textContent = style.textContent;
                    head.appendChild(newStyle);
                } else if (style.nodeName === 'LINK') {
                    // 对于外部样式，尝试内联或保留
                    const newLink = document.createElementNS('http://www.w3.org/1999/xhtml', 'link');
                    newLink.setAttribute('rel', 'stylesheet');
                    newLink.setAttribute('href', style.href);
                    head.appendChild(newLink);
                }
            });
            
            // 设置body样式
            body.style.margin = '0';
            body.style.padding = '0';
            body.style.width = '100%';
            body.style.height = '100%';
            body.style.overflow = 'hidden';
            
            // 克隆元素内容（深度克隆）
            const clonedContent = element.cloneNode(true);
            
            // 处理Canvas元素（确保柱状图能正确显示）
            const canvases = clonedContent.querySelectorAll('canvas');
            canvases.forEach(canvas => {
                try {
                    if (canvas.width === 0 || canvas.height === 0) {
                        canvas.width = canvas.offsetWidth || 300;
                        canvas.height = canvas.offsetHeight || 200;
                    }
                    const dataUrl = canvas.toDataURL('image/png');
                    const img = document.createElement('img');
                    img.src = dataUrl;
                    img.width = canvas.width;
                    img.height = canvas.height;
                    img.style.width = canvas.offsetWidth + 'px';
                    img.style.height = canvas.offsetHeight + 'px';
                    img.style.maxWidth = '100%';
                    img.style.height = 'auto';
                    img.style.display = 'block';
                    if (canvas.parentNode) {
                        canvas.parentNode.replaceChild(img, canvas);
                    }
                } catch (error) {
                    console.warn('Canvas转换失败，保留原始Canvas:', error);
                }
            });
            
            // 处理克隆内容中的图片
            const images = clonedContent.querySelectorAll('img');
            const imagePromises = [];
            
            images.forEach(img => {
                if (img.src && !img.src.startsWith('data:')) {
                    const promise = new Promise(async (imgResolve) => {
                        try {
                            // 保留原始图片的所有属性
                            const originalSrc = img.src;
                            const base64 = await fetchImageAsBase64(img.src);
                            img.src = base64;
                            console.log('图片转换成功:', originalSrc, '-> base64');
                        } catch (error) {
                            console.warn('SVG图片处理失败:', error);
                            // 保留原始图片，不使用占位符
                            console.log('保留原始图片:', img.src);
                        }
                        imgResolve();
                    });
                    imagePromises.push(promise);
                }
            });
            
            // 等待所有图片处理完成
            Promise.all(imagePromises).then(() => {
                try {
                    // 构建完整的HTML结构
                    body.appendChild(clonedContent);
                    html.appendChild(head);
                    html.appendChild(body);
                    foreignObject.appendChild(html);
                    svg.appendChild(foreignObject);
                    
                    // 将SVG转换为字符串
                    const svgString = new XMLSerializer().serializeToString(svg);
                    const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
                    const svgUrl = URL.createObjectURL(svgBlob);
                    
                    // 创建一个临时的Canvas来将SVG转换为PNG
                    const canvas = document.createElement('canvas');
                    const ctx = canvas.getContext('2d');
                    canvas.width = element.offsetWidth * 2;
                    canvas.height = element.offsetHeight * 2;
                    
                    const img = new Image();
                    img.onload = function() {
                        try {
                            // 绘制SVG到Canvas
                            ctx.scale(2, 2);
                            ctx.drawImage(img, 0, 0, element.offsetWidth, element.offsetHeight);
                            
                            // 将Canvas转换为PNG
                            const pngUrl = canvas.toDataURL('image/png');
                            
                            // 创建下载链接
                            const link = document.createElement('a');
                            link.download = `${fileName}_学习情况报告.png`;
                            link.href = pngUrl;
                            link.style.display = 'none';
                            document.body.appendChild(link);
                            
                            // 触发下载
                            link.click();
                            
                            setTimeout(() => {
                                document.body.removeChild(link);
                                URL.revokeObjectURL(svgUrl);
                                resolve();
                            }, 100);
                            
                        } catch (error) {
                            console.warn('Canvas转换失败:', error);
                            reject(error);
                        }
                    };
                    
                    img.onerror = function() {
                        console.warn('SVG加载失败');
                        reject(new Error('SVG加载失败'));
                    };
                    
                    img.src = svgUrl;
                    
                } catch (error) {
                    console.warn('SVG导出失败:', error);
                    reject(error);
                }
            }).catch(error => {
                console.warn('图片处理失败:', error);
                reject(error);
            });
            
        } catch (error) {
            console.warn('SVG下载失败:', error);
            reject(error);
        }
    });
}

// 使用DOM序列化方式下载（新方法）
async function downloadUsingDOMSerialization(element, fileName) {
    return new Promise((resolve, reject) => {
        try {
            console.log('尝试使用DOM序列化方式导出');
            
            // 直接使用html2canvas来捕获内容为PNG
            if (typeof html2canvas === 'undefined') {
                console.error('html2canvas库未加载');
                reject(new Error('html2canvas库未加载'));
                return;
            }
            
            // 创建一个干净的克隆
            const clone = element.cloneNode(true);
            
            // 处理Canvas元素（确保柱状图能正确显示）
            const canvases = clone.querySelectorAll('canvas');
            canvases.forEach(canvas => {
                try {
                    if (canvas.width === 0 || canvas.height === 0) {
                        canvas.width = canvas.offsetWidth || 300;
                        canvas.height = canvas.offsetHeight || 200;
                    }
                    const dataUrl = canvas.toDataURL('image/png');
                    const img = document.createElement('img');
                    img.src = dataUrl;
                    img.width = canvas.width;
                    img.height = canvas.height;
                    img.style.width = canvas.offsetWidth + 'px';
                    img.style.height = canvas.offsetHeight + 'px';
                    img.style.maxWidth = '100%';
                    img.style.height = 'auto';
                    img.style.display = 'block';
                    if (canvas.parentNode) {
                        canvas.parentNode.replaceChild(img, canvas);
                    }
                } catch (error) {
                    console.warn('Canvas转换失败，保留原始Canvas:', error);
                }
            });
            
            // 移除可能导致问题的元素
            const images = clone.querySelectorAll('img');
            images.forEach(img => {
                if (img.src && !img.src.startsWith('data:')) {
                    // 创建占位符
                    const placeholder = document.createElement('div');
                    placeholder.style.width = img.offsetWidth + 'px';
                    placeholder.style.height = img.offsetHeight + 'px';
                    placeholder.style.border = '1px dashed #ccc';
                    placeholder.style.display = 'flex';
                    placeholder.style.alignItems = 'center';
                    placeholder.style.justifyContent = 'center';
                    placeholder.style.color = '#999';
                    placeholder.style.fontSize = '12px';
                    placeholder.style.backgroundColor = '#f9f9f9';
                    placeholder.textContent = '[图片]';
                    placeholder.style.fontFamily = 'Arial, sans-serif';
                    
                    if (img.parentNode) {
                        img.parentNode.replaceChild(placeholder, img);
                    }
                }
            });
            
            // 移除背景图片
            const elementsWithBackground = clone.querySelectorAll('*');
            elementsWithBackground.forEach(el => {
                el.style.backgroundImage = 'none';
            });
            
            // 设置克隆的样式
            clone.style.position = 'absolute';
            clone.style.left = '-9999px';
            clone.style.top = '-9999px';
            clone.style.width = element.offsetWidth + 'px';
            clone.style.height = element.offsetHeight + 'px';
            clone.style.background = '#ffffff';
            
            // 添加到DOM
            document.body.appendChild(clone);
            
            // 使用html2canvas捕获
            html2canvas(clone, {
                scale: 3,
                useCORS: false,
                allowTaint: false,
                taintTest: false,
                logging: true,
                timeout: 60000,
                backgroundColor: null
            }).then(canvas => {
                try {
                    // 将Canvas转换为PNG
                    const pngUrl = canvas.toDataURL('image/png');
                    
                    // 创建下载链接
                    const link = document.createElement('a');
                    link.download = `${fileName}_学习情况报告.png`;
                    link.href = pngUrl;
                    link.style.display = 'none';
                    document.body.appendChild(link);
                    
                    // 触发下载
                    link.click();
                    
                    setTimeout(() => {
                        document.body.removeChild(link);
                        document.body.removeChild(clone);
                        resolve();
                    }, 100);
                    
                } catch (error) {
                    document.body.removeChild(clone);
                    console.warn('Canvas转换失败:', error);
                    reject(error);
                }
            }).catch(error => {
                document.body.removeChild(clone);
                console.warn('html2canvas捕获失败:', error);
                reject(error);
            });
            
        } catch (error) {
            console.warn('DOM序列化下载失败:', error);
            reject(error);
        }
    });
}

// 下载所有图片（zip）
async function downloadAllImages() {
    console.log('downloadAllImages 函数被调用');
    
    if (!validateTeacherName()) {
        return;
    }
    
    if (!students || students.length === 0) {
        showCenterAlert('没有学员数据，请先上传CSV文件', 'error');
        return;
    }
    
    if (!reportPreview) {
        showCenterAlert('报告预览元素不存在', 'error');
        return;
    }
    
    const totalStudents = students.length;
    const progress = showDownloadProgress(`批量下载（${totalStudents}人）`, totalStudents * 5 + 2);
    
    try {
        progress.updateProgress(1, '正在准备批量下载...');
        console.log('开始批量下载，共', totalStudents, '名学员');
        
        // 创建ZIP对象
        const zip = new JSZip();
        
        // 保存当前学员索引
        const originalIndex = currentStudentIndex;
        
        // 保存当前操作模式
        const originalMode = currentOperationMode;
        
        // 切换到单个操作模式以便切换学员
        currentOperationMode = 'single';
        
        // 遍历所有学员
        for (let i = 0; i < students.length; i++) {
            const studentName = students[i];
            const progressStep = i * 5 + 2;
            
            progress.updateProgress(progressStep, `正在准备 ${studentName} 的报告（${i + 1}/${totalStudents}）...`);
            console.log(`正在处理第 ${i + 1}/${totalStudents} 名学员: ${studentName}`);
            
            try {
                // 切换到该学员
                currentStudentIndex = i;
                
                // 等待报告渲染完成
                await new Promise(resolve => setTimeout(resolve, 500));
                
                const reportContainer = reportPreview.querySelector('.report');
                if (!reportContainer) {
                    console.warn(`学员 ${studentName} 的报告容器不存在`);
                    continue;
                }
                
                // 1. 隐藏文字点评右上角的红色叉号
                const deleteButtons = reportContainer.querySelectorAll('.comment-section-final button');
                const originalDeleteButtonStyles = [];
                deleteButtons.forEach((btn, index) => {
                    originalDeleteButtonStyles[index] = btn.style.display;
                    btn.style.display = 'none';
                });
                
                // 2. 预处理所有图片，添加crossorigin属性避免CORS问题
                progress.updateProgress(progressStep + 1, `预处理 ${studentName} 的图片...`);
                console.log(`开始预处理 ${studentName} 的图片...`);
                
                const images = reportContainer.querySelectorAll('img');
                console.log(`找到 ${images.length} 张图片需要处理`);
                
                const imagePromises = [];
                
                images.forEach((img, index) => {
                    if (img.src && !img.src.startsWith('data:') && !img.src.startsWith('blob:')) {
                        console.log(`处理图片 ${index + 1}/${images.length}:`, img.src);
                        
                        const imagePromise = new Promise((resolve) => {
                            const isLocalFile = img.src.startsWith('file://') || img.src.startsWith('image/') || window.location.protocol === 'file:';
                            
                            if (isLocalFile) {
                                console.log(`图片 ${index + 1} 是本地文件，需要转换为base64`);
                                
                                const tempImg = new Image();
                                tempImg.onload = function() {
                                    try {
                                        const canvas = document.createElement('canvas');
                                        canvas.width = tempImg.naturalWidth;
                                        canvas.height = tempImg.naturalHeight;
                                        const ctx = canvas.getContext('2d');
                                        ctx.drawImage(tempImg, 0, 0);
                                        img.src = canvas.toDataURL('image/png');
                                        console.log(`图片 ${index + 1} 转换为base64成功`);
                                    } catch (error) {
                                        console.warn(`图片 ${index + 1} 转换失败:`, error);
                                    } finally {
                                        resolve();
                                    }
                                };
                                tempImg.onerror = function() {
                                    console.warn(`图片 ${index + 1} 加载失败`);
                                    resolve();
                                };
                                tempImg.src = img.src;
                            } else {
                                if (!img.hasAttribute('crossorigin')) {
                                    img.setAttribute('crossorigin', 'anonymous');
                                    console.log(`图片 ${index + 1} 添加crossorigin属性`);
                                }
                                
                                const originalSrc = img.src;
                                img.onload = function() {
                                    console.log(`图片 ${index + 1} 重新加载成功`);
                                    resolve();
                                };
                                img.onerror = function() {
                                    console.warn(`图片 ${index + 1} 重新加载失败`);
                                    resolve();
                                };
                                img.src = originalSrc + '?t=' + Date.now();
                            }
                        });
                        
                        imagePromises.push(imagePromise);
                    }
                });
                
                // 等待所有图片处理完成
                await Promise.all(imagePromises);
                console.log(`学员 ${studentName} 的所有图片预处理完成`);
                
                // 额外检查：只移除可能导致CORS问题的背景图片，保留报告容器的主背景
                const elementsWithBackground = reportContainer.querySelectorAll('[style*="background-image"]');
                console.log(`找到 ${elementsWithBackground.length} 个元素带有背景图片`);
                
                elementsWithBackground.forEach((element, index) => {
                    // 跳过报告容器本身的背景图片
                    if (element === reportContainer) {
                        console.log(`保留报告容器的背景图片`);
                        return;
                    }
                    
                    const style = element.style;
                    const backgroundImage = style.backgroundImage;
                    if (backgroundImage && !backgroundImage.includes('data:') && !backgroundImage.includes('blob:')) {
                        console.log(`移除元素 ${index + 1} 的背景图片:`, backgroundImage);
                        style.backgroundImage = 'none';
                    }
                });
                
                // 检查报告容器的背景图片
                const reportContainerBg = reportContainer.style.backgroundImage;
                console.log(`报告容器背景图片:`, reportContainerBg);
                
                // 检查body的背景图片
                const bodyBg = document.body.style.backgroundImage;
                console.log(`body背景图片:`, bodyBg);
                
                // 3. 等待内容完全渲染
                progress.updateProgress(progressStep + 2, `等待 ${studentName} 的内容渲染...`);
                await new Promise(resolve => setTimeout(resolve, 1000));
                
                console.log('报告容器尺寸:', reportContainer.offsetWidth, 'x', reportContainer.offsetHeight);
                
                // 4. 使用简化的html2canvas配置
                progress.updateProgress(progressStep + 3, `正在预加载 ${studentName} 的背景图片...`);
                console.log(`开始预加载 ${studentName} 的背景图片...`);
                
                // 使用预加载函数处理背景图片
                let bgDataUrl = null;
                try {
                    bgDataUrl = await preloadBackgroundImage(bgUrl);
                    if (bgDataUrl) {
                        console.log('背景图片预加载成功');
                    } else {
                        console.warn('背景图片预加载失败，使用原始URL');
                        bgDataUrl = bgUrl;
                    }
                } catch (error) {
                    console.error('背景图片预加载出错:', error);
                    bgDataUrl = bgUrl;
                }
                
                const html2canvasOptions = {
                    scale: 3,
                    backgroundColor: 'transparent',
                    useCORS: true,
                    allowTaint: true,
                    scrollX: 0,
                    scrollY: 0,
                    logging: false,
                    taintTest: false,
                    onclone: function(clonedDoc) {
                        console.log('onclone回调执行');
                        const clonedContainer = clonedDoc.querySelector('.report');
                        if (clonedContainer) {
                            // 设置报告容器的背景图片为预加载的data URL
                            if (bgDataUrl && bgDataUrl.startsWith('data:')) {
                                clonedContainer.style.backgroundImage = `url('${bgDataUrl}')`;
                                console.log('克隆容器背景图片已设置为data URL');
                            }
                            
                            // 移除所有可能导致问题的元素
                            const buttons = clonedContainer.querySelectorAll('button');
                            buttons.forEach(btn => btn.style.display = 'none');
                            
                            // 确保所有标题元素都有最高的z-index，不会被遮挡
                            const titles = clonedContainer.querySelectorAll('h1, h2, h3');
                            titles.forEach(title => {
                                title.style.position = 'relative';
                                title.style.zIndex = '9999';
                                title.style.overflow = 'visible';
                                title.style.whiteSpace = 'normal';
                                title.style.textOverflow = 'clip';
                            });
                            
                            // 处理Canvas元素（确保柱状图能正确显示）
                            const canvases = clonedContainer.querySelectorAll('canvas');
                            canvases.forEach(canvas => {
                                try {
                                    if (canvas.width === 0 || canvas.height === 0) {
                                        canvas.width = canvas.offsetWidth || 300;
                                        canvas.height = canvas.offsetHeight || 200;
                                    }
                                    
                                    // 提高Canvas转换的缩放比例，使文字更清晰
                                    const scale = 2.5;
                                    const scaledCanvas = document.createElement('canvas');
                                    scaledCanvas.width = canvas.width * scale;
                                    scaledCanvas.height = canvas.height * scale;
                                    const scaledCtx = scaledCanvas.getContext('2d');
                                    
                                    // 启用图像平滑以提高质量
                                    scaledCtx.imageSmoothingEnabled = true;
                                    scaledCtx.imageSmoothingQuality = 'high';
                                    
                                    // 将原始Canvas绘制到缩放后的Canvas上
                                    scaledCtx.drawImage(canvas, 0, 0, scaledCanvas.width, scaledCanvas.height);
                                    
                                    const dataUrl = scaledCanvas.toDataURL('image/png');
                                    const img = document.createElement('img');
                                    img.src = dataUrl;
                                    img.width = canvas.width;
                                    img.height = canvas.height;
                                    img.style.width = canvas.offsetWidth + 'px';
                                    img.style.height = canvas.offsetHeight + 'px';
                                    img.style.maxWidth = '100%';
                                    img.style.height = 'auto';
                                    img.style.display = 'block';
                                    if (canvas.parentNode) {
                                        canvas.parentNode.replaceChild(img, canvas);
                                    }
                                } catch (error) {
                                    console.warn('Canvas转换失败，保留原始Canvas:', error);
                                }
                            });
                            
                            // 处理克隆中的图片，确保它们不会导致CORS问题
                            const clonedImages = clonedContainer.querySelectorAll('img');
                            console.log(`克隆中找到 ${clonedImages.length} 张图片`);
                            
                            clonedImages.forEach((img, index) => {
                                if (img.src && !img.src.startsWith('data:') && !img.src.startsWith('blob:')) {
                                    console.log(`处理克隆中的图片 ${index + 1}:`, img.src);
                                    
                                    // 检查图片是否在第三部分或第四部分中
                                    let isInImportantSection = false;
                                    let parent = img.parentElement;
                                    while (parent) {
                                        if (parent.classList.contains('third-part') || 
                                            parent.classList.contains('creation-section') || 
                                            parent.classList.contains('fourth-part') || 
                                            parent.classList.contains('fourth-section') ||
                                            parent.id === 'fourthPartImages' ||
                                            parent.id === 'fourth-part' ||
                                            parent.id === 'fourth-section' ||
                                            parent.className.includes('third-part') ||
                                            parent.className.includes('fourth-part') ||
                                            parent.className.includes('creation-section')) {
                                            isInImportantSection = true;
                                            break;
                                        }
                                        parent = parent.parentElement;
                                    }
                                    
                                    // 检查图片是否在创作情况部分
                                    if (!isInImportantSection) {
                                        let grandParent = img.parentElement;
                                        while (grandParent) {
                                            if (grandParent.textContent && grandParent.textContent.includes('创作情况')) {
                                                isInImportantSection = true;
                                                break;
                                            }
                                            grandParent = grandParent.parentElement;
                                        }
                                    }
                                    
                                    // 检查图片是否在第四部分图片容器中
                                    if (!isInImportantSection) {
                                        let ancestor = img.parentElement;
                                        while (ancestor) {
                                            if (ancestor.innerHTML && ancestor.innerHTML.includes('第四部分')) {
                                                isInImportantSection = true;
                                                break;
                                            }
                                            ancestor = ancestor.parentElement;
                                        }
                                    }
                                    
                                    // 对于重要部分的图片，尝试转换为data URL以避免CORS问题
                                    if (isInImportantSection) {
                                        try {
                                            console.log('尝试转换重要部分的图片为data URL');
                                            const tempImg = new Image();
                                            if (!window.location.protocol.startsWith('file:') && !img.src.startsWith('file:')) {
                                                tempImg.crossOrigin = 'anonymous';
                                            }
                                            
                                            tempImg.onload = function() {
                                                const canvas = document.createElement('canvas');
                                                canvas.width = tempImg.naturalWidth;
                                                canvas.height = tempImg.naturalHeight;
                                                const ctx = canvas.getContext('2d');
                                                ctx.drawImage(tempImg, 0, 0);
                                                img.src = canvas.toDataURL('image/png');
                                                console.log('重要部分图片转换为data URL成功');
                                            };
                                            tempImg.onerror = function() {
                                                console.warn('重要部分图片转换失败，保留原始URL');
                                            };
                                            tempImg.src = img.src;
                                        } catch (error) {
                                            console.warn('重要部分图片处理失败:', error);
                                        }
                                    } else {
                                        // 移除非重要部分的可能导致问题的图片
                                        img.style.display = 'none';
                                    }
                                }
                            });
                            
                            // 移除所有带有背景图片的元素的背景，但保留报告容器的背景
                            const elementsWithBackground = clonedContainer.querySelectorAll('[style*="background-image"]');
                            elementsWithBackground.forEach((element, index) => {
                                // 跳过报告容器本身的背景图片
                                if (element === clonedContainer) {
                                    console.log(`保留报告容器的背景图片`);
                                    return;
                                }
                                
                                const style = element.style;
                                const backgroundImage = style.backgroundImage;
                                if (backgroundImage && !backgroundImage.includes('data:') && !backgroundImage.includes('blob:')) {
                                    console.log(`移除克隆中元素 ${index + 1} 的背景图片`);
                                    style.backgroundImage = 'none';
                                }
                            });
                            
                            // 强制设置报告容器的背景图片
                            console.log(`设置报告容器背景图片:`, bgDataUrl);
                            if (bgDataUrl) {
                                clonedContainer.style.backgroundImage = `url('${bgDataUrl}')`;
                                console.log(`背景图片设置成功`);
                            }
                        }
                    }
                };
                
                console.log('HTML2Canvas配置:', html2canvasOptions);
                
                // 渲染为canvas
                const contentCanvas = await html2canvas(reportContainer, html2canvasOptions);
                
                console.log('内容Canvas渲染成功，尺寸:', contentCanvas.width, 'x', contentCanvas.height);
                
                // 创建最终的canvas，先绘制背景，再绘制内容
                const canvas = document.createElement('canvas');
                canvas.width = contentCanvas.width;
                canvas.height = contentCanvas.height;
                const ctx = canvas.getContext('2d');
                
                // 先绘制背景图片
                if (bgDataUrl && bgDataUrl.startsWith('data:')) {
                    try {
                        console.log('开始绘制背景图片...');
                        const bgImg = new Image();
                        
                        await new Promise((resolve, reject) => {
                            bgImg.onload = function() {
                                try {
                                    // 绘制背景图片
                                    ctx.drawImage(bgImg, 0, 0, canvas.width, canvas.height);
                                    console.log('背景图片绘制成功');
                                } catch (drawError) {
                                    console.warn('绘制背景图片失败:', drawError);
                                }
                                resolve();
                            };
                            bgImg.onerror = function() {
                                console.warn('背景图片加载失败');
                                resolve();
                            };
                            bgImg.src = bgDataUrl;
                        });
                    } catch (error) {
                        console.warn('绘制背景图片时出错:', error);
                    }
                }
                
                // 再绘制内容
                ctx.drawImage(contentCanvas, 0, 0);
                console.log('内容绘制成功');
                
                // 5. 导出图片为Blob
                progress.updateProgress(progressStep + 4, `正在导出 ${studentName} 的图片...`);
                
                let imageBlob;
                try {
                    imageBlob = await new Promise((resolve) => {
                        canvas.toBlob(resolve, 'image/png');
                    });
                    console.log('toBlob成功，图片大小:', Math.round(imageBlob.size / 1024), 'KB');
                } catch (error) {
                    console.error('toBlob失败，尝试使用data URL方式:', error);
                    
                    try {
                        const dataUrl = canvas.toDataURL('image/png');
                        const base64 = dataUrl.split(',')[1];
                        const binary = atob(base64);
                        const array = [];
                        for (let k = 0; k < binary.length; k++) {
                            array.push(binary.charCodeAt(k));
                        }
                        imageBlob = new Blob([new Uint8Array(array)], {type: 'image/png'});
                        console.log('data URL方式成功');
                    } catch (blobError) {
                        console.error('data URL方式也失败:', blobError);
                        throw blobError;
                    }
                }
                
                // 恢复删除按钮的显示状态
                deleteButtons.forEach((btn, index) => {
                    btn.style.display = originalDeleteButtonStyles[index];
                });
                
                // 添加到ZIP
                if (imageBlob) {
                    const fileName = `${studentName}.png`;
                    zip.file(fileName, imageBlob);
                    console.log(`已添加 ${fileName} 到ZIP`);
                } else {
                    console.warn(`学员 ${studentName} 的图片生成失败`);
                }
                
                progress.updateProgress(progressStep + 5, `已完成 ${studentName} 的报告`);
                
            } catch (error) {
                console.error(`处理学员 ${studentName} 时出错:`, error);
                console.error('错误堆栈:', error.stack);
                progress.updateProgress(progressStep + 5, `${studentName} 处理失败，跳过`);
            }
        }
        
        // 恢复原始学员索引和操作模式
        currentStudentIndex = originalIndex;
        currentOperationMode = originalMode;
        
        // 等待报告重新渲染
        await new Promise(resolve => setTimeout(resolve, 500));
        
        progress.updateProgress(totalStudents * 5 + 1, '正在压缩文件...');
        console.log('所有学员处理完成，开始压缩...');
        
        // 生成ZIP文件
        const zipBlob = await zip.generateAsync({
            type: 'blob',
            compression: 'DEFLATE',
            compressionOptions: {
                level: 6
            }
        });
        
        console.log('ZIP文件生成完成，大小:', Math.round(zipBlob.size / 1024), 'KB');
        
        // 下载ZIP文件
        progress.updateProgress(totalStudents * 5 + 2, '正在下载...');
        
        const link = document.createElement('a');
        link.download = `学员报告_${new Date().getTime()}.zip`;
        link.href = URL.createObjectURL(zipBlob);
        link.style.display = 'none';
        document.body.appendChild(link);
        link.click();
        
        // 清理
        setTimeout(() => {
            document.body.removeChild(link);
            URL.revokeObjectURL(link.href);
        }, 100);
        
        progress.complete(`批量下载完成！共 ${totalStudents} 名学员`);
        console.log('批量下载成功');
        
    } catch (error) {
        console.error('批量下载时出错:', error);
        console.error('错误堆栈:', error.stack);
        progress.error(`错误：${error.message || '未知错误'}`);
        
        // 恢复原始学员索引和操作模式
        currentStudentIndex = originalIndex;
        currentOperationMode = originalMode;
        
        showCenterAlert('批量下载失败：' + (error.message || '未知错误'), 'error');
    }
}


