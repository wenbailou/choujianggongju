// 测试奖品创建API
async function testPrizeCreation() {
    const API_BASE = '/api';
    
    // 测试奖品数据
    const testPrize = {
        name: '测试奖品',
        icon: '🎁',
        probability: 10.5,
        stock: 100,
        description: '这是一个测试奖品',
        status: 'active'
    };
    
    console.log('=== 测试奖品创建 ===');
    console.log('测试数据:', JSON.stringify(testPrize, null, 2));
    
    try {
        // 发送POST请求创建奖品
        const response = await fetch(`${API_BASE}/prizes`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(testPrize)
        });
        
        const result = await response.json();
        console.log('响应状态:', response.status);
        console.log('响应结果:', JSON.stringify(result, null, 2));
        
        if (result.success) {
            console.log('✅ 奖品创建成功！');
            console.log('新奖品ID:', result.data.id);
            
            // 验证是否能查询到
            const getResponse = await fetch(`${API_BASE}/prizes`);
            const getResult = await getResponse.json();
            console.log('当前奖品列表:', getResult.data.length, '个奖品');
            
        } else {
            console.log('❌ 奖品创建失败:', result.message || '未知错误');
        }
        
    } catch (error) {
        console.log('❌ 请求失败:', error.message);
    }
}

// 执行测试
testPrizeCreation();
