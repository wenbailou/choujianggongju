const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL || process.env.SUPABASE_DATABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY || process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

console.log('=== API Server Starting ===');
console.log('Supabase URL:', supabaseUrl ? 'configured' : 'not configured');
console.log('Supabase Key:', supabaseKey ? 'configured' : 'not configured');
console.log('Version: 2026-05-27-fix');

let supabase = null;

if (supabaseUrl && supabaseKey) {
    supabase = createClient(supabaseUrl, supabaseKey);
    console.log('Supabase client created successfully');
} else {
    console.log('Supabase client not created - missing URL or key');
}

let tasks = [];
let prizes = [];
let records = [];

let taskIdCounter = 1;
let prizeIdCounter = 1;
let recordIdCounter = 1;

// 获取当前北京时间（UTC+8）
function getBeijingTime() {
    const now = new Date();
    const utc = now.getTime() + now.getTimezoneOffset() * 60000;
    return new Date(utc + 8 * 3600000);
}

function jsonResponse(statusCode, data) {
    return {
        statusCode: statusCode,
        headers: {
            'Content-Type': 'application/json; charset=utf-8',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type'
        },
        body: JSON.stringify(data)
    };
}

async function getTasksFromDB() {
    if (!supabase) return [];
    const { data, error } = await supabase.from('tasks').select('*');
    return data || [];
}

async function getPrizesFromDB() {
    if (!supabase) return [];
    const { data, error } = await supabase.from('prizes').select('*');
    return data || [];
}

async function getRecordsFromDB(taskId = null) {
    if (!supabase) return [];
    let query = supabase.from('records').select('*');
    if (taskId !== null) {
        query = query.eq('task_id', taskId);
    }
    const { data, error } = await query;
    return data || [];
}

exports.handler = async (event, context) => {
    if (event.httpMethod === 'OPTIONS') {
        return jsonResponse(200, { success: true });
    }

    const { path, httpMethod, body } = event;
    let pathParts = path.split('/').filter(p => p);
    
    if (pathParts[0] === 'api') {
        pathParts = pathParts.slice(1);
    }
    
    try {
        if (pathParts[0] === 'health') {
            return jsonResponse(200, { 
                success: true, 
                message: 'Server is running!',
                usingDatabase: !!supabase,
                version: '2026-05-27-fix'
            });
        }

        if (pathParts[0] === 'tasks') {
            if (httpMethod === 'GET') {
                if (supabase) {
                    const dbTasks = await getTasksFromDB();
                    console.log('Tasks from database:', dbTasks);
                    return jsonResponse(200, { success: true, data: dbTasks });
                }
                return jsonResponse(200, { success: true, data: tasks });
            }
            
            if (httpMethod === 'POST') {
                const taskData = JSON.parse(body);
                console.log('Received task data:', taskData);
                console.log('Supabase client:', supabase ? 'initialized' : 'not initialized');
                
                const beijingTime = getBeijingTime();
                const newTask = {
                    id: Date.now(),
                    name: taskData.name,
                    description: taskData.desc,
                    start_date: taskData.startDate,
                    end_date: taskData.endDate,
                    prize_ids: taskData.prizeIds || [],
                    status: 'active',
                    created_at: beijingTime.toISOString()
                };
                
                if (supabase) {
                    const { error } = await supabase
                        .from('tasks')
                        .insert([{
                            name: taskData.name,
                            description: taskData.desc,
                            start_date: taskData.startDate,
                            end_date: taskData.endDate,
                            prize_ids: taskData.prizeIds || [],
                            status: 'active',
                            created_at: beijingTime.toISOString()
                        }]);
                    console.log('Insert result:', { error });
                    if (error) {
                        console.error('Supabase insert error:', error);
                        return jsonResponse(500, { success: false, message: 'Failed to create task: ' + error.message });
                    }
                } else {
                    tasks.push(newTask);
                }
                
                return jsonResponse(200, { success: true, data: newTask });
            }
            
            if (httpMethod === 'PUT' && pathParts[1]) {
                const taskId = parseInt(pathParts[1]);
                const taskData = JSON.parse(body);
                if (supabase) {
                    const { data, error } = await supabase
                        .from('tasks')
                        .update({
                            name: taskData.name,
                            description: taskData.desc,
                            start_date: taskData.startDate,
                            end_date: taskData.endDate,
                            prize_ids: taskData.prizeIds,
                            status: taskData.status
                        })
                        .eq('id', taskId)
                        .single();
                    if (error) return jsonResponse(500, { success: false, message: 'Failed to update task' });
                    return jsonResponse(200, { success: true, data });
                }
                const taskIndex = tasks.findIndex(t => t.id === taskId);
                if (taskIndex === -1) return jsonResponse(404, { success: false, message: 'Task not found' });
                tasks[taskIndex] = { ...tasks[taskIndex], name: taskData.name, description: taskData.desc, start_date: taskData.startDate, end_date: taskData.endDate, prize_ids: taskData.prizeIds, status: taskData.status };
                return jsonResponse(200, { success: true, data: tasks[taskIndex] });
            }
            
            if (httpMethod === 'DELETE' && pathParts[1]) {
                const taskId = parseInt(pathParts[1]);
                console.log('Deleting task with id:', taskId, 'from path:', pathParts[1]);
                
                if (supabase) {
                    // 先删除相关的抽奖记录（避免外键约束错误）
                    console.log('Deleting related records for task:', taskId);
                    const deleteRecordsResult = await supabase.from('records').delete().eq('task_id', taskId);
                    console.log('Deleted records result:', deleteRecordsResult);
                    
                    // 然后删除任务
                    // 尝试用数字匹配，如果失败则尝试用字符串匹配
                    let { data, error } = await supabase.from('tasks').delete().eq('id', taskId);
                    
                    // 如果数字匹配失败，尝试字符串匹配（处理数据库中ID为字符串的情况）
                    if (error || (!data || data.length === 0)) {
                        console.log('Trying string match for id:', pathParts[1]);
                        const { data: strData, error: strError } = await supabase.from('tasks').delete().eq('id', pathParts[1]);
                        data = strData;
                        error = strError;
                    }
                    console.log('Delete task result - data:', data, 'error:', error);
                    
                    if (error) {
                        console.error('Delete task error:', error);
                        return jsonResponse(500, { success: false, message: 'Failed to delete task: ' + error.message });
                    }
                    return jsonResponse(200, { success: true, message: 'Deleted successfully' });
                }
                const taskIndex = tasks.findIndex(t => t.id === taskId);
                if (taskIndex === -1) return jsonResponse(404, { success: false, message: 'Task not found' });
                tasks.splice(taskIndex, 1);
                return jsonResponse(200, { success: true, message: 'Deleted successfully' });
            }
        }

        if (pathParts[0] === 'prizes') {
            if (httpMethod === 'GET') {
                if (supabase) {
                    const dbPrizes = await getPrizesFromDB();
                    return jsonResponse(200, { success: true, data: dbPrizes });
                }
                return jsonResponse(200, { success: true, data: prizes });
            }
            
            if (httpMethod === 'POST') {
                const prizeData = JSON.parse(body);
                console.log('Creating prize with data:', prizeData);
                
                const newPrize = {
                    id: Date.now(),
                    name: prizeData.name,
                    icon: prizeData.icon,
                    probability: prizeData.probability,
                    stock: prizeData.stock,
                    description: prizeData.description || prizeData.desc,
                    status: 'active'
                };
                
                const prizeBeijingTime = getBeijingTime();
                if (supabase) {
                    const { error } = await supabase
                        .from('prizes')
                        .insert([{
                            name: prizeData.name,
                            icon: prizeData.icon,
                            probability: prizeData.probability,
                            stock: prizeData.stock,
                            description: prizeData.description || prizeData.desc,
                            status: 'active',
                            created_at: prizeBeijingTime.toISOString()
                        }]);
                    
                    console.log('Insert result:', { error });
                    
                    if (error) {
                        console.error('Insert error:', error);
                        return jsonResponse(500, { success: false, message: 'Failed to create prize: ' + error.message });
                    }
                } else {
                    prizes.push(newPrize);
                }
                
                return jsonResponse(200, { success: true, data: newPrize });
            }
            
            if (httpMethod === 'PUT' && pathParts[1]) {
                const prizeId = parseInt(pathParts[1]);
                const prizeData = JSON.parse(body);
                if (supabase) {
                    const { data, error } = await supabase
                        .from('prizes')
                        .update({ name: prizeData.name, icon: prizeData.icon, probability: prizeData.probability, stock: prizeData.stock, description: prizeData.description || prizeData.desc, status: prizeData.status })
                        .eq('id', prizeId)
                        .single();
                    if (error) return jsonResponse(500, { success: false, message: 'Failed to update prize' });
                    return jsonResponse(200, { success: true, data });
                }
                const prizeIndex = prizes.findIndex(p => p.id === prizeId);
                if (prizeIndex === -1) return jsonResponse(404, { success: false, message: 'Prize not found' });
                prizes[prizeIndex] = { ...prizes[prizeIndex], name: prizeData.name, icon: prizeData.icon, probability: prizeData.probability, stock: prizeData.stock, description: prizeData.description || prizeData.desc, status: prizeData.status };
                return jsonResponse(200, { success: true, data: prizes[prizeIndex] });
            }
            
            if (httpMethod === 'DELETE' && pathParts[1]) {
                const prizeId = parseInt(pathParts[1]);
                if (supabase) {
                    const { data, error } = await supabase.from('prizes').delete().eq('id', prizeId);
                    if (error) return jsonResponse(500, { success: false, message: 'Failed to delete prize' });
                    return jsonResponse(200, { success: true, message: 'Deleted successfully' });
                }
                const prizeIndex = prizes.findIndex(p => p.id === prizeId);
                if (prizeIndex === -1) return jsonResponse(404, { success: false, message: 'Prize not found' });
                prizes.splice(prizeIndex, 1);
                return jsonResponse(200, { success: true, message: 'Deleted successfully' });
            }
        }

        if (pathParts[0] === 'records') {
            if (httpMethod === 'GET') {
                const taskId = event.queryStringParameters && event.queryStringParameters.taskId ? parseInt(event.queryStringParameters.taskId) : null;
                if (supabase) {
                    const dbRecords = await getRecordsFromDB(taskId);
                    return jsonResponse(200, { success: true, data: dbRecords });
                }
                let filteredRecords = records;
                if (taskId !== null) {
                    filteredRecords = records.filter(r => r.task_id === taskId);
                }
                return jsonResponse(200, { success: true, data: filteredRecords });
            }
            
            if (httpMethod === 'POST') {
                const recordData = JSON.parse(body);
                const recordBeijingTime = getBeijingTime();
                
                // 检查任务是否在有效期内
                if (recordData.taskId && supabase) {
                    const { data: task } = await supabase
                        .from('tasks')
                        .select('*')
                        .eq('id', recordData.taskId)
                        .single();
                    
                    if (task) {
                        if (task.start_date && new Date(recordBeijingTime) < new Date(task.start_date)) {
                            return jsonResponse(400, { success: false, message: '活动还未开始！' });
                        }
                        if (task.end_date && new Date(recordBeijingTime) > new Date(task.end_date)) {
                            return jsonResponse(400, { success: false, message: '活动已结束！' });
                        }
                    }
                }
                
                if (supabase) {
                    const { data, error } = await supabase
                        .from('records')
                        .insert([{
                            name: recordData.name,
                            phone: recordData.phone,
                            address: recordData.address,
                            prize: recordData.prize,
                            task_id: recordData.taskId,
                            task_name: recordData.taskName,
                            created_at: recordBeijingTime.toISOString(),
                            shipped: false
                        }])
                        .single();
                    if (error) return jsonResponse(500, { success: false, message: 'Failed to create record' });
                    return jsonResponse(200, { success: true, data });
                }
                const newRecord = { id: recordIdCounter++, name: recordData.name, phone: recordData.phone, address: recordData.address, prize: recordData.prize, task_id: recordData.taskId, task_name: recordData.taskName, created_at: recordBeijingTime.toISOString(), shipped: false };
                records.push(newRecord);
                return jsonResponse(200, { success: true, data: newRecord });
            }
            
            if (httpMethod === 'PUT' && pathParts[1]) {
                const recordId = parseInt(pathParts[1]);
                const recordData = JSON.parse(body);
                if (supabase) {
                    const { data, error } = await supabase.from('records').update({ shipped: recordData.shipped }).eq('id', recordId).single();
                    if (error) return jsonResponse(500, { success: false, message: 'Failed to update record' });
                    return jsonResponse(200, { success: true, data });
                }
                const recordIndex = records.findIndex(r => r.id === recordId);
                if (recordIndex === -1) return jsonResponse(404, { success: false, message: 'Record not found' });
                records[recordIndex].shipped = recordData.shipped;
                return jsonResponse(200, { success: true, data: records[recordIndex] });
            }
            
            if (httpMethod === 'DELETE' && pathParts[1]) {
                const recordId = parseInt(pathParts[1]);
                if (supabase) {
                    const { data, error } = await supabase.from('records').delete().eq('id', recordId);
                    if (error) return jsonResponse(500, { success: false, message: 'Failed to delete record' });
                    return jsonResponse(200, { success: true, message: 'Deleted successfully' });
                }
                const recordIndex = records.findIndex(r => r.id === recordId);
                if (recordIndex === -1) return jsonResponse(404, { success: false, message: 'Record not found' });
                records.splice(recordIndex, 1);
                return jsonResponse(200, { success: true, message: 'Deleted successfully' });
            }
        }

        if (pathParts[0] === 'lottery' && pathParts[1] && pathParts[2] === 'prizes') {
            if (httpMethod === 'GET') {
                const taskId = parseInt(pathParts[1]);
                let task, taskPrizes;
                
                if (supabase) {
                    const { data: taskData, error: taskError } = await supabase.from('tasks').select('*').eq('id', taskId).single();
                    if (taskError || !taskData) return jsonResponse(404, { success: false, message: 'Task not found' });
                    task = taskData;
                    const prizeIds = task.prize_ids || [];
                    const { data: prizeData, error: prizeError } = await supabase.from('prizes').select('*').in('id', prizeIds.map(id => parseInt(id)));
                    taskPrizes = prizeData || [];
                } else {
                    task = tasks.find(t => t.id === taskId);
                    if (!task) return jsonResponse(404, { success: false, message: 'Task not found' });
                    const prizeIds = task.prize_ids || [];
                    taskPrizes = prizes.filter(p => prizeIds.includes(p.id));
                }
                
                return jsonResponse(200, { success: true, data: { task, prizes: taskPrizes } });
            }
        }

        if (pathParts[0] === 'settings') {
            if (httpMethod === 'GET') {
                if (supabase) {
                    const { data, error } = await supabase.from('settings').select('*').single();
                    if (error || !data) {
                        return jsonResponse(200, { success: true, data: { dailyLimit: 3 } });
                    }
                    return jsonResponse(200, { success: true, data });
                }
                return jsonResponse(200, { success: true, data: { dailyLimit: 3 } });
            }
            
            if (httpMethod === 'POST' || httpMethod === 'PUT') {
                const settingsData = JSON.parse(body);
                console.log('Received settings data:', settingsData);
                
                const dailyLimit = settingsData.dailyLimit !== undefined ? settingsData.dailyLimit : 3;
                const settingsBeijingTime = getBeijingTime().toISOString();
                
                if (supabase) {
                    // 先尝试获取现有设置
                    let existing = null;
                    try {
                        const { data } = await supabase.from('settings').select('id, dailyLimit').limit(1);
                        if (data && data.length > 0) {
                            existing = data[0];
                        }
                    } catch (e) {
                        console.log('Error fetching existing settings:', e);
                    }
                    
                    console.log('Existing settings:', existing);
                    
                    if (existing) {
                        // 使用简单的更新操作
                        try {
                            await supabase.from('settings').update({ dailyLimit }).eq('id', existing.id);
                            console.log('Settings updated successfully');
                        } catch (updateError) {
                            console.error('Update error:', updateError);
                            return jsonResponse(500, { success: false, message: 'Failed to update settings: ' + updateError.message });
                        }
                    } else {
                        // 使用简单的插入操作
                        try {
                            await supabase.from('settings').insert([{ dailyLimit }]);
                            console.log('Settings inserted successfully');
                        } catch (insertError) {
                            console.error('Insert error:', insertError);
                            return jsonResponse(500, { success: false, message: 'Failed to create settings: ' + insertError.message });
                        }
                    }
                    return jsonResponse(200, { success: true, data: { dailyLimit } });
                }
                return jsonResponse(200, { success: true, data: { dailyLimit } });
            }
        }
        
        if (pathParts[0] === 'daily-count') {
            if (httpMethod === 'GET') {
                const phone = event.queryStringParameters && event.queryStringParameters.phone;
                if (!phone) return jsonResponse(400, { success: false, message: 'Phone number is required' });
                
                const today = new Date().toISOString().split('T')[0];
                
                if (supabase) {
                    const { data, error } = await supabase
                        .from('daily_counts')
                        .select('count')
                        .eq('phone', phone)
                        .eq('date', today)
                        .single();
                    
                    if (error || !data) {
                        return jsonResponse(200, { success: true, data: { count: 0 } });
                    }
                    return jsonResponse(200, { success: true, data: { count: data.count } });
                }
                return jsonResponse(200, { success: true, data: { count: 0 } });
            }
            
            if (httpMethod === 'POST') {
                const { phone } = JSON.parse(body || '{}');
                if (!phone) return jsonResponse(400, { success: false, message: 'Phone number is required' });
                
                const today = new Date().toISOString().split('T')[0];
                
                if (supabase) {
                    const { data: existing, error: selectError } = await supabase
                        .from('daily_counts')
                        .select('*')
                        .eq('phone', phone)
                        .eq('date', today)
                        .single();
                    
                    if (existing) {
                        const { error } = await supabase
                            .from('daily_counts')
                            .update({ count: existing.count + 1 })
                            .eq('id', existing.id);
                        if (error) return jsonResponse(500, { success: false, message: 'Failed to update count' });
                    } else {
                        const { error } = await supabase
                            .from('daily_counts')
                            .insert([{ phone, date: today, count: 1 }]);
                        if (error) return jsonResponse(500, { success: false, message: 'Failed to create count' });
                    }
                    return jsonResponse(200, { success: true, message: 'Count updated' });
                }
                return jsonResponse(200, { success: true, message: 'Count updated' });
            }
        }
        
        return jsonResponse(404, { success: false, message: 'Endpoint not found' });

    } catch (error) {
        console.error('API Error:', error);
        return jsonResponse(500, { success: false, message: 'Internal server error' });
    }
};
