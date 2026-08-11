import { getBase64Image, getCursiveFontBase64, getSmartDateRangeString } from './utils.js';
import { absoluteDates, groupConfig } from './config.js';

/**
 * Melukis kandungan sijil ke dalam dokumen jsPDF.
 * Fungsi ini dikongsi antara janaan sijil individu dan pukal.
 * 
 * @param {Object} doc - Objek jsPDF
 * @param {Object} record - Data pendaftaran pengguna
 * @param {string} logoData - Rentetan Base64 logo
 * @param {string} signData - Rentetan Base64 tandatangan
 * @param {boolean} hasCursive - Status sama ada font cursive dimuatkan
 * @param {Array<string>} selectedDates - Array tarikh yang sah untuk dipaparkan
 */
function drawCertificateContent(doc, record, logoData, signData, hasCursive, selectedDates) {
    const pageWidth = doc.internal.pageSize.getWidth();
    const centerX = pageWidth / 2;
    const peranan = record.peranan || 'GURU';
    const isExempt = peranan === 'PEGAWAI' || peranan === 'JURULATIH';

    // 1. Masukkan Logo PPD
    if (logoData) {
        doc.addImage(logoData, 'PNG', centerX - 25.3, 20, 50.6, 33.73);
    }

    // 2. Tajuk Sijil
    const sijilTitle = isExempt ? "Sijil Penghargaan" : "Sijil Penyertaan";
    if (hasCursive) {
        doc.setFont("Cursive", "normal");
        doc.setFontSize(80);
    } else {
        doc.setFont("helvetica", "bolditalic");
        doc.setFontSize(42);
    }
    doc.setTextColor(220, 38, 38);
    doc.text(sijilTitle, centerX, 90, { align: 'center' });

    // 3. Pengesahan
    doc.setFont("helvetica", "normal");
    doc.setFontSize(14);
    doc.setTextColor(75, 85, 99);
    doc.text("Dengan ini disahkan bahawa", centerX, 115, { align: 'center' });

    // 4. Nama Penuh
    doc.setFont("helvetica", "bold");
    doc.setFontSize(20);
    doc.setTextColor(17, 24, 39);
    doc.text(record.nama_penuh, centerX, 130, { align: 'center' });

    // 5. No KP
    doc.setFont("helvetica", "normal");
    doc.setFontSize(12);
    doc.text(`No. Kad Pengenalan: ${record.ic_no}`, centerX, 140, { align: 'center' });

    // 6. Menyertai
    doc.setFontSize(14);
    doc.setTextColor(75, 85, 99);
    doc.text("telah menyertai", centerX, 155, { align: 'center' });

    // 7. Nama Program
    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.setTextColor(30, 64, 175);
    doc.text("BENGKEL PEMBINAAN BAHAN PDPC BERBANTU AI", centerX, 170, { align: 'center' });
    doc.text("GURU STEM DAERAH ALOR GAJAH", centerX, 178, { align: 'center' });

    // 8. Peranan
    doc.setFont("helvetica", "normal");
    doc.setFontSize(14);
    doc.setTextColor(75, 85, 99);
    let paparanPeranan = peranan === 'GURU' ? "sebagai PESERTA" : `sebagai ${peranan}`;
    doc.text(paparanPeranan, centerX, 193, { align: 'center' });

    // 9. Tarikh
    const paparanTarikh = getSmartDateRangeString(selectedDates);
    doc.setFontSize(12);
    doc.text("pada", centerX, 205, { align: 'center' });
    doc.text(paparanTarikh, centerX, 213, { align: 'center', maxWidth: 170 });

    // 10. Tandatangan
    if (signData) {
        doc.addImage(signData, 'PNG', centerX - 48.3, 230, 96.6, 38.64);
    }
}

/**
 * Menjana sijil individu dalam bentuk objek jsPDF.
 * 
 * @param {Object} record - Data peserta
 * @param {Array<string>} userSelectedDates - Array tarikh dipilih (khusus untuk exempt roles)
 * @returns {Promise<Object>} Objek doc jsPDF
 */
export async function generateSingleCertificate(record, userSelectedDates = []) {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4' });

    const logoData = await getBase64Image('ikonppd.png');
    const signData = await getBase64Image('tttnhj.png');
    const fontB64 = await getCursiveFontBase64();
    let hasCursive = false;

    if (fontB64) {
        doc.addFileToVFS('Cursive.ttf', fontB64);
        doc.addFont('Cursive.ttf', 'Cursive', 'normal');
        hasCursive = true;
    }

    const peranan = record.peranan || 'GURU';
    const isExempt = peranan === 'PEGAWAI' || peranan === 'JURULATIH';
    let datesToPrint = isExempt ? userSelectedDates : [record.sesi_1_tarikh, record.sesi_2_tarikh];

    if (datesToPrint.length === 0) {
        throw new Error("NO_DATE_SELECTED");
    }

    drawCertificateContent(doc, record, logoData, signData, hasCursive, datesToPrint);

    return doc;
}

/**
 * Menjana dokumen PDF yang mengandungi sijil pukal bagi senarai peserta.
 * 
 * @param {Array<Object>} records - Array data peserta
 * @returns {Promise<Object>} Objek doc jsPDF
 */
export async function generateBulkCertificates(records) {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4' });

    const logoData = await getBase64Image('ikonppd.png');
    const signData = await getBase64Image('tttnhj.png');
    const fontB64 = await getCursiveFontBase64();
    let hasCursive = false;

    if (fontB64) {
        doc.addFileToVFS('Cursive.ttf', fontB64);
        doc.addFont('Cursive.ttf', 'Cursive', 'normal');
        hasCursive = true;
    }

    records.forEach((record, i) => {
        if (i > 0) doc.addPage();

        const peranan = record.peranan || 'GURU';
        const isExempt = peranan === 'PEGAWAI' || peranan === 'JURULATIH';
        let datesToPrint = [];

        if (isExempt) {
            for (let j = 1; j <= 8; j++) {
                if (record[`sesi_${j}_hadir`]) {
                    datesToPrint.push(absoluteDates[j-1]);
                }
            }
        } else {
            datesToPrint = [record.sesi_1_tarikh, record.sesi_2_tarikh];
        }

        drawCertificateContent(doc, record, logoData, signData, hasCursive, datesToPrint);
    });

    return doc;
}

/**
 * Menjana laporan kehadiran dalam format jadual landskap PDF.
 * 
 * @param {Array<Object>} fullyAttendedData - Data peserta yang hadir penuh
 * @param {string} selGroup - Kunci kumpulan (contoh: "G1")
 * @param {string|null} currentFilter - Tapisan peranan aktif jika ada
 * @returns {Promise<Object>} Objek doc jsPDF
 */
export async function generateAttendanceReport(fullyAttendedData, selGroup, currentFilter) {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF('landscape');
    const conf = groupConfig[selGroup];

    const logoData = await getBase64Image('ikonppd.png');
    let startYTable = 38;

    // Header Laporan
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

    // Persediaan Data Jadual
    const tableData = fullyAttendedData.map((row, i) => {
        const role = row.peranan || 'GURU';
        let namaPapar = row.nama_penuh;

        // Pengecualian label bagi sekolah PPDAG (M030)
        if (row.kod_sekolah !== 'M030') {
            namaPapar = `${row.nama_penuh}\n(${role} ${role === 'GURU' && row.subjek ? '- ' + row.subjek : ''})`;
        }

        return [
            i + 1,
            namaPapar,
            row.ic_no,
            `${row.kod_sekolah || ''}\n${row.nama_sekolah || ''}`,
            "", // Sesi 1 - Dibiarkan kosong untuk ruang tandatangan manual jika perlu
            ""  // Sesi 2
        ];
    });

    // Melukis Jadual menggunakan autoTable
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
        }
    });

    return doc;
}