class FileUploader {
  // ... 之前的代码 ...

  // 新增 multipart 上传配置
  constructor(options = {}) {
    this.chunkSize = options.chunkSize || 2 * 1024 * 1024;
    this.threads = options.threads || 3;
    this.batchSize = options.batchSize || 5; // 每批次上传的切片数
    this.retryTimes = options.retryTimes || 3;
    this.file = null;
    this.chunks = [];
    this.uploadedChunks = new Set();
  }

  // 批量上传切片
  async uploadChunksBatch(chunks) {
    const formData = new FormData();
    chunks.forEach(chunk => {
      formData.append('chunks', chunk.file);
      formData.append('indexes', chunk.index);
    });
    formData.append('hash', this.hash);
    formData.append('filename', this.file.name);

    try {
      const response = await fetch('/upload/multipart', {
        method: 'POST',
        body: formData,
        headers: {
          'X-Batch-Upload': 'true'
        }
      });

      if (response.ok) {
        const result = await response.json();
        result.successIndexes.forEach(index => {
          this.uploadedChunks.add(index);
        });
        this.updateProgress();
        return result;
      }
      throw new Error('Batch upload failed');
    } catch (error) {
      throw new Error(`Batch upload failed: ${error.message}`);
    }
  }

  // 改进的并发控制，使用批量上传
  async uploadChunks() {
    const chunks = this.chunks;
    const batchSize = this.batchSize;
    const pool = [];
    
    // 将切片分组
    const batches = [];
    for (let i = 0; i < chunks.length; i += batchSize) {
      const batch = chunks.slice(i, i + batchSize)
        .filter(chunk => !this.uploadedChunks.has(chunk.index));
      if (batch.length > 0) {
        batches.push(batch);
      }
    }

    // 控制并发上传批次
    for (let i = 0; i < batches.length; i++) {
      const batch = batches[i];
      const task = this.uploadChunksBatch(batch);
      pool.push(task);

      if (pool.length === this.threads) {
        await Promise.race(pool);
        const index = pool.findIndex(p => p.status === 'fulfilled');
        pool.splice(index, 1);
      }
    }
    await Promise.all(pool);
  }

  // 添加重试机制
  async uploadWithRetry(fn, retryTimes = this.retryTimes) {
    let lastError = null;
    
    for (let i = 0; i < retryTimes; i++) {
      try {
        return await fn();
      } catch (err) {
        lastError = err;
        console.warn(`Retry ${i + 1}/${retryTimes}:`, err);
        // 指数退避策略
        await new Promise(resolve => 
          setTimeout(resolve, Math.min(1000 * Math.pow(2, i), 10000))
        );
      }
    }
    throw lastError;
  }

  // 优化的上传入口
  async upload(file, onProgress) {
    this.onProgress = onProgress;
    
    try {
      // 1. 切片
      this.createFileChunks(file);
      
      // 2. 计算hash（可以用Web Worker优化）
      this.hash = await this.calculateHash();
      
      // 3. 验证秒传
      const exists = await this.checkFileExist();
      if (exists) {
        this.onProgress?.(100);
        return { status: 'success', message: '秒传成功' };
      }
      
      // 4. 获取已上传的切片信息
      await this.verifyUpload();
      
      // 5. 执行批量上传（带重试机制）
      await this.uploadWithRetry(() => this.uploadChunks());
      
      // 6. 请求合并切片
      await this.uploadWithRetry(() => this.mergeRequest());
      
      return { status: 'success', message: '上传完成' };
    } catch (error) {
      return { status: 'error', message: error.message };
    }
  }
}