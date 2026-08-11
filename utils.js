export function formatDateDisplay(dateString) {
    if(!dateString) return "";
    const [y, m, d] = dateString.split('-');
    const months = ['Januari','Februari','Mac','April','Mei','Jun','Julai','Ogos','September','Oktober','November','Disember'];
    return `${parseInt(d)} ${months[parseInt(m)-1]} ${y}`;
}

export function getSmartDateRangeString(datesArray) {
    if (!datesArray || datesArray.length === 0) return "";
    if (datesArray.length === 1) return formatDateDisplay(datesArray[0]);

    const sorted = [...datesArray].sort();
    const months = ['Januari','Februari','Mac','April','Mei','Jun','Julai','Ogos','September','Oktober','November','Disember'];

    let groups = {};
    sorted.forEach(d => {
        const [y, m, day] = d.split('-');
        const key = `${y}-${m}`;
        if(!groups[key]) groups[key] = [];
        groups[key].push(parseInt(day));
    });

    let res = [];
    for(const key in groups) {
        const [y, m] = key.split('-');
        const days = groups[key];
        let daysStr = "";

        if(days.length === 1) {
            daysStr = days[0].toString();
        } else if (days.length === 2) {
            daysStr = `${days[0]} dan ${days[1]}`;
        } else {
            const lastDay = days.pop();
            daysStr = `${days.join(', ')} dan ${lastDay}`;
        }

        res.push(`${daysStr} ${months[parseInt(m)-1]} ${y}`);
    }

    return res.join(' serta ');
}

export function isDateArrived(dateString) {
    if (!dateString) return false;
    const [y, m, d] = dateString.split('-');
    const targetDate = new Date(y, m - 1, d);
    const now = new Date();
    const todayDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    return todayDate >= targetDate;
}

export function calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371e3;
    const p1 = lat1 * Math.PI / 180;
    const p2 = lat2 * Math.PI / 180;
    const deltaP = (lat2 - lat1) * Math.PI / 180;
    const deltaLambda = (lon2 - lon1) * Math.PI / 180;

    const a = Math.sin(deltaP / 2) * Math.sin(deltaP / 2) +
              Math.cos(p1) * Math.cos(p2) *
              Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c; // Distance in meters
}

export function getBase64Image(imgUrl) {
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

export async function getCursiveFontBase64() {
    try {
        const response = await fetch('https://cdn.jsdelivr.net/gh/google/fonts@main/ofl/greatvibes/GreatVibes-Regular.ttf');
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const buffer = await response.arrayBuffer();
        const bytes = new Uint8Array(buffer);
        let binary = '';
        for (let i = 0; i < bytes.byteLength; i++) {
            binary += String.fromCharCode(bytes[i]);
        }
        return window.btoa(binary);
    } catch (e) {
        console.error("Gagal memuat turun font cursive:", e);
        return null;
    }
}