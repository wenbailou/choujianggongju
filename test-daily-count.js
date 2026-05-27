const API_BASE = 'https://wonderful-smakager-1491a6.netlify.app/.netlify/functions/api';

async function testDailyCount() {
    const phone = '13800138000';
    
    console.log('=== 测试后端抽奖次数统计功能 ===');
    console.log('测试手机号:', phone);
    console.log('');
    
    // 1. 先获取当前次数
    console.log('1. 获取当前抽奖次数...');
    let response = await fetch(`${API_BASE}/daily-count?phone=${encodeURIComponent(phone)}`);
    let result = await response.json();
    console.log('   结果:', JSON.stringify(result));
    console.log('');
    
    // 2. 模拟抽奖（增加次数）
    console.log('2. 模拟第一次抽奖...');
    response = await fetch(`${API_BASE}/daily-count`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone })
    });
    result = await response.json();
    console.log('   结果:', JSON.stringify(result));
    console.log('');
    
    // 3. 再次获取次数，验证是否增加
    console.log('3. 再次获取抽奖次数...');
    response = await fetch(`${API_BASE}/daily-count?phone=${encodeURIComponent(phone)}`);
    result = await response.json();
    console.log('   结果:', JSON.stringify(result));
    console.log('');
    
    // 4. 模拟第二次抽奖
    console.log('4. 模拟第二次抽奖...');
    response = await fetch(`${API_BASE}/daily-count`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone })
    });
    result = await response.json();
    console.log('   结果:', JSON.stringify(result));
    console.log('');
    
    // 5. 获取最终次数
    console.log('5. 获取最终抽奖次数...');
    response = await fetch(`${API_BASE}/daily-count?phone=${encodeURIComponent(phone)}`);
    result = await response.json();
    console.log('   结果:', JSON.stringify(result));
    console.log('');
    
    // 6. 获取系统设置
    console.log('6. 获取系统设置（每日抽奖次数限制）...');
    response = await fetch(`${API_BASE}/settings`);
    result = await response.json();
    console.log('   结果:', JSON.stringify(result));
    console.log('');
    
    console.log('=== 测试完成 ===');
}

testDailyCount().catch(error => {
    console.error('测试失败:', error);
});