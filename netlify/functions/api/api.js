const fs = require('fs');
const path = require('path');

// 数据文件路径（使用临时目录或内存存储）
let tasks = [];
let prizes = [];
let records = [];

// 初始化默认数据
function initDefaultData() {
    if (prizes.length === 0) {
        prizes = [
            { id: 1, name: '一等奖 999元现金红包', icon: '💰', probability: 5, stock: 10, desc: '999元现金红包', status: 'active' },
            { id: 2, name: '二等奖 50元话费', icon: '📱', probability: 10, stock: 50, desc: '50元手机话费', status: 'active' },
            { id: 3, name: '三等奖 20元优惠券', icon: '🎫', probability: 15, stock: 100, desc: '20元优惠券', status: 'active' },
            { id: 4, name: '四等奖 精美礼品一份', icon: '🎁', probability: 20, stock: 200, desc: '精美礼品一份', status: 'active' },
            { id: 5, name: '谢谢参与', icon: '😊', probability: 50, stock: 9999, desc: '谢谢参与', status: 'active' }
        ];
    }

    if (tasks.length === 0) {
        tasks = [
            {
                id: 1,
                name: '五一惊喜出行季',
                desc: '五一劳动节抽奖活动',
                startDate: '2026-05-01T00:00',
                endDate: '2026-05-31T23:59',
                prizeIds: [1, 2, 3, 4, 5],
                status: 'active',
                createdAt: new Date().toISOString()
            }
        ];
    }

    if (records.length === 0) {
        records = [];
    }
}

// 响应工具函数
function jsonResponse(statusCode, data) {
    return {
        statusCode: statusCode,
        headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type'
        },
        body: JSON.stringify(data)
    };
}

// 处理请求
exports.handler = async (event, context) => {
    // 初始化数据
    initDefaultData();

    // 处理 OPTIONS 请求（CORS预检）
    if (event.httpMethod === 'OPTIONS') {
        return jsonResponse(200, { success: true });
    }

    const { path, httpMethod, body } = event;
    const pathParts = path.split('/').filter(p => p);
    
    // 路由处理
    try {
        // 任务管理
        if (pathParts[0] === 'tasks') {
            if (httpMethod === 'GET') {
                if (pathParts[1]) {
                    // 获取单个任务
                    const taskId = parseInt(pathParts[1]);
                    const task = tasks.find(t => t.id === taskId);
                    if (task) {
                        return jsonResponse(200, { success: true, data: task });
                    }
                    return jsonResponse(404, { success: false, message: '任务不存在' });
                }
                // 获取所有任务
                return jsonResponse(200, { success: true, data: tasks });
            }

            if (httpMethod === 'POST') {
                // 创建任务
                const newTask = {
                    id: Date.now(),
                    ...JSON.parse(body),
                    status: 'active',
                    createdAt: new Date().toISOString()
                };
                tasks.push(newTask);
                return jsonResponse(200, { success: true, data: newTask });
            }

            if (httpMethod === 'PUT' && pathParts[1]) {
                // 更新任务
                const taskId = parseInt(pathParts[1]);
                const index = tasks.findIndex(t => t.id === taskId);
                if (index !== -1) {
                    tasks[index] = { ...tasks[index], ...JSON.parse(body) };
                    return jsonResponse(200, { success: true, data: tasks[index] });
                }
                return jsonResponse(404, { success: false, message: '任务不存在' });
            }

            if (httpMethod === 'DELETE' && pathParts[1]) {
                // 删除任务
                const taskId = parseInt(pathParts[1]);
                const filteredTasks = tasks.filter(t => t.id !== taskId);
                if (tasks.length !== filteredTasks.length) {
                    tasks = filteredTasks;
                    return jsonResponse(200, { success: true, message: '删除成功' });
                }
                return jsonResponse(404, { success: false, message: '任务不存在' });
            }
        }

        // 奖品管理
        if (pathParts[0] === 'prizes') {
            if (httpMethod === 'GET') {
                if (pathParts[1]) {
                    const prizeId = parseInt(pathParts[1]);
                    const prize = prizes.find(p => p.id === prizeId);
                    if (prize) {
                        return jsonResponse(200, { success: true, data: prize });
                    }
                    return jsonResponse(404, { success: false, message: '奖品不存在' });
                }
                return jsonResponse(200, { success: true, data: prizes });
            }

            if (httpMethod === 'POST') {
                const newPrize = {
                    id: Date.now(),
                    ...JSON.parse(body),
                    status: 'active'
                };
                prizes.push(newPrize);
                return jsonResponse(200, { success: true, data: newPrize });
            }

            if (httpMethod === 'PUT' && pathParts[1]) {
                const prizeId = parseInt(pathParts[1]);
                const index = prizes.findIndex(p => p.id === prizeId);
                if (index !== -1) {
                    prizes[index] = { ...prizes[index], ...JSON.parse(body) };
                    return jsonResponse(200, { success: true, data: prizes[index] });
                }
                return jsonResponse(404, { success: false, message: '奖品不存在' });
            }

            if (httpMethod === 'DELETE' && pathParts[1]) {
                const prizeId = parseInt(pathParts[1]);
                const filteredPrizes = prizes.filter(p => p.id !== prizeId);
                if (prizes.length !== filteredPrizes.length) {
                    prizes = filteredPrizes;
                    return jsonResponse(200, { success: true, message: '删除成功' });
                }
                return jsonResponse(404, { success: false, message: '奖品不存在' });
            }
        }

        // 抽奖记录管理
        if (pathParts[0] === 'records') {
            if (httpMethod === 'GET') {
                let filteredRecords = records;
                if (event.queryStringParameters && event.queryStringParameters.taskId) {
                    const taskId = parseInt(event.queryStringParameters.taskId);
                    filteredRecords = records.filter(r => r.taskId === taskId);
                }
                return jsonResponse(200, { success: true, data: filteredRecords });
            }

            if (httpMethod === 'POST') {
                const newRecord = {
                    id: Date.now(),
                    ...JSON.parse(body),
                    createdAt: new Date().toISOString(),
                    shipped: false
                };
                records.push(newRecord);
                return jsonResponse(200, { success: true, data: newRecord });
            }

            if (httpMethod === 'PUT' && pathParts[1]) {
                const recordId = parseInt(pathParts[1]);
                const index = records.findIndex(r => r.id === recordId);
                if (index !== -1) {
                    records[index] = { ...records[index], ...JSON.parse(body) };
                    return jsonResponse(200, { success: true, data: records[index] });
                }
                return jsonResponse(404, { success: false, message: '记录不存在' });
            }

            if (httpMethod === 'DELETE' && pathParts[1]) {
                const recordId = parseInt(pathParts[1]);
                const filteredRecords = records.filter(r => r.id !== recordId);
                if (records.length !== filteredRecords.length) {
                    records = filteredRecords;
                    return jsonResponse(200, { success: true, message: '删除成功' });
                }
                return jsonResponse(404, { success: false, message: '记录不存在' });
            }
        }

        // 抽奖接口
        if (pathParts[0] === 'lottery' && pathParts[1] && pathParts[2] === 'prizes') {
            if (httpMethod === 'GET') {
                const taskId = parseInt(pathParts[1]);
                const task = tasks.find(t => t.id === taskId);
                if (!task) {
                    return jsonResponse(404, { success: false, message: '任务不存在' });
                }
                const taskPrizes = prizes.filter(p => task.prizeIds.includes(p.id));
                return jsonResponse(200, { success: true, data: { task, prizes: taskPrizes } });
            }
        }

        // 健康检查
        if (pathParts[0] === 'health') {
            return jsonResponse(200, { success: true, message: 'Server is running!' });
        }

        // 未找到路由
        return jsonResponse(404, { success: false, message: '接口不存在' });

    } catch (error) {
        console.error('API Error:', error);
        return jsonResponse(500, { success: false, message: '服务器内部错误' });
    }
};