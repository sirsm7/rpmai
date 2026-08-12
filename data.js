import { SUPABASE_URL, SUPABASE_ANON_KEY } from './config.js';

// Memulakan sambungan klien Supabase menggunakan kunci dari config.js
// Objek window.supabase tersedia melalui pemuatan CDN di index.html & admin.html
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
const MAIN_TABLE = 'edaftar_bengkel_ppdag';
const SCHOOL_TABLE = 'smpid_sekolah_data';

/**
 * Mengambil senarai sekolah dari pangkalan data.
 * @returns {Promise<Array>} Senarai sekolah
 */
export async function getSchoolsData() {
    const { data, error } = await supabase
        .from(SCHOOL_TABLE)
        .select('kod_sekolah, nama_sekolah')
        .order('nama_sekolah', { ascending: true });

    if (error) throw error;
    return data;
}

/**
 * Mengemaskini rekod pengguna (Boleh digunakan untuk kehadiran atau edit data).
 * @param {string|number} id - ID rekod 
 * @param {Object} updateData - Objek yang mengandungi kolum dan nilai untuk dikemaskini
 * @returns {Promise<Object>} Data rekod yang telah dikemaskini
 */
export async function updateRecord(id, updateData) {
    const { data, error } = await supabase
        .from(MAIN_TABLE)
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

    if (error) throw error;
    return data;
}

/**
 * Menyemak rekod pendaftaran menggunakan No. Kad Pengenalan.
 * @param {string} ic - No. Kad Pengenalan pengguna
 * @returns {Promise<Object|null>} Mengembalikan objek rekod jika wujud, null jika tiada.
 */
export async function getUserByIC(ic) {
    const { data, error } = await supabase
        .from(MAIN_TABLE)
        .select('*')
        .eq('ic_no', ic)
        .single();

    // PGRST116 adalah kod ralat Supabase bagi "No rows returned" apabila menggunakan .single()
    if (error && error.code !== 'PGRST116') {
        throw error;
    }

    return data || null;
}

/**
 * Mendapatkan bilangan tepat pendaftaran bagi satu peranan khusus.
 * @param {string} roleName - Peranan (contoh: 'PEGAWAI', 'JURULATIH')
 * @returns {Promise<number>} Jumlah pendaftaran untuk peranan tersebut
 */
export async function getExactRoleCount(roleName) {
    const { count, error } = await supabase
        .from(MAIN_TABLE)
        .select('*', { count: 'exact', head: true })
        .eq('peranan', roleName);

    if (error) throw error;
    return count || 0;
}

/**
 * Mendaftarkan peserta baharu ke dalam sistem.
 * @param {Object} insertData - Maklumat peserta baharu
 * @returns {Promise<Object>} Rekod pendaftaran yang berjaya didaftarkan
 */
export async function registerNewUser(insertData) {
    const { data, error } = await supabase
        .from(MAIN_TABLE)
        .insert([insertData])
        .select()
        .single();

    if (error) throw error;
    return data;
}

/**
 * Mendapatkan statistik asas untuk Dashboard Admin.
 * @returns {Promise<Object>} Jumlah bilangan bagi setiap peranan
 */
export async function getAdminDashboardStats() {
    const { count: pegCount } = await supabase
        .from(MAIN_TABLE)
        .select('*', { count: 'exact', head: true })
        .eq('peranan', 'PEGAWAI');

    const { count: jurCount } = await supabase
        .from(MAIN_TABLE)
        .select('*', { count: 'exact', head: true })
        .eq('peranan', 'JURULATIH');

    const { count: guruCount } = await supabase
        .from(MAIN_TABLE)
        .select('*', { count: 'exact', head: true })
        .eq('peranan', 'GURU');

    return {
        pegawai: pegCount || 0,
        jurulatih: jurCount || 0,
        guru: guruCount || 0
    };
}

/**
 * Mendapatkan senarai penuh untuk dipaparkan dalam jadual Admin berdasarkan subjek pilihan.
 * Mengambil kesemua guru (mengikut subjek) serta kesemua pegawai & jurulatih.
 * @param {Array<string>} subjects - Susunan subjek yang ditapis
 * @returns {Promise<Object>} Objek mengandungi pecahan array data (guru, pegawai, jurulatih)
 */
export async function getAdminTableData(subjects) {
    const { data: guruData, error: guruErr } = await supabase
        .from(MAIN_TABLE)
        .select('*')
        .in('subjek', subjects)
        .eq('peranan', 'GURU')
        .order('nama_sekolah', { ascending: true })
        .order('nama_penuh', { ascending: true });

    if (guruErr) throw guruErr;

    const { data: pegData, error: pegErr } = await supabase
        .from(MAIN_TABLE)
        .select('*')
        .eq('peranan', 'PEGAWAI')
        .order('nama_penuh', { ascending: true });

    if (pegErr) throw pegErr;

    const { data: jurData, error: jurErr } = await supabase
        .from(MAIN_TABLE)
        .select('*')
        .eq('peranan', 'JURULATIH')
        .order('nama_penuh', { ascending: true });

    if (jurErr) throw jurErr;

    return {
        guruData: guruData || [],
        pegData: pegData || [],
        jurData: jurData || []
    };
}

/**
 * Memadam satu rekod dari pangkalan data berdasarkan ID.
 * @param {string|number} id - ID rekod yang akan dipadam
 * @returns {Promise<void>}
 */
export async function deleteRecord(id) {
    const { error } = await supabase
        .from(MAIN_TABLE)
        .delete()
        .eq('id', id);

    if (error) throw error;
}

/**
 * Mengambil senarai peserta dengan peranan 'GURU' dari sekolah 'M030' 
 * yang BUKAN sebahagian daripada senarai subjek/kumpulan semasa.
 * @param {Array<string>} currentSubjects - Senarai subjek kumpulan yang aktif/sedang dipaparkan
 * @returns {Promise<Array>} Senarai peserta yang layak untuk ditambah
 */
export async function getEligibleGurus(currentSubjects) {
    const { data, error } = await supabase
        .from(MAIN_TABLE)
        .select('id, nama_penuh, ic_no, subjek')
        .eq('peranan', 'GURU')
        .eq('kod_sekolah', 'M030')
        .not('subjek', 'in', `(${currentSubjects.join(',')})`)
        .order('nama_penuh', { ascending: true });

    if (error) throw error;
    return data || [];
}