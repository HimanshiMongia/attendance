import csv
import json
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

DATA_DIR = Path(__file__).parent / "data"
LOGS_DIR = DATA_DIR / "logs"
META_FILE = DATA_DIR / "meta.json"
SUBJECTS_FILE = DATA_DIR / "subjects.json"
TIMETABLE_FILE = DATA_DIR / "timetable.json"
MONTHLY_CSV_FILE = DATA_DIR / "attendance_monthly_summary.csv"
ALL_LOGS_CSV_FILE = DATA_DIR / "attendance_all_logs.csv"
EXCEL_FILE = DATA_DIR / "attendance_records.xlsx"

STORAGE_VERSION = 3


def _ensure_dirs() -> None:
    LOGS_DIR.mkdir(parents=True, exist_ok=True)


def _read_json(path: Path) -> Any | None:
    if not path.exists():
        return None
    with path.open(encoding="utf-8") as fh:
        return json.load(fh)


def _write_json(path: Path, payload: Any) -> None:
    _ensure_dirs()
    with path.open("w", encoding="utf-8") as fh:
        json.dump(payload, fh, indent=2, ensure_ascii=False)
        fh.write("\n")


def _weekday_name(date_str: str) -> str:
    dt = datetime.strptime(date_str, "%Y-%m-%d")
    return dt.strftime("%A")


def _export_spreadsheets(state: dict) -> None:
    """Generate Excel (.xlsx) and CSV files for monthly subject attendance and logs."""
    subjects = state.get("subjects", [])
    attendance_logs = state.get("attendanceLogs", {})

    subj_map = {s.get("id"): s for s in subjects if isinstance(s, dict) and s.get("id")}

    # Collect all unique months (YYYY-MM)
    months = sorted(list({d[:7] for d in attendance_logs.keys()}), reverse=True)
    if not months:
        # Fallback to current month if no logs yet
        months = [datetime.now().strftime("%Y-%m")]

    # 1. Prepare Monthly Subject Summary Data
    monthly_rows = []
    for month in months:
        month_label = datetime.strptime(month, "%Y-%m").strftime("%B %Y")
        for s in subjects:
            sid = s.get("id")
            sname = s.get("name", sid)
            scode = s.get("code", "")
            target = s.get("target", 67)

            attended = 0
            missed = 0
            logged_missed = 0
            submitted = 0
            cancelled = 0

            for dstr, day_logs in attendance_logs.items():
                if dstr.startswith(month):
                    for log in day_logs.values():
                        if log.get("subjectId") == sid:
                            st = log.get("status")
                            if st == "Attended":
                                attended += 1
                            elif st == "Missed":
                                missed += 1
                            elif st == "LoggedMissed":
                                logged_missed += 1
                                if log.get("submitted"):
                                    submitted += 1
                            elif st == "Cancelled":
                                cancelled += 1

            conducted = attended + missed + logged_missed
            phys_pct = round((attended / conducted * 100), 1) if conducted > 0 else 100.0
            eff_pct = round(((attended + submitted) / conducted * 100), 1) if conducted > 0 else 100.0
            status_text = "On Track" if phys_pct >= target else ("Log Covered" if eff_pct >= target else "Critical")

            monthly_rows.append({
                "Month": month_label,
                "Month_Key": month,
                "Subject_Code": scode,
                "Subject_Name": sname,
                "Target_%": target,
                "Conducted": conducted,
                "Attended": attended,
                "Missed": missed,
                "Event_Logs": logged_missed,
                "Logs_Submitted": submitted,
                "Cancelled": cancelled,
                "Physical_Attendance_%": phys_pct,
                "Effective_Attendance_%": eff_pct,
                "Status": status_text
            })

    # Write Monthly Summary CSV
    with MONTHLY_CSV_FILE.open("w", encoding="utf-8-sig", newline="") as fh:
        writer = csv.writer(fh)
        writer.writerow([
            "Month", "Subject Code", "Subject Name", "Target %", "Conducted",
            "Attended", "Missed", "Event Logs", "Logs Submitted", "Cancelled",
            "Physical Attendance %", "Effective Attendance %", "Status"
        ])
        for r in monthly_rows:
            writer.writerow([
                r["Month"], r["Subject_Code"], r["Subject_Name"], r["Target_%"],
                r["Conducted"], r["Attended"], r["Missed"], r["Event_Logs"],
                r["Logs_Submitted"], r["Cancelled"], r["Physical_Attendance_%"],
                r["Effective_Attendance_%"], r["Status"]
            ])

    # 2. Prepare All Logs Detailed CSV Data
    all_log_rows = []
    for dstr in sorted(attendance_logs.keys(), reverse=True):
        month_label = datetime.strptime(dstr[:7], "%Y-%m").strftime("%B %Y")
        wday = _weekday_name(dstr)
        day_logs = attendance_logs[dstr]
        for key, log in sorted(day_logs.items()):
            sid = log.get("subjectId")
            s_obj = subj_map.get(sid, {})
            all_log_rows.append([
                dstr,
                month_label,
                wday,
                log.get("timeSlot", ""),
                s_obj.get("code", ""),
                log.get("subjectName", s_obj.get("name", "")),
                log.get("type", "Lecture"),
                log.get("status", "Unmarked"),
                "Yes" if log.get("submitted") else ("No" if log.get("status") == "LoggedMissed" else "-"),
                "Yes" if log.get("isExtra") else "No"
            ])

    # Write Detailed All Logs CSV
    with ALL_LOGS_CSV_FILE.open("w", encoding="utf-8-sig", newline="") as fh:
        writer = csv.writer(fh)
        writer.writerow([
            "Date", "Month", "Weekday", "Time Slot", "Subject Code",
            "Subject Name", "Class Type", "Attendance Status", "Log Submitted", "Extra Class"
        ])
        for row in all_log_rows:
            writer.writerow(row)

    # 3. Write Excel (.xlsx) if openpyxl is installed
    try:
        import openpyxl
        from openpyxl.styles import Font, PatternFill, Alignment, Border, Side

        wb = openpyxl.Workbook()

        # Sheet 1: Monthly Summary
        ws1 = wb.active
        ws1.title = "Monthly Attendance Summary"
        ws1.views.sheetView[0].showGridLines = True

        headers1 = [
            "Month", "Subject Code", "Subject Name", "Target %", "Conducted",
            "Attended", "Missed", "Event Logs", "Submitted Logs", "Cancelled",
            "Physical %", "Effective %", "Status"
        ]

        header_font = Font(name="Calibri", size=11, bold=True, color="FFFFFF")
        header_fill = PatternFill(start_color="1E293B", end_color="1E293B", fill_type="solid")
        thin_border = Border(
            left=Side(style='thin', color='CBD5E1'),
            right=Side(style='thin', color='CBD5E1'),
            top=Side(style='thin', color='CBD5E1'),
            bottom=Side(style='thin', color='CBD5E1')
        )

        ws1.append(headers1)
        for col_idx in range(1, len(headers1) + 1):
            cell = ws1.cell(row=1, column=col_idx)
            cell.font = header_font
            cell.fill = header_fill
            cell.alignment = Alignment(horizontal="center", vertical="center")

        for r in monthly_rows:
            ws1.append([
                r["Month"], r["Subject_Code"], r["Subject_Name"], r["Target_%"],
                r["Conducted"], r["Attended"], r["Missed"], r["Event_Logs"],
                r["Logs_Submitted"], r["Cancelled"], r["Physical_Attendance_%"],
                r["Effective_Attendance_%"], r["Status"]
            ])

        for row in ws1.iter_rows(min_row=2, max_row=ws1.max_row, min_col=1, max_col=len(headers1)):
            for cell in row:
                cell.border = thin_border
                cell.alignment = Alignment(vertical="center")

        # Auto-fit columns
        for col in ws1.columns:
            max_len = max(len(str(cell.value or '')) for cell in col)
            col_letter = openpyxl.utils.get_column_letter(col[0].column)
            ws1.column_dimensions[col_letter].width = max(max_len + 3, 12)

        # Sheet 2: All Logs
        ws2 = wb.create_sheet(title="All Class Logs")
        ws2.views.sheetView[0].showGridLines = True
        headers2 = [
            "Date", "Month", "Weekday", "Time Slot", "Subject Code",
            "Subject Name", "Class Type", "Attendance Status", "Log Submitted", "Extra Class"
        ]
        ws2.append(headers2)
        for col_idx in range(1, len(headers2) + 1):
            cell = ws2.cell(row=1, column=col_idx)
            cell.font = header_font
            cell.fill = PatternFill(start_color="334155", end_color="334155", fill_type="solid")
            cell.alignment = Alignment(horizontal="center", vertical="center")

        for r in all_log_rows:
            ws2.append(r)

        for row in ws2.iter_rows(min_row=2, max_row=ws2.max_row, min_col=1, max_col=len(headers2)):
            for cell in row:
                cell.border = thin_border

        for col in ws2.columns:
            max_len = max(len(str(cell.value or '')) for cell in col)
            col_letter = openpyxl.utils.get_column_letter(col[0].column)
            ws2.column_dimensions[col_letter].width = max(max_len + 3, 12)

        wb.save(EXCEL_FILE)

    except ImportError:
        # openpyxl not installed, CSV files are generated natively
        pass


def state_to_files(state: dict) -> None:
    """Split app state into individual JSON files under data/ and export Excel/CSV."""
    _ensure_dirs()

    subjects = state.get("subjects", [])
    timetable = state.get("timetable", {})
    attendance_logs = state.get("attendanceLogs", {})

    _write_json(
        SUBJECTS_FILE,
        {
            "description": "All tracked subjects with attendance targets.",
            "subjects": subjects,
        },
    )

    _write_json(
        TIMETABLE_FILE,
        {
            "description": "Weekly class schedule. Keys are Mon–Sun.",
            "timetable": timetable,
        },
    )

    # Remove log files for dates no longer present in state.
    active_dates = set(attendance_logs.keys())
    for path in LOGS_DIR.glob("*.json"):
        if path.stem not in active_dates:
            path.unlink(missing_ok=True)

    for date_str, day_logs in sorted(attendance_logs.items()):
        entries = []
        for key, log in sorted(day_logs.items()):
            entries.append(
                {
                    "key": key,
                    "subjectId": log.get("subjectId"),
                    "subjectName": log.get("subjectName"),
                    "type": log.get("type"),
                    "status": log.get("status"),
                    "timeSlot": log.get("timeSlot"),
                    "isExtra": bool(log.get("isExtra", False)),
                    "submitted": log.get("submitted"),
                }
            )

        _write_json(
            LOGS_DIR / f"{date_str}.json",
            {
                "date": date_str,
                "weekday": _weekday_name(date_str),
                "description": f"Attendance records for {date_str}.",
                "entries": entries,
            },
        )

    _write_json(
        META_FILE,
        {
            "version": STORAGE_VERSION,
            "lastUpdated": datetime.now(timezone.utc).isoformat(),
            "subjectCount": len(subjects),
            "logDayCount": len(attendance_logs),
        },
    )

    # Export spreadsheets (CSV & XLSX)
    try:
        _export_spreadsheets(state)
    except Exception as exc:
        print(f"AuraAttend: Warning, could not write spreadsheet exports: {exc}")


def files_to_state() -> dict | None:
    """Rebuild app state from data/ folder. Returns None if no saved data."""
    subjects_doc = _read_json(SUBJECTS_FILE)
    timetable_doc = _read_json(TIMETABLE_FILE)

    if subjects_doc is None and timetable_doc is None and not any(LOGS_DIR.glob("*.json")):
        return None

    subjects = (subjects_doc or {}).get("subjects", [])
    timetable = (timetable_doc or {}).get("timetable", {})

    attendance_logs: dict[str, dict] = {}
    for path in sorted(LOGS_DIR.glob("*.json")):
        day_doc = _read_json(path)
        if not day_doc:
            continue
        date_str = day_doc.get("date", path.stem)
        day_logs: dict[str, dict] = {}
        for entry in day_doc.get("entries", []):
            key = entry.get("key")
            if not key:
                continue
            day_logs[key] = {
                "subjectId": entry.get("subjectId"),
                "subjectName": entry.get("subjectName"),
                "type": entry.get("type"),
                "status": entry.get("status"),
                "timeSlot": entry.get("timeSlot"),
                "isExtra": entry.get("isExtra", False),
            }
            if entry.get("submitted") is not None:
                day_logs[key]["submitted"] = entry["submitted"]
        if day_logs:
            attendance_logs[date_str] = day_logs

    return {
        "subjects": subjects,
        "timetable": timetable,
        "attendanceLogs": attendance_logs,
    }


def load_full_state() -> dict | None:
    return files_to_state()


def save_full_state(state: dict) -> None:
    state_to_files(state)


def get_last_updated() -> str | None:
    meta = _read_json(META_FILE)
    if not meta:
        return None
    return meta.get("lastUpdated")
