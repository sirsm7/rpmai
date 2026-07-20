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

/* [COMMENT SYNTAX] SURGICAL EDIT START: Tambah variabel state untuk filter */
let currentFilter = null;
/* [COMMENT SYNTAX] SURGICAL EDIT END */

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

const masterSekolah = [
    { kod: "MBA0001", nama: "SEKOLAH KEBANGSAAN MASJID TANAH", jenis: "SK" },
    { kod: "MBA0002", nama: "SEKOLAH KEBANGSAAN TANJUNG BIDARA", jenis: "SK" },
    { kod: "MBA0003", nama: "SEKOLAH KEBANGSAAN OTHMAN SYAWAL", jenis: "SK" },
    { kod: "MBA0004", nama: "SEKOLAH KEBANGSAAN BUKIT BERINGIN", jenis: "SK" },
    { kod: "MBA0005", nama: "SEKOLAH KEBANGSAAN RAMUAN CHINA BESAR", jenis: "SK" },
    { kod: "MBA0006", nama: "SEKOLAH KEBANGSAAN RAMUAN CHINA KECHIL", jenis: "SK" },
    { kod: "MBA0007", nama: "SEKOLAH KEBANGSAAN AYER LIMAU", jenis: "SK" },
    { kod: "MBA0008", nama: "SEKOLAH KEBANGSAAN KUALA LINGGI", jenis: "SK" },
    { kod: "MBA0009", nama: "SEKOLAH KEBANGSAAN PENGKALAN BALAK", jenis: "SK" },
    { kod: "MBA0010", nama: "SEKOLAH KEBANGSAAN DURIAN DAUN (K)", jenis: "SK" },
    { kod: "MBA0011", nama: "SEKOLAH KEBANGSAAN LUBOK REDAN", jenis: "SK" },
    { kod: "MBA0012", nama: "SEKOLAH KEBANGSAAN JERAM", jenis: "SK" },
    { kod: "MBA0013", nama: "SEKOLAH KEBANGSAAN AIR JERNIH", jenis: "SK" },
    { kod: "MBA0014", nama: "SEKOLAH KEBANGSAAN KAMPUNG TENGAH", jenis: "SK" },
    { kod: "MBA0015", nama: "SEKOLAH KEBANGSAAN SUNGAI TUANG", jenis: "SK" },
    { kod: "MBA0016", nama: "SEKOLAH KEBANGSAAN TELOK BEREMBANG", jenis: "SK" },
    { kod: "MBA0017", nama: "SEKOLAH KEBANGSAAN SUNGAI JERNIH", jenis: "SK" },
    { kod: "MBA0018", nama: "SEKOLAH KEBANGSAAN RANTAU PANJANG", jenis: "SK" },
    { kod: "MBA0020", nama: "SEKOLAH KEBANGSAAN PADANG SEBANG", jenis: "SK" },
    { kod: "MBA0021", nama: "SEKOLAH KEBANGSAAN AYER PA'ABAS", jenis: "SK" },
    { kod: "MBA0022", nama: "SEKOLAH KEBANGSAAN SIMPANG EMPAT", jenis: "SK" },
    { kod: "MBA0023", nama: "SEKOLAH KEBANGSAAN PULAU SEBANG", jenis: "SK" },
    { kod: "MBA0024", nama: "SEKOLAH KEBANGSAAN MELEKEK", jenis: "SK" },
    { kod: "MBA0025", nama: "SEKOLAH KEBANGSAAN GANUN", jenis: "SK" },
    { kod: "MBA0026", nama: "SEKOLAH KEBANGSAAN PARIT MELANA", jenis: "SK" },
    { kod: "MBA0027", nama: "SEKOLAH KEBANGSAAN SUNGAI PETAI", jenis: "SK" },
    { kod: "MBA0028", nama: "SEKOLAH KEBANGSAAN SUNGAI SIPUT", jenis: "SK" },
    { kod: "MBA0029", nama: "SEKOLAH KEBANGSAAN MELAKA PINDAH", jenis: "SK" },
    { kod: "MBA0030", nama: "SEKOLAH KEBANGSAAN PEGOH", jenis: "SK" },
    { kod: "MBA0031", nama: "SEKOLAH KEBANGSAAN BERISU", jenis: "SK" },
    { kod: "MBA0032", nama: "SEKOLAH KEBANGSAAN LENDU", jenis: "SK" },
    { kod: "MBA0033", nama: "SEKOLAH KEBANGSAAN BELIMBING DALAM", jenis: "SK" },
    { kod: "MBA0034", nama: "SEKOLAH KEBANGSAAN RUMBIA", jenis: "SK" },
    { kod: "MBA0035", nama: "SEKOLAH KEBANGSAAN SUNGAI BULOH", jenis: "SK" },
    { kod: "MBA0036", nama: "SEKOLAH KEBANGSAAN CHERANA PUTEH", jenis: "SK" },
    { kod: "MBA0037", nama: "SEKOLAH KEBANGSAAN TEBONG", jenis: "SK" },
    { kod: "MBA0038", nama: "SEKOLAH KEBANGSAAN KEMUNING", jenis: "SK" },
    { kod: "MBA0039", nama: "SEKOLAH KEBANGSAAN MENGGONG", jenis: "SK" },
    { kod: "MBA0040", nama: "SEKOLAH KEBANGSAAN HUTAN PERCHA", jenis: "SK" },
    { kod: "MBA0041", nama: "SEKOLAH KEBANGSAAN DURIAN TUNGGAL", jenis: "SK" },
    { kod: "MBA0042", nama: "SEKOLAH KEBANGSAAN KEM TERENDAK II", jenis: "SK" },
    { kod: "MBA0043", nama: "SEKOLAH KEBANGSAAN GANGSA", jenis: "SK" },
    { kod: "MBA0044", nama: "SEKOLAH KEBANGSAAN LESONG BATU", jenis: "SK" },
    { kod: "MBA0045", nama: "SEKOLAH KEBANGSAAN DEMANG TAHA", jenis: "SK" },
    { kod: "MBB0041", nama: "SEKOLAH KEBANGSAAN ALOR GAJAH 1", jenis: "SK" },
    { kod: "MBB0042", nama: "SEKOLAH KEBANGSAAN DATO' NANING", jenis: "SK" },
    { kod: "MBB0043", nama: "SEKOLAH KEBANGSAAN DATUK TAMBICHIK KARIM", jenis: "SK" },
    { kod: "MBB0044", nama: "SEKOLAH KEBANGSAAN SRI LAKSAMANA", jenis: "SK" },
    { kod: "MBC0046", nama: "SEKOLAH JENIS KEBANGSAAN (CINA) PAY CHEE", jenis: "SJKC" },
    { kod: "MBC0047", nama: "SEKOLAH JENIS KEBANGSAAN (CINA) ALOR GAJAH", jenis: "SJKC" },
    { kod: "MBC0048", nama: "SEKOLAH JENIS KEBANGSAAN (CINA) SANN YUH", jenis: "SJKC" },
    { kod: "MBC0049", nama: "SEKOLAH JENIS KEBANGSAAN (CINA) PENG MIN", jenis: "SJKC" },
    { kod: "MBC0050", nama: "SEKOLAH JENIS KEBANGSAAN (CINA) SIN WAH", jenis: "SJKC" },
    { kod: "MBC0051", nama: "SEKOLAH JENIS KEBANGSAAN (CINA) KIOW MIN", jenis: "SJKC" },
    { kod: "MBC0052", nama: "SEKOLAH JENIS KEBANGSAAN (CINA) MACHAP BARU", jenis: "SJKC" },
    { kod: "MBC0053", nama: "SEKOLAH JENIS KEBANGSAAN (CINA) MACHAP UMBOO", jenis: "SJKC" },
    { kod: "MBC0054", nama: "SEKOLAH JENIS KEBANGSAAN (CINA) TABOH NANING", jenis: "SJKC" },
    { kod: "MBC0055", nama: "SEKOLAH JENIS KEBANGSAAN (CINA) LENDU", jenis: "SJKC" },
    { kod: "MBC0056", nama: "SEKOLAH JENIS KEBANGSAAN (CINA) KHIAK YEW", jenis: "SJKC" },
    { kod: "MBC0057", nama: "SEKOLAH JENIS KEBANGSAAN (CINA) MASJID TANAH", jenis: "SJKC" },
    { kod: "MBC0058", nama: "SEKOLAH JENIS KEBANGSAAN (CINA) YOK SIN", jenis: "SJKC" },
    { kod: "MBC0059", nama: "SEKOLAH JENIS KEBANGSAAN (CINA) PAYA MENGKUANG", jenis: "SJKC" },
    { kod: "MBC0060", nama: "SEKOLAH JENIS KEBANGSAAN (CINA) SIN MIN", jenis: "SJKC" },
    { kod: "MBC0061", nama: "SEKOLAH JENIS KEBANGSAAN (CINA) CHABAU", jenis: "SJKC" },
    { kod: "MBD0061", nama: "SEKOLAH JENIS KEBANGSAAN (TAMIL) ALOR GAJAH", jenis: "SJKT" },
    { kod: "MBD0062", nama: "SEKOLAH JENIS KEBANGSAAN (TAMIL) DURIAN TUNGGAL", jenis: "SJKT" },
    { kod: "MBD0063", nama: "SEKOLAH JENIS KEBANGSAAN (TAMIL) RUMBIA", jenis: "SJKT" },
    { kod: "MBD0064", nama: "SEKOLAH JENIS KEBANGSAAN (TAMIL) LADANG GADEK", jenis: "SJKT" },
    { kod: "MBD0066", nama: "SEKOLAH JENIS KEBANGSAAN (TAMIL) KEMUNING (H/D)", jenis: "SJKT" },
    { kod: "MBD0067", nama: "SEKOLAH JENIS KEBANGSAAN (TAMIL) LDG KEMUNING KRU DIVISION", jenis: "SJKT" },
    { kod: "MBD0068", nama: "SEKOLAH JENIS KEBANGSAAN (TAMIL) PULAU SEBANG", jenis: "SJKT" },
    { kod: "MBD0069", nama: "SEKOLAH JENIS KEBANGSAAN (TAMIL) LDG SG BARU (H/D)", jenis: "SJKT" },
    { kod: "MBD0070", nama: "SEKOLAH JENIS KEBANGSAAN (TAMIL) LDG TEBONG", jenis: "SJKT" },
    { kod: "MBD0097", nama: "SEKOLAH JENIS KEBANGSAAN (TAMIL) PEKAN TEBONG", jenis: "SJKT" },
    { kod: "MBE0045", nama: "SEKOLAH KEBANGSAAN KEM TERENDAK 1", jenis: "SK" },
    { kod: "MCT0001", nama: "SEKOLAH RENDAH ARAB (JAIM) AL-FALAH", jenis: "SR SABK" },
    { kod: "MCT0002", nama: "SEKOLAH RENDAH ARAB (JAIM) AL-FAIZIN", jenis: "SR SABK" },
    { kod: "MEA0071", nama: "SEKOLAH MENENGAH KEBANGSAAN GHAFAR BABA", jenis: "SMK" },
    { kod: "MEA0072", nama: "SEKOLAH MENENGAH KEBANGSAAN DATO' HAJI TALIB KARIM", jenis: "SMK" },
    { kod: "MEA0073", nama: "SEKOLAH MENENGAH KEBANGSAAN RAHMAT", jenis: "SMK" },
    { kod: "MEA0074", nama: "SEKOLAH MENENGAH KEBANGSAAN ADE PUTRA", jenis: "SMK" },
    { kod: "MEA0075", nama: "SEKOLAH MENENGAH KEBANGSAAN NANING", jenis: "SMK" },
    { kod: "MEA0095", nama: "SEKOLAH MENENGAH KEBANGSAAN LUBOK CHINA", jenis: "SMK" },
    { kod: "MEA0099", nama: "SEKOLAH MENENGAH KEBANGSAAN HANG KASTURI", jenis: "SMK" },
    { kod: "MEA0100", nama: "SEKOLAH MENENGAH KEBANGSAAN SUNGAI UDANG", jenis: "SMK" },
    { kod: "MEA0101", nama: "SEKOLAH MENENGAH KEBANGSAAN DURIAN TUNGGAL", jenis: "SMK" },
    { kod: "MEA0102", nama: "SEKOLAH MENENGAH KEBANGSAAN TEBONG", jenis: "SMK" },
    { kod: "MEA0103", nama: "SEKOLAH MENENGAH SAINS DATUK SETIA ABDUL GHANI ALI", jenis: "SBP" },
    { kod: "MEB0077", nama: "SEKOLAH MENENGAH KEBANGSAAN SERI PENGKALAN", jenis: "SMK" },
    { kod: "MEB0078", nama: "SEKOLAH MENENGAH KEBANGSAAN PULAU SEBANG", jenis: "SMK" },
    { kod: "MEB0079", nama: "SEKOLAH MENENGAH KEBANGSAAN SULTAN ALAUDDIN", jenis: "SMK" },
    { kod: "MEE0074", nama: "SEKOLAH MENENGAH KEBANGSAAN SULTAN MANSOR SHAH", jenis: "SMK" },
    { kod: "MEE0075", nama: "SEKOLAH MENENGAH KEBANGSAAN DATO' DOL SAID", jenis: "SMK" },
    { kod: "MEE0094", nama: "SEKOLAH MENENGAH KEBANGSAAN KEM TERENDAK", jenis: "SMK" },
    { kod: "MFT0001", nama: "SEKOLAH MENENGAH AGAMA AL-EHYA AL-KARIM", jenis: "SM SABK" },
    { kod: "MFT0002", nama: "SEKOLAH MENENGAH AGAMA (JAIM) AL-ASYRAF", jenis: "SM SABK" },
    { kod: "MFT0003", nama: "SEKOLAH MENENGAH AGAMA (JAIM) DARUL FALAH", jenis: "SM SABK" },
    { kod: "MFT0004", nama: "SEKOLAH MENENGAH IMTIAZ ULUL ALBAB MELAKA", jenis: "SM SABK" },
    { kod: "MHA0001", nama: "KOLEJ VOKASIONAL DATUK SERI MOHD. ZIN", jenis: "KV" }
];

function showMsg(title, body) {
    document.getElementById('msg-title').textContent = title;
    document.getElementById('msg-body').textContent = body;
    document.getElementById('msg-modal').classList.remove('hidden-view');
}
function closeMsg() {
    document.getElementById('msg-modal').classList.add('hidden-view');
}

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
        document.getElementById('sum_guru').innerHTML = `${guruCount || 0}`;

        document.getElementById('summary-cards').classList.remove('hidden-view');
    } catch (err) {
        console.error("Ralat stat:", err);
    }
}

document.getElementById('login-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const pwd = document.getElementById('admin_pwd').value;
    if(pwd === ADMIN_PWD) {
        document.getElementById('login-view').classList.add('hidden-view');
        document.getElementById('dashboard-view').classList.remove('hidden-view');
        document.getElementById('admin_pwd').value = '';
        document.getElementById('login-error').classList.add('hidden-view');
        loadSchools();
        loadDashboardStats();
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
    
    const btnSemak = document.getElementById('btn-semak-sekolah');
    if(btnSemak) btnSemak.classList.add('hidden-view');

    /* [COMMENT SYNTAX] SURGICAL EDIT START: Sembunyi butang reset semasa log keluar */
    const btnReset = document.getElementById('btn-reset-filter');
    if(btnReset) btnReset.classList.add('hidden-view');
    /* [COMMENT SYNTAX] SURGICAL EDIT END */

    /* [COMMENT SYNTAX] SURGICAL EDIT START: Sembunyi butang pukal semasa log keluar */
    const btnPukal1 = document.getElementById('btn-pukal-hadir-1');
    const btnPukal2 = document.getElementById('btn-pukal-hadir-2');
    const btnPukalTakHadir1 = document.getElementById('btn-pukal-tak-hadir-1');
    const btnPukalTakHadir2 = document.getElementById('btn-pukal-tak-hadir-2');
    if(btnPukal1) btnPukal1.classList.add('hidden-view');
    if(btnPukal2) btnPukal2.classList.add('hidden-view');
    if(btnPukalTakHadir1) btnPukalTakHadir1.classList.add('hidden-view');
    if(btnPukalTakHadir2) btnPukalTakHadir2.classList.add('hidden-view');
    /* [COMMENT SYNTAX] SURGICAL EDIT END */

    currentData = [];
    currentFilter = null; // Reset filter state on logout
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

    /* [COMMENT SYNTAX] SURGICAL EDIT START: Reset filter state jika tukar subjek */
    currentFilter = null;
    const btnReset = document.getElementById('btn-reset-filter');
    if(btnReset) btnReset.classList.add('hidden-view');
    /* [COMMENT SYNTAX] SURGICAL EDIT END */

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

        document.getElementById('sum_pegawai').textContent = `${(pegData || []).length} / 10`;
        document.getElementById('sum_jurulatih').textContent = `${(jurData || []).length} / 8`;
        document.getElementById('sum_guru').innerHTML = `${(guruData || []).length}`;

        let paddedPegawai = [...(pegData || [])];
        while(paddedPegawai.length < 10) paddedPegawai.push({ isDummy: true, roleLabel: 'PEGAWAI', peranan: 'PEGAWAI' });

        let paddedJurulatih = [...(jurData || [])];
        while(paddedJurulatih.length < 8) paddedJurulatih.push({ isDummy: true, roleLabel: 'JURULATIH', peranan: 'JURULATIH' });

        currentData = [...paddedPegawai, ...paddedJurulatih, ...(guruData || [])];

        summary.classList.remove('hidden-view');

        if(currentData.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" class="px-6 py-12 text-center text-sm text-gray-500">Tiada rekod pendaftaran untuk subjek ini.</td></tr>';
            
            const btnSemak = document.getElementById('btn-semak-sekolah');
            if(btnSemak) btnSemak.classList.add('hidden-view');

            /* [COMMENT SYNTAX] SURGICAL EDIT START: Sembunyi butang pukal jika tiada rekod */
            const btnPukal1 = document.getElementById('btn-pukal-hadir-1');
            const btnPukal2 = document.getElementById('btn-pukal-hadir-2');
            const btnPukalTakHadir1 = document.getElementById('btn-pukal-tak-hadir-1');
            const btnPukalTakHadir2 = document.getElementById('btn-pukal-tak-hadir-2');
            if(btnPukal1) btnPukal1.classList.add('hidden-view');
            if(btnPukal2) btnPukal2.classList.add('hidden-view');
            if(btnPukalTakHadir1) btnPukalTakHadir1.classList.add('hidden-view');
            if(btnPukalTakHadir2) btnPukalTakHadir2.classList.add('hidden-view');
            /* [COMMENT SYNTAX] SURGICAL EDIT END */
            
            return;
        }

        renderTable(currentFilter);
        btnPdf.disabled = false;
        
        const btnSemak = document.getElementById('btn-semak-sekolah');
        if(btnSemak) btnSemak.classList.remove('hidden-view');

        /* [COMMENT SYNTAX] SURGICAL EDIT START: Tunjuk butang pukal jika ada rekod */
        const btnPukal1 = document.getElementById('btn-pukal-hadir-1');
        const btnPukal2 = document.getElementById('btn-pukal-hadir-2');
        const btnPukalTakHadir1 = document.getElementById('btn-pukal-tak-hadir-1');
        const btnPukalTakHadir2 = document.getElementById('btn-pukal-tak-hadir-2');
        if (btnPukal1) btnPukal1.classList.remove('hidden-view');
        if (btnPukal2) btnPukal2.classList.remove('hidden-view');
        if (btnPukalTakHadir1) btnPukalTakHadir1.classList.remove('hidden-view');
        if (btnPukalTakHadir2) btnPukalTakHadir2.classList.remove('hidden-view');
        /* [COMMENT SYNTAX] SURGICAL EDIT END */

    } catch (err) {
        console.error("Ralat:", err);
        tbody.innerHTML = '<tr><td colspan="5" class="px-6 py-12 text-center text-sm text-red-500">Berlaku ralat sistem. Sila cuba lagi.</td></tr>';
    }
}

document.getElementById('btn-cari').addEventListener('click', fetchTableData);

/* [COMMENT SYNTAX] SURGICAL EDIT START: Fungsi Tapis & Render Jadual - Simpan state filter dan tambah butang reset */
window.tapisSenarai = function(peranan) {
    if (currentData.length === 0) return;
    currentFilter = peranan; // Simpan state filter
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
/* [COMMENT SYNTAX] SURGICAL EDIT END */

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
        tbody.innerHTML = `<tr><td colspan="5" class="px-6 py-12 text-center text-sm text-gray-500">Tiada rekod pendaftaran untuk kategori ${filterPeranan || 'ini'}.</td></tr>`;
        return;
    }

    dataToRender.forEach((row, i) => {
        if(row.isDummy) {
            html += `
                <tr class="bg-slate-50/50">
                    <td class="px-4 py-4 text-sm text-slate-400 text-center">${i + 1}</td>
                    <td class="px-4 py-4 text-sm text-slate-400 italic" colspan="4">Ruang ${row.roleLabel} (Kosong)</td>
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

        html += `
            <tr class="hover:bg-slate-50 transition-colors">
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

window.toggleAttendance = async function(id, sesi, currentStatus) {
    const newStatus = !currentStatus;
    try {
        const updateData = {};
        updateData[`sesi_${sesi}_hadir`] = newStatus;

        const { error } = await supabaseClient
            .from('edaftar_bengkel_ppdag')
            .update(updateData)
            .eq('id', id);

        if(error) throw error;

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

/* [COMMENT SYNTAX] SURGICAL EDIT START: Tambah fungsi kehadiran pukal dengan sokongan status boolean (hadir/tidak hadir) */
async function markBulkAttendance(sesi, isHadir) {
    if (currentData.length === 0) return;

    let dataToUpdate = currentData.filter(row => !row.isDummy);
    if (currentFilter) {
        dataToUpdate = dataToUpdate.filter(row => row.peranan === currentFilter || row.roleLabel === currentFilter);
    }

    if (dataToUpdate.length === 0) {
        showMsg("Makluman", "Tiada rekod untuk dikemaskini.");
        return;
    }

    const selGroup = document.getElementById('filter_subjek').value;
    const conf = groupConfig[selGroup];

    const btnId = isHadir ? `btn-pukal-hadir-${sesi}` : `btn-pukal-tak-hadir-${sesi}`;
    const originalBtnText = document.getElementById(btnId).textContent;
    document.getElementById(btnId).textContent = "Memproses...";
    document.getElementById(btnId).disabled = true;

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

        const { error } = await supabaseClient
            .from('edaftar_bengkel_ppdag')
            .update(updateData)
            .eq('id', row.id);

        if (error) {
            console.error(`Gagal kemaskini ID ${row.id}:`, error);
            throw error;
        }
        
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
        renderTable(currentFilter);
    } finally {
        document.getElementById(btnId).textContent = originalBtnText;
        document.getElementById(btnId).disabled = false;
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const btnPukal1 = document.getElementById('btn-pukal-hadir-1');
    const btnPukal2 = document.getElementById('btn-pukal-hadir-2');
    const btnPukalTakHadir1 = document.getElementById('btn-pukal-tak-hadir-1');
    const btnPukalTakHadir2 = document.getElementById('btn-pukal-tak-hadir-2');

    if (btnPukal1) {
        btnPukal1.addEventListener('click', () => markBulkAttendance(1, true));
    }
    if (btnPukal2) {
        btnPukal2.addEventListener('click', () => markBulkAttendance(2, true));
    }
    if (btnPukalTakHadir1) {
        btnPukalTakHadir1.addEventListener('click', () => markBulkAttendance(1, false));
    }
    if (btnPukalTakHadir2) {
        btnPukalTakHadir2.addEventListener('click', () => markBulkAttendance(2, false));
    }
});
/* [COMMENT SYNTAX] SURGICAL EDIT END */

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
        const { error } = await supabaseClient
            .from('edaftar_bengkel_ppdag')
            .update(kemaskiniData)
            .eq('id', editingId);

        if(error) throw error;

        closeEdit();

        loadDashboardStats();
        if(document.getElementById('filter_subjek').value !== '') {
            fetchTableData();
        }

        showMsg("Berjaya", "Rekod dikemaskini.");
    } catch (err) {
        console.error(err);
        showMsg("Ralat", "Gagal menyimpan rekod.");
    } finally {
        btn.disabled = false;
        btn.textContent = "Simpan Perubahan";
    }
});

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
        .filter(r => !r.isDummy && r.kod_sekolah)
        .map(r => r.kod_sekolah);

    const missingSchools = targetSchools.filter(s => !registeredCodes.includes(s.kod));

    document.getElementById('kategori-sekolah-label').textContent = `KATEGORI: ${isSR ? 'SEKOLAH RENDAH (SR)' : 'SEKOLAH MENENGAH (SM)'}`;
    document.getElementById('jumlah-sekolah-tiada').textContent = `Jumlah tiada wakil: ${missingSchools.length} daripada ${targetSchools.length} buah sekolah`;

    const ul = document.getElementById('senarai-sekolah-tiada');
    ul.innerHTML = '';

    if (missingSchools.length === 0) {
        ul.innerHTML = '<li class="p-3 text-center text-green-600 font-medium">Semua sekolah bagi kategori ini telah mempunyai wakil.</li>';
    } else {
        missingSchools.forEach((s, index) => {
            const li = document.createElement('li');
            li.className = 'p-3 hover:bg-gray-100 flex flex-col md:flex-row md:justify-between md:items-center';
            li.innerHTML = `
                <div>
                    <span class="font-semibold text-gray-800">${index + 1}. ${s.nama}</span>
                </div>
                <div class="mt-1 md:mt-0 text-xs font-medium bg-gray-200 text-gray-700 px-2 py-1 rounded w-max">
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

/* [COMMENT SYNTAX] SURGICAL EDIT START: Logik janaan PDF berdasarkan filter dan kehadiran penuh serta buang teks HADIR */
document.getElementById('btn-pdf').addEventListener('click', async () => {
    if(currentData.length === 0) return;

    const btnPdf = document.getElementById('btn-pdf');
    const originalText = btnPdf.textContent;
    btnPdf.textContent = "Menjana...";
    btnPdf.disabled = true;

    const selGroup = document.getElementById('filter_subjek').value;
    const conf = groupConfig[selGroup];

    // Filter by current role view if active
    let dataToExport = currentData;
    if (currentFilter) {
        dataToExport = currentData.filter(row => row.peranan === currentFilter || row.roleLabel === currentFilter);
    }
    
    // Filter only those who attended BOTH sessions for their respective group
    const fullyAttendedData = dataToExport.filter(row => {
        if(row.isDummy) return false;
        
        const role = row.peranan || 'GURU';
        const isExempt = role === 'PEGAWAI' || role === 'JURULATIH';

        const hadir1 = isExempt ? row[`sesi_${conf.exemptS1}_hadir`] : row.sesi_1_hadir;
        const hadir2 = isExempt ? row[`sesi_${conf.exemptS2}_hadir`] : row.sesi_2_hadir;
        
        return hadir1 && hadir2;
    });

    if (fullyAttendedData.length === 0) {
        showMsg("Tiada Rekod", `Tiada peserta${currentFilter ? ` bagi kategori ${currentFilter}` : ''} yang melengkapkan kedua-dua sesi kehadiran.`);
        btnPdf.textContent = originalText;
        btnPdf.disabled = false;
        return;
    }

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
        let titleSuffix = currentFilter ? ` (${currentFilter}) - HADIR PENUH` : ` - HADIR PENUH`;
        doc.text(`Kumpulan: ${conf.label}${titleSuffix}`, 48, 25);
    } else {
        doc.setFontSize(12);
        doc.setFont("helvetica", "bold");
        doc.text("BENGKEL PEMBINAAN BAHAN PDPC BERBANTU AI GURU STEM DAERAH ALOR GAJAH", 14, 18);
        doc.setFontSize(11);
        doc.setFont("helvetica", "normal");
        let titleSuffix = currentFilter ? ` (${currentFilter}) - HADIR PENUH` : ` - HADIR PENUH`;
        doc.text(`Kumpulan: ${conf.label}${titleSuffix}`, 14, 25);
    }

    const tableData = fullyAttendedData.map((row, i) => {
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
                // Ruang tandatangan dikosongkan untuk pengesahan kehadiran fizikal
            }
        }
    });

    const roleSuffix = currentFilter ? `_${currentFilter}` : '';
    const safeFileName = conf.label.replace(/[^a-zA-Z0-9]/g, '_');
    doc.save(`Kehadiran_Penuh_${safeFileName}${roleSuffix}.pdf`);

    btnPdf.textContent = originalText;
    btnPdf.disabled = false;
});
/* [COMMENT SYNTAX] SURGICAL EDIT END */