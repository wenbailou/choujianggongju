const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL || process.env.SUPABASE_DATABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY || process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

console.log('Supabase URL:', supabaseUrl ? 'configured' : 'not configured');
console.log('Supabase Key:', supabaseKey ? 'configured' : 'not configured');

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
                usingDatabase: !!supabase
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
                if (supabase) {
                    const { data, error } = await supabase
                        .from('tasks')
                        .insert([{
                            name: taskData.name,
                            description: taskData.desc,
                            start_date: taskData.startDate,
                            end_date: taskData.endDate,
                            prize_ids: taskData.prizeIds || [],
                            status: 'active',
                            created_at: new Date().toISOString()
                        }])
                        .single();
                    console.log('Insert result:', { data, error });
                    if (error) {
                        console.error('Supabase insert error:', error);
                        return jsonResponse(500, { success: false, message: 'Failed to create task: ' + error.message });
                    }
                    return jsonResponse(200, { success: true, data });
                }
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
                if (supabase) {
                    const { data, error } = await supabase.from('tasks').delete().eq('id', taskId);
                    if (error) return jsonResponse(500, { success: false, message: 'Failed to delete task' });
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
                if (supabase) {
                    const { data, error } = await supabase
                        .from('prizes')
                        .insert([{
                            name: prizeData.name,
                            icon: prizeData.icon,
                            probability: prizeData.probability,
                            stock: prizeData.stock,
                            description: prizeData.description || prizeData.desc,
                            status: 'active'
                        }])
                        .select();
                    if (error) return jsonResponse(500, { success: false, message: 'Failed to create prize: ' + error.message });
                    return jsonResponse(200, { success: true, data: data && data.length > 0 ? data[0] : null });
                }
                const newPrize = { id: prizeIdCounter++, name: prizeData.name, icon: prizeData.icon, probability: prizeData.probability, stock: prizeData.stock, description: prizeData.description || prizeData.desc, status: 'active' };
                prizes.push(newPrize);
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
                            created_at: new Date().toISOString(),
                            shipped: false
                        }])
                        .single();
                    if (error) return jsonResponse(500, { success: false, message: 'Failed to create record' });
                    return jsonResponse(200, { success: true, data });
                }
                const newRecord = { id: recordIdCounter++, name: recordData.name, phone: recordData.phone, address: recordData.address, prize: recordData.prize, task_id: recordData.taskId, task_name: recordData.taskName, created_at: new Date().toISOString(), shipped: false };
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

        return jsonResponse(404, { success: false, message: 'Endpoint not found' });

    } catch (error) {
        console.error('API Error:', error);
        return jsonResponse(500, { success: false, message: 'Internal server error' });
    }
};
