let tasks = [];
let prizes = [];
let records = [];

let taskIdCounter = 1;
let prizeIdCounter = 1;
let recordIdCounter = 1;

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

exports.handler = async (event, context) => {
    if (event.httpMethod === 'OPTIONS') {
        return jsonResponse(200, { success: true });
    }

    const { path, httpMethod, body } = event;
    const pathParts = path.split('/').filter(p => p);
    
    try {
        if (pathParts[0] === 'health') {
            return jsonResponse(200, { 
                success: true, 
                message: 'Server is running!',
                usingMemoryStorage: true
            });
        }

        if (pathParts[0] === 'tasks') {
            if (httpMethod === 'GET') {
                if (pathParts[1]) {
                    const taskId = parseInt(pathParts[1]);
                    const task = tasks.find(t => t.id === taskId);
                    if (!task) {
                        return jsonResponse(404, { success: false, message: 'Task not found' });
                    }
                    return jsonResponse(200, { success: true, data: task });
                } else {
                    return jsonResponse(200, { success: true, data: tasks });
                }
            }
            
            if (httpMethod === 'POST') {
                const taskData = JSON.parse(body);
                const newTask = {
                    id: taskIdCounter++,
                    name: taskData.name,
                    description: taskData.desc,
                    start_date: taskData.startDate,
                    end_date: taskData.endDate,
                    prize_ids: taskData.prizeIds || [],
                    status: 'active',
                    created_at: new Date().toISOString()
                };
                tasks.push(newTask);
                return jsonResponse(200, { success: true, data: newTask });
            }
            
            if (httpMethod === 'PUT' && pathParts[1]) {
                const taskId = parseInt(pathParts[1]);
                const taskData = JSON.parse(body);
                const taskIndex = tasks.findIndex(t => t.id === taskId);
                if (taskIndex === -1) {
                    return jsonResponse(404, { success: false, message: 'Task not found' });
                }
                tasks[taskIndex] = {
                    ...tasks[taskIndex],
                    name: taskData.name,
                    description: taskData.desc,
                    start_date: taskData.startDate,
                    end_date: taskData.endDate,
                    prize_ids: taskData.prizeIds,
                    status: taskData.status
                };
                return jsonResponse(200, { success: true, data: tasks[taskIndex] });
            }
            
            if (httpMethod === 'DELETE' && pathParts[1]) {
                const taskId = parseInt(pathParts[1]);
                const taskIndex = tasks.findIndex(t => t.id === taskId);
                if (taskIndex === -1) {
                    return jsonResponse(404, { success: false, message: 'Task not found' });
                }
                tasks.splice(taskIndex, 1);
                return jsonResponse(200, { success: true, message: 'Deleted successfully' });
            }
        }

        if (pathParts[0] === 'prizes') {
            if (httpMethod === 'GET') {
                if (pathParts[1]) {
                    const prizeId = parseInt(pathParts[1]);
                    const prize = prizes.find(p => p.id === prizeId);
                    if (!prize) {
                        return jsonResponse(404, { success: false, message: 'Prize not found' });
                    }
                    return jsonResponse(200, { success: true, data: prize });
                } else {
                    return jsonResponse(200, { success: true, data: prizes });
                }
            }
            
            if (httpMethod === 'POST') {
                const prizeData = JSON.parse(body);
                const newPrize = {
                    id: prizeIdCounter++,
                    name: prizeData.name,
                    icon: prizeData.icon,
                    probability: prizeData.probability,
                    stock: prizeData.stock,
                    description: prizeData.desc,
                    status: 'active'
                };
                prizes.push(newPrize);
                return jsonResponse(200, { success: true, data: newPrize });
            }
            
            if (httpMethod === 'PUT' && pathParts[1]) {
                const prizeId = parseInt(pathParts[1]);
                const prizeData = JSON.parse(body);
                const prizeIndex = prizes.findIndex(p => p.id === prizeId);
                if (prizeIndex === -1) {
                    return jsonResponse(404, { success: false, message: 'Prize not found' });
                }
                prizes[prizeIndex] = {
                    ...prizes[prizeIndex],
                    name: prizeData.name,
                    icon: prizeData.icon,
                    probability: prizeData.probability,
                    stock: prizeData.stock,
                    description: prizeData.desc,
                    status: prizeData.status
                };
                return jsonResponse(200, { success: true, data: prizes[prizeIndex] });
            }
            
            if (httpMethod === 'DELETE' && pathParts[1]) {
                const prizeId = parseInt(pathParts[1]);
                const prizeIndex = prizes.findIndex(p => p.id === prizeId);
                if (prizeIndex === -1) {
                    return jsonResponse(404, { success: false, message: 'Prize not found' });
                }
                prizes.splice(prizeIndex, 1);
                return jsonResponse(200, { success: true, message: 'Deleted successfully' });
            }
        }

        if (pathParts[0] === 'records') {
            if (httpMethod === 'GET') {
                let filteredRecords = records;
                if (event.queryStringParameters && event.queryStringParameters.taskId) {
                    const taskId = parseInt(event.queryStringParameters.taskId);
                    filteredRecords = records.filter(r => r.task_id === taskId);
                }
                return jsonResponse(200, { success: true, data: filteredRecords });
            }
            
            if (httpMethod === 'POST') {
                const recordData = JSON.parse(body);
                const newRecord = {
                    id: recordIdCounter++,
                    name: recordData.name,
                    phone: recordData.phone,
                    address: recordData.address,
                    prize: recordData.prize,
                    task_id: recordData.taskId,
                    task_name: recordData.taskName,
                    created_at: new Date().toISOString(),
                    shipped: false
                };
                records.push(newRecord);
                return jsonResponse(200, { success: true, data: newRecord });
            }
            
            if (httpMethod === 'PUT' && pathParts[1]) {
                const recordId = parseInt(pathParts[1]);
                const recordData = JSON.parse(body);
                const recordIndex = records.findIndex(r => r.id === recordId);
                if (recordIndex === -1) {
                    return jsonResponse(404, { success: false, message: 'Record not found' });
                }
                records[recordIndex].shipped = recordData.shipped;
                return jsonResponse(200, { success: true, data: records[recordIndex] });
            }
            
            if (httpMethod === 'DELETE' && pathParts[1]) {
                const recordId = parseInt(pathParts[1]);
                const recordIndex = records.findIndex(r => r.id === recordId);
                if (recordIndex === -1) {
                    return jsonResponse(404, { success: false, message: 'Record not found' });
                }
                records.splice(recordIndex, 1);
                return jsonResponse(200, { success: true, message: 'Deleted successfully' });
            }
        }

        if (pathParts[0] === 'lottery' && pathParts[1] && pathParts[2] === 'prizes') {
            if (httpMethod === 'GET') {
                const taskId = parseInt(pathParts[1]);
                const task = tasks.find(t => t.id === taskId);
                if (!task) {
                    return jsonResponse(404, { success: false, message: 'Task not found' });
                }
                const prizeIds = task.prize_ids || [];
                const taskPrizes = prizes.filter(p => prizeIds.includes(p.id));
                return jsonResponse(200, { success: true, data: { task, prizes: taskPrizes } });
            }
        }

        return jsonResponse(404, { success: false, message: 'Endpoint not found' });

    } catch (error) {
        console.error('API Error:', error);
        return jsonResponse(500, { success: false, message: 'Internal server error' });
    }
};
