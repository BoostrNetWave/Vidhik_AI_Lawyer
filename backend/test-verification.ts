
const userId: string = "6878e1ae0fb58374501b677e";
const baseUrl: string = "http://localhost:5025/api/booking-prefs";

interface SettingsPayload {
    bufferMins: number;
}

interface TimeSlot {
    start: string;
    end: string;
}

interface WorkingHoursPayload {
    weekly: {
        mon: TimeSlot[];
        tue: TimeSlot[];
        wed: TimeSlot[];
        thu: TimeSlot[];
        fri: TimeSlot[];
        sat: TimeSlot[];
        sun: TimeSlot[];
    };
}

async function testSettings(): Promise<void> {
    try {
        console.log("Testing Settings Save...");
        const payload: SettingsPayload = { bufferMins: 20 };
        const res = await fetch(`${baseUrl}/settings?userId=${userId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (res.ok) {
            const data = await res.json();
            if (data.bufferMins === 20) {
                console.log("✅ Settings Save Success");
            } else {
                console.log("⚠️ Settings Save Success but value mismatch", data);
            }
        } else {
            console.error("❌ Settings Save Failed", res.status, await res.text());
        }
    } catch (e: any) {
        console.error("❌ Settings Save Error:", e.message);
    }
}

async function testWorkingHours(): Promise<void> {
    try {
        console.log("Testing Working Hours Save...");
        const payload: WorkingHoursPayload = {
            weekly: {
                mon: [{ start: "09:00", end: "17:00" }],
                tue: [],
                wed: [],
                thu: [],
                fri: [],
                sat: [],
                sun: []
            }
        };
        const res = await fetch(`${baseUrl}/hours?userId=${userId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (res.ok) {
            const data = await res.json();
            if (data.weekly && data.weekly.mon && data.weekly.mon.length === 1) {
                console.log("✅ Working Hours Save Success");
            } else {
                console.log("⚠️ Working Hours Save Success but data mismatch", data);
            }
        } else {
            console.error("❌ Working Hours Save Failed", res.status, await res.text());
        }
    } catch (e: any) {
        console.error("❌ Working Hours Save Error:", e.message);
    }
}

async function run(): Promise<void> {
    await testSettings();
    await testWorkingHours();
}

run();
