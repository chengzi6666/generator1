// 查看本地存储中的王天晟操作记录
// 注意：此脚本需要在支持localStorage的环境中运行，如浏览器控制台

// 模拟localStorage读取函数
function readLocalStorage(key) {
    // 在Node.js环境中，我们可以尝试读取Chrome的本地存储文件
    // 但由于安全限制，这里我们只能提供一个示例
    console.log('尝试读取本地存储键:', key);
    return null;
}

// 显示王天晟的操作记录
function showWangTianshengRecords() {
    console.log('=== 查看王天晟的操作记录 ===');
    
    // 模拟从本地存储加载学员操作记录
    try {
        // 尝试直接访问localStorage（在浏览器环境中运行时）
        if (typeof localStorage !== 'undefined') {
            const records = localStorage.getItem('student_operation_records');
            if (records) {
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
                }
            } else {
                console.log('本地存储中没有学员操作记录');
            }
            
            // 查看操作日志
            const logs = localStorage.getItem('operation_logs');
            if (logs) {
                const parsedLogs = JSON.parse(logs);
                const wangtianshengLogs = parsedLogs.filter(log => {
                    return log.details && (log.details.student === '王天晟' || log.details.studentName === '王天晟');
                });
                if (wangtianshengLogs.length > 0) {
                    console.log('与王天晟相关的操作日志:', wangtianshengLogs);
                } else {
                    console.log('没有与王天晟相关的操作日志');
                }
            } else {
                console.log('本地存储中没有操作日志');
            }
        } else {
            console.log('此环境不支持localStorage，请在浏览器控制台中运行此脚本');
        }
    } catch (e) {
        console.error('错误:', e);
    }
}

// 运行函数
showWangTianshengRecords();

console.log('\n=== 如何在浏览器中查看王天晟的操作记录 ===');
console.log('1. 打开浏览器');
console.log('2. 访问 file:///c:/Users/matiancheng/第三版/index.html');
console.log('3. 按 F12 打开开发者工具');
console.log('4. 点击 "控制台" 或 "Console" 选项卡');
console.log('5. 查看王天晟的操作记录，包括第三部分第一张图片');
