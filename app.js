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
    if (!isDateArrived(tarikh)) {
        showToast("Maaf, tarikh bengkel belum tiba. Pengesahan ditutup.", "error");
        return;
    }
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

/* [COMMENT SYNTAX] SURGICAL EDIT START: Logik penjanaan e-sijil */
function getBase64Image(imgUrl) {
    return new Promise((resolve) => {
        const img = new Image();
        img.crossOrigin = 'Anonymous';
        img.src = imgUrl;
        img.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = img.width;
            canvas.height = img.height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0);
            resolve(canvas.toDataURL('image/png'));
        };
        img.onerror = () => resolve(null);
    });
}

async function generateCertificate() {
    const peranan = currentRecord.peranan || 'GURU';
    const isExempt = peranan === 'PEGAWAI' || peranan === 'JURULATIH';
    let tarikhTerpilih = [];

    if (isExempt) {
        const checkboxes = document.querySelectorAll('.cert-checkbox:checked');
        if (checkboxes.length === 0) {
            showToast("Sila pilih sekurang-kurangnya satu tarikh.", "error");
            return;
        }
        checkboxes.forEach(cb => {
            tarikhTerpilih.push(cb.value);
        });
    } else {
        const t1 = formatDateDisplay(currentRecord.sesi_1_tarikh);
        const t2 = formatDateDisplay(currentRecord.sesi_2_tarikh);
        tarikhTerpilih.push(`${t1} & ${t2}`);
    }

    const btn = document.getElementById('btn_jana_sijil');
    const originalText = btn.innerHTML;
    btn.innerHTML = `<svg class="animate-spin h-5 w-5 mr-2 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg> Menjana...`;
    btn.disabled = true;

    try {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF({
            orientation: 'landscape',
            unit: 'mm',
            format: 'a4'
        });

        const logoData = await getBase64Image('ikonppd.png');
        const signData = await getBase64Image('tttnhj.png');

        const pageWidth = doc.internal.pageSize.getWidth();
        const pageHeight = doc.internal.pageSize.getHeight();
        const centerX = pageWidth / 2;

        if (logoData) {
            doc.addImage(logoData, 'PNG', centerX - 20, 20, 40, 40);
        }

        doc.setFont("helvetica", "bold");
        doc.setFontSize(28);
        doc.setTextColor(30, 64, 175); 
        doc.text("SIJIL PENYERTAAN", centerX, 80, { align: 'center' });

        doc.setFont("helvetica", "normal");
        doc.setFontSize(14);
        doc.setTextColor(75, 85, 99);
        doc.text("Dengan ini disahkan bahawa", centerX, 95, { align: 'center' });

        doc.setFont("helvetica", "bold");
        doc.setFontSize(20);
        doc.setTextColor(17, 24, 39);
        doc.text(currentRecord.nama_penuh, centerX, 110, { align: 'center' });
        
        doc.setFont("helvetica", "normal");
        doc.setFontSize(12);
        doc.text(`No. Kad Pengenalan: ${currentRecord.ic_no}`, centerX, 118, { align: 'center' });

        doc.setFontSize(14);
        doc.setTextColor(75, 85, 99);
        doc.text("telah menyertai", centerX, 130, { align: 'center' });

        doc.setFont("helvetica", "bold");
        doc.setFontSize(16);
        doc.setTextColor(30, 64, 175);
        doc.text("BENGKEL PEMBINAAN BAHAN PDPC BERBANTU AI", centerX, 142, { align: 'center' });
        doc.text("GURU STEM DAERAH ALOR GAJAH", centerX, 150, { align: 'center' });

        doc.setFont("helvetica", "normal");
        doc.setFontSize(14);
        doc.setTextColor(75, 85, 99);
        const perananTeks = peranan === 'GURU' ? `sebagai ${peranan} (${currentRecord.subjek})` : `sebagai ${peranan}`;
        doc.text(perananTeks, centerX, 162, { align: 'center' });

        let tarikhGabung = tarikhTerpilih.join(', ');
        doc.setFontSize(12);
        doc.text(`pada ${tarikhGabung}`, centerX, 170, { align: 'center' });

        if (signData) {
            doc.addImage(signData, 'PNG', centerX - 25, 175, 50, 20);
        }

        doc.setFont("helvetica", "bold");
        doc.setFontSize(12);
        doc.setTextColor(17, 24, 39);
        doc.text("PEGAWAI PENDIDIKAN DAERAH", centerX, 198, { align: 'center' });
        doc.setFont("helvetica", "normal");
        doc.text("Pejabat Pendidikan Daerah Alor Gajah", centerX, 204, { align: 'center' });

        const safeFileName = currentRecord.nama_penuh.replace(/[^a-zA-Z0-9]/g, '_');
        doc.save(`Sijil_${safeFileName}.pdf`);

        showToast("Sijil berjaya dimuat turun.", "success");
    } catch (err) {
        console.error("Ralat sijil:", err);
        showToast("Gagal menjana sijil.", "error");
    } finally {
        btn.innerHTML = originalText;
        btn.disabled = false;
    }
}
document.getElementById('btn_jana_sijil').addEventListener('click', generateCertificate);
/* [COMMENT SYNTAX] SURGICAL EDIT END */

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
    
    /* [COMMENT SYNTAX] SURGICAL EDIT START: Logik penjejakan kehadiran untuk sijil */
    let anyAttended = false;
    let attendedDates = [];
    /* [COMMENT SYNTAX] SURGICAL EDIT END */

    for (let i = 1; i <= totalSessions; i++) {
        const isAttended = currentRecord[`sesi_${i}_hadir`];
        if (!isAttended) allAttended = false;
        
        const tarikhDisplay = isExempt ? formatDateDisplay(absoluteDates[i-1]) : formatDateDisplay(currentRecord[`sesi_${i}_tarikh`]);
        const rawTarikh = isExempt ? absoluteDates[i-1] : currentRecord[`sesi_${i}_tarikh`];
        
        /* [COMMENT SYNTAX] SURGICAL EDIT START: Simpan tarikh hadir */
        if (isAttended) {
            anyAttended = true;
            if (isExempt) attendedDates.push(tarikhDisplay);
        }
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
    
    /* [COMMENT SYNTAX] SURGICAL EDIT START: Urus paparan Sijil */
    const sijilContainer = document.getElementById('sijil_container');
    const sijilOptions = document.getElementById('sijil_options_container');
    const sijilCheckboxes = document.getElementById('sijil_checkboxes');
    
    sijilOptions.classList.add('hidden-view');
    sijilCheckboxes.innerHTML = '';

    if ((isExempt && anyAttended) || (!isExempt && allAttended)) {
        sijilContainer.classList.remove('hidden-view');
        
        if (isExempt) {
            sijilOptions.classList.remove('hidden-view');
            attendedDates.forEach((tarikh, idx) => {
                const label = document.createElement('label');
                label.className = "flex items-center space-x-2 text-sm text-gray-700 cursor-pointer";
                label.innerHTML = `
                    <input type="checkbox" class="cert-checkbox rounded text-green-600 focus:ring-green-500" value="${tarikh}" checked>
                    <span>${tarikh}</span>
                `;
                sijilCheckboxes.appendChild(label);
            });
        }
    } else {
        sijilContainer.classList.add('hidden-view');
    }
    /* [COMMENT SYNTAX] SURGICAL EDIT END */

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
