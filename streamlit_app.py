"""AuraAttend — Streamlit deployment wrapper (preserves full custom UI)."""

from pathlib import Path

import streamlit as st
import streamlit.components.v1 as components

ROOT = Path(__file__).parent


def load_app_html() -> str:
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
    return html


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

components.html(load_app_html(), height=920, scrolling=True)
