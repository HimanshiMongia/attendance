# AuraAttend Data Folder

Your attendance is stored here as **plain JSON files** so you can open, read, and back them up easily.

## Layout

```
data/
  meta.json              Last sync time and summary counts
  subjects.json          Your subjects and target percentages
  timetable.json         Weekly class schedule (Mon–Sun)
  logs/
    2026-07-28.json      One file per day — attendance for that date
    2026-07-29.json
    ...
```

## Example: daily log file (`logs/2026-07-28.json`)

```json
{
  "date": "2026-07-28",
  "weekday": "Monday",
  "description": "Attendance records for 2026-07-28.",
  "entries": [
    {
      "key": "Mon_0",
      "subjectId": "sapm",
      "subjectName": "Security Analysis & Portfolio Management",
      "type": "Lecture",
      "status": "Attended",
      "timeSlot": "09:00 AM - 10:00 AM",
      "isExtra": false
    }
  ]
}
```

## Status values

| Status         | Meaning                                      |
|----------------|----------------------------------------------|
| `Attended`     | You were present                             |
| `Missed`       | You were absent                              |
| `LoggedMissed` | Society/event — counts as missed until log submitted |
| `Cancelled`    | Class cancelled — does not affect percentage |

## Backup tip

Copy the entire `data/` folder to keep a permanent backup. You can also use **Export Backup (JSON)** inside the app.

> **Streamlit Cloud note:** On free cloud hosting, the `data/` folder may reset when the app redeploys. Keep regular exports or copy the folder locally for long-term storage.
