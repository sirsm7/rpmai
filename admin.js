import { ADMIN_PWD, groupConfig, subjectDatesMap, absoluteDates, masterSekolah } from './config.js';
import { getSchoolsData, getAdminDashboardStats, getAdminTableData, deleteRecord, updateRecord } from './data.js';
import { generateBulkCertificates, generateAttendanceReport } from './pdf-service.js';
import { getSmartDateRangeString, formatDateDisplay } from './utils.js';

// State tempatan aplikasi Admin
let currentData = [];
let schoolsLoaded = false;
let schoolMap = {};
let tomSelectInstance = null;

let editingId = null;
let deletingId = null;
let currentFilter = null;

// ==========================================
// PENGENDALIAN MODAL & MAKLUMAN (UI UTILITY)
// ==========================================
function showMsg(title, body) {
    document.getElementById('msg-title').textContent = title;
    document.getElementById('msg-body').textContent = body;
    document.getElementById('msg-modal').classList.remove('hidden-view');
}

window.closeMsg = function() {
    document.getElementById('msg-modal').classList.add('hidden-view');
};

// ==========================================
// INISIALISASI DATA AWAL
// ==========================================
async function loadSchools() {
    if (schoolsLoaded) return;
    try {
        const data = await getSchoolsData();
        const select = document.getElementById('edit_sekolah');
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

        // Pengecualian tambahan bagi PPD
        schoolMap["M030"] = "PEJABAT PENDIDIKAN DAERAH ALOR GAJAH";
        const ppdOption = document.createElement('option');
        ppdOption.value = "M030";
        ppdOption.textContent = `PEJABAT PENDIDIKAN DAERAH ALOR GAJAH (M030)`;
        select.appendChild(ppdOption);

        if(tomSelectInstance) tomSelectInstance.destroy();
        tomSelectInstance = new TomSelect("#edit_sekolah", {
            create: false,
            sortField: { field: "text", direction: "asc" },
            placeholder: "Cari nama sekolah atau kod...",
        });

        schoolsLoaded = true;
    } catch (err) {
        console.error("Ralat muat sekolah:", err);
    }
}

async function loadDashboardStats() {
    try {
        const stats = await getAdminDashboardStats();

        document.getElementById('sum_pegawai').textContent = `${stats.pegawai} / 10`;
        document.getElementById('sum_jurulatih').textContent = `${stats.jurulatih} / 9`;
        document.getElementById('sum_guru').innerHTML = `${stats.guru}`;

        document.getElementById('summary-cards').classList.remove('hidden-view');
    } catch (err) {
        console.error("Ralat stat:", err);
    }
}

// ==========================================
// PROSES LOG MASUK / LOG KELUAR
// ==========================================
document.getElementById('login-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const pwd = document.getElementById('admin_pwd').value;
    if(pwd === ADMIN_PWD) {
        document.getElementById('login-view').classList.add('hidden-view');
        document.getElementById('dashboard-view').classList.remove('hidden-view');
        document.getElementById('admin_pwd').value = '';
        document.getElementById('login-error').classList.add('hidden-view');
        
        // Memuatkan konfigurasi awal setelah log masuk berjaya
        loadSchools();
        loadDashboardStats();
    } else {
        document.getElementById('login-error').classList.remove('hidden-view');
    }
});

document.getElementById('btn-logout').addEventListener('click', () => {
    document.getElementById('dashboard-view').classList.add('hidden-view');
    document.getElementById('login-view').classList.remove('hidden-view');
    document.getElementById('table-body').innerHTML = '<tr><td colspan="6" class="px-6 py-12 text-center text-sm text-slate-500">Sila pilih kumpulan subjek dan klik "Papar".</td></tr>';
    document.getElementById('filter_subjek').value = '';
    
    // Matikan kawalan data
    const btns = ['btn-pdf', 'btn-sijil-pukal', 'check-all-cert'];
    btns.forEach(id => {
        const btn = document.getElementById(id);
        if (btn) btn.disabled = true;
    });
    
    document.getElementById('summary-cards').classList.add('hidden-view');

    // Sembunyikan butang tambahan
    const hiddenBtns = ['btn-semak-sekolah', 'btn-reset-filter', 'btn-semak-kuota', 'btn-pukal-hadir-1', 'btn-pukal-hadir-2', 'btn-pukal-tak-hadir-1', 'btn-pukal-tak-hadir-2'];
    hiddenBtns.forEach(id => {
        const btn = document.getElementById(id);
        if (btn) btn.classList.add('hidden-view');
    });

    currentData = [];
    currentFilter = null;
});

// ==========================================
// PAPARAN JADUAL & PENAPISAN
// ==========================================
async function fetchTableData() {
    const selGroup = document.getElementById('filter_subjek').value;
    const tbody = document.getElementById('table-body');
    const summary = document.getElementById('summary-cards');
    
    // Tetapan butang UI
    const controls = {
        pdf: document.getElementById('btn-pdf'),
        sijil: document.getElementById('btn-sijil-pukal'),
        checkAll: document.getElementById('check-all-cert')
    };

    currentFilter = null;
    const btnReset = document.getElementById('btn-reset-filter');
    if(btnReset) btnReset.classList.add('hidden-view');

    if(!selGroup) {
        showMsg("Ralat", "Sila pilih kumpulan subjek.");
        return;
    }

    const conf = groupConfig[selGroup];
    const isSM = conf.label.includes('(SM)');

    // Loading State
    tbody.innerHTML = '<tr><td colspan="6" class="px-6 py-12 text-center"><svg class="animate-spin h-6 w-6 text-blue-600 mx-auto" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg></td></tr>';
    
    Object.values(controls).forEach(c => { if(c) c.disabled = true; });
    if(controls.checkAll) controls.checkAll.checked = false;
    currentData = [];

    try {
        const { guruData, pegData, jurData } = await getAdminTableData(conf.subjects);

        // Kemas kini Dashboard Stats berdasarkan set tarikan terbaru
        document.getElementById('sum_pegawai').textContent = `${pegData.length} / 10`;
        document.getElementById('sum_jurulatih').textContent = `${jurData.length} / 9`;
        document.getElementById('sum_guru').innerHTML = `${guruData.length}`;

        // Suntik rekod Dummy bagi Pegawai dan Jurulatih agar slot nampak jelas (visual UX)
        let paddedPegawai = [...pegData];
        while(paddedPegawai.length < 10) paddedPegawai.push({ isDummy: true, roleLabel: 'PEGAWAI', peranan: 'PEGAWAI' });

        let paddedJurulatih = [...jurData];
        while(paddedJurulatih.length < 9) paddedJurulatih.push({ isDummy: true, roleLabel: 'JURULATIH', peranan: 'JURULATIH' });

        currentData = [...paddedPegawai, ...paddedJurulatih, ...guruData];
        summary.classList.remove('hidden-view');

        if(guruData.length === 0 && pegData.length === 0 && jurData.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" class="px-6 py-12 text-center text-sm text-slate-500">Tiada rekod pendaftaran untuk subjek ini.</td></tr>';
            
            // Sembunyikan butang tindakan kumpulan
            ['btn-semak-sekolah', 'btn-semak-kuota', 'btn-pukal-hadir-1', 'btn-pukal-hadir-2', 'btn-pukal-tak-hadir-1', 'btn-pukal-tak-hadir-2'].forEach(id => {
                const b = document.getElementById(id);
                if(b) b.classList.add('hidden-view');
            });
            return;
        }

        renderTable(currentFilter);
        
        Object.values(controls).forEach(c => { if(c) c.disabled = false; });

        // Kawalan pendedahan elemen Semakan & Tindakan
        const toggles = [
            { id: 'btn-semak-sekolah', show: true },
            { id: 'btn-semak-kuota', show: isSM },
            { id: 'btn-pukal-hadir-1', show: true },
            { id: 'btn-pukal-hadir-2', show: true },
            { id: 'btn-pukal-tak-hadir-1', show: true },
            { id: 'btn-pukal-tak-hadir-2', show: true }
        ];

        toggles.forEach(t => {
            const el = document.getElementById(t.id);
            if(el) {
                if(t.show) el.classList.remove('hidden-view');
                else el.classList.add('hidden-view');
            }
        });

    } catch (err) {
        console.error("Ralat fetching jadual:", err);
        tbody.innerHTML = '<tr><td colspan="6" class="px-6 py-12 text-center text-sm text-red-500">Berlaku ralat sistem semasa mengakses pangkalan data. Sila cuba lagi.</td></tr>';
    }
}

document.getElementById('btn-cari').addEventListener('click', fetchTableData);

window.tapisSenarai = function(peranan) {
    if (currentData.length === 0) return;
    currentFilter = peranan;
    renderTable(peranan);

    let btnReset = document.getElementById('btn-reset-filter');
    if (!btnReset) {
        btnReset = document.createElement('button');
        btnReset.id = 'btn-reset-filter';
        btnReset.className = 'px-4 py-2 bg-slate-500 text-white text-sm font-medium rounded hover:bg-slate-600 transition-colors shadow-sm ml-2';
        btnReset.textContent = 'Reset Paparan';
        btnReset.onclick = function() {
            currentFilter = null;
            renderTable();
            this.classList.add('hidden-view');
        };

        const btnPdf = document.getElementById('btn-pdf');
        if (btnPdf && btnPdf.parentNode) {
            btnPdf.parentNode.insertBefore(btnReset, btnPdf.nextSibling);
        }
    }
    btnReset.classList.remove('hidden-view');
};

function renderTable(filterPeranan = null) {
    const tbody = document.getElementById('table-body');
    const selGroup = document.getElementById('filter_subjek').value;
    const conf = groupConfig[selGroup];
    let html = '';

    let dataToRender = currentData;
    if (filterPeranan) {
        dataToRender = currentData.filter(row => row.peranan === filterPeranan || row.roleLabel === filterPeranan);
    }

    if (dataToRender.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" class="px-6 py-12 text-center text-sm text-slate-500">Tiada rekod pendaftaran untuk kategori ${filterPeranan || 'ini'}.</td></tr>`;
        return;
    }

    const checkAllBox = document.getElementById('check-all-cert');
    if(checkAllBox) checkAllBox.checked = false;

    dataToRender.forEach((row, i) => {
        if(row.isDummy) {
            html += `
                <tr class="bg-slate-50/50">
                    <td class="px-4 py-4 text-center"></td>
                    <td class="px-4 py-4 text-sm text-slate-400 text-center">${i + 1}</td>
                    <td class="px-4 py-4 text-sm text-slate-400 italic" colspan="4">Kekosongan Slot ${row.roleLabel}</td>
                </tr>
            `;
            return;
        }

        const role = row.peranan || 'GURU';
        const isExempt = role === 'PEGAWAI' || role === 'JURULATIH';

        const hadir1 = isExempt ? row[`sesi_${conf.exemptS1}_hadir`] : row.sesi_1_hadir;
        const hadir2 = isExempt ? row[`sesi_${conf.exemptS2}_hadir`] : row.sesi_2_hadir;

        const sesi1Key = isExempt ? conf.exemptS1 : 1;
        const sesi2Key = isExempt ? conf.exemptS2 : 2;

        const badge1 = hadir1
            ? `<button onclick="toggleAttendance('${row.id}', ${sesi1Key}, true)" class="px-2 py-0.5 inline-flex text-xs leading-4 font-semibold rounded-full bg-green-100 hover:bg-green-200 text-green-800 transition-colors border border-green-200 cursor-pointer" title="Batal Hadir">Hadir</button>`
            : `<button onclick="toggleAttendance('${row.id}', ${sesi1Key}, false)" class="px-2 py-0.5 inline-flex text-xs leading-4 font-semibold rounded-full bg-red-100 hover:bg-red-200 text-red-800 transition-colors border border-red-200 cursor-pointer" title="Sahkan Hadir">Tidak</button>`;

        const badge2 = hadir2
            ? `<button onclick="toggleAttendance('${row.id}', ${sesi2Key}, true)" class="px-2 py-0.5 inline-flex text-xs leading-4 font-semibold rounded-full bg-green-100 hover:bg-green-200 text-green-800 transition-colors border border-green-200 cursor-pointer" title="Batal Hadir">Hadir</button>`
            : `<button onclick="toggleAttendance('${row.id}', ${sesi2Key}, false)" class="px-2 py-0.5 inline-flex text-xs leading-4 font-semibold rounded-full bg-red-100 hover:bg-red-200 text-red-800 transition-colors border border-red-200 cursor-pointer" title="Sahkan Hadir">Tidak</button>`;

        let layakSijil = false;
        if (isExempt) {
            for(let j=1; j<=8; j++) {
                if(row[`sesi_${j}_hadir`]) layakSijil = true;
            }
        } else {
            layakSijil = hadir1 && hadir2;
        }

        const checkboxHtml = layakSijil
            ? `<input type="checkbox" class="check-cert rounded text-blue-600 focus:ring-blue-500" value="${row.id}">`
            : `<input type="checkbox" disabled class="rounded text-slate-300 opacity-50 cursor-not-allowed" title="Belum cukup kehadiran">`;

        html += `
            <tr class="hover:bg-slate-50 transition-colors">
                <td class="px-4 py-4 text-center align-top">${checkboxHtml}</td>
                <td class="px-4 py-4 text-sm text-slate-500 text-center align-top">${i + 1}</td>
                <td class="px-4 py-4 align-top">
                    <div class="text-sm font-bold text-slate-900 uppercase break-words">${row.nama_penuh}</div>
                    <div class="text-xs text-slate-500 mt-0.5 break-words">KP: ${row.ic_no} | ${role} ${!isExempt && row.subjek ? `(${row.subjek})` : ''}</div>
                </td>
                <td class="px-4 py-4 text-sm text-slate-600 align-top">
                    <div class="font-medium break-words">${row.kod_sekolah || '-'}</div>
                    <div class="text-xs break-words">${row.nama_sekolah || ''}</div>
                </td>
                <td class="px-4 py-4 text-center align-top">
                    <div class="flex flex-col gap-1 items-center">
                        <div class="text-xs text-slate-500 flex items-center justify-between w-24">Sesi 1: ${badge1}</div>
                        <div class="text-xs text-slate-500 flex items-center justify-between w-24">Sesi 2: ${badge2}</div>
                    </div>
                </td>
                <td class="px-4 py-4 text-right text-sm font-medium whitespace-nowrap align-top">
                    <div class="flex flex-col gap-2 items-end">
                        <button onclick="openEdit('${row.id}')" class="text-blue-600 hover:text-blue-900 px-2 py-1 rounded hover:bg-blue-50 transition-colors">Edit</button>
                        <button onclick="openDelete('${row.id}')" class="text-red-600 hover:text-red-900 px-2 py-1 rounded hover:bg-red-50 transition-colors">Padam</button>
                    </div>
                </td>
            </tr>
        `;
    });
    tbody.innerHTML = html;
}

// Toggle "Check All" function
const checkAllInput = document.getElementById('check-all-cert');
if(checkAllInput) {
    checkAllInput.addEventListener('change', function() {
        const isChecked = this.checked;
        const checkboxes = document.querySelectorAll('.check-cert');
        checkboxes.forEach(cb => {
            cb.checked = isChecked;
        });
    });
}

// ==========================================
// KAWALAN KEHADIRAN & TINDAKAN JADUAL
// ==========================================
window.toggleAttendance = async function(id, sesi, currentStatus) {
    const newStatus = !currentStatus;
    try {
        const updateData = {};
        updateData[`sesi_${sesi}_hadir`] = newStatus;

        await updateRecord(id, updateData);

        // Update local object array to prevent unnecessary full network fetch
        const record = currentData.find(r => r.id === id);
        if(record) {
            record[`sesi_${sesi}_hadir`] = newStatus;
            renderTable(currentFilter);
        }
    } catch (err) {
        console.error(err);
        showMsg("Ralat", "Gagal mengemaskini kehadiran.");
    }
};

async function markBulkAttendance(sesi, isHadir) {
    if (currentData.length === 0) return;

    let dataToUpdate = currentData.filter(row => !row.isDummy);
    if (currentFilter) {
        dataToUpdate = dataToUpdate.filter(row => row.peranan === currentFilter || row.roleLabel === currentFilter);
    }

    if (dataToUpdate.length === 0) {
        showMsg("Makluman", "Tiada rekod untuk dikemaskini bagi pandangan ini.");
        return;
    }

    const selGroup = document.getElementById('filter_subjek').value;
    const conf = groupConfig[selGroup];

    const btnId = isHadir ? `btn-pukal-hadir-${sesi}` : `btn-pukal-tak-hadir-${sesi}`;
    const originalBtnText = document.getElementById(btnId).textContent;
    document.getElementById(btnId).textContent = "Memproses...";
    document.getElementById(btnId).disabled = true;

    // Build update promises to execute in parallel
    const updatePromises = dataToUpdate.map(async (row) => {
        const role = row.peranan || 'GURU';
        const isExempt = role === 'PEGAWAI' || role === 'JURULATIH';

        let updateColumn = '';
        if (sesi === 1) {
            updateColumn = isExempt ? `sesi_${conf.exemptS1}_hadir` : 'sesi_1_hadir';
        } else {
            updateColumn = isExempt ? `sesi_${conf.exemptS2}_hadir` : 'sesi_2_hadir';
        }

        const updateData = {};
        updateData[updateColumn] = isHadir;

        await updateRecord(row.id, updateData);
        row[updateColumn] = isHadir;
    });

    try {
        await Promise.all(updatePromises);
        const statusText = isHadir ? "Hadir" : "Tidak Hadir";
        showMsg("Berjaya", `Status ${statusText} Sesi ${sesi} telah dikemaskini bagi ${dataToUpdate.length} peserta.`);
        renderTable(currentFilter);
    } catch (err) {
        console.error("Ralat kemaskini pukal:", err);
        showMsg("Ralat", "Terdapat ralat semasa mengemaskini sebahagian rekod.");
        // Re-render incase some requests were successful
        renderTable(currentFilter);
    } finally {
        document.getElementById(btnId).textContent = originalBtnText;
        document.getElementById(btnId).disabled = false;
    }
}

// Bind Pukal Buttons
['btn-pukal-hadir-1', 'btn-pukal-hadir-2', 'btn-pukal-tak-hadir-1', 'btn-pukal-tak-hadir-2'].forEach(id => {
    const btn = document.getElementById(id);
    if(btn) {
        btn.addEventListener('click', () => {
            if(id.includes('hadir-1')) markBulkAttendance(1, !id.includes('tak-hadir'));
            else if(id.includes('hadir-2')) markBulkAttendance(2, !id.includes('tak-hadir'));
        });
    }
});

// ==========================================
// PROSES PADAM & KEMASKINI (MODAL)
// ==========================================
window.openDelete = function(id) {
    deletingId = id;
    document.getElementById('delete-modal').classList.remove('hidden-view');
};

window.closeDelete = function() {
    deletingId = null;
    document.getElementById('delete-modal').classList.add('hidden-view');
};

window.confirmDelete = async function() {
    if(!deletingId) return;
    try {
        await deleteRecord(deletingId);
        
        closeDelete();
        loadDashboardStats();
        
        if(document.getElementById('filter_subjek').value !== '') {
            fetchTableData();
        }

        showMsg("Berjaya", "Rekod telah dipadam.");
    } catch (err) {
        console.error(err);
        closeDelete();
        showMsg("Ralat", "Gagal memadam rekod.");
    }
};

window.openEdit = function(id) {
    editingId = id;
    const record = currentData.find(r => r.id === id && !r.isDummy);
    if(!record) return;

    document.getElementById('edit_nama').value = record.nama_penuh;
    document.getElementById('edit_ic').value = record.ic_no;
    document.getElementById('edit_subjek').value = record.subjek || '';
    document.getElementById('edit_peranan').value = record.peranan || 'GURU';

    if(tomSelectInstance && record.kod_sekolah) {
        tomSelectInstance.setValue(record.kod_sekolah);
    }

    document.getElementById('edit-modal').classList.remove('hidden-view');
};

window.closeEdit = function() {
    editingId = null;
    document.getElementById('edit-form').reset();
    document.getElementById('edit-modal').classList.add('hidden-view');
};

document.getElementById('edit-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    if(!editingId) return;

    const btn = document.getElementById('btn-save-edit');
    btn.disabled = true;
    btn.textContent = "Menyimpan...";

    const subjek = document.getElementById('edit_subjek').value;
    const kodSekolah = document.getElementById('edit_sekolah').value;
    const peranan = document.getElementById('edit_peranan').value;

    const kemaskiniData = {
        nama_penuh: document.getElementById('edit_nama').value.toUpperCase(),
        subjek: subjek,
        peranan: peranan,
        kod_sekolah: kodSekolah,
        nama_sekolah: schoolMap[kodSekolah],
        sesi_1_tarikh: subjectDatesMap[subjek] ? subjectDatesMap[subjek].s1 : null,
        sesi_2_tarikh: subjectDatesMap[subjek] ? subjectDatesMap[subjek].s2 : null
    };

    if(peranan === 'PEGAWAI' || peranan === 'JURULATIH') {
        kemaskiniData.subjek = null;
    }

    try {
        await updateRecord(editingId, kemaskiniData);

        closeEdit();
        loadDashboardStats();
        
        if(document.getElementById('filter_subjek').value !== '') {
            fetchTableData();
        }

        showMsg("Berjaya", "Rekod peserta telah dikemaskini.");
    } catch (err) {
        console.error(err);
        showMsg("Ralat", "Gagal menyimpan pengemaskinian rekod.");
    } finally {
        btn.disabled = false;
        btn.textContent = "Simpan Perubahan";
    }
});

// ==========================================
// SEMAKAN SEKOLAH (MODAL DATA)
// ==========================================
window.bukaModalSemakSekolah = function() {
    const selGroup = document.getElementById('filter_subjek').value;
    if (!selGroup) {
        showMsg("Ralat", "Sila pilih kumpulan subjek dan papar data terlebih dahulu.");
        return;
    }

    const conf = groupConfig[selGroup];
    const isSR = conf.label.includes('(SR)');
    const isSM = conf.label.includes('(SM)');

    let validTypes = [];
    if (isSR) {
        validTypes = ['SK', 'SJKT', 'SJKC', 'SR SABK'];
    } else if (isSM) {
        validTypes = ['SMK', 'SBP', 'KV', 'SM SABK'];
    }

    const targetSchools = masterSekolah.filter(s => validTypes.includes(s.jenis));

    const registeredCodes = currentData
        .filter(r => !r.isDummy && r.peranan === 'GURU' && r.kod_sekolah)
        .map(r => r.kod_sekolah);

    const missingSchools = targetSchools.filter(s => !registeredCodes.includes(s.kod));

    document.getElementById('kategori-sekolah-label').textContent = `KATEGORI: ${isSR ? 'SEKOLAH RENDAH (SR)' : 'SEKOLAH MENENGAH (SM)'}`;
    document.getElementById('jumlah-sekolah-tiada').textContent = `Jumlah tiada wakil: ${missingSchools.length} daripada ${targetSchools.length} buah sekolah`;

    const ul = document.getElementById('senarai-sekolah-tiada');
    ul.innerHTML = '';

    if (missingSchools.length === 0) {
        ul.innerHTML = '<li class="p-3 text-center text-emerald-600 font-medium">Semua sekolah bagi kategori ini telah mempunyai wakil yang berdaftar.</li>';
    } else {
        missingSchools.forEach((s, index) => {
            const li = document.createElement('li');
            li.className = 'p-3 hover:bg-slate-50 flex flex-col md:flex-row md:justify-between md:items-center';
            li.innerHTML = `
                <div>
                    <span class="font-semibold text-slate-800">${index + 1}. ${s.nama}</span>
                </div>
                <div class="mt-1 md:mt-0 text-xs font-medium bg-slate-200 text-slate-700 px-2 py-1 rounded w-max">
                    ${s.kod} | ${s.jenis}
                </div>
            `;
            ul.appendChild(li);
        });
    }

    document.getElementById('modal-sekolah-tiada').classList.remove('hidden-view');
};

window.tutupModalSemakSekolah = function() {
    document.getElementById('modal-sekolah-tiada').classList.add('hidden-view');
};

window.bukaModalSemakKuota = function() {
    const selGroup = document.getElementById('filter_subjek').value;
    if (!selGroup) {
        showMsg("Ralat", "Sila pilih kumpulan subjek dan papar data terlebih dahulu.");
        return;
    }

    const conf = groupConfig[selGroup];
    const isSM = conf.label.includes('(SM)');

    if (!isSM) {
        showMsg("Ralat", "Semakan kuota minimum peserta hanya diguna pakai untuk kumpulan Sekolah Menengah (SM).");
        return;
    }

    const validTypes = ['SMK', 'SBP', 'KV', 'SM SABK'];
    const targetSchools = masterSekolah.filter(s => validTypes.includes(s.jenis));

    const pendaftaranSekolah = {};
    targetSchools.forEach(s => pendaftaranSekolah[s.kod] = 0);

    // Kumpul data kehadiran berdaftar semasa
    currentData.forEach(row => {
        if (!row.isDummy && row.peranan === 'GURU' && row.kod_sekolah) {
            if (pendaftaranSekolah[row.kod_sekolah] !== undefined) {
                pendaftaranSekolah[row.kod_sekolah]++;
            }
        }
    });

    const kurangKuotaSchools = targetSchools.map(s => ({
        ...s,
        jumlahDaftar: pendaftaranSekolah[s.kod]
    })).filter(s => s.jumlahDaftar < 3);

    document.getElementById('kategori-kuota-label').textContent = `KATEGORI: SEKOLAH MENENGAH (SM) - KUOTA: 3`;
    document.getElementById('jumlah-kuota-sekolah').textContent = `Jumlah sekolah belum capai kuota: ${kurangKuotaSchools.length} daripada ${targetSchools.length} buah sekolah`;

    const ul = document.getElementById('senarai-kuota-sekolah');
    ul.innerHTML = '';

    if (kurangKuotaSchools.length === 0) {
        ul.innerHTML = '<li class="p-3 text-center text-emerald-600 font-medium">Cemerlang! Semua sekolah Menengah telah mencapai kuota pendaftaran minimum (3 orang).</li>';
    } else {
        kurangKuotaSchools.forEach((s, index) => {
            const li = document.createElement('li');
            li.className = 'p-3 hover:bg-rose-50 flex flex-col md:flex-row md:justify-between md:items-center border-b border-slate-100 last:border-0';

            const badgeWarna = s.jumlahDaftar === 0 ? 'bg-rose-100 text-rose-800 border-rose-200' : 'bg-orange-100 text-orange-800 border-orange-200';

            li.innerHTML = `
                <div>
                    <span class="font-semibold text-slate-800">${index + 1}. ${s.nama}</span>
                    <div class="mt-0.5 text-[10px] text-slate-500">${s.kod} | ${s.jenis}</div>
                </div>
                <div class="mt-2 md:mt-0 text-xs font-bold px-3 py-1 rounded border ${badgeWarna} w-max">
                    Daftar: ${s.jumlahDaftar} / 3
                </div>
            `;
            ul.appendChild(li);
        });
    }

    document.getElementById('modal-kuota-sekolah').classList.remove('hidden-view');
};

window.tutupModalSemakKuota = function() {
    document.getElementById('modal-kuota-sekolah').classList.add('hidden-view');
};

// ==========================================
// PENJANAAN PDF DARI MODUL BERASINGAN
// ==========================================

// Butang 1: PDF Laporan Kehadiran
document.getElementById('btn-pdf').addEventListener('click', async () => {
    if(currentData.length === 0) return;

    const btnPdf = document.getElementById('btn-pdf');
    const originalText = btnPdf.textContent;
    btnPdf.textContent = "Menjana...";
    btnPdf.disabled = true;

    const selGroup = document.getElementById('filter_subjek').value;
    const conf = groupConfig[selGroup];

    let dataToExport = currentData;
    if (currentFilter) {
        dataToExport = currentData.filter(row => row.peranan === currentFilter || row.roleLabel === currentFilter);
    }

    // Hanya ambil rekod yang lengkap kehadiran
    const fullyAttendedData = dataToExport.filter(row => {
        if(row.isDummy) return false;

        const role = row.peranan || 'GURU';
        const isExempt = role === 'PEGAWAI' || role === 'JURULATIH';

        const hadir1 = isExempt ? row[`sesi_${conf.exemptS1}_hadir`] : row.sesi_1_hadir;
        const hadir2 = isExempt ? row[`sesi_${conf.exemptS2}_hadir`] : row.sesi_2_hadir;

        return hadir1 && hadir2;
    });

    if (fullyAttendedData.length === 0) {
        showMsg("Tiada Rekod", `Tiada peserta${currentFilter ? ` bagi kategori ${currentFilter}` : ''} yang telah melengkapkan kedua-dua sesi kehadiran untuk dijana laporannya.`);
        btnPdf.textContent = originalText;
        btnPdf.disabled = false;
        return;
    }

    try {
        const doc = await generateAttendanceReport(fullyAttendedData, selGroup, currentFilter);
        
        const roleSuffix = currentFilter ? `_${currentFilter}` : '';
        const safeFileName = conf.label.replace(/[^a-zA-Z0-9]/g, '_');
        doc.save(`Kehadiran_Penuh_${safeFileName}${roleSuffix}.pdf`);
    } catch (err) {
        console.error("Ralat PDF Laporan:", err);
        showMsg("Ralat", "Gagal menjana laporan kehadiran PDF.");
    } finally {
        btnPdf.textContent = originalText;
        btnPdf.disabled = false;
    }
});

// Butang 2: PDF Sijil Pukal
document.getElementById('btn-sijil-pukal').addEventListener('click', async () => {
    const checkedBoxes = document.querySelectorAll('.check-cert:checked');
    if (checkedBoxes.length === 0) {
        showMsg("Tiada Pilihan", "Sila tandakan sekurang-kurangnya satu baris peserta untuk muat turun sijil.");
        return;
    }

    const btn = document.getElementById('btn-sijil-pukal');
    const originalText = btn.innerHTML;
    btn.innerHTML = `<svg class="animate-spin h-5 w-5 mr-2 text-white inline" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg> Menjana...`;
    btn.disabled = true;

    try {
        // Bina dataset peserta yang sah untuk sijil pukal
        const records = [];
        for (let i = 0; i < checkedBoxes.length; i++) {
            const recordId = checkedBoxes[i].value;
            const record = currentData.find(r => r.id === recordId);
            if (record) records.push(record);
        }

        const doc = await generateBulkCertificates(records);
        
        const selGroup = document.getElementById('filter_subjek').value;
        const groupLabel = groupConfig[selGroup] ? groupConfig[selGroup].label.replace(/[^a-zA-Z0-9]/g, '_') : 'Pukal';
        
        doc.save(`Sijil_Pukal_${groupLabel}.pdf`);
        showMsg("Berjaya", `${records.length} sijil peserta telah digabungkan ke dalam satu fail PDF dan sedang dimuat turun.`);
    } catch (err) {
        console.error("Ralat janaan sijil pukal:", err);
        showMsg("Ralat", "Berlaku ralat sistem ketika menjana sijil pukal.");
    } finally {
        btn.innerHTML = originalText;
        btn.disabled = false;
    }
});