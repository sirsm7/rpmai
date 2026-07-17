const SUPABASE_URL = 'https://app.tech4ag.my';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoiYW5vbiIsImlzcyI6InN1cGFiYXNlIiwiaWF0IjoxNzYzMzczNjQ1LCJleHAiOjIwNzg3MzM2NDV9.vZOedqJzUn01PjwfaQp7VvRzSm4aRMr21QblPDK8AoY';
const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const ADMIN_PWD = "ppdag@12345";

let currentData = [];
let schoolsLoaded = false;
let schoolMap = {};
let tomSelectInstance = null;

let editingId = null;
let deletingId = null;

const groupConfig = {
    "G1": { label: "MATEMATIK (SR)", subjects: ["MATEMATIK (SR)"], d1: "20 Julai 2026", d2: "21 Julai 2026", exemptS1: 1, exemptS2: 2 },
    "G2": { label: "SAINS (SR)", subjects: ["SAINS (SR)"], d1: "22 Julai 2026", d2: "23 Julai 2026", exemptS1: 3, exemptS2: 4 },
    "G3": { label: "MATEMATIK & SAINS KOMPUTER (SM)", subjects: ["MATEMATIK (SM)", "SAINS KOMPUTER (SM)"], d1: "10 Ogos 2026", d2: "11 Ogos 2026", exemptS1: 5, exemptS2: 6 },
    "G4": { label: "SAINS & SAINS TULEN (SM)", subjects: ["SAINS (SM)", "SAINS TULEN (SM)"], d1: "12 Ogos 2026", d2: "13 Ogos 2026", exemptS1: 7, exemptS2: 8 }
};

const subjectDatesMap = {
    "MATEMATIK (SR)": { s1: "2026-07-20", s2: "2026-07-21" },
    "SAINS (SR)": { s1: "2026-07-22", s2: "2026-07-23" },
    "MATEMATIK (SM)": { s1: "2026-08-10", s2: "2026-08-11" },
    "SAINS KOMPUTER (SM)": { s1: "2026-08-10", s2: "2026-08-11" },
    "SAINS (SM)": { s1: "2026-08-12", s2: "2026-08-13" },
    "SAINS TULEN (SM)": { s1: "2026-08-12", s2: "2026-08-13" }
};

function showMsg(title, body) {
    document.getElementById('msg-title').textContent = title;
    document.getElementById('msg-body').textContent = body;
    document.getElementById('msg-modal').classList.remove('hidden-view');
}
function closeMsg() {
    document.getElementById('msg-modal').classList.add('hidden-view');
}

/* [COMMENT SYNTAX] SURGICAL EDIT START: Semakan Kuota Global */
async function loadDashboardStats() {
    try {
        const { count: pegCount } = await supabaseClient
            .from('edaftar_bengkel_ppdag')
            .select('*', { count: 'exact', head: true })
            .eq('peranan', 'PEGAWAI');

        const { count: jurCount } = await supabaseClient
            .from('edaftar_bengkel_ppdag')
            .select('*', { count: 'exact', head: true })
            .eq('peranan', 'JURULATIH');
        
        const { count: guruCount } = await supabaseClient
            .from('edaftar_bengkel_ppdag')
            .select('*', { count: 'exact', head: true })
            .eq('peranan', 'GURU');

        document.getElementById('sum_pegawai').textContent = `${pegCount || 0} / 10`;
        document.getElementById('sum_jurulatih').textContent = `${jurCount || 0} / 8`;
        document.getElementById('sum_guru').innerHTML = `${guruCount || 0} <span class="text-sm font-normal text-blue-600">(Semua)</span>`;
        
        document.getElementById('summary-cards').classList.remove('hidden-view');
    } catch (err) {
        console.error("Ralat stat:", err);
    }
}
/* [COMMENT SYNTAX] SURGICAL EDIT END */

document.getElementById('login-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const pwd = document.getElementById('admin_pwd').value;
    if(pwd === ADMIN_PWD) {
        document.getElementById('login-view').classList.add('hidden-view');
        document.getElementById('dashboard-view').classList.remove('hidden-view');
        document.getElementById('admin_pwd').value = '';
        document.getElementById('login-error').classList.add('hidden-view');
        loadSchools();
        /* [COMMENT SYNTAX] SURGICAL EDIT START: Panggil fungsi stat */
        loadDashboardStats();
        /* [COMMENT SYNTAX] SURGICAL EDIT END */
    } else {
        document.getElementById('login-error').classList.remove('hidden-view');
    }
});

document.getElementById('btn-logout').addEventListener('click', () => {
    document.getElementById('dashboard-view').classList.add('hidden-view');
    document.getElementById('login-view').classList.remove('hidden-view');
    document.getElementById('table-body').innerHTML = '<tr><td colspan="5" class="px-6 py-12 text-center text-sm text-gray-500">Sila pilih kumpulan subjek dan klik "Papar".</td></tr>';
    document.getElementById('filter_subjek').value = '';
    document.getElementById('btn-pdf').disabled = true;
    document.getElementById('summary-cards').classList.add('hidden-view');
    currentData = [];
});

async function loadSchools() {
    if (schoolsLoaded) return;
    try {
        const { data, error } = await supabaseClient
            .from('smpid_sekolah_data')
            .select('kod_sekolah, nama_sekolah')
            .order('nama_sekolah', { ascending: true });

        if (error) throw error;

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

async function fetchTableData() {
    const selGroup = document.getElementById('filter_subjek').value;
    const tbody = document.getElementById('table-body');
    const btnPdf = document.getElementById('btn-pdf');
    const summary = document.getElementById('summary-cards');

    if(!selGroup) {
        showMsg("Ralat", "Sila pilih kumpulan subjek.");
        return;
    }

    const conf = groupConfig[selGroup];

    tbody.innerHTML = '<tr><td colspan="5" class="px-6 py-12 text-center text-sm text-gray-500"><svg class="animate-spin h-6 w-6 text-blue-600 mx-auto" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg></td></tr>';
    btnPdf.disabled = true;
    currentData = [];

    try {
        const { data: guruData, error: guruErr } = await supabaseClient
            .from('edaftar_bengkel_ppdag')
            .select('*')
            .in('subjek', conf.subjects)
            .eq('peranan', 'GURU')
            .order('nama_sekolah', { ascending: true })
            .order('nama_penuh', { ascending: true });

        if (guruErr) throw guruErr;

        const { data: pegData, error: pegErr } = await supabaseClient
            .from('edaftar_bengkel_ppdag')
            .select('*')
            .eq('peranan', 'PEGAWAI')
            .order('nama_penuh', { ascending: true });

        if (pegErr) throw pegErr;

        const { data: jurData, error: jurErr } = await supabaseClient
            .from('edaftar_bengkel_ppdag')
            .select('*')
            .eq('peranan', 'JURULATIH')
            .order('nama_penuh', { ascending: true });

        if (jurErr) throw jurErr;

        /* [COMMENT SYNTAX] SURGICAL EDIT START: Label spesifik saringan untuk Guru */
        document.getElementById('sum_pegawai').textContent = `${(pegData || []).length} / 10`;
        document.getElementById('sum_jurulatih').textContent = `${(jurData || []).length} / 8`;
        document.getElementById('sum_guru').innerHTML = `${(guruData || []).length} <span class="text-sm font-normal text-blue-600">(Saringan)</span>`;
        /* [COMMENT SYNTAX] SURGICAL EDIT END */

        let paddedPegawai = [...(pegData || [])];
        while(paddedPegawai.length < 10) paddedPegawai.push({ isDummy: true, roleLabel: 'PEGAWAI' });

        let paddedJurulatih = [...(jurData || [])];
        while(paddedJurulatih.length < 8) paddedJurulatih.push({ isDummy: true, roleLabel: 'JURULATIH' });

        currentData = [...paddedPegawai, ...paddedJurulatih, ...(guruData || [])];

        summary.classList.remove('hidden-view');

        if(currentData.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" class="px-6 py-12 text-center text-sm text-gray-500">Tiada rekod pendaftaran untuk subjek ini.</td></tr>';
            return;
        }

        renderTable();
        btnPdf.disabled = false;

    } catch (err) {
        console.error("Ralat:", err);
        tbody.innerHTML = '<tr><td colspan="5" class="px-6 py-12 text-center text-sm text-red-500">Berlaku ralat sistem. Sila cuba lagi.</td></tr>';
    }
}

document.getElementById('btn-cari').addEventListener('click', fetchTableData);

function renderTable() {
    const tbody = document.getElementById('table-body');
    const selGroup = document.getElementById('filter_subjek').value;
    const conf = groupConfig[selGroup];
    let html = '';
    
    currentData.forEach((row, i) => {
        if(row.isDummy) {
            html += `
                <tr class="bg-slate-50/50">
                    <td class="px-4 py-4 whitespace-nowrap text-sm text-slate-400 text-center">${i + 1}</td>
                    <td class="px-4 py-4 text-sm text-slate-400 italic" colspan="4">Ruang ${row.roleLabel} (Kosong)</td>
                </tr>
            `;
            return;
        }

        const role = row.peranan || 'GURU';
        const isExempt = role === 'PEGAWAI' || role === 'JURULATIH';
        
        const hadir1 = isExempt ? row[`sesi_${conf.exemptS1}_hadir`] : row.sesi_1_hadir;
        const hadir2 = isExempt ? row[`sesi_${conf.exemptS2}_hadir`] : row.sesi_2_hadir;

        const badge1 = hadir1 
            ? '<span class="px-2 py-0.5 inline-flex text-xs leading-4 font-semibold rounded-full bg-green-100 text-green-800">Hadir</span>'
            : '<span class="px-2 py-0.5 inline-flex text-xs leading-4 font-semibold rounded-full bg-red-100 text-red-800">Tidak</span>';
        
        const badge2 = hadir2 
            ? '<span class="px-2 py-0.5 inline-flex text-xs leading-4 font-semibold rounded-full bg-green-100 text-green-800">Hadir</span>'
            : '<span class="px-2 py-0.5 inline-flex text-xs leading-4 font-semibold rounded-full bg-red-100 text-red-800">Tidak</span>';

        html += `
            <tr class="hover:bg-slate-50 transition-colors">
                <td class="px-4 py-4 whitespace-nowrap text-sm text-slate-500 text-center">${i + 1}</td>
                <td class="px-4 py-4">
                    <div class="text-sm font-bold text-slate-900 uppercase">${row.nama_penuh}</div>
                    <div class="text-xs text-slate-500 mt-0.5">KP: ${row.ic_no} | ${role} ${!isExempt && row.subjek ? `(${row.subjek})` : ''}</div>
                </td>
                <td class="px-4 py-4 text-sm text-slate-600">
                    <div class="font-medium">${row.kod_sekolah || '-'}</div>
                    <div class="text-xs truncate max-w-xs">${row.nama_sekolah || ''}</div>
                </td>
                <td class="px-4 py-4 text-center">
                    <div class="flex flex-col gap-1 items-center">
                        <div class="text-xs text-slate-500 flex items-center justify-between w-24">Sesi 1: ${badge1}</div>
                        <div class="text-xs text-slate-500 flex items-center justify-between w-24">Sesi 2: ${badge2}</div>
                    </div>
                </td>
                <td class="px-4 py-4 text-right text-sm font-medium whitespace-nowrap">
                    <button onclick="openEdit('${row.id}')" class="text-blue-600 hover:text-blue-900 mr-3 px-2 py-1 rounded hover:bg-blue-50 transition-colors">Edit</button>
                    <button onclick="openDelete('${row.id}')" class="text-red-600 hover:text-red-900 px-2 py-1 rounded hover:bg-red-50 transition-colors">Padam</button>
                </td>
            </tr>
        `;
    });
    tbody.innerHTML = html;
}

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
        const { error } = await supabaseClient
            .from('edaftar_bengkel_ppdag')
            .delete()
            .eq('id', deletingId);
        
        if(error) throw error;
        
        closeDelete();
        
        /* [COMMENT SYNTAX] SURGICAL EDIT START: Muat semula stat global */
        loadDashboardStats();
        if(document.getElementById('filter_subjek').value !== '') {
            fetchTableData();
        }
        /* [COMMENT SYNTAX] SURGICAL EDIT END */
        
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
        const { error } = await supabaseClient
            .from('edaftar_bengkel_ppdag')
            .update(kemaskiniData)
            .eq('id', editingId);

        if(error) throw error;

        closeEdit();
        
        /* [COMMENT SYNTAX] SURGICAL EDIT START: Muat semula stat global */
        loadDashboardStats();
        if(document.getElementById('filter_subjek').value !== '') {
            fetchTableData();
        }
        /* [COMMENT SYNTAX] SURGICAL EDIT END */

        showMsg("Berjaya", "Rekod dikemaskini.");
    } catch (err) {
        console.error(err);
        showMsg("Ralat", "Gagal menyimpan rekod.");
    } finally {
        btn.disabled = false;
        btn.textContent = "Simpan Perubahan";
    }
});

function getLogoBase64() {
    return new Promise((resolve) => {
        const img = new Image();
        img.crossOrigin = 'Anonymous';
        img.src = 'ikonppd.png';
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

document.getElementById('btn-pdf').addEventListener('click', async () => {
    if(currentData.length === 0) return;
    
    const btnPdf = document.getElementById('btn-pdf');
    const originalText = btnPdf.textContent;
    btnPdf.textContent = "Menjana...";
    btnPdf.disabled = true;

    const selGroup = document.getElementById('filter_subjek').value;
    const conf = groupConfig[selGroup];
    
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF('landscape'); 

    const logoData = await getLogoBase64();
    let startYTable = 38;

    if (logoData) {
        doc.addImage(logoData, 'PNG', 14, 10, 32, 24); 
        
        doc.setFontSize(12);
        doc.setFont("helvetica", "bold");
        doc.text("BENGKEL PEMBINAAN BAHAN PDPC BERBANTU AI GURU STEM DAERAH ALOR GAJAH", 48, 18);
        
        doc.setFontSize(11);
        doc.setFont("helvetica", "normal");
        doc.text(`Kumpulan: ${conf.label}`, 48, 25);
    } else {
        doc.setFontSize(12);
        doc.setFont("helvetica", "bold");
        doc.text("BENGKEL PEMBINAAN BAHAN PDPC BERBANTU AI GURU STEM DAERAH ALOR GAJAH", 14, 18);
        doc.setFontSize(11);
        doc.setFont("helvetica", "normal");
        doc.text(`Kumpulan: ${conf.label}`, 14, 25);
    }

    const tableData = currentData.map((row, i) => {
        if(row.isDummy) {
            return [
                i + 1,
                "",
                "",
                "",
                "", 
                ""
            ];
        }
        const role = row.peranan || 'GURU';
        return [
            i + 1,
            `${row.nama_penuh}\n(${role} ${role === 'GURU' && row.subjek ? '- ' + row.subjek : ''})`,
            row.ic_no,
            `${row.kod_sekolah || ''}\n${row.nama_sekolah || ''}`,
            "", 
            ""  
        ];
    });

    doc.autoTable({
        startY: startYTable,
        head: [[
            'Bil', 
            'Nama Penuh & Peranan', 
            'No. Kad Pengenalan', 
            'Sekolah', 
            `Sesi 1\n(${conf.d1})`, 
            `Sesi 2\n(${conf.d2})`
        ]],
        body: tableData,
        theme: 'grid',
        headStyles: { fillColor: [30, 41, 59], textColor: 255, halign: 'center' }, 
        styles: { fontSize: 9, cellPadding: 3, valign: 'middle' },
        columnStyles: {
            0: { cellWidth: 12, halign: 'center' },
            1: { cellWidth: 70 },
            2: { cellWidth: 35, halign: 'center' },
            3: { cellWidth: 70 },
            4: { cellWidth: 40 }, 
            5: { cellWidth: 40 }  
        },
        didDrawCell: function(data) {
            if ((data.column.index === 4 || data.column.index === 5) && data.section === 'body') {
                // Ruang tandatangan
            }
        }
    });

    const safeFileName = conf.label.replace(/[^a-zA-Z0-9]/g, '_');
    doc.save(`Kehadiran_${safeFileName}.pdf`);
    
    btnPdf.textContent = originalText;
    btnPdf.disabled = false;
});