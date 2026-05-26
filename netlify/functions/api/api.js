const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

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
        if (pathParts[0] === 'tasks') {
            if (httpMethod === 'GET') {
                if (pathParts[1]) {
                    const taskId = parseInt(pathParts[1]);
                    const { data, error } = await supabase
                        .from('tasks')
                        .select('*')
                        .eq('id', taskId)
                        .single();
                    
                    if (error) {
                        return jsonResponse(404, { success: false, message: 'Task not found' });
                    }
                    return jsonResponse(200, { success: true, data });
                } else {
                    const { data, error } = await supabase
                        .from('tasks')
                        .select('*');
                    
                    if (error) {
                        return jsonResponse(500, { success: false, message: 'Failed to get tasks' });
                    }
                    return jsonResponse(200, { success: true, data });
                }
            }
            
            if (httpMethod === 'POST') {
                const taskData = JSON.parse(body);
                const { data, error } = await supabase
                    .from('tasks')
                    .insert([{
                        name: taskData.name,
                        description: taskData.desc,
                        start_date: taskData.startDate,
                        end_date: taskData.endDate,
                        prize_ids: taskData.prizeIds,
                        status: 'active',
                        created_at: new Date().toISOString()
                    }])
                    .single();
                
                if (error) {
                    return jsonResponse(500, { success: false, message: 'Failed to create task' });
                }
                return jsonResponse(200, { success: true, data });
            }
            
            if (httpMethod === 'PUT' && pathParts[1]) {
                const taskId = parseInt(pathParts[1]);
                const taskData = JSON.parse(body);
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
                
                if (error) {
                    return jsonResponse(500, { success: false, message: 'Failed to update task' });
                }
                return jsonResponse(200, { success: true, data });
            }
            
            if (httpMethod === 'DELETE' && pathParts[1]) {
                const taskId = parseInt(pathParts[1]);
                const { data, error } = await supabase
                    .from('tasks')
                    .delete()
                    .eq('id', taskId);
                
                if (error) {
                    return jsonResponse(500, { success: false, message: 'Failed to delete task' });
                }
                return jsonResponse(200, { success: true, message: 'Deleted successfully' });
            }
        }

        if (pathParts[0] === 'prizes') {
            if (httpMethod === 'GET') {
                if (pathParts[1]) {
                    const prizeId = parseInt(pathParts[1]);
                    const { data, error } = await supabase
                        .from('prizes')
                        .select('*')
                        .eq('id', prizeId)
                        .single();
                    
                    if (error) {
                        return jsonResponse(404, { success: false, message: 'Prize not found' });
                    }
                    return jsonResponse(200, { success: true, data });
                } else {
                    const { data, error } = await supabase
                        .from('prizes')
                        .select('*');
                    
                    if (error) {
                        return jsonResponse(500, { success: false, message: 'Failed to get prizes' });
                    }
                    return jsonResponse(200, { success: true, data });
                }
            }
            
            if (httpMethod === 'POST') {
                const prizeData = JSON.parse(body);
                const { data, error } = await supabase
                    .from('prizes')
                    .insert([{
                        name: prizeData.name,
                        icon: prizeData.icon,
                        probability: prizeData.probability,
                        stock: prizeData.stock,
                        description: prizeData.desc,
                        status: 'active'
                    }])
                    .single();
                
                if (error) {
                    return jsonResponse(500, { success: false, message: 'Failed to create prize' });
                }
                return jsonResponse(200, { success: true, data });
            }
            
            if (httpMethod === 'PUT' && pathParts[1]) {
                const prizeId = parseInt(pathParts[1]);
                const prizeData = JSON.parse(body);
                const { data, error } = await supabase
                    .from('prizes')
                    .update({
                        name: prizeData.name,
                        icon: prizeData.icon,
                        probability: prizeData.probability,
                        stock: prizeData.stock,
                        description: prizeData.desc,
                        status: prizeData.status
                    })
                    .eq('id', prizeId)
                    .single();
                
                if (error) {
                    return jsonResponse(500, { success: false, message: 'Failed to update prize' });
                }
                return jsonResponse(200, { success: true, data });
            }
            
            if (httpMethod === 'DELETE' && pathParts[1]) {
                const prizeId = parseInt(pathParts[1]);
                const { data, error } = await supabase
                    .from('prizes')
                    .delete()
                    .eq('id', prizeId);
                
                if (error) {
                    return jsonResponse(500, { success: false, message: 'Failed to delete prize' });
                }
                return jsonResponse(200, { success: true, message: 'Deleted successfully' });
            }
        }

        if (pathParts[0] === 'records') {
            if (httpMethod === 'GET') {
                let query = supabase.from('records').select('*');
                
                if (event.queryStringParameters && event.queryStringParameters.taskId) {
                    const taskId = parseInt(event.queryStringParameters.taskId);
                    query = query.eq('task_id', taskId);
                }
                
                const { data, error } = await query;
                
                if (error) {
                    return jsonResponse(500, { success: false, message: 'Failed to get records' });
                }
                return jsonResponse(200, { success: true, data });
            }
            
            if (httpMethod === 'POST') {
                const recordData = JSON.parse(body);
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
                
                if (error) {
                    return jsonResponse(500, { success: false, message: 'Failed to create record' });
                }
                return jsonResponse(200, { success: true, data });
            }
            
            if (httpMethod === 'PUT' && pathParts[1]) {
                const recordId = parseInt(pathParts[1]);
                const recordData = JSON.parse(body);
                const { data, error } = await supabase
                    .from('records')
                    .update({
                        shipped: recordData.shipped
                    })
                    .eq('id', recordId)
                    .single();
                
                if (error) {
                    return jsonResponse(500, { success: false, message: 'Failed to update record' });
                }
                return jsonResponse(200, { success: true, data });
            }
            
            if (httpMethod === 'DELETE' && pathParts[1]) {
                const recordId = parseInt(pathParts[1]);
                const { data, error } = await supabase
                    .from('records')
                    .delete()
                    .eq('id', recordId);
                
                if (error) {
                    return jsonResponse(500, { success: false, message: 'Failed to delete record' });
                }
                return jsonResponse(200, { success: true, message: 'Deleted successfully' });
            }
        }

        if (pathParts[0] === 'lottery' && pathParts[1] && pathParts[2] === 'prizes') {
            if (httpMethod === 'GET') {
                const taskId = parseInt(pathParts[1]);
                const { data: task, error: taskError } = await supabase
                    .from('tasks')
                    .select('*')
                    .eq('id', taskId)
                    .single();
                
                if (taskError || !task) {
                    return jsonResponse(404, { success: false, message: 'Task not found' });
                }
                
                const prizeIds = task.prize_ids || [];
                const { data: prizes, error: prizesError } = await supabase
                    .from('prizes')
                    .select('*')
                    .in('id', prizeIds.map(id => parseInt(id)));
                
                if (prizesError) {
                    return jsonResponse(500, { success: false, message: 'Failed to get prizes' });
                }
                
                return jsonResponse(200, { success: true, data: { task, prizes } });
            }
        }

        if (pathParts[0] === 'health') {
            return jsonResponse(200, { success: true, message: 'Server is running!' });
        }

        return jsonResponse(404, { success: false, message: 'Endpoint not found' });

    } catch (error) {
        console.error('API Error:', error);
        return jsonResponse(500, { success: false, message: 'Internal server error' });
    }
};
