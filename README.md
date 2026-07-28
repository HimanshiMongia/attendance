# AuraAttend 🌌
> A premium, client-side, real-time college attendance tracking web application with glassmorphic styles, interactive analytics, safety forecasting, and manual retroactive log controls.

AuraAttend operates entirely inside your web browser. There is no server installation, database setup, or network latency. All your subjects, timetables, and logs are saved securely using `localStorage` directly in your browser.

## 🚀 Key Features

1. **Vibrant & Modern Dashboard**:
   - **Real-time Overall Attendance**: Visual progress ring, instant percentage, and fraction.
   - **Timetable Integrations & Today's Checklist**: Dynamically load daily schedules and mark classes as **Attended**, **Missed**, or **Cancelled** in a single tap.
   - **Calculations Forecast**: Actionable warnings explaining exactly how many consecutive classes you can safely skip (without dropping below your 75% target) or how many you must attend in a row to recover.
   - **Activity Streak**: Live calendar strip showing daily logging statuses and keeping track of consecutive active days.

2. **Weekly Timetable Configurator**:
   - **Preloaded Default Layout**: Ready to run with 6 default subjects, each allocated 4 hours per week distributed across Monday through Saturday.
   - **College Hour Boundaries**: Formats slots precisely between 9:00 AM and 5:30 PM.
   - **Lunch break representation**: Visually marks and locks the 1:00 PM - 1:30 PM break period.
   - **Subject Editor Sidebar**: Allows you to rename subjects, set custom target goals (e.g. 75%, 80%, etc.), and delete subjects.

3. **Analytics & Retroactive Calendar**:
   - **Detailed Subject breakdown cards**: Check attendance stats per subject, including progress indicators and safety calculations.
   - **Monthly History Grid**: Month-by-month grid displaying calendar days color-coded by daily logging status (All Attended, Mixed, All Missed, All Cancelled).
   - **Retroactive Logs Editor**: Click any calendar day to open an overlay panel and edit/backfill past logs immediately.

4. **Data Portability**:
   - **Export backup (JSON)**: Save a copy of your configurations and logs to a file.
   - **Import backup (JSON)**: Load backups instantly on any device or browser.
   - **Clean Reset**: Fully wipe the browser store if you want to start fresh.

---

## 💻 How to Run

Since AuraAttend is a vanilla web application, it does not require any compile step or package managers:

1. **Double Click**: Simply open [index.html](file:///c:/Users/Himanshi%20Mongia/attendance/index.html) directly in any web browser.
2. **VS Code Live Server (Recommended)**: If you use VS Code, right-click `index.html` and select **Open with Live Server** to host it locally.
3. **Local Dev Server**: Alternatively, run a quick server from this workspace directory:
   ```bash
   npx http-server -p 3000
   ```
   Then open `http://localhost:3000` in your browser.

---

## 📐 Attendance Math Reference

- **Attended**: Adds $1$ to Attended, $1$ to Conducted.
- **Missed (Absent)**: Adds $0$ to Attended, $1$ to Conducted.
- **Cancelled**: Adds $0$ to Attended, $0$ to Conducted (Does not penalize or change your percentage).
- **Attendance Percentage**: $\frac{\text{Attended}}{\text{Conducted}} \times 100$

- **Miss Budget Calculation** (when attendance is $\ge$ target $T$):
  $$M_{\text{miss}} = \left\lfloor \frac{100 \times \text{Attended} - T \times \text{Conducted}}{T} \right\rfloor$$
  
- **Recovery Requirement Calculation** (when attendance is $<$ target $T$):
  $$A_{\text{attend}} = \left\lceil \frac{T \times \text{Conducted} - 100 \times \text{Attended}}{100 - T} \right\rceil$$
