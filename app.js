import { subjectDatesMap, absoluteDates, WORKSHOP_LAT, WORKSHOP_LNG, MAX_RADIUS_METERS } from './config.js';
import { formatDateDisplay, getSmartDateRangeString, isDateArrived, calculateDistance } from './utils.js';
import { getSchoolsData, getUserByIC, getExactRoleCount, registerNewUser, updateRecord } from './data.js';
import { generateSingleCertificate } from './pdf-service.js';

const views = {
    check: document.getElementById('check-view'),
    register: document.getElementById('register-view'),
    dashboard: document.getElementById('dashboard-view'),
    loading: document.getElementById('loading-view')
};

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

async function checkRoleAvailability() {
    try {
        const pegCount = await getExactRoleCount('PEGAWAI');
        const jurCount = await getExactRoleCount('JURULATIH');
        
        const countMap = {
            'PEGAWAI': pegCount,
            'JURULATIH': jurCount
        };

        const limits = {
            'PEGAWAI': 10,
            'JURULATIH': 9
        };

        const selectPeranan = document.getElementById('reg_peranan');
        if (!selectPeranan) return;

        Array.from(selectPeranan.options).forEach(option => {
            const peranan = option.value;
            if (limits[peranan] !== undefined && countMap[peranan] >= limits[peranan]) {
                option.disabled = true;
                if (!option.textContent.includes('(Penuh)')) {
                    option.textContent = `${option.textContent} (Penuh)`;
                }
            }
        });

    } catch (err) {
        console.error("Ralat menyemak ketersediaan peranan:", err);
    }
}

function filterAvailableSubjects() {
    const subjectSelect = document.getElementById('reg_subjek');
    if (!subjectSelect) return;

    const currentDate = new Date();
    const year = currentDate.getFullYear();
    const month = String(currentDate.getMonth() + 1).padStart(2, '0');
    const day = String(currentDate.getDate()).padStart(2, '0');
    const todayString = `${year}-${month}-${day}`;

    Array.from(subjectSelect.options).forEach(option => {
        if (!option.value) return;

        const dates = subjectDatesMap[option.value];
        if (dates) {
            // Membenarkan paparan opsyen hanya pada hari kejadian sesi 1 atau sesi 2
            if (todayString === dates.s1 || todayString === dates.s2) {
                option.disabled = false;
                option.textContent = option.value;
            } else {
                option.disabled = true;
                option.textContent = `${option.value} (Tutup)`;
            }
        }
    });
}

async function loadSchools() {
    if (schoolsLoaded) return;
    try {
        const data = await getSchoolsData();
        
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
        const data = await getUserByIC(ic);

        if (data) {
            currentRecord = data;
            setupDashboard();
            showView('dashboard');
            showToast("Rekod ditemui", "success");
        } else {
            document.getElementById('reg_ic').value = ic;
            await loadSchools();
            await checkRoleAvailability();
            filterAvailableSubjects();
            showView('register');
            showToast("Rekod tidak ditemui. Sila daftar.", "info");
        }
    } catch (err) {
        console.error("Ralat semakan:", err);
        showToast("Ralat sistem", "error");
        showView('check');
    }
}

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
            const hadMaksimum = peranan === 'PEGAWAI' ? 10 : 9;
            const count = await getExactRoleCount(peranan);

            if (count >= hadMaksimum) {
                showToast(`Maaf, kuota pendaftaran ${peranan} telah penuh (${count}/${hadMaksimum}).`, "error");
                await checkRoleAvailability();
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

        const data = await registerNewUser(insertData);
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
        showToast("Gagal mendaftar. Ralat data atau No KP mungkin wujud.", "error");
        showView('register');
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
    let attendedDates = [];

    for (let i = 1; i <= totalSessions; i++) {
        const isAttended = currentRecord[`sesi_${i}_hadir`];
        if (!isAttended) allAttended = false;

        const rawTarikh = isExempt ? absoluteDates[i-1] : currentRecord[`sesi_${i}_tarikh`];
        const tarikhDisplay = formatDateDisplay(rawTarikh);

        if (isExempt && isAttended) {
             attendedDates.push(rawTarikh);
        }

        const div = document.createElement('div');
        div.className = "border rounded-lg p-4 flex flex-col md:flex-row justify-between items-center gap-4 bg-white shadow-sm";

        const infoDiv = document.createElement('div');
        infoDiv.innerHTML = `<p class="font-bold text-slate-800">Sesi ${i}</p><p class="text-sm text-slate-500">${tarikhDisplay}</p>`;

        const btn = document.createElement('button');
        if (isAttended) {
            btn.textContent = "Telah Hadir";
            btn.className = "w-full md:w-auto px-6 py-2 rounded-lg font-medium bg-green-100 text-green-800 cursor-not-allowed border border-green-200";
            btn.disabled = true;
        } else {
            btn.textContent = "Sahkan Kehadiran";
            btn.className = "w-full md:w-auto px-6 py-2 rounded-lg font-medium bg-blue-600 hover:bg-blue-700 text-white transition-colors shadow-sm";
            btn.onclick = () => handleAttendanceClick(i, rawTarikh, peranan);
        }

        div.appendChild(infoDiv);
        div.appendChild(btn);
        sessionsContainer.appendChild(div);
    }

    const sijilContainer = document.getElementById('sijil_container');
    const sijilOptions = document.getElementById('sijil_options_container');
    const sijilCheckboxes = document.getElementById('sijil_checkboxes');

    sijilCheckboxes.innerHTML = '';

    if (isExempt) {
        if(attendedDates.length > 0) {
            sijilContainer.classList.remove('hidden-view');
            sijilOptions.classList.remove('hidden-view');
            attendedDates.forEach((tarikhRaw) => {
                const tarikhDisplay = formatDateDisplay(tarikhRaw);
                const label = document.createElement('label');
                label.className = "flex items-center space-x-2 text-sm text-slate-700 cursor-pointer";
                label.innerHTML = `
                    <input type="checkbox" class="cert-checkbox rounded text-green-600 focus:ring-green-500 border-slate-300" value="${tarikhRaw}" checked>
                    <span>${tarikhDisplay}</span>
                `;
                sijilCheckboxes.appendChild(label);
            });
        } else {
             sijilContainer.classList.add('hidden-view');
             sijilOptions.classList.add('hidden-view');
        }
    } else {
        if(allAttended){
           sijilContainer.classList.remove('hidden-view');
        }else{
           sijilContainer.classList.add('hidden-view');
        }
        sijilOptions.classList.add('hidden-view');
    }

    const btnPenilaian = document.getElementById('btn_penilaian');
    if(allAttended) {
        btnPenilaian.href = "https://docs.google.com/forms/d/e/1FAIpQLSe7_WJEFtBO5xi1rSsCqZliZerkAEtNy8qIQOYuYJnx7-lGRw/viewform";
        btnPenilaian.className = "block w-full px-6 py-2.5 rounded-lg font-medium bg-purple-600 hover:bg-purple-700 text-white transition-colors shadow-sm pointer-events-auto opacity-100";
        btnPenilaian.onclick = null;
    } else {
        btnPenilaian.removeAttribute('href');
        btnPenilaian.className = "block w-full px-6 py-2.5 rounded-lg font-medium bg-slate-300 text-slate-500 cursor-not-allowed transition-colors pointer-events-none opacity-50";
        btnPenilaian.onclick = (e) => {
            e.preventDefault();
            showToast("Sila sahkan kehadiran untuk semua sesi terlebih dahulu.", "error");
        };
    }
}

async function handleAttendanceClick(sesi, tarikh, peranan) {
    if (!isDateArrived(tarikh)) {
        showToast("Maaf, tarikh bengkel belum tiba. Pengesahan ditutup.", "error");
        return;
    }

    const isExempt = peranan === 'PEGAWAI' || peranan === 'JURULATIH';

    if (!isExempt) {
        if (!navigator.geolocation) {
            showToast("Sistem GPS tidak disokong oleh pelayar anda.", "error");
            return;
        }

        showLoading("Mengesahkan lokasi anda...");

        navigator.geolocation.getCurrentPosition(
            (position) => {
                const userLat = position.coords.latitude;
                const userLng = position.coords.longitude;
                const distance = calculateDistance(userLat, userLng, WORKSHOP_LAT, WORKSHOP_LNG);

                if (distance <= MAX_RADIUS_METERS) {
                    markAttendance(sesi);
                } else {
                    showView('dashboard');
                    showToast(`Pengesahan gagal. Anda berada ${Math.round(distance)} meter dari lokasi bengkel. (Had: 200m).`, "error");
                }
            },
            (error) => {
                showView('dashboard');
                switch(error.code) {
                    case error.PERMISSION_DENIED:
                        showToast("Sila benarkan akses lokasi (GPS) untuk mengesahkan kehadiran.", "error");
                        break;
                    case error.POSITION_UNAVAILABLE:
                        showToast("Maklumat lokasi tidak tersedia. Pastikan GPS peranti diaktifkan.", "error");
                        break;
                    case error.TIMEOUT:
                        showToast("Carian lokasi tamat tempoh. Sila cuba lagi.", "error");
                        break;
                    default:
                        showToast("Ralat tidak diketahui semasa mengesahkan lokasi.", "error");
                        break;
                }
            },
            {
                enableHighAccuracy: true,
                timeout: 10000,
                maximumAge: 0
            }
        );
    } else {
        markAttendance(sesi);
    }
}

async function markAttendance(sesi) {
    if(!currentRecord) return;
    showLoading("Mengesahkan kehadiran...");

    const updateData = {};
    updateData[`sesi_${sesi}_hadir`] = true;

    try {
        const data = await updateRecord(currentRecord.id, updateData);
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

async function handleSijilClick() {
    const isExempt = currentRecord.peranan === 'PEGAWAI' || currentRecord.peranan === 'JURULATIH';
    let userSelectedDates = [];

    if (isExempt) {
        const checkboxes = document.querySelectorAll('.cert-checkbox:checked');
        if (checkboxes.length === 0) {
             showToast("Sila pilih sekurang-kurangnya satu tarikh.", "error");
             return;
        }
        checkboxes.forEach(cb => userSelectedDates.push(cb.value));
    }

    const btn = document.getElementById('btn_jana_sijil');
    if(!btn) return;
    
    const originalText = btn.innerHTML;
    btn.innerHTML = `<svg class="animate-spin h-5 w-5 mr-2 text-white inline" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg> Menjana...`;
    btn.disabled = true;

    try {
        const doc = await generateSingleCertificate(currentRecord, userSelectedDates);
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

document.addEventListener('DOMContentLoaded', () => {
    checkRoleAvailability();
    
    document.getElementById('check-form').addEventListener('submit', (e) => {
        e.preventDefault();
        const ic = document.getElementById('ic_check').value.trim();
        if(ic) checkIC(ic);
    });

    document.getElementById('register-form').addEventListener('submit', registerUser);

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

    const btnJana = document.getElementById('btn_jana_sijil');
    if(btnJana) {
        btnJana.addEventListener('click', handleSijilClick);
    }
});