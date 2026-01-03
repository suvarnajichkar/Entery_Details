
import frappe

MONTH_ORDER = {
    "January": 1, "Jan": 1,
    "February": 2, "Feb": 2,
    "March": 3, "Mar": 3,
    "April": 4, "Apr": 4,
    "May": 5,
    "June": 6, "Jun": 6,
    "July": 7, "Jul": 7,
    "August": 8, "Aug": 8,
    "September": 9, "Sep": 9,
    "October": 10, "Oct": 10,
    "November": 11, "Nov": 11,
    "December": 12, "Dec": 12
}


def extract_year(monthly_id: str) -> int:
    try:
        return int(monthly_id.split("-")[0])
    except Exception:
        return 0


def extract_month_display(monthly_id: str) -> str:
    try:
        return monthly_id.split("-")[1].strip()
    except Exception:
        return ""


def extract_month_sort_key(month_display: str) -> int:
    if not month_display:
        return 99

    key = month_display.strip().title()
    return MONTH_ORDER.get(key, 99)


def execute(filters=None):
    filters = filters or {}
    project_id = (filters.get("project_id") or "").strip()

    columns = [
        {"label": "Month", "fieldname": "month", "fieldtype": "Data", "width": 140},
        {"label": "Individual Target", "fieldname": "individual_target", "fieldtype": "Float", "width": 140},
        {"label": "Achived", "fieldname": "achived", "fieldtype": "Float", "width": 120},
        {"label": "Balance", "fieldname": "balance", "fieldtype": "Float", "width": 120},
        {"label": "Percentage", "fieldname": "percentage", "fieldtype": "Data", "width": 110},
        {"label": "View", "fieldname": "view", "fieldtype": "Data", "width": 80},
    ]

    if not project_id:
        return columns, []

    records = frappe.get_all(
        "Monthly Achieved",
        fields=["monthly_id", "individual_target", "achived"],
        filters={"project_id": project_id},
        limit_page_length=0
    )

    month_map = {}

    for r in records:
        monthly_id = (r.get("monthly_id") or "").strip()
        if not monthly_id:
            continue

        month_display = extract_month_display(monthly_id)
        if not month_display:
            continue

        year = extract_year(monthly_id)
        month_sort = extract_month_sort_key(month_display)

        group_key = monthly_id  # STRICT grouping by monthly_id

        if group_key not in month_map:
            month_map[group_key] = {
                "month": f"{month_display} {year}",
                "individual_target": 0.0,
                "achived": 0.0,
                "year": year,
                "month_sort": month_sort
            }

        month_map[group_key]["individual_target"] = float(r.get("individual_target") or 0)
        month_map[group_key]["achived"] += float(r.get("achived") or 0)

    data = []
    for key, vals in month_map.items():
        target = vals["individual_target"]
        achived = vals["achived"]
        balance = target - achived
        percent = (achived / target * 100) if target else 0

        data.append({
            "month": vals["month"],              # January 2025 (display)
            "monthly_id": key,                   # Use the current key here (month_map key)
            "individual_target": target,
            "achived": achived,
            "balance": balance,
            "percentage": f"{round(percent, 2)} %",
            "_sort": (vals["year"], vals["month_sort"])
        })

    # Proper sorting: Year -> Month
    data.sort(key=lambda x: x["_sort"])

    total_target = sum(d["individual_target"] for d in data)
    total_achived = sum(d["achived"] for d in data)
    total_balance = total_target - total_achived

    data.append({
        "month": "<b>TOTAL</b>",
        "individual_target": total_target,
        "achived": total_achived,
        "balance": total_balance,
        "percentage": "",
        "bold": 1
    })

    report_summary = [
        {"label": "Total Target", "value": total_target, "indicator": "blue"},
        {"label": "Total Achived", "value": total_achived, "indicator": "green"},
        {"label": "Total Balance", "value": total_balance, "indicator": "orange"},
    ]

    return columns, data, None, report_summary
