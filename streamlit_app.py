"""AuraAttend — Streamlit deployment wrapper (preserves full custom UI)."""

from __future__ import annotations

import json
from datetime import datetime, timedelta, timezone
from pathlib import Path

import streamlit as st
import streamlit.components.v1 as components
from streamlit_javascript import st_javascript

from storage import get_last_updated, load_full_state, save_full_state

ROOT = Path(__file__).parent
STORAGE_KEY = "aura_attend_state_v3"


def _parse_iso_timestamp(value: str | None) -> int:
    if not value:
        return 0
    try:
        normalized = value.replace("Z", "+00:00")
        return int(datetime.fromisoformat(normalized).timestamp() * 1000)
    except ValueError:
        return 0


def load_app_html(initial_state: dict | None = None, initial_updated: int = 0) -> str:
    html = (ROOT / "index.html").read_text(encoding="utf-8")
    css = (ROOT / "style.css").read_text(encoding="utf-8")
    js = (ROOT / "app.js").read_text(encoding="utf-8")

    html = html.replace(
        '<link rel="stylesheet" href="style.css">',
        f"<style>\n{css}\n</style>",
    )
    html = html.replace(
        '<script src="app.js"></script>',
        f"<script>\n{js}\n</script>",
    )

    if initial_state:
        inject = (
            "<script>\n"
            f"window.__INITIAL_STATE__ = {json.dumps(initial_state)};\n"
            f"window.__INITIAL_STATE_UPDATED__ = {initial_updated};\n"
            "</script>\n"
        )
        html = html.replace("</head>", inject + "</head>")

    return html


def sync_browser_state_to_files() -> None:
    """Read browser localStorage (shared origin with iframe) and write data/ files."""
    raw = st_javascript(f'localStorage.getItem("{STORAGE_KEY}")')
    if not raw or raw in ("null", ""):
        return
    try:
        state = json.loads(raw)
        if isinstance(state.get("subjects"), list) and isinstance(state.get("timetable"), dict):
            save_full_state(state)
    except json.JSONDecodeError:
        pass


@st.fragment(run_every=timedelta(seconds=5))
def auto_sync_to_folder() -> None:
    sync_browser_state_to_files()


st.set_page_config(
    page_title="AuraAttend | Attendance Tracker",
    page_icon="✓",
    layout="wide",
    initial_sidebar_state="collapsed",
)

# Hide Streamlit chrome so only AuraAttend is visible
st.markdown(
    """
<style>
    #MainMenu, footer, header { visibility: hidden; height: 0; }
    [data-testid="stToolbar"], [data-testid="stDecoration"] { display: none; }
    .block-container {
        padding: 0 !important;
        max-width: 100% !important;
    }
    [data-testid="stAppViewContainer"] > .main {
        overflow: hidden;
    }
    iframe { border: none !important; }
</style>
""",
    unsafe_allow_html=True,
)

file_state = load_full_state()
file_updated = _parse_iso_timestamp(get_last_updated())

components.html(
    load_app_html(file_state, file_updated),
    height=920,
    scrolling=True,
)

auto_sync_to_folder()
