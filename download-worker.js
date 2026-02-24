// 下载Worker - 处理批量图片生成和ZIP压缩

importScripts('https://cdn.jsdelivr.net/npm/jszip@3.10.1/dist/jszip.min.js');

// 监听消息
self.addEventListener('message', async function(e) {
    const { task, data } = e.data;
    
    try {
        switch (task) {
            case 'generateImage':
                await handleGenerateImage(data);
                break;
            case 'createZip':
                await handleCreateZip(data);
                break;
            default:
                self.postMessage({ type: 'error', error: 'Unknown task' });
        }
    } catch (error) {
        console.error('Worker error:', error);
        self.postMessage({ type: 'error', error: error.message });
    }
});

// 处理图片生成
async function handleGenerateImage(data) {
    const { student, index, total } = data;
    
    self.postMessage({ 
        type: 'progress', 
        student, 
        index, 
        total, 
        message: `处理学员 ${student} (${index + 1}/${total})` 
    });
    
    // 这里实际上只是模拟处理，真正的DOM操作需要在主线程进行
    // 主线程会将生成的图片数据传递给Worker进行ZIP打包
    self.postMessage({ 
        type: 'imageGenerated', 
        student, 
        index 
    });
}

// 处理ZIP创建
async function handleCreateZip(data) {
    const { images, date } = data;
    const zip = new JSZip();
    
    self.postMessage({ 
        type: 'zipProgress', 
        percentage: 0, 
        message: '开始创建ZIP文件...' 
    });
    
    // 添加图片到ZIP
    for (let i = 0; i < images.length; i++) {
        const { student, blob } = images[i];
        zip.file(`${student}_学习情况报告.png`, blob);
        
        const progress = Math.round((i / images.length) * 80);
        self.postMessage({ 
            type: 'zipProgress', 
            percentage: progress, 
            message: `添加图片 ${i + 1}/${images.length} 到ZIP...` 
        });
    }
    
    // 生成ZIP
    self.postMessage({ 
        type: 'zipProgress', 
        percentage: 80, 
        message: '生成ZIP文件...' 
    });
    
    const zipBlob = await zip.generateAsync({ 
        type: 'blob', 
        compression: 'DEFLATE', 
        compressionOptions: { level: 6 } // 平衡速度与压缩率
    });
    
    self.postMessage({ 
        type: 'zipProgress', 
        percentage: 100, 
        message: 'ZIP文件生成完成！' 
    });
    
    // 发送完成消息
    self.postMessage({ 
        type: 'zipCreated', 
        zipBlob: zipBlob, 
        fileName: `学员图片集合-${date}.zip` 
    });
}
