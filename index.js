// JavaScript Document
// app.js

// 1. ตั้งค่าการเชื่อมต่อ Supabase (เอามาจากหน้า Settings > API ใน Supabase)
const SUPABASE_URL = "https://pebuljckeqmwpsfelpvj.supabase.co/rest/v1/";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBlYnVsamNrZXFtd3BzZmVscHZqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODIwMDYzNjksImV4cCI6MjA5NzU4MjM2OX0.4Bwr_K4RPUIM6EFGKf3cud69zOu4ZkyW6thszubvuWM";

const supabase = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ดึง Elements จาก HTML
const loginSection = document.getElementById('login-section');
const dashboardSection = document.getElementById('dashboard-section');
const emailInput = document.getElementById('email');
const passwordInput = document.getElementById('password');
const btnLogin = document.getElementById('btn-login');
const btnLogout = document.getElementById('btn-logout');

// 2. ฟังก์ชันตรวจสอบสถานะผู้ใช้ (ว่าล็อกอินค้างไว้ไหม)
supabase.auth.onAuthStateChange((event, session) => {
    if (session) {
        // ถ้าล็อกอินแล้ว -> แสดงหน้าแดชบอร์ด
        loginSection.classList.add('hidden');
        dashboardSection.classList.remove('hidden');
        loadStudentData(session.user.id);
        loadRewards();
    } else {
        // ถ้ายังไม่ล็อกอิน -> แสดงหน้าล็อกอิน
        loginSection.classList.remove('hidden');
        dashboardSection.classList.add('hidden');
    }
});

// 3. ระบบ Log In
btnLogin.addEventListener('click', async () => {
    const email = emailInput.value;
    const password = passwordInput.value;

    const { data, error } = await supabase.auth.signInWithPassword({
        email: email,
        password: password,
    });

    if (error) {
        alert("เข้าสู่ระบบไม่สำเร็จ: " + error.message);
    } else {
        alert("เข้าสู่ระบบสำเร็จ!");
    }
});

// 4. ระบบ Log Out
btnLogout.addEventListener('click', async () => {
    await supabase.auth.signOut();
});

// 5. ดึงข้อมูลนักเรียนและคะแนนมาแสดงผล
async function loadStudentData(userId) {
    const { data, error } = await supabase
        .from('students')
        .select('*')
        .eq('id', userId)
        .single();

    if (data) {
        document.getElementById('student-name').innerText = data.full_name;
        document.getElementById('student-card-id').innerText = data.student_id;
        document.getElementById('student-points').innerText = data.points;
    }
}

// 6. ดึงข้อมูลของรางวัลจาก Supabase
async function loadRewards() {
    const rewardsList = document.getElementById('rewards-list');
    rewardsList.innerHTML = "กำลังโหลดของรางวัล...";

    const { data: rewards, error } = await supabase
        .from('rewards')
        .select('*');

    if (rewards) {
        rewardsList.innerHTML = ""; // ล้างค่าเดิม
        rewards.forEach(item => {
            const itemEl = document.createElement('div');
            itemEl.className = 'reward-item';
            itemEl.innerHTML = `
                <h3>${item.title}</h3>
                <p>ใช้ ${item.points_required} แต้ม</p>
                <p style="font-size:0.8rem; color:gray;">เหลือ: ${item.stock} ชิ้น</p>
                <button onclick="redeemReward(${item.id}, ${item.points_required}, ${item.stock})">แลกรางวัล</button>
            `;
            rewardsList.appendChild(itemEl);
        });
    }
}

// 7. ระบบแลกของรางวัล (ลดแต้มผู้ใช้ และ ลดจำนวนของในคลัง)
window.redeemReward = async (rewardId, pointsRequired, currentStock) => {
    const user = (await supabase.auth.getUser()).data.user;
    if (!user) return;

    // ดึงคะแนนปัจจุบันของนักเรียนก่อน
    const { data: student } = await supabase.from('students').select('points').eq('id', user.id).single();

    if (student.points < pointsRequired) {
        alert("แต้มของคุณไม่พอสำหรับแลกรางวัลนี้ ❌");
        return;
    }
    if (currentStock <= 0) {
        alert("ของรางวัลนี้หมดแล้ว ❌");
        return;
    }

    // คำนวณแต้มใหม่
    const newPoints = student.points - pointsRequired;

    // อัปเดตแต้มนักเรียนใน Database
    await supabase.from('students').update({ points: newPoints }).eq('id', user.id);

    // อัปเดตจำนวนสต็อกของรางวัล
    await supabase.from('rewards').update({ stock: currentStock - 1 }).eq('id', rewardId);

    alert("แลกของรางวัลสำเร็จ! 🎉");
    
    // โหลดข้อมูลหน้าเว็บใหม่เพื่ออัปเดตตัวเลข
    loadStudentData(user.id);
    loadRewards();
}