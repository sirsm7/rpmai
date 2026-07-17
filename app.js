const SUPABASE_URL = 'https://app.tech4ag.my';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoiYW5vbiIsImlzcyI6InN1cGFiYXNlIiwiaWF0IjoxNzYzMzczNjQ1LCJleHAiOjIwNzg3MzM2NDV9.vZOedqJzUn01PjwfaQp7VvRzSm4aRMr21QblPDK8AoY';
const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const views = {
    check: document.getElementById('check-view'),
    register: document.getElementById('register-view'),
    dashboard: document.getElementById('dashboard-view'),
    loading: document.getElementById('loading-view')
};

const subjectDatesMap = {
    "MATEMATIK (SR)": { s1: "2026-07-20", s2: "2026-07-21" },
    "SAINS (SR)": { s1: "2026-07-22", s2: "2026-07-23" },
    "MATEMATIK (SM)": { s1: "2026-08-10", s2: "2026-08-11" },
    "SAINS KOMPUTER (SM)": { s1: "2026-08-10", s2: "2026-08-11" },
    "SAINS (SM)": { s1: "2026-08-12", s2: "2026-08-13" },
    "SAINS TULEN (SM)": { s1: "2026-08-12", s2: "2026-08-13" }
};

/* [COMMENT SYNTAX] SURGICAL EDIT START: Tarikh mutlak 8 sesi */
const absoluteDates = [
    "2026-07-20", // Sesi 1 (Mate SR)
    "2026-07-21", // Sesi 2 (Mate SR)
    "2026-07-22", // Sesi 3 (Sains SR)
    "2026-07-23", // Sesi 4 (Sains SR)
    "2026-08-10", // Sesi 5 (Mate/SK SM)
    "2026-08-11", // Sesi 6 (Mate/SK SM)
    "2026-08-12", // Sesi 7 (Sains/ST SM)
    "2026-08-13"  // Sesi 8 (Sains/ST SM)
];
/* [COMMENT SYNTAX] SURGICAL EDIT END */

let tomSelectInstance = null;
let currentRecord = null;
let schoolsLoaded = false;
let schoolMap = {};

function showView(viewName) {
    Object.values(views).forEach(v => v.classList.add('hidden-view'));
    views[viewName].classList.remove('hidden-view');
    
    const adminContainer = document.getElementById('admin-link-container');
    if(viewName === 'check') {
        adminContainer.classList.remove('hidden-view');
    } else {
        adminContainer.classList.add('hidden-view');
    }
}

function showLoading(text = "Sila tunggu...") {
    document.getElementById('loading-text').textContent = text;
    showView('loading');
}

function showToast(message, type = 'success') {
    const toast = document.getElementById('toast-container');
    const msg = document.getElementById('toast-message');
    
    toast.className = `fixed top-4 left-1/2 transform -translate-x-1/2 -translate-y-full opacity-0 transition-all duration-300 z-50 rounded-md shadow-lg px-6 py-3 text-white font-medium`;
    
    if(type === 'success') toast.classList.add('bg-green-600');
    else if(type === 'error') toast.classList.add('bg-red-600');
    else toast.classList.add('bg-blue-600');

    msg.textContent = message;
    
    setTimeout(() => {
        toast.classList.remove('-translate-y-full', 'opacity-0');
        toast.classList.add('translate-y-0', 'opacity-100');
    }, 10);

    setTimeout(() => {
        toast.classList.remove('translate-y-0', 'opacity-100');
        toast.classList.add('-translate-y-full', 'opacity-0');
    }, 3000);
}

function formatDateDisplay(dateString) {
    if(!dateString) return "";
    const [y, m, d] = dateString.split('-');
    const months = ['Jan','Feb','Mac','Apr','Mei','Jun','Jul','Ogo','Sep','Okt','Nov','Dis'];
    return `${parseInt(d)} ${months[parseInt(m)-1]} ${y}`;
}

function isDateArrived(dateString) {
    if (!dateString) return false;
    const [y, m, d] = dateString.split('-');
    const targetDate = new Date(y, m - 1, d);
    const now = new Date();
    const todayDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    return todayDate >= targetDate;
}

async function loadSchools() {
    if (schoolsLoaded) return;
    try {
        const { data, error } = await supabaseClient
            .from('smpid_sekolah_data')
            .select('kod_sekolah, nama_sekolah')
            .order('nama_sekolah', { ascending: true });

        if (error) throw error;

        const select = document.getElementById('reg_sekolah');
        select.innerHTML = '<option value="">-- Cari Sekolah... --</option>';
        
        if(data && data.length > 0){
            data.forEach(s => {
                schoolMap[s.kod_sekolah] = s.nama_sekolah;
                const option = document.createElement('option');
                option.value = s.kod_sekolah;
                option.textContent = `${s.nama_sekolah} (${s.kod_sekolah})`;
                select.appendChild(option);
            });
        }

        if(tomSelectInstance) tomSelectInstance.destroy();
        
        tomSelectInstance = new TomSelect("#reg_sekolah", {
            create: false,
            sortField: {
                field: "text",
                direction: "asc"
            },
            placeholder: "Cari nama sekolah atau kod...",
        });

        schoolsLoaded = true;
    } catch (err) {
        console.error("Ralat muat sekolah:", err);
        showToast("Gagal memuat senarai sekolah", "error");
    }
}

async function checkIC(ic) {
    showLoading("Menyemak rekod...");
    try {
        const { data, error } = await supabaseClient
            .from('edaftar_bengkel_ppdag')
            .select('*')
            .eq('ic_no', ic)
            .single();

        if (error && error.code !== 'PGRST116') {
            throw error;
        }

        if (data) {
            currentRecord = data;
            setupDashboard();
            showView('dashboard');
            showToast("Rekod ditemui", "success");
        } else {
            document.getElementById('reg_ic').value = ic;
            await loadSchools();
            showView('register');
            showToast("Rekod tidak ditemui. Sila daftar.", "info");
        }
    } catch (err) {
        console.error("Ralat semakan:", err);
        showToast("Ralat sistem", "error");
        showView('check');
    }
}

document.getElementById('reg_peranan').addEventListener('change', (e) => {
    const role = e.target.value;
    const isExempt = role === 'PEGAWAI' || role === 'JURULATIH';
    const subjekContainer = document.getElementById('subjek_container');
    const subjekInput = document.getElementById('reg_subjek');

    if(isExempt) {
        subjekContainer.classList.add('hidden-view');
        subjekInput.required = false;
        subjekInput.value = '';
        document.getElementById('reg_tarikh_info').textContent = '';
    } else {
        subjekContainer.classList.remove('hidden-view');
        subjekInput.required = true;
    }
});

async function registerUser(e) {
    e.preventDefault();
    const ic = document.getElementById('reg_ic').value;
    const nama = document.getElementById('reg_nama').value.toUpperCase();
    const peranan = document.getElementById('reg_peranan').value;
    const subjek = document.getElementById('reg_subjek').value;
    const kodSekolah = document.getElementById('reg_sekolah').value;

    if(!ic || !nama || !peranan || !kodSekolah) {
        showToast("Sila lengkapkan semua maklumat", "error");
        return;
    }
    if(peranan === 'GURU' && !subjek) {
        showToast("Sila pilih subjek", "error");
        return;
    }

    const namaSekolah = schoolMap[kodSekolah];
    
    showLoading("Menyimpan pendaftaran...");

    try {
        /* [COMMENT SYNTAX] SURGICAL EDIT START: Semak kuota peranan */
        if (peranan === 'PEGAWAI' || peranan === 'JURULATIH') {
            const hadMaksimum = peranan === 'PEGAWAI' ? 10 : 8;
            
            const { count, error: countError } = await supabaseClient
                .from('edaftar_bengkel_ppdag')
                .select('*', { count: 'exact', head: true })
                .eq('peranan', peranan);

            if (countError) throw countError;

            if (count >= hadMaksimum) {
                showToast(`Maaf, kuota pendaftaran ${peranan} telah penuh (${count}/${hadMaksimum}).`, "error");
                showView('register');
                return;
            }
        }
        /* [COMMENT SYNTAX] SURGICAL EDIT END */

        let insertData = {
            ic_no: ic,
            nama_penuh: nama,
            peranan: peranan,
            kod_sekolah: kodSekolah,
            nama_sekolah: namaSekolah
        };

        if(peranan === 'GURU') {
            const tarikhs = subjectDatesMap[subjek];
            insertData.subjek = subjek;
            insertData.sesi_1_tarikh = tarikhs.s1;
            insertData.sesi_2_tarikh = tarikhs.s2;
        }

        const { data, error } = await supabaseClient
            .from('edaftar_bengkel_ppdag')
            .insert([insertData])
            .select()
            .single();

        if (error) throw error;

        currentRecord = data;
        
        document.getElementById('register-form').reset();
        document.getElementById('subjek_container').classList.remove('hidden-view');
        document.getElementById('reg_subjek').required = true;

        if(tomSelectInstance) tomSelectInstance.clear();
        
        setupDashboard();
        showView('dashboard');
        showToast("Pendaftaran berjaya", "success");
    } catch (err) {
        console.error("Ralat daftar:", err);
        showToast("Gagal mendaftar. No KP mungkin wujud atau ralat data.", "error");
        showView('register');
    }
}

function handleAttendanceClick(sesi, tarikh, peranan) {
    /* [COMMENT SYNTAX] SURGICAL EDIT START: Semak isDateArrived untuk semua peranan */
    if (!isDateArrived(tarikh)) {
        showToast("Maaf, tarikh bengkel belum tiba. Pengesahan ditutup.", "error");
        return;
    }
    /* [COMMENT SYNTAX] SURGICAL EDIT END */
    markAttendance(sesi);
}

async function markAttendance(sesi) {
    if(!currentRecord) return;
    
    showLoading("Mengesahkan kehadiran...");
    
    const updateData = {};
    updateData[`sesi_${sesi}_hadir`] = true;

    try {
        const { data, error } = await supabaseClient
            .from('edaftar_bengkel_ppdag')
            .update(updateData)
            .eq('id', currentRecord.id)
            .select()
            .single();

        if (error) throw error;

        currentRecord = data;
        setupDashboard();
        showView('dashboard');
        showToast(`Kehadiran Sesi ${sesi} disahkan`, "success");
    } catch (err) {
        console.error("Ralat hadir:", err);
        showToast("Gagal mengesahkan kehadiran", "error");
        showView('dashboard');
    }
}

function setupDashboard() {
    if(!currentRecord) return;

    document.getElementById('dash_nama').textContent = currentRecord.nama_penuh;
    document.getElementById('dash_ic').textContent = currentRecord.ic_no;
    
    const peranan = currentRecord.peranan || 'GURU';
    document.getElementById('dash_peranan').textContent = peranan;
    document.getElementById('dash_sekolah').textContent = `${currentRecord.kod_sekolah} - ${currentRecord.nama_sekolah}`;
    
    const isExempt = peranan === 'PEGAWAI' || peranan === 'JURULATIH';

    if (isExempt) {
        document.getElementById('dash_subjek_container').classList.add('hidden-view');
    } else {
        document.getElementById('dash_subjek_container').classList.remove('hidden-view');
        document.getElementById('dash_subjek').textContent = currentRecord.subjek;
    }

    const sessionsContainer = document.getElementById('sessions_container');
    sessionsContainer.innerHTML = '';
    
    const totalSessions = isExempt ? 8 : 2;
    let allAttended = true;

    for (let i = 1; i <= totalSessions; i++) {
        const isAttended = currentRecord[`sesi_${i}_hadir`];
        if (!isAttended) allAttended = false;
        
        /* [COMMENT SYNTAX] SURGICAL EDIT START: Papar tarikh sebenar untuk PEGAWAI & JURULATIH */
        const tarikhDisplay = isExempt ? formatDateDisplay(absoluteDates[i-1]) : formatDateDisplay(currentRecord[`sesi_${i}_tarikh`]);
        const rawTarikh = isExempt ? absoluteDates[i-1] : currentRecord[`sesi_${i}_tarikh`];
        /* [COMMENT SYNTAX] SURGICAL EDIT END */

        const div = document.createElement('div');
        div.className = "border rounded-lg p-4 flex flex-col md:flex-row justify-between items-center gap-4 bg-white shadow-sm";
        
        const infoDiv = document.createElement('div');
        infoDiv.innerHTML = `<p class="font-bold text-gray-800">Sesi ${i}</p><p class="text-sm text-gray-500">${tarikhDisplay}</p>`;
        
        const btn = document.createElement('button');
        if (isAttended) {
            btn.textContent = "Telah Hadir";
            btn.className = "w-full md:w-auto px-6 py-2 rounded-lg font-medium bg-green-100 text-green-800 cursor-not-allowed border border-green-200";
            btn.disabled = true;
        } else {
            btn.textContent = "Sahkan Kehadiran";
            btn.className = "w-full md:w-auto px-6 py-2 rounded-lg font-medium bg-blue-600 hover:bg-blue-700 text-white transition-colors focus:ring-2 focus:ring-offset-1 focus:ring-blue-500 shadow-sm";
            btn.onclick = () => handleAttendanceClick(i, rawTarikh, peranan);
        }
        
        div.appendChild(infoDiv);
        div.appendChild(btn);
        sessionsContainer.appendChild(div);
    }
    
    const btnPenilaian = document.getElementById('btn_penilaian');
    if(allAttended) {
        btnPenilaian.href = "https://docs.google.com/forms/d/e/1FAIpQLSe7_WJEFtBO5xi1rSsCqZliZerkAEtNy8qIQOYuYJnx7-lGRw/viewform";
        btnPenilaian.className = "block w-full px-6 py-2.5 rounded-lg font-medium bg-purple-600 hover:bg-purple-700 text-white transition-colors shadow-sm";
        btnPenilaian.onclick = null;
    } else {
        btnPenilaian.removeAttribute('href');
        btnPenilaian.className = "block w-full px-6 py-2.5 rounded-lg font-medium bg-gray-300 text-gray-500 cursor-not-allowed transition-colors";
        btnPenilaian.onclick = (e) => {
            e.preventDefault();
            showToast("Sila sahkan kehadiran untuk semua sesi terlebih dahulu.", "error");
        };
    }
}

document.getElementById('check-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const ic = document.getElementById('ic_check').value.trim();
    if(ic) checkIC(ic);
});

document.getElementById('register-form').addEventListener('submit', registerUser);

document.getElementById('reg_subjek').addEventListener('change', (e) => {
    const info = document.getElementById('reg_tarikh_info');
    const val = e.target.value;
    if(val && subjectDatesMap[val]) {
        const dates = subjectDatesMap[val];
        info.textContent = `Tarikh: Sesi 1 (${formatDateDisplay(dates.s1)}), Sesi 2 (${formatDateDisplay(dates.s2)})`;
    } else {
        info.textContent = "";
    }
});

document.getElementById('btn-batal-reg').addEventListener('click', () => {
    document.getElementById('ic_check').value = '';
    document.getElementById('reg_tarikh_info').textContent = '';
    document.getElementById('register-form').reset();
    
    document.getElementById('subjek_container').classList.remove('hidden-view');
    document.getElementById('reg_subjek').required = true;

    if(tomSelectInstance) tomSelectInstance.clear();
    showView('check');
});

document.getElementById('btn-keluar').addEventListener('click', () => {
    currentRecord = null;
    document.getElementById('ic_check').value = '';
    showView('check');
});